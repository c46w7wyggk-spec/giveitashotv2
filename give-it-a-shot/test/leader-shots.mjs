import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const OUT = '/tmp/claude-0/-home-claude/c5c287cf-83a5-5f1d-b586-c681fd0fd053/scratchpad/lshots';
import fs from 'node:fs'; fs.mkdirSync(OUT, { recursive: true });
const which = process.argv[2] || 'desktop';
const b = await chromium.launch();
const ctx = await b.newContext(which === 'phone' ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } });
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', (e) => errs.push('pageerror ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push('console ' + m.text()); });
await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await p.goto('http://localhost:4173/'); await p.waitForTimeout(500);
const shot = async (n) => { await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/${which}-${n}.png` }); };
await p.getByRole('button', { name: /Supreme Leader/ }).first().click(); await shot('1-name');
await p.getByRole('button', { name: /Next: choose your policies/ }).click(); await shot('2-pol');
const cards = p.locator('#lapp .grid3 .opt'); for (let i = 0; i < 5; i++) await cards.nth(i).click();
await shot('2b-pol-picked');
await p.getByRole('button', { name: /Lock in/ }).click(); await shot('3-con');
await p.locator('#lapp .grid2 .opt').first().click(); await p.getByRole('button', { name: /Take power/ }).click(); await shot('4-map');
await p.getByRole('button', { name: /Read today|Go to my desk|Go to the desk/ }).first().click(); await shot('5-desk');
for (let step = 0; step < 4; step++) {
  const ev = p.locator('#lapp .page .grid2 .opt'); if (await p.getByText('YOUR MOVE').count()) { await ev.first().click(); await p.waitForTimeout(300); }
  if (await p.getByText('Take one action today').count()) { await p.locator('#lapp .arow').nth(8).click(); await shot('6-action'); await p.getByRole('button', { name: /^Do it$/ }).click().catch(() => {}); await shot('7-after-action'); await p.getByRole('button', { name: /End the day/ }).click(); await shot('8-brief'); break; }
}
await p.getByRole('button', { name: /Start day/ }).click().catch(() => {}); await shot('9-day2');
await p.getByRole('button', { name: 'World', exact: true }).click(); await shot('10-world');
console.log('errors:', errs.length ? errs.join('\n') : 'none');
await b.close();
