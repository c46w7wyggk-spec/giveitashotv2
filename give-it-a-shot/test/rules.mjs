// Rules tests: policy slots, withdrawn memos, term length, difficulty levels.
import { Engine, begin, applyAction, XIDX, MIN_DAYS, MAX_DAYS } from '../src/engine.js';
import { playGame } from './helpers/bot.mjs';
const D = new Engine().data();
let fails = 0; const ok = (name, c) => { if (!c) { fails++; console.log('FAIL', name); } };
const xi = (id) => 'x' + XIDX[D.XA.findIndex((x) => x.id === id)];

// 1. every slotted id exists, slot names are short enough for the slim engine
for (const [id, sl] of Object.entries(D.SLOT)) { ok('slot id ' + id, !!D.POL.concat(D.XA).find((p) => p.id === id)); sl.forEach((s) => ok('slot name length ' + s, s.length <= 15)); }

// 2. the headline bug: abolish income tax, then income-tax memos never come back (and are withdrawn if already on the desk)
{
  const eng = new Engine(); const g = begin(eng, 1, 'President'); g.cap = 8;
  // force today's desk to contain top70 and cg0, then take the abolish-income-tax action
  g.memos = [{ id: 'top70', dec: null }, { id: 'cg0', dec: null }, { id: 'mw15', dec: null }]; g.mi = 0;
  applyAction(eng, g, xi('consumptax'));
  ok('memos about income tax withdrawn', g.memos.length === 1 && g.memos[0].id === 'mw15');
  ok('withdrawn memos recorded', g.moot.length === 2 && g.moot.every((m) => m.by === 'consumptax'));
  applyAction(eng, g, 's'); applyAction(eng, g, 'e');
  while (g.phase === 'incident') applyAction(eng, g, '0');
  let seen = new Set();
  for (let k = 0; k < 12 && g.phase !== 'end'; k++) {
    if (g.phase === 'brief') applyAction(eng, g, 'n');
    else if (g.phase === 'desk') { g.memos.forEach((m) => seen.add(m.id)); while (g.mi < g.memos.length) applyAction(eng, g, 'v'); applyAction(eng, g, 'e'); }
    else if (g.phase === 'incident') applyAction(eng, g, '0'); else if (g.phase === 'trial') applyAction(eng, g, '1');
  }
  for (const id of ['top70', 'cg0', 'flat', 'natvat']) ok('never dealt after consumption tax: ' + id, !seen.has(id));
}

// 3. signing a memo blocks the contradicting executive action, and the reverse
{
  const eng = new Engine(); const g = begin(eng, 2, 'President'); g.cap = 8;
  g.memos = [{ id: 'mw15', dec: null }]; g.mi = 0; applyAction(eng, g, 's');
  let threw = false; try { applyAction(eng, g, xi('nominwage')); } catch (e) { threw = true; }
  ok('signed $15 minimum wage blocks abolishing it', threw && eng.blocker(g, 'nominwage') === 'mw15');
  ok('mw0 blocked too', eng.blocker(g, 'mw0') === 'mw15');
  ok('unrelated action still fine', !eng.blocker(g, 'ceocap'));
}

// 4. a day never deals two memos that share a lever, in any game
let dealt = 0, conflictsSeen = 0, withdrawn = 0;
for (let s = 1; s <= 300; s++) {
  const { g } = playGame(s * 31, s, { days: [14, 28, 10, 21][s % 4], aggressive: s % 2 === 0 });
  ok('final game state has no slot clash', (() => { const seen = {}; for (const p of g.pols) { if (p.rep) continue; for (const sl of (D.SLOT[p.id] || [])) { if (seen[sl]) return false; seen[sl] = p.id; } } return true; })());
}
for (let s = 1; s <= 300; s++) {
  const eng = new Engine(); const g = begin(eng, s * 77, 'President', 14, 0);
  for (let day = 0; day < 14 && g.phase !== 'end'; day++) {
    if (g.phase === 'desk') {
      const used = {}; g.memos.forEach((m) => (D.SLOT[m.id] || []).forEach((sl) => { if (used[sl]) conflictsSeen++; used[sl] = 1; })); dealt += g.memos.length;
      const taken = eng.taken(g); g.memos.forEach((m) => { if (g.pols.some((p) => p.id === m.id && !p.rep)) conflictsSeen++; });
      // sign everything: the pool should shrink, never repeat or clash
      while (g.mi < g.memos.length) applyAction(eng, g, 's');
      g.cap = 8; const o = D.XA.filter((x) => !eng.blocker(g, x.id) && x.cat !== 'power'); if (o.length && day % 2 === 0) { const x = o[day % o.length]; const before = g.memos.length; applyAction(eng, g, 'x' + XIDX[D.XA.indexOf(x)]); withdrawn += before - g.memos.length; }
      applyAction(eng, g, 'e');
    } else if (g.phase === 'incident') applyAction(eng, g, '0'); else if (g.phase === 'trial') applyAction(eng, g, '1'); else applyAction(eng, g, 'n');
  }
}
ok('no clashing memos dealt in ' + dealt + ' deals', conflictsSeen === 0);

// 5. term length and memo load
for (const days of [MIN_DAYS, 4, 7, 14, 15, 21, 28]) {
  for (const lvl of [0, 1]) {
    const { g, log } = playGame(days * 13 + lvl, days + 3, { days, lvl });
    ok('term length ' + days + '/' + lvl, g.phase === 'end' && g.day === days);
    const evN = Object.keys(g.sched).length; const want = Math.min(10, Math.max(1, Math.round(days * 3 / 7)), days - 2);
    ok('events scheduled ' + days + ': ' + evN + ' vs ' + want, evN === want);
    ok('events fall on days 2..days-1', Object.keys(g.sched).every((d) => +d >= 2 && +d <= days - 1));
    ok('memos per day sane', g.mpd >= 1 && g.mpd <= (lvl ? 2 : 3));
    ok('log within the 600 cap', log.length <= 600);
  }
}
ok('standard 14 days = 3 memos a day', new Engine().newGame(1, 14, 0).mpd === 3);
ok('core 14 days = 2 memos a day', new Engine().newGame(1, 14, 1).mpd === 2);
ok('standard 28 days = 1 memo a day', new Engine().newGame(1, 28, 0).mpd === 1);
ok('default game is 14 days, standard', (() => { const g = new Engine().newGame(1); return g.days === 14 && g.lvl === 0; })());

// 6. core level: no scandal, no impeachment, no power plays
{
  let scand = 0, imp = 0, powerRejected = 0;
  for (let s = 1; s <= 200; s++) {
    const { g } = playGame(s * 91, s, { days: 14, lvl: 1, aggressive: true });
    scand += g.scand > 0 ? 1 : 0; imp += g.trials;
    if (g.xdone.some((id) => D.XA.find((x) => x.id === id).cat === 'power')) scand++;
  }
  ok('core level never gains scandal or power plays', scand === 0);
  ok('core level never starts an impeachment', imp === 0);
  const eng = new Engine(); const g = begin(eng, 5, 'President', 14, 1); g.cap = 8;
  try { applyAction(eng, g, xi('hushmoney')); } catch (e) { powerRejected = 1; }
  ok('core level rejects a power play', powerRejected === 1);
}
// 7. standard level still has the impeachment path
{ let t = 0; for (let s = 1; s <= 200; s++) t += playGame(s * 53, s, { days: 14, lvl: 0 }).g.trials; ok('standard level still produces impeachment trials', t > 0); }
{ let xa = 0; for (let s = 1; s <= 100; s++) xa += playGame(s * 59, s, { days: 14, lvl: 1, aggressive: true }).g.xdone.length; ok('core has no executive actions', xa === 0); }
ok('core rejects every executive action', (() => { const eng = new Engine(); const g = begin(eng, 5, 'President', 14, 1); g.cap = 8; try { applyAction(eng, g, xi('nocorptax')); return false; } catch (e) { return /core mode/.test(e.message); } })());

console.log(fails ? fails + ' FAILED' : 'rules OK', '(dealt', dealt, 'memos, withdrew', withdrawn, ')');
process.exit(fails ? 1 : 0);
