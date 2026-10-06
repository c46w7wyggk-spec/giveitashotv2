// Builds a slim copy of the engine for the edge function: identical logic and RNG consumption,
// but long flavor-text strings (headlines, blurbs) are blanked since the server only needs the score.
// test/replay-slim.mjs proves the slim engine scores identically to the full one.
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../src/engine.js', import.meta.url), 'utf8');
const out = src
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/'(?:[^'\\\n]|\\.)*'/g, (m) => (m.length - 2 > 15 ? "''" : m))
  .replace(/^[ \t]+/gm, '').replace(/\n\s*\n+/g, '\n');
fs.writeFileSync(new URL('../supabase/functions/submit-score/engine.js', import.meta.url), out);
console.log('full', src.length, 'slim', out.length);
