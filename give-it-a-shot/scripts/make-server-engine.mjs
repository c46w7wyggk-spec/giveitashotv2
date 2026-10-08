// Builds a slim copy of the engine for the edge functions: identical logic and RNG consumption,
// but long flavor-text strings (headlines, blurbs) are blanked since the server only needs the score.
// test/replay-slim.mjs proves the slim engine scores identically to the full one.
import fs from 'node:fs';
const rd = (p) => fs.readFileSync(new URL('../src/' + p, import.meta.url), 'utf8');
const bare = (s) => s.replace(/^import .*$/gm, '').replace(/^export \{[^}]*\} from .*$/gm, '').replace(/^export const/gm, 'const');
// The server only needs each bill's numbers and tree fields, so the catalog is written out as compact data instead of the P(...) calls.
const { POL2 } = await import('../src/policies.js');
const keep = ['id', 'tp', 'lean', 'f', 'sd', 'ang', 'who', 'wd', 'req', 'dl', 'slot', 'sys', 'kill'];
const slimPol = POL2.map((p) => { const o = {}; keep.forEach((k) => { if (p[k] !== undefined) o[k] = p[k]; }); o.hlx = ['', '']; return o; });
const catalog = 'const POL2 = ' + JSON.stringify(slimPol).replace(/"([a-z0-9]+)":/g, '$1:').replace(/"/g, "'") + ';';
const inlined = [bare(rd('policies/base_tree.js')), catalog, bare(rd('xactions.js'))].join('\n');
const src = rd('engine.js').replace(/^import \{ XA \} from '\.\/xactions\.js';\s*$/m, () => inlined).replace(/^import \{ POL2[^\n]*\n/m, '');
const out = src
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/'(?:[^'\\\n]|\\.)*'/g, (m) => (m.length - 2 > 15 ? "''" : m))
  .replace(/^[ \t]+/gm, '').replace(/\n\s*\n+/g, '\n')
  .replace(/,\nreal: '',\npro: '', con: '',\nhl: ''\s*\}/g, ' }')
  .replace(/, real: '', pro: '', con: '', hl: '', hlx:/g, ', hlx:')
  .replace(/\bt: '', m: '', /g, '');
if (/^import /m.test(out)) throw new Error('slim engine still has an import');
// Every edge function that replays games gets the same slim engine.
for (const fn of ['submit-score', 'classroom']) fs.writeFileSync(new URL('../supabase/functions/' + fn + '/engine.js', import.meta.url), out);
console.log('full', src.length, 'slim', out.length);
