// Mobile sweep: no horizontal overflow on any main screen at common phone/tablet widths, both modes.
import { createRequire } from 'node:module';
const { chromium } = createRequire('/opt/npm-tools/node_modules/')('playwright');
const b = await chromium.launch(); let bad = 0;
for (const w of [320, 360, 390, 430, 768]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.goto('http://localhost:4173/'); await p.waitForTimeout(300);
  const check = async (label) => {
    await p.waitForTimeout(250);
    const r = await p.evaluate((w) => {
      const out = []; const root = document.querySelector('#lapp:not([hidden])') || document.querySelector('#app');
      if (document.documentElement.scrollWidth > w + 1) out.push('page scrollWidth ' + document.documentElement.scrollWidth);
      root.querySelectorAll('*').forEach((el) => { const r = el.getBoundingClientRect(); if (r.width && el.closest('svg') === null && (r.right > w + 1 || r.left < -1) && getComputedStyle(el).position !== 'fixed') { let sc = false; for (let a = el.parentElement; a && a !== root; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') { sc = true; break; } } if (!sc && out.length < 4) out.push((el.className || el.tagName) + ' ' + Math.round(r.left) + '..' + Math.round(r.right)); } });
      return out;
    }, w);
    if (r.length) { bad++; console.log(w, label, 'OVERFLOW', r); }
  };
  // President
  await p.evaluate(() => window.__app.setState({ user: { id: 'x', email: 'a@student.uaustin.org' } }));
  await check('pres-title');
  await p.getByRole('button', { name: /Begin Day 1/ }).click(); await check('pres-map');
  for (const t of ['Desk', 'Press', 'Scores']) { await p.getByRole('button', { name: t, exact: true }).first().click().catch(() => {}); await check('pres-' + t); }
  // Leader
  await p.evaluate(() => window.__showLeader()); await p.waitForTimeout(300); await check('lead-name');
  await p.getByRole('button', { name: /Next: choose your policies/ }).click(); await check('lead-pol');
  const cards = p.locator('#lapp .grid3 .opt'); for (let i = 0; i < 5; i++) await cards.nth(i).click(); await check('lead-pol5');
  await p.getByRole('button', { name: /Lock in/ }).click(); await check('lead-con');
  await p.locator('#lapp .grid2 .opt').first().click(); await p.getByRole('button', { name: /Take power/ }).click(); await check('lead-map');
  await p.getByRole('button', { name: /Read today|Go to my desk|Go to the desk/ }).first().click(); await check('lead-event');
  if (await p.getByText('YOUR MOVE').count()) { await p.locator('#lapp .page .grid2 .opt').first().click(); await check('lead-desk'); }
  for (const c of ['Security', 'Dirty', 'Abroad']) { await p.getByRole('button', { name: c, exact: true }).click().catch(() => {}); await check('lead-' + c); }
  await p.getByRole('button', { name: 'World', exact: true }).click(); await check('lead-world');
  if (errs.length) { bad++; console.log(w, 'JS errors', errs); }
  await ctx.close();
}
console.log(bad ? bad + ' problems' : 'mobile sweep clean');
await b.close();
