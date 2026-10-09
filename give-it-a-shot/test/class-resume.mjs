// Beta 10/09: a student who closes or refreshes the tab mid-way through a class game picks up where they left off.
// Needs a vite dev server on :4175 (npx vite --port 4175) and Playwright in /opt/npm-tools.
import { createRequire } from 'node:module';
import { playLog } from './helpers/bot.mjs';
const { chromium } = createRequire('/opt/npm-tools/node_modules/')('playwright');
const BASE = process.env.BASE || 'http://localhost:4175/';
const b = await chromium.launch(); const p = await (await b.newContext()).newPage();
await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
let fails = 0; const ok = (n, c) => { if (!c) { fails++; console.log('FAIL', n); } else console.log('ok  ', n); };
const info = { seed: 424242, days: 7, difficulty: 0, focus: null, title: 'T', name: 'Sam R.' };
const log = playLog(info.seed, 3, { days: 7, lvl: 0 });
const part = log.slice(0, Math.floor(log.length / 2)).replace(/x$/, '');
const state = () => p.evaluate(() => { const g = window.__app.state.g; return { day: g.day, log: g.log, phase: g.phase, mode: g.mode }; });
await p.goto(BASE); await p.waitForFunction(() => !!window.__app);
await p.evaluate((info) => window.__classPlay(info), info);
await p.evaluate(async (s) => {
  const { applyAction, tokens } = await import('/src/engine.js'); const app = window.__app;
  for (const a of tokens(s)) app.act((g) => { g.log += a; applyAction(app, g, a); });
}, part);
const before = await state();
ok('played part of a class game', before.log === part && before.day > 1);
await p.reload(); await p.waitForFunction(() => !!window.__app);
await p.evaluate((info) => window.__classPlay(info), info);
const after = await state();
ok('after a reload the same class game resumes', after.mode === 'class' && after.log === before.log && after.day === before.day && after.phase === before.phase);
await p.evaluate((info) => window.__classPlay(Object.assign({}, info, { seed: info.seed + 1 })), info);
const other = await state();
ok('a different session starts fresh', other.log === '' && other.day === 1);
await b.close();
console.log(fails ? fails + ' FAILED' : 'class resume OK'); process.exit(fails ? 1 : 0);
