import { Engine, runLog, dailySeed, begin, applyAction, XIDX } from '../src/engine.js';
const D = new Engine().data();
console.log('actions', D.XA.length, 'policies', D.POL.length, dailySeed('2026-10-05'));
const stats = { games: 0, impeach: 0, surv: 0, coup: 0, fled: 0, trials: 0, xa: 0, minS: 1e9, maxS: 0, sum: 0 };
for (let s = 1; s <= 400; s++) {
  const eng = new Engine(); const seed = s * 7919; const g = begin(eng, seed, 'President'); let log = '', n = 0, r = s * 31 + 1;
  const rnd = () => { r = (r * 1103515245 + 12345) & 0x7fffffff; return r / 0x7fffffff; };
  const aggressive = s % 3 === 0;
  while (g.phase !== 'end' && n++ < 600) {
    let a;
    if (g.phase === 'desk') {
      if (g.mi < g.memos.length) a = rnd() < 0.5 ? 's' : 'v';
      else {
        const opts = D.XA.map((x, i) => ({ x, i })).filter((o) => !g.xToday && g.cap >= o.x.cost && g.xdone.indexOf(o.x.id) < 0);
        if (opts.length && (aggressive || rnd() < 0.3) && rnd() < 0.7) { const o = opts[Math.floor(rnd() * opts.length)]; a = 'x' + XIDX[o.i]; }
        else a = 'e';
      }
    } else if (g.phase === 'incident') {
      const c = g.inc[0]; const k = c.k === 'event' ? D.EV[c.id].opts.length : 4;
      let i = Math.floor(rnd() * k);
      if (c.k === 'revolt' && i === 3 && g.cap < 3) i = 0;
      a = String(i);
    } else if (g.phase === 'trial') {
      let i = Math.floor(rnd() * 4); const need = [1, 0, 2, 1][i]; if (g.cap < need) i = 1; a = String(i);
    } else a = 'n';
    applyAction(eng, g, a); log += a;
  }
  if (g.phase !== 'end') throw new Error('did not finish ' + s);
  const res = runLog(seed, 'President', log); const sc = eng.scoreCard(g);
  if (res.sc.score !== sc.score || res.needle !== Math.round(sc.nd)) throw new Error('mismatch ' + s);
  stats.games++; stats.trials += g.trials; stats.xa += g.xdone.length;
  if (g.ok === 'impeach') stats.impeach++; if (g.ok === 'coup') stats.coup++; if (g.ok === 'fled') stats.fled++; if (g.surv) stats.surv++;
  stats.minS = Math.min(stats.minS, sc.score); stats.maxS = Math.max(stats.maxS, sc.score); stats.sum += sc.score;
}
console.log(JSON.stringify(stats), 'avg', Math.round(stats.sum / stats.games));
const bad = (f) => { try { f(); return false; } catch (e) { return true; } };
console.log('rejects garbage:', bad(() => runLog(1, 'President', 'sssss')), bad(() => runLog(1, 'nope', 's')), bad(() => runLog(1, 'President', 'x')), bad(() => runLog(1, 'President', 'sssxAxB')));
console.log('replayed', stats.games, 'games OK');
