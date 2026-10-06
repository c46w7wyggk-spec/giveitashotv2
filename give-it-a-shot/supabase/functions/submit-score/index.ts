import { createClient } from "jsr:@supabase/supabase-js@2";
import { ENGINE_VERSION, runLog, dailySeed, utcDate } from "./engine.js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const MIN_GAP_MS = 20_000;   // between any two submissions
const MAX_PER_DAY = 40;      // per rolling 24h

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method === "GET") {
    // Self-test: hash of the deployed engine, so deploy integrity can be verified.
    const src = await Deno.readTextFile(new URL("./engine.js", import.meta.url));
    const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(src));
    const hex = [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
    return json({ engine_version: ENGINE_VERSION, sha256: hex, bytes: src.length });
  }
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: u, error: ue } = await admin.auth.getUser(token);
  if (ue || !u?.user) return json({ error: "Sign in to post a score." }, 401);
  const uid = u.user.id;

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Bad JSON" }, 400); }
  const { seed, role, mode, daily_date, log } = body ?? {};
  if (!Number.isInteger(seed) || seed < 0 || seed > 0x7fffffff) return json({ error: "Bad seed" }, 400);
  if (mode !== "free" && mode !== "daily") return json({ error: "Bad mode" }, 400);
  if (typeof log !== "string" || !/^[sv0-3qn]{1,400}$/.test(log)) return json({ error: "Bad log" }, 400);

  const { data: prof } = await admin.from("profiles").select("handle").eq("id", uid).maybeSingle();
  if (!prof) return json({ error: "Pick a handle first." }, 403);

  // rate limits
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: recent } = await admin.from("scores").select("created_at")
    .eq("user_id", uid).gte("created_at", since).order("created_at", { ascending: false }).limit(MAX_PER_DAY);
  if (recent && recent.length) {
    if (Date.now() - new Date(recent[0].created_at).getTime() < MIN_GAP_MS)
      return json({ error: "Slow down. One score every 20 seconds." }, 429);
    if (recent.length >= MAX_PER_DAY) return json({ error: "Daily submission limit reached." }, 429);
  }

  let dd: string | null = null;
  if (mode === "daily") {
    const today = utcDate();
    const yest = utcDate(new Date(Date.now() - 24 * 3600 * 1000));
    if (daily_date !== today && daily_date !== yest) return json({ error: "That daily is closed." }, 400);
    if (seed !== dailySeed(daily_date)) return json({ error: "Seed does not match that day." }, 400);
    dd = daily_date;
  }

  let r;
  try { r = runLog(seed, role, log); } catch (e) { return json({ error: "Invalid game: " + (e as Error).message }, 400); }

  const row = {
    user_id: uid, seed, role, mode, daily_date: dd,
    score: r.sc.score, cons_letter: r.cons, lib_letter: r.lib,
    needle: r.needle, over: r.g.over ? "yes" : null, engine_version: ENGINE_VERSION, log,
  };
  const { error: ie } = await admin.from("scores").insert(row);
  if (ie) {
    if (ie.code === "23505") return json({ error: "You already played today's Daily Executive." }, 409);
    return json({ error: "Could not save score." }, 500);
  }
  return json({ ok: true, score: row.score, cons: row.cons_letter, lib: row.lib_letter, handle: prof.handle });
});
