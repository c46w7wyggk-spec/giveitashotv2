// /classroom: students enter a code and their name (first name and last initial), wait in a lobby, and the game starts for
// everyone at once when the teacher presses Start (5-second countdown). No account, no email.
import { call, getToken, setToken, clearToken, ClassError, submitQuiz } from './studentApi.js';
import { esc, avgCards, distChart, confirmDialog, toast, METRICS, fmtMetric, summaryCard } from './kit.js';
import { Engine } from '../engine.js';
import { buildSummary } from '../summary.js';
import { minutesFor } from '../learn.js';
import { buildQuiz, FRQ_MAX, UNIT_NAMES } from '../quiz.js';

let root, view = 'loading', st = null, notice = '', busy = false, joinErr = '', timer = null, tick = null, codeDraft = '', nameDraft = '';
let offset = 0;            // server clock minus this device's clock, so every student's countdown ends together
let playing = false;       // a game is running in the other screen; do not poll or auto-start
let launching = false;
let quizDraft = { answers: [], frq: '' }, quizBusy = false, quizErr = '';   // kept across the lobby's polling re-renders
let ENG = null; const eng = () => (ENG = ENG || new Engine());

const shell = (inner) => '<div class="t-wrap narrow"><header class="t-top"><div class="t-brand"><svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z" fill="#eef1f6"></path></svg><div><div class="t-brand-t">GIVE IT A SHOT</div><div class="t-brand-s">Classroom</div></div></div></header><main id="t-main">' + inner + '</main><footer class="t-foot">Your teacher sees the name you enter and your results. Do not enter an email address or other personal details. <a href="/" data-nav-out>Back to the game</a></footer></div>';

function render() {
  let html;
  if (view === 'loading') html = '<div class="t-card"><p class="t-note" role="status">Loading...</p></div>';
  else if (view === 'disabled') html = '<div class="t-card"><h1 class="t-h1">Classroom mode is unavailable</h1><p>Classroom mode is not running right now. Ask your teacher what to do next.</p></div>';
  else if (view === 'join') html = joinView();
  else html = lobbyView();
  const ae = document.activeElement, typing = ae && ae.id === 'quiz-frq' ? [ae.selectionStart, ae.selectionEnd] : null;
  root.innerHTML = shell(html);
  restoreQuiz(typing);
  const c = root.querySelector('#class-code'); if (c) c.value = codeDraft;
  const n = root.querySelector('#class-name'); if (n) n.value = nameDraft;
}

function joinView() {
  return '<form class="t-card" data-form="join" novalidate><h1 class="t-h1">Join your class</h1><p>Type the code your teacher gave you and your name.</p>' +
    (notice ? '<div class="t-alert" role="status">' + esc(notice) + '</div>' : '') +
    '<label class="t-label" for="class-code">Class code</label>' +
    '<input id="class-code" class="t-input code" name="code" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="10" placeholder="ABC234" aria-describedby="join-err" ' + (busy ? 'disabled' : '') + '>' +
    '<label class="t-label" for="class-name">Your name</label>' +
    '<input id="class-name" class="t-input" name="name" autocomplete="off" maxlength="24" placeholder="First name and last initial, like Sam R." aria-describedby="name-help join-err" ' + (busy ? 'disabled' : '') + '>' +
    '<div id="name-help" class="t-note">This is how your teacher will know who you are. Please use your first name and last initial.</div>' +
    '<div id="join-err" class="t-err" role="alert">' + esc(joinErr) + '</div>' +
    '<button class="t-btn gold lg" type="submit" ' + (busy ? 'disabled' : '') + '>' + (busy ? 'Joining...' : 'Join') + '</button></form>';
}

function resultBlock(r) {
  if (!r) return '';
  const rows = METRICS.map((m) => '<div class="t-stat"><span class="t-stat-l">' + esc(m.label) + '</span><span class="t-stat-v">' + esc(fmtMetric(m, r[m.key])) + '</span></div>').join('');
  return '<h2 class="t-h2">Your result</h2><div class="t-cards"><div class="t-stat big"><span class="t-stat-l">Your score</span><span class="t-stat-v">' + esc(r.score) + '</span></div>' + rows + '</div>' +
    '<p class="t-note">Conservatives graded you ' + esc(r.cons_letter) + ', liberals ' + esc(r.lib_letter) + (r.completion_status === 'removed' ? '. You were removed from office before the term ended.' : '.') + '</p>';
}

function mySummary(s) {
  const r = s.my_result;
  if (!r || !r.digest) return '';
  try { return summaryCard(buildSummary(new Engine(), r.digest, { score: r.score, cons: r.cons_letter, lib: r.lib_letter }), { title: 'Your written summary' }); } catch (e) { return ''; }
}

// End-of-game check-up: three AP-style questions built from this student's own game, plus one written response.
// The server rebuilds the same questions from the stored result and grades the multiple choice itself.
function quizBlock(s) {
  const r = s.my_result;
  if (!r || !r.digest) return '';
  let q = null;
  try { q = buildQuiz(r, { focus: s.session.focus || null, titleOf: (id) => { const p = eng().pol(id); return p ? p.t : ''; } }); } catch (e) { q = null; }
  if (!q) return '';
  const focus = s.session.focus && UNIT_NAMES[s.session.focus] ? '<p class="t-note">Focus: AP Macroeconomics ' + esc(UNIT_NAMES[s.session.focus]) + '</p>' : '';
  const head = '<div class="t-eyebrow">CHECK YOUR UNDERSTANDING</div><h2 class="t-h2">Questions about your term</h2>' + focus;
  if (r.quiz) {
    const a = r.quiz.answers || [];
    const items = q.mc.map((m, i) => {
      const ok = a[i] === m.answer;
      return '<li class="t-quiz-q"><p><b>' + (i + 1) + '.</b> ' + esc(m.q) + '</p><p class="t-quiz-a ' + (ok ? 'ok' : 'no') + '">' + (ok ? 'Correct: ' : 'Your answer: ') + esc(m.choices[a[i]] || '(none)') + '</p>' +
        (ok ? '' : '<p class="t-quiz-a ok">Correct answer: ' + esc(m.choices[m.answer]) + '</p>') + '<p class="t-note">' + esc(m.why) + '</p></li>';
    }).join('');
    return '<div class="t-card">' + head + '<div class="t-alert ok" role="status">You got ' + esc(r.quiz_score) + ' of ' + esc(r.quiz_of) + ' right. Your answers were sent to your teacher.</div><ol class="t-quiz">' + items + '</ol>' +
      '<h3 class="t-h3">Written response</h3><p class="t-pre">' + esc(q.frq.q) + '</p>' + (r.quiz.frq ? '<p class="t-pre t-quiz-frq">' + esc(r.quiz.frq) + '</p>' : '<p class="t-note">You did not write a response.</p>') +
      '<p class="t-note">Your teacher reads and grades the written response.</p></div>';
  }
  const items = q.mc.map((m, i) => '<li class="t-quiz-q"><fieldset><legend><b>' + (i + 1) + '.</b> ' + esc(m.q) + '</legend>' +
    m.choices.map((c, j) => '<label class="t-opt"><input type="radio" name="q' + i + '" value="' + j + '"' + (quizBusy ? ' disabled' : '') + '><span>' + esc(c) + '</span></label>').join('') + '</fieldset></li>').join('');
  return '<form class="t-card" data-form="quiz" novalidate>' + head + '<p class="t-note">Answer from what happened in your own game. You can submit once.</p><ol class="t-quiz">' + items + '</ol>' +
    '<h3 class="t-h3"><label for="quiz-frq">Written response</label></h3><p class="t-pre" id="quiz-frq-q">' + esc(q.frq.q) + '</p>' +
    '<p class="t-note">Describe any graph in words (for example, "AD shifts right"). Your teacher grades this part.</p>' +
    '<textarea id="quiz-frq" class="t-input t-area" rows="8" maxlength="' + FRQ_MAX + '" aria-describedby="quiz-frq-q"' + (quizBusy ? ' disabled' : '') + '></textarea>' +
    '<div class="t-err" role="alert">' + esc(quizErr) + '</div>' +
    '<button class="t-btn gold" type="submit"' + (quizBusy ? ' disabled' : '') + '>' + (quizBusy ? 'Sending...' : 'Submit answers') + '</button></form>';
}
function restoreQuiz(typing) {
  const f = root.querySelector('form[data-form="quiz"]'); if (!f) return;
  quizDraft.answers.forEach((v, i) => { if (v == null) return; const el = f.querySelector('input[name="q' + i + '"][value="' + v + '"]'); if (el) el.checked = true; });
  const t = f.querySelector('#quiz-frq'); if (t) { t.value = quizDraft.frq; if (typing) { t.focus(); t.setSelectionRange(typing[0], typing[1]); } }
}
async function sendQuiz(e) {
  e.preventDefault();
  if (quizBusy) return;
  const n = root.querySelectorAll('form[data-form="quiz"] .t-quiz-q').length;
  const answers = []; for (let i = 0; i < n; i++) answers.push(quizDraft.answers[i]);
  if (answers.some((a) => a == null)) { quizErr = 'Answer every multiple-choice question first.'; render(); return; }
  quizBusy = true; quizErr = ''; render();
  try { await submitQuiz(answers, quizDraft.frq); quizBusy = false; quizDraft = { answers: [], frq: '' }; await refresh(true); }
  catch (err) { quizBusy = false; quizErr = err.message; if (err.code === 'quiz_already_submitted') await refresh(true); else render(); }
}

const secsLeft = () => (st && st.session && st.session.starts_at ? (Date.parse(st.session.starts_at) - (Date.now() + offset)) / 1000 : null);

function sessionBlock(s) {
  const ses = s.session;
  if (!ses) return '<div class="t-card"><h2 class="t-h2">Waiting for your teacher</h2><p role="status">No session has started yet. This page checks automatically, so you can leave it open.</p></div>';
  if (s.completed) {
    let cls = '';
    if (s.class_results) {
      const c = s.class_results;
      cls = '<h2 class="t-h2">How the class did</h2><p class="t-note">' + c.completed + ' students finished. These are class totals; nobody is named.</p>' + avgCards(c.average) + distChart(c.distribution);
    } else if (ses.reveal_results) cls = '<p class="t-note">Class results will show once at least 3 students have finished.</p>';
    return '<div class="t-card"><h2 class="t-h2">' + esc(ses.title) + '</h2><div class="t-alert ok" role="status">Your result was sent to your teacher.</div>' + resultBlock(s.my_result) + mySummary(s) +
      (cls || '<p class="t-note">Other students’ results stay hidden until your teacher chooses to share them.</p>') + '</div>' + quizBlock(s);
  }
  if (ses.status === 'ended') return '<div class="t-card"><h2 class="t-h2">' + esc(ses.title) + '</h2><p role="status">This session has ended. Your teacher can start another one, and this page will update.</p></div>';
  const len = '<p class="t-note">You will be President for <b>' + ses.days + ' days</b> (about ' + esc(minutesFor(ses.days)) + '). Everyone in your class gets the same country and the same starting events, so you can compare choices afterwards. If you refresh the page in the middle of a game, you start over.</p>';
  const head = '<div class="t-eyebrow">SESSION</div><h2 class="t-h2">' + esc(ses.title) + '</h2>' + (ses.instructions ? '<p class="t-pre">' + esc(ses.instructions) + '</p>' : '') + len;
  if (ses.started) return '<div class="t-card">' + head + '<p class="t-alert ok" role="status">The simulation has started. Opening your game...</p></div>';
  const left = secsLeft();
  if (left != null) {
    const n = Math.max(0, Math.ceil(left));
    return '<div class="t-card t-countdown">' + head + '<div class="t-count" role="timer" aria-live="off" id="t-count">' + n + '</div><p role="status" class="t-note" id="t-count-l">The simulation starts in ' + n + ' second' + (n === 1 ? '' : 's') + '. Get ready.</p></div>';
  }
  return '<div class="t-card">' + head + '<div class="t-wait" role="status"><span class="t-spin" aria-hidden="true"></span> Waiting for your teacher to press Start. The game begins for everyone at the same moment. Keep this page open.</div></div>';
}

function lobbyView() {
  return '<div class="t-card"><div class="t-eyebrow">YOUR CLASSROOM</div><h1 class="t-h1">' + esc(st.classroom.name) + '</h1>' +
    '<p>You are signed in as <b>' + esc(st.nickname) + '</b>. This is the name your teacher sees.</p>' +
    (notice ? '<div class="t-alert" role="status">' + esc(notice) + '</div>' : '') + '</div>' + sessionBlock(st) +
    '<p class="t-small"><button class="t-link" data-act="leave">Leave this classroom</button></p>';
}

function onLobby() { return document.getElementById('viewport').dataset.mode === 'teacher'; }

async function refresh(quiet) {
  const token = getToken();
  if (!token) { view = 'join'; render(); return; }
  try {
    const t0 = Date.now();
    const next = await call({ action: 'state', token });
    if (next.server_now) offset = Date.parse(next.server_now) - (t0 + Date.now()) / 2;
    st = next; view = 'lobby'; if (!quiet) notice = '';
  } catch (e) {
    if (e instanceof ClassError && e.code === 'teacher_beta_disabled') { view = 'disabled'; }
    else if (e instanceof ClassError && ['invalid_token', 'classroom_closed'].includes(e.code)) {
      clearToken(); st = null; view = 'join'; notice = e.code === 'classroom_closed' ? 'Your teacher closed that classroom. Enter a new code to join another.' : 'Your classroom session was not found. Enter the code to join again.';
    } else if (!st) { view = 'join'; notice = e.message; }
    else toast(e.message, 'err');   // keep what is on screen if the network blips
  }
  render(); schedule(); maybeLaunch();
}

// The game starts by itself: once the server says "started" and we have the seed.
function maybeLaunch() {
  if (playing || launching || view !== 'lobby' || !st || !st.session || st.completed) return;
  const ses = st.session;
  if (ses.status === 'active' && ses.started && ses.seed != null && onLobby()) {
    launching = true; playing = true; clearTimeout(timer); clearInterval(tick);
    window.__classPlay({ seed: ses.seed, title: ses.title, days: ses.days, difficulty: ses.difficulty, focus: ses.focus || null, name: st.nickname });
    launching = false;
  }
}

function schedule() {
  clearTimeout(timer); clearInterval(tick);
  if (view !== 'lobby' || !st || playing) return;
  const ses = st.session;
  const left = secsLeft();
  // countdown: repaint the number every 200 ms and ask the server for the seed the moment it reaches zero
  if (ses && !ses.started && left != null && ses.status === 'active' && !st.completed) {
    tick = setInterval(() => {
      const l = secsLeft(); const n = Math.max(0, Math.ceil(l));
      const el = document.getElementById('t-count'); if (el && el.textContent !== String(n)) { el.textContent = n; const lab = document.getElementById('t-count-l'); if (lab) lab.textContent = 'The simulation starts in ' + n + ' second' + (n === 1 ? '' : 's') + '. Get ready.'; }
      if (l <= 0) { clearInterval(tick); startPoll(0); }
    }, 200);
    return;
  }
  const waiting = !ses || (ses.status === 'active' && !st.completed) || (st.completed && ses.reveal_results === false) || (ses.status === 'ended' && !st.completed);
  if (!waiting) return;
  // the waiting room polls fast so the countdown shows up within a couple of seconds; everything else polls slowly
  const fast = !ses || (ses.status === 'active' && !st.completed);
  timer = setTimeout(() => { if (!document.hidden && onLobby()) refresh(true); else schedule(); }, fast ? 2000 : 6000);
}
let pollTries = 0;
function startPoll(i) {
  pollTries = i;
  const go = async () => {
    await refresh(true);
    if (!playing && pollTries < 8 && st && st.session && !st.session.started) { pollTries++; timer = setTimeout(go, 400); }
  };
  go();
}

async function join(e) {
  e.preventDefault();
  if (busy) return;
  const raw = (root.querySelector('#class-code').value || '').trim();
  const nm = (root.querySelector('#class-name').value || '').trim();
  codeDraft = raw; nameDraft = nm;
  if (!raw) { joinErr = 'Enter your code.'; render(); return; }
  if (!nm) { joinErr = 'Enter your name so your teacher knows who you are.'; render(); const i = root.querySelector('#class-name'); if (i) i.focus(); return; }
  busy = true; joinErr = ''; render();
  try {
    const r = await call({ action: 'join', code: raw, name: nm });
    setToken(r.token); codeDraft = ''; nameDraft = ''; notice = '';
    busy = false; await refresh();
  } catch (err) { busy = false; joinErr = err.message; render(); const i = root.querySelector(err.code === 'bad_name' ? '#class-name' : '#class-code'); if (i) i.focus(); }
}

export function mount(el) {
  root = el;
  root.addEventListener('submit', (e) => { if (e.target.dataset.form === 'join') join(e); if (e.target.dataset.form === 'quiz') sendQuiz(e); });
  root.addEventListener('change', (e) => {
    const m = /^q(\d)$/.exec(e.target.name || ''); if (!m) return;
    quizDraft.answers[+m[1]] = +e.target.value;
    if (quizErr) { quizErr = ''; const el = root.querySelector('form[data-form="quiz"] .t-err'); if (el) el.textContent = ''; }
  });
  root.addEventListener('input', (e) => {
    if (e.target.id === 'class-code') { codeDraft = e.target.value; e.target.value = e.target.value.toUpperCase(); }
    if (e.target.id === 'class-name') nameDraft = e.target.value;
    if (e.target.id === 'quiz-frq') quizDraft.frq = e.target.value;
  });
  root.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'leave') {
      const ok = await confirmDialog({ title: 'Leave this classroom?', body: 'Your name and any result you sent will be deleted. You can join again with the code.', confirm: 'Leave', danger: true });
      if (!ok) return;
      try { await call({ action: 'leave', token: getToken() }); } catch (err) { /* already gone is fine */ }
      clearToken(); st = null; view = 'join'; notice = 'You left the classroom.'; render();
    }
  });
  window.addEventListener('gias:class-home', () => { playing = false; launching = false; refresh(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && view === 'lobby' && !playing) refresh(true); });
  document.title = 'Classroom · Give It A Shot';
  refresh();
}
