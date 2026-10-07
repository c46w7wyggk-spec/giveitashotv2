// digest() and replayPartial() must agree between the full engine and the slim server engines.
import * as F from '../src/engine.js';
import * as S from '../supabase/functions/submit-score/engine.js';
import * as C from '../supabase/functions/classroom/engine.js';
import { playGame } from './helpers/bot.mjs';
let n = 0;
for (let s = 1; s <= 120; s++) {
  const seed = s * 7919 + 11; const days = [14, 3, 28, 9, 21, 5][s % 6]; const lvl = s % 3 === 0 ? 1 : 0;
  const { log } = playGame(seed, s, { days, lvl });
  const o = { days, lvl };
  const f = F.runLog(seed, 'President', log, o); const df = JSON.stringify(F.digest(new F.Engine(), f.g));
  for (const E of [S, C]) {
    const r = E.runLog(seed, 'President', log, o);
    if (JSON.stringify(E.digest(new E.Engine(), r.g)) !== df) throw new Error('digest mismatch ' + s);
    const cut = log.slice(0, Math.floor(log.length / 2));
    const p = E.replayPartial(seed, 'President', cut, o); const q = F.replayPartial(seed, 'President', cut, o);
    if (p.score !== q.score || p.day !== q.day) throw new Error('partial mismatch ' + s);
    if (p.day > days) throw new Error('day overflow');
  }
  const d = JSON.parse(df);
  if (d.days !== days || !Array.isArray(d.signed) || d.ser.length < 1) throw new Error('bad digest ' + s);
  n++;
}
console.log('digest/partial OK on', n, 'games');
