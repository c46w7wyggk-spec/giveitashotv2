import * as F from '../src/engine.js';
import * as S from '../supabase/functions/submit-score/engine.js';
const D = new F.Engine().data(); let n = 0;
for (let s = 1; s <= 150; s++) {
  const eng = new F.Engine(); const seed = s * 104729 + 3; const g = F.begin(eng, seed, 'President'); let log = '', k = 0, r = s * 17 + 5;
  const rnd = () => { r = (r * 1103515245 + 12345) & 0x7fffffff; return r / 0x7fffffff; };
  while (g.phase !== 'end' && k++ < 600) {
    let a;
    if (g.phase === 'desk') {
      if (g.mi < g.memos.length) a = rnd() < 0.5 ? 's' : 'v';
      else { const o = D.XA.map((x, i) => ({ x, i })).filter((q) => !g.xToday && g.cap >= q.x.cost && g.xdone.indexOf(q.x.id) < 0); a = o.length && rnd() < 0.5 ? 'x' + F.XIDX[o[Math.floor(rnd() * o.length)].i] : 'e'; }
    } else if (g.phase === 'incident') { const c = g.inc[0]; let i = Math.floor(rnd() * (c.k === 'event' ? D.EV[c.id].opts.length : 4)); if (c.k === 'revolt' && i === 3 && g.cap < 3) i = 0; a = String(i); }
    else if (g.phase === 'trial') { let i = Math.floor(rnd() * 4); if (g.cap < [1, 0, 2, 1][i]) i = 1; a = String(i); }
    else a = 'n';
    F.applyAction(eng, g, a); log += a;
  }
  const a = F.runLog(seed, 'President', log), b = S.runLog(seed, 'President', log);
  if (a.sc.score !== b.sc.score || a.cons !== b.cons || a.lib !== b.lib || a.needle !== b.needle || a.g.over !== b.g.over) throw new Error('slim mismatch ' + s);
  n++;
}
console.log('slim == full on', n, 'games');
