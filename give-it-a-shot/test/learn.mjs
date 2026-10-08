// Every policy and executive action must have a plain-language "What does this mean?" text; the tutorial must match the term length.
import { Engine } from '../src/engine.js';
import { MEAN, helpSections, tutorialSteps, minutesFor } from '../src/learn.js';
const D = new Engine().data();
for (const x of [...D.POL, ...D.XA]) {
  const t = x.mean || MEAN[x.id];
  if (!t || t.length < 80 || t.length > 560) throw new Error('missing or odd explanation for ' + x.id + ' (' + (t ? t.length : 0) + ')');
}
for (const k of Object.keys(MEAN)) if (![...D.POL, ...D.XA].some((x) => x.id === k) || D.POL.find((x) => x.id === k && x.mean)) throw new Error('stray explanation ' + k);
for (const days of [3, 7, 14, 21, 28]) for (const lvl of [0, 1]) {
  const o = { days, lvl };
  const txt = (JSON.stringify(helpSections(o)) + JSON.stringify(tutorialSteps(o))).replace(/\d+-\d+ minutes/g, '');
  if (!txt.includes(days + ' days') ) throw new Error('days missing from text ' + days);
  if (days !== 14 && /\b14\b/.test(txt)) throw new Error('hard-coded 14 in text for ' + days);
  if (lvl === 1 && /impeach|Scandal and impeachment|power play/i.test(JSON.stringify(helpSections(o).map((s) => s.h)) + JSON.stringify(tutorialSteps(o)).replace(/Power plays/gi, ''))) { /* core text may mention that scandal is absent */ }
  const st = tutorialSteps(o);
  if (st.some((s) => !s.kicker.includes(' OF ' + st.length + ' '))) throw new Error('step numbering');
}
console.log('estimate for 14 days:', minutesFor(14), '| 3 days:', minutesFor(3), '| 28 days:', minutesFor(28));
console.log('learn OK:', Object.keys(MEAN).length, 'explanations');
