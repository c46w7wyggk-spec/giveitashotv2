// Written summaries must be complete sentences with real numbers for every length, level and outcome.
import * as F from '../src/engine.js';
import { buildSummary, buildClassSummary } from '../src/summary.js';
import { playGame } from './helpers/bot.mjs';
const eng = new F.Engine();
const bad = (s, tag) => { if (/undefined|NaN|\[object|null/.test(s)) throw new Error('bad text in ' + tag + ': ' + s.match(/.{40}(undefined|NaN|\[object|null).{40}/)); };
let sample = null;
for (let s = 1; s <= 90; s++) {
  const seed = s * 31337 + 5, days = [14, 3, 28, 7, 21][s % 5], lvl = s % 3 === 0 ? 1 : 0;
  const { log } = playGame(seed, s, { days, lvl });
  const run = F.runLog(seed, 'President', log, { days, lvl });
  const d = JSON.parse(JSON.stringify(F.digest(eng, run.g)));
  const sm = buildSummary(eng, d, { score: run.sc.score, cons: run.cons, lib: run.lib });
  bad([sm.headline, ...sm.paras, ...sm.questions].join(' '), 'game ' + s);
  if (!sm.headline || sm.paras.length < 2 || sm.questions.length < 2) throw new Error('thin summary ' + s);
  if (lvl === 1 && /impeach|scandal level/i.test(JSON.stringify(sm.paras))) throw new Error('core summary mentions scandal/impeachment');
  if (s === 7) sample = sm;
}
const rows = []; for (let s = 1; s <= 12; s++) { const seed = 777, days = 10, lvl = 0; const { log } = playGame(seed, s, { days, lvl }); const run = F.runLog(seed, 'President', log, { days, lvl }); rows.push({ display_name: 'S' + s, score: run.sc.score, completion_status: run.g.over ? 'removed' : 'completed', needle: run.needle, digest: JSON.parse(JSON.stringify(F.digest(eng, run.g))) }); }
const cs = buildClassSummary(eng, rows, 10); bad(cs.paras.join(' '), 'class');
if (cs.paras.length < 4) throw new Error('thin class summary');
if (buildClassSummary(eng, [], 10).paras.length !== 1) throw new Error('empty class summary');
console.log(sample.headline, '\n', sample.paras.join('\n '), '\nQ:', sample.questions.join(' | '), '\n--- class ---\n', cs.paras.join('\n '));
console.log('summary OK');
