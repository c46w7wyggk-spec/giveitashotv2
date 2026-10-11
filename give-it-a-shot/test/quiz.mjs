// The end-of-game quiz: the browser and the classroom edge function must build identical questions from a stored result,
// every question must have four distinct choices with one key, grading must reject malformed answers, a unit focus
// must get three questions from that unit, and answers stored under version 1 must rebuild with the version 1 questions.
import * as Q from '../src/quiz.js';
import * as QC from '../supabase/functions/classroom/quiz.js';
import * as Q1 from '../src/quiz_v1.js';
import { runLog, digest, Engine } from '../src/engine.js';
import { playGame } from './helpers/bot.mjs';
import fs from 'node:fs';
for (const f of ['quiz.js', 'quiz_v1.js']) if (fs.readFileSync(new URL('../src/' + f, import.meta.url), 'utf8') !== fs.readFileSync(new URL('../supabase/functions/classroom/' + f, import.meta.url), 'utf8'))
  throw new Error('classroom/' + f + ' is stale: run npm run make-server-engine');
const eng = new Engine(); const seen = {}, frqs = {}; let n = 0, short = 0;
const units = [null, 'u1', 'u2', 'u3', 'u4', 'u5', 'u6'];
for (let s = 1; s <= 210; s++) {
  const days = [14, 5, 21][s % 3], lvl = s % 2, unit = units[s % 7];
  const { log } = playGame(9000 + s, s, { days, lvl, unit });
  const run = runLog(9000 + s, 'President', log, { days, lvl, unit }); const m = run.sc.m;
  const r = JSON.parse(JSON.stringify({ digest: digest(eng, run.g), econ_growth: m.g, unemployment: m.j, inflation: m.i, deficit: m.d }));
  const a = Q.buildQuiz(r, { focus: unit, titleOf: (id) => eng.pol(id).t }); const b = QC.buildQuiz(r, { focus: unit });
  if (a.mc.length !== Q.MC_COUNT) throw new Error('wrong question count');
  if (JSON.stringify(a.mc.map((x) => [x.id, x.answer])) !== JSON.stringify(b.mc.map((x) => [x.id, x.answer]))) throw new Error('client/server quiz mismatch ' + s);
  if (new Set(a.mc.map((x) => x.id)).size !== a.mc.length) throw new Error('repeated question');
  for (const x of a.mc) {
    if (x.choices.length !== 4 || new Set(x.choices).size !== 4) throw new Error('bad choices ' + x.id);
    if (!(x.answer >= 0 && x.answer < 4) || !x.why) throw new Error('bad key ' + x.id);
    if (/undefined|NaN|that bill/.test(x.q + x.choices.join(''))) throw new Error('unfilled text in ' + x.id + ': ' + x.q);
    seen[x.id.split(':')[0]] = true;
  }
  if (!a.frq || !a.frq.q || a.frq.rubric.length < 3 || a.frq.rubric.length > Q.FRQ_POINTS_MAX || /undefined|NaN/.test(a.frq.q + a.frq.rubric.join(''))) throw new Error('bad written question');
  if (a.frq.id !== b.frq.id) throw new Error('client/server written question mismatch');
  frqs[a.frq.id] = true;
  if (unit && a.mc.filter((x) => x.unit === unit).length < Q.MC_COUNT) short++;
  if (a.v !== Q.QUIZ_VERSION) throw new Error('version');
  // A result answered under version 1 is rebuilt with exactly the version 1 questions.
  const v1 = Q1.buildQuiz(r, { focus: ['u2'].includes(unit) ? null : unit });
  const re = Q.buildQuizFor(Object.assign({ quiz: { v: 1 } }, r), { focus: ['u2'].includes(unit) ? null : unit });
  if (JSON.stringify(v1) !== JSON.stringify(re)) throw new Error('version 1 rebuild changed');
  const right = a.mc.map((x) => x.answer), wrong = a.mc.map((x) => (x.answer + 1) % 4);
  if (Q.gradeQuiz(b, right).correct !== Q.MC_COUNT || Q.gradeQuiz(b, wrong).correct !== 0) throw new Error('grading');
  for (const bad of [null, [], [0, 1], [0, 1, 4], [0, 1, -1], [0, 1, 1.5], ['0', 1, 2], [0, 1, 2, 3]]) if (Q.gradeQuiz(b, bad) !== null) throw new Error('accepted bad answers ' + JSON.stringify(bad));
  n++;
}
if (Q.buildQuiz({ digest: null }) !== null) throw new Error('quiz without a digest');
if (short) throw new Error('a unit focus got fewer than ' + Q.MC_COUNT + ' on-unit questions in ' + short + ' games');
for (const k of ['fiscal', 'phillips', 'shock', 'loanable', 'multiplier', 'market', 'control', 'taxsub', 'nominal', 'urate', 'cpi', 'gdpcount', 'omo', 'mmkt', 'realrate', 'banklend', 'lolr', 'fx', 'tot', 'trade', 'lras'])
  if (!seen[k]) throw new Error('never asked ' + k);
for (const k of ['recession', 'growth', 'indicators', 'monetary', 'forex', 'market', 'control']) if (!frqs[k]) throw new Error('never wrote ' + k);
import { AP_UNITS } from '../src/policies.js';
const ids = new Set(eng.data().POL.map((p) => p.id));
for (const id of Q.referencedBills()) if (!ids.has(id)) throw new Error('quiz names an unknown bill ' + id);
for (const [u, list] of Object.entries(AP_UNITS)) { if (!Q.UNIT_NAMES[u]) throw new Error('unit without a name ' + u); for (const id of list) if (!ids.has(id)) throw new Error(u + ' names an unknown bill ' + id); }
console.log('quiz OK on', n, 'games; question types', Object.keys(seen).sort().join(','), '; written', Object.keys(frqs).sort().join(','));
