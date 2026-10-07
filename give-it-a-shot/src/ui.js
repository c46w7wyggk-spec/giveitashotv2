import { Engine, dailySeed, utcDate, applyAction, XIDX } from './engine.js';
import * as api from './api.js';
import { shareCard } from './share.js';

const HOME_TAG = 'UATX';
const PENDING_KEY = 'gias_pending_v2';
const TUT_KEY = 'gias_tut_v2';
const WANT_KEY = 'gias_want_leader';
const XCATS = [['tax', 'Taxes'], ['labor', 'Labor'], ['housing', 'Housing & Markets'], ['trade', 'Trade & Energy'], ['power', 'Power Plays']];
const HANDLE_RE = /^[A-Za-z0-9_]{3,16}$/;
const TAG_RE = /^[A-Za-z0-9]{2,8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const lsGet = (k) => { try { return window.localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { window.localStorage.setItem(k, v); } catch (e) { /* storage may be blocked */ } };
const lsDel = (k) => { try { window.localStorage.removeItem(k); } catch (e) { /* ignore */ } };

const isUatxUser = (u, profile) => !!((u && /@(student\.)?uaustin\.org$/i.test(u.email || '')) || (profile && profile.tag === 'UATX'));
// The Kormanik Challenge: finish the term very right wing AND earn an A from conservatives.
export const KORM = { needle: 80, band: 'A' };
export class App extends Engine {
  constructor(rerender) {
    super();
    this._rerender = rerender;
    this.state = { mode: 'free', tab: 'map', boardMode: 'daily', boardTag: null, user: null, profile: null, streak: null, authStep: 'email', xcat: 'tax', xsel: null, xopen: false, pstory: null, tut: lsGet(TUT_KEY) === 'done' ? -1 : 0 };
    this.state.g = this.makeGame('free', 'President');
  }
  setState(p) { Object.assign(this.state, p); this._rerender(); }

  // ---------- games ----------
  makeGame(mode, title) {
    const seed = mode === 'daily' ? dailySeed(utcDate()) : Math.floor(Math.random() * 2147483647);
    const g = this.newGame(seed);
    g.title = title || 'President'; g.seed0 = seed; g.mode = mode; g.dd = mode === 'daily' ? utcDate() : null; g.log = '';
    return g;
  }
  act(fn) {
    const cur = this.state.g;
    const g = JSON.parse(JSON.stringify(cur));
    fn(g);
    g.n = (g.n || 0) + 1;
    const patch = { g: g, xsel: null };
    if (g.phase !== cur.phase) {
      if (g.phase === 'desk') patch.tab = 'map';
      else if (g.phase === 'incident' || g.phase === 'trial' || g.phase === 'brief' || g.phase === 'end') patch.tab = 'desk';
    }
    this.setState(patch);
    if (g.phase === 'end' && cur.phase !== 'end') this.onGameEnd(g);
  }
  async onGameEnd(g) {
    this.setState({ rankBoard: null, submitted: false, lbMsg: '', lbErr: '', shareMsg: '' });
    if (!api.configured || g.mode === 'korm') return;
    try {
      const rows = await api.topScores(g.mode === 'daily' ? { mode: 'daily', date: g.dd, limit: 100 } : { mode: 'free', limit: 100 });
      if (this.state.g === g || this.state.g.phase === 'end') this.setState({ rankBoard: rows });
    } catch (e) { /* ranking is optional */ }
  }

  // ---------- account ----------
  async init() {
    const pending = lsGet(PENDING_KEY);
    let restored = false;
    if (pending) {
      try { const o = JSON.parse(pending); if (o && o.g && o.g.phase === 'end') { this.state.g = o.g; this.state.mode = o.g.mode || 'free'; restored = true; } } catch (e) { /* ignore */ }
    }
    if (!api.configured) { this._rerender(); return; }
    api.onAuth((u) => this.onUser(u, true));
    const u = await api.getUser();
    await this.onUser(u, restored);
    if (u && restored) { lsDel(PENDING_KEY); this.onGameEnd(this.state.g); }
    if (!u && restored) lsDel(PENDING_KEY);
  }
  async onUser(u, openIfNeeded) {
    if (!u) { this.setState({ user: null, profile: null, streak: null }); return; }
    if (this.state.user && this.state.user.id === u.id && this.state.profile) return;
    this.setState({ user: u });
    if (lsGet(WANT_KEY)) setTimeout(() => this.tryLeader(), 0);
    try {
      const profile = await api.getProfile(u.id);
      this.setState({ profile: profile });
      if (!profile && openIfNeeded) this.setState({ authOpen: true, authStep: 'handle', authErr: '' });
      if (profile) {
        if (this.state.authOpen && this.state.authStep !== 'account') this.setState({ authOpen: false });
        this.loadStreak();
      }
    } catch (e) { this.setState({ authErr: 'Could not load your profile. Try again.' }); }
  }
  // Supreme Leader is an invite-only beta: the server decides who is on the list.
  async tryLeader() {
    const st = this.state;
    if (!api.configured) { this.setState({ betaMsg: 'Supreme Leader is an invite-only beta and needs the online service, which is not reachable right now.' }); return; }
    if (!st.user) { lsSet(WANT_KEY, '1'); this.setState({ authOpen: true, authStep: 'email', authErr: 'Supreme Leader is an invite-only beta. Sign in with your invited email.' }); return; }
    this.setState({ betaMsg: 'Checking the beta list...' });
    const ok = await api.isBeta();
    lsDel(WANT_KEY);
    if (ok) { this.setState({ betaMsg: '' }); if (window.__showLeader) window.__showLeader(); }
    else this.setState({ betaMsg: 'Supreme Leader is an invite-only beta, and ' + (st.user.email || 'this account') + ' is not on the list yet. Ask the creator for access.' });
  }
  async loadStreak() {
    try { this.setState({ streak: await api.myStreak() }); } catch (e) { /* streak is optional */ }
  }
  openAuth() {
    const st = this.state;
    const step = !st.user ? 'email' : !st.profile ? 'handle' : 'account';
    this.setState({ authOpen: true, authStep: step, authErr: '' });
  }
  async authSend() {
    const st = this.state; const email = (st.authEmail || '').trim();
    if (!EMAIL_RE.test(email)) { this.setState({ authErr: 'Enter a valid email address.' }); return; }
    if (st.sending) return;
    this.setState({ sending: true, authErr: '' });
    if (st.g.phase === 'end') lsSet(PENDING_KEY, JSON.stringify({ g: st.g }));
    try { await api.signInEmail(email); this.setState({ sending: false, authStep: 'sent' }); }
    catch (e) {
      const m = String(e && e.message || e);
      this.setState({ sending: false, authErr: /rate limit|too many|seconds/i.test(m) ? 'Too many sign-in emails right now. Wait a few minutes and try again.' : 'Could not send the email: ' + m });
    }
  }
  async authGoogle() {
    if (this.state.g.phase === 'end') lsSet(PENDING_KEY, JSON.stringify({ g: this.state.g }));
    try { await api.signInGoogle(); } catch (e) { this.setState({ authErr: 'Google sign-in failed: ' + String(e && e.message || e) }); }
  }
  async authSave() {
    const st = this.state; const handle = (st.authHandle || '').trim(); const tag = (st.authTag || '').trim();
    if (!HANDLE_RE.test(handle)) { this.setState({ authErr: 'Handles are 3-16 letters, numbers or underscores.' }); return; }
    if (tag && !TAG_RE.test(tag)) { this.setState({ authErr: 'Tags are 2-8 letters or numbers.' }); return; }
    if (st.sending || !st.user) return;
    this.setState({ sending: true, authErr: '' });
    try {
      const gotTag = await api.createProfile(st.user.id, handle, tag);
      this.setState({ sending: false, profile: { handle: handle, tag: gotTag || null }, authOpen: false });
      this.loadStreak();
    } catch (e) { this.setState({ sending: false, authErr: String(e && e.message || e) }); }
  }
  async authSignOut() {
    await api.signOut();
    this.setState({ user: null, profile: null, streak: null, authOpen: false, submitted: false });
  }

  // ---------- board ----------
  async loadBoard() {
    if (!api.configured) { this.setState({ board: [], boardErr: 'The online board is not configured.' }); return; }
    const st = this.state;
    this.setState({ boardLoading: true, boardErr: '' });
    try {
      const args = st.boardMode === 'daily' ? { mode: 'daily', date: utcDate() } : { mode: 'free' };
      args.tag = st.boardTag; args.limit = 50;
      const rows = await api.topScores(args);
      this.setState({ board: rows, boardLoading: false });
    } catch (e) { this.setState({ boardLoading: false, boardErr: 'Could not load the board. Try again in a moment.' }); }
  }
  async postScore(g, sc) {
    const st = this.state;
    if (st.posting || st.submitted) return;
    this.setState({ posting: true, lbErr: '' });
    try {
      const r = await api.submitScore({ seed: g.seed0, role: g.title, mode: g.mode, daily_date: g.dd, log: g.log });
      const same = r.score === sc.score;
      this.setState({ posting: false, submitted: true, lbMsg: 'Posted as ' + r.handle + '. Server-verified score: ' + r.score + '.', lbErr: same ? '' : 'Note: the server scored this run ' + r.score + ' (your screen said ' + sc.score + '). The server number is the one on the board.' });
      this.loadStreak();
      if (g.mode === 'daily') this.setState({ streak: Object.assign({}, st.streak || {}, { played_today: true }) });
    } catch (e) { this.setState({ posting: false, lbErr: String(e && e.message || e) }); }
  }
  async doShare() {
    const s = this._share; if (!s || !s.score) return;
    const label = s.mode === 'daily' ? 'Daily Executive · ' + s.dd : s.mode === 'korm' ? 'Kormanik Challenge' + (s.kwin ? ' · COMPLETED' : '') : 'Free Play · 14 days in office';
    const site = window.location.host || 'give-it-a-shot';
    try {
      const r = await shareCard({ title: s.title, score: s.score, cons: s.cons, lib: s.lib, role: s.role, needle: s.needle, label: label, site: site },
        'I scored ' + s.score + ' in Give It A Shot (' + s.title + '). Conservatives gave me a ' + s.cons + ', liberals a ' + s.lib + '. ' + window.location.origin);
      this.setState({ shareMsg: r === 'downloaded' ? 'Saved the image. Post it anywhere.' : r === 'shared' ? 'Shared.' : '' });
    } catch (e) { this.setState({ shareMsg: 'Could not make the image.' }); }
  }

  // ---------- extra template values ----------
  modeVals(g) {
    const st = this.state; const daily = (st.mode || 'free') === 'daily';
    const played = !!(st.streak && st.streak.played_today);
    const sk = st.streak && st.streak.current_streak > 0 ? ' Streak: ' + st.streak.current_streak + '.' : '';
    return {
      pickFree: () => { if ((st.mode || 'free') !== 'free') this.setState({ mode: 'free', g: this.makeGame('free', g.title) }); },
      pickLeader: () => this.tryLeader(),
      hasBetaMsg: !!st.betaMsg, betaMsg: st.betaMsg || '',
      showKorm: isUatxUser(st.user, st.profile) || !!st.kormForce,
      pickKorm: () => { if ((st.mode || 'free') !== 'korm') this.setState({ mode: 'korm', g: this.makeGame('korm', g.title) }); },
      modeKormCls: (st.mode || 'free') === 'korm' ? 'sel' : '',
      isKormMode: (st.mode || 'free') === 'korm',
      pickDaily: () => { if (!daily) this.setState({ mode: 'daily', g: this.makeGame('daily', g.title) }); },
      modeFreeCls: (st.mode || 'free') === 'free' ? 'sel' : '', modeDailyCls: daily ? 'sel' : '',
      dailyLine: 'Same seed for everyone on ' + utcDate() + '. One scored run a day.' + (played ? ' You already played today.' : '') + sk,
      beginLabel: daily ? 'Begin today\'s Daily Executive' : (st.mode === 'korm' ? 'Take the Challenge' : 'Begin Day 1'),
    };
  }
  accountVals(g, sc) {
    const st = this.state; const user = st.user, profile = st.profile;
    const posted = !!st.submitted;
    const daily = g.mode === 'daily';
    const playedToday = daily && !!(st.streak && st.streak.played_today) && !posted;
    const signedUp = !!(user && profile);
    const canPost = !!sc && !playedToday && g.mode !== 'korm';
    const ready = signedUp && canPost && !posted;
    const step = st.authStep;
    const email = (st.authEmail || '').trim();
    const titles = { email: 'Sign in to post scores', sent: 'Check your email', handle: 'Pick your handle', account: profile ? '@' + profile.handle : 'Account' };
    const texts = {
      email: 'Play without an account any time. An account lets you post to the leaderboard and keep a Daily Executive streak. We email you a sign-in link, no password.',
      sent: 'We sent a sign-in link to ' + email + '. Open it in this browser; you will land back here with your result waiting. It can take a minute, and it may land in spam.',
      handle: 'This is the name shown on the leaderboard, and it cannot be changed later. Offensive handles are blocked. Sign in with a @student.uaustin.org email and you are tagged ' + HOME_TAG + ' automatically. Other groups can add an optional tag.',
      account: 'You are signed in' + (profile && profile.tag ? ' with group tag ' + profile.tag : '') + '.',
    };
    const sendReady = EMAIL_RE.test(email) && !st.sending;
    const saveReady = HANDLE_RE.test((st.authHandle || '').trim()) && !st.sending;
    const pill = (on) => (on ? 'gold' : 'ghost');
    const boardTabs = [{ label: 'Today\'s Daily', on: st.boardMode === 'daily', mode: 'daily' }, { label: 'All-time (Free Play)', on: st.boardMode !== 'daily', mode: 'all' }]
      .map((b) => ({ label: b.label, cls: pill(b.on), pick: () => { this.setState({ boardMode: b.mode }); this.loadBoard(); } }));
    const tagTabs = [{ label: 'Everyone', tag: null }, { label: HOME_TAG + ' only', tag: HOME_TAG }]
      .map((b) => ({ label: b.label, cls: pill(st.boardTag === b.tag), pick: () => { this.setState({ boardTag: b.tag }); this.loadBoard(); } }));
    const sk = st.streak;
    this._boardInfo = { boardTabs: boardTabs, tagTabs: tagTabs };
    return {
      authClick: () => this.openAuth(),
      authLabel: signedUp ? '@' + profile.handle : user ? 'Pick a handle' : api.configured ? 'Sign in' : 'Offline',
      authCls: signedUp ? 'in' : '',
      postTitle: daily ? 'POST TO TODAY\'S DAILY BOARD' : 'PUT IT ON THE LEADERBOARD',
      showSignIn: !posted && !signedUp && api.configured && canPost,
      signInPitch: user ? 'Pick a handle to post this run.' : daily ? 'Sign in to post today\'s run and keep your streak.' : 'Sign in to post this run to the leaderboard.',
      signInLabel: user ? 'Pick a handle' : 'Sign in to post',
      showPost: ready, postHandle: profile ? '@' + profile.handle + (profile.tag ? ' [' + profile.tag + ']' : '') : '',
      submit: () => this.postScore(g, sc),
      submitLabel: st.posting ? 'Posting...' : 'Post score',
      submitCls: st.posting ? 'off' : 'gold',
      showPosted: posted, lbMsg: st.lbMsg || '',
      lbErr: st.lbErr || (playedToday ? 'You already posted today\'s Daily Executive. Come back tomorrow for a new seed.' : '') || (g.mode === 'korm' ? '' : !api.configured ? 'Offline preview: the online board is not configured.' : ''),
      share: () => this.doShare(), shareLabel: st.shareMsg || 'Share your result',
      hasAuth: !!st.authOpen, closeAuth: () => this.setState({ authOpen: false }),
      authTitle: titles[step] || '', authText: texts[step] || '',
      authStepEmail: step === 'email', authStepSent: step === 'sent', authStepHandle: step === 'handle', authStepAccount: step === 'account',
      authEmail: st.authEmail || '', onEmail: (e) => this.setState({ authEmail: e.target.value }),
      authHandle: st.authHandle || '', onHandle: (e) => this.setState({ authHandle: e.target.value.replace(/[^A-Za-z0-9_]/g, '').slice(0, 16) }),
      authTag: st.authTag || '', onTag: (e) => this.setState({ authTag: e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 8) }),
      authSend: () => this.authSend(), authSendLabel: st.sending ? 'Sending...' : 'Email me a sign-in link',
      authSendCls: sendReady ? 'gold' : 'off',
      authGoogle: () => this.authGoogle(), googleOn: api.googleEnabled,
      authBack: () => this.setState({ authStep: 'email', authErr: '' }),
      authSave: () => this.authSave(), authSaveCls: saveReady ? 'gold' : 'off',
      authSignOut: () => this.authSignOut(),
      authErr: st.authErr || '',
      hasStreak: !!(user && sk && sk.current_streak > 0),
      streakText: sk ? 'Daily streak: ' + sk.current_streak + (sk.current_streak === 1 ? ' day' : ' days') + ' (best ' + sk.best_streak + ')' + (sk.played_today ? '. Today is done.' : '. Play today to keep it going.') : '',
    };
  }
  boardVals(lbRows) {
    const st = this.state; const b = this._boardInfo || { boardTabs: [], tagTabs: [] };
    const empty = lbRows.length === 0;
    return {
      lbRows: lbRows, hasLb: !empty, noLb: empty,
      noLbText: !api.configured ? 'The online board is not configured yet.' : st.boardLoading ? 'Loading...' : st.boardErr ? st.boardErr : 'No scores yet. Finish a 14-day term and post yours.',
      lbNote: st.boardMode === 'daily' ? 'Daily Executive for ' + utcDate() + ' (UTC). Everyone plays the same seed. Scores are replayed and verified by the server.' : 'Each player\'s best Free Play score (current rules). Scores are replayed and verified by the server.',
      boardTabs: b.boardTabs, tagTabs: b.tagTabs,
    };
  }

  getValues() { const v = this.renderVals(); this._share = v._share; return v; }

  // tutorial helpers
  endTut() { lsSet(TUT_KEY, 'done'); this.setState({ tut: -1 }); }
  coachVals(g, phase) {
    const st = this.state; const t = st.tut;
    const on = t >= 0 && g.day === 1 && phase === 'desk';
    const STEPS = [
      ['1 OF 4 · THE MAP', 'Every state has a mood. Gold outlines mark breaking news, and tapping a state tells you why people feel the way they do. Each day starts here. When you are ready, head to your Desk.', 'Go to my Desk'],
      ['2 OF 4 · MEMOS', 'Three bills land on your desk each day. Sign or veto each one. The chips show what to expect, arriving over about three days. Signing builds goodwill with Congress, vetoing costs a little.', 'Next'],
      ['3 OF 4 · EXECUTIVE ACTIONS', 'The panel beside your memos holds bold, unilateral moves: ban unions, abolish a tax, or play dirty. Each costs political capital (the gold bar at the top), strains Congress, and some risk scandal. One per day.', 'Next'],
      ['4 OF 4 · THE PRESS', 'After you end the day, read the headlines and the left and right op-eds here. Watch Congress and Scandal at the top: if both turn on you, an impeachment trial starts, and you can fight it.', 'Got it, back to work'],
    ];
    const S = STEPS[Math.max(0, Math.min(3, t))];
    return {
      mbCoach: on && t === 0, deskCoach: on && (t === 1 || t === 2), pressCoach: on && t === 3,
      coachStep: S[0], coachText: S[1], coachBtn: S[2],
      coachNext: () => {
        if (t === 0) this.setState({ tut: 1, tab: 'desk' });
        else if (t === 1) this.setState({ tut: 2, xopen: true });
        else if (t === 2) this.setState({ tut: 3, tab: 'press' });
        else { this.endTut(); this.setState({ tab: 'desk' }); }
      },
      coachSkip: () => this.endTut(),
    };
  }

  renderVals() {
    const D = this.data();
    const g = (this.state && this.state.g) || this.newGame(20261005);
    const st = this.state || {};
    const m = this.M(g);
    const fmt = (v, d) => (Math.abs(v) < 0.5 * Math.pow(10, -d) ? 0 : v);
    const sg = (v, d) => { const z = fmt(v, d); return (z >= 0 ? '+' : '−') + Math.abs(z).toFixed(d); };
    const GOOD = { g: 1, j: -1, i: -1, d: -1, a: 1, u: -1 };
    const NAME = { g: 'Economy', j: 'Unemployment', i: 'Inflation', d: 'Deficit', a: 'Approval', u: 'Unrest' };
    const UNIT = { g: '%', j: ' pt', i: ' pt', d: '% of GDP', a: '', u: '' };
    const DEC = { g: 1, j: 1, i: 1, d: 1, a: 0, u: 0 };
    const MIN = { g: 0.05, j: 0.05, i: 0.05, d: 0.05, a: 0.5, u: 0.5 };
    const R = this.role(g);
    const ap = (g.n || 0) % 2 ? 'A' : 'B';
    const chip = (v, k, big, idx) => ({ t: NAME[k] + ' ' + sg(v, DEC[k]) + UNIT[k], cls: v * GOOD[k] > 0 ? 'good' : 'bad', style: 'animation-name:pop' + ap + ';animation-delay:' + ((idx || 0) * 70 + 120) + 'ms' });
    const chips = (f) => D.KEYS.map((k, i) => (Math.abs(f[i]) >= MIN[k] ? [f[i], k] : null)).filter((x) => x).map((x, i) => chip(x[0], x[1], false, i));
    const mix = (a, b, f) => a.map((x, i) => Math.round(x + (b[i] - x) * f));
    const hex = (c) => '#' + c.map((x) => x.toString(16).padStart(2, '0')).join('');
    const lin = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
    const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const RED = [192, 57, 43], NE = [236, 230, 214], TEAL = [42, 157, 143];
    const moodColor = (v) => (v < 50 ? mix(RED, NE, this.clamp((v - 10) / 40, 0, 1)) : mix(NE, TEAL, this.clamp((v - 50) / 40, 0, 1)));
    const fgFor = (c) => (ratio(c, [255, 255, 255]) >= ratio(c, [20, 20, 19]) ? '#ffffff' : '#141413');
    const moodWord = (v) => (v < 25 ? 'Furious' : v < 40 ? 'Angry' : v < 55 ? 'Meh' : v < 70 ? 'Content' : 'Delighted');
    const costTxt = (c) => c + ' capital';

    const phase = g.phase;
    const tab = ['map', 'desk', 'press', 'scores'].indexOf(st.tab) >= 0 ? st.tab : 'map';
    const title = phase === 'title';
    const showEv = !!st.ev;

    // ---------- vitals ----------
    const prevM = (phase === 'desk' ? g.ds0 : g.ds) || m;
    const ref = title ? { g: 0, j: 4.3, i: 3.0, d: 5.8, a: 48, u: 15 } : prevM;
    const statDef = [
      { k: 'g', label: 'Economy', short: 'ECON', val: sg(m.g, 1) + '%', dd: 1 },
      { k: 'j', label: 'Unemployment', short: 'JOBS', val: m.j.toFixed(1) + '%', dd: 1 },
      { k: 'i', label: 'Inflation', short: 'PRICES', val: m.i.toFixed(1) + '%', dd: 1 },
      { k: 'd', label: 'Deficit / GDP', short: 'DEFICIT', val: m.d.toFixed(1) + '%', dd: 1 },
      { k: 'a', label: 'Approval', short: 'APPR.', val: Math.round(m.a) + '%', dd: 0 },
      { k: 'u', label: 'Unrest', short: 'UNREST', val: String(Math.round(m.u)), dd: 0 }
    ];
    const stats = statDef.map((s, si) => {
      const dv = m[s.k] - ref[s.k];
      const small = Math.abs(dv) < (s.dd ? 0.05 : 0.5);
      const good = dv * GOOD[s.k] > 0;
      return { hasMeter: s.k === 'u', meterPos: Math.min(100, Math.max(0, m.u)).toFixed(0) + '%', tileAnim: small ? '' : 'animation:pop' + ap + ' .45s ease-out both;animation-delay:' + (si * 50) + 'ms;', label: s.label, short: s.short, value: s.val, delta: small ? '' : (dv > 0 ? '▲' : '▼') + Math.abs(dv).toFixed(s.dd), dcls: good ? 'good' : 'bad' };
    });
    const nd = this.needle(g);
    const needleWord = nd < 20 ? 'Command economy' : nd < 40 ? 'More planned' : nd <= 60 ? 'Mixed economy' : nd <= 80 ? 'More market' : 'Laissez-faire';
    const capPips = []; for (let i = 0; i < 8; i++) capPips.push({ cls: i < Math.floor(g.cap) ? 'on' : '' });
    const barColor = (v, goodHigh) => { const x = goodHigh ? v : 100 - v; return x >= 60 ? '#5fd08b' : x >= 35 ? '#ffd166' : '#ff7b72'; };
    const congBar = 'width:' + g.cong.toFixed(0) + '%;background:' + barColor(g.cong, true);
    const scandBar = 'width:' + g.scand.toFixed(0) + '%;background:' + barColor(g.scand, false);
    const dots = [];
    for (let i = 1; i <= 14; i++) {
      const done = i < g.day || (i === g.day && (phase === 'brief' || phase === 'end'));
      const now = i === g.day && !title && !done;
      dots.push({ cls: done ? 'done' : now ? 'now' : '' });
    }
    const imp = g.imp && !g.imp.done ? g.imp : null;

    // ---------- memo ----------
    const mm = phase === 'desk' ? g.memos[g.mi] : null;
    const p = mm ? this.pol(mm.id) : null;
    const planned = p ? p.lean < 0 : false;
    const memosDone = phase === 'desk' && !mm;
    const memoNo = phase === 'desk' ? Math.min(g.mi + 1, Math.max(1, g.memos.length)) : 1;
    const memoDots = g.memos.map((x, i) => ({ cls: x.dec === 'sign' ? 's' : x.dec === 'veto' ? 'v' : i === g.mi ? 'now' : '' }));
    const todayDone = g.memos.filter((x) => x.dec).map((x) => ({ t: (x.dec === 'sign' ? 'Signed: ' : 'Vetoed: ') + this.pol(x.id).t, cls: x.dec === 'sign' ? 's' : 'v' }));
    const leaving = st.leaving || null;
    const decide = (dec) => () => {
      if (this._busy) return;
      const apply = () => { this.act((x) => { x.memos[x.mi].dec = dec; x.log += dec === 'sign' ? 's' : 'v'; x.mi += 1; }); this.setState({ ev: false, leaving: null }); this._busy = false; };
      this._busy = true;
      if (this.noDelay) { apply(); return; }
      this.setState({ leaving: dec });
      setTimeout(apply, 380);
    };
    const nSigned = g.memos.filter((x) => x.dec === 'sign').length;
    const doneTitle = g.memos.length === 0 ? 'A quiet morning.' : nSigned === g.memos.length ? 'Everything signed.' : nSigned === 0 ? 'Everything vetoed.' : 'Memos settled.';
    const doneText = g.xpend ? 'Tonight: "' + this.pol(g.xpend).t + '". When you are ready, end the day and see what the night brings.'
      : g.xToday ? 'You have already used today\'s executive action.' : 'Take an executive action if you dare (one per day), or end the day and see what the night brings.';

    // ---------- executive actions ----------
    const xc = XCATS.some((c) => c[0] === st.xcat) ? st.xcat : 'tax';
    const xcats = XCATS.map((c) => ({ label: c[1], cls: c[0] === xc ? 'on' : '', pick: () => this.setState({ xcat: c[0], xsel: null }) }));
    const TAGS = { tax: ['Taxes', 'nt'], labor: ['Labor', 'nt'], housing: ['Markets', 'nt'], trade: ['Trade', 'nt'], power: ['Dark', 'dk'] };
    const xlean = (x) => (x.cat === 'power' ? ['Power play', 'dk'] : x.lean < 0 ? ['Leans planned', 'pl'] : x.lean > 0 ? ['Leans market', 'fm'] : ['Neutral', 'nt']);
    const xlist = D.XA.map((x, i) => ({ x, i })).filter((o) => o.x.cat === xc).map((o) => {
      const done = g.xdone.indexOf(o.x.id) >= 0 || g.xpend === o.x.id;
      const afford = g.cap >= o.x.cost && !g.xToday;
      const lean = xlean(o.x);
      return { title: o.x.t, tag: lean[0], tagCls: lean[1], cost: costTxt(o.x.cost), cls: (done ? 'done ' : !afford ? 'off ' : '') + (st.xsel === o.x.id ? 'sel' : ''), pick: () => this.setState({ xsel: st.xsel === o.x.id ? null : o.x.id }) };
    });
    const xs = st.xsel ? D.XA.find((x) => x.id === st.xsel) : null;
    const xsIdx = xs ? D.XA.indexOf(xs) : -1;
    let xdet = {};
    if (xs) {
      const lean = xlean(xs);
      const done = g.xdone.indexOf(xs.id) >= 0 || g.xpend === xs.id;
      const reason = done ? 'Already done' : g.xToday ? 'One action per day' : g.cap < xs.cost ? 'Need ' + xs.cost + ' capital' : '';
      const meta = [{ t: 'Costs ' + xs.cost + ' political capital' }];
      meta.push({ t: 'Congress ' + (xs.cong >= 0 ? '+' : '−') + Math.abs(xs.cong) });
      if (xs.scand > 0) meta.push({ t: 'Scandal +' + xs.scand });
      if (xs.dark) meta.push({ t: Math.round(xs.catch * 100) + '% chance of a leak (+15 scandal)' });
      if (xs.shield > 0) meta.push({ t: 'Shields you in an impeachment trial (−' + xs.shield + ')' });
      if (xs.capGain > 0) meta.push({ t: 'Refunds ' + xs.capGain + ' capital tonight' });
      xdet = {
        hasXsel: true, xTitle: xs.t, xTag: lean[0], xTagCls: lean[1], xText: xs.m, xChips: chips(xs.f), xMeta: meta,
        xReal: xs.real, xPro: xs.pro, xCon: xs.con,
        xCancel: () => this.setState({ xsel: null }),
        xConfirmLabel: reason || 'Execute · ' + xs.cost + ' capital', xConfirmCls: reason ? 'off' : 'gold',
        xConfirm: () => { if (reason) return; this.act((x) => { x.log += 'x' + XIDX[xsIdx]; applyAction(this, x, 'x' + XIDX[xsIdx]); }); },
      };
    }
    const xOpen = !!st.xopen;

    // ---------- incident / trial ----------
    const cur = g.inc[0];
    let incShake = false, incKind = '', incTitle = '', incText = '', incReal = '', incOpts = [], incBanner = '';
    if (phase === 'incident' && cur) {
      const mk = (o, i) => ({ anim: 'animation:in' + ap + ' .4s ease-out both;animation-delay:' + (i * 90 + 150) + 'ms;', label: o.label, desc: o.desc, chips: o.f ? chips(o.f) : [], hasCost: !!o.cost, cost: o.cost ? costTxt(o.cost) : '', cls: o.off ? 'off' : '', pick: () => { if (o.off) return; this.act((x) => { x.log += String(i); this.resolveIncident(x, i); }); } });
      if (cur.k === 'event') {
        const E = D.EV[cur.id];
        const nm = D.ST[cur.st][0];
        incKind = E.kind; incTitle = E.title.replace('{st}', nm); incText = E.text.replace('{st}', nm); incReal = E.real;
        incOpts = E.opts.map(mk);
        incBanner = 'color:' + (cur.id === 'boom' ? '#7be0a3' : '#ffd166');
      } else if (cur.k === 'revolt') {
        incKind = 'Crisis · Revolution'; incTitle = 'Revolution at the gates';
        incText = 'The unrest has boiled over. Crowds surround the capital, the guard is wavering, and the helicopter on the lawn has its engine running.';
        incReal = 'Governments facing mass uprisings often survive only when the security forces stay loyal; defections have decided most modern revolutions.';
        const hold = Math.round(this.clamp(0.55 - g.scand / 300, 0.25, 0.65) * 100);
        incOpts = [
          { label: 'Crack down hard', desc: 'About ' + hold + ' in 100 to hold. If the guard changes sides, you are overthrown.', f: [-0.5, 0, 0, 0, -8, -25] },
          { label: 'Concede to the demands', desc: 'Repeal your latest policy and open talks. The crowd goes home.', f: [0, 0, 0, 0.8, 4, -28] },
          { label: 'Flee the country', desc: 'Leave by helicopter before dawn. The term ends now, with a 40% score cut.' },
          { label: 'Buy off the leaders', desc: 'About 70 in 100 to work. Adds 20 scandal. If it fails, the crowd grows.', f: [0, 0, 0.4, 1.5, 0, -22], cost: 3, off: g.cap < 3 }
        ].map(mk);
        incBanner = 'color:#ff9d96'; incShake = true;
      } else {
        const F = D.FAC[cur.fac];
        const pl = cur.pol ? g.pols.find((x) => x.id === cur.pol && !x.rep) : null;
        const pp = pl ? this.pol(pl.id) : null;
        incKind = 'Crisis · ' + F.kind + (cur.esc ? ' · day ' + (cur.esc + 1) : '');
        incTitle = F.name + ' in ' + D.ST[cur.st][0];
        incText = F.text + (pp ? ' The last straw: "' + pp.t + '."' : ' Nobody can agree what set it off.');
        incReal = F.real;
        const chance = Math.round(this.odds(m, cur, R) * 100);
        const back = Math.round(R.back * 100);
        incOpts = [
          pp ? { label: 'Repeal the policy', desc: 'Fastest peace. The policy and its effects are undone.', f: [0, 0, 0, 0, 3, -20] }
             : { label: 'Announce emergency relief', desc: 'Throw money at the problem. Works until the bill arrives.', f: [0, 0, 0, 0.8, 2, -15] },
          { label: 'Broker a compromise', desc: 'About ' + chance + ' in 100 to work. If it does, the policy stays at ~60% strength.', f: [0, 0, 0, 0.3, 2, -12] },
          { label: 'Send in the National Guard', desc: 'Immediate calm, but costly. Backfires about ' + back + ' in 100.', f: [0, 0, 0, 0, -7 * R.cap, -18] },
          { label: 'Wait it out', desc: 'Costs output while it lasts. Fizzles out about half the time.', f: [-0.8, 0, 0, 0, -2, 5] }
        ].map(mk);
        incBanner = 'color:#ff9d96'; incShake = true;
      }
    }
    let trial = {};
    if (phase === 'trial' && g.imp) {
      const lastMemo = g.pols.slice().reverse().find((q) => !q.rep && !q.x);
      const o2 = Math.round((0.65 - g.scand / 400) * 100), o3 = Math.round((0.55 - g.scand / 400) * 100);
      const defs = [
        { label: 'Rally the base', desc: 'A big rally outside the Capitol. Approval up, senators nervous.', need: 1, cost: costTxt(1), tag: 'Clean', tagCls: 'nt' },
        { label: 'Cut deals with senators', desc: lastMemo ? 'Water down "' + this.pol(lastMemo.id).t + '" to about half strength to win votes.' : 'Hand out pork to swing states. Cheap and effective.', need: 0, cost: 'Free', tag: 'Clean', tagCls: 'nt' },
        { label: 'Bribe swing senators', desc: 'About ' + o2 + ' in 100 to work, adds 12 scandal. If it fails, you are exposed.', need: 2, cost: costTxt(2), tag: 'Dark', tagCls: 'dk' },
        { label: 'Leak dirt on swing senators', desc: 'About ' + o3 + ' in 100 to work, adds 15 scandal and costs Congress goodwill. A failure goes public.', need: 1, cost: costTxt(1), tag: 'Dark', tagCls: 'dk' },
      ];
      trial = {
        trialRound: String(Math.min(3, g.imp.r + 1)),
        trialText: 'The House has impeached you. Sixty-seven senators can remove you, and right now the count stands at ' + Math.round(g.imp.conv) + '. You have three nights to move it. Clean methods are slower. Dark methods work more often, but they feed the Scandal meter, and if you survive on dirt the streets may not accept the verdict.',
        convText: String(Math.round(g.imp.conv)), convPct: g.imp.conv.toFixed(0) + '%',
        trialHint: 'Below 67 on the last night and you keep your job. Your allies in the Senate (from power plays) already lowered the starting count.',
        trialOpts: defs.map((d, i) => { const off = g.cap < d.need; return { label: d.label, desc: d.desc, cost: d.cost, tag: d.tag, tagCls: d.tagCls, cls: off ? 'off' : '', pick: () => { if (off) return; this.act((x) => { x.log += String(i); this.resolveTrial(x, i); }); } }; }),
      };
    }

    // ---------- brief ----------
    const newsAll = g.news.slice().sort((a, b) => (a.k === 'inc' ? 0 : 1) - (b.k === 'inc' ? 0 : 1)).slice(0, 5);
    const news = newsAll.map((n, i) => ({ t: n.h, outlet: n.o, open: () => this.setState({ pstory: n.sid }), anim: 'animation:slideIn' + ap + ' .45s ease-out both;animation-delay:' + (i * 140) + 'ms;' }));
    const results = g.todayPol.map((id) => {
      const q = this.pol(id); const pp = g.pols.find((x) => x.id === id);
      const exp = q.f, got = pp.f;
      const worse = got.reduce((a, v, i) => a + (Math.abs(v) > Math.abs(exp[i]) * 1.2 ? 1 : 0), 0);
      const better = got.reduce((a, v, i) => a + (Math.abs(v) < Math.abs(exp[i]) * 0.8 ? 1 : 0), 0);
      return { anim: 'animation:in' + ap + ' .45s ease-out both;animation-delay:' + (news.length * 140 + 100) + 'ms;', title: (pp.x ? 'Executive action: ' : '') + q.t, chips: chips(got), note: worse > better ? 'Came in stronger than expected.' : better > worse ? 'Came in milder than expected.' : 'Close to what was predicted.' };
    });
    const nextLabel = (g.over || g.day >= 14) ? 'See your legacy' : 'Start day ' + (g.day + 1);

    // ---------- end ----------
    let endKicker = '', endTitle = '', endLine = '', recap = [];
    if (phase === 'end') {
      const nn = this.needle(g);
      endKicker = g.over ? 'YOUR TERM ENDED EARLY' : 'YOUR 14 DAYS ARE UP';
      if (g.ok === 'impeach') { endTitle = 'Removed by the Senate'; endLine = 'Sixty-seven senators agreed on something. Historians will frame it.'; }
      else if (g.ok === 'coup') { endTitle = 'Overthrown by Lunchtime'; endLine = 'The crowd is in the Oval Office. Someone is sitting in your chair and, to be fair, looks great in it.'; }
      else if (g.ok === 'fled') { endTitle = 'Last Helicopter Out'; endLine = 'You left before dawn. The country noticed by lunch.'; }
      else if (m.u >= 70) { endTitle = 'Besieged Executive'; endLine = 'You finished the term, but the capital looks like a movie set. Get a helicopter ready.'; }
      else if (g.scand >= 60) { endTitle = 'Teflon President'; endLine = 'Nothing stuck, mostly because nobody could find a pen that works. The ledger will be an interesting read.'; }
      else if (m.a < 30) { endTitle = 'Beloved by No One'; endLine = 'Few people love you. Fewer people like you. The data is not very kind.'; }
      else if (nn < 35) { if (m.g > -1 && m.a >= 45) { endTitle = 'Comrade Commissioner of Mostly Working'; endLine = 'A heavily planned economy that, against the odds, held together for two weeks.'; } else { endTitle = 'Five-Year Plan, Fourteen-Day Collapse'; endLine = 'The plan was ambitious. The spreadsheet was not.'; } }
      else if (nn > 65) { if (m.g > 0 && m.a >= 45) { endTitle = 'Invisible-Hand Emperor'; endLine = 'The market did the work. You got the credit and the photo ops.'; } else { endTitle = 'Laissez-Faire, Laissez-Fall'; endLine = 'The market was left to its own devices. Its devices were not great.'; } }
      else if (m.a >= 55 && m.u < 35) { endTitle = 'The Pragmatist'; endLine = 'A bit of everything, a lot of trade-offs. Everyone is mildly annoyed, which is the economist\'s definition of balance.'; }
      else { endTitle = 'Muddling Through'; endLine = 'Nobody is thrilled and the economy survived. That is a presidency.'; }
      if (g.surv && !g.over) endLine += ' You also survived an impeachment trial.';
      recap = g.pols.map((pp) => {
        const q = this.pol(pp.id);
        const when = pp.x ? 'Executive action, day ' + pp.d : 'Signed day ' + pp.d;
        return { title: q.t, status: pp.rep ? when + ', repealed' : pp.s < 1 ? when + ', compromised' : when, real: q.real };
      });
      if (!recap.length) recap = [{ title: 'You signed nothing.', status: '', real: 'Gridlock is also a policy. The economy kept doing its thing, with a little help from the weather.' }];
    }

    // ---------- score, grades, leaderboard ----------
    const gradeColor = { A: '#7be0a3', B: '#8fd3c7', C: '#ffd166', D: '#f4a874', F: '#ff9d96' };
    const board = st.board || [];
    const lbRows = board.map((e) => ({ rank: String(e.rank), name: e.handle + (e.tag ? ' [' + e.tag + ']' : ''), score: String(e.score), c: e.cons_letter || '-', l: e.lib_letter || '-', cls: e.is_me ? 'me' : '' }));
    const sortedRows = (st.rankBoard || []).slice();
    let kormRes = null, sc = null, gC = null, gL = null, scoreRows = [], scoreText = '', rankText = '', celebrate = false, confetti = [], celebrateLine = '', scoreExplain = '';
    if (phase === 'end') {
      sc = this.scoreCard(g);
      const gc = this.grade(sc.cons), gl = this.grade(sc.lib);
      const qi = (sc.score + g.title.length) % 2;
      gC = { letter: gc.letter, color: gradeColor[gc.band], quip: D.QUIPS.C[gc.band][qi], pct: Math.round(sc.cons) };
      gL = { letter: gl.letter, color: gradeColor[gl.band], quip: D.QUIPS.L[gl.band][qi], pct: Math.round(sc.lib) };
      const pj = sc.pj;
      const rowDef = [
        ['Economy', sg(m.g, 1) + '% → ' + sg(pj.g, 1) + '% GDP', sc.sub.econ, '25%'],
        ['Jobs', m.j.toFixed(1) + '% → ' + pj.j.toFixed(1) + '% unemployed', sc.sub.jobs, '20%'],
        ['Prices', m.i.toFixed(1) + '% → ' + pj.i.toFixed(1) + '% inflation', sc.sub.prices, '15%'],
        ['Debt path', m.d.toFixed(1) + '% → ' + pj.d.toFixed(1) + '% deficit', sc.sub.budget, '15%'],
        ['Approval', Math.round(m.a) + '% → ' + Math.round(pj.a) + '%', sc.sub.appr, '15%'],
        ['Calm', 'unrest ' + Math.round(m.u) + ' → ' + Math.round(pj.u), sc.sub.calm, '10%']];
      scoreRows = rowDef.map((r) => ({ label: r[0], value: 'Now → where it is headed: ' + r[1], weight: r[3], pts: Math.round(r[2]) + '/100', barStyle: 'height:100%;border-radius:4px;width:' + Math.round(r[2]) + '%;background:' + (r[2] >= 66 ? '#5fd08b' : r[2] >= 40 ? '#ffd166' : '#ff7b72') }));
      scoreText = String(sc.score);
      scoreExplain = 'Each meter counts 40% for where the country stands now and 60% for where it is headed once everything you did fully lands (the legacy projection). Score = 200 plus 16 points for every point your weighted average (0-100) sits above 35, plus 50 for finishing the term and 40 for surviving an impeachment. Scandal above 20 costs 0.8 points each' + (sc.pen ? ' (−' + sc.pen + ' for you)' : '') + '. Being removed, overthrown or fleeing cuts the total by 40%. Grades use the same meters with each side\'s own priorities.';
      const kormWin = g.mode === 'korm' && !g.over && this.needle(g) >= KORM.needle && gc.band === KORM.band;
      kormRes = g.mode === 'korm' ? { win: kormWin, needleOk: this.needle(g) >= KORM.needle, gradeOk: gc.band === KORM.band, finished: !g.over, nd: Math.round(this.needle(g)), gl: gc.letter } : null;
      const better = sortedRows.filter((e) => e.score > sc.score).length;
      rankText = g.mode === 'korm' ? 'Challenge run: unranked, nothing is posted.' : !st.rankBoard ? (api.configured ? '' : 'Offline preview: the online board is not configured.') : sortedRows.length ? 'This score would rank #' + (better + 1) + ' of ' + (sortedRows.length + 1) + (g.mode === 'daily' ? ' on today\'s Daily board.' : ' on the all-time board.') : 'First score on the board. Lonely at the top.';
      celebrate = !g.over && m.a >= 40;
      celebrateLine = celebrate ? 'You made it through all 14 days.' : (g.over ? 'The confetti is mostly shredded paper.' : 'You survived, but nobody is throwing a parade.');
      const pal = celebrate ? ['#ffd166', '#5fd08b', '#8fc0f2', '#ff7b72', '#f4a874', '#eef1f6'] : ['#8794a8', '#5b6b82', '#a9b9d0', '#c0392b'];
      const fr = (i, k) => { const x = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
      for (let i = 0; i < (celebrate ? 56 : 28); i++) {
        const w = 6 + Math.round(fr(i, 1) * 8);
        confetti.push({ style: 'position:absolute;top:-24px;left:' + (fr(i, 2) * 100).toFixed(1) + '%;width:' + w + 'px;height:' + Math.round(w * (0.5 + fr(i, 3))) + 'px;background:' + pal[i % pal.length] + ';border-radius:' + (fr(i, 4) > 0.6 ? '50%' : '2px') + ';opacity:0;animation:fall' + ap + ' ' + (2.8 + fr(i, 5) * 2.4).toFixed(2) + 's ease-in ' + (fr(i, 6) * 1.6).toFixed(2) + 's both' });
      }
    }

    // ---------- press ----------
    const pressList = g.press.map((s) => ({ day: String(s.day), outlet: s.o, t: s.h, open: () => this.setState({ pstory: s.sid }) }));
    const edStory = g.press.find((s) => s.ed);
    let oped = {};
    if (edStory) {
      const pick = (arr, n) => arr[n % arr.length];
      const L = edStory.ed.find((e) => e.s === 'L'), Rr = edStory.ed.find((e) => e.s === 'R');
      oped = { hasOped: true, opedTitle: edStory.t, opedL: { outlet: pick(D.OUT.L, edStory.sid), by: L.by, org: L.org, q: L.q }, opedR: { outlet: pick(D.OUT.R, edStory.sid + 1), by: Rr.by, org: Rr.org, q: Rr.q }, opedReal: this.pol(edStory.pid).real };
    }
    const storyN = st.pstory != null ? g.press.find((s) => s.sid === st.pstory) : null;
    const storyParas = storyN ? storyN.b.map((t) => ({ t: t })) : [];

    // ---------- map ----------
    const abbrs = Object.keys(D.ST);
    const moods = {}; abbrs.forEach((a) => { moods[a] = this.mood(g, a, m); });
    const flashSt = {}; g.flash.forEach((f) => { flashSt[f.st] = true; });
    const sel = st.sel || (g.flash[0] && g.flash[0].st) || 'TX';
    const mf = {}, ml = {}, mp = {};
    abbrs.forEach((a) => {
      const c = moodColor(moods[a]);
      const hot = a === sel || flashSt[a];
      mf[a] = 'transition:fill .7s ease,stroke .3s;fill:' + hex(c) + ';stroke:' + (hot ? '#ffd166' : '#0f1b2d') + ';stroke-width:' + (hot ? 3 : 1.5) + ';cursor:pointer';
      ml[a] = 'fill:' + fgFor(c) + ";font-size:11px;font-weight:700;pointer-events:none;font-family:'Space Mono',monospace";
      mp[a] = () => this.setState({ sel: a });
    });
    const reasons = [];
    g.hits.forEach((h) => {
      const n = this.nights(g, h.d); if (n <= 0 || !h.v || h.st.indexOf(sel) < 0) return;
      const r = h.v * Math.pow(0.75, n - 1);
      if (Math.abs(r) >= 1) reasons.push({ r: r, t: h.l, v: sg(r, 0), style: 'font-weight:700;font-size:12px;color:' + (r > 0 ? '#7be0a3' : '#ff9d96') });
    });
    reasons.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
    const ranked = abbrs.slice().sort((a, b) => moods[a] - moods[b]);
    const mk = (a) => ({ name: D.ST[a][0], value: Math.round(moods[a]) + '%', pick: () => this.setState({ sel: a }) });
    const selMood = moods[sel];

    // morning briefing card
    const night = g.press.filter((s) => s.day === g.day - 1).slice(0, 3).map((s) => ({ outlet: s.o, t: s.h, open: () => this.setState({ pstory: s.sid }) }));
    const alerts = [];
    if (g.imp && !g.imp.done) alerts.push({ cls: 'r', t: g.imp.st === 'warn' ? 'Impeachment: the House has drafted articles. The Senate trial starts tonight.' : 'Impeachment trial under way: ' + Math.round(g.imp.conv) + ' of 67 senators lean to convict.' });
    if (g.carry.length) alerts.push({ cls: 'r', t: 'A crisis is still unresolved in ' + D.ST[g.carry[0].st][0] + '.' });
    if (g.scand >= 40) alerts.push({ cls: 'y', t: 'Scandal is running hot. Reporters are circling.' });
    if (g.cong < 25 && !(g.imp && !g.imp.done)) alerts.push({ cls: 'y', t: 'Congress is losing patience. Low approval plus low support can trigger impeachment.' });
    const inDesk = phase === 'desk';
    const mb = {
      mbKicker: title ? 'READY' : 'DAY ' + Math.min(14, g.day) + ' · ' + (inDesk ? 'MORNING BRIEFING' : 'DECISION WAITING'),
      mbTitle: g.day === 1 && inDesk ? 'Welcome to the Oval Office.' : inDesk ? 'Good morning, Mr. President.' : phase === 'end' ? 'Your term is over.' : 'Your attention is needed.',
      mbText: inDesk ? (night.length ? 'Here is what the papers printed overnight. Then head to your Desk: ' + g.memos.length + ' memos wait, plus one executive action if you want it.' : 'The map shows how every state feels. ' + g.memos.length + ' memos wait at your Desk.') : 'Something is waiting at your Desk.',
      mbAlerts: alerts, mbNews: night,
      mbButton: inDesk ? 'Go to your Desk' : phase === 'end' ? 'See your legacy' : 'Go to your Desk',
    };
    const pending = !title && phase !== 'end' && tab !== 'desk';
    const coach = this.coachVals(g, phase);

    return {
      _share: { title: endTitle, score: sc ? sc.score : 0, cons: gC ? gC.letter : '', lib: gL ? gL.letter : '', role: g.title, needle: this.needle(g), mode: g.mode, dd: g.dd, kwin: !!(kormRes && kormRes.win) },
      dayLabel: title ? 'READY' : 'DAY ' + Math.min(14, g.day) + ' / 14',
      dots: dots, stats: stats,
      capText: Math.floor(g.cap) + ' / 8', capPips: capPips, congText: String(Math.round(g.cong)), congBar: congBar, scandText: String(Math.round(g.scand)), scandBar: scandBar,
      needleWord: needleWord, needleSub: (nd >= 50 ? '+' : '−') + Math.abs(Math.round(nd - 50)), needleLeft: 'left:' + nd.toFixed(1) + '%',
      hasImp: !!imp, impTitle: imp ? (imp.st === 'warn' ? 'IMPEACHMENT: ARTICLES DRAFTED' : 'IMPEACHMENT TRIAL · NIGHT ' + Math.min(3, imp.r + 1) + ' OF 3') : '',
      impText: imp ? (imp.st === 'warn' ? 'The Senate vote comes soon. You can still move votes with your Desk actions.' : 'Senators leaning to convict: ' + Math.round(imp.conv) + '. Removal at 67.') : '',
      impPct: imp ? imp.conv.toFixed(0) + '%' : '0%',
      tabMapCls: tab === 'map' ? 'on' : '', tabDeskCls: tab === 'desk' ? 'on' : '', tabPressCls: tab === 'press' ? 'on' : '', tabScoresCls: tab === 'scores' ? 'on' : '',
      goMap: () => this.setState({ tab: 'map' }),
      goDesk: () => { const p0 = { tab: 'desk' }; if (st.tut === 0) p0.tut = 1; this.setState(p0); },
      goPress: () => this.setState({ tab: 'press' }),
      goScores: () => { this.setState({ tab: 'scores' }); this.loadBoard(); },
      deskPing: pending,
      showTitle: title && tab !== 'scores', showMap: !title && tab === 'map', showDesk: !title && tab === 'desk', showPress: !title && tab === 'press', showScores: tab === 'scores',
      isDesk: phase === 'desk', isIncident: phase === 'incident', isTrial: phase === 'trial', isBrief: phase === 'brief', isEnd: phase === 'end',
      ...this.modeVals(g),
      begin: () => this.act((x) => { x.phase = 'desk'; x.day = 1; x.ds = this.M(x); x.ds0 = x.ds; this.deal(x); }),
      ...mb, ...coach, mapNote: title ? 'Everyone starts meh' : 'Tap a state. Gold outline = news there.',
      hasMemo: !!mm, memosDone: memosDone, doneTitle: doneTitle, doneText: doneText,
      memoNo: String(memoNo), memoTotal: String(g.memos.length), memoDots: memoDots, todayDone: todayDone, hasToday: todayDone.length > 0,
      memoTitle: p ? p.t : '', memoText: p ? p.m : '',
      memoLeanLabel: planned ? 'Leans planned' : 'Leans free market', memoLeanCls: planned ? 'pl' : 'fm',
      memoChips: p ? chips(this.scaled(g, p.f)).map((c) => Object.assign(c, { big: true })) : [],
      congNote: 'Congress support ' + Math.round(g.cong) + ' ' + (g.cong >= 50 ? 'helps' : 'trims') + ' the effect.',
      memoCardAnim: leaving ? 'animation:out' + (leaving === 'sign' ? 'Sign' : 'Veto') + ' .38s ease-in forwards;' : 'animation:in' + ap + ' .45s ease-out both;',
      leaving: !!leaving, stampText: leaving === 'sign' ? 'SIGNED' : 'VETOED', stampCls: leaving === 'sign' ? 's' : 'v',
      memoUnc: p ? (p.sd < 0.4 ? 'low' : p.sd < 0.7 ? 'medium' : 'high') : '',
      memoReal: p ? p.real : '', memoPro: p ? p.pro : '', memoCon: p ? p.con : '',
      showEv: showEv, evLabel: showEv ? 'Hide the evidence' : 'See the evidence', toggleEv: () => this.setState({ ev: !showEv }),
      sign: decide('sign'), veto: decide('veto'),
      endDay: () => this.act((x) => { x.log += 'e'; this.endDay(x); }),
      xSub: g.xToday ? 'Used for today. Capital refills +1 each morning.' : 'One per day · ' + Math.floor(g.cap) + ' capital to spend',
      xToggleLabel: xOpen ? 'Hide' : 'Open', toggleX: () => this.setState({ xopen: !xOpen }), xOpenCls: xOpen ? 'open' : '',
      hasQueued: !!g.xpend, queuedText: g.xpend ? 'Queued for tonight: ' + this.pol(g.xpend).t : '',
      xCats: xcats, xList: xlist, hasXsel: false, ...xdet,
      incKind, incTitle, incText, incReal, incOpts, incBanner, incTitleAnim: incShake ? 'animation:shakeX .55s ease-out;' : '', ...trial,
      news, results, hasResults: results.length > 0,
      nextMorning: () => { this.setState({ pstory: null }); this.act((x) => { x.log += 'n'; this.nextMorning(x); }); },
      nextLabel, endKicker, endTitle, endLine, recap,
      again: () => this.setState({ tab: 'map', pstory: null, submitted: false, lbMsg: '', lbErr: '', shareMsg: '', g: this.makeGame(st.mode || 'free', g.title) }),
      hasStory: !!storyN, storyOutlet: storyN ? storyN.o : '', storyHead: storyN ? storyN.h : '', storyParas, closeStory: () => this.setState({ pstory: null }),
      pressList, noPress: pressList.length === 0, ...oped,
      hasKormRes: !!kormRes, kormWin: !!(kormRes && kormRes.win), kormLose: !!(kormRes && !kormRes.win),
      kormTitle: kormRes ? (kormRes.win ? 'KORMANIK CHALLENGE: COMPLETE' : 'KORMANIK CHALLENGE: NOT YET') : '',
      kormLines: kormRes ? [
        { ok: kormRes.needleOk, cls: kormRes.needleOk ? 'kok' : 'kno', t: 'Very right wing: country at ' + kormRes.nd + ' on the dial (need ' + KORM.needle + ')' },
        { ok: kormRes.gradeOk, cls: kormRes.gradeOk ? 'kok' : 'kno', t: 'An A from conservatives: you got ' + kormRes.gl },
        { ok: kormRes.finished, cls: kormRes.finished ? 'kok' : 'kno', t: kormRes.finished ? 'Finished the term in one piece' : 'Did not finish the term' },
      ] : [],
      kormQuote: kormRes ? (kormRes.win ? '"He is very right." Tell Kormanik he was right all along.' : kormRes.needleOk ? 'Far enough right, but conservatives want results too: budget, prices, economy.' : 'Not right-wing enough yet. Sign the free-market memos and veto the planned-economy ones.') : '',
      scoreText, rankText, gC: gC || {}, gL: gL || {}, scoreRows, scoreExplain, confetti, hasConfetti: confetti.length > 0 && tab === 'desk', celebrateLine,
      ...this.accountVals(g, sc),
      ...this.boardVals(lbRows),
      mf, ml, mp,
      selName: D.ST[sel][0], selReal: D.ST[sel][1], selMood: Math.round(selMood) + '%', selWord: moodWord(selMood),
      selBarStyle: 'transition:width .6s ease,background .6s;height:100%;border-radius:5px;width:' + selMood.toFixed(0) + '%;background:' + hex(moodColor(selMood)),
      reasons: reasons.slice(0, 4), hasReasons: reasons.length > 0, noReasons: reasons.length === 0,
      angriest: ranked.slice(0, 3).map(mk), happiest: ranked.slice(-3).reverse().map(mk),
    };
  }
}
