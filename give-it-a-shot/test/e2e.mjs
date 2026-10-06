import { createRequire } from 'node:module';
import { runLog, dailySeed, utcDate } from '../src/engine.js';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const OUT = process.env.SHOTS || '/tmp/claude-0/-home-claude/c5c287cf-83a5-5f1d-b586-c681fd0fd053/scratchpad/shots';
import fs from 'node:fs'; fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 880 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/supabase|Failed to load resource|net::ERR|fonts/i.test(m.text())) errors.push('console: ' + m.text()); });
await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('text=You have 14 days in office');
await page.screenshot({ path: OUT + '/1-title.png' });

async function playGame(label) {
  await page.evaluate(() => { window.__app.noDelay = true; });
  await page.click('button:has-text("Begin")');
  let steps = 0;
  while (steps++ < 400) {
    const phase = await page.evaluate(() => window.__app.state.g.phase + ':' + (window.__app.state.g.inc[0] ? window.__app.state.g.inc[0].k : ''));
    if (phase.startsWith('end')) break;
    if (phase.startsWith('desk')) {
      const quiet = await page.locator('button:has-text("End the day")').count();
      if (quiet) await page.click('button:has-text("End the day")');
      else await page.click(Math.random() < 0.5 ? 'button:has-text("Sign it")' : 'button:has-text("Veto")');
    } else if (phase.startsWith('incident')) {
      const n = await page.locator('section button:has(span:nth-child(3))').count();
      const opts = page.locator('div[style*="grid-template-columns: 1fr 1fr; gap: 10px"] > button');
      const c = await opts.count(); await opts.nth(Math.floor(Math.random() * c)).click();
    } else if (phase.startsWith('brief')) {
      if (steps % 7 === 0) { await page.locator('button:has-text("Tap to read the story")').first().click().catch(() => {}); await page.waitForTimeout(80); await page.click('button:has-text("Back to the desk")').catch(() => {}); }
      await page.click('button:has-text("Start day"), button:has-text("See your legacy")');
    }
    await page.waitForTimeout(15);
  }
  await page.waitForSelector('text=FINAL SCORE');
  const info = await page.evaluate(() => { const g = window.__app.state.g; return { seed: g.seed0, role: g.title, log: g.log, mode: g.mode, dd: g.dd }; });
  const shown = await page.evaluate(() => +document.querySelector('div[style*="font-size: 64px"]').textContent);
  const r = runLog(info.seed, info.role, info.log);
  console.log(label, 'log len', info.log.length, '| screen', shown, '| replay', r.sc.score, shown === r.sc.score ? 'MATCH' : 'MISMATCH');
  if (shown !== r.sc.score) throw new Error('replay mismatch');
  return info;
}
const free = await playGame('free');
await page.waitForTimeout(700);
await page.screenshot({ path: OUT + '/2-end.png', fullPage: false });
await page.locator('section').first().evaluate((s) => s.scrollTo(0, 99999));
await page.screenshot({ path: OUT + '/3-end-bottom.png' });

// share card
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.click('button:has-text("Share your result")')]);
await dl.saveAs(OUT + '/share.png'); console.log('share download', dl.suggestedFilename());

// auth modal
await page.click('button:has-text("Sign in to post")');
await page.waitForSelector('text=Sign in to post scores');
await page.fill('input[type=email]', 'not-an-email'); await page.click('button:has-text("Email me")');
console.log('bad email msg:', await page.locator('text=valid email').count());
await page.screenshot({ path: OUT + '/4-auth.png' });
await page.click('[aria-label=Close]', { position: { x: 20, y: 20 } });

// scores tab
await page.click('button:has-text("Scores")'); await page.waitForTimeout(800);
await page.screenshot({ path: OUT + '/5-scores.png' });

// daily mode
await page.click('button:has-text("Oval Office")');
await page.click('button:has-text("Play again")').catch(() => {});
await page.waitForSelector('text=CHOOSE A MODE').catch(() => {});
const bad = await page.evaluate(() => 0);
await page.click('button:has-text("Daily Executive")');
const d = await page.evaluate(() => ({ seed: window.__app.state.g.seed0, dd: window.__app.state.g.dd, mode: window.__app.state.g.mode }));
console.log('daily', d, d.seed === dailySeed(utcDate()) ? 'seed OK' : 'SEED BAD');
const again = await page.evaluate(() => window.__app.state.g.phase);
await page.screenshot({ path: OUT + '/6-daily.png' });
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
