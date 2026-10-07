// Supreme Leader mode: a deterministic engine (seeded) so a run can be replayed from its seed and log.
import { RIVALS, POLS, CONS, NOCON, ACTS, EVENTS, EVIDS, SYL, SUF, CITYSUF } from './leaderdata.js';

export const LEAD_VERSION = 1;
export const DAYS = 20;
export const M5 = ['econ', 'tre', 'ppl', 'army', 'elite'];
export const PL = 'abcdefghijklmnopqrst';
export const ACX = Array.from({ length: 62 }, (_, i) => String.fromCharCode(i < 26 ? 65 + i : i < 52 ? 71 + i : i - 4)).join('');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const DEAD = { coup: 'Overthrown by the generals', palace: 'Ousted in a palace coup', revolt: 'Swept away by revolution', kidnapped: 'Kidnapped by Ronald Bump', invaded: 'Invaded and replaced' };

export class Leader {
  rn(g) {
    g.rs = (g.rs + 0x6D2B79F5) | 0;
    let t = Math.imul(g.rs ^ (g.rs >>> 15), 1 | g.rs);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  pick(g, a) { return a[Math.floor(this.rn(g) * a.length)]; }
  shuffle(g, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.rn(g) * (i + 1)); const x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  pol(id) { return POLS.find((p) => p.id === id); }
  con(g) { return g.con ? CONS.find((c) => c.id === g.con) : NOCON; }
  place(g, tail) { return this.pick(g, SYL) + this.pick(g, SYL).toLowerCase() + tail; }

  newGame(seed) {
    const g = { rs: seed | 0, seed0: seed, phase: 'name', day: 0, picks: [], con: null, over: false, ok: '', acted: false, ev: null, evWhen: '', res: null, lines: [], log: '' };
    // map: a lumpy blob and five cities
    const ph = [this.rn(g) * 6.28, this.rn(g) * 6.28, this.rn(g) * 6.28];
    const pts = [];
    for (let i = 0; i < 44; i++) {
      const a = (i / 44) * 6.2832;
      const r = 1 + 0.2 * Math.sin(2 * a + ph[0]) + 0.15 * Math.sin(3 * a + ph[1]) + 0.09 * Math.sin(5 * a + ph[2]) + (this.rn(g) - 0.5) * 0.06;
      pts.push([Math.round(200 + Math.cos(a) * 140 * r), Math.round(150 + Math.sin(a) * 96 * r)]);
    }
    g.shape = pts.map((p) => p.join(',')).join(' ');
    g.cn = this.place(g, this.pick(g, SUF));
    g.ln = 'Supreme Leader';
    g.cities = [];
    for (let tries = 0; g.cities.length < 5 && tries < 200; tries++) {
      const a = this.rn(g) * 6.2832, rr = 0.2 + this.rn(g) * 0.5;
      const x = Math.round(200 + Math.cos(a) * 100 * rr * 1.4), y = Math.round(150 + Math.sin(a) * 66 * rr * 1.4);
      if (g.cities.every((c) => Math.hypot(c.x - x, c.y - y) > 52)) g.cities.push({ n: this.place(g, this.pick(g, CITYSUF)), x, y, pop: 1 + Math.floor(this.rn(g) * 5), bias: Math.round((this.rn(g) - 0.5) * 14) });
    }
    while (g.cities.length < 5) g.cities.push({ n: this.place(g, 'ton'), x: 120 + g.cities.length * 40, y: 150, pop: 2, bias: 0 });
    // world: five powers plus fourteen others
    g.rel = {}; RIVALS.forEach((r) => { g.rel[r.id] = Math.round(42 + this.rn(g) * 16); });
    g.nat = RIVALS.map((r) => ({ n: r.c.replace(/^the /, ''), p: r.base, rid: r.id }));
    const used = {};
    for (let i = 0; i < 14; i++) { let n; do { n = this.place(g, this.pick(g, SUF)); } while (used[n]); used[n] = 1; g.nat.push({ n, p: 28 + this.rn(g) * 52, rid: null }); }
    g.pool = this.shuffle(g, POLS.map((p) => p.id)).slice(0, 20);
    g.conOpts = this.shuffle(g, CONS.map((c) => c.id)).slice(0, 3);
    const days = this.shuffle(g, Array.from({ length: DAYS }, (_, i) => i + 1)).slice(0, 14);
    const evs = this.shuffle(g, EVIDS).slice(0, 14);
    g.sched = {}; days.forEach((d, i) => { g.sched[d] = evs[i]; });
    return g;
  }

  // ---------- effects ----------
  snap(g) { return { m: Object.assign({}, g.m), fear: g.fear, heat: g.heat, fav: g.fav, anger: g.anger, rel: Object.assign({}, g.rel), rank: this.rank(g) }; }
  fx(g, f, shock) {
    if (!f) return;
    const sh = shock == null ? 1 : shock;
    M5.forEach((k) => { if (f[k]) g.m[k] = clamp(g.m[k] + (f[k] < 0 ? f[k] * sh : f[k]), 0, 100); });
    if (f.fear) g.fear = clamp(g.fear + f.fear, 0, 100);
    if (f.heat) g.heat = clamp(g.heat + f.heat, 0, 100);
    if (f.fav) g.fav = clamp(g.fav + f.fav, 0, 8);
    if (f.anger) g.anger = clamp(g.anger + f.anger, 0, 100);
    if (f.debt) g.debt += f.debt;
    if (f.guard) g.guard = Math.min(4, g.guard + f.guard);
    if (f.deter) g.deter += f.deter;
    if (f.purged) g.purged = Math.max(g.purged, f.purged);
    if (f.quiet) g.quiet = 1;
    if (f.rel) for (const k in f.rel) if (g.rel[k] != null) g.rel[k] = clamp(g.rel[k] + f.rel[k], 0, 100);
  }
  power(g) {
    const m = g.m; const ra = RIVALS.reduce((s, r) => s + g.rel[r.id], 0) / RIVALS.length;
    return 0.28 * m.econ + 0.14 * m.tre + 0.20 * m.ppl + 0.18 * m.army + 0.10 * m.elite + 0.10 * ra - 0.05 * g.heat;
  }
  ladder(g) {
    const me = { n: g.cn, p: this.power(g), me: true };
    return g.nat.concat([me]).sort((a, b) => b.p - a.p);
  }
  rank(g) { const p = this.power(g); return 1 + g.nat.filter((n) => n.p > p).length; }
  mood(g) { const a = g.anger; return a < 15 ? 'Ignoring you' : a < 30 ? 'Watching you' : a < 50 ? 'Irritated' : a < 70 ? 'Hostile' : 'Furious'; }
  ideology(g) { return g.picks.reduce((s, id) => s + this.pol(id).lean, 0) + this.con(g).lean; }

  // ---------- setup ----------
  choosePolicies(g, ids) {
    if (g.phase !== 'pol' || ids.length !== 5 || new Set(ids).size !== 5 || ids.some((id) => g.pool.indexOf(id) < 0)) throw new Error('bad picks');
    g.picks = ids.slice(); g.phase = 'con';
  }
  chooseCon(g, id) {
    if (g.phase !== 'con') throw new Error('bad phase');
    if (id !== null && g.conOpts.indexOf(id) < 0) throw new Error('bad constitution');
    g.con = id; this.start(g);
  }
  start(g) {
    g.m = { econ: 45, tre: 45, ppl: 50, army: 55, elite: 50 };
    g.fear = 5; g.heat = 0; g.fav = 3; g.anger = 0; g.debt = 0; g.guard = 0; g.deter = 0; g.purged = 0; g.quiet = 0; g.sb = [false, false, false];
    g.picks.forEach((id) => { const p = this.pol(id); if (p.once) M5.forEach((k, i) => { g.m[k] = clamp(g.m[k] + p.once[i], 0, 100); }); });
    g.L = this.ideology(g);
    if (g.L < -3) g.rel.bump = clamp(g.rel.bump + g.L * 2, 5, 100);
    if (g.L > 3) g.rel.bump = clamp(g.rel.bump + g.L * 2, 5, 100);
    g.startRank = this.rank(g); g.day = 1;
    g.hist = [];
    this.morning(g);
  }
  morning(g) {
    g.acted = false; g.res = null; g.lines = [];
    g.dayStart = this.snap(g);
    const id = g.sched[g.day];
    if (id) { g.ev = { id, city: this.pick(g, g.cities).n }; g.evWhen = 'morning'; g.phase = 'event'; } else { g.ev = null; g.phase = 'desk'; }
  }

  // ---------- event and actions ----------
  eventOf(g) { return g.ev ? EVENTS[g.ev.id] : null; }
  resolveEvent(g, i) {
    if (g.phase !== 'event' || !g.ev) throw new Error('no event');
    const E = EVENTS[g.ev.id]; const o = E.opts[i]; if (!o) throw new Error('bad option');
    const before = this.snap(g);
    let f = o.fx, text = o.res;
    if (o.p != null) { if (this.rn(g) < o.p) { text = o.res; } else { f = o.bad; text = o.rbad; } }
    const sh = E.bump ? 1 : this.con(g).shock;
    let q = f;
    if (g.quiet && !E.bump) { q = Object.assign({}, f); ['ppl', 'heat'].forEach((k) => { if (q[k] && ((k === 'ppl' && q[k] < 0) || (k === 'heat' && q[k] > 0))) q[k] = q[k] * 0.5; }); g.quiet = 0; }
    this.fx(g, q, sh);
    g.res = { title: E.title.replace('{city}', g.ev.city), pick: o.l, text, before };
    const wasNight = g.evWhen === 'night';
    g.ev = null;
    g.phase = wasNight ? 'brief' : 'desk';
    if (wasNight) this.finishBrief(g);
  }
  actOf(i) { return ACTS[i]; }
  actCost(g, a) { return a.cost + (a.kind === 'dark' && this.con(g).charter ? 1 : 0); }
  canAct(g, a) { return g.phase === 'desk' && !g.acted && g.fav >= this.actCost(g, a) && g.m.tre >= (a.tre || 0); }
  chance(g, a, tgt) {
    let p = a.p;
    if (a.tg && tgt != null) {
      const r = RIVALS[tgt];
      if (a.id === 'extort') p -= (r.base - 60) / 200;
      if (a.relp) p += (g.rel[r.id] - 50) * a.relp;
      if (a.id === 'ally' && r.id === 'bump') p += Math.min(0, g.L) * 0.04 + Math.max(0, g.L) * 0.02;
      if (a.id === 'ally' && r.id === 'euro') p -= g.fear * 0.003;
    }
    if (a.kind === 'dark' && this.con(g).lawless) p += 0.1;
    return clamp(p, 0.1, 0.95);
  }
  doAction(g, i, tgt) {
    const a = ACTS[i]; if (!a) throw new Error('bad action');
    if (a.tg && !(tgt >= 0 && tgt < 5)) throw new Error('target needed');
    if (!this.canAct(g, a)) throw new Error('cannot act');
    const before = this.snap(g);
    const C = this.con(g);
    g.fav -= this.actCost(g, a); g.m.tre = clamp(g.m.tre - (a.tre || 0), 0, 100);
    const win = a.p >= 1 || this.rn(g) < this.chance(g, a, tgt);
    const sub = (o) => { const r = {}; for (const k in o) { if (k === 'rel') { r.rel = {}; for (const t in o.rel) r.rel[t === '$t' ? RIVALS[tgt].id : t] = o.rel[t]; } else r[k] = o[k]; } return r; };
    const f = sub(win ? a.ok : a.bad);
    if (a.kind === 'dark') {
      if (C.charter && f.heat > 0) f.heat += 4;
      if (C.lawless && f.heat > 0) f.heat = Math.round(f.heat * 0.5);
      if (C.divine && a.id === 'silence') f.heat = 0;
    }
    this.fx(g, f, 1);
    g.acted = true;
    g.res = { title: a.t + (a.tg ? ': ' + RIVALS[tgt].n : ''), pick: win ? 'It worked' : 'It backfired', text: win ? a.win : a.lose, before };
  }

  // ---------- the night ----------
  endDay(g) {
    if (g.phase !== 'desk') throw new Error('bad phase');
    const R = this.con(g); const lines = [];
    const m = g.m; const add = (k, v) => { m[k] = clamp(m[k] + v, 0, 100); };
    g.picks.forEach((id) => { const p = this.pol(id); M5.forEach((k, i) => add(k, p.e[i])); g.fear += p.fear; g.heat += p.heat; });
    M5.forEach((k, i) => add(k, R.e[i])); g.fear += R.fear;
    add('tre', -0.35 * g.debt);
    const rl = g.rel;
    if (rl.bump >= 65) add('econ', 0.5); else if (rl.bump < 25) add('econ', -0.7);
    if (rl.dragon >= 65) { add('econ', 0.5); add('tre', 0.3); } else if (rl.dragon < 25) add('econ', -0.4);
    if (rl.euro >= 65) add('ppl', 0.4); else if (rl.euro < 25) add('ppl', -0.3);
    if (rl.bear >= 65) add('army', 0.4); else if (rl.bear < 25) add('econ', -0.4);
    if (rl.oil >= 65) add('tre', 1); else if (rl.oil < 25) add('tre', -0.6);
    // drift toward a baseline and the state of the economy
    add('econ', 0.04 * (45 - m.econ) - (g.heat > 55 ? 0.5 : 0));
    add('ppl', 0.04 * (50 - m.ppl) + 0.05 * (m.econ - 50) - 0.8 - (m.tre < 15 ? 1.2 : 0) - (g.heat > 60 ? 0.4 : 0));
    add('army', 0.04 * (50 - m.army) - 0.7 - (m.tre < 10 ? 1.5 : 0));
    add('elite', 0.04 * (50 - m.elite) + 0.03 * (m.econ - 50) - 0.6);
    add('tre', 0.04 * (m.econ - 50) - 1.0);
    if (g.L > 0) add('ppl', -0.15 * g.L);
    M5.forEach((k) => add(k, (this.rn(g) - 0.5) * 4));
    if (m.tre <= 0) { add('army', -2); add('ppl', -1); lines.push('The treasury is empty. Soldiers and civil servants are going unpaid.'); }
    g.fear = clamp(g.fear - 1, 0, 100); g.heat = clamp(g.heat - 1.5, 0, 100);
    g.purged = Math.max(0, g.purged - 1); g.deter = Math.max(0, g.deter - 1);
    // Bump's anger
    const LF = Math.max(0, -g.L);
    const bp = g.picks.reduce((s, id) => s + this.pol(id).bump, 0);
    g.anger = clamp(g.anger + LF * 0.5 + g.heat * 0.03 + Math.max(0, 50 - rl.bump) * 0.04 + (rl.dragon > 70 ? 1.5 : 0) + (rl.bear > 70 ? 1.5 : 0) + R.bump + bp - (rl.bump > 60 ? 2.5 : 1) - 0.6, 0, 100);
    // world drifts
    g.nat.forEach((n) => { n.p = clamp(n.p + (this.rn(g) - 0.5) * 1.4 + 0.12 + (60 - n.p) * 0.004, 12, 96); });
    // deposition checks
    const cm = R.coup;
    if (m.army < 30 && g.purged <= 0 && this.rn(g) < ((30 - m.army) / 30) * 0.9 * cm) { g.over = true; g.ok = 'coup'; lines.push('The generals took the palace while you were at lunch.'); }
    else if (m.elite < 22 && this.rn(g) < ((22 - m.elite) / 22) * 0.8 * cm) { g.over = true; g.ok = 'palace'; lines.push('Your own ministers locked the office door and changed the locks.'); }
    else if (m.ppl < 20 && this.rn(g) < ((20 - m.ppl) / 20) * (g.fear >= 50 ? 0.45 : 0.9)) { g.over = true; g.ok = 'revolt'; lines.push('Crowds filled the capital and the guards joined them.'); }
    if (!g.over && g.sb[2] && g.anger >= 75 && this.rn(g) < 0.5) this.strike(g, lines);
    if (!g.over) {
      if (m.army < 32) lines.push('The generals are muttering in the corridors.');
      if (m.elite < 25) lines.push('The tycoons are moving their money abroad.');
      if (m.ppl < 25) lines.push('Crowds are gathering in the squares.');
      if (m.tre < 12 && m.tre > 0) lines.push('The treasury is nearly empty.');
      if (g.heat > 60) lines.push('The whole world is watching your country.');
    }
    g.lines = lines;
    if (g.over) { g.phase = 'brief'; this.finishBrief(g); return; }
    // Bump moves in stages
    let id = null;
    if (!g.sb[0] && g.anger >= 25) { g.sb[0] = true; id = 'bumpwarn'; }
    else if (!g.sb[1] && g.anger >= 50) { g.sb[1] = true; id = 'bumpsanc'; if (!g.sb[0]) g.sb[0] = true; }
    else if (!g.sb[2] && g.anger >= 70) { g.sb[2] = true; id = 'bumpult'; }
    if (id) { g.ev = { id, city: g.cities[0].n }; g.evWhen = 'night'; g.phase = 'event'; return; }
    g.phase = 'brief'; this.finishBrief(g);
  }
  strike(g, lines) {
    const m = g.m;
    const invade = m.army < 45 && this.rn(g) < 0.6;
    if (invade) {
      const p = clamp(0.4 + (50 - m.army) / 100 + g.anger / 400 - g.deter * 0.1, 0.1, 0.9);
      if (this.rn(g) < p) { g.over = true; g.ok = 'invaded'; lines.push('Bump’s army crossed the border at dawn. The capital fell by lunch.'); }
      else { this.fx(g, { army: -10, econ: -6, ppl: 6, anger: -10 }, 1); lines.push('Bump’s invasion stalled in the mud. Your soldiers held the line, barely.'); }
    } else {
      const p = clamp(0.5 + g.anger / 300 - g.guard * 0.15 - (g.deter > 0 ? 0.15 : 0), 0.1, 0.85);
      if (this.rn(g) < p) { g.over = true; g.ok = 'kidnapped'; lines.push('Bump’s special forces landed in the night and flew you out in your pajamas.'); }
      else { this.fx(g, { ppl: 8, heat: 10, anger: -15 }, 1); lines.push('A raid on the palace failed. Your guards, your goat herders and one very loud cook sent them home.'); }
    }
  }
  finishBrief(g) {
    const d = g.dayStart;
    g.hist.push({ day: g.day, rank: this.rank(g) });
    g.over = g.over || false;
  }
  nextMorning(g) {
    if (g.phase !== 'brief') throw new Error('bad phase');
    if (g.over || g.day >= DAYS) { g.phase = 'end'; return; }
    g.day += 1;
    g.fav = clamp(g.fav + 1 + this.con(g).fav, 0, 8);
    this.morning(g);
  }

  // ---------- score ----------
  scoreCard(g) {
    const rank = this.rank(g); const alive = !g.over;
    const rankPts = (20 - rank) * 34;
    const climb = clamp((g.startRank - rank) * 18, -60, 400);
    const surv = alive ? 260 : 0;
    const score = alive ? Math.round(rankPts + climb + surv) : Math.round(rankPts * 0.25 + g.day * 6);
    return { rank, startRank: g.startRank, rankPts, climb: alive ? climb : 0, surv, score: Math.max(0, score), alive, how: g.over ? DEAD[g.ok] : '' };
  }
}

// ---------- replay protocol ----------
// setup: five policy letters a-t, then constitution 0-2 or n. play: 0-3 answers an event, x+action char (+leader digit 0-4), e ends the day, n starts the next morning.
export function tokens(log) {
  const out = [];
  for (let i = 0; i < log.length; i++) {
    const c = log[i];
    if (c === 'x') {
      const a = ACX.indexOf(log[i + 1]); if (a < 0 || !ACTS[a]) throw new Error('bad log');
      if (ACTS[a].tg) { if (!/[0-4]/.test(log[i + 2] || '')) throw new Error('bad log'); out.push('x' + log[i + 1] + log[i + 2]); i += 2; } else { out.push('x' + log[i + 1]); i += 1; }
    } else out.push(c);
  }
  return out;
}
export function begin(eng, seed) { const g = eng.newGame(seed); g.phase = 'pol'; return g; }
export function apply(eng, g, t) {
  if (g.phase === 'pol') {
    const i = PL.indexOf(t); if (i < 0) throw new Error('bad pick');
    g.tmp = g.tmp || []; g.tmp.push(g.pool[i]);
    if (g.tmp.length === 5) { const ids = g.tmp; g.tmp = null; eng.choosePolicies(g, ids); }
  } else if (g.phase === 'con') {
    if (t === 'n') eng.chooseCon(g, null);
    else if (/^[0-2]$/.test(t)) eng.chooseCon(g, g.conOpts[+t]);
    else throw new Error('bad constitution');
  } else if (g.phase === 'event') {
    if (!/^[0-3]$/.test(t)) throw new Error('bad option'); eng.resolveEvent(g, +t);
  } else if (g.phase === 'desk') {
    if (t === 'e') eng.endDay(g);
    else if (t[0] === 'x') eng.doAction(g, ACX.indexOf(t[1]), t.length > 2 ? +t[2] : null);
    else throw new Error('bad desk token');
  } else if (g.phase === 'brief') {
    if (t !== 'n') throw new Error('bad brief token'); eng.nextMorning(g);
  } else throw new Error('bad phase ' + g.phase);
  g.log += t;
  return g;
}
export function runLog(seed, log) {
  const eng = new Leader(); const g = begin(eng, seed);
  if (typeof log !== 'string' || log.length > 400) throw new Error('bad log');
  for (const t of tokens(log)) { if (g.phase === 'end') throw new Error('log continues after the end'); apply(eng, g, t); }
  if (g.phase !== 'end') throw new Error('game is not finished');
  return { g, sc: eng.scoreCard(g) };
}
