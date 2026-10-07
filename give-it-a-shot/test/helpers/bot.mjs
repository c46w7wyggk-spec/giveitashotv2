// Plays a random but legal 14-day term with the real engine and returns the action log.
import { Engine, begin, applyAction, XIDX } from '../../src/engine.js';
export function playLog(seed, rseed = 1) {
  const eng = new Engine(); const D = eng.data(); const g = begin(eng, seed, 'President');
  let log = '', n = 0, r = rseed * 31 + 7;
  const rnd = () => { r = (r * 1103515245 + 12345) & 0x7fffffff; return r / 0x7fffffff; };
  while (g.phase !== 'end' && n++ < 600) {
    let a;
    if (g.phase === 'desk') {
      if (g.mi < g.memos.length) a = rnd() < 0.5 ? 's' : 'v';
      else {
        const o = D.XA.map((x, i) => ({ x, i })).filter((q) => !g.xToday && g.cap >= q.x.cost && g.xdone.indexOf(q.x.id) < 0);
        a = o.length && rnd() < 0.4 ? 'x' + XIDX[o[Math.floor(rnd() * o.length)].i] : 'e';
      }
    } else if (g.phase === 'incident') { const c = g.inc[0]; let i = Math.floor(rnd() * (c.k === 'event' ? D.EV[c.id].opts.length : 4)); if (c.k === 'revolt' && i === 3 && g.cap < 3) i = 0; a = String(i); }
    else if (g.phase === 'trial') { let i = Math.floor(rnd() * 4); if (g.cap < [1, 0, 2, 1][i]) i = 1; a = String(i); }
    else a = 'n';
    applyAction(eng, g, a); log += a;
  }
  if (g.phase !== 'end') throw new Error('bot did not finish');
  return log;
}
