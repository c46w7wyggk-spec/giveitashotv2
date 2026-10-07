// Student-facing classroom API. Deploy with --no-verify-jwt: students have no Supabase account, so the
// gateway cannot check a JWT. Authentication here is the student's secret token (only its SHA-256 hash is stored).
// Teachers and admins do NOT use this function: they call RPCs directly with their own JWT (see the migration).
import { createClient } from "jsr:@supabase/supabase-js@2";
import { ENGINE_VERSION, runLog } from "./engine.js";
import { TOKEN_RE, metricsFrom, makeNicknames, newToken, normalizeCode, sha256Hex, validLog } from "./lib.js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });

// Postgres exception message -> [http status, public message]. Anything not listed becomes a generic 500.
const KNOWN: Record<string, [number, string]> = {
  teacher_beta_disabled: [503, "Classroom mode is currently unavailable."],
  invalid_code: [404, "That code did not work. Check it with your teacher."],
  classroom_full: [409, "This classroom is full."],
  invalid_token: [401, "Your classroom session was not found. Join again with the code."],
  classroom_closed: [410, "This classroom has been closed."],
  session_not_active: [409, "This session has ended."],
  already_submitted: [409, "Your result for this session was already recorded."],
  not_found: [404, "Not found."],
  try_again: [503, "Please try again."],
};
function dbError(e: { message?: string }) {
  const m = (e?.message || "").trim();
  const k = KNOWN[m];
  return k ? json({ error: m, message: k[1] }, k[0]) : json({ error: "server_error", message: "Something went wrong. Try again." }, 500);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method === "GET") {
    // Deploy-integrity self-test, same idea as submit-score.
    const src = await Deno.readTextFile(new URL("./engine.js", import.meta.url));
    const h = await sha256Hex(src);
    return json({ engine_version: ENGINE_VERSION, sha256: h, bytes: src.length });
  }
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const raw = await req.text();
  if (raw.length > 4000) return json({ error: "too_large" }, 413);
  let body: any;
  try { body = JSON.parse(raw); } catch { return json({ error: "bad_json" }, 400); }
  const action = body?.action;

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const salt = Deno.env.get("IP_HASH_SALT") ?? "";
  const ipRaw = req.headers.get("cf-connecting-ip") || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const ip = (await sha256Hex(salt + "|" + ipRaw)).slice(0, 16);   // never stored in plain text
  const hit = async (key: string, limit: number, windowSec: number) => {
    const { data, error } = await db.rpc("rl_hit", { p_key: key, p_limit: limit, p_window: windowSec });
    return !error && data === true;
  };
  const tooMany = () => json({ error: "rate_limited", message: "Too many requests. Wait a moment and try again." }, 429);

  // coarse per-IP flood guard (high on purpose: a whole class can share one school IP)
  if (!(await hit("cls:ip:" + ip, 3000, 60))) return tooMany();

  // ---------------------------------------------------------------- join
  if (action === "join") {
    const code = normalizeCode(body.code);
    // Count FAILED attempts only, so a class of 30 behind one NAT can join freely but a guesser is stopped.
    const { data: f1 } = await db.rpc("rl_peek", { p_key: "joinfail:ip:" + ip, p_window: 600 });
    const { data: f2 } = await db.rpc("rl_peek", { p_key: "joinfail:all", p_window: 60 });
    if ((f1 ?? 0) >= 10 || (f2 ?? 0) >= 300) return tooMany();
    const fail = async () => {
      await hit("joinfail:ip:" + ip, 1_000_000, 600);
      await hit("joinfail:all", 1_000_000, 60);
      return json({ error: "invalid_code", message: KNOWN.invalid_code[1] }, 404);
    };
    if (!code) return await fail();   // malformed input counts as a failed guess too
    if (!(await hit("join:ip:" + ip, 300, 600))) return tooMany();
    const token = newToken();
    const { data, error } = await db.rpc("classroom_join", { p_code: code, p_token_hash: await sha256Hex(token), p_names: makeNicknames(12) });
    if (error) return error.message?.trim() === "invalid_code" ? await fail() : dbError(error);
    const row = Array.isArray(data) ? data[0] : data;
    return json({ ok: true, token, nickname: row.o_display_name, classroom: { name: row.o_classroom_name } });
  }

  // ---------------------------------------------------------------- everything below needs a valid token
  const token = body.token;
  if (typeof token !== "string" || !TOKEN_RE.test(token)) return json({ error: "invalid_token", message: KNOWN.invalid_token[1] }, 401);
  const th = await sha256Hex(token);

  if (action === "state") {
    if (!(await hit("state:" + th, 40, 60))) return tooMany();
    const { data, error } = await db.rpc("student_context", { p_token_hash: th });
    if (error) return dbError(error);
    return json({ ok: true, ...data });
  }

  if (action === "leave") {
    if (!(await hit("leave:" + th, 5, 60))) return tooMany();
    const { error } = await db.rpc("student_leave", { p_token_hash: th });
    if (error) return dbError(error);
    return json({ ok: true });
  }

  if (action === "submit") {
    if (!(await hit("submit:" + th, 6, 60))) return tooMany();
    if (!validLog(body.log)) return json({ error: "bad_log", message: "That game record is not valid." }, 400);
    const { data: ctx, error: ce } = await db.rpc("student_context", { p_token_hash: th });
    if (ce) return dbError(ce);
    if (!ctx.session) return json({ error: "no_session", message: "There is no session to submit to." }, 409);
    if (ctx.session.status !== "active") return dbError({ message: "session_not_active" });
    if (ctx.completed) return dbError({ message: "already_submitted" });
    // The seed comes from the database, never from the browser; the score comes from replaying the log with the shared engine.
    let run;
    try { run = runLog(ctx.session.seed, "President", body.log); }
    catch (e) { return json({ error: "invalid_game", message: "That game record could not be verified: " + (e as Error).message }, 400); }
    const metrics = metricsFrom(run, ENGINE_VERSION, body.log);
    const { error } = await db.rpc("student_record_result", { p_token_hash: th, p_session: ctx.session.id, p_metrics: metrics });
    if (error) return dbError(error);
    return json({ ok: true, result: { score: metrics.score, cons_letter: metrics.cons_letter, lib_letter: metrics.lib_letter, completion_status: metrics.completion_status } });
  }

  return json({ error: "unknown_action" }, 400);
});
