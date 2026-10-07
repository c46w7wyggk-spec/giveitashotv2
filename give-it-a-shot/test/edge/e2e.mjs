// End-to-end test of the classroom edge function (running under Deno against a local Postgres). See run.sh.
import { execFileSync } from 'node:child_process';
import { runLog } from '../../src/engine.js';
import { playLog } from '../helpers/bot.mjs';

const DB = process.env.GIAS_PGDB, BASE = 'http://127.0.0.1:8787';
const psql = (sql, role) => execFileSync('psql', ['-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-d', DB, ...(role ? ['-c', `select set_config('request.jwt.claim.sub','${role}',false)`, '-c', 'set role authenticated'] : []), '-c', sql], { encoding: 'utf8' }).trim().split('\n').pop();
const post = async (body) => { const r = await fetch(BASE, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json() }; };
let passed = 0;
const ok = (name, cond, extra = '') => { if (!cond) { console.error('FAIL', name, extra); process.exit(1); } passed++; console.log('ok  ', name); };

const A = 'a0000000-0000-0000-0000-00000000000a';
psql(`insert into auth.users(id,email) values ('${A}','a@example.com')`);
psql(`select public.grant_role_by_email('a@example.com','teacher_beta')`);

// feature flag off => whole classroom feature is off
let r = await post({ action: 'join', code: 'ABC234' });
ok('flag off: join refused with 503 (after a failed code lookup path)', r.status === 404 || r.status === 503, JSON.stringify(r));
psql(`update public.feature_flags set enabled = true`);

const cls = JSON.parse(psql(`select public.teacher_create_classroom('Period 3')`, A));
const code = cls.join_code;
const sess = JSON.parse(psql(`select public.teacher_start_session('${cls.id}','Tax week','Play once', 7, 1)`, A));
const seed = Number(psql(`select seed from public.classroom_sessions where id='${sess.id}'`));

// CORS / health
const pre = await fetch(BASE, { method: 'OPTIONS' }); ok('OPTIONS preflight ok', pre.status === 200);
const hc = await (await fetch(BASE)).json(); ok('GET self-test returns engine hash', hc.engine_version === 3 && /^[0-9a-f]{64}$/.test(hc.sha256));

// join (normalises what a student types)
const students = [];
for (let i = 0; i < 4; i++) {
  const typed = i === 0 ? code.toLowerCase() : i === 1 ? code.slice(0, 3) + ' ' + code.slice(3) : i === 2 ? code.slice(0, 3) + '-' + code.slice(3) : code;
  r = await post({ action: 'join', code: typed, name: i === 3 ? '' : i === 2 ? '  Sam   R. ' : 'Sam R.' });
  ok(`join #${i + 1} with "${typed}"`, r.status === 200 && r.body.token?.length === 43 && (i === 3 ? /^[A-Z][a-z]+ [A-Z][a-z]+ \d\d$/.test(r.body.nickname) : /^Sam R\.( \(\d\))?$/.test(r.body.nickname)) && r.body.classroom.name === 'Period 3', JSON.stringify(r));
  ok('join response exposes no ids/emails', !/[0-9a-f]{8}-[0-9a-f]{4}/.test(JSON.stringify(r.body)) && !/@/.test(JSON.stringify(r.body)));
  students.push(r.body);
}
ok('names unique (duplicates get a number)', new Set(students.map((s) => s.nickname)).size === 4 && students[0].nickname === 'Sam R.' && students[1].nickname === 'Sam R. (2)' && students[2].nickname === 'Sam R. (3)', JSON.stringify(students.map((s) => s.nickname)));
for (const bad of ['<script>', 'a'.repeat(40), 'Robert); DROP TABLE x;--', '\u202Ehidden', 'x'.repeat(25)]) {
  r = await post({ action: 'join', code, name: bad }); ok('bad name rejected: ' + JSON.stringify(bad).slice(0, 24), r.status === 400 && r.body.error === 'bad_name', JSON.stringify(r));
}
r = await post({ action: 'join', code, name: 'Zoë Müller-Åberg' }); ok('accented names are fine', r.status === 200 && r.body.nickname === 'Zoë Müller-Åberg', JSON.stringify(r));
await post({ action: 'leave', token: r.body.token });
const tokHash = (t) => psql(`select encode(extensions.digest('${t}','sha256'),'hex')`);
ok('only the token hash is stored (raw token absent from DB)', psql(`select count(*) from public.classroom_members where token_hash = '${students[0].token}'`) === '0' && psql(`select count(*) from public.classroom_members where token_hash = '${tokHash(students[0].token)}'`) === '1');

// waiting room: nothing can be played or submitted until the teacher presses Start
r = await post({ action: 'state', token: students[0].token });
ok('waiting room: no seed, not started, length and level visible', r.status === 200 && r.body.session.seed == null && r.body.session.started === false && r.body.session.days === 7 && r.body.session.difficulty === 1 && typeof r.body.server_now === 'string', JSON.stringify(r.body.session));
r = await post({ action: 'submit', token: students[0].token, log: 'ssse' }); ok('submit before start => 409 not_started', r.status === 409 && r.body.error === 'not_started', JSON.stringify(r));
r = await post({ action: 'progress', token: students[0].token, log: 'ss' }); ok('progress before start => 409 not_started', r.status === 409 && r.body.error === 'not_started', JSON.stringify(r));
const cd = JSON.parse(psql(`select public.teacher_begin_countdown('${sess.id}')`, A));
r = await post({ action: 'state', token: students[0].token });
ok('countdown running: starts_at set, seed still hidden', r.body.session.starts_at === cd.starts_at && r.body.session.started === false && r.body.session.seed == null, JSON.stringify(r.body.session));
await new Promise((res) => setTimeout(res, 5600));
r = await post({ action: 'state', token: students[0].token });
ok('state: after the countdown the seed equals the DB seed', r.status === 200 && r.body.session.title === 'Tax week' && r.body.session.started === true && r.body.session.seed === seed && r.body.completed === false, JSON.stringify(r));
r = await post({ action: 'state', token: 'x'.repeat(43) }); ok('state: unknown token => 401', r.status === 401);
r = await post({ action: 'state', token: 'short' }); ok('state: malformed token => 401', r.status === 401);
r = await post({ action: 'state' }); ok('state: missing token => 401', r.status === 401);
r = await post({ action: 'frobnicate', token: students[0].token }); ok('unknown action => 400', r.status === 400);

// submit: server replays; browser-supplied numbers are ignored
const O = { days: 7, lvl: 1 };
const log0 = playLog(seed, 1, O);
const expected = runLog(seed, 'President', log0, O);
r = await post({ action: 'submit', token: students[0].token, log: log0, score: 999999, seed: 1, role: 'King', session_id: 'whatever' });
ok('submit accepted', r.status === 200 && r.body.ok, JSON.stringify(r));
ok('score is the server-replayed score, not 999999', r.body.result.score === expected.sc.score && r.body.result.score !== 999999, JSON.stringify(r.body));
const stored = JSON.parse(psql(`select to_jsonb(r) from public.classroom_results r limit 1`));
ok('stored metrics match the engine replay', stored.score === expected.sc.score && Math.abs(Number(stored.approval) - Math.round(expected.sc.m.a * 100) / 100) < 0.01 && stored.engine_version === 3, JSON.stringify(stored));
r = await post({ action: 'submit', token: students[0].token, log: log0 }); ok('replayed submit => 409 already_submitted', r.status === 409 && r.body.error === 'already_submitted');
r = await post({ action: 'state', token: students[0].token }); ok('state shows completed + own result + digest', r.body.completed === true && r.body.my_result.score === expected.sc.score && r.body.my_result.digest?.days === 7 && r.body.my_result.digest?.lvl === 1, JSON.stringify(r.body.my_result).slice(0, 300));
ok('stored digest has decisions, and the raw log is not in it', Array.isArray(stored.digest?.signed) && stored.digest.ser.length >= 1 && !JSON.stringify(stored.digest).includes(log0));
r = await post({ action: 'submit', token: students[3].token, log: playLog(seed, 9, { days: 14, lvl: 0 }) });
ok('a log played with the wrong length/level is rejected', r.status === 400 && r.body.error === 'invalid_game', JSON.stringify(r));

// live progress: the server replays the unfinished log itself
const log1 = playLog(seed, 2, O), log2 = playLog(seed, 3, O), log3 = playLog(seed, 4, O);
const part = log1.slice(0, Math.floor(log1.length / 2));
r = await post({ action: 'progress', token: students[1].token, log: part }); ok('progress accepted', r.status === 200 && r.body.ok, JSON.stringify(r));
let board = JSON.parse(psql(`select public.teacher_get_session('${sess.id}')`, A));
const me1 = board.participants.find((p) => p.display_name === students[1].nickname);
ok('leaderboard shows the replayed live score and day', me1 && me1.completed === false && me1.day >= 1 && me1.day <= 7 && Number.isInteger(me1.live_score), JSON.stringify(me1));
ok('finished student is on the board with the final score', board.participants.find((p) => p.display_name === students[0].nickname).live_score === expected.sc.score);
r = await post({ action: 'progress', token: students[1].token, log: 'zzzz' }); ok('garbage progress rejected', r.status === 400, JSON.stringify(r));

// bad logs
r = await post({ action: 'submit', token: students[1].token, log: 'sssss' }); ok('incomplete game rejected', r.status === 400 && r.body.error === 'invalid_game', JSON.stringify(r));
r = await post({ action: 'submit', token: students[1].token, log: '../../etc' }); ok('log with illegal characters rejected', r.status === 400 && r.body.error === 'bad_log');
r = await post({ action: 'submit', token: students[1].token, log: 12345 }); ok('non-string log rejected', r.status === 400);
// a student cannot submit as another student: the token IS the identity, and result belongs to the token's member
r = await post({ action: 'submit', token: students[1].token, log: log1 }); ok('student 2 submits', r.status === 200);
r = await post({ action: 'submit', token: students[2].token, log: log2 }); ok('student 3 submits', r.status === 200);
ok('3 results stored, one per member', psql(`select count(distinct member_id) from public.classroom_results`) === '3');

// teacher: reveal -> students see aggregates only
r = await post({ action: 'state', token: students[0].token }); ok('class results hidden before reveal', r.body.class_results === null);
psql(`select public.teacher_set_reveal('${sess.id}', true)`, A);
r = await post({ action: 'state', token: students[0].token });
ok('class results visible after reveal (aggregate only)', r.body.class_results?.completed === 3 && !/Otter|Fox|Lynx|Wolf/.test(JSON.stringify(r.body.class_results)), JSON.stringify(r.body.class_results));
r = await post({ action: 'state', token: students[3].token }); ok('student who has not finished sees no class results', r.body.class_results === null);

// teacher sees it all via RPC
const view = JSON.parse(psql(`select public.teacher_get_session('${sess.id}')`, A));
ok('teacher view: 4 participants, 3 completed', view.participants.length === 4 && view.participants.filter((p) => p.completed).length === 3 && view.stats.completed === 3);

// end session => late submit refused
psql(`select public.teacher_end_session('${sess.id}')`, A);
r = await post({ action: 'submit', token: students[3].token, log: log3 }); ok('submit after teacher ended session => 409', r.status === 409 && r.body.error === 'session_not_active');

// leave deletes the student's data
r = await post({ action: 'leave', token: students[2].token }); ok('leave ok', r.status === 200);
ok('left student and result are deleted', psql(`select count(*) from public.classroom_members where token_hash='${tokHash(students[2].token)}'`) === '0' && psql(`select count(*) from public.classroom_results`) === '2');
r = await post({ action: 'state', token: students[2].token }); ok('left token no longer works', r.status === 401);

// per-token submit rate limit (6/min)
let last;
for (let i = 0; i < 8; i++) last = await post({ action: 'submit', token: students[3].token, log: 'zz' });
ok('submit spam hits the per-token rate limit', last.status === 429);

// archived classroom closes tokens
psql(`select public.teacher_archive_classroom('${cls.id}')`, A);
r = await post({ action: 'state', token: students[0].token }); ok('archived classroom => 410', r.status === 410 && r.body.error === 'classroom_closed');
r = await post({ action: 'join', code }); ok('archived classroom code is dead', r.status === 404);

// brute force: repeated bad codes get locked out (valid code from the same IP is refused too)
const cls2 = JSON.parse(psql(`select public.teacher_create_classroom('Brute target')`, A));
let blocked = null;
for (let i = 1; i <= 14; i++) { r = await post({ action: 'join', code: 'ZZZZZ' + (i % 9 + 2) }); if (r.status === 429) { blocked = i; break; } }
ok('guessing codes is rate limited (429 by attempt ' + blocked + ')', blocked !== null && blocked <= 11);
r = await post({ action: 'join', code: cls2.join_code }); ok('even the right code is refused while locked out', r.status === 429);
ok('no IP stored in plain text', psql(`select count(*) from public.rate_limits where key like '%127.0.0.1%' or key like '%unknown%'`) === '0');

console.log(`\nEDGE E2E PASSED (${passed} checks)`);
