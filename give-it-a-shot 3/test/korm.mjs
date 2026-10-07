// Kormanik Challenge: card visibility, win/lose evaluation and no posting.
import { createRequire } from 'node:module';
const { chromium } = createRequire('/opt/npm-tools/node_modules/')('playwright');
const b = await chromium.launch(); const pg = await b.newPage();
await pg.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await pg.goto('http://localhost:4173/');
await pg.waitForFunction(() => window.__app);
let vis = await pg.evaluate(() => document.body.innerText.includes('Kormanik Challenge'));
console.log('visible when signed out:', vis);
await pg.evaluate(() => window.__app.setState({ user: { id: 'x', email: 'a@student.uaustin.org' } }));
vis = await pg.evaluate(() => document.body.innerText.includes('Kormanik Challenge'));
console.log('visible as UATX:', vis);
await pg.evaluate(() => window.__app.setState({ user: { id: 'y', email: 'a@gmail.com' } }));
console.log('visible as gmail:', await pg.evaluate(() => document.body.innerText.includes('Kormanik Challenge')));
await pg.evaluate(() => window.__app.setState({ user: { id: 'x', email: 'a@student.uaustin.org' } }));
await pg.click('text=Kormanik Challenge');
console.log('mode:', await pg.evaluate(() => window.__app.state.mode), 'begin label ok:', await pg.evaluate(() => document.body.innerText.includes('Take the Challenge')));
// play a full challenge run in the page with a right-leaning policy and check the result card
await pg.evaluate(() => {
  const a = window.__app; let n = 0;
  a.state.g.phase === 'title' && document.querySelector('.btn.btn-lg.gold').click();
  while (a.state.g.phase !== 'end' && n++ < 400) {
    const g = a.state.g;
    if (g.phase === 'desk') { if (g.mi < g.memos.length) a.act((x) => { const p = a.pol(x.memos[x.mi].id); x.memos[x.mi].dec = p.lean > 0 ? 'sign' : 'veto'; x.mi++; }); else a.act((x) => { x.log += 'e'; a.endDay(x); }); }
    else if (g.phase === 'incident') a.act((x) => { a.resolveIncident(x, 0); });
    else if (g.phase === 'trial') a.act((x) => { a.resolveTrial(x, 1); });
    else a.act((x) => { x.log += 'n'; a.nextMorning(x); });
  }
});
await pg.waitForTimeout(500);
const txt = await pg.evaluate(() => document.body.innerText);
console.log('end screen:', /KORMANIK CHALLENGE: (COMPLETE|NOT YET)/.exec(txt)?.[0], '| unranked text:', txt.includes('Challenge run: unranked'), '| post button hidden:', !/Post score/.test(txt));
await b.close();
