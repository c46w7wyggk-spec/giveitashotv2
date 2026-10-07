// Replays many random terms (every length, both levels) and checks the server replay agrees with the live game.
import { Engine, runLog, dailySeed, MIN_DAYS, MAX_DAYS } from '../src/engine.js';
import { playGame } from './helpers/bot.mjs';
const D = new Engine().data();
console.log('actions', D.XA.length, 'policies', D.POL.length, dailySeed('2026-10-05'));
const stats = { games: 0, impeach: 0, surv: 0, coup: 0, fled: 0, trials: 0, xa: 0, minS: 1e9, maxS: 0, sum: 0, maxLog: 0 };
for (let s = 1; s <= 600; s++) {
  const seed = s * 7919;
  const days = s % 4 === 0 ? MIN_DAYS + (s % 26) : s % 4 === 1 ? 14 : s % 4 === 2 ? MAX_DAYS - (s % 5) : 7 + (s % 10);
  const lvl = s % 5 === 0 ? 1 : 0;
  const { log, g, eng } = playGame(seed, s, { days, lvl, aggressive: s % 3 === 0 });
  const res = runLog(seed, 'President', log, { days, lvl }); const sc = eng.scoreCard(g);
  if (res.sc.score !== sc.score || res.needle !== Math.round(sc.nd)) throw new Error('mismatch ' + s);
  if (g.day > days) throw new Error('ran past the term ' + s);
  stats.games++; stats.trials += g.trials; stats.xa += g.xdone.length; stats.maxLog = Math.max(stats.maxLog, log.length);
  if (g.ok === 'impeach') stats.impeach++; if (g.ok === 'coup') stats.coup++; if (g.ok === 'fled') stats.fled++; if (g.surv) stats.surv++;
  stats.minS = Math.min(stats.minS, sc.score); stats.maxS = Math.max(stats.maxS, sc.score); stats.sum += sc.score;
}
console.log(JSON.stringify(stats), 'avg', Math.round(stats.sum / stats.games));
if (stats.maxLog > 600) throw new Error('a log exceeded the 600-character cap: ' + stats.maxLog);
const bad = (f) => { try { f(); return false; } catch (e) { return true; } };
const rej = [bad(() => runLog(1, 'President', 'sssss')), bad(() => runLog(1, 'nope', 's')), bad(() => runLog(1, 'President', 'x')), bad(() => runLog(1, 'President', 'sssxAxB')),
  bad(() => runLog(1, 'President', 's', { days: 2 })), bad(() => runLog(1, 'President', 's', { days: 29 })), bad(() => runLog(1, 'President', 's', { days: 7.5 })), bad(() => runLog(1, 'President', 's', { lvl: 2 }))];
console.log('rejects garbage:', rej.join(' '));
if (rej.some((x) => !x)) throw new Error('a bad input was accepted');
console.log('replayed', stats.games, 'games OK');
