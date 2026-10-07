# Give It A Shot

A 14-day economic-policy game. Vite + vanilla JS front end, Supabase (Auth, Postgres, one Edge Function) for accounts and leaderboards.

## How scoring stays honest
The browser records every choice as a short log (`s` sign, `v` veto, `e` end day, `n` next morning, `0-3` incident or trial option, `x`+char executive action).
To post a score it sends `{seed, role, mode, daily_date, log}` (role is always `President` in v2) to the `submit-score` Edge Function, which replays the game with the
same deterministic engine and computes the score itself. Nobody can post a number the game could not produce.

## Layout
- `src/engine.js` shared deterministic engine (also used for server replay). Bump `ENGINE_VERSION` if outcomes change.
- `src/template.html`, `src/runtime.js`, `src/ui.js` the UI (template + tiny render runtime + game/account logic)
- `src/api.js` Supabase calls, `src/share.js` result-card image
- `supabase/migrations` schema, RLS, moderation, leaderboards, streaks
- `supabase/functions/submit-score` the verifier. Its `engine.js` is a slimmed copy: run `npm run make-server-engine` after any engine change, then redeploy the function.
- `test/` replay tests (`npm test`) and Playwright run-throughs (`test/v2smoke.mjs`, `test/v2screens.mjs`, `test/pwa.mjs`; need `npm run build && npx vite preview --port 4173`)

## v2 rules (President)
- Goal is long-term prosperity: meters blend 40% now and 60% projected ten nights ahead, plus bonuses for finishing and surviving, minus a scandal penalty.
- One memo decision each day, then optionally one Executive Action (`src/xactions.js`, 40 unilateral moves, each with a "Real world" line). They cost political capital and some carry scandal or Congress costs.
- Impeachment needs low approval and low Congress support, gives a warning night, then a multi-day trial the player can fight (rally, deals, bribe, leak). Dirty wins can set up revolution.
- Supreme Leader mode (`src/leader.js`, `leaderdata.js`, `leaderui.js`, `leader.html`): 20 days, random map, 5 of 20 policies, a constitution or none, five rival powers (Ronald Bump escalates from a warning to sanctions, an ultimatum, then a raid or invasion), extortion, bribes and silencing. Score is world rank plus survival. Deterministic and replayable (`runLog(seed, log)`); server verification and its own leaderboard are not wired yet.
- `ENGINE_VERSION = 2`; v1 scores are hidden from the leaderboard by migration.

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

## Updates for installed copies
Each build writes `/version.json`. The app checks it on open, on focus and every 10 minutes; if it changed, a toast offers **Update**, which clears caches and reloads. Service worker cache name lives in `public/sw.js` (`VERSION`).

## Kormanik Challenge
UATX-only mode (sign in with `@student.uaustin.org`). Win: finish the term with the needle at 80+ and an A from conservatives. Unranked; nothing is posted. See `test/korm-sim.mjs`.

## Teacher Beta (private, invite-only)
Classrooms for teachers: join codes, anonymous student nicknames, same-seed class sessions, class results and discussion prompts. Off by default.
Full guide (security, setup, deploy, pilot workflow, privacy): [`docs/TEACHER_BETA.md`](docs/TEACHER_BETA.md) and [`docs/TEACHER_BETA_PRIVACY.md`](docs/TEACHER_BETA_PRIVACY.md).
Tests: `npm run test:sql`, `npm run test:edge`, `npm run test:ui` (need a local Postgres 16 and Deno; see `docs/TEACHER_BETA.md`, section Testing).
