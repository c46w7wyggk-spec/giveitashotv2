// Full-stack browser test: Playwright -> real built UI (vite dev) -> Supabase REST/functions calls forwarded to a local
// Postgres (real migrations, real RLS roles) and to the real classroom edge function running under Deno.
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { playLog } from '../helpers/bot.mjs';
import { buildQuiz } from '../../src/quiz.js';
import { ENGINE_VERSION } from '../../src/engine.js';
import fs from 'node:fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const run = promisify(execFile);

const DB = process.env.GIAS_PGDB, APP = 'http://localhost:4174', SB = 'https://gaurlsgdfwasrapvlmyd.supabase.co';
const SHOTS = process.env.SHOTS || '/tmp/gias-shots';
const U = { T: 'a0000000-0000-0000-0000-00000000000a', B: 'b0000000-0000-0000-0000-00000000000b', P: 'c0000000-0000-0000-0000-00000000000c', D: 'd0000000-0000-0000-0000-00000000000d' };
const EMAIL = { T: 'teacher.a@example.com', B: 'teacher.b@example.com', P: 'player@example.com', D: 'admin@example.com' };

const lit = (v) => v === null || v === undefined ? 'null' : typeof v === 'number' || typeof v === 'boolean' ? String(v) : "'" + String(v).replace(/'/g, "''") + "'";
async function psql(sql, sub) {
  const args = ['-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose', '-d', DB];
  if (sub !== undefined) args.push('-c', `select set_config('request.jwt.claim.sub','${sub || ''}',false)`, '-c', sub ? 'set role authenticated' : 'set role anon');
  args.push('-c', sql);
  try { const { stdout } = await run('psql', args); return { ok: true, out: stdout.trim().split('\n').pop() }; }
  catch (e) { const m = /ERROR:\s+(\w+):\s+(.*)/.exec(e.stderr || ''); return { ok: false, code: m && m[1], message: m ? m[2].trim() : String(e.stderr || e.message).trim() }; }
}
const sql = async (q) => { const r = await psql(q); if (!r.ok) throw new Error(q + ' -> ' + r.message); return r.out; };

let latency = 0, passed = 0;
const AUTHLOG = [], ACCT = {};   // mock Supabase Auth: requests seen, and password accounts created through /auth/v1/signup
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const subOf = (auth) => { try { return JSON.parse(Buffer.from((auth || '').replace(/^Bearer\s+/i, '').split('.')[1], 'base64url').toString()).sub || ''; } catch { return ''; } };
async function backend(route) {
  const req = route.request(), url = new URL(req.url());
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  if (latency) await new Promise((r) => setTimeout(r, latency));
  if (url.pathname.startsWith('/rest/v1/rpc/')) {
    const fn = url.pathname.split('/').pop(), args = JSON.parse(req.postData() || '{}');
    const call = `public.${fn}(${Object.entries(args).map(([k, v]) => `${k} => ${lit(v)}`).join(', ')})`;
    const rt = await sql(`select prorettype::regtype from pg_proc where proname='${fn}' and pronamespace='public'::regnamespace limit 1`).catch(() => '');
    const sub = subOf(req.headers()['authorization']);
    const r = await psql(rt === 'void' ? `select ${call}` : `select to_jsonb(${call})`, sub);
    if (!r.ok) return route.fulfill({ status: r.code === '42501' ? 403 : 400, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ code: r.code, message: r.message }) });
    return route.fulfill({ status: rt === 'void' ? 204 : 200, headers: { ...cors, 'content-type': 'application/json' }, body: rt === 'void' ? '' : (r.out || 'null') });
  }
  if (url.pathname.startsWith('/functions/v1/classroom')) {
    const res = await fetch('http://127.0.0.1:8787', { method: req.method(), headers: { 'content-type': 'application/json' }, body: req.postData() });
    return route.fulfill({ status: res.status, headers: { ...cors, 'content-type': 'application/json' }, body: await res.text() });
  }
  const json = (status, body) => route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const body = () => JSON.parse(req.postData() || '{}');
  if (url.pathname.startsWith('/auth/v1/')) AUTHLOG.push(url.pathname.slice(9) + url.search);
  if (url.pathname.startsWith('/auth/v1/otp') || url.pathname.startsWith('/auth/v1/recover') || url.pathname.startsWith('/auth/v1/resend')) return json(200, {});
  if (url.pathname === '/auth/v1/signup') {
    // mirrors Supabase with "Confirm email" on: an existing address gets a user with no identities and no email is sent
    const b = body();
    if (await sql(`select id from auth.users where lower(email) = lower(${lit(b.email)})`)) return json(200, { id: '00000000-0000-0000-0000-000000000000', email: b.email, aud: 'authenticated', role: 'authenticated', identities: [], user_metadata: {} });
    const id = await sql(`insert into auth.users(email, email_confirmed_at) values (${lit(b.email)}, null) returning id`);
    ACCT[b.email] = { id, pw: b.password, meta: b.data || {} };
    return json(200, { id, email: b.email, aud: 'authenticated', role: 'authenticated', identities: [{ id, provider: 'email' }], user_metadata: b.data || {} });
  }
  if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
    const b = body(), a = ACCT[b.email];
    if (!a || a.pw !== b.password) return json(400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
    if ((await sql(`select email_confirmed_at is not null from auth.users where id = '${a.id}'`)) !== 't') return json(400, { code: 400, error_code: 'email_not_confirmed', msg: 'Email not confirmed' });
    return json(200, sessionFor(a.id, b.email, a.meta));
  }
  if (url.pathname.startsWith('/auth/v1/user')) {
    const id = subOf(req.headers()['authorization']), a = Object.entries(ACCT).find(([, v]) => v.id === id);
    if (req.method() === 'PUT' && a) a[1].pw = body().password;
    return json(200, { id, email: a ? a[0] : 'x@example.com', aud: 'authenticated', role: 'authenticated', user_metadata: a ? a[1].meta : {} });
  }
  return route.fulfill({ status: 404, headers: cors, body: '{}' });
}
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function sessionFor(id, email, meta = {}) {
  const exp = Math.floor(Date.now() / 1000) + 3600 * 24;
  const jwt = [b64({ alg: 'HS256', typ: 'JWT' }), b64({ sub: id, email, role: 'authenticated', aud: 'authenticated', exp }), 'sig'].join('.');
  return { access_token: jwt, token_type: 'bearer', expires_in: 86400, expires_at: exp, refresh_token: 'r-' + id, user: { id, email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: meta, created_at: new Date().toISOString() } };
}
const session = (who) => sessionFor(U[who], EMAIL[who]);
async function newPage(browser, who, viewport = { width: 1280, height: 800 }) {
  const ctx = await browser.newContext({ viewport });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await ctx.route(/gaurlsgdfwasrapvlmyd\.supabase\.co/, backend);
  if (who) await ctx.addInitScript((s) => { try { if (!localStorage.getItem('sb-gaurlsgdfwasrapvlmyd-auth-token')) localStorage.setItem('sb-gaurlsgdfwasrapvlmyd-auth-token', JSON.stringify(s)); } catch (e) {} }, session(who));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { console.error('PAGE ERROR', e.message); process.exitCode = 1; });
  return page;
}
const ok = (name, cond, extra = '') => { if (!cond) { console.error('FAIL', name, extra); process.exit(1); } passed++; console.log('ok  ', name); };
const text = (page) => page.evaluate(() => document.getElementById('tapp').innerText);
const shot = (page, name) => page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });
const settled = (page) => page.waitForFunction(() => { const t = document.getElementById('tapp').innerText; return t.length > 40 && !/^\s*GIVE IT A SHOT[\s\S]{0,60}Loading\.\.\./.test(t) && !/Loading\.\.\./.test(t); });
const noHScroll = (page) => page.evaluate(() => { const t = document.getElementById('tapp'); return t.scrollWidth <= t.clientWidth + 1; });

await sql(`insert into auth.users(id,email) values ${Object.keys(U).map((k) => `('${U[k]}','${EMAIL[k]}')`).join(',')}`);
await sql(`select public.grant_role_by_email('${EMAIL.T}','teacher_beta')`);
await sql(`select public.grant_role_by_email('${EMAIL.B}','teacher_beta')`);
await sql(`select public.grant_role_by_email('${EMAIL.D}','teacher_admin')`);
await sql(`insert into public.profiles(id,handle) values ('${U.T}','MsTeacher'),('${U.P}','PlayerOne')`);
await run('mkdir', ['-p', SHOTS]);
const browser = await chromium.launch();

// ------------------------------------------------------------ flag off
let p = await newPage(browser, 'T');
await p.goto(APP + '/teacher'); await settled(p);
ok('flag OFF: teacher page says unavailable', /currently unavailable/.test(await text(p)));
await p.close();

await sql(`update public.feature_flags set enabled = true`);

// ------------------------------------------------------------ logged-out visitor: home page, create account, sign in
const NEW = 'new.teacher@example.com';
p = await newPage(browser, null);
await p.goto(APP + '/teachers'); await p.waitForSelector('form[data-form=signup]');
ok('/teachers redirects to /teacher', new URL(p.url()).pathname === '/teacher');
ok('logged out: home page explains the project, no dashboard', /Give It A Shot for the classroom/.test(await text(p)) && /Create a teacher account/.test(await text(p)) && !/Create classroom/.test(await text(p)));
await shot(p, 'teacher-home');
await p.click('form[data-form=signup] button[type=submit]');
ok('sign-up: name required', /Enter your name/.test(await text(p)));
await p.fill('#t-name', 'Pat Lee'); await p.fill('#t-school', 'Central High'); await p.fill('#t-note', 'AP Gov, 2 sections'); await p.fill('#t-email', NEW); await p.fill('#t-pass', 'short');
await p.click('form[data-form=signup] button[type=submit]');
ok('sign-up: short password rejected, fields kept', /at least 8 characters/.test(await text(p)) && (await p.inputValue('#t-school')) === 'Central High');
await p.fill('#t-email', EMAIL.P); await p.fill('#t-pass', 'longenough1');
await p.click('form[data-form=signup] button[type=submit]');
await p.waitForFunction(() => /already an account/.test(document.getElementById('tapp').innerText));
ok('sign-up with an existing game account points to sign in / forgot password', /Forgot password/.test(await text(p)) && (await p.locator('form[data-form=password]').count()) === 1);
await p.click('[data-act=mode][data-m=signup]');
await p.fill('#t-email', NEW); await p.fill('#t-pass', 'longenough1');
await p.click('form[data-form=signup] button[type=submit]');
await p.waitForFunction(() => /confirmation link/.test(document.getElementById('tapp').innerText));
ok('sign-up: "Check your email" shown, return path remembered', (await p.evaluate(() => localStorage.getItem('gias_after_login'))) === '/teacher' && !!ACCT[NEW] && ACCT[NEW].meta.teacher_signup === true && ACCT[NEW].meta.school === 'Central High');
await p.click('[data-act=mode][data-m=signin]');
await p.fill('#t-email', NEW); await p.fill('#t-pass', 'wrong-password');
await p.click('form[data-form=password] button[type=submit]');
await p.waitForFunction(() => /Wrong email or password/.test(document.getElementById('tapp').innerText));
ok('sign-in: wrong password explained', true);
await p.fill('#t-pass', 'longenough1'); await p.click('form[data-form=password] button[type=submit]');
await p.waitForSelector('[data-act=resendconfirm]');
ok('sign-in before confirming: told to confirm, resend offered', /confirm your email first/.test(await text(p)));
await p.click('[data-act=resendconfirm]'); await p.waitForFunction(() => /confirmation link/.test(document.getElementById('tapp').innerText));
ok('confirmation email resent', AUTHLOG.some((x) => x.startsWith('resend')));
await p.click('[data-act=mode][data-m=signin]'); await p.click('[data-act=mode][data-m=forgot]');
await p.fill('#t-email', NEW); await p.click('form[data-form=forgot] button[type=submit]');
await p.waitForFunction(() => /set a new password/.test(document.getElementById('tapp').innerText));
ok('forgot password: reset email requested', AUTHLOG.some((x) => x.startsWith('recover')));
await p.click('[data-act=mode][data-m=signin]'); await p.click('[data-act=mode][data-m=magic]');
await p.fill('#t-email', 'not-an-email'); await p.click('form[data-form=signin] button[type=submit]');
ok('email link: bad email rejected client-side', /valid email/.test(await text(p)));
await p.fill('#t-email', 'someone@example.com'); await p.click('form[data-form=signin] button[type=submit]');
await p.waitForFunction(() => /sign-in link/.test(document.getElementById('tapp').innerText));
ok('email link fallback still works', AUTHLOG.some((x) => x.startsWith('otp')));
await p.goto(APP + '/teacher/resources'); await settled(p);
ok('guide and privacy notes are public', /Privacy notes/.test(await text(p)) && (await p.locator('.t-navs').count()) === 0);
ok('guide explains the model, grading and make-up play, with current sign-in and resume facts', /How the model works/.test(await text(p)) && /value choice/.test(await text(p)) && /Absent students/.test(await text(p)) && /picks up where they left off/.test(await text(p)) && !/one-time link, no password/.test(await text(p)) && !/parody/i.test(await text(p)));
await p.close();

// confirmation link opened on another device: lands on the site root with no saved return path, goes to /teacher
await sql(`update auth.users set email_confirmed_at = now() where email = '${NEW}'`);
p = await newPage(browser, null);
const ns = sessionFor(ACCT[NEW].id, NEW, ACCT[NEW].meta);
await p.goto(APP + `/#access_token=${ns.access_token}&expires_at=${ns.expires_at}&expires_in=86400&refresh_token=r&token_type=bearer&type=signup`);
await p.waitForFunction(() => /waitlist/.test((document.getElementById('tapp') || {}).innerText || ''));
ok('confirm link -> /teacher waitlist, request filed from the sign-up details', new URL(p.url()).pathname === '/teacher' && (await sql(`select name || '|' || school || '|' || note from public.teacher_applications a join auth.users u on u.id = a.user_id where u.email = '${NEW}'`)) === 'Pat Lee|Central High|AP Gov, 2 sections');
await shot(p, 'teacher-waitlist');
await p.click('[data-act=signout]'); await p.waitForSelector('form[data-form=password]');
ok('after sign-out the sign-in form is shown (account remembered on this device)', true);
await p.fill('#t-email', NEW); await p.fill('#t-pass', 'longenough1'); await p.click('form[data-form=password] button[type=submit]');
await p.waitForFunction(() => /waitlist/.test(document.getElementById('tapp').innerText));
ok('password sign-in works after confirming; still on the waitlist', (await sql(`select count(*) from public.teacher_applications`)) === '1');
await p.close();

// password-reset link -> set a new password
p = await newPage(browser, null);
await p.goto(APP + `/#access_token=${ns.access_token}&expires_at=${ns.expires_at}&expires_in=86400&refresh_token=r&token_type=bearer&type=recovery`);
await p.waitForSelector('form[data-form=newpw]');
ok('reset link -> "Set a new password" on /teacher', new URL(p.url()).pathname === '/teacher');
await p.fill('#t-pass', 'brandnew123'); await p.fill('#t-pass2', 'brandnew124'); await p.click('form[data-form=newpw] button[type=submit]');
ok('mismatched passwords rejected', /do not match/.test(await text(p)));
await p.fill('#t-pass', 'brandnew123'); await p.fill('#t-pass2', 'brandnew123'); await p.click('form[data-form=newpw] button[type=submit]');
await p.waitForFunction(() => /waitlist/.test(document.getElementById('tapp').innerText));
ok('new password saved, then the waitlist', ACCT[NEW].pw === 'brandnew123');
await p.close();

// expired email link
p = await newPage(browser, null);
await p.addInitScript(() => { try { localStorage.setItem('gias_after_login', '/teacher'); } catch (e) {} });
await p.goto(APP + '/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
await p.waitForFunction(() => /expired or was already used/.test((document.getElementById('tapp') || {}).innerText || ''));
ok('expired link -> /teacher with a plain explanation', new URL(p.url()).pathname === '/teacher');
await p.close();

// ------------------------------------------------------------ signed-in player without access can request it
p = await newPage(browser, 'P');
await p.goto(APP + '/teacher'); await p.waitForSelector('form[data-form=apply]');
ok('player: asked to request access, no dashboard', /Request Teacher Beta access/.test(await text(p)) && !/Create classroom/.test(await text(p)));
ok('player: no teacher navigation rendered', (await p.locator('.t-navs').count()) === 0);
await p.goto(APP + '/teacher/admin'); await settled(p);
ok('player: /teacher/admin refused', /Request Teacher Beta access/.test(await text(p)) && !/Beta access</.test(await text(p)));
await p.fill('#t-name', 'Player One'); await p.fill('#t-school', 'East High'); await p.click('form[data-form=apply] button[type=submit]');
await p.waitForFunction(() => /waitlist/.test(document.getElementById('tapp').innerText));
ok('player: request filed', (await sql(`select school from public.teacher_applications where user_id = '${U.P}'`)) === 'East High');
await p.close();

// ------------------------------------------------------------ teacher creates a classroom
const tp = await newPage(browser, 'T');
await tp.goto(APP + '/teacher'); await tp.waitForSelector('form[data-form=create]');
ok('teacher: dashboard with beta indicator and empty state', /Teacher Beta · invite only/.test(await text(tp)) && /No classrooms yet/.test(await text(tp)));
await tp.fill('#new-name', 'Period 3 <b>Civics</b>'); await tp.click('form[data-form=create] button[type=submit]');
await tp.waitForSelector('.t-code');
const code = (await tp.locator('.t-code').innerText()).replace(/\s/g, '');
ok('classroom created; 6-char join code shown; name rendered as text (no HTML injection)', /^[A-HJKMNP-Z2-9]{6}$/.test(code) && (await tp.locator('h1.t-h1').innerText()) === 'Period 3 <b>Civics</b>', code);
const classUrl = tp.url();
await shot(tp, 'teacher-classroom');
await tp.goto(APP + '/teacher'); await tp.waitForSelector('article.t-card a[href*="/teacher/classrooms/"]').catch(async () => { await shot(tp, 'dash-fail'); console.log('BODY:', (await tp.locator('body').innerText()).slice(0, 400)); throw new Error('dashboard missing classroom'); });
ok('teacher dashboard lists the new classroom with a link, join code and student count', /Period 3/.test(await tp.locator('#t-main').innerText()) && (await tp.locator('#t-main .t-code.sm').count()) === 1 && /0 students joined/.test(await text(tp)));
await shot(tp, 'teacher-dashboard-live'); await tp.goto(classUrl); await tp.waitForSelector('.t-code');

// ------------------------------------------------------------ student joins
const sp = await newPage(browser, null, { width: 390, height: 844 });
await sp.goto(APP + '/classroom'); await sp.waitForSelector('#class-code');
await sp.fill('#class-code', code.slice(0, 3).toLowerCase() + ' ' + code.slice(3).toLowerCase()); await sp.click('form[data-form=join] button[type=submit]');
await sp.waitForFunction(() => /Enter your name/.test(document.getElementById('tapp').innerText));
ok('student: name is required before joining', true);
await sp.fill('#class-code', 'ZZZZZZ'); await sp.fill('#class-name', 'Sam R.'); await sp.click('form[data-form=join] button[type=submit]');
await sp.waitForFunction(() => /did not work/.test(document.getElementById('tapp').innerText));
ok('student: invalid code error', true);
await sp.fill('#class-code', code.slice(0, 3).toLowerCase() + ' ' + code.slice(3).toLowerCase()); await sp.fill('#class-name', '<b>x</b>'); await sp.click('form[data-form=join] button[type=submit]');
await sp.waitForFunction(() => /1 to 24 letters/.test(document.getElementById('tapp').innerText));
ok('student: markup in a name is refused', true);
await sp.fill('#class-name', 'Sam R.'); await sp.click('form[data-form=join] button[type=submit]');
await sp.waitForFunction(() => /YOUR CLASSROOM/.test(document.getElementById('tapp').innerText));
const nick = (await sp.locator('#t-main b').first().innerText());
ok('student joined under the name they typed; waiting state; no email asked', nick === 'Sam R.' && /Waiting for your teacher/.test(await text(sp)) && (await sp.locator('input[type=email]').count()) === 0, nick);
ok('student page has no horizontal scroll on a phone', await noHScroll(sp));
await shot(sp, 'student-waiting');
ok('student cannot reach teacher data from the student page (no teacher nav)', (await sp.locator('.t-navs').count()) === 0);

// teacher sees the student, starts a session
await tp.goto(classUrl); await tp.waitForSelector('.t-names');
ok('teacher sees the typed name, no email', (await text(tp)).includes(nick) && !/@/.test(await tp.locator('.t-names').innerText()));
await tp.fill('#s-title', 'Tax week'); await tp.fill('#s-ins', 'Play through once.');
ok('start form: length slider defaults to 14 days with a time estimate', /14 days · about 14-28 minutes/.test(await tp.locator('#s-days-out').innerText()) && (await tp.locator('#s-days').getAttribute('min')) === '3' && (await tp.locator('#s-days').getAttribute('max')) === '28');
await tp.evaluate(() => { const r = document.getElementById('s-days'); r.value = '3'; r.dispatchEvent(new Event('input', { bubbles: true })); });
ok('slider at the minimum shows 3 days, 3-6 minutes', /3 days · about 3-6 minutes/.test(await tp.locator('#s-days-out').innerText()));
await tp.evaluate(() => { const r = document.getElementById('s-days'); r.value = '28'; r.dispatchEvent(new Event('input', { bubbles: true })); });
ok('slider at the maximum shows 28 days, 28-56 minutes', /28 days · about 28-56 minutes/.test(await tp.locator('#s-days-out').innerText()));
await tp.evaluate(() => { const r = document.getElementById('s-days'); r.value = '7'; r.dispatchEvent(new Event('input', { bubbles: true })); });
await shot(tp, 'teacher-start-form');
ok('power plays are included by default', await tp.isChecked('input[name=power]'));
await tp.check('input[name=difficulty][value="1"]');
await tp.selectOption('#s-focus', 'u3');
await tp.click('form[data-form=start] button[type=submit]');
await tp.waitForSelector('[data-act=startsim]');
const sessUrl = tp.url();
ok('session created in a waiting room: 7 days, core difficulty stored; seed not yet released', /^.*\/teacher\/sessions\/[0-9a-f-]{36}$/.test(sessUrl) && (await sql(`select days || ',' || difficulty || ',' || focus || ',' || coalesce(starts_at::text,'null') from public.classroom_sessions`)) === '7,1,u3,null');
ok('teacher waiting room shows who is here and the settings', /Core \(simplified\)/.test(await text(tp)) && /Unit 3: National income/.test(await text(tp)) && /7 days/.test(await text(tp)) && (await text(tp)).includes('Sam R.'));
ok('teacher waiting room shows the join code and where to enter it, for projecting', (await tp.locator('.t-launch .t-code').innerText()).replace(/\s/g, '') === code && /\/classroom/.test(await tp.locator('.t-join').innerText()));
await shot(tp, 'teacher-waiting-room-code');

// student refreshes (token persists), starts the simulation
await sp.reload(); await sp.waitForSelector('.t-wait');
ok('student refresh keeps classroom; waiting room shows instructions, the length and an estimate; no Start button for students', /Tax week/.test(await text(sp)) && /Play through once/.test(await text(sp)) && /7 days/.test(await text(sp)) && /7-14 minutes/.test(await text(sp)) && (await sp.locator('[data-act=play]').count()) === 0);
await shot(sp, 'student-waiting-room');
await tp.click('[data-act=startsim]');
await tp.waitForSelector('[data-live=cd]');
ok('teacher: countdown shown after pressing Start', /^[0-5]$/.test(await tp.locator('[data-live=cd]').innerText()));
await sp.waitForSelector('.t-count', { timeout: 8000 });
ok('student: countdown appears on its own', /^[0-5]$/.test(await sp.locator('.t-count').innerText()));
await shot(sp, 'student-countdown');
await sp.waitForFunction(() => document.getElementById('viewport').dataset.mode === 'president', null, { timeout: 15000 });
ok('the game started by itself after the countdown (no button pressed)', true);
ok('game appears in class mode with the teacher\'s length and level', await sp.evaluate(() => window.__app.state.mode === 'class' && window.__app.state.g.phase === 'desk' && window.__app.state.g.day === 1 && window.__app.state.g.days === 7 && window.__app.state.g.lvl === 1 && window.__app.state.g.unit === 'u3'));
ok('header shows DAY 1 / 7 and 7 progress dots', (await sp.locator('.daylab').innerText()) === 'DAY 1 / 7' && (await sp.locator('.dots .dot').count()) === 7);
ok('core level: no Scandal meter', (await sp.locator('.pw:has-text("Scandal")').count()) === 0);
ok('tutorial speaks about 7 days and matches the level', /7 days/.test(await sp.locator('.coach').innerText()) && /1 OF 5/.test(await sp.locator('.coach').innerText()), await sp.locator('.coach').innerText());
for (let i = 0; i < 2; i++) await sp.locator('.coach .btn.gold').click();
ok('tutorial explains the meters and Capital/Congress', /Economy[\s\S]*Unemployment[\s\S]*Inflation/.test(await sp.locator('.coach').innerText()) || /Congress/.test(await sp.locator('.coach').innerText()));
await sp.locator('.helpbtn').click(); await sp.waitForSelector('.helpdlg');
const helpTxt = await sp.locator('.helpdlg').innerText();
ok('help screen: meters and 7-day wording; no executive actions or impeachment/scandal section in core', /7 days/.test(helpTxt) && /Unrest:/.test(helpTxt) && !/Executive actions/.test(helpTxt) && !/Scandal and impeachment/.test(helpTxt) && !/\b14\b/.test(helpTxt.replace(/\d+-\d+ minutes/g, '')));
await sp.keyboard.press('Escape'); await sp.waitForSelector('.helpdlg', { state: 'detached' });
await sp.evaluate(() => { window.__app.noDelay = true; window.__app.setState({ tut: -1 }); });
await sp.locator('.tab:has-text("Desk")').click();
ok('class version: "What does this mean?" button on a memo shows a plain explanation', await (async () => { await sp.locator('button:has-text("What does this mean?")').first().click(); const t = await sp.locator('.evid.mean').innerText(); return /In plain terms/.test(t) && t.length > 100; })());
await sp.evaluate(() => window.__app.setState({ xopen: true }));
await sp.waitForTimeout(300);
ok('core level: no executive actions panel', (await sp.locator('.xcat').count()) === 0);
const seed = Number(await sql(`select seed from public.classroom_sessions limit 1`));
ok('game uses the server-assigned seed', await sp.evaluate((s) => window.__app.state.g.seed0 === s, seed));
// play the whole term through the real App.act pipeline
const O = { days: 7, lvl: 1, unit: 'u3' };
const log = playLog(seed, 5, O);
const half = log.slice(0, Math.floor(log.length / 2)).replace(/x$/, '');
const playPart = (page, part) => page.evaluate(async (part) => {
  const { applyAction, tokens } = await import('/src/engine.js'); const app = window.__app;
  for (const a of tokens(part)) app.act((g) => { g.log += a; applyAction(app, g, a); });
}, part);
await sp.evaluate(() => window.__app.setState({ tab: 'map', xopen: false }));
await playPart(sp, half);
await tp.goto(sessUrl); await tp.waitForSelector('table.t-board', { timeout: 15000 });
await tp.waitForFunction(() => /Playing/.test(document.getElementById('tapp').innerText), null, { timeout: 15000 });
ok('live leaderboard: the student appears with a day, a score and "Playing"', /Sam R\./.test(await tp.locator('table.t-board').innerText()) && /Day \d of 7/.test(await tp.locator('table.t-board').innerText()) && /Playing/.test(await tp.locator('table.t-board').innerText()), await tp.locator('table.t-board').innerText());
ok('running session still shows the join code for late joiners', (await tp.locator('.t-joinline .t-code-inline').innerText()).replace(/\s/g, '') === code);
await shot(tp, 'teacher-live-board');
await playPart(sp, log.slice(half.length));
await sp.waitForFunction(() => /Your class results are being collected for discussion/.test(document.body.innerText), null, { timeout: 15000 });
ok('confetti is on screen when the term ends', await sp.evaluate(() => { const c = document.querySelector('.confetti'); return !!c && c.children.length >= 20; }));
await sp.waitForTimeout(1500);
ok('confetti pieces fall inside the viewport', await sp.evaluate(() => { const c = document.querySelector('.confetti'); const h = window.innerHeight; const ys = [...c.children].map((e) => e.getBoundingClientRect().top); return ys.some((y) => y > 0 && y < h); }));
await shot(sp, 'student-confetti');
await sp.waitForSelector('.confetti', { state: 'detached', timeout: 12000 });
ok('confetti removes itself after a few seconds', true);
ok('end screen shows a written summary with questions', /YOUR WRITTEN SUMMARY/.test(await sp.locator('#app').innerText()) && /THINK ABOUT IT/.test(await sp.locator('#app').innerText()) && /7-day term|term/.test(await sp.locator('.sumcard').innerText()));
ok('end screen wording uses 7 days, not 14', /YOUR 7 DAYS ARE UP|YOUR TERM ENDED EARLY/.test(await sp.locator('#app').innerText()) && !/\b14 days\b|Fourteen/.test(await sp.locator('#app').innerText()));
ok('end screen: class message shown, leaderboard/post card hidden', !(await sp.evaluate(() => /PUT IT ON THE LEADERBOARD|Play again with a new seed|Share your result/.test(document.getElementById('app').innerText))));
const row = JSON.parse(await sql(`select to_jsonb(r) - 'log' from public.classroom_results r`));
ok('result stored by the server for this member', row.engine_version === ENGINE_VERSION && row.digest && row.digest.days === 7 && typeof row.score === 'number' && row.completion_status);
await shot(sp, 'student-endscreen');
await sp.click('text=Back to your classroom');
await sp.waitForFunction(() => /Your result was sent to your teacher/.test(document.getElementById('tapp').innerText) && document.getElementById('viewport').dataset.mode === 'teacher');
ok('back in the classroom: own result and written summary shown, other results hidden', /Your result/.test(await text(sp)) && /Your written summary/.test(await text(sp)) && /stay hidden until your teacher/.test(await text(sp)));
await shot(sp, 'student-done');

// end-of-game quiz: built from this student's own game, graded by the server
await sp.waitForSelector('form[data-form=quiz]');
const q = buildQuiz(row, { focus: 'u3' });
ok('quiz shows three questions and a written response, focused on Unit 3', (await sp.locator('form[data-form=quiz] .t-quiz-q').count()) === 3 && /Unit 3: National income/.test(await text(sp)) && (await sp.locator('#quiz-frq').count()) === 1);
await sp.click('form[data-form=quiz] button[type=submit]');
await sp.waitForSelector('text=Answer every multiple-choice question first.');
ok('quiz cannot be sent with unanswered questions', true);
for (let i = 0; i < q.mc.length; i++) await sp.check('input[name=q' + i + '][value="' + (i === 2 ? (q.mc[i].answer + 1) % 4 : q.mc[i].answer) + '"]');
await sp.fill('#quiz-frq', 'AD shifts right because taxes fell.');
await sp.waitForTimeout(6800);   // the lobby polls every 6 s: answers and the half-typed response must survive the re-render
ok('quiz answers survive the lobby refresh', (await sp.inputValue('#quiz-frq')) === 'AD shifts right because taxes fell.' && (await sp.isChecked('input[name=q0][value="' + q.mc[0].answer + '"]')));
await shot(sp, 'student-quiz');
await sp.click('form[data-form=quiz] button[type=submit]');
await sp.waitForSelector('text=You got 2 of 3 right');
ok('quiz graded: 2 of 3, with the correct answer and an explanation shown for the miss', /Correct answer:/.test(await text(sp)) && /AD shifts right because taxes fell/.test(await text(sp)));
ok('quiz stored by the server', (await sql(`select quiz_score || '/' || quiz_of from public.classroom_results`)) === '2/3');
await shot(sp, 'student-quiz-graded');

// teacher watches it complete
await tp.goto(sessUrl); await tp.waitForSelector('text=1 of 1 finished');
{ const t = await text(tp); ok('teacher: 1 of 1 finished, class average, highlights, distribution, ranges, prompts, all-finished hint', ['Class average', 'Where the class did best', 'How scores spread out', 'Range across the class', 'Discussion prompts', 'Economic tradeoffs', 'Everyone has finished'].every((x) => t.includes(x)), t.slice(0, 400)); }
ok('teacher: class summary and per-student summary section are present', /CLASS SUMMARY/.test(await text(tp)) && /WRITTEN SUMMARIES/.test(await text(tp)));
await tp.waitForSelector('[data-act=sumtoggle]');
await tp.click('[data-act=sumtoggle]'); await tp.waitForSelector('.t-summary h3:has-text("Written summary: Sam R.")');
ok('teacher can open one student\'s written summary', /Think about it/.test(await text(tp)));
await tp.waitForTimeout(3500);
ok('summary stays open through the live refresh', (await tp.locator('.t-summary h3:has-text("Written summary: Sam R.")').count()) === 1);
ok('individual table shows the name + score', (await tp.locator('table.t-table').first().innerText()).includes(nick) && (await tp.locator('table.t-table').first().innerText()).includes(String(row.score)));
ok('individual table shows the quiz score', /2 \/ 3/.test(await tp.locator('table.t-table:not(.t-board)').first().innerText()), await tp.locator('table.t-table:not(.t-board)').first().innerText());
ok('teacher sees the student quiz, written response and rubric in the summary', /Quiz: 2 of 3 correct/.test(await text(tp)) && /AD shifts right because taxes fell/.test(await text(tp)) && /Rubric/.test(await text(tp)));
{ const [dl] = await Promise.all([tp.waitForEvent('download'), tp.click('[data-act=gradescsv]')]); const csv = fs.readFileSync(await dl.path(), 'utf8');
  ok('grades CSV has the student, score, quiz and written response', csv.startsWith('student,score,status,quiz_correct,quiz_total,quiz_percent,written_response') && csv.includes(nick) && csv.includes(',2,3,67,AD shifts right because taxes fell.'), csv); }
ok('leaderboard shows Finished', /Finished/.test(await tp.locator('table.t-board').innerText()));
await shot(tp, 'teacher-session');
await tp.click('[data-act=reveal]'); await tp.waitForSelector('text=turn off');
ok('reveal toggle works and persists', (await sql(`select reveal_results from public.classroom_sessions`)) === 't');
await tp.click('[data-act=endsession]'); await tp.waitForSelector('dialog[open]');
await tp.click('dialog[open] button[value=ok]'); await tp.waitForSelector('.t-chip:not(.live):has-text("ended")');
ok('end session: confirmation dialog then ended', (await sql(`select status from public.classroom_sessions`)) === 'ended');

// ------------------------------------------------------------ IDOR through the UI: another teacher opens teacher A's URLs
const bp = await newPage(browser, 'B');
await bp.goto(classUrl); await settled(bp);
ok('teacher B opening teacher A classroom URL: not found, no data', /not found|belongs to another/.test(await text(bp)) && !/Period 3/.test(await text(bp)));
await bp.goto(sessUrl); await settled(bp);
ok('teacher B opening teacher A session URL: not found, no data', /not found|belongs to another/.test(await text(bp)) && !/Tax week/.test(await text(bp)));
await bp.goto(APP + '/teacher/classrooms/not-a-uuid'); await settled(bp);
ok('garbage id handled gracefully', /not found|belongs to another/.test(await text(bp)));
await bp.goto(APP + '/teacher/admin'); await settled(bp);
ok('teacher_beta (non-admin) cannot open admin page', !/Owner dashboard/.test(await text(bp)) && (await bp.locator('a[href="/teacher/admin"]').count()) === 0);
await bp.close();

// ------------------------------------------------------------ admin page
const ap = await newPage(browser, 'D');
await ap.goto(APP + '/teacher/admin'); await ap.waitForSelector('text=Stability and load');
ok('admin sees the Owner nav and the overview', /Owner dashboard/.test(await text(ap)) && (await ap.locator('header a[href="/teacher/admin"]').count()) === 1);
ok('overview counts people, classrooms and waiting requests', /2 teachers are waiting for access/.test(await text(ap)) && /Open classrooms/i.test(await text(ap)) && (await ap.locator('svg.t-spark').count()) === 6, (await text(ap)).slice(0, 600));
await shot(ap, 'owner-overview');
await ap.click('a[href="/teacher/admin/classrooms"]'); await ap.waitForSelector('[data-act=ownerfilter]');
ok('owner classrooms: every teacher\'s classroom with session aggregates, no student names', /Period 3/.test(await text(ap)) && /Tax week/.test(await text(ap)) && !/Sam R\./.test(await text(ap)));
await shot(ap, 'owner-classrooms');
await sql(`insert into public.client_errors(kind, fingerprint, message, source, path, build, ua) values ('error', 'fp1', 'TypeError: boom', 'ui.js:1:2', '/', 'b1', 'UA')`);
await ap.click('a[href="/teacher/admin/errors"]'); await ap.waitForSelector('[data-act=resolveerr]');
ok('owner errors: grouped error shown', /TypeError: boom/.test(await text(ap)));
await ap.click('[data-act=resolveerr]'); await ap.waitForFunction(() => /No open errors/.test(document.getElementById('tapp').innerText));
ok('owner errors: resolve hides the group', (await sql(`select count(*) from public.client_errors where resolved_at is null`)) === '0');
await ap.click('a[href="/teacher/admin/feedback"]'); await ap.waitForSelector('text=No feedback yet');
ok('owner feedback page renders', true);
await ap.click('a[href="/teacher/admin/access"]'); await ap.waitForSelector('form[data-form=find]');
ok('admin sees both requests waiting, with school and note', /Waiting for access \(2\)/.test(await text(ap)) && /Central High/.test(await text(ap)) && /AP Gov, 2 sections/.test(await text(ap)));
await ap.click(`[data-act=approve][data-id="${ACCT[NEW].id}"]`);
await ap.waitForFunction(() => /Waiting for access \(1\)/.test(document.getElementById('tapp').innerText));
ok('approve grants teacher_beta and clears the request', (await sql(`select count(*) from public.user_roles where user_id = '${ACCT[NEW].id}' and role = 'teacher_beta' and revoked_at is null`)) === '1');
await ap.click(`[data-act=dismissreq][data-id="${U.P}"]`); await ap.waitForSelector('dialog[open]'); await ap.click('dialog[open] button[value=ok]');
await ap.waitForFunction(() => /No one is waiting/.test(document.getElementById('tapp').innerText));
ok('dismiss removes a request', (await sql(`select dismissed_at is not null from public.teacher_applications where user_id = '${U.P}'`)) === 't');
const np = await newPage(browser, null);
await np.goto(APP + '/teacher'); await np.waitForSelector('form[data-form=signup]');
await np.click('[data-act=mode][data-m=signin]'); await np.fill('#t-email', NEW); await np.fill('#t-pass', 'brandnew123'); await np.click('form[data-form=password] button[type=submit]');
await np.waitForSelector('form[data-form=create]');
ok('approved teacher signs in with a password and reaches the dashboard', /Your classrooms/.test(await text(np)));
await np.close();
await ap.fill('#a-q', EMAIL.P); await ap.click('form[data-form=find] button[type=submit]');
await ap.waitForSelector('[data-act=grant]');
await ap.click('[data-act=grant][data-role=teacher_beta]');
await ap.waitForFunction(() => /teacher_beta/.test(document.getElementById('tapp').innerText) && document.querySelectorAll('[data-act=revokerole]').length >= 5);   // T, B, D, the approved sign-up, and now P
ok('admin granted teacher_beta from the UI', (await sql(`select count(*) from public.user_roles where user_id='${U.P}' and role='teacher_beta' and revoked_at is null`)) === '1');
await shot(ap, 'admin');
await ap.click(`[data-act=revokerole][data-uid="${U.P}"]`); await ap.waitForSelector('dialog[open]'); await ap.click('dialog[open] button[value=ok]');
await ap.waitForFunction((n) => document.querySelectorAll('[data-act=revokerole]').length === n, 4);
ok('admin revoked it from the UI', (await sql(`select count(*) from public.user_roles where user_id='${U.P}' and revoked_at is null`)) === '0');
await ap.close();

// ------------------------------------------------------------ revoked teacher loses access immediately
await sql(`select public.revoke_role_by_email('${EMAIL.T}','teacher_beta')`);
await tp.reload(); await settled(tp);
ok('revoked teacher: refused on next load', /Request Teacher Beta access/.test(await text(tp)) && !/Your classrooms/.test(await text(tp)));
await sql(`select public.grant_role_by_email('${EMAIL.T}','teacher_beta')`);

// ------------------------------------------------------------ student after teacher closes things
await sp.reload(); await settled(sp);
ok('student after session end sees class results (revealed, but <3 results)', /at least 3 students/.test(await text(sp)));
const ar = await sql(`select public.teacher_archive_classroom('${classUrl.split('/').pop()}')`).catch(() => null);
await sql(`update public.teacher_classrooms set archived_at = now(), active = false, join_code = null, join_code_expires_at = null`);
await sp.reload(); await sp.waitForSelector('#class-code');
ok('archived classroom: student returned to join form with explanation', /closed that classroom/.test(await text(sp)));

// ------------------------------------------------------------ slow connection + phone layout for the teacher
latency = 1200;
const mp = await newPage(browser, 'T', { width: 390, height: 844 });
await mp.goto(APP + '/teacher'); 
await mp.waitForSelector('text=Loading...', { timeout: 3000 });
ok('slow connection: loading state is shown', true);
await mp.waitForSelector('form[data-form=create]', { timeout: 15000 });
latency = 0;
ok('teacher dashboard has no horizontal scroll on a phone', await noHScroll(mp));
await shot(mp, 'teacher-dashboard-mobile');
await mp.goto(sessUrl); await mp.waitForSelector('text=Class average');
ok('teacher session page has no horizontal scroll on a phone (table scrolls inside its own box)', await noHScroll(mp), JSON.stringify(await mp.evaluate(() => { const W = document.getElementById('tapp').clientWidth; return [...document.querySelectorAll('#tapp *')].filter((e) => e.getBoundingClientRect().right > W + 1 && !e.closest('.t-scroll')).slice(0, 6).map((e) => e.tagName + '.' + e.className + ' ' + Math.round(e.getBoundingClientRect().right) + '>' + W); })));
await shot(mp, 'teacher-session-mobile');
await mp.goto(APP + '/teacher/resources'); await mp.waitForSelector('text=Teacher guide');
ok('resources page: privacy notes, no compliance claims, no standards claims', /not been independently reviewed/.test(await text(mp)) && !/(COPPA|FERPA|GDPR).*compliant|aligned to|Common Core/i.test(await text(mp)));
await mp.goto(APP + '/teacher/feedback'); await mp.waitForSelector('form[data-form=feedback]');
await mp.fill('#f-worked', 'Great'); await mp.check('input[name=again][value=yes]'); await mp.check('input[name=pay][value=maybe]'); await mp.click('form[data-form=feedback] button[type=submit]');
await mp.waitForSelector('text=Thank you');
ok('feedback saved', (await sql(`select would_pay from public.teacher_feedback`)) === 'maybe');
await mp.close();

// ------------------------------------------------------------ the public game is untouched
const gp = await newPage(browser, null);
await gp.goto(APP + '/'); await gp.waitForSelector('text=You have 14 days in office.');
ok('public game: title screen renders, mode is president, no teacher UI', (await gp.evaluate(() => document.getElementById('viewport').dataset.mode)) === 'president' && (await gp.locator('a[href^="/teacher"]').count()) === 0);
await gp.getByRole('button', { name: /Begin Day 1/ }).click();
ok('public game: free play still starts a normal game', await gp.evaluate(() => window.__app.state.g.phase === 'desk' && window.__app.state.mode === 'free'));
await browser.close();
console.log(`\nUI E2E PASSED (${passed} checks). Screenshots in ${SHOTS}`);
