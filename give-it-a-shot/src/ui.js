import { Engine, dailySeed, utcDate } from './engine.js';
import * as api from './api.js';
import { shareCard } from './share.js';

const HOME_TAG = 'UATX';
const PENDING_KEY = 'gias_pending_v1';
const HANDLE_RE = /^[A-Za-z0-9_]{3,16}$/;
const TAG_RE = /^[A-Za-z0-9]{2,8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const lsGet = (k) => { try { return window.localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { window.localStorage.setItem(k, v); } catch (e) { /* storage may be blocked */ } };
const lsDel = (k) => { try { window.localStorage.removeItem(k); } catch (e) { /* ignore */ } };

export class App extends Engine {
  constructor(rerender) {
    super();
    this._rerender = rerender;
    this.state = { mode: 'free', tab: 'office', boardMode: 'daily', boardTag: null, user: null, profile: null, streak: null, authStep: 'email' };
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
    this.setState({ g: g });
    if (g.phase === 'end' && cur.phase !== 'end') this.onGameEnd(g);
  }
  async onGameEnd(g) {
    this.setState({ rankBoard: null, submitted: false, lbMsg: '', lbErr: '', shareMsg: '' });
    if (!api.configured) return;
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
      await api.createProfile(st.user.id, handle, tag);
      this.setState({ sending: false, profile: { handle: handle, tag: tag || null }, authOpen: false });
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
    const label = s.mode === 'daily' ? 'Daily Executive · ' + s.dd : 'Free Play · 14 days in office';
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
    const btn = (on) => 'display:flex;flex-direction:column;gap:5px;align-items:flex-start;text-align:left;padding:13px 15px;border-radius:12px;cursor:pointer;color:#eef1f6;transition:border-color .2s,background .2s,transform .15s;border:' + (on ? '2px solid #ffd166;background:#1d3658' : '2px solid #24405f;background:#112238');
    const sk = st.streak && st.streak.current_streak > 0 ? ' Streak: ' + st.streak.current_streak + '.' : '';
    return {
      pickFree: () => { if ((st.mode || 'free') !== 'free') this.setState({ mode: 'free', g: this.makeGame('free', g.title) }); },
      pickDaily: () => { if (!daily) this.setState({ mode: 'daily', g: this.makeGame('daily', g.title) }); },
      modeFreeStyle: btn(!daily), modeDailyStyle: btn(daily),
      dailyLine: 'Same seed for everyone on ' + utcDate() + '. One scored run a day.' + (played ? ' You already played today.' : '') + sk,
      beginLabel: daily ? 'Begin today\'s Daily Executive' : 'Begin Day 1',
    };
  }
  accountVals(g, sc, gC, gL, m) {
    const st = this.state; const user = st.user, profile = st.profile;
    const posted = !!st.submitted;
    const daily = g.mode === 'daily';
    const playedToday = daily && !!(st.streak && st.streak.played_today) && !posted;
    const signedUp = !!(user && profile);
    const canPost = !!sc && !playedToday;
    const ready = signedUp && canPost && !posted;
    const tabBtn = (on) => 'height:38px;padding:0 16px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;' + (on ? 'border:0;background:#eef1f6;color:#0f1b2d' : 'border:1px solid #3a5a82;background:transparent;color:#eef1f6');
    const step = st.authStep;
    const email = (st.authEmail || '').trim();
    const titles = { email: 'Sign in to post scores', sent: 'Check your email', handle: 'Pick your handle', account: profile ? '@' + profile.handle : 'Account' };
    const texts = {
      email: 'Play without an account any time. An account lets you post to the leaderboard and keep a Daily Executive streak. We email you a sign-in link, no password.',
      sent: 'We sent a sign-in link to ' + email + '. Open it in this browser; you will land back here with your result waiting. It can take a minute, and it may land in spam.',
      handle: 'This is the name shown on the leaderboard, and it cannot be changed later. Offensive handles are blocked. A group tag such as ' + HOME_TAG + ' is optional and lets you appear on that group\'s board.',
      account: 'You are signed in' + (profile && profile.tag ? ' with group tag ' + profile.tag : '') + '.',
    };
    const sendReady = EMAIL_RE.test(email) && !st.sending;
    const saveReady = HANDLE_RE.test((st.authHandle || '').trim()) && !st.sending;
    const boardTabs = [{ label: 'Today\'s Daily', on: st.boardMode === 'daily', mode: 'daily' }, { label: 'All-time (Free Play)', on: st.boardMode !== 'daily', mode: 'all' }]
      .map((b) => ({ label: b.label, style: tabBtn(b.on), pick: () => { this.setState({ boardMode: b.mode }); this.loadBoard(); } }));
    const tagTabs = [{ label: 'Everyone', tag: null }, { label: HOME_TAG + ' only', tag: HOME_TAG }]
      .map((b) => ({ label: b.label, style: tabBtn(st.boardTag === b.tag), pick: () => { this.setState({ boardTag: b.tag }); this.loadBoard(); } }));
    const sk = st.streak;
    this._boardInfo = { boardTabs: boardTabs, tagTabs: tagTabs };
    return {
      authClick: () => this.openAuth(),
      authLabel: signedUp ? '@' + profile.handle : user ? 'Pick a handle' : api.configured ? 'Sign in' : 'Offline',
      authStyle: 'height:38px;padding:0 16px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;border:1px solid #3a5a82;background:' + (signedUp ? '#1d3658' : 'transparent') + ';color:#eef1f6;max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap',
      postTitle: daily ? 'POST TO TODAY\'S DAILY BOARD' : 'PUT IT ON THE LEADERBOARD',
      showSignIn: !posted && !signedUp && api.configured && canPost,
      signInPitch: user ? 'Pick a handle to post this run.' : daily ? 'Sign in to post today\'s run and keep your streak.' : 'Sign in to post this run to the leaderboard.',
      signInLabel: user ? 'Pick a handle' : 'Sign in to post',
      showPost: ready, postHandle: profile ? '@' + profile.handle + (profile.tag ? ' [' + profile.tag + ']' : '') : '',
      submit: () => this.postScore(g, sc),
      submitLabel: st.posting ? 'Posting...' : 'Post score',
      submitStyle: 'height:48px;border-radius:12px;border:0;font-size:15px;font-weight:700;padding:0 22px;' + (st.posting ? 'background:#24405f;color:#7f93ad;cursor:default' : 'background:#ffd166;color:#1a1300;cursor:pointer'),
      showPosted: posted, lbMsg: st.lbMsg || '',
      lbErr: st.lbErr || (playedToday ? 'You already posted today\'s Daily Executive. Come back tomorrow for a new seed.' : '') || (!api.configured ? 'Offline preview: the online board is not configured.' : ''),
      share: () => this.doShare(), shareLabel: st.shareMsg || 'Share your result',
      hasAuth: !!st.authOpen, closeAuth: () => this.setState({ authOpen: false }),
      authTitle: titles[step] || '', authText: texts[step] || '',
      authStepEmail: step === 'email', authStepSent: step === 'sent', authStepHandle: step === 'handle', authStepAccount: step === 'account',
      authEmail: st.authEmail || '', onEmail: (e) => this.setState({ authEmail: e.target.value }),
      authHandle: st.authHandle || '', onHandle: (e) => this.setState({ authHandle: e.target.value.replace(/[^A-Za-z0-9_]/g, '').slice(0, 16) }),
      authTag: st.authTag || '', onTag: (e) => this.setState({ authTag: e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 8) }),
      authSend: () => this.authSend(), authSendLabel: st.sending ? 'Sending...' : 'Email me a sign-in link',
      authSendStyle: 'height:48px;border-radius:12px;border:0;font-size:15px;font-weight:700;' + (sendReady ? 'background:#ffd166;color:#1a1300;cursor:pointer' : 'background:#24405f;color:#7f93ad;cursor:default'),
      authGoogle: () => this.authGoogle(), googleOn: api.googleEnabled,
      authBack: () => this.setState({ authStep: 'email', authErr: '' }),
      authSave: () => this.authSave(), authSaveStyle: 'height:48px;border-radius:12px;border:0;font-size:15px;font-weight:700;' + (saveReady ? 'background:#ffd166;color:#1a1300;cursor:pointer' : 'background:#24405f;color:#7f93ad;cursor:default'),
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
      lbNote: st.boardMode === 'daily' ? 'Daily Executive for ' + utcDate() + ' (UTC). Everyone plays the same seed. Scores are replayed and verified by the server.' : 'Each player\'s best Free Play score. Scores are replayed and verified by the server.',
      boardTabs: b.boardTabs, tagTabs: b.tagTabs,
    };
  }

  getValues() { const v = this.renderVals(); this._share = v._share; return v; }

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
    const chip = (v, k, big, idx) => {
      const good = v * GOOD[k] > 0;
 return { t: NAME[k] + ' ' + sg(v, DEC[k]) + UNIT[k], style: 'animation:pop' + ap + ' .35s ease-out both;animation-delay:' + ((idx || 0) * 70 + 120) + "ms;display:inline-block;padding:" + (big ? '5px 12px' : '2px 8px') + ";border-radius:999px;font-family:'Space Mono',monospace;font-size:" + (big ? '13.5px' : '11.5px') + ";" + (good ? 'background:rgba(95,208,139,.16);color:#7be0a3' : 'background:rgba(255,123,114,.16);color:#ff9d96') };
    };
    const chips = (f, big) => D.KEYS.map((k, i) => (Math.abs(f[i]) >= MIN[k] ? [f[i], k] : null)).filter((x) => x).map((x, i) => chip(x[0], x[1], big, i));
    const enter = 'animation:in' + ap + ' .45s ease-out both;';
    const mix = (a, b, f) => a.map((x, i) => Math.round(x + (b[i] - x) * f));
    const hex = (c) => '#' + c.map((x) => x.toString(16).padStart(2, '0')).join('');
    const lin = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
    const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const RED = [192, 57, 43], NE = [236, 230, 214], TEAL = [42, 157, 143];
    const moodColor = (v) => (v < 50 ? mix(RED, NE, this.clamp((v - 10) / 40, 0, 1)) : mix(NE, TEAL, this.clamp((v - 50) / 40, 0, 1)));
    const fgFor = (c) => (ratio(c, [255, 255, 255]) >= ratio(c, [20, 20, 19]) ? '#ffffff' : '#141413');
    const moodWord = (v) => (v < 25 ? 'Furious' : v < 40 ? 'Angry' : v < 55 ? 'Meh' : v < 70 ? 'Content' : 'Delighted');

    const phase = g.phase;
    const tab = st.tab === 'map' ? 'map' : st.tab === 'scores' ? 'scores' : 'office';
    const showEv = !!st.ev;

    // stats
    const prevM = (phase === 'desk' ? g.ds0 : g.ds) || m;
    const ref = phase === 'title' ? { g: 0, j: 4.3, i: 3.0, d: 5.8, a: 48, u: 15 } : prevM;
    const statDef = [
      { k: 'g', label: 'Economy', val: sg(m.g, 1) + '%', dd: 1 },
      { k: 'j', label: 'Unemployment', val: m.j.toFixed(1) + '%', dd: 1 },
      { k: 'i', label: 'Inflation', val: m.i.toFixed(1) + '%', dd: 1 },
      { k: 'd', label: 'Deficit / GDP', val: m.d.toFixed(1) + '%', dd: 1 },
      { k: 'a', label: 'Approval', val: Math.round(m.a) + '%', dd: 0 },
      { k: 'u', label: 'Unrest', val: String(Math.round(m.u)), dd: 0 }
    ];
    const stats = statDef.map((s, si) => {
      const dv = m[s.k] - ref[s.k];
      const small = Math.abs(dv) < (s.dd ? 0.05 : 0.5);
      const good = dv * GOOD[s.k] > 0;
      return { hasMeter: s.k === 'u', meterPos: Math.min(100, Math.max(0, m.u)).toFixed(0) + '%', meterWord: m.u < 35 ? 'Calm' : m.u < 70 ? 'Tense' : 'Explosive', meterWordStyle: 'font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:' + (m.u < 35 ? '#7be0a3' : m.u < 70 ? '#ffd166' : '#ff9d96'), tileAnim: small ? '' : 'animation:pop' + ap + ' .45s ease-out both;animation-delay:' + (si * 50) + 'ms;', label: s.label, value: s.val, delta: small ? '' : (dv > 0 ? '▲' : '▼') + Math.abs(dv).toFixed(s.dd), deltaStyle: "font-family:'Space Mono',monospace;font-size:12px;font-weight:700;color:" + (good ? '#7be0a3' : '#ff9d96') };
    });
    const nd = this.needle(g);
    const needleWord = nd < 20 ? 'Command economy' : nd < 40 ? 'More planned' : nd <= 60 ? 'Mixed economy' : nd <= 80 ? 'More market' : 'Laissez-faire';
    const needleStyle = 'position:absolute;top:0;left:' + nd.toFixed(1) + '%;margin-left:-3px;transition:left .5s';

    const dots = [];
    for (let i = 1; i <= 14; i++) {
      const done = i < g.day || (i === g.day && (phase === 'brief' || phase === 'end'));
      const now = i === g.day && phase !== 'title' && !done;
      dots.push({ style: 'width:10px;height:10px;border-radius:50%;box-sizing:border-box;' + (done ? 'background:#eef1f6' : now ? 'background:#ffd166;animation:pulse 1.6s infinite' : 'border:2px solid #3a5a82') + ';transition:background .4s' });
    }

    // tabs
    const tabBase = "height:38px;padding:0 18px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;";
    const tabOfficeStyle = tabBase + (tab === 'office' ? 'border:0;background:#eef1f6;color:#0f1b2d' : 'border:1px solid #3a5a82;background:transparent;color:#eef1f6');
    const tabMapStyle = tabBase + (tab === 'map' ? 'border:0;background:#eef1f6;color:#0f1b2d' : 'border:1px solid #3a5a82;background:transparent;color:#eef1f6');
    const tabScoresStyle = tabBase + (tab === 'scores' ? 'border:0;background:#eef1f6;color:#0f1b2d' : 'border:1px solid #3a5a82;background:transparent;color:#eef1f6');
    const officeLabel = 'Oval Office' + (phase === 'incident' ? ' ●' : '');

    // titles
    const titles = D.TITLES.map((t) => ({ label: t.label, tag: t.tag, perks: t.perks.map((x) => ({ t: x })), flaws: t.flaws.map((x) => ({ t: x })), pick: () => this.act((x) => { x.title = t.id; }),
      style: 'display:flex;flex-direction:column;gap:7px;align-items:flex-start;text-align:left;padding:13px 15px;border-radius:12px;cursor:pointer;color:#eef1f6;transition:border-color .2s,background .2s,transform .15s;border:' + (g.title === t.id ? '2px solid #ffd166;background:#1d3658' : '2px solid #24405f;background:#112238') }));
    const roleT = D.TITLES.find((x) => x.id === g.title) || D.TITLES[0];
    const roleLine = roleT.label + ': ' + roleT.perks[0].replace(/\.$/, '') + '. Downside: ' + roleT.flaws[0].charAt(0).toLowerCase() + roleT.flaws[0].slice(1).replace(/\.$/, '') + '.';

    // current memo (one at a time)
    const mm = phase === 'desk' ? g.memos[g.mi] : null;
    const p = mm ? this.pol(mm.id) : null;
    const planned = p ? p.lean < 0 : false;
    const quiet = phase === 'desk' && !mm;
    const memoNo = phase === 'desk' ? Math.min(g.mi + 1, Math.max(1, g.memos.length)) : 1;
    const memoDots = g.memos.map((x, i) => ({ style: 'width:34px;height:6px;border-radius:3px;background:' + (x.dec === 'sign' ? '#5fd08b' : x.dec === 'veto' ? '#8794a8' : i === g.mi ? '#ffd166' : '#24405f') }));
    const todayDone = g.memos.filter((x) => x.dec).map((x) => ({ t: (x.dec === 'sign' ? 'Signed: ' : 'Vetoed: ') + this.pol(x.id).t, style: 'font-size:12.5px;padding:5px 10px;border-radius:8px;background:#112238;color:' + (x.dec === 'sign' ? '#7be0a3' : '#a9b9d0') }));
    const leaving = st.leaving || null;
    const decide = (dec) => () => {
      if (this._busy) return;
      const apply = () => { this.act((x) => { x.memos[x.mi].dec = dec; x.log += dec === 'sign' ? 's' : 'v'; x.mi += 1; if (x.mi >= x.memos.length) this.endDay(x); }); this.setState({ ev: false, leaving: null }); this._busy = false; };
      this._busy = true;
      if (this.noDelay) { apply(); return; }
      this.setState({ leaving: dec });
      setTimeout(apply, 380);
    };

    // incident
    const cur = g.inc[0];
    let incShake = false, incKind = '', incTitle = '', incText = '', incReal = '', incOpts = [], incBanner = '';
    if (phase === 'incident' && cur) {
      const mkOpts = (opts) => opts.map((o, i) => ({ anim: 'animation:in' + ap + ' .4s ease-out both;animation-delay:' + (i * 90 + 150) + 'ms;', label: o.label, desc: o.desc, chips: chips(o.f, false), pick: () => this.act((x) => { x.log += String(i); this.resolveIncident(x, i); }) }));
      if (cur.k === 'event') {
        const E = D.EV[cur.id];
        const nm = D.ST[cur.st][0];
        incKind = E.kind; incTitle = E.title.replace('{st}', nm); incText = E.text.replace('{st}', nm); incReal = E.real;
        incOpts = mkOpts(E.opts);
        incBanner = 'font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:' + (cur.id === 'boom' ? '#7be0a3' : '#ffd166');
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
        incOpts = mkOpts([
          pp ? { label: 'Repeal the policy', desc: 'Fastest peace. The policy and its effects are undone.', f: [0, 0, 0, 0, 3, -20] }
             : { label: 'Announce emergency relief', desc: 'Throw money at the problem. Works until the bill arrives.', f: [0, 0, 0, 0.8, 2, -15] },
          { label: 'Broker a compromise', desc: 'About ' + chance + ' in 100 to work. If it does, the policy stays at ~60% strength.', f: [0, 0, 0, 0.3, 2, -12] },
          { label: 'Send in the National Guard', desc: 'Immediate calm, but costly. Backfires about ' + back + ' in 100.', f: [0, 0, 0, 0, -7 * R.cap, -18] },
          { label: 'Wait it out', desc: 'Costs output while it lasts. Fizzles out about half the time.', f: [-0.8, 0, 0, 0, -2, 5] }
        ]);
        incBanner = 'font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#ff9d96';
        incShake = true;
      }
    }

    // brief
    const newsAll = g.news.slice().sort((a, b) => (a.k === 'inc' ? 0 : 1) - (b.k === 'inc' ? 0 : 1)).slice(0, 5);
    const news = newsAll.map((n, i) => ({ t: n.h, outlet: n.o, open: () => this.setState({ story: i }), anim: 'animation:slideIn' + ap + ' .45s ease-out both;animation-delay:' + (i * 140) + 'ms;' }));
    const storyN = st.story != null && phase === 'brief' ? newsAll[st.story] : null;
    const results = g.todayPol.map((id) => {
      const q = this.pol(id); const pp = g.pols.find((x) => x.id === id);
      const exp = q.f, got = pp.f;
      const worse = got.reduce((a, v, i) => a + (Math.abs(v) > Math.abs(exp[i]) * 1.2 ? 1 : 0), 0);
      const better = got.reduce((a, v, i) => a + (Math.abs(v) < Math.abs(exp[i]) * 0.8 ? 1 : 0), 0);
      return { anim: 'animation:in' + ap + ' .45s ease-out both;animation-delay:' + (news.length * 140 + 100) + 'ms;', title: q.t, chips: chips(got, false), note: worse > better ? 'Came in stronger than the memo predicted.' : better > worse ? 'Came in milder than the memo predicted.' : 'Close to what the memo predicted.' };
    });
    const nextLabel = (g.over || g.day >= 14) ? 'See your legacy' : 'Start day ' + (g.day + 1);

    // end
    let endKicker = '', endTitle = '', endLine = '', recap = [];
    if (phase === 'end') {
      const nn = this.needle(g);
      endKicker = g.over ? 'YOUR TERM ENDED EARLY' : 'YOUR 14 DAYS ARE UP';
      if (m.u >= R.over) { endTitle = 'Overthrown by Lunchtime'; endLine = 'The crowd is in the Oval Office. Someone is sitting in your chair and, to be fair, looks great in it.'; }
      else if (m.a <= 8) { endTitle = 'Impeached by Both Parties'; endLine = 'A bipartisan achievement at last. They do not agree on the reasons.'; }
      else if (m.u >= 70) { endTitle = 'Besieged Executive'; endLine = 'You finished the term, but the capital looks like a movie set. Get a helicopter ready.'; }
      else if (m.a < 30) { endTitle = 'Beloved by No One'; endLine = 'Few people love you. Fewer people like you. The data is not very kind.'; }
      else if (nn < 35) { if (m.g > -1 && m.a >= 45) { endTitle = 'Comrade Commissioner of Mostly Working'; endLine = 'A heavily planned economy that, against the odds, held together for two weeks.'; } else { endTitle = 'Five-Year Plan, Fourteen-Day Collapse'; endLine = 'The plan was ambitious. The spreadsheet was not.'; } }
      else if (nn > 65) { if (m.g > 0 && m.a >= 45) { endTitle = 'Invisible-Hand Emperor'; endLine = 'The market did the work. You got the credit and the photo ops.'; } else { endTitle = 'Laissez-Faire, Laissez-Fall'; endLine = 'The market was left to its own devices. Its devices were not great.'; } }
      else if (m.a >= 55 && m.u < 35) { endTitle = 'The Pragmatist'; endLine = 'A bit of everything, a lot of trade-offs. Everyone is mildly annoyed, which is the economist\'s definition of balance.'; }
      else { endTitle = 'Muddling Through'; endLine = 'Nobody is thrilled and the economy survived. That is a presidency.'; }
      recap = g.pols.map((pp) => {
        const q = this.pol(pp.id);
        return { title: q.t, status: pp.rep ? 'Signed day ' + pp.d + ', repealed' : pp.s < 1 ? 'Signed day ' + pp.d + ', compromised' : 'Signed day ' + pp.d, real: q.real };
      });
      if (!recap.length) recap = [{ title: 'You signed nothing.', status: '', real: 'Gridlock is also a policy. The economy kept doing its thing, with a little help from the weather.' }];
    }

    // score, grades, leaderboard
    const gradeColor = { A: '#7be0a3', B: '#8fd3c7', C: '#ffd166', D: '#f4a874', F: '#ff9d96' };
    const board = st.board || [];
    const lbRows = board.map((e) => ({ rank: String(e.rank), name: e.handle + (e.tag ? ' [' + e.tag + ']' : ''), score: String(e.score), role: e.role || '', c: e.cons_letter || '-', l: e.lib_letter || '-', rowStyle: 'display:grid;grid-template-columns:36px 1fr 70px 150px 54px 54px;gap:8px;align-items:center;padding:9px 12px;border-radius:10px;background:' + (e.is_me ? '#1d3658;border:1px solid #ffd166' : '#112238;border:1px solid transparent') }));
    const sortedRows = (st.rankBoard || []).slice();
    let sc = null, gC = null, gL = null, scoreRows = [], scoreText = '', rankText = '', celebrate = false, confetti = [], celebrateLine = '';
    if (phase === 'end') {
      sc = this.scoreCard(g);
      const gc = this.grade(sc.cons), gl = this.grade(sc.lib);
      const qi = (sc.score + g.title.length) % 2;
      gC = { letter: gc.letter, color: gradeColor[gc.band], quip: D.QUIPS.C[gc.band][qi], pct: Math.round(sc.cons) };
      gL = { letter: gl.letter, color: gradeColor[gl.band], quip: D.QUIPS.L[gl.band][qi], pct: Math.round(sc.lib) };
      const rowDef = [['Economy', sg(m.g, 1) + '% GDP', sc.sub.econ, '25%'], ['Jobs', m.j.toFixed(1) + '% unemployed', sc.sub.jobs, '20%'], ['Prices', m.i.toFixed(1) + '% inflation', sc.sub.prices, '15%'], ['Budget', m.d.toFixed(1) + '% deficit', sc.sub.budget, '15%'], ['Approval', Math.round(m.a) + '%', sc.sub.appr, '15%'], ['Calm', 'unrest ' + Math.round(m.u), sc.sub.calm, '10%']];
      scoreRows = rowDef.map((r) => ({ label: r[0], value: r[1], weight: r[3], pts: Math.round(r[2]) + '/100', barStyle: 'height:100%;border-radius:4px;width:' + Math.round(r[2]) + '%;background:' + (r[2] >= 66 ? '#5fd08b' : r[2] >= 40 ? '#ffd166' : '#ff7b72') }));
      scoreText = String(sc.score);
      const better = sortedRows.filter((e) => e.score > sc.score).length;
      rankText = !st.rankBoard ? (api.configured ? '' : 'Offline preview: the online board is not configured.') : sortedRows.length ? 'This score would rank #' + (better + 1) + ' of ' + (sortedRows.length + 1) + (g.mode === 'daily' ? ' on today\'s Daily board.' : ' on the all-time board.') : 'First score on the board. Lonely at the top.';
      celebrate = !g.over && m.a >= 40;
      celebrateLine = celebrate ? 'You made it through all 14 days.' : (g.over ? 'The term ended early. The confetti is mostly shredded paper.' : 'You survived, but nobody is throwing a parade.');
      const pal = celebrate ? ['#ffd166', '#5fd08b', '#8fc0f2', '#ff7b72', '#f4a874', '#eef1f6'] : ['#8794a8', '#5b6b82', '#a9b9d0', '#c0392b'];
      const fr = (i, k) => { const x = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
      for (let i = 0; i < (celebrate ? 56 : 28); i++) {
        const w = 6 + Math.round(fr(i, 1) * 8);
        confetti.push({ style: 'position:absolute;top:-24px;left:' + (fr(i, 2) * 100).toFixed(1) + '%;width:' + w + 'px;height:' + Math.round(w * (0.5 + fr(i, 3))) + 'px;background:' + pal[i % pal.length] + ';border-radius:' + (fr(i, 4) > 0.6 ? '50%' : '2px') + ';opacity:0;animation:fall' + ap + ' ' + (2.8 + fr(i, 5) * 2.4).toFixed(2) + 's ease-in ' + (fr(i, 6) * 1.6).toFixed(2) + 's both' });
      }
    }
    const storyParas = storyN ? storyN.b.map((t) => ({ t: t })) : [];

    // map
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
      if (Math.abs(r) >= 1) reasons.push({ r: r, t: h.l, v: sg(r, 0), style: "font-family:'Space Mono',monospace;font-size:12px;font-weight:700;color:" + (r > 0 ? '#7be0a3' : '#ff9d96') });
    });
    reasons.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
    const ranked = abbrs.slice().sort((a, b) => moods[a] - moods[b]);
    const mk = (a) => ({ name: D.ST[a][0], value: Math.round(moods[a]) + '%', pick: () => this.setState({ sel: a }) });
    const selMood = moods[sel];

    return {
      _share: { title: endTitle, score: sc ? sc.score : 0, cons: gC ? gC.letter : '', lib: gL ? gL.letter : '', role: g.title, needle: this.needle(g), mode: g.mode, dd: g.dd },
      leader: g.title, enter: enter, roleLine: roleLine,
      dayLabel: phase === 'title' ? 'READY' : 'DAY ' + Math.min(14, g.day) + ' / 14',
      dots: dots, stats: stats,
      needleWord: needleWord, needleSub: (nd >= 50 ? '+' : '−') + Math.abs(Math.round(nd - 50)) + ' from middle', needleStyle: needleStyle,
      tabOfficeStyle: tabOfficeStyle, tabMapStyle: tabMapStyle, tabScoresStyle: tabScoresStyle, goScores: () => { this.setState({ tab: 'scores' }); this.loadBoard(); }, isScores: tab === 'scores', officeLabel: officeLabel,
      goOffice: () => this.setState({ tab: 'office' }), goMap: () => this.setState({ tab: 'map' }),
      isOffice: tab === 'office', isMap: tab === 'map',
      isTitle: phase === 'title', isDesk: phase === 'desk' && !quiet, isQuiet: quiet, isIncident: phase === 'incident', isBrief: phase === 'brief', isEnd: phase === 'end',
      titles: titles,
      begin: () => this.act((x) => { x.phase = 'desk'; x.day = 1; x.ds = this.M(x); x.ds0 = x.ds; this.deal(x); }),
      ...this.modeVals(g),
      memoNo: String(memoNo), memoTotal: String(g.memos.length), memoDots: memoDots, todayDone: todayDone, hasToday: todayDone.length > 0,
      memoTitle: p ? p.t : '', memoText: p ? p.m : '',
      memoLeanLabel: planned ? 'Leans planned' : 'Leans free market',
      memoLeanStyle: 'font-size:11.5px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;padding:3px 10px;border-radius:6px;' + (planned ? 'background:rgba(180,83,28,.25);color:#f4a874' : 'background:rgba(31,90,158,.35);color:#8fc0f2'),
      memoChips: p ? chips(this.scaled(g, p.f), true) : [],
      memoCardAnim: leaving ? 'animation:out' + (leaving === 'sign' ? 'Sign' : 'Veto') + ' .38s ease-in forwards;' : enter,
      leaving: !!leaving, stampText: leaving === 'sign' ? 'SIGNED' : 'VETOED',
      stampStyle: "position:absolute;top:34%;left:50%;margin-left:-110px;width:220px;text-align:center;font-family:'Alfa Slab One',serif;font-size:44px;letter-spacing:3px;padding:6px 0;border-radius:10px;transform:rotate(-8deg);animation:stampIn .3s ease-out both;" + (leaving === 'sign' ? 'color:#5fd08b;border:5px solid #5fd08b' : 'color:#a9b9d0;border:5px solid #a9b9d0') + ';background:rgba(15,27,45,.8)',
      memoUnc: p ? (p.sd < 0.4 ? 'low' : p.sd < 0.7 ? 'medium' : 'high') : '',
      memoReal: p ? p.real : '', memoPro: p ? p.pro : '', memoCon: p ? p.con : '',
      showEv: showEv, evLabel: showEv ? 'Hide the evidence' : 'See the evidence',
      toggleEv: () => this.setState({ ev: !showEv }),
      sign: decide('sign'), veto: decide('veto'),
      endQuiet: () => this.act((x) => { x.log += 'q'; this.endDay(x); }),
      incKind: incKind, incTitle: incTitle, incText: incText, incReal: incReal, incOpts: incOpts, incBanner: incBanner, incTitleAnim: incShake ? 'animation:shakeX .55s ease-out;' : '',
      news: news, results: results, hasResults: results.length > 0,
      nextMorning: () => { this.setState({ story: null }); this.act((x) => { x.log += 'n'; this.nextMorning(x); }); },
      nextLabel: nextLabel,
      endKicker: endKicker, endTitle: endTitle, endLine: endLine, recap: recap,
      again: () => this.setState({ tab: 'office', story: null, submitted: false, lbMsg: '', lbErr: '', shareMsg: '', g: this.makeGame(st.mode || 'free', g.title) }),
      hasStory: !!storyN, storyOutlet: storyN ? storyN.o : '', storyHead: storyN ? storyN.h : '', storyParas: storyParas, closeStory: () => this.setState({ story: null }),
      scoreText: scoreText, rankText: rankText, gC: gC || {}, gL: gL || {}, scoreRows: scoreRows, confetti: confetti, hasConfetti: confetti.length > 0 && tab === 'office', celebrateLine: celebrateLine,
      ...this.accountVals(g, sc, gC, gL, m),
      ...this.boardVals(lbRows),
      mf: mf, ml: ml, mp: mp,
      selName: D.ST[sel][0], selReal: D.ST[sel][1], selMood: Math.round(selMood) + '%', selWord: moodWord(selMood),
      selBarStyle: 'transition:width .6s ease,background .6s;height:100%;border-radius:5px;width:' + selMood.toFixed(0) + '%;background:' + hex(moodColor(selMood)),
      reasons: reasons.slice(0, 4), hasReasons: reasons.length > 0, noReasons: reasons.length === 0,
      angriest: ranked.slice(0, 3).map(mk), happiest: ranked.slice(-3).reverse().map(mk),
      mapNote: phase === 'title' ? 'Everyone starts meh' : 'Click a state. Gold outline = news there.'
    };
  }}
