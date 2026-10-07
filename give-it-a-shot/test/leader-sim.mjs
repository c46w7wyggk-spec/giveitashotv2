import { Leader, begin, apply, tokens, runLog, ACX, PL, DAYS } from '../src/leader.js';
import { ACTS, EVENTS, POLS, CONS } from '../src/leaderdata.js';
const eng = new Leader();
let sd = 12345; const R = () => { sd = (sd * 1103515245 + 12345) & 0x7fffffff; return sd / 0x7fffffff; };
const W = { econ: .28, tre: .14, ppl: .2, army: .18, elite: .1, fear: .04, heat: -.05, anger: -.3 };
const util = (f, p, bad) => { const u = (x) => { let s = 0; for (const k in W) if (x[k]) s += W[k] * x[k]; if (x.rel) for (const k in x.rel) s += .03 * x.rel[k]; return s; }; return p == null ? u(f) : p * u(f) + (1 - p) * u(bad || {}); };
function play(strategy, seed) {
  const g = begin(eng, seed);
  const log = [];
  const A = (t) => { apply(eng, g, t); };
  // setup
  let idx = [...Array(20).keys()];
  if (strategy === 'rand') idx.sort(() => R() - .5);
  else if (strategy === 'right') idx.sort((a, b) => POLS.find(p => p.id === g.pool[b]).lean - POLS.find(p => p.id === g.pool[a]).lean + (R() - .5));
  else if (strategy === 'left') idx.sort((a, b) => POLS.find(p => p.id === g.pool[a]).lean - POLS.find(p => p.id === g.pool[b]).lean + (R() - .5));
  else idx.sort((a, b) => { const sc = (i) => { const p = POLS.find(q => q.id === g.pool[i]); return p.e[0] * .28 + p.e[1] * .14 + p.e[2] * .2 + p.e[3] * .18 + p.e[4] * .1 - p.heat * .05 - p.fear * .03 - p.bump * .3 + (strategy === 'smartR' ? p.lean * .15 : 0); }; return sc(b) - sc(a); });
  idx.slice(0, 5).forEach(i => A(PL[i]));
  A(strategy === 'rand' ? ['0', '1', '2', 'n'][Math.floor(R() * 4)] : strategy === 'right' ? 'n' : '0');
  let guard = 0;
  while (g.phase !== 'end' && guard++ < 400) {
    if (g.phase === 'event') {
      const E = eng.eventOf(g); let best = 0;
      if (strategy === 'rand') best = Math.floor(R() * E.opts.length);
      else { let bu = -1e9; E.opts.forEach((o, i) => { const u = util(o.fx, o.p, o.bad); if (u > bu) { bu = u; best = i; } }); }
      A(String(best));
    } else if (g.phase === 'desk') {
      if (!g.acted) {
        let pick = null;
        if (strategy === 'rand') { if (R() < .6) { const i = Math.floor(R() * ACTS.length); if (eng.canAct(g, ACTS[i])) pick = [i, ACTS[i].tg ? Math.floor(R() * 5) : null]; } }
        else {
          const m = g.m; let want;
          if (m.army < 40) want = 'bribeG'; else if (m.elite < 35) want = 'bribeE'; else if (m.ppl < 40) want = 'rally'; else if (g.anger > 30 && g.guard < 2) want = 'spies'; else if (g.anger > 45) want = 'bribeL'; else if (m.tre < 25) want = 'extortE'; else if (g.day < 17) want = 'build'; else want = 'lowlie';
          const i = ACTS.findIndex(a => a.id === want);
          if (eng.canAct(g, ACTS[i])) pick = [i, ACTS[i].tg ? 0 : null];
          else if (eng.canAct(g, ACTS[15])) pick = [15, null];
        }
        if (pick) A('x' + ACX[pick[0]] + (pick[1] != null ? pick[1] : ''));
      }
      A('e');
    } else if (g.phase === 'brief') A('n');
  }
  return { g, sc: eng.scoreCard(g), log: g.log };
}
const N = +process.argv[2] || 200;
for (const s of ['rand', 'right', 'left', 'smart', 'smartR']) {
  let surv = 0, sum = 0, climb = 0, ok = {}, strikes = 0, sb = [0, 0, 0];
  for (let i = 0; i < N; i++) { const r = play(s, 1000 + i); if (r.sc.alive) surv++; sum += r.sc.score; climb += r.sc.startRank - r.sc.rank; ok[r.g.ok || 'alive'] = (ok[r.g.ok || 'alive'] || 0) + 1; r.g.sb.forEach((b, j) => { if (b) sb[j]++; });
    if (i < 40) { const rr = runLog(1000 + i, r.log); if (rr.sc.score !== r.sc.score) throw new Error('replay mismatch ' + s + ' ' + i); } }
  console.log(s.padEnd(6), 'surv', (100 * surv / N).toFixed(0) + '%', 'avg', Math.round(sum / N), 'climb', (climb / N).toFixed(1), JSON.stringify(ok), 'bump stages %', sb.map(x => Math.round(100 * x / N)).join('/'));
}
