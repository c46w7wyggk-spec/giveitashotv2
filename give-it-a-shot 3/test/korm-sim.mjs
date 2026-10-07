// How often can a right-leaning bot beat the Kormanik Challenge? (Should be possible, but not trivial.)
import { Engine, begin, applyAction, XIDX } from '../src/engine.js';
const D = new Engine().data();
function play(seed, smart) {
  const eng = new Engine(); const g = begin(eng, seed, 'President'); let n = 0, r = seed + 5;
  const rnd = () => { r = (r * 1103515245 + 12345) & 0x7fffffff; return r / 0x7fffffff; };
  while (g.phase !== 'end' && n++ < 600) {
    let a;
    if (g.phase === 'desk') {
      if (g.mi < g.memos.length) { const p = g.memos[g.mi]; const lean = eng.pol(p.id).lean; a = smart ? (lean > 0 ? 's' : 'v') : (rnd() < .5 ? 's' : 'v'); }
      else a = 'e';
    } else if (g.phase === 'incident') { const c = g.inc[0]; const k = c.k === 'event' ? D.EV[c.id].opts.length : 4; a = String(Math.floor(rnd() * k)); if (c.k === 'revolt' && a === '3' && g.cap < 3) a = '0'; }
    else if (g.phase === 'trial') { let i = Math.floor(rnd() * 4); const need = [1, 0, 2, 1][i]; if (g.cap < need) i = 1; a = String(i); }
    else a = 'n';
    applyAction(eng, g, a);
  }
  const sc = eng.scoreCard(g); const nd = eng.needle(g);
  return { win: !g.over && nd >= 80 && eng.grade(sc.cons).band === 'A', nd, cons: sc.cons, over: g.over };
}
for (const smart of [false, true]) {
  let w = 0, ndOk = 0, N = 400, ndSum = 0, cSum = 0;
  for (let s = 1; s <= N; s++) { const x = play(s * 7919, smart); if (x.win) w++; if (x.nd >= 80) ndOk++; ndSum += x.nd; cSum += x.cons; }
  console.log(smart ? 'right-leaning bot' : 'random bot', 'wins', w + '/' + N, 'needle>=80', ndOk, 'avg needle', (ndSum / N).toFixed(1), 'avg cons', (cSum / N).toFixed(1));
}
