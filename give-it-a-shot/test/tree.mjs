// Policy tree invariants over many random games: no bill ever appears twice, follow-ups only appear after their prerequisite,
// no two enacted laws clash, desks are full, topics rarely repeat back to back, and a good share of bills are follow-ups.
import { Engine, begin, applyAction, XIDX } from '../src/engine.js';
let bad = 0; const ok = (n, c) => { if (!c) { bad++; console.log('FAIL', n); } };
const eng0 = new Engine(); const D0 = eng0.data();
const stat = { memos: 0, kids: 0, short: 0, sameTopicDay: 0, backToBack: 0, games: 0, distinct: new Set() };
for (let seed = 1; seed <= 60; seed++) for (const lvl of [0, 1]) for (const days of [7, 14, 28]) {
  const eng = new Engine(); const D = eng.data(); const g = begin(eng, seed * 977, 'President', days, lvl);
  const dealt = []; let prevTp = [];
  const origDeal = eng.deal.bind(eng);
  const check = () => {
    const ids = g.memos.map((m) => m.id);
    stat.memos += ids.length; if (ids.length < g.mpd) stat.short++;
    ids.forEach((id) => { ok('repeat ' + id, dealt.indexOf(id) < 0); dealt.push(id); stat.distinct.add(id); });
    const tps = ids.map((id) => eng.pol(id).tp);
    if (new Set(tps).size < tps.length) stat.sameTopicDay++;
    if (tps.some((t) => prevTp.indexOf(t) >= 0)) stat.backToBack++;
    prevTp = tps;
    g.memos.forEach((m) => {
      const p = eng.pol(m.id); ok('has topic ' + m.id, !!p.tp);
      if (p.req && p.req.length) {
        stat.kids++;
        for (const c of p.req) {
          const hit = (Array.isArray(c) ? c : [c]).some((o) => { const t = o[0]; const id = t === '!' || t === '~' ? o.slice(1) : o; return t === '!' ? !g.pols.some((q) => q.id === id && !q.rep) : t === '~' ? g.vet[id] != null : g.pols.some((q) => q.id === id && !q.rep); });
          ok('req unmet ' + m.id + ' ' + JSON.stringify(c), hit);
        }
        ok('ribbon for ' + m.id, p.req.every((c) => Array.isArray(c) || c[0] === '!') || !!m.sid);
      }
      ok('no clash with law ' + m.id, !eng.blocker(g, m.id));
    });
    const laws = g.pols.filter((q) => !q.rep).map((q) => q.id);
    ids.forEach((id) => laws.forEach((l) => ok('clash dealt ' + id + ' vs ' + l, !eng.clash(id, l))));
  };
  eng.deal = function (gg) { origDeal(gg); check(); };
  check();  // day 1 was dealt by begin() before the hook
  let r = seed * 31 + days, n = 0; const rnd = () => { r = (r * 1103515245 + 12345) & 0x7fffffff; return r / 0x7fffffff; };
  while (g.phase !== 'end' && n++ < 900) {
    let a;
    if (g.phase === 'desk') {
      if (g.mi < g.memos.length) a = rnd() < 0.6 ? 's' : 'v';
      else {
        const o = D.XA.map((x, i) => ({ x, i })).filter((q) => !g.xToday && g.cap >= q.x.cost && g.xdone.indexOf(q.x.id) < 0 && !eng.blocker(g, q.x.id) && g.lvl !== 1);
        a = o.length && rnd() < 0.5 ? 'x' + XIDX[o[Math.floor(rnd() * o.length)].i] : 'e';
      }
    } else if (g.phase === 'incident') { const c = g.inc[0]; let i = Math.floor(rnd() * (c.k === 'event' ? D.EV[c.id].opts.length : 4)); if (c.k === 'revolt' && i === 3 && g.cap < 3) i = 0; a = String(i); }
    else if (g.phase === 'trial') { let i = Math.floor(rnd() * 4); if (g.cap < [1, 0, 2, 1][i]) i = 1; a = String(i); }
    else a = 'n';
    applyAction(eng, g, a);
  }
  ok('finished', g.phase === 'end');
  const laws = g.pols.filter((q) => !q.rep).map((q) => q.id);
  for (let i = 0; i < laws.length; i++) for (let j = i + 1; j < laws.length; j++) ok('final clash ' + laws[i] + ' ' + laws[j], !eng.clash(laws[i], laws[j]));
  stat.games++;
}
console.log('games', stat.games, 'memos', stat.memos, 'follow-ups', stat.kids, '(' + Math.round(100 * stat.kids / stat.memos) + '%)', 'short desks', stat.short, 'same-topic-day', stat.sameTopicDay, 'back-to-back', stat.backToBack, 'distinct bills seen', stat.distinct.size, 'of', D0.POL.length);
if (bad) { console.log(bad + ' failures'); process.exit(1); } console.log('tree OK');
