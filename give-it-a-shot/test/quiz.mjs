// The end-of-game quiz: the browser and the classroom edge function must build identical questions from a stored result,
// every question must have four distinct choices with one key, grading must reject malformed answers, and a unit focus
// must lead with that unit's questions when the game produced one.
import * as Q from '../src/quiz.js';
import * as QC from '../supabase/functions/classroom/quiz.js';
import { runLog, digest, Engine } from '../src/engine.js';
import { playGame } from './helpers/bot.mjs';
import fs from 'node:fs';
if (fs.readFileSync(new URL('../src/quiz.js', import.meta.url), 'utf8') !== fs.readFileSync(new URL('../supabase/functions/classroom/quiz.js', import.meta.url), 'utf8'))
  throw new Error('classroom/quiz.js is stale: run npm run make-server-engine');
const eng = new Engine(); const seen = {}; let n = 0, led = 0, could = 0;
const units = [null, 'u1', 'u3', 'u4', 'u5', 'u6'];
for (let s = 1; s <= 150; s++) {
  const days = [14, 5, 21][s % 3], lvl = s % 2, unit = units[s % 6];
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
  if (!a.frq || !a.frq.q || a.frq.rubric.length < 3 || /undefined|NaN/.test(a.frq.q)) throw new Error('bad written question');
  if (unit) { const all = Q.buildQuiz(r, { focus: null }); const has = all ? Q.buildQuiz(r, { focus: unit }).mc.some((x) => x.unit === unit) : false; if (has) { could++; if (a.mc[0].unit === unit) led++; } }
  const right = a.mc.map((x) => x.answer), wrong = a.mc.map((x) => (x.answer + 1) % 4);
  if (Q.gradeQuiz(b, right).correct !== Q.MC_COUNT || Q.gradeQuiz(b, wrong).correct !== 0) throw new Error('grading');
  for (const bad of [null, [], [0, 1], [0, 1, 4], [0, 1, -1], [0, 1, 1.5], ['0', 1, 2], [0, 1, 2, 3]]) if (Q.gradeQuiz(b, bad) !== null) throw new Error('accepted bad answers ' + JSON.stringify(bad));
  n++;
}
if (Q.buildQuiz({ digest: null }) !== null) throw new Error('quiz without a digest');
if (led !== could) throw new Error('unit focus did not lead: ' + led + ' of ' + could);
for (const k of ['fiscal', 'phillips', 'shock', 'loanable', 'multiplier']) if (!seen[k]) throw new Error('never asked ' + k);
import { AP_UNITS } from '../src/policies.js';
const ids = new Set(eng.data().POL.map((p) => p.id));
for (const id of Q.referencedBills()) if (!ids.has(id)) throw new Error('quiz names an unknown bill ' + id);
for (const [u, list] of Object.entries(AP_UNITS)) { if (!Q.UNIT_NAMES[u]) throw new Error('unit without a name ' + u); for (const id of list) if (!ids.has(id)) throw new Error(u + ' names an unknown bill ' + id); }
console.log('quiz OK on', n, 'games; question types', Object.keys(seen).sort().join(','));
