// /teachers (public info) and /teacher/* (invite-only). The page is only a view: every call below is re-authorized in the
// database against the signed-in user's JWT (feature flag, capability, ownership, rate limit). Hiding a link protects nothing;
// the server does the protecting.
import * as api from '../api.js';
import * as T from './teacherApi.js';
import { esc, num, relTime, when, untilText, avgCards, distChart, rangeChart, highlightList, gradeChips, confirmDialog, toast, copyText, METRICS, fmtMetric } from './kit.js';
import { PROMPTS, WARMUP, EXIT_TICKET } from './prompts.js';
import { Engine } from '../engine.js';
import { buildSummary, buildClassSummary } from '../summary.js';
import { minutesFor } from '../learn.js';
import { summaryCard, classSummaryCard } from './kit.js';
import { overviewPage, classroomsPage, feedbackPage, feedbackCsv, csvOf, errorsPage, ownerTabs } from './owner.js';
import { buildQuiz, UNIT_NAMES } from '../quiz.js';

const RETURN_KEY = 'gias_after_login';
const CONTACT = import.meta.env.VITE_TEACHER_CONTACT_EMAIL || '';
let root, me = null, meFor = null, gate = 'loading', route = null, poll = null, lastHtml = '', lastKey = '', loadSeq = 0, ticker = null;
const ENG = new Engine();
const ui = { ownerFilter: 'open', errDays: 7, errResolved: false, sumOpen: {}, dg: null, off: 0, days: 14, diff: 0, focus: '', showIndiv: false, sending: false, signinErr: '', email: '', mode: null, notice: null, unconfirmed: false, meta: {} };

const daysOut = (d) => d + ' day' + (d === 1 ? '' : 's') + ' · about ' + minutesFor(d);

// ------------------------------------------------------------------ routing
function parse(path) {
  const seg = path.split('/').filter(Boolean);
  if (seg[0] === 'teachers') return { name: 'landing' };
  if (seg[0] !== 'teacher') return { name: 'notfound' };
  if (seg.length === 1) return { name: 'dashboard' };
  if (seg[1] === 'classrooms') return seg[2] && seg.length === 3 ? { name: 'classroom', id: seg[2] } : seg.length === 2 ? { name: 'classrooms' } : { name: 'notfound' };
  if (seg[1] === 'sessions' && seg[2] && seg.length === 3) return { name: 'session', id: seg[2] };
  if (seg[1] === 'admin') { const tab = seg[2] || 'overview'; return seg.length <= 3 && ['overview', 'classrooms', 'feedback', 'errors', 'access'].includes(tab) ? { name: 'admin', tab } : { name: 'notfound' }; }
  if (['resources', 'feedback'].includes(seg[1]) && seg.length === 2) return { name: seg[1] };
  return { name: 'notfound' };
}
export function go(path, replace) { window.history[replace ? 'replaceState' : 'pushState'](null, '', path); load(); }

// ------------------------------------------------------------------ chrome
const nav = (name, href, label) => '<a class="t-nav' + (route && route.name === name ? ' on' : '') + '" href="' + href + '" data-nav>' + label + '</a>';
function shell(inner, opts = {}) {
  const authed = gate === 'ok' && me;
  const who = authed ? esc(me.handle ? '@' + me.handle : 'Signed in') : '';
  return '<div class="t-wrap' + (opts.narrow ? ' narrow' : '') + '"><header class="t-top"><a class="t-brand" href="/teacher" data-nav><svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z" fill="#eef1f6"></path></svg><div><div class="t-brand-t">GIVE IT A SHOT</div><div class="t-brand-s">For teachers <span class="t-pill">BETA</span></div></div></a>' +
    (authed ? '<nav class="t-navs" aria-label="Teacher">' + nav('dashboard', '/teacher', 'Dashboard') + nav('classrooms', '/teacher/classrooms', 'Classrooms') + nav('resources', '/teacher/resources', 'Guide') + nav('feedback', '/teacher/feedback', 'Feedback') + (me.is_admin ? nav('admin', '/teacher/admin', 'Owner') : '') + '</nav>' +
      '<div class="t-who"><span class="t-note">' + who + '</span><button class="t-btn ghost sm" data-act="signout">Sign out</button></div>' : '') +
    '</header><main id="t-main" tabindex="-1">' + inner + '</main><footer class="t-foot">' +
    (authed ? '<button class="t-btn ghost sm" data-act="feedback">Give Feedback</button> ' : '') +
    'Teacher Beta is invite-only and may change. <a href="/teacher/resources" data-nav>Privacy notes</a> · <a href="/" data-nav-out>Back to the game</a></footer></div>';
}
// Whole-page repaint, except on the live session page: while its "page key" is unchanged only the [data-live] regions
// (leaderboard, counts, countdown) are swapped, so scroll position, open summaries and text selection survive the polling.
function paint(html, keepScroll) {
  if (html === lastHtml) return;
  const key = (html.match(/data-pagekey="([^"]*)"/) || [])[1] || '';
  if (keepScroll && key && key === lastKey && root.querySelector('[data-live]')) {
    const t = document.createElement('template'); t.innerHTML = html;
    t.content.querySelectorAll('[data-live]').forEach((el) => { const cur = root.querySelector('[data-live="' + el.dataset.live + '"]'); if (cur && cur.innerHTML !== el.innerHTML) cur.innerHTML = el.innerHTML; });
    lastHtml = html; return;
  }
  const y = root.scrollTop; lastHtml = html; lastKey = key; root.innerHTML = html;
  if (keepScroll) root.scrollTop = y;
}
const loading = () => paint(shell('<div class="t-card"><p class="t-note" role="status">Loading...</p></div>', { narrow: true }));
const errCard = (e) => '<div class="t-card"><h1 class="t-h1">Something went wrong</h1><p role="alert">' + esc(e.message || 'Try again.') + '</p><button class="t-btn" data-act="reload">Try again</button> <a class="t-btn ghost" href="/teacher" data-nav>Dashboard</a></div>';

// ------------------------------------------------------------------ gate
const RECOVERY_KEY = 'gias_pw_recovery', AUTH_ERR_KEY = 'gias_auth_err', ACCOUNT_KEY = 'gias_teacher_account';
// localStorage ('l') / sessionStorage ('s'); even touching them can throw when storage is blocked
const store = (which, k, v) => {
  try { const s = which === 'l' ? window.localStorage : window.sessionStorage; if (v === undefined) return s.getItem(k); if (v === null) s.removeItem(k); else s.setItem(k, v); } catch (e) { /* storage blocked */ }
  return null;
};
async function ensureGate() {
  if (!api.configured) { gate = 'offline'; return false; }
  const user = await api.getUser();
  if (!user) { me = null; meFor = null; gate = 'signin'; return false; }
  ui.email = user.email || ui.email; ui.meta = user.user_metadata || {};
  store('l', ACCOUNT_KEY, '1');
  // Opened a password-reset link: set the new password before anything else.
  if (store('s', RECOVERY_KEY)) { gate = 'recovery'; return false; }
  if (!me || meFor !== user.id) {
    try { me = await T.me(); meFor = user.id; }
    catch (e) { if (e.code === 'not_authenticated') { gate = 'signin'; return false; } gate = 'error'; ui.gateErr = e.message; return false; }
  }
  if (!me.enabled) { gate = 'disabled'; return false; }
  if (!me.authorized) {
    // Accounts created on /teacher carry the access request in their sign-up details; file it once, on the first signed-in visit.
    if (!me.applied && ui.meta.teacher_signup && ui.meta.name && ui.meta.school) {
      try { await T.apply({ name: ui.meta.name, school: ui.meta.school, note: ui.meta.note }); me.applied = true; } catch (e) { /* they can fill in the form instead */ }
    }
    gate = 'denied'; return false;
  }
  gate = 'ok'; return true;
}
const field = (id, label, attrs, hint) => '<label class="t-label" for="' + id + '">' + label + '</label><input id="' + id + '" class="t-input" ' + attrs + '>' + (hint ? '<p class="t-note">' + hint + '</p>' : '');
const errBox = () => '<div class="t-err" role="alert">' + esc(ui.signinErr) + '</div>';
const busy = () => (ui.sending ? 'disabled' : '');
const emailField = () => field('t-email', 'Email', 'name="email" type="email" autocomplete="email" inputmode="email" value="' + esc(ui.email) + '" ' + busy());
const requestFields = (v) => field('t-name', 'Your name', 'name="name" maxlength="80" autocomplete="name" value="' + esc(v.name || '') + '" ' + busy()) +
  field('t-school', 'School', 'name="school" maxlength="120" autocomplete="organization" value="' + esc(v.school || '') + '" ' + busy()) +
  '<label class="t-label" for="t-note">How would you use it? (optional)</label><textarea id="t-note" class="t-input" name="note" rows="2" maxlength="500" ' + busy() + '>' + esc(v.note || '') + '</textarea>';
const modeLink = (m, label) => '<button type="button" class="t-link" data-act="mode" data-m="' + m + '">' + label + '</button>';

function hero() {
  const steps = [['Create a classroom', 'Takes a few seconds. You get a short join code.'], ['Students join', 'They enter the code and their name at giveitashot.online/classroom. No accounts, no emails.'], ['Run a session', 'Pick the length (3 to 28 days) and the difficulty, then press Start: a 5-second countdown begins and the game starts for everyone at once. Watch a live leaderboard while they play.'], ['Discuss', 'Read the written summaries for each student and the whole class, then use the discussion prompts.']];
  return '<section class="t-card"><div class="t-eyebrow">PRIVATE TEACHER BETA</div><h1 class="t-h1">Give It A Shot for the classroom</h1><p class="t-lead">A short economic-policy simulation where every student runs the same country and the class compares what happened. Designed for classroom discussions involving civics, economics, public policy, political institutions, and tradeoffs.</p>' +
    '<ol class="t-steps">' + steps.map((s) => '<li><b>' + esc(s[0]) + '.</b> ' + esc(s[1]) + '</li>').join('') + '</ol>' +
    '<p>Create a free teacher account below. The beta is small, so each account is turned on by hand: we review new accounts and let you know by email.' + (CONTACT ? ' Questions? Email <a href="mailto:' + esc(CONTACT) + '">' + esc(CONTACT) + '</a>.' : '') + '</p>' +
    '<div class="t-actions"><button type="button" class="t-btn gold" data-act="mode" data-m="signup">Create account</button><button type="button" class="t-btn" data-act="mode" data-m="signin">Sign in</button><a class="t-btn ghost" href="/classroom" data-nav-out>I am a student</a></div></section>';
}
function authCard() {
  const m = ui.mode || (store('l', ACCOUNT_KEY) ? 'signin' : 'signup');
  const tabs = '<div class="t-actions" role="tablist"><button type="button" role="tab" aria-selected="' + (m === 'signup') + '" class="t-btn ' + (m === 'signup' ? 'gold' : 'ghost') + '" data-act="mode" data-m="signup">Create account</button><button type="button" role="tab" aria-selected="' + (m !== 'signup') + '" class="t-btn ' + (m !== 'signup' ? 'gold' : 'ghost') + '" data-act="mode" data-m="signin">Sign in</button></div>';
  if (ui.notice) {
    const n = { confirm: ['Check your email', 'We sent a confirmation link to <b>' + esc(ui.email) + '</b>. Open it to finish creating your account. It can take a minute and may land in spam.', '<button type="button" class="t-btn ghost" data-act="resendconfirm">Resend the email</button>'],
      reset: ['Check your email', 'If there is an account for <b>' + esc(ui.email) + '</b>, we sent a link to set a new password. Open it in this browser.', ''],
      link: ['Check your email', 'We sent a sign-in link to <b>' + esc(ui.email) + '</b>. Open it in this browser. It can take a minute and may land in spam.', ''] }[ui.notice];
    return '<section class="t-card" id="t-auth"><h2 class="t-h2">' + n[0] + '</h2><p>' + n[1] + '</p>' + errBox() + '<div class="t-actions">' + n[2] + '<button type="button" class="t-btn ghost" data-act="mode" data-m="signin">Back to sign in</button></div></section>';
  }
  let body;
  if (m === 'signup') body = '<form data-form="signup" novalidate><h2 class="t-h2">Create a teacher account</h2>' + requestFields(ui.req || {}) + emailField() +
    field('t-pass', 'Password', 'name="password" type="password" autocomplete="new-password" minlength="8" ' + busy(), 'At least 8 characters.') + errBox() +
    '<button class="t-btn gold lg" type="submit" ' + busy() + '>' + (ui.sending ? 'Creating account...' : 'Create account') + '</button><p class="t-note">We email you once to confirm the address. Then we review the account and turn on access.</p></form>';
  else if (m === 'forgot') body = '<form data-form="forgot" novalidate><h2 class="t-h2">Reset your password</h2><p>Enter your email and we will send a link to set a new password. This also works if you have only ever signed in with an email link.</p>' + emailField() + errBox() +
    '<button class="t-btn gold lg" type="submit" ' + busy() + '>' + (ui.sending ? 'Sending...' : 'Email me a reset link') + '</button><p>' + modeLink('signin', 'Back to sign in') + '</p></form>';
  else if (m === 'magic') body = '<form data-form="signin" novalidate><h2 class="t-h2">Sign in with an email link</h2><p>We email you a one-time link instead of using a password.</p>' + emailField() + errBox() +
    '<button class="t-btn gold lg" type="submit" ' + busy() + '>' + (ui.sending ? 'Sending...' : 'Email me a sign-in link') + '</button><p>' + modeLink('signin', 'Sign in with a password instead') + '</p></form>';
  else body = '<form data-form="password" novalidate><h2 class="t-h2">Sign in</h2>' + emailField() +
    field('t-pass', 'Password', 'name="password" type="password" autocomplete="current-password" ' + busy()) + errBox() +
    (ui.unconfirmed ? '<p><button type="button" class="t-btn ghost sm" data-act="resendconfirm">Resend the confirmation email</button></p>' : '') +
    '<button class="t-btn gold lg" type="submit" ' + busy() + '>' + (ui.sending ? 'Signing in...' : 'Sign in') + '</button><p>' + modeLink('forgot', 'Forgot password?') + ' · ' + modeLink('magic', 'Email me a sign-in link instead') + '</p></form>';
  return '<section class="t-card" id="t-auth">' + tabs + body + '</section>';
}
function gateView() {
  if (gate === 'offline') return shell('<div class="t-card"><h1 class="t-h1">Unavailable</h1><p>The online service is not configured.</p></div>', { narrow: true });
  if (gate === 'disabled') return shell('<div class="t-card"><h1 class="t-h1">Teacher Beta is currently unavailable</h1><p>Please check back later.</p><a class="t-btn ghost" href="/" data-nav-out>Back to the game</a></div>', { narrow: true });
  if (gate === 'error') return shell(errCard({ message: ui.gateErr }), { narrow: true });
  if (gate === 'recovery') return shell('<form class="t-card" data-form="newpw" novalidate><h1 class="t-h1">Set a new password</h1><p>For <b>' + esc(ui.email) + '</b>.</p>' +
    field('t-pass', 'New password', 'name="password" type="password" autocomplete="new-password" minlength="8" ' + busy(), 'At least 8 characters.') +
    field('t-pass2', 'Type it again', 'name="password2" type="password" autocomplete="new-password" ' + busy()) + errBox() +
    '<button class="t-btn gold lg" type="submit" ' + busy() + '>Save password</button></form>', { narrow: true });
  if (gate === 'denied') {
    const out = '<div class="t-actions"><button class="t-btn ghost" data-act="signout">Sign out</button> <a class="t-btn ghost" href="/" data-nav-out>Back to the game</a></div>';
    if (me && me.applied) return shell('<div class="t-card"><div class="t-eyebrow">TEACHER BETA</div><h1 class="t-h1">You’re on the waitlist</h1><p>Your account <b>' + esc(ui.email) + '</b> is set up and your request is in. The beta is small, so each teacher is turned on by hand. We will email you when your access is ready; then just sign in here again.</p>' +
      (CONTACT ? '<p class="t-note">Questions? Email <a href="mailto:' + esc(CONTACT) + '">' + esc(CONTACT) + '</a>.</p>' : '') + out + '</div>', { narrow: true });
    return shell('<form class="t-card" data-form="apply" novalidate><div class="t-eyebrow">TEACHER BETA</div><h1 class="t-h1">Request Teacher Beta access</h1><p>You are signed in as <b>' + esc(ui.email) + '</b>. Tell us a little about yourself and we will review your request.</p>' +
      requestFields({ name: ui.meta && ui.meta.name, school: ui.meta && ui.meta.school }) + errBox() + '<button class="t-btn gold lg" type="submit" ' + busy() + '>Request access</button></form>' +
      '<div class="t-card">' + out + '</div>', { narrow: true });
  }
  const flash = store('s', AUTH_ERR_KEY);
  if (flash) { store('s', AUTH_ERR_KEY, null); ui.mode = 'signin'; ui.notice = null; ui.signinErr = /expired|invalid/i.test(flash) ? 'That email link has expired or was already used. Sign in, or request a new link.' : flash; }
  return shell(hero() + authCard(), { narrow: true });
}
// ------------------------------------------------------------------ pages
function classroomCard(c) {
  const sess = c.active_session;
  const link = window.location.origin.replace(/^https?:\/\//, '') + '/classroom';
  return '<article class="t-card"><div class="row" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><div class="grow" style="flex:1 1 220px"><div class="t-eyebrow">' + (c.archived_at ? 'ARCHIVED CLASSROOM' : sess ? 'CLASSROOM · SESSION RUNNING' : 'CLASSROOM') + '</div><h3 class="t-h3"><a href="/teacher/classrooms/' + esc(c.id) + '" data-nav>' + esc(c.name) + '</a></h3>' +
    '<p class="t-note">' + c.member_count + ' student' + (c.member_count === 1 ? '' : 's') + ' joined' + (sess ? ' · ' + esc(sess.title) + ' (' + sess.completed + ' finished)' : '') + '</p></div>' +
    (c.join_code ? '<div><div class="t-code sm" aria-label="Join code">' + esc(c.join_code) + '</div><p class="t-note" style="text-align:center;margin:4px 0 0">at ' + esc(link) + '</p></div>' : (c.archived_at ? '' : '<p class="t-note">Joining is off</p>')) + '</div>' +
    '<div class="t-actions"><a class="t-btn' + (sess ? ' gold' : '') + '" href="/teacher/' + (sess ? 'sessions/' + esc(sess.id) : 'classrooms/' + esc(c.id)) + '" data-nav>' + (sess ? 'Open the live session' : 'Open classroom') + '</a>' +
    (!sess && !c.archived_at ? '<a class="t-btn ghost" href="/teacher/classrooms/' + esc(c.id) + '#start" data-nav>Set up a session</a>' : '') + '</div></article>';
}
async function pDashboard(all) {
  const d = await T.dashboard();
  const open = d.classrooms.filter((c) => !c.archived_at), archived = d.classrooms.filter((c) => c.archived_at);
  const list = all ? d.classrooms : open;
  return shell('<div class="t-title"><h1 class="t-h1">' + (all ? 'All classrooms' : 'Your classrooms') + '</h1><span class="t-pill big">Teacher Beta · invite only</span></div>' +
    '<form class="t-card row" data-form="create" novalidate><div class="grow"><label class="t-label" for="new-name">New classroom</label><input id="new-name" class="t-input" name="name" maxlength="80" placeholder="e.g. Period 3 Civics" autocomplete="off"><div class="t-err" id="create-err" role="alert"></div></div><button class="t-btn gold" type="submit">Create classroom</button></form>' +
    (!all && open.length ? '<p class="t-note">' + open.length + ' open classroom' + (open.length === 1 ? '' : 's') + ' · ' + open.reduce((n, c) => n + c.member_count, 0) + ' students joined in total · students enter their code at <b>' + esc(window.location.origin.replace(/^https?:\/\//, '')) + '/classroom</b></p>' : '') +
    (list.length ? list.map(classroomCard).join('') : '<div class="t-card t-empty"><h3 class="t-h3">No classrooms yet</h3><p>Create your first classroom above. You will get a join code to share with students right away.</p>' + (me && me.is_admin ? '<p class="t-note">You are an admin: classrooms made by other teachers are listed under <a href="/teacher/admin" data-nav>Admin</a>. Each teacher only ever sees their own.</p>' : '') + '</div>') +
    (!all && archived.length ? '<p class="t-note"><a href="/teacher/classrooms" data-nav>' + archived.length + ' archived classroom' + (archived.length === 1 ? '' : 's') + '</a></p>' : '') +
    '<h2 class="t-h2">Recent sessions</h2>' + (d.recent_sessions.length ? '<div class="t-card flush"><ul class="t-list">' + d.recent_sessions.map((s) => '<li><a href="/teacher/sessions/' + esc(s.id) + '" data-nav><b>' + esc(s.title) + '</b></a><span class="t-note">' + esc(s.classroom_name) + ' · ' + esc(when(s.started_at)) + ' · ' + s.completed + ' finished</span><span class="t-chip ' + (s.status === 'active' ? 'live' : '') + '">' + esc(s.status === 'active' ? 'running' : 'ended') + '</span></li>').join('') + '</ul></div>' : '<div class="t-card t-empty"><p>No sessions yet.</p></div>'));
}

const codeSpaced = (c) => esc(c.slice(0, 3) + ' ' + c.slice(3));
async function pClassroom(id) {
  if (!T.isUuid(id)) throw new T.TError('not_found');
  const d = await T.getClassroom(id);
  const c = d.classroom, live = d.sessions.find((s) => s.status === 'active'), past = d.sessions.filter((s) => s.status !== 'active');
  const codeLive = c.join_code && new Date(c.join_code_expires_at) > new Date();
  const link = window.location.origin + '/classroom';
  const codePanel = c.archived_at ? '<p class="t-note">This classroom is archived, so students can no longer join.</p>' :
    codeLive ? '<div class="t-code" aria-label="Join code ' + esc(c.join_code.split('').join(' ')) + '">' + codeSpaced(c.join_code) + '</div><p class="t-note">Students go to <b>' + esc(link.replace(/^https?:\/\//, '')) + '</b> and enter this code. ' + esc(untilText(c.join_code_expires_at)) + '.</p>' +
      '<div class="t-actions"><button class="t-btn" data-act="copycode" data-v="' + esc(c.join_code) + '">Copy code</button><button class="t-btn ghost" data-act="copylink" data-v="' + esc(link) + '">Copy link</button><button class="t-btn ghost" data-act="newcode" data-id="' + esc(c.id) + '">New code</button><button class="t-btn ghost" data-act="revokecode" data-id="' + esc(c.id) + '">Turn off joining</button></div>' :
      '<p class="t-alert">Joining is turned off. Make a code when you are ready for students to join.</p><div class="t-actions"><label class="t-note" for="ttl">Valid for</label><select id="ttl" class="t-input sm"><option value="1">1 hour</option><option value="24" selected>24 hours</option><option value="168">7 days</option></select><button class="t-btn gold" data-act="newcode" data-id="' + esc(c.id) + '">Make a join code</button></div>';
  const sessionPanel = c.archived_at ? '' : live ?
    '<section class="t-card"><div class="t-eyebrow">CURRENT SESSION</div><h2 class="t-h2">' + esc(live.title) + ' <span class="t-chip live">running</span></h2><p>' + live.completed + ' of ' + d.members.length + ' students finished.</p><a class="t-btn gold" href="/teacher/sessions/' + esc(live.id) + '" data-nav>Open session dashboard</a></section>' :
    '<form id="start" class="t-card" data-form="start" data-id="' + esc(c.id) + '" novalidate><div class="t-eyebrow">SET UP A SESSION</div><h2 class="t-h2">Run the simulation with your class</h2><p class="t-note">Everyone plays the same country and the same events, so outcomes are directly comparable. This opens a waiting room; nothing starts until you press <b>Start simulation</b>.</p>' +
      '<label class="t-label" for="s-title">Session title</label><input id="s-title" class="t-input" name="title" maxlength="80" value="Class simulation">' +
      '<label class="t-label" for="s-days">How many days should the simulation last?</label>' +
      '<div class="t-slider"><input id="s-days" name="days" type="range" min="3" max="28" step="1" value="' + ui.days + '" aria-describedby="s-days-out"><output id="s-days-out" class="t-sout" for="s-days">' + esc(daysOut(ui.days)) + '</output></div>' +
      '<div class="t-note">Each simulated day takes a student about 1 to 2 minutes. Students&rsquo; instructions, tutorial and help screens update to match.</div>' +
      '<fieldset class="t-diff"><legend class="t-label">Difficulty</legend>' +
      '<label class="t-opt"><input type="radio" name="difficulty" value="0"' + (ui.diff === 0 ? ' checked' : '') + '><span><b>AP / Advanced</b><br><span class="t-note">The full simulation: about three memos a day, power plays, scandal, impeachment and revolutions.</span></span></label>' +
      '<label class="t-opt"><input type="radio" name="difficulty" value="1"' + (ui.diff === 1 ? ' checked' : '') + '><span><b>Core (simplified)</b><br><span class="t-note">For regular high school classes: fewer memos a day, no executive actions or political capital, no scandal or impeachment, and plain-language help on every policy.</span></span></label></fieldset>' +
      '<label class="t-label" for="s-focus">AP Macroeconomics unit (optional)</label><select id="s-focus" class="t-input" name="focus" aria-describedby="s-focus-note"><option value="">Mixed: bills from every topic</option>' +
      Object.keys(UNIT_NAMES).map((k) => '<option value="' + k + '"' + (ui.focus === k ? ' selected' : '') + '>' + esc(UNIT_NAMES[k]) + '</option>').join('') + '</select>' +
      '<div class="t-note" id="s-focus-note">With a unit chosen, the desk deals that unit’s bills first (from about a quarter of the desk for Unit 6, which has the fewest bills, to about three quarters for Unit 3), and the questions at the end lean toward it. Everyone still plays the same country.</div>' +
      '<label class="t-label" for="s-ins">Instructions for students (optional)</label><textarea id="s-ins" class="t-input" name="instructions" rows="3" maxlength="600" placeholder="e.g. Play through once. Do not talk until everyone is finished."></textarea><div class="t-err" id="start-err" role="alert"></div><button class="t-btn gold lg" type="submit">Open the waiting room</button></form>';
  return shell('<p class="t-crumb"><a href="/teacher" data-nav>Dashboard</a> / ' + esc(c.name) + '</p><div class="t-title"><h1 class="t-h1">' + esc(c.name) + '</h1>' + (c.archived_at ? '<span class="t-chip">archived</span>' : '<span class="t-chip live">open</span>') + '</div>' +
    '<section class="t-card"><div class="t-eyebrow">JOIN CODE</div>' + codePanel + '</section>' + sessionPanel +
    '<section class="t-card"><div class="t-eyebrow">STUDENTS</div><h2 class="t-h2">' + d.members.length + ' joined</h2>' + (d.members.length ? '<ul class="t-names">' + d.members.map((m) => '<li>' + esc(m.display_name) + ' <span class="t-note">' + esc(relTime(m.last_active_at)) + '</span></li>').join('') + '</ul><p class="t-note">Students appear under the names they typed in. We never collect emails.</p>' : '<p class="t-empty">Nobody has joined yet. Share the code above.</p>') + '</section>' +
    (past.length ? '<section class="t-card flush"><div class="t-eyebrow pad">PAST SESSIONS</div><ul class="t-list">' + past.map((s) => '<li><a href="/teacher/sessions/' + esc(s.id) + '" data-nav><b>' + esc(s.title) + '</b></a><span class="t-note">' + esc(when(s.started_at)) + ' · ' + s.completed + ' finished</span></li>').join('') + '</ul></section>' : '') +
    '<section class="t-card"><div class="t-eyebrow">MANAGE</div><div class="t-actions">' + (c.archived_at ? '' : '<button class="t-btn ghost" data-act="archive" data-id="' + esc(c.id) + '">Archive classroom</button>') + '<button class="t-btn danger" data-act="delete" data-id="' + esc(c.id) + '">Delete classroom and its data</button></div><p class="t-note">Archiving ends any running session and stops new joins; results stay available. Deleting removes the classroom, nicknames and all results permanently.</p></section>');
}

const pct = (n, d) => (d ? Math.max(0, Math.min(100, Math.round((n / d) * 100))) : 0);
function rowStatus(p, phase) {
  if (p.completed) return p.over ? 'Removed from office' : 'Finished';
  if (phase === 'lobby' || phase === 'countdown') return 'Ready';
  if (p.live_score != null) return p.over ? 'Removed (finishing)' : 'Playing';
  return 'Not started yet';
}
function boardHtml(list, days, phase) {
  if (!list.length) return '<p class="t-empty">Nobody has joined this classroom yet.</p>';
  if (phase === 'lobby' || phase === 'countdown') return '<ul class="t-names">' + list.map((p) => '<li><span class="t-tick" aria-hidden="true">✓</span>' + esc(p.display_name) + ' <button class="t-link" data-act="rmember" data-id="' + esc(p.member_id) + '" data-who="' + esc(p.display_name) + '" aria-label="Remove ' + esc(p.display_name) + '">remove</button></li>').join('') + '</ul>';
  const ranked = list.filter((p) => p.live_score != null).length;
  let rank = 0;
  const rows = list.map((p) => {
    const has = p.live_score != null; if (has) rank++;
    const day = p.completed ? days : (p.day || 0);
    return '<tr class="' + (p.completed ? 'done' : '') + '"><td class="t-rk">' + (has ? rank : '–') + '</td><th scope="row">' + esc(p.display_name) + '</th>' +
      '<td><div class="t-prog" role="img" aria-label="Day ' + day + ' of ' + days + '"><i style="width:' + pct(day, days) + '%"></i></div><span class="t-note">' + (day ? 'Day ' + day + ' of ' + days : 'Not started') + '</span></td>' +
      '<td class="t-num">' + (has ? esc(p.live_score) : '–') + '</td><td class="t-num">' + (has ? Math.round(p.live_approval) + '%' : '–') + '</td><td>' + esc(rowStatus(p, phase)) + '</td>' +
      '<td><button class="t-link" data-act="rmember" data-id="' + esc(p.member_id) + '" data-who="' + esc(p.display_name) + '" aria-label="Remove ' + esc(p.display_name) + '">remove</button></td></tr>';
  }).join('');
  return '<div class="t-scroll"><table class="t-table t-board"><thead><tr><th scope="col">#</th><th scope="col">Student</th><th scope="col">Progress</th><th scope="col">Score</th><th scope="col">Approval</th><th scope="col">Status</th><th scope="col"><span class="t-sr">Actions</span></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<p class="t-note">' + ranked + ' of ' + list.length + ' students on the board. Scores update after each simulated day and are estimates until a student finishes (the final score also counts where the country is headed).</p>';
}
function individualTable(results) {
  const head = '<tr><th>Student</th><th>Score</th><th>Quiz</th>' + METRICS.map((m) => '<th>' + esc(m.label.replace(' (GDP growth)', '')) + '</th>').join('') + '<th>Status</th></tr>';
  return '<div class="t-scroll"><table class="t-table"><thead>' + head + '</thead><tbody>' + results.map((r) => '<tr><th scope="row">' + esc(r.display_name) + '</th><td>' + esc(r.score) + '</td><td>' + (r.quiz_of ? esc(r.quiz_score + ' / ' + r.quiz_of) : '–') + '</td>' + METRICS.map((m) => '<td>' + esc(fmtMetric(m, r[m.key])) + '</td>').join('') + '<td>' + (r.completion_status === 'removed' ? 'removed from office' : 'finished term') + '</td></tr>').join('') + '</tbody></table></div>' +
    '<div class="t-actions"><button class="t-btn ghost sm" data-act="gradescsv">Download grades (CSV)</button></div>' +
    '<p class="t-note">Quiz: multiple-choice questions built from each student’s own game, graded automatically. Written responses are in each student’s summary below.</p>';
}
// The student's quiz, rebuilt from the same stored result the server graded: their choices, the key and the written response with a rubric.
function quizDetail(r, focus) {
  let q = null; try { q = buildQuiz(r, { focus: focus || null, titleOf: (id) => { const p = ENG.pol(id); return p ? p.t : ''; } }); } catch (e) { q = null; }
  if (!q) return '';
  const z = r.quiz;
  const mcs = q.mc.map((m, i) => {
    const a = z && z.answers ? z.answers[i] : null, ok = a === m.answer;
    return '<li><p>' + esc(m.q) + '</p>' + (z ? '<p class="t-quiz-a ' + (ok ? 'ok' : 'no') + '">' + (ok ? 'Correct: ' : 'Chose: ') + esc(m.choices[a] || '(none)') + '</p>' : '') +
      (z && ok ? '' : '<p class="t-note">Answer: ' + esc(m.choices[m.answer]) + '</p>') + '</li>';
  }).join('');
  return '<div class="t-quizbox"><h3 class="t-h3">Quiz' + (z ? ': ' + esc(r.quiz_score) + ' of ' + esc(r.quiz_of) + ' correct' : ' (not submitted yet)') + '</h3><ol class="t-bul">' + mcs + '</ol>' +
    '<h3 class="t-h3">Written response</h3><p class="t-pre t-note">' + esc(q.frq.q) + '</p>' + (z ? (z.frq ? '<p class="t-pre t-quiz-frq">' + esc(z.frq) + '</p>' : '<p class="t-note">No written response.</p>') : '') +
    '<p class="t-note"><b>Rubric</b> (1 point each):</p><ul class="t-rubric">' + q.frq.rubric.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div>';
}
const gradesCsv = (rows) => csvOf(['student', 'score', 'status', 'quiz_correct', 'quiz_total', 'written_response'], rows.map((r) => ({
  student: r.display_name, score: r.score, status: r.completion_status === 'removed' ? 'removed from office' : 'finished term',
  quiz_correct: r.quiz ? r.quiz_score : '', quiz_total: r.quiz ? r.quiz_of : '', written_response: r.quiz ? r.quiz.frq || '' : '' })));

// plain-text versions for "Copy" (paste into a gradebook note, an email or a doc)
const plainSum = (sm, who) => [who ? who + ' — ' + sm.headline : sm.headline].concat(sm.paras, ['', 'Think about it:'], sm.questions.map((q) => '- ' + q)).join('\n');
const plainClass = (cs) => ['Class summary'].concat(cs.paras, ['', 'Discussion questions:'], cs.questions.map((q) => '- ' + q)).join('\n');

async function pSession(id) {
  if (!T.isUuid(id)) throw new T.TError('not_found');
  const d = await T.getSession(id);
  ui.off = Date.parse(d.server_now) - Date.now();
  const s = d.session, st = d.stats, parts = d.participants, n = parts.length, done = st.completed, active = s.status === 'active';
  const left = s.starts_at ? (Date.parse(s.starts_at) - (Date.now() + ui.off)) / 1000 : null;
  const phase = !active ? 'ended' : !s.starts_at ? 'lobby' : left > 0 ? 'countdown' : 'running';
  route.active = active; route.phase = phase; route.starts = s.starts_at;
  const allDone = n > 0 && done >= n;
  // the join code lives on the classroom; fetch it at most every 30s so students can read it off the projected screen
  if (active && (!ui.jc || ui.jc.cid !== d.classroom.id || Date.now() - ui.jc.at > 30000)) {
    try { const g = await T.getClassroom(d.classroom.id); ui.jc = { cid: d.classroom.id, at: Date.now(), code: g.classroom.join_code, exp: g.classroom.join_code_expires_at }; } catch (e) { /* the code panel is optional */ }
  }
  const jc = active && ui.jc && ui.jc.cid === d.classroom.id ? ui.jc : null;
  const jcLive = !!(jc && jc.code && new Date(jc.exp) > new Date());
  const joinHost = esc(window.location.host + '/classroom');
  const classLink = '/teacher/classrooms/' + esc(d.classroom.id);
  const joinPanel = !jc ? '' : jcLive
    ? '<div class="t-join"><div class="t-code" aria-label="Join code ' + esc(jc.code.split('').join(' ')) + '">' + codeSpaced(jc.code) + '</div><p class="t-note">Students go to <b>' + joinHost + '</b> and enter this code.</p></div>'
    : '<p class="t-alert">Joining is turned off, so students cannot get in. <a href="' + classLink + '" data-nav>Make a join code</a> on the classroom page.</p>';
  const joinLine = !jc || phase !== 'running' ? '' : jcLive
    ? '<p class="t-note t-joinline">Joining late? Go to <b>' + joinHost + '</b> and enter <b class="t-code-inline">' + codeSpaced(jc.code) + '</b></p>' : '';
  // decision digests (for the written summaries) are fetched once per new result, not on every poll
  const quizzes = d.results.filter((r) => r.quiz_of).length;
  if (done > 0 && (!ui.dg || ui.dg.sid !== id || ui.dg.n !== done || ui.dg.q !== quizzes)) {
    try { const g = await T.digests(id); ui.dg = { sid: id, n: done, q: quizzes, days: g.days, rows: g.rows }; } catch (e) { /* summaries are optional */ }
  }
  const dgRows = ui.dg && ui.dg.sid === id ? ui.dg.rows : [];
  let classSum = null; try { classSum = dgRows.length ? buildClassSummary(ENG, dgRows, s.days) : null; } catch (e) { classSum = null; }
  ui._classSum = classSum;
  const meta = (s.difficulty === 1 ? 'Core (simplified)' : 'AP / Advanced') + (s.focus && UNIT_NAMES[s.focus] ? ' · ' + UNIT_NAMES[s.focus] : '');
  const openKey = Object.keys(ui.sumOpen).filter((k) => ui.sumOpen[k]).sort().join(',');
  const key = [phase, done, quizzes, s.reveal_results, openKey, dgRows.length, jc ? (jcLive ? jc.code : 'off') : ''].join('|');
  const sumCards = dgRows.map((r) => {
    let sm = null; try { sm = r.digest ? buildSummary(ENG, r.digest, { score: r.score, cons: r.cons_letter, lib: r.lib_letter }) : null; } catch (e) { sm = null; }
    ui['_sum_' + r.member_id] = sm ? plainSum(sm, r.display_name) : '';
    const open = !!ui.sumOpen[r.member_id];
    return '<div class="t-sumrow"><div class="t-actions"><b>' + esc(r.display_name) + '</b><span class="t-note">score ' + esc(r.score) + ' · ' + (r.completion_status === 'removed' ? 'removed from office' : 'finished term') + '</span>' +
      '<button class="t-btn ghost sm" data-act="sumtoggle" data-id="' + esc(r.member_id) + '" aria-expanded="' + open + '">' + (open ? 'Hide summary' : 'Read summary') + '</button>' +
      (open && sm ? '<button class="t-btn ghost sm" data-act="copysum" data-id="' + esc(r.member_id) + '">Copy</button>' : '') + '</div>' +
      (open ? (sm ? summaryCard(sm, { title: 'Written summary: ' + r.display_name, label: 'Summary for ' + r.display_name }) : '<p class="t-note">No summary available for this result.</p>') + quizDetail(r, s.focus) : '') + '</div>';
  }).join('');

  let control = '';
  if (phase === 'lobby') {
    control = '<section class="t-card t-launch"><div class="t-eyebrow">WAITING ROOM</div><h2 class="t-h2" data-live="lobbycount">' + n + ' student' + (n === 1 ? '' : 's') + ' ready</h2>' + joinPanel +
      '<p class="t-note">' + esc(meta) + ' · ' + esc(daysOut(s.days)) + '. Students see the waiting room now. When you press Start, a 5-second countdown appears on every screen and the game begins for everyone at the same moment. Students who join after that start right away.</p>' +
      '<div class="t-actions"><button class="t-btn gold lg" data-act="startsim" data-id="' + esc(s.id) + '"' + (n ? '' : ' disabled') + '>Start simulation</button>' + (n ? '' : '<span class="t-note">Waiting for at least one student to join.</span>') + '</div></section>';
  } else if (phase === 'countdown') {
    const c = Math.max(0, Math.ceil(left));
    control = '<section class="t-card t-launch t-countdown"><div class="t-eyebrow">STARTING</div><div class="t-count" role="timer" data-live="cd">' + c + '</div><p class="t-note">The game starts on every student screen when this reaches zero.</p>' + joinPanel + '</section>';
  }
  return shell('<span hidden data-pagekey="' + esc(key) + '"></span><p class="t-crumb"><a href="/teacher" data-nav>Dashboard</a> / <a href="/teacher/classrooms/' + esc(d.classroom.id) + '" data-nav>' + esc(d.classroom.name) + '</a> / ' + esc(s.title) + '</p>' +
    '<div class="t-title"><h1 class="t-h1">' + esc(s.title) + '</h1><span class="t-chip ' + (active ? 'live' : '') + '">' + (phase === 'ended' ? 'ended' : phase === 'lobby' ? 'waiting room' : phase === 'countdown' ? 'starting' : 'running') + '</span></div>' +
    '<p class="t-note">' + esc(meta) + ' · ' + esc(daysOut(s.days)) + '</p>' + joinLine + control +
    '<section class="t-card"><div class="t-eyebrow">' + (phase === 'lobby' || phase === 'countdown' ? 'WHO IS HERE' : 'LIVE LEADERBOARD') + '</div><h2 class="t-h2" data-live="head">' + (phase === 'lobby' || phase === 'countdown' ? n + ' joined' : done + ' of ' + n + ' finished') + '</h2>' +
    (phase === 'lobby' || phase === 'countdown' ? '' : '<div class="t-meter" role="progressbar" aria-valuemin="0" aria-valuemax="' + n + '" aria-valuenow="' + done + '" data-live="meter"><i style="width:' + pct(done, n) + '%"></i></div>') +
    '<div data-live="board">' + boardHtml(parts, s.days, phase) + '</div>' +
    '<div class="t-actions">' + (active && phase !== 'lobby' ? '<button class="t-btn danger" data-act="endsession" data-id="' + esc(s.id) + '" data-pending="' + (n - done) + '">End session</button>' : '') + (active && phase === 'lobby' ? '<button class="t-btn ghost" data-act="endsession" data-id="' + esc(s.id) + '" data-pending="0">Cancel session</button>' : '') +
    '<button class="t-btn ' + (s.reveal_results ? 'gold' : 'ghost') + '" data-act="reveal" data-id="' + esc(s.id) + '" data-on="' + (s.reveal_results ? '0' : '1') + '" aria-pressed="' + !!s.reveal_results + '">' + (s.reveal_results ? 'Class results are shared with students (turn off)' : 'Share class results with students') + '</button></div>' +
    '<p class="t-note">Students never see each other’s names or individual scores. When shared, they see class totals only, and only once at least 3 students have finished.</p>' +
    (active && allDone && phase === 'running' ? '<div class="t-alert ok" role="status" data-live="alldone">Everyone has finished. A good moment to end the session and start the discussion.</div>' : '') + '</section>' +
    (done > 0 ? '<section class="t-card"><div class="t-eyebrow">CLASS SUMMARY</div><h2 class="t-h2">What happened across the class</h2>' + (classSum ? classSummaryCard(classSum, true) + '<div class="t-actions"><button class="t-btn ghost sm" data-act="copysum" data-id="class">Copy class summary</button></div>' : '<p class="t-note">Loading the written summary...</p>') + '</section>' : '') +
    '<section class="t-card"><div class="t-eyebrow">CLASS RESULTS</div><h2 class="t-h2">Class average</h2>' + avgCards(st.average) +
    (st.average ? '<p class="t-note">' + st.removed_from_office + ' of ' + done + ' were removed from office before the term ended.</p>' : '') + '</section>' +
    (st.average ? '<section class="t-card"><div class="t-eyebrow">HIGHLIGHTS</div><h2 class="t-h2">Where the class did best</h2>' + highlightList(st.highlights) + '<p class="t-note">Values only, with no student names attached.</p></section>' +
      '<section class="t-card"><div class="t-eyebrow">DISTRIBUTION</div><h2 class="t-h2">How scores spread out</h2>' + distChart(st.distribution) + '<p class="t-note">Grades from conservatives: ' + gradeChips(st.conservative_grades) + '<br>Grades from liberals: ' + gradeChips(st.liberal_grades) + '</p></section>' +
      '<section class="t-card"><div class="t-eyebrow">COMPARE OUTCOMES</div><h2 class="t-h2">Range across the class</h2><p class="t-note">The bar spans the lowest to highest result; the white mark is the class average.</p>' + rangeChart(d.results) + '</section>' +
      '<section class="t-card"><div class="t-eyebrow">INDIVIDUAL RESULTS</div>' + individualTable(d.results) + '</section>' +
      '<section class="t-card"><div class="t-eyebrow">WRITTEN SUMMARIES</div><h2 class="t-h2">One for each student</h2><p class="t-note">Generated from each student’s actual decisions: what they signed and vetoed, how the country changed, and questions to talk about. Read them before conferencing with a student.</p>' + (sumCards || '<p class="t-note">Loading...</p>') + '</section>' : '') +
    promptsSection(done > 0), { });
}
function promptsSection(ready) {
  return '<section class="t-card"><div class="t-eyebrow">DISCUSSION</div><h2 class="t-h2">Discussion prompts</h2><p class="t-note">' + (ready ? 'Pick two or three. Ask students to point to a specific decision they made.' : 'Available once students finish. Open them any time to plan.') + '</p>' +
    '<details><summary>Warm-up (before students play)</summary><ul class="t-bul">' + WARMUP.map((p) => '<li>' + esc(p) + '</li>').join('') + '</ul></details>' +
    PROMPTS.map((g, i) => '<details' + (i === 0 && ready ? ' open' : '') + '><summary>' + esc(g.title) + '</summary><ul class="t-bul">' + g.items.map((p) => '<li>' + esc(p) + '</li>').join('') + '</ul></details>').join('') +
    '<details><summary>Exit ticket</summary><ul class="t-bul">' + EXIT_TICKET.map((p) => '<li>' + esc(p) + '</li>').join('') + '</ul></details></section>';
}

function pResources() {
  const sec = (t, body) => '<section class="t-card"><h2 class="t-h2">' + esc(t) + '</h2>' + body + '</section>';
  const ul = (a) => '<ul class="t-bul">' + a.map((x) => '<li>' + x + '</li>').join('') + '</ul>';
  return shell('<div class="t-title"><h1 class="t-h1">Teacher guide</h1></div>' +
    sec('What is Give It A Shot?', '<p>An economic-policy simulation you can run for 3 to 28 days. Each day the student, as President, signs or vetoes memos and may take bold executive actions, while approval, Congress, scandal and the economy respond. The game is a deliberately simplified parody; it is a starting point for discussion, not a forecast of what real policies do.</p><p>Designed for classroom discussions involving civics, economics, public policy, political institutions, and tradeoffs.</p>') +
    sec('How long does a session take?', '<p>Each simulated day takes a student roughly 1 to 2 minutes, so a 14-day term is about 14 to 28 minutes and a 7-day term is about 7 to 14 minutes. These are our estimates, not measured figures: please tell us how long it took in your class. The slider on the session form shows the estimate for the length you pick. For a 45 to 50 minute period, 7 to 10 days leaves room for setup and a debrief.</p>') +
    sec('Difficulty levels', ul(['<b>AP / Advanced:</b> the full simulation. About three memos a day (for a 14-day term), power plays, scandal, impeachment trials and revolutions.', '<b>Core (simplified):</b> for regular high school classes. One or two memos a day, no executive actions or political capital, no scandal or impeachment. Students focus on the policy trade-offs, with plain-language explanations on every policy.', 'Students can tap <b>What does this mean?</b> on any policy or executive action for a plain-English explanation, and <b>See the evidence</b> for the real-world research. The tutorial and Help screen update to match the length and difficulty you choose.'])) +
    sec('Suggested lesson structure', ul(['<b>5 min:</b> Warm-up question; tell students the goal is long-term prosperity, not winning an argument.', '<b>3 min:</b> Students go to <b>' + esc(window.location.host) + '/classroom</b> and enter the code and their name. Press <b>Start simulation</b> when most have joined: a 5-second countdown starts the game for everyone at once.', '<b>10 to 25 min:</b> Students play. Everyone gets the same country and starting events. Watch the live leaderboard.', '<b>10 to 15 min:</b> End the session, read the class summary together, and use two or three discussion prompts.', '<b>2 min:</b> Exit ticket.'])) +
    sec('Learning objectives', ul(['Identify tradeoffs between growth, inflation, unemployment and the deficit.', 'Explain how political incentives (approval, Congress, scandal) can pull against economically optimal choices.', 'Compare different decisions made in identical circumstances and reason about why outcomes differed.', 'Evaluate the assumptions a simulation makes about the real world.'])) +
    sec('Discussion questions', PROMPTS.map((g) => '<h3 class="t-h3">' + esc(g.title) + '</h3>' + ul(g.items.map(esc))).join('')) +
    sec('Technical requirements', ul(['Any current browser on a phone, tablet, laptop or Chromebook, with an internet connection.', 'Students do <b>not</b> need an account or email address.', 'Teachers sign in with an invited email address (one-time link, no password).', 'If a student refreshes mid-game, that game restarts. Their finished result is saved only when they finish.'])) +
    sec('Privacy notes', ul(['Students type the name they want you to see (we ask for first name and last initial). We never ask for an email, and we do not check names against any school roster. If a student leaves the name blank, a random nickname is used instead.', 'We store each student’s in-game decisions and resulting scores, plus a last-active time, for the classroom.', 'If a page hits an error, the site sends us the error message, the page address and the browser type so we can fix it. Error reports never include names or game answers.', 'You see the names students typed, who is playing, their live scores, finished results, and a written summary of each student’s decisions. You cannot see student emails because we never collect them. You can remove a student from a session at any time.', 'Students see their own result. Class totals are shown to them only if you choose to share, and only once at least 3 students have finished.', 'You can archive a classroom (stops joining) or delete it (permanently removes all of its data). A student can leave at any time, which deletes their name and result.', 'This beta has not been independently reviewed for legal or regulatory compliance. If your school requires an approval process for student software, please check with your administrator before using it.'])) +
    sec('Feedback', '<p>We are asking a small group of teachers to help shape this. What worked, what confused students, and what you would change are the most useful things you can tell us.</p><button class="t-btn gold" data-act="feedback">Give Feedback</button>'));
}

async function pFeedback() {
  const d = await T.dashboard().catch(() => ({ classrooms: [] }));
  const done = ui.fbDone;
  return shell('<div class="t-title"><h1 class="t-h1">Give feedback</h1></div>' + (done ? '<div class="t-card"><div class="t-alert ok" role="status">Thank you. Your feedback was sent.</div><a class="t-btn" href="/teacher" data-nav>Back to dashboard</a></div>' :
    '<form class="t-card" data-form="feedback" novalidate><p>This takes about two minutes and goes straight to the person building the beta.</p>' +
    '<label class="t-label" for="f-class">Which classroom is this about? (optional)</label><select id="f-class" name="classroom" class="t-input"><option value="">Not about one classroom</option>' + d.classrooms.map((c) => '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>').join('') + '</select>' +
    '<label class="t-label" for="f-worked">What worked?</label><textarea id="f-worked" name="worked" class="t-input" rows="3" maxlength="2000"></textarea>' +
    '<label class="t-label" for="f-conf">What was confusing?</label><textarea id="f-conf" name="confused" class="t-input" rows="3" maxlength="2000"></textarea>' +
    '<label class="t-label" for="f-change">What would you change?</label><textarea id="f-change" name="change" class="t-input" rows="3" maxlength="2000"></textarea>' +
    '<fieldset class="t-fs"><legend class="t-label">Would you use it again?</legend><label><input type="radio" name="again" value="yes"> Yes</label> <label><input type="radio" name="again" value="no"> No</label></fieldset>' +
    '<fieldset class="t-fs"><legend class="t-label">Would you pay for it?</legend><label><input type="radio" name="pay" value="yes"> Yes</label> <label><input type="radio" name="pay" value="maybe"> Maybe</label> <label><input type="radio" name="pay" value="no"> No</label></fieldset>' +
    '<p class="t-note">Nothing is charged and nothing is being sold. This only tells us what is worth building.</p><div class="t-err" id="fb-err" role="alert"></div><button class="t-btn gold lg" type="submit">Send feedback</button></form>'), { narrow: true });
}

async function pAdmin() {
  if (!me.is_admin) throw new T.TError('not_authorized');
  if (route.tab === 'overview') return shell(overviewPage(await T.adminOverview()));
  if (route.tab === 'classrooms') return shell(classroomsPage(await T.adminOwnerClassrooms(), { filter: ui.ownerFilter }));
  if (route.tab === 'feedback') { ui._feedback = await T.adminFeedback(); return shell(feedbackPage(ui._feedback)); }
  if (route.tab === 'errors') return shell(errorsPage(await T.adminErrors(ui.errDays), { days: ui.errDays, showResolved: ui.errResolved }));
  const [roles, pending] = await Promise.all([T.adminRoles(), T.adminApplications()]);
  const found = ui.found || [];
  const rolesList = '<ul class="t-list">' + roles.map((r) => '<li><span><b>' + esc(r.handle ? '@' + r.handle : r.email) + '</b> <span class="t-note">' + esc(r.email) + '</span></span><span class="t-chip">' + esc(r.role) + '</span><button class="t-btn ghost sm" data-act="revokerole" data-uid="' + esc(r.user_id) + '" data-role="' + esc(r.role) + '" data-who="' + esc(r.handle || r.email) + '">Revoke</button></li>').join('') + '</ul>';
  const pendingList = '<ul class="t-list">' + pending.map((r) => '<li><span><b>' + esc(r.name) + '</b> · ' + esc(r.school) + (r.confirmed ? '' : ' <span class="t-chip">email not confirmed</span>') + '<br><span class="t-note">' + esc(r.email) + ' · ' + esc(relTime(r.created_at)) + '</span>' +
    (r.note ? '<br><span class="t-note">\u201c' + esc(r.note) + '\u201d</span>' : '') + '</span><span class="t-actions"><button class="t-btn gold sm" data-act="approve" data-id="' + esc(r.user_id) + '" data-who="' + esc(r.name) + '">Approve</button><button class="t-btn ghost sm" data-act="dismissreq" data-id="' + esc(r.user_id) + '" data-who="' + esc(r.name) + '">Dismiss</button></span></li>').join('') + '</ul>';
  return shell('<div class="t-title"><h1 class="t-h1">Owner dashboard</h1></div>' + ownerTabs('access') +
    '<h2 class="t-h2">Waiting for access' + (pending.length ? ' (' + pending.length + ')' : '') + '</h2><section class="t-card flush">' + (pending.length ? pendingList : '<p class="t-empty pad">No one is waiting.</p>') + '</section>' +
    '<p class="t-note">Approving turns on teacher_beta right away. No email is sent, so let the teacher know they can sign in.</p>' +
    '<form class="t-card row" data-form="find" novalidate><div class="grow"><label class="t-label" for="a-q">Find a user by exact email or handle prefix</label><input id="a-q" class="t-input" name="q" autocomplete="off" value="' + esc(ui.findQ || '') + '"><div class="t-err" id="find-err" role="alert"></div></div><button class="t-btn" type="submit">Search</button></form>' +
    (ui.findQ ? '<section class="t-card flush">' + (found.length ? '<ul class="t-list">' + found.map((u) => '<li><span><b>' + esc(u.handle ? '@' + u.handle : '(no handle yet)') + '</b> <span class="t-note">' + esc(u.email) + '</span></span><span>' + u.roles.map((r) => '<span class="t-chip">' + esc(r) + '</span>').join(' ') + '</span><span class="t-actions"><button class="t-btn sm" data-act="grant" data-uid="' + esc(u.user_id) + '" data-role="teacher_beta">Grant teacher_beta</button><button class="t-btn ghost sm" data-act="grant" data-uid="' + esc(u.user_id) + '" data-role="teacher_admin">Grant teacher_admin</button></span></li>').join('') + '</ul>' : '<p class="t-empty pad">No match. The person must have created an account or signed in to the game at least once.</p>') + '</section>' : '') +
    '<h2 class="t-h2">Currently authorized</h2><section class="t-card flush">' + (roles.length ? rolesList : '<p class="t-empty pad">No one yet.</p>') + '</section><p class="t-note">Revoking takes effect immediately: the next request that person makes is refused. Anyone you grant teacher_admin sees this whole owner dashboard.</p>');
}

// ------------------------------------------------------------------ loader
async function load() {
  clearInterval(poll); poll = null; lastHtml = '';
  const seq = ++loadSeq;
  route = parse(window.location.pathname);
  // /teachers used to be a separate info page; the signed-out /teacher page now carries that introduction.
  if (route.name === 'landing') { window.history.replaceState(null, '', '/teacher'); route = parse('/teacher'); }
  document.title = 'Teacher Beta · Give It A Shot';
  if (route.name === 'notfound') { paint(shell('<div class="t-card"><h1 class="t-h1">Page not found</h1><a class="t-btn" href="/teacher" data-nav>Dashboard</a></div>', { narrow: true })); return; }
  loading();
  // the guide (with the privacy notes) is public; everything else needs an approved account
  if (!(await ensureGate())) { if (seq === loadSeq) paint(route.name === 'resources' && gate !== 'recovery' ? pResources() : gateView()); return; }
  await draw(seq, false);
  if (seq !== loadSeq) return;
  if (route.name === 'session' || route.name === 'classroom') {
    // the waiting room and the live leaderboard refresh every few seconds; the classroom page is slower
    const every = route.name === 'session' ? (route.phase === 'lobby' ? 2500 : 3000) : 8000;
    poll = setInterval(() => { if (!document.hidden && !document.querySelector('dialog[open]') && !isTyping()) draw(seq, true); }, every);
  }
  if (route.name === 'admin' && route.tab === 'overview') poll = setInterval(() => { if (!document.hidden && !document.querySelector('dialog[open]')) draw(seq, true); }, 60000);
}
const isTyping = () => { const a = document.activeElement; return a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && root.contains(a); };
async function draw(seq, quiet) {
  try {
    let html;
    switch (route.name) {
      case 'dashboard': html = await pDashboard(false); break;
      case 'classrooms': html = await pDashboard(true); break;
      case 'classroom': html = await pClassroom(route.id); break;
      case 'session': html = await pSession(route.id); break;
      case 'resources': html = pResources(); break;
      case 'feedback': html = await pFeedback(); break;
      case 'admin': html = await pAdmin(); break;
    }
    if (seq === loadSeq) {
      paint(html, quiet); if (!quiet) { root.scrollTop = 0; if (window.location.hash === '#start') { const f = document.getElementById('start'); if (f && f.scrollIntoView) f.scrollIntoView(); } }
      if (route.name === 'session' && route.active === false) { clearInterval(poll); poll = null; }
      armTicker(seq);
    }
  } catch (e) {
    if (seq !== loadSeq) return;
    if (['not_authorized', 'not_authenticated', 'teacher_beta_disabled'].includes(e.code)) { me = null; meFor = null; clearInterval(poll); if (!(await ensureGate())) { paint(gateView()); return; } }
    if (quiet) return;   // a failed background refresh should not replace what the teacher is reading
    paint(shell(errCard(e), { narrow: true }));
  }
}
const refresh = () => draw(loadSeq, false);
// During the 5-second countdown the teacher's own screen counts down too (using the server clock), then switches to the live board.
function armTicker(seq) {
  clearInterval(ticker); ticker = null;
  if (!route || route.name !== 'session' || route.phase !== 'countdown' || !route.starts) return;
  ticker = setInterval(() => {
    if (seq !== loadSeq) { clearInterval(ticker); return; }
    const left = (Date.parse(route.starts) - (Date.now() + ui.off)) / 1000;
    const el = root.querySelector('[data-live="cd"]'); if (el) el.textContent = String(Math.max(0, Math.ceil(left)));
    if (left <= 0) { clearInterval(ticker); ticker = null; lastHtml = ''; draw(seq, false); }
  }, 200);
}
const fail = (e) => toast(e.message || 'Something went wrong.', 'err');

// ------------------------------------------------------------------ events
async function onAct(el) {
  const a = el.dataset.act, id = el.dataset.id;
  try {
    if (a === 'reload') return load();
    if (a === 'signout') { await api.signOut(); me = null; meFor = null; ui.notice = null; ui.mode = 'signin'; ui.signinErr = ''; store('s', RECOVERY_KEY, null); return load(); }
    if (a === 'mode') { ui.mode = el.dataset.m; ui.notice = null; ui.signinErr = ''; ui.unconfirmed = false; paint(gateView()); const i = root.querySelector('#t-auth input'); if (i) { i.focus(); i.scrollIntoView({ block: 'center' }); } return; }
    if (a === 'resendconfirm') {
      store('l', RETURN_KEY, window.location.pathname);
      try { await api.resendConfirmation(ui.email); ui.notice = 'confirm'; ui.signinErr = ''; ui.unconfirmed = false; } catch (err) { ui.signinErr = authMessage(err); }
      return paint(gateView());
    }
    if (a === 'approve') { await T.adminGrant(id, 'teacher_beta'); toast('Approved. Let ' + el.dataset.who + ' know they can sign in.'); return refresh(); }
    if (a === 'dismissreq') { if (!(await confirmDialog({ title: 'Dismiss this request?', body: el.dataset.who + ' stays on the waitlist page and is not told. If they ask again later, the request comes back.', confirm: 'Dismiss' }))) return; await T.adminDismiss(id); toast('Request dismissed.'); return refresh(); }
    if (a === 'feedback') { T.track('teacher_feedback_clicked'); return go('/teacher/feedback'); }
    if (a === 'copycode') return copyText(el.dataset.v);
    if (a === 'copylink') return copyText(el.dataset.v);
    if (a === 'newcode') { const ttl = document.getElementById('ttl'); await T.setJoinCode(id, ttl ? Number(ttl.value) : 24); toast('New join code ready.'); return refresh(); }
    if (a === 'revokecode') { if (!(await confirmDialog({ title: 'Turn off joining?', body: 'The current code stops working immediately. Students already in the classroom stay.', confirm: 'Turn off' }))) return; await T.revokeJoinCode(id); toast('Joining is off.'); return refresh(); }
    if (a === 'archive') { if (!(await confirmDialog({ title: 'Archive this classroom?', body: 'This ends any running session and stops new students joining. Results stay available to you.', confirm: 'Archive' }))) return; await T.archiveClassroom(id); toast('Classroom archived.'); return refresh(); }
    if (a === 'delete') { if (!(await confirmDialog({ title: 'Delete this classroom?', body: 'This permanently deletes the classroom, every nickname and all results. This cannot be undone.', confirm: 'Delete permanently', danger: true }))) return; await T.deleteClassroom(id); toast('Classroom deleted.'); return go('/teacher'); }
    if (a === 'endsession') { const p = Number(el.dataset.pending || 0); if (!(await confirmDialog({ title: 'End this session?', body: p > 0 ? p + ' student' + (p === 1 ? ' has' : 's have') + ' not finished. They will not be able to submit after you end it.' : 'Everyone has finished. Students can no longer submit.', confirm: 'End session', danger: p > 0 }))) return; await T.endSession(id); toast('Session ended.'); return load(); }
    if (a === 'reveal') { await T.setReveal(id, el.dataset.on === '1'); toast(el.dataset.on === '1' ? 'Class results are now shared with students.' : 'Class results hidden from students.'); return refresh(); }
    if (a === 'startsim') { el.disabled = true; const r = await T.beginCountdown(id); ui.off = Date.parse(r.server_now) - Date.now(); toast('Countdown started. Everyone\u2019s game begins in 5 seconds.'); return refresh(); }
    if (a === 'rmember') { if (!(await confirmDialog({ title: 'Remove ' + el.dataset.who + '?', body: 'Their name, progress and any result are deleted. They can join again with the code if joining is still on.', confirm: 'Remove', danger: true }))) return; await T.removeMember(id); toast('Removed.'); return refresh(); }
    if (a === 'sumtoggle') { ui.sumOpen[id] = !ui.sumOpen[id]; lastHtml = ''; return refresh(); }
    if (a === 'copysum') return copyText(id === 'class' ? (ui._classSum ? plainClass(ui._classSum) : '') : (ui['_sum_' + id] || ''));
    if (a === 'indiv') { ui.showIndiv = !ui.showIndiv; lastHtml = ''; return refresh(); }
    if (a === 'ownerfilter') { ui.ownerFilter = el.dataset.v; return refresh(); }
    if (a === 'errdays') { ui.errDays = Number(el.dataset.v) || 7; return refresh(); }
    if (a === 'errresolved') { ui.errResolved = el.checked; return refresh(); }
    if (a === 'resolveerr') { await T.adminResolveError(id); toast('Marked resolved. It reappears if it happens again.'); return refresh(); }
    if (a === 'gradescsv') {
      const rows = ui.dg ? ui.dg.rows : [];
      const url = URL.createObjectURL(new Blob([gradesCsv(rows)], { type: 'text/csv' }));
      const link = document.createElement('a'); link.href = url; link.download = 'class-grades-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); return;
    }
    if (a === 'feedbackcsv') {
      const url = URL.createObjectURL(new Blob([feedbackCsv(ui._feedback || [])], { type: 'text/csv' }));
      const link = document.createElement('a'); link.href = url; link.download = 'teacher-feedback-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); return;
    }
    if (a === 'grant') { await T.adminGrant(el.dataset.uid, el.dataset.role); toast('Access granted.'); ui.found = await T.adminFind(ui.findQ); return refresh(); }
    if (a === 'revokerole') { if (!(await confirmDialog({ title: 'Revoke access?', body: el.dataset.who + ' will lose ' + el.dataset.role + ' immediately.', confirm: 'Revoke', danger: true }))) return; await T.adminRevoke(el.dataset.uid, el.dataset.role); toast('Access revoked.'); return refresh(); }
  } catch (e) { fail(e); if (['not_authorized', 'not_authenticated', 'teacher_beta_disabled'].includes(e.code)) load(); }
}
// Supabase Auth error text -> plain words for teachers
function authMessage(err) {
  const m = String((err && err.message) || '');
  if (/rate limit|too many|seconds/i.test(m)) return 'Too many emails or attempts right now. Wait a few minutes and try again.';
  if (/invalid login credentials/i.test(m)) return 'Wrong email or password. If you have only ever signed in with an email link, use \u201cForgot password?\u201d to set a password.';
  if (/not confirmed/i.test(m)) return 'Please confirm your email first: open the link we sent you when you created the account.';
  if (/already registered/i.test(m)) return 'There is already an account for this email. Sign in, or use \u201cForgot password?\u201d to set a password.';
  if (/should be different/i.test(m)) return 'Choose a password you have not used for this account before.';
  if (/password/i.test(m) && /(weak|short|least|characters)/i.test(m)) return 'That password is too weak. Use at least 8 characters with a mix of letters and numbers.';
  if (/signups? not allowed|signup.*disabled/i.test(m)) return 'New accounts are switched off right now. Please try again later.';
  return 'Something went wrong. Try again.';
}
async function onSubmit(form, e) {
  e.preventDefault();
  const f = new FormData(form), kind = form.dataset.form;
  const setErr = (id, m) => { const x = document.getElementById(id); if (x) x.textContent = m; };
  const btn = form.querySelector('button[type=submit]'); if (btn && btn.disabled) return;
  try {
    if (['signin', 'password', 'signup', 'forgot'].includes(kind)) {
      const email = String(f.get('email') || '').trim(), password = String(f.get('password') || '');
      const req = { name: String(f.get('name') || '').trim(), school: String(f.get('school') || '').trim(), note: String(f.get('note') || '').trim() };
      ui.email = email; ui.unconfirmed = false; if (kind === 'signup') ui.req = req;
      const bad = kind === 'signup' && !req.name ? 'Enter your name.' : kind === 'signup' && !req.school ? 'Enter your school.'
        : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? 'Enter a valid email address.'
        : kind === 'signup' && password.length < 8 ? 'Choose a password of at least 8 characters.' : kind === 'password' && !password ? 'Enter your password.' : '';
      if (bad) { ui.signinErr = bad; return paint(gateView()); }
      ui.sending = true; ui.signinErr = ''; paint(gateView());
      if (kind !== 'password') store('l', RETURN_KEY, window.location.pathname);   // email links land on the site root; come back here
      try {
        if (kind === 'signin') { await api.signInEmail(email); ui.notice = 'link'; }
        else if (kind === 'forgot') { await api.sendPasswordReset(email); ui.notice = 'reset'; }
        else if (kind === 'signup') {
          const r = await api.signUpTeacher(email, password, req);
          if (r.exists) { ui.mode = 'signin'; ui.signinErr = 'There is already an account for this email (perhaps from playing the game). Sign in, or use \u201cForgot password?\u201d to set a password.'; }
          else if (r.session) { ui.sending = false; ui.mode = null; return load(); }
          else ui.notice = 'confirm';
        } else { await api.signInPassword(email, password); ui.sending = false; ui.mode = null; return load(); }
      } catch (err) { ui.signinErr = authMessage(err); if (/not confirmed/i.test(String(err.message))) ui.unconfirmed = true; if (/already registered/i.test(String(err.message))) ui.mode = 'signin'; }
      ui.sending = false; return paint(gateView());
    }
    if (kind === 'newpw') {
      const p1 = String(f.get('password') || ''), p2 = String(f.get('password2') || '');
      ui.signinErr = p1.length < 8 ? 'Choose a password of at least 8 characters.' : p1 !== p2 ? 'The two passwords do not match.' : '';
      if (ui.signinErr) return paint(gateView());
      ui.sending = true; paint(gateView());
      try { await api.setPassword(p1); store('s', RECOVERY_KEY, null); ui.sending = false; toast('Password saved.'); return load(); }
      catch (err) { ui.sending = false; ui.signinErr = authMessage(err); return paint(gateView()); }
    }
    if (kind === 'apply') {
      const req = { name: String(f.get('name') || '').trim(), school: String(f.get('school') || '').trim(), note: String(f.get('note') || '').trim() };
      ui.signinErr = !req.name ? 'Enter your name.' : !req.school ? 'Enter your school.' : '';
      if (ui.signinErr) return paint(gateView());
      try { await T.apply(req); me.applied = true; ui.signinErr = ''; } catch (err) { ui.signinErr = err.message; }
      return paint(gateView());
    }
    if (kind === 'create') {
      const name = String(f.get('name') || '').trim();
      if (!name) return setErr('create-err', 'Give the classroom a name.');
      btn.disabled = true;
      try { const c = await T.createClassroom(name); return go('/teacher/classrooms/' + c.id); } catch (err) { btn.disabled = false; return setErr('create-err', err.message); }
    }
    if (kind === 'start') {
      btn.disabled = true;
      const days = Math.max(3, Math.min(28, parseInt(f.get('days'), 10) || 14)), diff = f.get('difficulty') === '1' ? 1 : 0, focus = UNIT_NAMES[f.get('focus')] ? f.get('focus') : ''; ui.days = days; ui.diff = diff; ui.focus = focus;
      try { const s = await T.startSession(form.dataset.id, String(f.get('title') || '').trim(), String(f.get('instructions') || '').trim(), days, diff, focus || null); return go('/teacher/sessions/' + s.id); } catch (err) { btn.disabled = false; return setErr('start-err', err.message); }
    }
    if (kind === 'feedback') {
      const again = f.get('again'), pay = f.get('pay');
      btn.disabled = true;
      try { await T.sendFeedback({ worked: String(f.get('worked') || ''), confused: String(f.get('confused') || ''), change: String(f.get('change') || ''), useAgain: again == null ? null : again === 'yes', wouldPay: pay || null, classroom: f.get('classroom') || null }); ui.fbDone = true; return refresh(); } catch (err) { btn.disabled = false; return setErr('fb-err', err.message); }
    }
    if (kind === 'find') {
      const q = String(f.get('q') || '').trim(); ui.findQ = q;
      if (q.length < 3) return setErr('find-err', 'Type at least 3 characters.');
      try { ui.found = await T.adminFind(q); return refresh(); } catch (err) { return setErr('find-err', err.message); }
    }
  } catch (err) { fail(err); }
}

export function mount(el) {
  root = el;
  root.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-nav]');
    if (a && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) { e.preventDefault(); go(a.getAttribute('href')); return; }
    const x = e.target.closest('[data-act]'); if (x && root.contains(x)) onAct(x);
  });
  root.addEventListener('submit', (e) => { const f = e.target.closest('form[data-form]'); if (f) onSubmit(f, e); });
  root.addEventListener('input', (e) => {
    if (e.target.id === 's-days') { ui.days = Number(e.target.value); const o = document.getElementById('s-days-out'); if (o) o.textContent = daysOut(ui.days); }
    if (e.target.name === 'difficulty') ui.diff = Number(e.target.value);
    if (e.target.id === 's-focus') ui.focus = e.target.value;
  });
  window.addEventListener('popstate', () => { if (document.getElementById('viewport').dataset.mode === 'teacher') load(); });
  if (api.sb) api.sb.auth.onAuthStateChange((ev) => {
    if (ev === 'SIGNED_OUT' && gate === 'ok') { me = null; meFor = null; load(); }
    if (ev === 'PASSWORD_RECOVERY' && gate !== 'recovery') { store('s', RECOVERY_KEY, '1'); load(); }
  });
  ui.fbDone = false;
  load();
}
