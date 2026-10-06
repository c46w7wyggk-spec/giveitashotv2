import { createRequire } from 'node:module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
import fs from 'node:fs';
const OUT = process.env.SHOTS || '/tmp/claude-0/-home-claude/c5c287cf-83a5-5f1d-b586-c681fd0fd053/scratchpad/shots2';
fs.mkdirSync(OUT, { recursive: true });
const sizes = [['phone', 390, 844], ['tablet', 820, 1180], ['laptop', 1440, 900]];
const browser = await chromium.launch();
for (const [name, w, h] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: w < 900, isMobile: w < 900 });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=You have 14 days in office');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}-1-title.png` });
  const overflow = async (label) => {
    const r = await page.evaluate(() => {
      const bad = [];
      const vw = document.documentElement.clientWidth;
      for (const el of document.querySelectorAll('#app *')) {
        const b = el.getBoundingClientRect();
        if (b.width > 0 && (b.right > vw + 1 || b.left < -1) && !el.closest('svg') && !el.closest('[style*="animation"]')) bad.push(el.tagName + ':' + (el.textContent || '').slice(0, 30) + ' r=' + Math.round(b.right));
      }
      return { vw, sw: document.documentElement.scrollWidth, bad: bad.slice(0, 5) };
    });
    console.log(name, label, 'overflow:', r.sw > r.vw ? 'PAGE' : 'ok', r.bad.length ? r.bad : '');
  };
  await overflow('title');
  await page.evaluate(() => { window.__app.noDelay = true; });
  await page.click('button:has-text("Begin")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}-2-desk.png` });
  await overflow('desk');
  await page.click('button:has-text("Map")'); await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}-3-map.png` }); await overflow('map');
  await page.click('button:has-text("Scores")'); await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}-4-scores.png` }); await overflow('scores');
  await page.click('button:has-text("Oval Office")');
  // play to the end quickly
  for (let i = 0; i < 400; i++) {
    const ph = await page.evaluate(() => window.__app.state.g.phase);
    if (ph === 'end') break;
    if (ph === 'desk') { if (await page.locator('button:has-text("End the day")').count()) await page.click('button:has-text("End the day")'); else await page.click(i % 2 ? 'button:has-text("Sign it")' : 'button:has-text("Veto")'); }
    else if (ph === 'incident') { const o = page.locator('.g2 > button'); await o.nth(0).click(); }
    else await page.click('button:has-text("Start day"), button:has-text("See your legacy")');
    await page.waitForTimeout(10);
  }
  await page.waitForSelector('text=FINAL SCORE'); await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${name}-5-end.png` }); await overflow('end');
  await page.click('button:has-text("Sign in to post")'); await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}-6-auth.png` }); await overflow('auth');
  console.log(name, 'errors:', errs.length ? errs : 'none');
  await ctx.close();
}
await browser.close();
