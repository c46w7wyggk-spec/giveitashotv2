// UI state and template values for Supreme Leader mode.
import { Leader, apply, begin, PL, ACX, DAYS, M5 } from './leader.js';
import { RIVALS, POLS, CONS, NOCON, ACTS, EVENTS } from './leaderdata.js';

const LAB = { econ: 'Economy', tre: 'Treasury', ppl: 'People', army: 'Army', elite: 'Elites', fear: 'Fear', heat: 'Heat', fav: 'Favors', anger: 'Bump anger' };
const BAD_UP = { heat: 1, anger: 1 };
const POS = [[352, 40], [48, 40], [48, 262], [200, 20], [352, 262]];
const RIVN = { bump: 'Bump', dragon: 'Dragon', euro: 'Euro', bear: 'Bear', oil: 'Oil' };
const recol = (v) => (v >= 60 ? '#5fd08b' : v >= 35 ? '#ffd166' : '#ff7b72');
const pct = (v, c) => 'width:' + Math.max(2, Math.min(100, v)) + '%;background:' + c;

export class LeaderApp extends Leader {
  constructor(rerender) {
    super();
    this._rerender = rerender;
    this.state = { tab: 'map', sel: [], conSel: undefined, act: null, tgt: null, coach: true, g: this.fresh() };
  }
  setState(p) { Object.assign(this.state, p); this._rerender(); }
  fresh() { return this.newGame(Math.floor(Math.random() * 2147483647)); }
  restart() { this.setState({ g: this.fresh(), tab: 'map', sel: [], conSel: undefined, act: null, tgt: null, coach: true }); }
  do(tok) {
    const g = JSON.parse(JSON.stringify(this.state.g));
    const was = g.phase;
    try { apply(this, g, tok); } catch (e) { return; }
    const patch = { g, act: null, tgt: null };
    if (was === 'brief') patch.tab = g.phase === 'end' ? 'desk' : 'map';
    else if (g.phase !== was) patch.tab = 'desk';
    this.setState(patch);
  }

  // ---------- helpers ----------
  fxChips(f) {
    const out = [];
    const add = (k, v) => { if (!v) return; const bad = BAD_UP[k] ? v > 0 : v < 0; out.push({ t: LAB[k] + (v > 0 ? ' +' : ' ') + (Math.abs(v) >= 1 ? Math.round(v) : v), cls: bad ? 'bad' : 'good' }); };
    ['econ', 'tre', 'ppl', 'army', 'elite', 'fear', 'heat'].forEach((k) => add(k, f[k]));
    if (f.rel) for (const k in f.rel) out.push({ t: RIVN[k] + (f.rel[k] > 0 ? ' +' : ' ') + f.rel[k], cls: f.rel[k] > 0 ? 'good' : 'bad' });
    if (f.anger) out.push({ t: 'Bump anger ' + (f.anger > 0 ? '+' : '') + f.anger, cls: f.anger > 0 ? 'bad' : 'good' });
    if (f.debt) out.push({ t: 'Debt grows', cls: 'bad' });
    if (f.guard) out.push({ t: 'Security +' + f.guard, cls: 'good' });
    if (f.deter) out.push({ t: 'Deterrence', cls: 'good' });
    if (f.purged) out.push({ t: 'Coup-proof ' + f.purged + ' days', cls: 'good' });
    if (f.quiet) out.push({ t: 'Quiet press', cls: 'good' });
    return out.slice(0, 7);
  }
  perDay(e, o) {
    const out = [];
    const rows = M5.map((k, i) => [k, e[i]]);
    if (o && o.fear) rows.push(['fear', o.fear]);
    if (o && o.heat) rows.push(['heat', o.heat]);
    rows.filter((r) => Math.abs(r[1]) >= 0.25).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 4).forEach((r) => {
      const bad = BAD_UP[r[0]] ? r[1] > 0 : r[1] < 0;
      out.push({ t: (r[1] > 0 ? '▲ ' : '▼ ') + LAB[r[0]], cls: bad ? 'bad' : 'good' });
    });
    return out;
  }
  diffChips(a, b) {
    const out = [];
    M5.forEach((k) => { const d = Math.round(b.m[k] - a.m[k]); if (d) out.push({ t: LAB[k] + (d > 0 ? ' +' : ' ') + d, cls: d > 0 ? 'good' : 'bad' }); });
    ['fear', 'heat'].forEach((k) => { const d = Math.round(b[k] - a[k]); if (d) out.push({ t: LAB[k] + (d > 0 ? ' +' : ' ') + d, cls: BAD_UP[k] ? (d > 0 ? 'bad' : 'good') : (d > 0 ? 'good' : 'bad') }); });
    RIVALS.forEach((r) => { const d = Math.round(b.rel[r.id] - a.rel[r.id]); if (d) out.push({ t: RIVN[r.id] + (d > 0 ? ' +' : ' ') + d, cls: d > 0 ? 'good' : 'bad' }); });
    return out;
  }
  leanTag(l) { return l <= -2 ? ['Left', 'pl'] : l >= 2 ? ['Right', 'fm'] : ['Mixed', 'nt']; }

  // ---------- values ----------
  getValues() {
    const st = this.state; const g = st.g; const ph = g.phase;
    const inPlay = ph === 'event' || ph === 'desk' || ph === 'brief' || ph === 'end';
    const T = st.tab;
    const v = { showMap: false };
    const goTab = (t) => () => this.setState({ tab: t });
    v.brandT = (g.cn || 'Supreme Leader').toUpperCase();
    v.brandS = inPlay || ph === 'pol' || ph === 'con' ? (g.ln || 'Supreme Leader') + ' of ' + g.cn : 'Supreme Leader mode';
    v.showTabs = inPlay;
    v.tabMapCls = T === 'map' ? 'on' : ''; v.tabDeskCls = T === 'desk' ? 'on' : ''; v.tabWorldCls = T === 'world' ? 'on' : '';
    v.goMap = goTab('map'); v.goDesk = goTab('desk'); v.goWorld = goTab('world');
    v.goMenu = () => { if (window.__leaderExit) window.__leaderExit(); };
    v.deskPing = ph === 'event' || (ph === 'desk' && !g.acted);
    v.dots = Array.from({ length: DAYS }, (_, i) => ({ cls: i + 1 < g.day || (ph === 'end' && i + 1 <= g.day) ? 'done' : i + 1 === g.day ? 'now' : '' }));
    v.dayLabel = 'DAY ' + Math.max(1, g.day) + ' / ' + DAYS;
    v.scrName = ph === 'name'; v.scrPol = ph === 'pol'; v.scrCon = ph === 'con';
    v.shape = g.shape;
    v.nameVal = g.cn; v.leaderVal = g.ln;
    v.onName = (e) => { const g2 = Object.assign({}, st.g, { cn: e.target.value }); st.g = g2; };
    v.onLeader = (e) => { const g2 = Object.assign({}, st.g, { ln: e.target.value }); st.g = g2; };
    v.reroll = () => this.restart();
    v.toPol = () => { const g2 = JSON.parse(JSON.stringify(st.g)); g2.cn = (g2.cn || '').trim() || 'Nowhere'; g2.ln = (g2.ln || '').trim() || 'Supreme Leader'; g2.phase = 'pol'; this.setState({ g: g2 }); };
    v.cityDots = g.cities.map((c, i) => ({ x: c.x, y: c.y, r: 4 + c.pop, ty: c.y + 8 + c.pop + 6, n: c.n, col: this.cityCol(g, c) }));

    if (ph === 'pol') {
      v.pickCount = 'Chosen ' + st.sel.length + ' of 5';
      v.polBtnCls = st.sel.length === 5 ? 'gold' : 'off';
      v.polBtnLabel = st.sel.length === 5 ? 'Lock in these five' : 'Pick ' + (5 - st.sel.length) + ' more';
      v.polConfirm = () => { if (st.sel.length === 5) { const g2 = JSON.parse(JSON.stringify(st.g)); st.sel.forEach((id) => apply(this, g2, PL[g2.pool.indexOf(id)])); this.setState({ g: g2, conSel: undefined }); } };
      v.polCards = g.pool.map((id) => {
        const p = this.pol(id); const on = st.sel.indexOf(id) >= 0; const l = this.leanTag(p.lean);
        return { t: p.t, d: p.d, lean: l[0], leanCls: l[1], chips: this.perDay(p.e, p), cls: on ? 'sel' : (st.sel.length >= 5 ? 'off' : ''), pick: () => { const s = st.sel.slice(); const i = s.indexOf(id); if (i >= 0) s.splice(i, 1); else if (s.length < 5) s.push(id); this.setState({ sel: s }); } };
      });
    }
    if (ph === 'con') {
      const opts = g.conOpts.map((id) => CONS.find((c) => c.id === id)).concat([NOCON]);
      v.conCards = opts.map((c, i) => {
        const key = c.id === 'none' ? 'n' : String(i); const on = st.conSel === key;
        return { t: c.t, d: c.d, chips: this.perDay(c.e, c).concat(c.fav ? [{ t: '▲ Favors', cls: 'good' }] : []).concat(c.coup > 1 ? [{ t: '▲ Coup risk', cls: 'bad' }] : c.coup < 1 ? [{ t: '▼ Coup risk', cls: 'good' }] : []), cls: on ? 'sel' : '', pick: () => this.setState({ conSel: key }) };
      });
      v.conBtnCls = st.conSel != null ? '' : 'off';
      v.conBtnLabel = st.conSel != null ? 'Take power' : 'Choose one';
      v.conConfirm = () => { if (st.conSel != null) { const g2 = JSON.parse(JSON.stringify(st.g)); apply(this, g2, st.conSel); this.setState({ g: g2, tab: 'map', coach: true }); } };
      v.conBack = () => { const g2 = JSON.parse(JSON.stringify(st.g)); g2.phase = 'pol'; g2.picks = []; g2.log = ''; this.setState({ g: g2, sel: [] }); };
    }

    if (inPlay) {
      const d0 = g.dayStart || this.snap(g); const now = this.snap(g);
      const dl = (a, b, inv) => { const d = Math.round(b - a); return { delta: d ? (d > 0 ? '▲' : '▼') + Math.abs(d) : '', dcls: d ? ((d > 0) !== !!inv ? 'good' : 'bad') : '' }; };
      const rank = now.rank; const rd = d0.rank - rank;
      v.stats = [['econ', 'Economy', 'Econ'], ['tre', 'Treasury', 'Cash'], ['ppl', 'People', 'People'], ['army', 'Army', 'Army'], ['elite', 'Elites', 'Elite']].map((r) => {
        const x = dl(d0.m[r[0]], now.m[r[0]]); return { label: r[1], short: r[2], value: String(Math.round(now.m[r[0]])), delta: x.delta, dcls: x.dcls };
      }).concat([{ label: 'World rank', short: 'Rank', value: '#' + rank, delta: rd ? (rd > 0 ? '▲' : '▼') + Math.abs(rd) : '', dcls: rd ? (rd > 0 ? 'good' : 'bad') : '' }]);
      v.favText = g.fav + ' / 8'; v.favPips = Array.from({ length: 8 }, (_, i) => ({ cls: i < g.fav ? 'on' : '' }));
      v.fearText = String(Math.round(g.fear)); v.fearBar = pct(g.fear, '#b48cf2');
      v.heatText = String(Math.round(g.heat)); v.heatBar = pct(g.heat, g.heat > 60 ? '#ff7b72' : g.heat > 35 ? '#ffd166' : '#5fd08b');
      v.moodText = this.mood(g); v.angerBar = pct(g.anger, g.anger > 60 ? '#ff7b72' : g.anger > 30 ? '#ffd166' : '#5fd08b');

      // map tab
      v.showMap = T === 'map';
      v.mbCoach = st.coach && g.day === 1; v.coachDone = () => this.setState({ coach: false });
      v.mbKicker = 'DAY ' + g.day + ' OF ' + DAYS;
      v.mbTitle = g.cn + ' wakes up.';
      v.mbText = (g.ln || 'Supreme Leader') + ', you are ranked #' + rank + ' of 20 nations' + (rank === g.startRank ? '.' : ' (you started at #' + g.startRank + ').') + ' Bump is ' + this.mood(g).toLowerCase() + '.';
      const al = [];
      if (g.m.army < 32) al.push({ cls: 'r', t: 'The generals are restless.' });
      if (g.m.elite < 25) al.push({ cls: 'r', t: 'The elite is losing patience.' });
      if (g.m.ppl < 25) al.push({ cls: 'r', t: 'Crowds are gathering.' });
      if (g.m.tre < 12) al.push({ cls: 'y', t: 'The treasury is nearly empty.' });
      if (g.anger >= 50) al.push({ cls: 'r', t: 'Bump is very angry. Something is coming.' });
      if (g.heat > 55) al.push({ cls: 'y', t: 'The world is watching you.' });
      v.mbAlerts = al.slice(0, 3);
      v.mbButton = ph === 'event' ? 'Read today’s event' : g.acted ? 'Go to the desk' : 'Go to my desk';
      v.rivalDots = RIVALS.map((r, i) => ({ x: POS[i][0], y: POS[i][1], ly: POS[i][1] + 4, ty: POS[i][1] + (POS[i][1] < 150 ? 28 : -20), n: RIVN[r.id], letter: { bump: 'B', dragon: 'D', euro: 'E', bear: 'P', oil: 'O' }[r.id], col: recol(g.rel[r.id]) }));
      v.rivalLines = RIVALS.map((r, i) => ({ x1: POS[i][0], y1: POS[i][1], x2: g.cities[0].x, y2: g.cities[0].y, col: recol(g.rel[r.id]) }));
      v.cityList = g.cities.map((c, i) => ({ n: c.n, cap: i === 0 ? ' (capital)' : '', pop: ['', 'tiny', 'small', 'town', 'big', 'huge'][c.pop] }));
      v.cityDots = g.cities.map((c, i) => ({ x: c.x, y: c.y, r: 3 + c.pop, ty: c.y + c.pop + 15, n: c.n, col: i === 0 ? '#ffd166' : this.cityCol(g, c) }));
    }

    // desk tab
    v.showDesk = T === 'desk' && inPlay;
    v.isEvent = v.showDesk && ph === 'event'; v.isDesk = v.showDesk && ph === 'desk'; v.isBrief = v.showDesk && ph === 'brief'; v.isEnd = v.showDesk && ph === 'end';
    if (ph === 'event') {
      const E = this.eventOf(g);
      v.evKind = E.kind.toUpperCase() + (g.evWhen === 'night' ? ' · TONIGHT' : '');
      v.evTitle = E.title.replace('{city}', g.ev.city); v.evText = E.text.replace('{city}', g.ev.city);
      v.evOpts = E.opts.map((o, i) => ({ l: o.l, d: o.d, risky: o.p != null, chips: this.fxChips(o.fx), pick: () => this.do(String(i)) }));
    }
    v.dayNum = g.day;
    const res = g.res;
    v.hasRes = !!res; v.resTitle = res ? res.title : ''; v.resPick = res ? res.pick : ''; v.resText = res ? res.text : '';
    v.resChips = res && res.before ? this.diffChips(res.before, this.snap(g)) : [];
    if (ph === 'desk') {
      const sel = st.act;
      v.canPlan = !g.acted;
      v.actList = ACTS.map((a, i) => {
        const fc = this.actCost(g, a); const ok = this.canAct(g, a);
        return { t: a.t, kind: a.kind === 'dark' ? 'Dark' : 'Clean', kindCls: a.kind === 'dark' ? 'dk' : 'nt', cost: fc + (fc === 1 ? ' Favor' : ' Favors') + (a.tre ? ' · $' + a.tre : ''), cls: (ok ? '' : 'off ') + (sel === i ? 'sel' : ''), pick: () => this.setState({ act: sel === i ? null : i, tgt: null }) };
      });
      v.hasSel = sel != null;
      if (sel != null) {
        const a = ACTS[sel]; const fc = this.actCost(g, a);
        v.selT = a.t; v.selD = a.d;
        v.selCost = 'Cost: ' + fc + (fc === 1 ? ' Favor' : ' Favors') + (a.tre ? ' and $' + a.tre : '');
        v.needsTgt = !!a.tg;
        v.tgtList = RIVALS.map((r, i) => ({ n: r.n, rel: 'Relations ' + Math.round(g.rel[r.id]) + ' · ' + RIVN[r.id], cls: st.tgt === i ? 'sel' : '', pick: () => this.setState({ tgt: i }) }));
        const p = a.p >= 1 ? 1 : this.chance(g, a, a.tg ? (st.tgt == null ? null : st.tgt) : null);
        v.selOdds = a.p >= 1 ? 'Certain to work' : 'Chance to work: ' + Math.round(p * 100) + '%' + (a.tg && st.tgt == null ? ' (pick a leader)' : '');
        const ready = this.canAct(g, a) && (!a.tg || st.tgt != null);
        v.goCls = ready ? '' : 'off'; v.goLabel = !this.canAct(g, a) ? 'Not enough Favors or cash' : a.tg && st.tgt == null ? 'Choose a leader first' : 'Do it';
        v.doIt = () => { if (ready) this.do('x' + ACX[sel] + (a.tg ? st.tgt : '')); };
      } else { v.selT = ''; v.selD = ''; v.selCost = ''; v.selOdds = ''; v.needsTgt = false; v.tgtList = []; v.goCls = 'off'; v.goLabel = ''; v.doIt = () => {}; }
      v.endLabel = g.acted ? 'End the day' : 'Skip action and end the day';
      v.endDay = () => this.do('e');
    } else { v.canPlan = false; v.hasSel = false; v.needsTgt = false; v.actList = []; v.tgtList = []; v.endDay = () => {}; v.endLabel = ''; v.doIt = () => {}; v.goCls = ''; v.goLabel = ''; v.selT = ''; v.selD = ''; v.selCost = ''; v.selOdds = ''; }
    if (ph === 'brief') {
      v.briefTitle = g.over ? 'Your rule ends tonight.' : 'The night passes.';
      v.briefLines = g.lines.map((t) => ({ cls: g.over ? 'r' : 'y', t })).concat(g.lines.length ? [] : [{ cls: 'y', t: 'A quiet night. Nobody stormed anything.' }]);
      v.dayChips = this.diffChips(g.dayStart, this.snap(g));
      const r0 = g.dayStart.rank; const r1 = this.rank(g);
      v.rankLine = 'World rank: #' + r1 + (r1 < r0 ? ' (up ' + (r0 - r1) + ')' : r1 > r0 ? ' (down ' + (r1 - r0) + ')' : ' (unchanged)') + '. Bump is ' + this.mood(g).toLowerCase() + '.';
      v.nextLabel = g.over ? 'See how it ended' : g.day >= DAYS ? 'See the final result' : 'Start day ' + (g.day + 1);
      v.nextDay = () => this.do('n');
    } else { v.briefTitle = ''; v.briefLines = []; v.dayChips = []; v.rankLine = ''; v.nextLabel = ''; v.nextDay = () => {}; }
    if (ph === 'end') {
      const sc = this.scoreCard(g); const polNames = g.picks.map((id) => this.pol(id).t).join(', ');
      v.endKicker = sc.alive ? 'THE TWENTY DAYS ARE UP' : 'THE END OF YOUR RULE';
      v.endTitle = sc.alive ? (sc.rank <= 5 ? 'A Great Power Rises' : sc.rank < sc.startRank ? 'Moving Up in the World' : 'Still Standing') : sc.how + '.';
      v.endText = sc.alive ? g.cn + ' finished at #' + sc.rank + ' of 20 under ' + (g.ln || 'Supreme Leader') + '. ' + (sc.rank < sc.startRank ? 'Your country climbed ' + (sc.startRank - sc.rank) + ' places.' : 'Your country did not move up, but it is still yours.') : g.cn + ' fell on day ' + g.day + '. The world ranked it #' + sc.rank + ' and moved on.';
      v.endScore = String(sc.score);
      v.endScoreLine = sc.alive ? 'Rank points ' + sc.rankPts + ' + climb ' + sc.climb + ' + survival ' + sc.surv + '.' : 'Being removed cuts the score. Rank points count for a quarter, plus a few points for each day you lasted.';
      v.endRank = '#' + sc.rank + ' of 20'; v.endClimb = 'Started at #' + sc.startRank + '.';
      v.endCountry = g.cn; v.endSetup = polNames + '. ' + this.con(g).t + '.';
      v.endKickerCls = '';
      v.again = () => this.restart();
    } else { v.endKicker = ''; v.endTitle = ''; v.endText = ''; v.endScore = ''; v.endScoreLine = ''; v.endRank = ''; v.endClimb = ''; v.endCountry = ''; v.endSetup = ''; v.again = () => {}; }

    // world tab
    v.showWorld = T === 'world' && inPlay;
    if (v.showWorld) {
      v.worldTitle = 'You are #' + this.rank(g) + ' of 20.';
      v.ladder = this.ladder(g).map((n, i) => ({ i: i + 1, n: n.n + (n.rid ? ' *' : ''), p: n.p.toFixed(1), cls: n.me ? 'me' : '' }));
      v.rivalCards = RIVALS.map((r) => ({ n: r.n, c: r.ti + ' of ' + r.c, rel: Math.round(g.rel[r.id]) + '/100', bar: pct(g.rel[r.id], recol(g.rel[r.id])), like: r.like, dis: r.dis }));
    } else { v.worldTitle = ''; v.ladder = []; v.rivalCards = []; }
    return v;
  }
  cityCol(g, c) { return '#eef1f6'; }
}
