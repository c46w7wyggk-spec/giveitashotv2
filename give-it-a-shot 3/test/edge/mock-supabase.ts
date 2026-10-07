// Test double for @supabase/supabase-js: rpc() runs the real SQL function in a local Postgres as service_role.
// This lets the REAL edge function code run end to end against the REAL migration without a Supabase project.
const lit = (v: unknown): string =>
  v === null || v === undefined ? "null"
  : typeof v === "number" || typeof v === "boolean" ? String(v)
  : Array.isArray(v) ? "array[" + v.map(lit).join(",") + "]"
  : typeof v === "object" ? lit(JSON.stringify(v)) + "::jsonb"
  : "'" + String(v).replace(/'/g, "''") + "'";

export function createClient(_url: string, _key: string) {
  return {
    async rpc(fn: string, args: Record<string, unknown> = {}) {
      const call = Object.entries(args).map(([k, v]) => `${k} => ${lit(v)}`).join(", ");
      const q = `select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from (select * from public.${fn}(${call})) t`;
      const p = await new Deno.Command("psql", {
        args: ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-d", Deno.env.get("GIAS_PGDB")!, "-c", "set role service_role", "-c", q],
        stdout: "piped", stderr: "piped",
      }).output();
      if (!p.success) {
        const err = new TextDecoder().decode(p.stderr);
        const m = /ERROR:\s+(.*)/.exec(err);
        return { data: null, error: { message: m ? m[1].trim() : err.trim() } };
      }
      const rows = JSON.parse(new TextDecoder().decode(p.stdout).trim().split("\n").pop() || "[]");
      // scalar/void functions come back as [{fn: value}]; set-returning functions as [row, ...]
      if (rows.length === 1 && Object.keys(rows[0]).length === 1 && fn in rows[0]) return { data: rows[0][fn] === "" ? null : rows[0][fn], error: null };
      return { data: rows, error: null };
    },
  };
}
