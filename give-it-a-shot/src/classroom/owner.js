// Owner dashboard pages (/teacher/admin/*), shown only to teacher_admin accounts. Pure view code: every number comes from
// admin_* database functions that re-check the admin capability, so hiding these pages protects nothing by itself.
// Student names, results and game logs are never sent here; they stay private to the classroom's own teacher.
import { esc, relTime, when } from './kit.js';

export const OWNER_TABS = [['overview', '/teacher/admin', 'Overview'], ['classrooms', '/teacher/admin/classrooms', 'Classrooms'],
  ['users', '/teacher/admin/users', 'Users'], ['feedback', '/teacher/admin/feedback', 'Feedback'], ['errors', '/teacher/admin/errors', 'Errors'], ['access', '/teacher/admin/access', 'Access']];

export function ownerTabs(tab, badges = {}) {
  return '<nav class="t-navs t-subnav" aria-label="Owner dashboard">' + OWNER_TABS.map(([k, href, label]) =>
    '<a class="t-nav' + (k === tab ? ' on' : '') + '" href="' + href + '" data-nav' + (k === tab ? ' aria-current="page"' : '') + '>' + label +
    (badges[k] ? ' <span class="t-badge">' + esc(badges[k]) + '</span>' : '') + '</a>').join('') + '</nav>';
}

const n = (v) => (v == null ? '-' : Number(v).toLocaleString());
const bytes = (b) => { if (b == null) return '-'; const u = ['B', 'KB', 'MB', 'GB']; let i = 0, x = Number(b); while (x >= 1024 && i < 3) { x /= 1024; i++; } return (i ? x.toFixed(1) : x) + ' ' + u[i]; };
const stat = (label, v, sub, cls) => '<div class="t-stat' + (cls ? ' ' + cls : '') + '"><span class="t-stat-l">' + esc(label) + '</span><span class="t-stat-v">' + esc(v) + '</span>' + (sub ? '<span class="t-note">' + esc(sub) + '</span>' : '') + '</div>';
const cards = (list) => '<div class="t-cards">' + list.join('') + '</div>';
const section = (title, body, note) => '<section class="t-card"><h2 class="t-h2">' + esc(title) + '</h2>' + body + (note ? '<p class="t-note">' + note + '</p>' : '') + '</section>';
const verChips = (o) => { const k = Object.keys(o || {}).sort((a, b) => b - a); return k.length ? k.map((v) => '<span class="t-chip">v' + esc(v) + ' × ' + n(o[v]) + '</span>').join(' ') : '<span class="t-note">none in the last 30 days</span>'; };
const DIFF = (d) => (d === 1 ? 'Core' : 'AP');

// 14 small bars per metric; every value is in the accessible label and the tooltip, so nothing depends on the bars alone.
function spark(daily, key) {
  const vals = daily.map((d) => Number(d[key]) || 0), max = Math.max(1, ...vals), w = 8, gap = 3, h = 34;
  const label = daily.map((d) => d.day.slice(5) + ': ' + (Number(d[key]) || 0)).join(', ');
  return '<svg class="t-spark" width="' + (vals.length * (w + gap)) + '" height="' + h + '" role="img" aria-label="' + esc(label) + '">' +
    vals.map((v, i) => { const bh = v ? Math.max(2, Math.round((v / max) * (h - 2))) : 1; return '<rect x="' + i * (w + gap) + '" y="' + (h - bh) + '" width="' + w + '" height="' + bh + '" rx="1.5"' + (v ? '' : ' class="z"') + '><title>' + esc(daily[i].day + ': ' + v) + '</title></rect>'; }).join('') + '</svg>';
}

export function overviewPage(o, opts = {}) {
  const p = o.people, g = o.game, c = o.classrooms, f = o.feedback, e = o.errors, l = o.load, d = o.daily || [];
  const alerts = [];
  if (!o.teacher_beta_enabled) alerts.push('<div class="t-alert" role="status">Teacher Beta is switched <b>off</b>. Teachers cannot sign in to their classrooms until the TEACHER_BETA_ENABLED flag is on.</div>');
  if (p.waiting) alerts.push('<div class="t-alert" role="status"><b>' + n(p.waiting) + '</b> teacher' + (p.waiting === 1 ? ' is' : 's are') + ' waiting for access. <a href="/teacher/admin/access" data-nav>Review requests</a></div>');
  if (e.open_groups) alerts.push('<div class="t-alert" role="status"><b>' + n(e.open_groups) + '</b> open error group' + (e.open_groups === 1 ? '' : 's') + ' in the last 30 days. <a href="/teacher/admin/errors" data-nav>See errors</a></div>');
  const connPct = l.max_connections ? Math.round((l.connections / l.max_connections) * 100) : 0;
  const rows = [['Scores posted', 'scores'], ['New accounts', 'signups'], ['Students joined', 'joins'], ['Sessions started', 'sessions'], ['Classroom results', 'results'], ['Errors reported', 'errors']];
  const activity = '<div class="t-scroll"><table class="t-table t-act"><thead><tr><th scope="col">Last 14 days (UTC)</th><th scope="col">Per day</th><th scope="col">Today</th><th scope="col">14-day total</th></tr></thead><tbody>' +
    rows.map(([label, k]) => '<tr><th scope="row">' + esc(label) + '</th><td>' + spark(d, k) + '</td><td>' + n(d.length ? d[d.length - 1][k] : 0) + '</td><td>' + n(d.reduce((a, x) => a + (Number(x[k]) || 0), 0)) + '</td></tr>').join('') + '</tbody></table></div>';
  const buckets = (l.limited_buckets_1h || []).length ? '<ul class="t-list">' + l.limited_buckets_1h.map((b) => '<li><span><code class="t-code-inline">' + esc(b.bucket) + '</code></span><span class="t-note">busiest caller: ' + n(b.max_hits) + ' calls in one window</span></li>').join('') + '</ul>' : '<p class="t-empty pad">No guarded calls in the last hour.</p>';
  const tables = '<div class="t-scroll"><table class="t-table"><thead><tr><th scope="col">Table</th><th scope="col">Rows (estimate)</th><th scope="col">Size</th></tr></thead><tbody>' +
    (l.tables || []).slice(0, 12).map((t) => '<tr><th scope="row">' + esc(t.name) + '</th><td>' + n(t.rows) + '</td><td>' + bytes(t.bytes) + '</td></tr>').join('') + '</tbody></table></div>';
  return '<div class="t-title"><h1 class="t-h1">Owner dashboard</h1><span class="t-note">Updated ' + esc(relTime(o.generated_at)) + ' · refreshes every minute</span><button class="t-btn ghost sm" data-act="reload">Refresh now</button></div>' +
    ownerTabs('overview', opts.badges) + alerts.join('') +
    section('People', cards([stat('Accounts', n(p.accounts), '+' + n(p.accounts_7d) + ' this week'), stat('Email confirmed', n(p.confirmed)), stat('Signed in this week', n(p.signed_in_7d)),
      stat('Players with a handle', n(p.players_with_handle)), stat('Teachers', n(p.teachers)), stat('Admins', n(p.admins)), stat('Waiting for access', n(p.waiting), null, p.waiting ? 'warn' : '')])) +
    section('Public game', cards([stat('Scores posted', n(g.scores)), stat('Last 24 hours', n(g.scores_24h)), stat('Last 7 days', n(g.scores_7d), n(g.daily_7d) + ' daily challenge'),
      stat('Players this week', n(g.players_7d)), stat('Average score (7 days)', n(g.avg_score_7d)), stat('Last score', g.last_score_at ? relTime(g.last_score_at) : 'never')]) +
      '<p class="t-note">Engine versions of posted scores (30 days): ' + verChips(g.engine_versions) + '</p>') +
    section('Classrooms', cards([stat('Open classrooms', n(c.open)), stat('Archived', n(c.archived)), stat('Deleted', n(c.deleted)), stat('Sessions running', n(c.sessions_running), null, c.sessions_running ? 'live' : ''),
      stat('Sessions ever', n(c.sessions_total)), stat('Students enrolled now', n(c.students_now), n(c.students_active_1h) + ' active in the last hour'), stat('Joins this week', n(c.joins_7d)),
      stat('Results ever', n(c.results_total), n(c.results_7d) + ' this week'), stat('Removed from office (7 days)', n(c.removed_from_office_7d))]) +
      '<p class="t-note">Engine versions of classroom results (30 days): ' + verChips(c.engine_versions) + ' · <a href="/teacher/admin/classrooms" data-nav>All classrooms</a></p>') +
    section('Teacher feedback', cards([stat('Responses', n(f.total), n(f.last_7d) + ' this week'), stat('Would use again', n(f.use_again_yes) + ' yes / ' + n(f.use_again_no) + ' no'),
      stat('Would pay', ['yes', 'maybe', 'no'].map((k) => k + ' ' + n((f.pay || {})[k] || 0)).join(' · ')), stat('Latest', f.last_at ? relTime(f.last_at) : 'none yet')]) +
      '<p class="t-note"><a href="/teacher/admin/feedback" data-nav>Read all feedback</a></p>') +
    section('Errors', cards([stat('Last 24 hours', n(e.last_24h), null, e.last_24h ? 'warn' : ''), stat('Last 7 days', n(e.last_7d)), stat('People affected (7 days)', n(e.people_7d)),
      stat('Open groups (30 days)', n(e.open_groups)), stat('Latest', e.last_at ? relTime(e.last_at) : 'none yet')]), 'Browser crashes and failed server calls, reported by the site itself. <a href="/teacher/admin/errors" data-nav>See details</a>') +
    section('Activity', activity) +
    section('Stability and load', cards([stat('Database size', bytes(l.db_bytes), 'Free plan limit is 500 MB'), stat('Database connections', n(l.connections) + ' / ' + n(l.max_connections), n(l.connections_active) + ' busy · ' + connPct + '% of the limit', connPct > 70 ? 'warn' : ''),
      stat('Guarded calls (last hour)', n(l.calls_1h)), stat('Busiest hour (7 days)', l.busiest_hour_7d ? new Date(l.busiest_hour_7d.hour).toLocaleString([], { weekday: 'short', hour: 'numeric' }) : '-', l.busiest_hour_7d ? n(l.busiest_hour_7d.events) + ' scores and events' : '')]) +
      '<h3 class="t-h3">Busiest rate-limit buckets (last hour)</h3>' + buckets + '<h3 class="t-h3">Largest tables</h3>' + tables,
      'Edge-function logs, CPU and bandwidth live in the Supabase dashboard; site traffic lives in Vercel Analytics.');
}

export function classroomsPage(data, opts = {}) {
  const filter = opts.filter || 'open';
  const all = data.classrooms || [], dead = data.deleted || [];
  const open = all.filter((c) => !c.archived_at), arch = all.filter((c) => c.archived_at);
  const pick = filter === 'archived' ? arch : filter === 'all' ? all : open;
  const tab = (k, label, count) => '<button class="t-btn sm' + (filter === k ? '' : ' ghost') + '" data-act="ownerfilter" data-v="' + k + '" aria-pressed="' + (filter === k) + '">' + label + ' (' + count + ')</button>';
  const sess = (s) => '<tr><th scope="row">' + esc(s.title) + '</th><td>' + (s.status === 'active' ? '<span class="t-chip live">running</span>' : 'ended') + '</td><td>' + s.days + ' days · ' + DIFF(s.difficulty) + '</td><td>' + esc(when(s.started_at)) + '</td><td>' + (s.ended_at ? esc(when(s.ended_at)) : '-') + '</td><td>' + n(s.playing) + '</td><td>' + n(s.completed) + '</td><td>' + n(s.removed) + '</td><td>' + n(s.avg_score) + '</td></tr>';
  const card = (c) => '<section class="t-card"><div class="t-title"><h2 class="t-h3">' + esc(c.name) + '</h2>' + (c.archived_at ? '<span class="t-chip">archived ' + esc(relTime(c.archived_at)) + '</span>' : '') +
    (c.sessions.some((s) => s.status === 'active') ? '<span class="t-chip live">session running</span>' : '') + (c.join_open ? '<span class="t-chip">joining open</span>' : '') + '</div>' +
    '<p class="t-note">' + esc(c.owner_name || (c.owner_handle ? '@' + c.owner_handle : 'Unknown teacher')) + (c.owner_school ? ' · ' + esc(c.owner_school) : '') + (c.owner_email ? ' · ' + esc(c.owner_email) : '') +
    '<br>Created ' + esc(when(c.created_at)) + ' · ' + n(c.members) + ' student' + (c.members === 1 ? '' : 's') + ' enrolled · last student activity ' + esc(relTime(c.last_student_activity)) + '</p>' +
    (c.sessions.length ? '<div class="t-scroll"><table class="t-table"><thead><tr><th scope="col">Session</th><th scope="col">Status</th><th scope="col">Setup</th><th scope="col">Started</th><th scope="col">Ended</th><th scope="col">Playing</th><th scope="col">Finished</th><th scope="col">Removed</th><th scope="col">Avg score</th></tr></thead><tbody>' + c.sessions.map(sess).join('') + '</tbody></table></div>' : '<p class="t-note">No sessions yet.</p>') + '</section>';
  const deadList = dead.length ? '<section class="t-card flush"><ul class="t-list">' + dead.map((t) => '<li><span><b>Deleted classroom</b><br><span class="t-note">' + esc(t.owner_handle ? '@' + t.owner_handle : t.owner_email || 'unknown teacher') + ' · created ' + esc(when(t.created_at)) + ' · deleted ' + esc(when(t.deleted_at)) + '</span></span><span class="t-note">' + n(t.members) + ' students · ' + n(t.sessions) + ' sessions · ' + n(t.results) + ' results</span></li>').join('') + '</ul></section>' : '<div class="t-card"><p class="t-empty">No classrooms have been deleted since this record started.</p></div>';
  return '<div class="t-title"><h1 class="t-h1">Owner dashboard</h1></div>' + ownerTabs('classrooms', opts.badges) +
    '<div class="t-actions">' + tab('open', 'Open', open.length) + tab('archived', 'Archived', arch.length) + tab('deleted', 'Deleted', dead.length) + tab('all', 'All', all.length) + '</div>' +
    (filter === 'deleted' ? deadList : pick.length ? pick.map(card).join('') : '<div class="t-card"><p class="t-empty">Nothing here.</p></div>') +
    '<p class="t-note">Counts and averages only. Student names, individual results and game logs stay private to the teacher who owns each classroom. A deleted classroom keeps only its size and dates, not its name.</p>';
}

// Every account (players, teachers, admins) with its public-game stats. Supreme Leader beta access is switched per account here.
export function usersPage(list, opts = {}) {
  const filter = opts.filter || 'all', q = (opts.q || '').trim().toLowerCase();
  const isTeacher = (u) => u.roles.includes('teacher_beta') || u.roles.includes('teacher_admin');
  const F = { all: () => true, players: (u) => !isTeacher(u), teachers: isTeacher, leader: (u) => u.leader_beta, active: (u) => u.games_7d > 0 };
  const count = (k) => list.filter(F[k]).length;
  const shown = list.filter(F[filter] || F.all).filter((u) => !q || (u.email || '').toLowerCase().includes(q) || (u.handle || '').toLowerCase().includes(q));
  const tab = (k, label) => '<button class="t-btn sm' + (filter === k ? '' : ' ghost') + '" data-act="userfilter" data-v="' + k + '" aria-pressed="' + (filter === k) + '">' + label + ' (' + count(k) + ')</button>';
  const who = (u) => (u.handle ? '@' + u.handle + (u.tag ? ' [' + u.tag + ']' : '') : '(no handle yet)');
  const lb = (u) => u.leader_beta && u.leader_beta_domain
    ? '<span class="t-chip">on via ' + esc(u.leader_beta_domain) + '</span>'
    : '<button class="t-btn sm' + (u.leader_beta ? ' ghost' : '') + '" data-act="leaderbeta" data-uid="' + esc(u.user_id) + '" data-on="' + (u.leader_beta ? '0' : '1') + '" data-who="' + esc(u.handle || u.email) + '" aria-pressed="' + !!u.leader_beta + '">' + (u.leader_beta ? 'Remove access' : 'Give access') + '</button>';
  const row = (u) => '<tr><th scope="row"><b>' + esc(who(u)) + '</b><br><span class="t-note">' + esc(u.email || '') + (u.confirmed ? '' : ' · not confirmed') + '</span>' +
    (u.roles.length ? '<br>' + u.roles.map((r) => '<span class="t-chip">' + esc(r) + '</span>').join(' ') : '') + '</th>' +
    '<td>' + esc(when(u.created_at)) + '</td><td>' + esc(u.last_sign_in_at ? relTime(u.last_sign_in_at) : 'never') + '</td>' +
    '<td>' + n(u.games) + (u.daily_games ? '<br><span class="t-note">' + n(u.daily_games) + ' daily</span>' : '') + '</td><td>' + n(u.games_7d) + '</td>' +
    '<td>' + n(u.best_score) + '</td><td>' + n(u.avg_score) + '</td><td>' + esc(u.last_game_at ? relTime(u.last_game_at) : '-') + '</td>' +
    '<td>' + (isTeacher(u) ? n(u.classrooms) : '-') + '</td><td>' + (u.leader_beta ? '<span class="t-chip live">on</span>' : '<span class="t-note">off</span>') + ' ' + lb(u) + '</td></tr>';
  const totals = cards([stat('Accounts', n(list.length)), stat('Played this week', n(count('active'))), stat('Teachers', n(count('teachers'))), stat('Supreme Leader beta', n(count('leader')))]);
  return '<div class="t-title"><h1 class="t-h1">Owner dashboard</h1></div>' + ownerTabs('users', opts.badges) + totals +
    '<form class="t-card row" data-form="usersearch" novalidate><div class="grow"><label class="t-label" for="u-q">Search by email or handle</label><input id="u-q" class="t-input" name="q" autocomplete="off" value="' + esc(opts.q || '') + '"></div><button class="t-btn" type="submit">Search</button>' + (q ? '<button class="t-btn ghost" type="button" data-act="userclear">Clear</button>' : '') + '</form>' +
    '<div class="t-actions">' + tab('all', 'Everyone') + tab('players', 'Players') + tab('teachers', 'Teachers') + tab('leader', 'Supreme Leader beta') + tab('active', 'Played this week') + '</div>' +
    '<section class="t-card flush">' + (shown.length ? '<div class="t-scroll"><table class="t-table t-users"><thead><tr><th scope="col">Account</th><th scope="col">Joined</th><th scope="col">Last sign-in</th><th scope="col">Games posted</th><th scope="col">Last 7 days</th><th scope="col">Best</th><th scope="col">Average</th><th scope="col">Last game</th><th scope="col">Classrooms</th><th scope="col">Supreme Leader</th></tr></thead><tbody>' +
      shown.map(row).join('') + '</tbody></table></div>' : '<p class="t-empty pad">No accounts match.</p>') + '</section>' +
    '<p class="t-note">Games are the public-game scores each account posted to the leaderboard (classroom students have no account and are not listed). Supreme Leader access takes effect the next time that person opens the mode. Access given to a whole email domain is managed in the database, not here.</p>';
}

export function feedbackPage(list, opts = {}) {
  const yn = (v) => (v == null ? '-' : v ? 'yes' : 'no');
  const block = (label, text) => (text ? '<h4 class="t-h4">' + label + '</h4><p class="t-pre">' + esc(text) + '</p>' : '');
  const item = (f) => '<section class="t-card"><div class="t-title"><h2 class="t-h3">' + esc(f.name || (f.handle ? '@' + f.handle : f.email || 'Former teacher')) + '</h2><span class="t-note">' + esc(when(f.created_at)) + '</span></div>' +
    '<p class="t-note">' + [f.school, f.email, f.classroom ? 'about ' + f.classroom : null].filter(Boolean).map(esc).join(' · ') + '</p>' +
    '<p><span class="t-chip">use again: ' + yn(f.use_again) + '</span> <span class="t-chip">would pay: ' + esc(f.would_pay || '-') + '</span></p>' +
    block('What worked', f.worked) + block('What was confusing', f.confused) + block('What they would change', f.change) + '</section>';
  return '<div class="t-title"><h1 class="t-h1">Owner dashboard</h1>' + (list.length ? '<button class="t-btn ghost sm" data-act="feedbackcsv">Download CSV</button>' : '') + '</div>' + ownerTabs('feedback', opts.badges) +
    (list.length ? list.map(item).join('') : '<div class="t-card"><p class="t-empty">No feedback yet. Teachers send it from the Give Feedback button at the bottom of every teacher page.</p></div>');
}

// CSV with formula-injection guarding (a cell starting with = + - @ is quoted and prefixed with ').
export function csvOf(cols, list) {
  const cell = (v) => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? '"' + s.replace(/"/g, '""').replace(/^([=+\-@])/, "'$1") + '"' : s; };
  return cols.join(',') + '\n' + list.map((f) => cols.map((k) => cell(f[k])).join(',')).join('\n') + '\n';
}
export function feedbackCsv(list) {
  return csvOf(['created_at', 'name', 'school', 'email', 'classroom', 'use_again', 'would_pay', 'worked', 'confused', 'change'], list);
}

export function errorsPage(groups, opts = {}) {
  const days = opts.days || 7, showResolved = !!opts.showResolved;
  const shown = groups.filter((g) => showResolved || !g.resolved);
  const kind = { error: 'crash', rejection: 'unhandled promise', api: 'server call failed' };
  const range = (dd, label) => '<button class="t-btn sm' + (days === dd ? '' : ' ghost') + '" data-act="errdays" data-v="' + dd + '" aria-pressed="' + (days === dd) + '">' + label + '</button>';
  const item = (g) => '<li class="t-err-g"><div class="grow"><b class="t-pre">' + esc(g.message) + '</b><br><span class="t-note">' + esc(kind[g.kind] || g.kind) + (g.source ? ' · ' + esc(g.source) : '') + '</span><br>' +
    '<span class="t-chip' + (g.resolved ? '' : ' warn') + '">' + (g.resolved ? 'resolved' : 'open') + '</span> <span class="t-chip">' + n(g.count) + '×</span> <span class="t-chip">' + n(g.people) + ' ' + (g.people === 1 ? 'person' : 'people') + '</span> ' +
    '<span class="t-note">first ' + esc(relTime(g.first_at)) + ' · last ' + esc(relTime(g.last_at)) + (g.paths && g.paths.length ? ' · pages ' + g.paths.map(esc).join(', ') : '') + (g.builds && g.builds.length ? ' · builds ' + g.builds.map((b) => esc(String(b).slice(-6))).join(', ') : '') + '</span>' +
    (g.sample && (g.sample.stack || g.sample.ua) ? '<details><summary>Latest report</summary>' + (g.sample.stack ? '<pre class="t-pre t-stack">' + esc(g.sample.stack) + '</pre>' : '') + '<p class="t-note">' + esc(g.sample.ua || '') + ' · ' + esc(when(g.sample.at)) + '</p></details>' : '') + '</div>' +
    (g.resolved ? '' : '<button class="t-btn ghost sm" data-act="resolveerr" data-id="' + esc(g.fingerprint) + '">Mark resolved</button>') + '</li>';
  return '<div class="t-title"><h1 class="t-h1">Owner dashboard</h1></div>' + ownerTabs('errors', opts.badges) +
    '<div class="t-actions">' + range(1, 'Last 24 hours') + range(7, '7 days') + range(30, '30 days') + '<label class="t-note"><input type="checkbox" data-act="errresolved"' + (showResolved ? ' checked' : '') + '> Show resolved</label></div>' +
    '<section class="t-card flush">' + (shown.length ? '<ul class="t-list">' + shown.map(item).join('') + '</ul>' : '<p class="t-empty pad">No ' + (showResolved ? '' : 'open ') + 'errors in this period.</p>') + '</section>' +
    '<p class="t-note">The site reports browser crashes and failed calls to our own server (at most 8 per page visit, each problem once). Repeats are grouped. Marking a group resolved hides it until it happens again. Reports older than 90 days are removed.</p>';
}
