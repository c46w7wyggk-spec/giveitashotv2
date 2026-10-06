# Give It A Shot

A 14-day economic-policy game. Vite + vanilla JS front end, Supabase (Auth, Postgres, one Edge Function) for accounts and leaderboards.

## How scoring stays honest
The browser records every choice as a short log (`s` sign, `v` veto, `0-3` incident option, `q` quiet day, `n` next morning).
To post a score it sends `{seed, role, mode, daily_date, log}` to the `submit-score` Edge Function, which replays the game with the
same deterministic engine and computes the score itself. Nobody can post a number the game could not produce.

## Layout
- `src/engine.js` shared deterministic engine (also used for server replay). Bump `ENGINE_VERSION` if outcomes change.
- `src/template.html`, `src/runtime.js`, `src/ui.js` the UI (template + tiny render runtime + game/account logic)
- `src/api.js` Supabase calls, `src/share.js` result-card image
- `supabase/migrations` schema, RLS, moderation, leaderboards, streaks
- `supabase/functions/submit-score` the verifier. Its `engine.js` is a slimmed copy: run `npm run make-server-engine` after any engine change, then redeploy the function.
- `test/` replay tests (`npm test`) and a Playwright run-through (`test/e2e.mjs`)

## Local dev
```
npm install
npm run dev
```
The public Supabase URL and publishable key are in `.env.production` (safe to ship to browsers).

## Moderation and limits
Handles must match `[A-Za-z0-9_]{3,16}`, are unique case-insensitively, cannot be changed, and are checked against `banned_terms`
with leetspeak normalization. Add words with `insert into banned_terms(term) values ('word');`.
Submissions: 1 per 20 s and 40 per rolling day per user; one Daily Executive score per user per UTC date.
