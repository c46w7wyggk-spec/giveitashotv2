# Teacher Beta: student data and privacy (internal)

> **This beta has not been independently reviewed for legal/regulatory compliance.**
> Nothing in this repo or app claims COPPA, FERPA, GDPR or any other compliance. Students may be minors. Before wider use, have the data flows below reviewed, and expect some schools to require their own approval of student software.

The design goal is to collect as little as possible. Students never create an account.

## What is collected

| Data | Where | Why | Who can see it |
|---|---|---|---|
| Name the student types: first name and last initial only (e.g. "Maya R."), cleaned by the server | `classroom_members.display_name` | tell students apart in a class | the classroom's teacher; the student (their own) |
| SHA-256 hash of the student's secret token | `classroom_members.token_hash` | lets the browser resume as the same participant | nobody (column is not readable by any client role) |
| Join time, last-active time | `classroom_members` | show who is present | the classroom's teacher |
| The student's in-game decisions (an action log like `sseexxA...`) and the resulting numbers (score, GDP growth, unemployment, inflation, deficit, approval, unrest, scandal, the two grades, the economy dial) | `classroom_results` | server re-computes and stores the result | teacher sees the numbers (not the log); student sees their own numbers |
| Hash of the visitor's IP address, salted | `rate_limits.key` (counters only) | stop code guessing and spam | nobody through the app; DB admins only. Not linked to a nickname or classroom. Old rows are deleted opportunistically (on roughly 1% of rate-limit calls), so they can linger for longer than a day in quiet periods. |
| Event names with ids (`classroom_joined`, ...) | `analytics_events` | usage counts for the pilot | DB admins only. Student events carry no user id. |
| Error reports from any visitor: error message, script location and stack, page path (no query string), build id, browser user agent, and the user id if signed in (never for students) | `client_errors` | find and fix crashes and failed server calls | teacher_admin accounts (Owner dashboard → Errors). Deleted after 90 days. |
| When a classroom is deleted: its owner, created/archived/deleted dates and how many students, sessions and results it had (no names, no results) | `classroom_tombstones` | count past usage | teacher_admin accounts (Owner dashboard → Classrooms → Deleted) |

**Not collected from students:** name, email, auth account, handle, age, school, device identifiers, email, surname, age, school or device identifiers. The only typed text is the first name and last initial the student enters, plus the teacher's session title/instructions. Teachers should tell students not to enter anything else.

**Teachers** sign in with an email magic link (Supabase Auth). Their email is held by Supabase Auth as for any player. Teacher feedback (`teacher_feedback`) stores the teacher's user id, optional classroom id, and what they typed.

## What teachers can see
Student names, live progress (day, score, approval, scandal), join/last-active times, written summaries built from each student's decisions, who has finished, each finished student's result numbers, class aggregates. They cannot see student emails (none exist), auth ids, tokens, replay logs, or IP data. A teacher can only see their own classrooms; this is enforced in the database (see `TEACHER_BETA.md`).

## What admins (teacher_admin) can see
The Owner dashboard at `/teacher/admin`: every classroom's name, owner, student count, sessions and per-session counts and average score; all teacher feedback with the teacher's email, name and school; error reports; usage and load totals. Admins do **not** see student names, individual results, written summaries or replay logs; those stay with the classroom's own teacher.

## What students can see
Their classroom name, their own name, the session title/instructions, their own result. Class totals (averages, distribution, highlights; never names) only if the teacher turns on "Share class results", only after they have finished themselves, and only when at least 3 students have finished.

## Authentication behaviour
- Students: possession of the token returned at join time (stored in the browser's localStorage). Clearing site data or switching device means joining again with the code and entering a name again. There is no password and no recovery.
- Teachers: Supabase email magic link plus an explicit role (`teacher_beta` / `teacher_admin`) granted by an admin.

## Retention and deletion
- Nothing is deleted automatically in the beta, except old rate-limit counters (see above).
- A **student can leave** (button on the classroom page): their name row and results are deleted immediately.
- A **teacher can delete a classroom**: classroom, names, sessions and results are deleted immediately and permanently.
- **Archiving** stops joining and keeps data. `select public.purge_archived_classrooms(90);` permanently deletes classrooms archived more than 90 days ago (run manually, or schedule with pg_cron).
- Deleting a Supabase auth user cascades to that teacher's classrooms and everything in them.
- Backups: Supabase's own backups may retain deleted data for their retention window.
- The beta suggests a retention policy of "delete classrooms within 90 days of archiving"; that is an assumption, not a promise made to anyone yet. Decide and publish a real policy before inviting teachers who are not personally known to you.

## Other considerations
- Students play the same seed, so classmates can share strategies. That is a feature for discussion; it also means scores are comparisons of a class, not independent assessments. Do not use them for grades.
- The simulation is a parody with deliberate simplifications; the teacher guide says so.
- Supabase is the processor/host for all of the above (region is whatever the project was created in). Check that matches any school requirements.
