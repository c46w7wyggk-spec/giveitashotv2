# Teacher Beta

A private, invite-only classroom layer on top of Give It A Shot. Public play is unchanged; classroom mode is off until you flip a flag and only people you authorize can use the teacher side.

Student data and privacy: [`TEACHER_BETA_PRIVACY.md`](TEACHER_BETA_PRIVACY.md).

## 1. How it fits the existing app (what I found)

| Existing | What the beta does with it |
|---|---|
| Vite + vanilla JS, custom template runtime, no router | Teacher/student pages are a separate lazily loaded chunk (`src/classroom/`), mounted into a new `#tapp` root, same pattern as Supreme Leader. Tiny history-API router. The public game's code only gained a few dozen lines (`ui.js`, `main.js`, `template.html`). |
| Supabase magic-link auth, `profiles` handles | Teachers reuse it unchanged. No handle needed. Students do **not** use it. |
| `submit-score` edge function replays an action log with a shared deterministic engine | New `classroom` edge function reuses the **same engine** (`scripts/make-server-engine.mjs` now writes both copies). Scores are never accepted from the browser. |
| `beta_testers` email allowlist + `is_beta()` (live DB only, not in the repo migration) | Left alone; it still gates Supreme Leader. Teacher access uses its own role table. |
| No `vercel.json` | Added, with rewrites for `/teachers`, `/teacher/*`, `/classroom/*` (deep links would 404 otherwise). |
| Live DB has 4 applied migrations; repo only has 1 | New migration is `20261008000000_teacher_beta.sql`; it does not depend on the 3 unversioned ones. |

Game mode: the President game only, 3–28 days (teacher's slider, about 1–2 minutes per day), at AP (standard) or Core (simplified) difficulty. Supreme Leader is excluded because its scores are not server-verified yet.

## 2. Architecture in one picture

```
Teacher browser  --JWT-->  Postgres RPC functions (SECURITY DEFINER; guard = auth.uid() + flag + capability + rate limit + ownership)
Admin browser    --JWT-->  same, capability admin.roles
Student browser  --token-> `classroom` edge function (service role) --> service-only SQL functions
                                   |__ replays the log with the shared engine; browser score is ignored
```
Teacher and admin calls never touch the service role key; the browser never sends a user id, it only sends its JWT and the database reads `auth.uid()`.

## 3. Security explanation

**Authentication.** Teachers: Supabase magic link. Students: a random 256-bit token returned once at join; only its SHA-256 hash is stored; presented on every call.

**Authorization (server-side only).** Every teacher RPC starts with `_teacher_guard`: (1) signed in? (2) `TEACHER_BETA_ENABLED` on? (3) caller holds capability `teacher.classrooms` through an active, unexpired, unrevoked row in `user_roles`? (4) under the rate limit? Then each resource is loaded by `id AND owner = auth.uid()`; a foreign id and a nonexistent id both return `not_found`, so ids cannot be probed. UI hiding is cosmetic; the public bundle contains no secret.

**Roles are capabilities.** `user_roles` (role, created_by, created_at, expires_at, revoked_at, revoked_by) → `role_capabilities` (role → capability). Code checks capabilities (`teacher.classrooms`, `admin.roles`), never role names, so future roles (`teacher_paid`, `school_paid`, ...) are inserts, not rewrites. `player` is implicit.

**RLS.** Enabled on every new table. All default privileges for `anon`/`authenticated` are revoked, then only these are granted: teachers may `SELECT` rows they own (classrooms, sessions, members, results) while they still hold the capability; users may read their own `user_roles` rows. There are **no** INSERT/UPDATE/DELETE policies: nothing is writable from a client except through the functions. Column grants hide `classroom_members.token_hash` and `classroom_results.log` from every client role. The migration's last block revokes `EXECUTE` on every function and re-grants only the 18 intended RPCs to `authenticated` and none to `anon`; a SQL test asserts that exact list.

**Classroom isolation.** Covered above plus: a student token is bound to one member row, one classroom; `student_record_result` re-checks that the session belongs to that member's classroom.

**Student privacy.** Students type a first name and last initial; no email or account (see privacy doc). Teachers see names, a live leaderboard, results and written summaries. Highlights are values without names; individual results are hidden by default and listed alphabetically, not ranked. Students see class totals only when the teacher shares them, only after they finish, and only with ≥ 3 results.

**Score verification.** The session's `seed` is created by the database. A student submits only an action log; the edge function validates its shape (same regex as `submit-score`), replays it with the shared engine from the stored seed, and stores the engine's numbers. `score: 999999`, a different `seed` or `role`, a wrong `session_id` in the body are all ignored (tested). `UNIQUE(session_id, member_id)` makes replays impossible. A session must be `active` at the moment of insert.

**Join codes.** 6 characters from a 31-letter alphabet without look-alikes (≈ 887 million codes), generated in Postgres with `pgcrypto` and rejection sampling (no modulo bias), never derived from ids. Unique among live codes. Default lifetime 24 h (1 h / 24 h / 7 d choosable), revocable ("Turn off joining"), cleared on archive. Expired, revoked, archived and nonexistent codes all give the same `invalid_code` response.

**Rate limiting / abuse.** DB-backed fixed-window counters (`rl_hit`), keyed by user for teachers, by token for students, by salted IP hash for joining. Guessing: only **failed** joins count, so a class of 30 behind one school IP can join freely, but 10 failed attempts per IP per 10 min locks that IP out, and 300 failures/min across everyone pauses joining briefly (a deliberate tradeoff; an attacker can use it to annoy, not to get in). Teacher limits: 10 classrooms/h, 30 sessions/h, 20 code changes/h, 10 feedback/h, 30 admin grants/h, etc. Caps: 20 open classrooms per teacher, 60 students per classroom (`max_members`, up to 100).

**Known limits of the limiter:** fixed windows allow a 2× burst across a boundary; the client IP comes from `cf-connecting-ip`/`x-forwarded-for`, which Supabase sets; if both were ever absent all clients would share one bucket.

**CORS.** The edge function allows `*` like `submit-score`; it uses no cookies, only a body token, so this does not widen access.

## 4. The migration, explained

`supabase/migrations/20261008000000_teacher_beta.sql`, one transaction, in this order:
1. `roles`, `role_capabilities`, `user_roles`, `feature_flags` (seeded `TEACHER_BETA_ENABLED = false`).
2. `teacher_classrooms`, `classroom_members`, `classroom_sessions`, `classroom_results` (+ unique/partial indexes: one live session per classroom, one result per student per session, unique live join codes).
3. `rate_limits`, `analytics_events`, `teacher_feedback`.
4. RLS enablement, privilege revocation, narrow SELECT policies, column grants.
5. Internal helpers (guards, ownership lookups, code generator, rate limiter, stats).
6. Teacher RPCs, admin RPCs, SQL-editor helpers (`grant_role_by_email`, ...), student functions (service role only), `purge_archived_classrooms`.
7. Function privilege lock-down and the explicit allow-list.

It adds nothing to `profiles`, `scores`, `banned_terms` or `beta_testers`, and drops nothing.

**Rollback:** `supabase/rollback/20261008000000_teacher_beta_down.sql` (verified to restore the original schema; re-applying works). To switch off without deleting data: `update public.feature_flags set enabled = false where key = 'TEACHER_BETA_ENABLED';`

## 5. Configuration

| Name | Where | Required | Meaning |
|---|---|---|---|
| `TEACHER_BETA_ENABLED` | row in `public.feature_flags` (not an env var) | yes, to turn it on | One switch read by the teacher RPCs **and** the student function, so flipping it takes effect instantly everywhere with no redeploy. Off = teachers see "Teacher Beta is currently unavailable", students cannot join. It is **not** the authorization mechanism; roles are. |
| `IP_HASH_SALT` | Supabase function secret | recommended | Random string mixed into the IP hash used for rate limiting. Without it the hash is unsalted. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | provided to Edge Functions by Supabase | automatic | Used only by the `classroom` function. Never in browser code. |
| `VITE_TEACHER_CONTACT_EMAIL` | Vercel / `.env` | optional | Shown on `/teachers` as the address to request access. |

No other new variables. The browser already uses the public URL + publishable key.

## 6. Deployment

### Supabase
1. **Migration.** Dashboard → SQL Editor → paste `supabase/migrations/20261008000000_teacher_beta.sql` → Run. (Use this rather than `supabase db push`: your live project has migration versions the repo does not.) Then open **Advisors → Security** and confirm no new warnings you do not understand.
2. **Edge function.** `supabase functions deploy classroom --project-ref gaurlsgdfwasrapvlmyd --no-verify-jwt`. `--no-verify-jwt` is required: students have no JWT; the function authenticates them by token.
3. **Secret.** `supabase secrets set IP_HASH_SALT=$(openssl rand -hex 16) --project-ref gaurlsgdfwasrapvlmyd`.
4. **Check the deploy.** `curl https://gaurlsgdfwasrapvlmyd.supabase.co/functions/v1/classroom` should return `{"engine_version":2,"sha256":...}` with the **same sha256** as `.../functions/v1/submit-score`. If you ever change the engine: `npm run make-server-engine` and redeploy **both** functions.
5. **Email limits.** Teachers sign in by magic link. Supabase's built-in email sender is heavily rate-limited; for more than a couple of teachers, configure custom SMTP (Auth → SMTP Settings) before the pilot.
6. **Turn it on:** `update public.feature_flags set enabled = true where key = 'TEACHER_BETA_ENABLED';`

### Vercel
Deploy as usual. `vercel.json` (new) rewrites the classroom routes to the app and sets `noindex`. No new required env vars.

### Local development
`npm install && npm run dev`, then open `/teachers`, `/teacher`, `/classroom`. It talks to your real Supabase project. For a fully local stack: `supabase start`, apply both migrations, `supabase functions serve classroom --no-verify-jwt`, and set `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` in `.env.local`. Magic links need your dev origin in Auth → URL Configuration → Redirect URLs.

## 7. Authorizing, listing and revoking teachers

**Your own admin access (first time, SQL Editor)** after you have signed in to the game once with that email:
```sql
select public.grant_role_by_email('you@example.com', 'teacher_admin');
```
**Then each teacher:** ask them to open `/teacher` and sign in once (this creates their account; they will see "Not on the Teacher Beta list"). Then either use **/teacher/admin** (find by exact email or handle prefix → *Grant teacher_beta*) or SQL:
```sql
select public.grant_role_by_email('teacher@school.org', 'teacher_beta');
```
**See who is authorized:**
```sql
select u.email, ur.role, ur.created_at, ur.expires_at from public.user_roles ur
join auth.users u on u.id = ur.user_id where ur.revoked_at is null order by ur.created_at;
```
**Revoke** (takes effect on their very next request; RLS and RPCs both re-check):
```sql
select public.revoke_role_by_email('teacher@school.org', 'teacher_beta');
```
or the *Revoke* button on `/teacher/admin`. Revoked rows are kept as an audit trail. To time-limit a grant: `update public.user_roles set expires_at = now() + interval '30 days' where ...`.

## 8. Pilot workflow (5 to 10 teachers)
1. **Authorize:** as above; send them `https://giveitashot.online/teachers`.
2. **Create:** teacher signs in at `/teacher`, types a classroom name, **Create**. The join code appears immediately (target: under two minutes from sign-in to "students are joining").
3. **Students join:** they open `giveitashot.online/classroom`, type the code, enter their first name and last initial. The teacher's Start button begins a 5-second countdown and every student's game starts together.
4. **Launch:** teacher sets a title/instructions, **Start session**; students see **Start simulation** within about 6 seconds.
5. **Results:** the session page shows who has finished, class averages, highlights, score distribution, ranges, optional individual table, and discussion prompts. **End session** when done; optionally **Share class results**.
6. **Feedback:** *Give Feedback* is on every teacher page. Read it with:
```sql
select f.created_at, p.handle, f.what_worked, f.what_confused, f.what_change, f.would_use_again, f.would_pay
from public.teacher_feedback f left join public.profiles p on p.id = f.user_id order by f.created_at desc;
```
Usage: `select event, count(*) from public.analytics_events group by 1 order by 2 desc;`

## 9. Testing

Automated (all pass as delivered):

| Command | What it proves | Needs |
|---|---|---|
| `npm test` | existing game/engine tests still pass | node |
| `npm run test:sql` | 119 assertions on the migration: flag, anon/player/teacher/admin access, cross-teacher IDOR, RLS, column privileges, revocation/expiry, join codes (valid/invalid/expired/revoked/full/duplicate nickname), replay rejection, cross-classroom writes, reveal rules, leave/archive/delete/purge, analytics events, rate limiting, exact function allow-list | local Postgres 16 (`PGHOST/PGPORT/PGUSER`) |
| `npm run test:edge` | the **real** edge function under Deno against the real migration: join normalisation, token handling, server replay, forged score/seed/role ignored, replayed and post-end submissions, brute-force lockout, no plaintext IP | + Deno |
| `npm run test:ui` | Playwright through the real UI: logged-out, player, teacher, admin, teacher B opening teacher A URLs, revoked teacher, flag off, student join/refresh/play/finish, phone layouts (no horizontal scroll), slow connection, public game unchanged | + Playwright (`/opt/npm-tools`) |

The suites use a small stand-in for Supabase's roles/`auth` schema and forward the app's Supabase calls to Postgres. **They have not been run against a real Supabase project** (GoTrue JWT verification and PostgREST error mapping are simulated), so do the smoke test below after deploying.

**Post-deploy smoke test (about 10 minutes, two browsers):**
1. Flag off: `/teacher` shows "currently unavailable". Turn it on.
2. Signed out: `/teacher` shows sign-in. Sign in as a non-authorized account: "Not on the Teacher Beta list". `/teacher/admin` refused.
3. Grant yourself `teacher_admin`; create a classroom; copy the code.
4. Phone/private window: `/classroom`, wrong code → error; right code → name box.
5. Teacher: start session. Student: Start simulation, play to the end → "Your class results are being collected for discussion." Teacher page updates to 1 finished with numbers.
6. Teacher B (second account with `teacher_beta`) opens teacher A's classroom/session URLs → "not found", no data.
7. Revoke teacher B → their next click is refused. Student refreshes the page → still in the classroom. Teacher ends session → student can no longer submit.
8. Public game at `/` still plays and posts a leaderboard score.

**Manual-only items** (cannot be automated here): a real phone or Chromebook, a real throttled network, a real magic-link email arriving, a teacher refreshing mid-session (state is server-side, so this is safe by design), a student on school Wi-Fi sharing one IP with a class.

## 10. Known limitations (be aware before inviting teachers)
- One game mode (President, 14 days). No custom scenarios.
- Student identity is the browser's stored token. Clearing storage or switching device = join again with their name; the teacher can remove the old entry with the Remove button.
- A student who has not finished when the teacher ends the session cannot submit; a refresh mid-game restarts that game.
- Everyone plays the same seed, so classmates can compare notes; scores are for discussion, not grading, and a student could use outside help.
- Polling (6 s per student, 5 s per open teacher session) writes `last_active_at`. Fine for a pilot; revisit before dozens of simultaneous classes.
- No automated retention job; `purge_archived_classrooms(90)` is manual.
- Analytics and feedback are only readable through SQL (examples above).
- Rate limiter is approximate (see §3).
- Not reviewed for COPPA/FERPA/GDPR or school procurement rules.

## 11. Future architecture (not built)
- **Stripe / subscriptions:** add roles `teacher_paid`, `school_paid`, `district_paid` with `role_capabilities` rows, and set `user_roles.expires_at` from webhook events (a Stripe webhook edge function calls a service-only `grant_role`). Code that checks capabilities does not change.
- **School licenses / multiple teachers per school:** add `organizations` + `org_members`; give `teacher_classrooms` an `org_id`; extend the ownership check to "owner or admin of the same org"; grant capabilities per org.
- **Classroom analytics:** the data is already per session and per metric; add views that compare sessions over time, and per-org rollups.
- **Teacher accounts:** a dedicated sign-up flow and teacher profile table replacing "sign in then get granted".
- **LMS integrations:** LTI 1.3 launch creates/joins a classroom by LMS course id and returns scores through grade passback; the anonymous-participant model maps to LMS-provided pseudonymous ids.
- **Student accounts (optional):** `classroom_members.user_id` already exists and is null in the beta.


## Update: policy tree, Classrooms hub, admin overview (engine v4)

- **Policy tree.** The desk draws from 191 bills. About a third are follow-ups that only appear after a specific decision (a bill you signed or vetoed, or an executive action); the memo shows a "Because you signed ..." note. No bill appears twice in a game. Bills that change the same lever, or that abolish something another bill needs (for example the income tax), can never both become law. Repealing a law also repeals follow-ups that depended on it.
- **AP setting** no longer shows "Leans planned / free market" on memos or executive actions (a topic tag is shown instead). Core keeps the lean label.
- **Teacher dashboard.** Each classroom is now a large card with join code, student count, and buttons for the live session or "Set up a session". A "Classrooms" link is in the top navigation.
- **Admin overview.** Admins see a read-only list of every classroom (owner, student count, sessions) on the Admin page. Names and results stay private to the owning teacher. This needs migration `20261008020000_teacher_beta_v3.sql`.
- **Deploy order:** run the v3 migration, deploy both edge functions (engine v4), deploy the site. Sessions in progress at engine v3 should be restarted.
