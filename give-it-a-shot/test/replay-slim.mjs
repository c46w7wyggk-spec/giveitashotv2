// The slim server engine must score exactly like the full engine, for every term length and both levels.
import * as F from '../src/engine.js';
import * as S from '../supabase/functions/submit-score/engine.js';
import * as C from '../supabase/functions/classroom/engine.js';
import { playGame } from './helpers/bot.mjs';
let n = 0;
for (let s = 1; s <= 240; s++) {
  const seed = s * 104729 + 3; const days = [14, 3, 28, 9, 21, 5][s % 6]; const lvl = s % 4 === 0 ? 1 : 0;
  const { log } = playGame(seed, s, { days, lvl });
  const a = F.runLog(seed, 'President', log, { days, lvl });
  for (const E of [S, C]) {
    const b = E.runLog(seed, 'President', log, { days, lvl });
    if (a.sc.score !== b.sc.score || a.cons !== b.cons || a.lib !== b.lib || a.needle !== b.needle || a.g.over !== b.g.over) throw new Error('slim mismatch ' + s);
  }
  n++;
}
console.log('slim == full on', n, 'games');
