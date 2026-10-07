// /classroom: students enter a code, get a random nickname (no name, no email, no account), and play the class session.
import { call, getToken, setToken, clearToken, ClassError } from './studentApi.js';
import { esc, num, avgCards, distChart, confirmDialog, toast, METRICS, fmtMetric } from './kit.js';

let root, view = 'loading', st = null, notice = '', busy = false, joinErr = '', timer = null, codeDraft = '';

const shell = (inner) => '<div class="t-wrap narrow"><header class="t-top"><div class="t-brand"><svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z" fill="#eef1f6"></path></svg><div><div class="t-brand-t">GIVE IT A SHOT</div><div class="t-brand-s">Classroom</div></div></div></header><main id="t-main">' + inner + '</main><footer class="t-foot">Nothing here asks for your name or email. <a href="/" data-nav-out>Back to the game</a></footer></div>';

function render() {
  let html;
  if (view === 'loading') html = '<div class="t-card"><p class="t-note" role="status">Loading...</p></div>';
  else if (view === 'disabled') html = '<div class="t-card"><h1 class="t-h1">Classroom mode is unavailable</h1><p>Classroom mode is not running right now. Ask your teacher what to do next.</p></div>';
  else if (view === 'join') html = joinView();
  else html = lobbyView();
  root.innerHTML = shell(html);
  const input = root.querySelector('#class-code');
  if (input) { input.value = codeDraft; }
}

function joinView() {
  return '<form class="t-card" data-form="join" novalidate><h1 class="t-h1">Join your class</h1><p>Type the code your teacher gave you.</p>' +
    (notice ? '<div class="t-alert" role="status">' + esc(notice) + '</div>' : '') +
    '<label class="t-label" for="class-code">Class code</label>' +
    '<input id="class-code" class="t-input code" name="code" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="10" placeholder="ABC234" aria-describedby="join-err" ' + (busy ? 'disabled' : '') + '>' +
    '<div id="join-err" class="t-err" role="alert">' + esc(joinErr) + '</div>' +
    '<button class="t-btn gold lg" type="submit" ' + (busy ? 'disabled' : '') + '>' + (busy ? 'Joining...' : 'Join') + '</button></form>';
}

function resultBlock(r) {
  if (!r) return '';
  const rows = METRICS.map((m) => '<div class="t-stat"><span class="t-stat-l">' + esc(m.label) + '</span><span class="t-stat-v">' + esc(fmtMetric(m, r[m.key])) + '</span></div>').join('');
  return '<h2 class="t-h2">Your result</h2><div class="t-cards"><div class="t-stat big"><span class="t-stat-l">Your score</span><span class="t-stat-v">' + esc(r.score) + '</span></div>' + rows + '</div>' +
    '<p class="t-note">Conservatives graded you ' + esc(r.cons_letter) + ', liberals ' + esc(r.lib_letter) + (r.completion_status === 'removed' ? '. You were removed from office before the term ended.' : '.') + '</p>';
}

function sessionBlock(s) {
  const ses = s.session;
  if (!ses) return '<div class="t-card"><h2 class="t-h2">Waiting for your teacher</h2><p role="status">No session has started yet. This page checks automatically, so you can leave it open.</p></div>';
  if (s.completed) {
    let cls = '';
    if (s.class_results) {
      const c = s.class_results;
      cls = '<h2 class="t-h2">How the class did</h2><p class="t-note">' + c.completed + ' students finished. These are class totals; nobody is named.</p>' + avgCards(c.average) + distChart(c.distribution);
    } else if (ses.reveal_results) cls = '<p class="t-note">Class results will show once at least 3 students have finished.</p>';
    return '<div class="t-card"><h2 class="t-h2">' + esc(ses.title) + '</h2><div class="t-alert ok" role="status">Your class results are being collected for discussion.</div>' + resultBlock(s.my_result) +
      (cls || '<p class="t-note">Other students’ results stay hidden until your teacher chooses to share them.</p>') + '</div>';
  }
  if (ses.status === 'ended') return '<div class="t-card"><h2 class="t-h2">' + esc(ses.title) + '</h2><p role="status">This session has ended. Your teacher can start another one, and this page will update.</p></div>';
  return '<div class="t-card"><div class="t-eyebrow">SESSION</div><h2 class="t-h2">' + esc(ses.title) + '</h2>' +
    (ses.instructions ? '<p class="t-pre">' + esc(ses.instructions) + '</p>' : '') +
    '<p class="t-note">You will play 14 days as President. Everyone in your class gets the same country and the same starting events, so you can compare choices afterwards. Plan on about 15 to 25 minutes. If you refresh the page in the middle of a game, you start that game over.</p>' +
    '<button class="t-btn gold lg" data-act="play">Start simulation</button></div>';
}

function lobbyView() {
  return '<div class="t-card"><div class="t-eyebrow">YOUR CLASSROOM</div><h1 class="t-h1">' + esc(st.classroom.name) + '</h1>' +
    '<p>You are playing as <b>' + esc(st.nickname) + '</b>. This random nickname is the only thing your teacher sees.</p>' +
    (notice ? '<div class="t-alert" role="status">' + esc(notice) + '</div>' : '') + '</div>' + sessionBlock(st) +
    '<p class="t-small"><button class="t-link" data-act="leave">Leave this classroom</button></p>';
}

async function refresh(quiet) {
  const token = getToken();
  if (!token) { view = 'join'; render(); return; }
  try {
    st = await call({ action: 'state', token });
    view = 'lobby'; if (!quiet) notice = '';
  } catch (e) {
    if (e instanceof ClassError && e.code === 'teacher_beta_disabled') { view = 'disabled'; }
    else if (e instanceof ClassError && ['invalid_token', 'classroom_closed'].includes(e.code)) {
      clearToken(); st = null; view = 'join'; notice = e.code === 'classroom_closed' ? 'Your teacher closed that classroom. Enter a new code to join another.' : 'Your classroom session was not found. Enter the code to join again.';
    } else if (!st) { view = 'join'; notice = e.message; }
    else toast(e.message, 'err');   // keep what is on screen if the network blips
  }
  render(); schedule();
}
function schedule() {
  clearTimeout(timer);
  if (view !== 'lobby' || !st) return;
  const waiting = !st.session || (st.session.status === 'active' && !st.completed) || (st.completed && st.session.reveal_results === false) || (st.session.status === 'ended' && !st.completed);
  if (waiting) timer = setTimeout(() => { if (!document.hidden && document.getElementById('viewport').dataset.mode === 'teacher') refresh(true); else schedule(); }, 6000);
}

async function join(e) {
  e.preventDefault();
  if (busy) return;
  const raw = (root.querySelector('#class-code').value || '').trim();
  codeDraft = raw;
  if (!raw) { joinErr = 'Enter your code.'; render(); return; }
  busy = true; joinErr = ''; render();
  try {
    const r = await call({ action: 'join', code: raw });
    setToken(r.token); codeDraft = ''; notice = '';
    busy = false; await refresh();
  } catch (err) { busy = false; joinErr = err.message; render(); const i = root.querySelector('#class-code'); if (i) i.focus(); }
}

export function mount(el) {
  root = el;
  root.addEventListener('submit', (e) => { if (e.target.dataset.form === 'join') join(e); });
  root.addEventListener('input', (e) => { if (e.target.id === 'class-code') { codeDraft = e.target.value; e.target.value = e.target.value.toUpperCase(); } });
  root.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'play' && st && st.session && st.session.seed != null) window.__classPlay({ seed: st.session.seed, title: st.session.title });
    if (a.dataset.act === 'leave') {
      const ok = await confirmDialog({ title: 'Leave this classroom?', body: 'Your nickname and any result you sent will be deleted. You can join again with the code.', confirm: 'Leave', danger: true });
      if (!ok) return;
      try { await call({ action: 'leave', token: getToken() }); } catch (err) { /* already gone is fine */ }
      clearToken(); st = null; view = 'join'; notice = 'You left the classroom.'; render();
    }
  });
  window.addEventListener('gias:class-home', () => refresh());
  document.addEventListener('visibilitychange', () => { if (!document.hidden && view === 'lobby') refresh(true); });
  document.title = 'Classroom · Give It A Shot';
  refresh();
}
