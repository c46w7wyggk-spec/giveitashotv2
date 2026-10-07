import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const OUT = '/tmp/claude-0/-home-claude/c5c287cf-83a5-5f1d-b586-c681fd0fd053/scratchpad/v2shots';
const which = process.argv[2] || 'desktop';
const b = await chromium.launch();
const ctx = await b.newContext(which === 'phone' ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await p.goto('http://localhost:4173/'); await p.waitForTimeout(500);
await p.evaluate(() => { localStorage.setItem('gias_tut_v2', 'done'); window.__app.noDelay = true; window.__app.setState({ tut: -1 }); });
await p.getByRole('button', { name: /Begin Day 1/ }).click();
const shot = async (n) => { await p.waitForTimeout(1200); await p.screenshot({ path: `${OUT}/${which}-s-${n}.png` }); };
// trial
await p.evaluate(() => { const a = window.__app; const g = JSON.parse(JSON.stringify(a.state.g)); g.phase = 'trial'; g.day = 6; g.cong = 12; g.scand = 38; g.cap = 4; g.imp = { st: 'trial', w: 5, r: 1, conv: 61 }; g.news = []; a.setState({ g, tab: 'desk' }); });
await shot('trial');
// revolt
await p.evaluate(() => { const a = window.__app; const g = JSON.parse(JSON.stringify(a.state.g)); g.phase = 'incident'; g.imp = null; g.cap = 2; g.inc = [{ k: 'revolt' }]; a.setState({ g, tab: 'desk' }); });
await shot('revolt');
// exec detail on a dark action, panel open
await p.evaluate(() => { const a = window.__app; const g = JSON.parse(JSON.stringify(a.state.g)); g.phase = 'desk'; g.inc = []; g.cap = 6; g.mi = 3; a.setState({ g, tab: 'desk', xopen: true, xcat: 'power', xsel: 'cronies' }); });
await shot('exec-dark');
// end screen
await p.evaluate(() => { const a = window.__app; const g = JSON.parse(JSON.stringify(a.state.g)); g.phase = 'end'; g.day = 14; g.over = false; g.inc = []; a.setState({ g, tab: 'desk', xopen: false }); });
await shot('end');
await p.evaluate(() => { document.querySelector('#stage').scrollTo(0, 99999); window.scrollTo(0, 99999); });
await shot('end2');
await p.getByRole('button', { name: /^Scores$/ }).first().click().catch(() => {}); await shot('scores');
await p.evaluate(() => window.__app.setState({ tab: 'desk' }));
const sb = p.getByRole('button', { name: /Sign in/i }).first();
if (await sb.count()) { await sb.click().catch(() => {}); await shot('auth'); }
console.log('errors:', errs.length ? errs.join('\n') : 'none');
await b.close();
