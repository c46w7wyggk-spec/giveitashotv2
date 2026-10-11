// AP Macroeconomics check-up built from one student's own classroom game. Pure and deterministic: the student's browser,
// the teacher's browser and the classroom edge function all build the same questions from the same stored result,
// so the server can grade the multiple-choice answers itself. The edge function gets verbatim copies of this file and
// quiz_v1.js (scripts/make-server-engine.mjs). Bill titles are optional (titleOf); the server builds questions without them.
//
// r: a stored classroom result { digest, econ_growth, unemployment, inflation, deficit, quiz? }.
// opts: { focus: AP unit key or null, titleOf: (billId) => title }
//
// Version 2: every unit has at least three questions it can always ask (built from the student's own numbers when the
// game gave none), so a unit focus gets three on-unit questions; the written response follows the unit too; and the
// numbers in the calculation questions differ from student to student. Answers stored under version 1 are rebuilt with
// quiz_v1.js (buildQuizFor).
import { buildQuiz as buildQuizV1 } from './quiz_v1.js';

export const QUIZ_VERSION = 2;
export const MC_COUNT = 3;
export const FRQ_MAX = 1200;
export const FRQ_POINTS_MAX = 6;

export const UNIT_NAMES = {
  u1: 'Unit 1: Basic economic concepts',
  u2: 'Unit 2: Economic indicators and the business cycle',
  u3: 'Unit 3: National income, price determination and fiscal policy',
  u4: 'Unit 4: The financial sector and monetary policy',
  u5: 'Unit 5: Long-run consequences of stabilization policies',
  u6: 'Unit 6: The open economy',
};

const START = { g: 2.0, j: 4.3, i: 3.0, d: 5.8, r: 4.5 };
const NATURAL = 4.3;
const FISCAL = {
  tc: ['stdded', 'salt', 'taxfree', 'payrollhol', 'cg0', 'corp15', 'estate', 'charity', 'cgindex', 'rdcredit', 'gasholiday', 'eitc', 'ctc', 'eitcless'],
  ti: ['top70', 'wealth', 'progbrk', 'closeloop', 'minimumtax', 'dividendtax', 'unrealized'],
  su: ['infra', 'jobg', 'ubi', 'ssx', 'hsr', 'gridfund', 'portinfra', 'waterinfra', 'transitfund', 'broadband', 'defup', 'teacherpay', 'college',
    'prek', 'meals', 'ccollege', 'tenantaid', 'housevoucher', 'firsthome', 'wildfire', 'nursefund', 'chips', 'uireform'],
  sd: ['cut10', 'defcut', 'aidcut', 'medadv'],
};
const FLOORS = { mw15: 'low-wage labor', tippedwage: 'restaurant servers', mwregion: 'low-wage labor' };
const CEILINGS = { rc: 'rental housing', gascap: 'gasoline', ccap: 'credit-card loans', payday: 'small loans' };
// Bills that act on one market like a tax, a subsidy, or a rule that lets more sellers in (or the reverse).
const MARKET_POL = {
  sugar: ['sugary drinks', 'tax'], carbon: ['coal, oil and gas', 'tax'], evtax: ['electric cars', 'tax'], gasholiday: ['gasoline', 'untax'],
  nukesub: ['nuclear power', 'sub'], chips: ['computer chips', 'sub'], cropins: ['corn, wheat and cotton', 'sub'], farmsub: ['corn, wheat and cotton', 'unsub'],
  lic: ['services like hair braiding and flower arranging', 'entry'], scopeprac: ['routine medical care', 'entry'], certneed: ['hospital care', 'entry'], zone: ['housing near jobs and transit', 'entry'],
};
const TARIFFS = ['tar25', 'targettariff'];
const OPENING = ['trade', 'pacpact'];
// Bills aimed at one kind of unemployment, and bills that tie a dollar amount to inflation.
const UTYPE = { uireform: 'frictional', noncompete: 'frictional', jobtrain: 'structural', taa: 'structural', gasbridge: 'structural', apprentice: 'structural', tradeschool: 'structural', reentry: 'structural' };
const INDEXED = { mwindex: 'the minimum wage', cgindex: 'what investors paid for their assets' };
// What the government's money pays for: transfers are not part of GDP until spent; purchases are G.
const TRANSFERS = ['ubi', 'ssx', 'eitc', 'ctc', 'eitcless', 'ctcmonth', 'housevoucher', 'tenantaid'];
const PURCHASES = ['infra', 'hsr', 'broadband', 'gridfund', 'portinfra', 'waterinfra', 'transitfund', 'defup', 'teacherpay'];
// Bills that add to capital, skills or technology (long-run aggregate supply).
const GROWTH = ['rdcredit', 'jobtrain', 'apprentice', 'tradeschool', 'stem', 'infra', 'broadband', 'permit', 'visa', 'prek', 'zone', 'lic'];
// Events and the market each one hits first: [what happened, the market, 'd' demand or 's' supply, +1 up or -1 down].
const SHOCKS = {
  hurricane: ['a hurricane destroyed homes, roads and businesses', 'sras'],
  quake: ['an earthquake damaged buildings and factories', 'sras'],
  fire: ['wildfires burned homes and businesses', 'sras'],
  tornado: ['tornadoes tore through towns and factories', 'sras'],
  war_oil: ['war broke out in an oil-producing region and oil prices jumped', 'sras'],
  cyber: ['a cyberattack knocked out part of the power grid', 'sras'],
  crash: ['the stock market crashed and a major bank wobbled', 'adl'],
  boom: ['an AI productivity boom raised what workers can produce', 'lras'],
};
const MARKETS = {
  hurricane: ['a hurricane destroyed homes in one state', 'lumber and roofing in that state', 'd', 1],
  quake: ['an earthquake damaged buildings in one state', 'construction work in that state', 'd', 1],
  fire: ['wildfires burned through one state', 'air purifiers in that state', 'd', 1],
  tornado: ['tornadoes tore through towns in one state', 'lumber and roofing in that state', 'd', 1],
  war_oil: ['war broke out in an oil-producing region', 'gasoline', 's', -1],
  pandemic: ['a fast-moving flu spread through the cities', 'face masks and cold medicine', 'd', 1],
  cyber: ['a cyberattack knocked out part of the power grid', 'portable generators', 'd', 1],
  boom: ['an AI productivity boom swept through offices', 'computer chips for AI', 'd', 1],
};

const r1 = (v) => Math.round(Number(v) * 10) / 10;
const f1 = (v) => r1(v).toFixed(1);
const f2 = (v) => (Math.round(Number(v) * 100) / 100).toFixed(2);
const commas = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const usd = (n) => '$' + commas(n);
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
// A small deterministic random stream for one question, so the numbers differ by student but match everywhere.
function stream(seed) { let h = hash(seed) || 1; return () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; }; }
const pickOf = (rnd, arr) => arr[Math.floor(rnd() * arr.length) % arr.length];
// Shuffles the choices the same way everywhere; returns the item with `answer` pointing at the correct choice's new index.
function mc(id, unit, q, right, wrong, why, salt) {
  const all = [right].concat(wrong);
  let h = hash(id + '|' + salt);
  const idx = all.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; const j = h % (i + 1); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
  return { id, unit, kind: 'mc', q, choices: idx.map((i) => all[i]), answer: idx.indexOf(0), why };
}
// Three distinct wrong numbers, formatted, from the candidates (then generic fallbacks).
function wrongNums(right, cands, fmt) {
  const r = fmt(right), out = [];
  for (const c of cands.concat([right * 2, right / 2, right + 1, right - 1, right * 3, right + 2.5])) {
    if (!isFinite(c)) continue;
    const s = fmt(c); if (s !== r && out.indexOf(s) < 0) out.push(s);
    if (out.length === 3) break;
  }
  return out;
}
const firstIn = (ids, list) => ids.find((x) => list.indexOf(x) >= 0);
// Every bill id this file names, so test/quiz.mjs can check they all exist in the catalog.
export const referencedBills = () => [].concat(...Object.values(FISCAL), Object.keys(FLOORS), Object.keys(CEILINGS), Object.keys(MARKET_POL), TARIFFS, OPENING,
  Object.keys(UTYPE), Object.keys(INDEXED), TRANSFERS, PURCHASES, GROWTH, ['fedsingle', 'fedtarget3']);

// The facts about one student's game that the questions are built from.
function facts(r, o) {
  const d = r.digest;
  const signed = (d.signed || []).filter((x) => (d.repealed || []).indexOf(x) < 0);
  const evs = (d.ev || []).map((x) => { const p = String(x).split(':'); return { day: +p[0], id: p[1] }; });
  const evo = {}; (d.evo || []).forEach((x) => { const p = String(x).split(':'); evo[p[1]] = +p[2]; });
  const fed = Array.isArray(d.fed) && d.fed.length ? d.fed : null;
  const end = { g: r1(r.econ_growth), j: r1(r.unemployment), i: r1(r.inflation), d: r1(r.deficit) };
  const rate = fed ? fed[fed.length - 1] : START.r;
  const title = (id) => { const t = o.titleOf ? o.titleOf(id) : ''; return t ? '“' + t + '”' : 'that bill'; };
  return { d, signed, evs, evo, fed, end, rate, title, xa: d.xa || [], salt: signed.join(',') + '|' + (d.ev || []).join(',') + '|' + f1(end.j) + f1(end.i) };
}

// ------------------------------------------------------------------ the questions
// Each builder returns an item or null. `g: true` marks a question about a decision or event in the student's own game;
// the others are calculations that use the student's numbers. A unit with no game question still has three of its own.
function allItems(F) {
  const { signed, evs, evo, fed, end, rate, title, salt } = F;
  const out = [];
  const add = (it, game) => { if (it) { it.g = !!game; out.push(it); } };
  const R = (id) => stream(id + '|' + salt);
  const dj = end.j - START.j, di = end.i - START.i, dd = end.d - START.d;
  const moved = fed ? rate - START.r : 0;

  // ---------------- Unit 1
  { const ev = evs.find((e) => MARKETS[e.id]);
    if (ev) {
      const m = MARKETS[ev.id];
      const C = { d1: 'Demand increased: the equilibrium price and quantity both rose', d0: 'Demand decreased: the equilibrium price and quantity both fell',
        s1: 'Supply increased: the equilibrium price fell and the quantity rose', s0: 'Supply decreased: the equilibrium price rose and the quantity fell' };
      const k = m[2] + (m[3] > 0 ? '1' : '0');
      add(mc('market:' + ev.id, 'u1', 'On day ' + ev.day + ' of your term, ' + m[0] + '. In the market for ' + m[1] + ', what most likely happened?', C[k],
        Object.keys(C).filter((x) => x !== k).map((x) => C[x]),
        m[2] === 'd' ? 'The event made more buyers want ' + m[1] + ' at every price, so demand shifted right. A rightward demand shift raises both the equilibrium price and quantity.'
          : 'The event made ' + m[1] + ' costlier to produce and bring to market, so supply shifted left. A leftward supply shift raises the equilibrium price and lowers the quantity.', salt), true);
    } }
  { const pf = firstIn(signed, Object.keys(FLOORS)), pc = firstIn(signed, Object.keys(CEILINGS));
    if (pf || pc) {
      const floor = !!pf && (!pc || signed.indexOf(pf) < signed.indexOf(pc));
      const id = floor ? pf : pc, mk = floor ? FLOORS[id] : CEILINGS[id];
      const right = floor ? 'A surplus: more workers want jobs at that wage than employers want to hire' : 'A shortage: people want more ' + mk + ' than sellers offer at that price';
      const pool = [right, floor ? 'A shortage: employers want to hire more workers than are available at that wage' : 'A surplus: sellers offer more ' + mk + ' than people want at that price',
        'A higher equilibrium quantity bought and sold', 'No change, because price controls only affect the government budget'];
      add(mc('control:' + id, 'u1', 'You signed ' + title(id) + '. If it is set ' + (floor ? 'above' : 'below') + ' the market equilibrium, it acts as a binding price ' + (floor ? 'floor' : 'ceiling') + '. The most likely result is:',
        right, pool.filter((x) => x !== right).slice(0, 3),
        floor ? 'A price floor above equilibrium makes the quantity supplied (workers looking for jobs) exceed the quantity demanded (jobs employers offer).'
          : 'A price ceiling below equilibrium makes the quantity demanded exceed the quantity supplied, so there is a shortage.', salt), true);
    } }
  { const id = firstIn(signed, Object.keys(MARKET_POL));
    if (id) {
      const [mk, kind] = MARKET_POL[id];
      const up = kind === 'tax' || kind === 'unsub';
      const A = 'The price buyers pay rises and the quantity sold falls', B = 'The price buyers pay falls and the quantity sold rises';
      const why = { tax: 'A tax on sellers shifts supply left (up by the amount of the tax). Buyers pay more, less is sold, and some trades that were worth making no longer happen (deadweight loss).',
        unsub: 'Taking away a subsidy raises producers’ costs, so supply shifts left: the price rises and the quantity falls.',
        sub: 'A subsidy lowers producers’ costs, so supply shifts right: the price falls and the quantity rises.',
        untax: 'Removing a tax lowers what it costs to sell, so supply shifts right: the price buyers pay falls and the quantity rises.',
        entry: 'Letting more sellers into the market shifts supply right: the price falls and the quantity rises.' }[kind];
      add(mc('taxsub:' + id, 'u1', 'You signed ' + title(id) + '. In the market for ' + mk + ', compared with before, the most likely result is:', up ? A : B,
        [up ? B : A, 'The price and the quantity both rise', 'The price and the quantity both fall'], why, salt), true);
    } }
  { const rnd = R('compadv');
    const us = { a: pickOf(rnd, [60, 120, 240]), b: pickOf(rnd, [20, 40, 60]) };
    const k = pickOf(rnd, [2, 3, 4]), m = pickOf(rnd, [2, 4, 5]);
    const fr = { a: us.a / k, b: us.b / m * (k === m ? 1.5 : 1) };   // the partner is less productive at both: absolute advantage stays with the U.S.
    const ocUS = us.b / us.a, ocFR = fr.b / fr.a;   // cloth given up per unit of wheat
    const askWheat = rnd() < 0.5;
    const usHas = askWheat ? ocUS < ocFR : ocUS > ocFR;
    if (Math.abs(ocUS - ocFR) > 1e-9) {
      const good = askWheat ? 'wheat' : 'cloth';
      const A = 'The United States, because its opportunity cost of ' + good + ' is lower', B = 'The partner country, because its opportunity cost of ' + good + ' is lower';
      add(mc('compadv', 'u1', 'In one day, a U.S. worker can make ' + us.a + ' bushels of wheat or ' + us.b + ' yards of cloth. A worker in a partner country can make ' + r1(fr.a) + ' bushels of wheat or ' + r1(fr.b) + ' yards of cloth. Which country has the comparative advantage in ' + good + '?',
        usHas ? A : B, [usHas ? B : A, 'The United States, because it can make more of both goods', 'Neither, because one country is better at making both goods'],
        'For each bushel of wheat, the U.S. gives up ' + f2(ocUS) + ' yards of cloth and the partner gives up ' + f2(ocFR) + '. The country with the lower opportunity cost of a good has the comparative advantage in it, even if the other country can make more of everything (absolute advantage).', salt), false);
    } }
  { const rnd = R('ppcoc');
    const a = pickOf(rnd, [100, 200, 250, 400]), mult = pickOf(rnd, [2, 3, 4, 5]), b = a * mult;
    add(mc('ppcoc', 'u1', 'Suppose that, using all its resources, the country can make either ' + a + ' thousand tanks or ' + commas(b) + ' thousand tons of wheat, and the production possibilities curve is a straight line. What is the opportunity cost of one tank?',
      mult + ' tons of wheat', wrongNums(mult, [1 / mult, mult * 2, a / 10], (x) => (Math.round(x * 100) / 100) + ' tons of wheat'),
      'Giving up all ' + a + ' thousand tanks frees enough resources for ' + commas(b) + ' thousand tons of wheat, so each tank costs ' + b + ' / ' + a + ' = ' + mult + ' tons of wheat. A straight-line PPC means the opportunity cost stays constant.', salt), false);
  }
  if (Math.abs(dj) >= 0.2) {
    const up = dj > 0;
    const right = up ? 'Moving to a point further inside the curve, with more resources idle' : 'Moving closer to the curve, using the country’s resources more fully';
    add(mc('ppc', 'u1', 'Your term ended with unemployment at ' + f1(end.j) + '%, ' + (up ? 'up' : 'down') + ' from ' + f1(START.j) + '%. On a production possibilities curve, this is best shown as:', right,
      [up ? 'Moving closer to the curve, using the country’s resources more fully' : 'Moving to a point further inside the curve, with more resources idle', 'The whole curve shifting outward', 'Moving along the curve, making more of one good and less of another'],
      'Unemployed workers are idle resources, so the economy produces at a point inside its production possibilities curve. ' + (up ? 'More unemployment moves it further inside.' : 'Putting people back to work moves it toward the curve.') + ' The curve itself shifts only when the quantity or quality of resources changes.', salt), true);
  }

  // ---------------- Unit 2
  { const nom = end.g + end.i;
    add(mc('nominal', 'u2', 'Your term ended with real GDP growing at ' + f1(end.g) + '% and the price level rising at ' + f1(end.i) + '% a year. About how fast was nominal GDP growing?', f1(nom) + '%',
      wrongNums(nom, [end.g, end.i, end.g - end.i, end.i - end.g], (x) => f1(x) + '%'),
      'Nominal GDP counts output at current prices, so its growth is about real growth plus inflation: ' + f1(end.g) + '% + ' + f1(end.i) + '% = ' + f1(nom) + '%.', salt), false); }
  { const rnd = R('urate');
    const lf = pickOf(rnd, [160, 164, 168, 172]), nilf = pickOf(rnd, [95, 100, 105, 110]);
    const u = Math.max(0.5, end.j), un = Math.round(lf * u) / 100, em = Math.round((lf - un) * 100) / 100;
    const rate = 100 * un / (em + un);
    add(mc('urate', 'u2', 'At the end of your term, ' + em.toFixed(2) + ' million people had jobs, ' + un.toFixed(2) + ' million were looking for work, and ' + nilf + ' million adults were not looking (students, retirees and others). What was the unemployment rate?', f1(rate) + '%',
      wrongNums(rate, [100 * un / em, 100 * un / (em + un + nilf), 100 * (em + un) / (em + un + nilf)], (x) => f1(x) + '%'),
      'Unemployment rate = unemployed / labor force, and the labor force counts only people working or looking: ' + un.toFixed(2) + ' / (' + em.toFixed(2) + ' + ' + un.toFixed(2) + ') = ' + f1(rate) + '%. People not looking for work are not in the labor force.', salt), false); }
  { const rnd = R('cpi');
    const c0 = pickOf(rnd, [250, 280, 300, 320]) + pickOf(rnd, [0, 0.5]), infl = end.i, c1 = Math.round(c0 * (1 + infl / 100) * 10) / 10;
    const right = 100 * (c1 - c0) / c0;
    add(mc('cpi', 'u2', 'The consumer price index was ' + c0.toFixed(1) + ' a year before your term ended and ' + c1.toFixed(1) + ' at the end. What was the inflation rate?', f1(right) + '%',
      wrongNums(right, [c1 - c0, 100 * (c1 - c0) / c1, 100 * c1 / c0], (x) => f1(x) + '%'),
      'Inflation rate = (new CPI - old CPI) / old CPI x 100 = (' + c1.toFixed(1) + ' - ' + c0.toFixed(1) + ') / ' + c0.toFixed(1) + ' x 100 = ' + f1(right) + '%.', salt), false); }
  { const id = firstIn(signed, Object.keys(UTYPE));
    if (id) {
      const t = UTYPE[id];
      const why = t === 'frictional' ? 'Frictional unemployment is the time people spend between jobs searching for a good match. ' + (id === 'uireform' ? 'Unemployment insurance supports that search.' : 'Making it easier to switch jobs shortens that search.')
        : 'Structural unemployment comes from a mismatch between workers’ skills or locations and the jobs available, as when an industry shrinks. Retraining aims at that mismatch.';
      const pool = ['Frictional unemployment', 'Structural unemployment', 'Cyclical unemployment', 'Seasonal unemployment'];
      const right = t === 'frictional' ? pool[0] : pool[1];
      add(mc('utype:' + id, 'u2', 'You signed ' + title(id) + '. Which type of unemployment is it most directly aimed at?', right, pool.filter((x) => x !== right), why, salt), true);
    } }
  { const id = firstIn(signed, Object.keys(INDEXED));
    if (id) add(mc('index:' + id, 'u2', 'You signed ' + title(id) + ', which ties ' + INDEXED[id] + ' to the price level. Without indexing, unexpected inflation would:',
      'Shrink the real value of that fixed dollar amount', ['Raise the real value of that fixed dollar amount', 'Leave its real value unchanged, because only nominal values matter', 'Lower the consumer price index'],
      'Inflation lowers what a fixed number of dollars can buy. Indexing raises the dollar amount with the price level, so its real value holds steady.', salt), true); }
  { const tr = firstIn(signed, TRANSFERS), pu = firstIn(signed, PURCHASES);
    if (tr || pu) {
      const isTr = !!tr && (!pu || signed.indexOf(tr) < signed.indexOf(pu)), id = isTr ? tr : pu;
      const A = 'A transfer payment: not counted in GDP until households spend it', B = 'Government purchases (G): counted in GDP when the government buys the goods and services';
      add(mc('gdpcount:' + id, 'u2', 'You signed ' + title(id) + '. In GDP accounting, the money it ' + (isTr ? 'sends to people' : 'spends') + ' counts as:', isTr ? A : B,
        [isTr ? B : A, 'Investment (I): counted because it builds future output', 'Net exports: counted because it changes what the country buys'],
        isTr ? 'Transfers such as benefits, credits and checks move income from taxpayers to recipients without buying anything new, so they are not in G. They enter GDP only when people spend them, as consumption.'
          : 'When the government pays for new roads, equipment or workers’ services, it buys newly produced output, so the spending is counted in GDP as government purchases (G).', salt), true);
    } }
  if (end.g < 0 || (end.g >= 2 && end.j <= START.j)) {
    const rec = end.g < 0;
    const pool = ['A contraction (recession): real output is falling', 'An expansion: real output is growing and unemployment is low', 'A trough: the lowest point, just before a recovery', 'A peak: the highest point, just before a contraction'];
    add(mc('cycle', 'u2', 'Your term ended with real GDP growing at ' + f1(end.g) + '% and unemployment at ' + f1(end.j) + '%. Which phase of the business cycle does that describe best?', rec ? pool[0] : pool[1],
      pool.filter((x) => x !== (rec ? pool[0] : pool[1])),
      rec ? 'Negative real GDP growth means output is shrinking, which is a contraction. Unemployment usually rises during one.' : 'Output growing at or above its normal pace with low unemployment is an expansion.', salt), true);
  }

  // ---------------- Unit 3
  { const fk = Object.keys(FISCAL).map((k) => [k, firstIn(signed, FISCAL[k])]).filter((x) => x[1]).sort((a, b) => signed.indexOf(a[1]) - signed.indexOf(b[1]))[0];
    if (fk) {
      const exp = fk[0] === 'tc' || fk[0] === 'su';
      const kind = { tc: 'cuts taxes', ti: 'raises taxes', su: 'raises government spending', sd: 'cuts government spending' }[fk[0]];
      const A = 'Expansionary fiscal policy: aggregate demand shifts right', B = 'Contractionary fiscal policy: aggregate demand shifts left';
      add(mc('fiscal:' + fk[1], 'u3', 'You signed ' + title(fk[1]) + ', which ' + kind + '. In the short run, this is best described as:',
        exp ? A : B, [exp ? B : A, 'Expansionary monetary policy: the money supply increases', 'A negative supply shock: short-run aggregate supply shifts left'],
        { tc: 'Lower taxes raise households’ and firms’ after-tax income, so consumption and investment rise and AD shifts right.',
          su: 'Government spending and transfers add to total spending, directly or through higher household income, so AD shifts right.',
          ti: 'Higher taxes lower after-tax income, so consumption and investment fall and AD shifts left.',
          sd: 'Less government spending removes demand directly, so AD shifts left.' }[fk[0]] + ' Fiscal policy is set by Congress and the President; monetary policy is the central bank’s.', salt), true);
    } }
  { const ev = evs.find((e) => SHOCKS[e.id]);
    if (ev) {
      const sk = SHOCKS[ev.id];
      const ans = { sras: 'Short-run aggregate supply shifts left: the price level rises and real output falls', adl: 'Aggregate demand shifts left: the price level and real output both fall', lras: 'Long-run aggregate supply shifts right: potential output rises' }[sk[1]];
      const pool = ['Short-run aggregate supply shifts left: the price level rises and real output falls', 'Aggregate demand shifts left: the price level and real output both fall',
        'Long-run aggregate supply shifts right: potential output rises', 'Aggregate demand shifts right: the price level and real output both rise'];
      add(mc('shock:' + ev.id, sk[1] === 'lras' ? 'u5' : 'u3', 'On day ' + ev.day + ' of your term, ' + sk[0] + '. In the AD-AS model, the most likely immediate effect is:',
        ans, pool.filter((x) => x !== ans),
        { sras: 'Destroyed property, damaged infrastructure or costlier energy raise production costs, a negative supply shock. SRAS shifts left, causing stagflation: higher prices and lower output.',
          adl: 'Falling stock prices make households feel poorer and banks lend less, so consumption and investment fall. AD shifts left.',
          lras: 'Better technology raises productivity, so the economy can produce more at full employment. LRAS (and SRAS) shift right.' }[sk[1]], salt), true);
    } }
  { const rnd = R('multiplier');
    const mpc = pickOf(rnd, [0.5, 0.75, 0.8, 0.9]), amt = pickOf(rnd, [20, 40, 50, 100]), k = 1 / (1 - mpc), right = amt * k;
    const su = firstIn(signed, FISCAL.su);
    add(mc('multiplier', 'u3', (su ? 'Suppose ' + title(su) + ', which you signed, adds ' : 'Suppose a spending bill adds ') + '$' + amt + ' billion of new government purchases, and the marginal propensity to consume (MPC) is ' + mpc + '. What is the largest possible increase in real GDP?',
      '$' + r1(right) + ' billion', wrongNums(right, [amt * mpc, amt / mpc, amt * mpc * k, amt], (x) => '$' + r1(x) + ' billion'),
      'The spending multiplier is 1 / (1 - MPC) = 1 / ' + f2(1 - mpc) + ' = ' + r1(k) + ', so $' + amt + ' billion of new spending can raise real GDP by up to $' + r1(right) + ' billion as each round of income is partly spent again.', salt), false); }
  { const rnd = R('taxmult');
    const mpc = pickOf(rnd, [0.5, 0.75, 0.8, 0.9]), amt = pickOf(rnd, [20, 40, 50, 100]), right = amt * mpc / (1 - mpc);
    const tc = firstIn(signed, FISCAL.tc);
    add(mc('taxmult', 'u3', (tc ? 'Suppose ' + title(tc) + ', which you signed, cuts ' : 'Suppose a tax bill cuts ') + 'taxes by $' + amt + ' billion, and the MPC is ' + mpc + '. What is the largest possible increase in real GDP?',
      '$' + r1(right) + ' billion', wrongNums(right, [amt / (1 - mpc), amt * mpc, amt], (x) => '$' + r1(x) + ' billion'),
      'The tax multiplier is MPC / (1 - MPC) = ' + mpc + ' / ' + f2(1 - mpc) + ' = ' + r1(mpc / (1 - mpc)) + '. It is smaller than the spending multiplier because households save part of a tax cut before any of it is spent.', salt), false); }
  { const gap = end.j > NATURAL + 0.3 ? 'rec' : end.j < NATURAL - 0.3 && end.i > 2.5 ? 'inf' : 'full';
    const C = { rec: 'In a recessionary gap: real output is below full employment', inf: 'In an inflationary gap: real output is above full employment', full: 'Close to full employment: real output is near its potential' };
    add(mc('gap', 'u3', 'Your term ended with unemployment at ' + f1(end.j) + '% (the natural rate is about ' + f1(NATURAL) + '%) and inflation at ' + f1(end.i) + '%. In the AD-AS model, the economy was most likely:', C[gap],
      Object.keys(C).filter((x) => x !== gap).map((x) => C[x]).concat(['In long-run equilibrium with zero unemployment']),
      'Unemployment above the natural rate means output is below potential (a recessionary gap); below it, output is above potential (an inflationary gap). Even at full employment some frictional and structural unemployment remains.', salt), false); }

  // ---------------- Unit 4
  { const held = !fed || moved === 0, up = held ? end.i > 2 : moved > 0;
    const A = 'Sold bonds on the open market or raised the interest it pays banks on their reserves', B = 'Bought bonds on the open market or lowered the interest it pays banks on their reserves';
    const q = !held ? 'Over your term, the Federal Reserve ' + (up ? 'raised' : 'cut') + ' its target for the federal funds rate from ' + f2(START.r) + '% to ' + f2(rate) + '%. To do that, the Fed most likely:'
      : 'Your term ended with inflation at ' + f1(end.i) + '%, against the Fed’s 2% goal. To ' + (up ? 'bring inflation down' : 'support spending and jobs') + ', the Fed would most likely:';
    add(mc('omo', 'u4', q, up ? A : B, [up ? B : A, 'Asked Congress to ' + (up ? 'cut' : 'raise') + ' government spending', 'Printed more currency and mailed it to households'],
      (up ? 'Selling bonds pulls reserves out of banks, and paying more interest on reserves makes banks unwilling to lend for less. Either way short-term interest rates rise. '
        : 'Buying bonds adds reserves to banks, and paying less interest on reserves makes banks willing to lend for less. Either way short-term interest rates fall. ')
        + 'Changing government spending is fiscal policy, which belongs to Congress and the President.', salt), !held); }
  if (fed && moved !== 0) {
    const up = moved > 0;
    const A = 'Money supply shifts left (or reserves fall) and the nominal interest rate rises', B = 'Money supply shifts right (or reserves rise) and the nominal interest rate falls';
    add(mc('mmkt', 'u4', 'The Fed ' + (up ? 'raised' : 'cut') + ' interest rates during your term, from ' + f2(START.r) + '% to ' + f2(rate) + '%. On a graph of the money market, this is shown as:', up ? A : B,
      [up ? B : A, 'Money demand shifts right and the nominal interest rate falls', 'Money supply shifts right and the nominal interest rate rises'],
      'The Fed controls the supply of money and reserves. ' + (up ? 'Shrinking it moves the vertical money supply curve left, up the money demand curve, to a higher interest rate.' : 'Expanding it moves the vertical money supply curve right, down the money demand curve, to a lower interest rate.'), salt), true);
    add(mc('transmit', 'u4', 'How did the Fed’s move from ' + f2(START.r) + '% to ' + f2(rate) + '% most likely affect the economy in the short run?',
      up ? 'Borrowing got costlier, so investment and big purchases fell and aggregate demand shifted left' : 'Borrowing got cheaper, so investment and big purchases rose and aggregate demand shifted right',
      [up ? 'Borrowing got cheaper, so investment and big purchases rose and aggregate demand shifted right' : 'Borrowing got costlier, so investment and big purchases fell and aggregate demand shifted left',
        'Long-run aggregate supply shifted ' + (up ? 'left' : 'right') + ', because interest rates set potential output', 'Nothing changed, because only government spending affects aggregate demand'],
      'Interest rates are the price of borrowing. ' + (up ? 'Higher rates discourage business investment and purchases bought on credit (homes, cars), so AD shifts left, cooling inflation.' : 'Lower rates encourage business investment and purchases bought on credit, so AD shifts right, raising output and employment in the short run.'), salt), true);
  }
  { const real = rate - end.i;
    add(mc('realrate', 'u4', (fed ? 'Your term ended with the Fed’s interest rate at ' : 'Suppose the nominal interest rate is ') + f2(rate) + '% and inflation at ' + f1(end.i) + '%. What was the real interest rate?', f1(real) + '%',
      wrongNums(real, [rate + end.i, end.i - rate, rate], (x) => f1(x) + '%'),
      'Real interest rate = nominal interest rate - inflation = ' + f2(rate) + '% - ' + f1(end.i) + '% = ' + f1(real) + '%. It measures what a loan really costs once rising prices are counted.', salt), false); }
  { const rnd = R('banklend');
    const dep = pickOf(rnd, [1000, 2000, 5000, 10000, 20000]), rr = pickOf(rnd, [0.05, 0.1, 0.2, 0.25]), ex = dep * (1 - rr), right = ex / rr;
    add(mc('banklend', 'u4', 'A customer deposits ' + usd(dep) + ' in cash into a bank that had no excess reserves. The required reserve ratio is ' + Math.round(rr * 100) + '%. What is the largest possible increase in the money supply from the new loans made across the banking system?', usd(right),
      wrongNums(right, [dep / rr, ex, dep * rr], usd),
      'The bank must keep ' + Math.round(rr * 100) + '% (' + usd(dep * rr) + ') and can lend the other ' + usd(ex) + '. The money multiplier is 1 / ' + rr + ' = ' + r1(1 / rr) + ', so new loans can add up to ' + usd(ex) + ' x ' + r1(1 / rr) + ' = ' + usd(right) + '. The deposit itself just turned currency into a checking balance, so it adds nothing new.', salt), false); }
  if (F.xa.indexOf('fedfire') >= 0) add(mc('fedchair', 'u4', 'You replaced the head of the central bank with a loyalist who promised to keep interest rates low. Research on countries that weakened central bank independence finds this most often leads to:',
    'Higher inflation without a lasting gain in output or jobs', ['Lower inflation and faster long-run growth', 'Permanently lower unemployment with stable prices', 'A smaller budget deficit, because the government borrows less'],
    'Alesina and Summers (1993) found that countries with more independent central banks had lower inflation and no slower growth. Holding rates low to please politicians boosts spending for a while, then mostly shows up as higher prices.', salt), true);
  if (evs.some((e) => e.id === 'crash')) {
    const ch = evo.crash;
    add(mc('lolr', 'u4', 'The stock market crashed and a major bank wobbled during your term' + (ch === 3 ? ', and you backed emergency lending by the Fed' : '') + '. When a central bank lends to banks and markets that cannot borrow anywhere else in a panic, it is acting as:',
      'A lender of last resort', ['A fiscal authority setting tax rates', 'A commercial bank competing for deposits', 'A regulator setting the reserve requirement to zero'],
      'In a panic, sound banks can fail simply because everyone wants cash at once. The central bank stops the run by lending freely against good collateral. That is the lender-of-last-resort role, used in 2008 and 2020.', salt), true);
  }
  { const fb = firstIn(signed, ['fedtarget3', 'fedsingle']);
    if (fb === 'fedtarget3') add(mc('fedbill:fedtarget3', 'u4', 'You signed ' + title('fedtarget3') + '. In the long run, the most likely result is:',
      'Inflation and nominal interest rates both about a point higher, with little lasting effect on unemployment', ['Permanently lower unemployment, with inflation back at 2%', 'Lower nominal interest rates, because the Fed cares less about inflation', 'Higher real interest rates and slower growth'],
      'A higher target raises expected inflation, and lenders add it to nominal rates (the Fisher effect). In the long run unemployment returns to its natural rate, so the main lasting change is in prices and nominal rates.', salt), true);
    else if (fb === 'fedsingle') add(mc('fedbill:fedsingle', 'u4', 'You signed ' + title('fedsingle') + ', ending the Fed’s dual mandate. In a recession, compared with before, the Fed would most likely:',
      'Cut interest rates less, since rising unemployment alone would not call for a cut', ['Cut interest rates more, since it would focus on jobs', 'Raise government spending to fight unemployment', 'Be unable to change interest rates at all'],
      'Under the dual mandate the Fed responds to both inflation and unemployment. With price stability as its only goal, rising unemployment matters only through what it does to inflation, so the Fed eases less.', salt), true); }

  // ---------------- Unit 5
  if (Math.abs(dj) >= 0.2 && Math.abs(di) >= 0.2) {
    const along = (dj < 0 && di > 0) || (dj > 0 && di < 0);
    const pool = ['A movement along the short-run Phillips curve, as a change in aggregate demand traded unemployment against inflation',
      'A rightward shift of the short-run Phillips curve, as from a negative supply shock',
      'A leftward shift of the short-run Phillips curve, as from a positive supply shock',
      'A shift of the long-run Phillips curve caused by a change in the inflation rate'];
    const right = along ? pool[0] : (dj >= 0 && di >= 0) ? pool[1] : pool[2];
    add(mc('phillips', 'u5', 'Over your term, unemployment went from ' + f1(START.j) + '% to ' + f1(end.j) + '% and inflation from ' + f1(START.i) + '% to ' + f1(end.i) + '%. On a Phillips curve graph, this pattern is most consistent with:',
      right, pool.filter((x) => x !== right).slice(0, 3),
      along ? 'When unemployment and inflation move in opposite directions, the economy is moving along the short-run Phillips curve, usually because aggregate demand changed.'
        : 'When unemployment and inflation move in the same direction, the short-run Phillips curve itself has shifted, usually because of a supply shock or changed inflation expectations. The long-run Phillips curve is vertical at the natural rate and does not move with inflation.', salt), true);
  }
  if (Math.abs(dd) >= 0.5) {
    const up = dd > 0;
    const A = 'The demand for loanable funds increases, raising the real interest rate and crowding out private investment', B = 'The demand for loanable funds decreases, lowering the real interest rate and encouraging private investment';
    add(mc('loanable', 'u5', 'Your deficit went from ' + f1(START.d) + '% to ' + f1(end.d) + '% of GDP. In the loanable funds market, this ' + (up ? 'extra' : 'reduced') + ' government borrowing most likely means:',
      up ? A : B, [up ? B : A, 'The supply of loanable funds increases, lowering the real interest rate', 'The real interest rate is unchanged because the central bank sets it'],
      up ? 'A government that borrows more adds to the demand for loanable funds. The real interest rate rises, and some private investment is crowded out.'
        : 'Less government borrowing reduces the demand for loanable funds. The real interest rate falls, which makes private investment cheaper.', salt), true);
  }
  { const gb = firstIn(signed, GROWTH);
    add(mc(gb ? 'lras:' + gb : 'lras', 'u5', gb ? 'You signed ' + title(gb) + '. If it works as intended, its long-run effect is best shown as:' : 'Which policy would most directly shift the long-run aggregate supply curve to the right?',
      gb ? 'The long-run aggregate supply curve shifting right, as capital, skills or technology grow' : 'Funding job training that raises workers’ productivity',
      gb ? ['Aggregate demand shifting right, with no change in potential output', 'The long-run aggregate supply curve shifting left', 'A movement along the short-run aggregate supply curve']
        : ['A temporary cut in the payroll tax', 'A price ceiling on gasoline', 'A higher tariff on imported steel'],
      'Long-run growth comes from more or better resources: physical capital, human capital and technology. Adding to any of them raises potential output, which shifts LRAS right.', salt), !!gb); }
  { const rnd = R('debt');
    const gdp = pickOf(rnd, [28, 30, 32]), right = gdp * Math.max(0.1, end.d) / 100;
    add(mc('debt', 'u5', 'Your term ended with a deficit of ' + f1(end.d) + '% of GDP. If GDP is $' + gdp + ' trillion, by about how much does the national debt grow this year?', '$' + f2(right) + ' trillion',
      wrongNums(right, [gdp * end.d / 1000, end.d, right * 10], (x) => '$' + f2(x) + ' trillion'),
      'The deficit is one year’s shortfall, and the debt is the total of all past deficits minus surpluses. So the debt grows by this year’s deficit: ' + f1(end.d) + '% x $' + gdp + ' trillion = $' + f2(right) + ' trillion.', salt), false); }
  { const loyal = F.xa.indexOf('fedfire') >= 0;
    add(mc('lrpc', 'u5', (loyal ? 'Your central bank chief kept interest rates low to push unemployment down. ' : 'Suppose policymakers keep pushing spending up to hold unemployment below its natural rate of about ' + f1(NATURAL) + '%. ') + 'In the long run, the most likely result is:',
      'Unemployment returns to its natural rate and inflation is permanently higher', ['Unemployment stays below its natural rate as long as inflation keeps rising at the same pace', 'Inflation falls back to its old level and unemployment stays low', 'The long-run Phillips curve shifts left, lowering both'],
      'The long-run Phillips curve is vertical at the natural rate of unemployment. Once people expect the higher inflation, the short-run curve shifts up and unemployment returns to the natural rate, leaving only the extra inflation.', salt), loyal); }

  // ---------------- Unit 6
  { const tf = firstIn(signed, TARIFFS), op = firstIn(signed, OPENING);
    if (tf || op) {
      const tar = !!tf && (!op || signed.indexOf(tf) < signed.indexOf(op));
      const id = tar ? tf : op;
      const A = 'Domestic prices rise, domestic producers gain, and consumer surplus falls';
      const B = 'Domestic prices fall, consumers gain, and some import-competing producers and workers lose';
      add(mc('trade:' + id, 'u6', 'You signed ' + title(id) + '. Compared with before, this most likely means:', tar ? A : B,
        [tar ? B : A, 'Imports rise because foreign goods become cheaper for domestic buyers', 'Prices stay the same because trade only affects exporters'],
        tar ? 'A tariff raises the price of imports, so domestic producers can charge more and sell more. Consumers pay more and buy less, so consumer surplus falls and there is deadweight loss.'
          : 'Lower trade barriers let cheaper imports in. Consumers gain more than producers lose overall, but the losses are concentrated on import-competing industries.', salt), true);
    } }
  { const up = fed && moved !== 0 ? moved > 0 : true;
    const A = 'The dollar appreciates, so U.S. exports fall and imports rise', B = 'The dollar depreciates, so U.S. exports rise and imports fall';
    const q = fed && moved !== 0 ? 'During your term the Fed ' + (up ? 'raised' : 'cut') + ' U.S. interest rates from ' + f2(START.r) + '% to ' + f2(rate) + '% while rates abroad stayed the same. In the foreign exchange market, the most likely result is:'
      : 'Suppose the Fed raises U.S. interest rates while rates abroad stay the same. In the foreign exchange market, the most likely result is:';
    add(mc('fx', 'u6', q, up ? A : B, [up ? B : A, 'The dollar appreciates, so U.S. exports rise and imports fall', 'Nothing changes, because exchange rates are fixed by treaty'],
      (up ? 'Higher U.S. rates attract foreign savers, who need dollars to buy U.S. assets. Demand for dollars rises and the dollar appreciates, which makes U.S. goods dearer abroad and foreign goods cheaper here, so net exports fall.'
        : 'Lower U.S. rates send savers abroad, so they supply dollars to buy foreign currency. The dollar depreciates, which makes U.S. goods cheaper abroad and imports dearer, so net exports rise.'), salt), !!fed && moved !== 0); }
  if (Math.abs(dd) >= 0.5) {
    const up = dd > 0;
    add(mc('capflow', 'u6', 'Your deficit went from ' + f1(START.d) + '% to ' + f1(end.d) + '% of GDP. If the change in government borrowing moves the U.S. real interest rate, what most likely happens to flows of financial capital?',
      up ? 'More foreign financial capital flows into the U.S., and the dollar appreciates' : 'Less foreign financial capital flows into the U.S., and the dollar depreciates',
      [up ? 'Less foreign financial capital flows into the U.S., and the dollar depreciates' : 'More foreign financial capital flows into the U.S., and the dollar appreciates', 'Financial capital stops moving, because only goods cross borders', 'The current account and the financial account both move into surplus'],
      up ? 'More borrowing raises the U.S. real interest rate, so foreign savers buy more U.S. bonds. That is a financial capital inflow, and buying dollars to do it makes the dollar appreciate.'
        : 'Less borrowing lowers the U.S. real interest rate, so U.S. assets pay less and fewer foreign savers buy them. The inflow shrinks and the dollar depreciates.', salt), true);
  }
  { const rnd = R('tot');
    const a = pickOf(rnd, [2, 3, 4]), b = a + pickOf(rnd, [2, 3, 4]);   // U.S. gives up a units of cloth per unit of wheat; the partner gives up b
    const mid = (a + b) / 2;
    add(mc('tot', 'u6', 'Making one bushel of wheat costs the United States ' + a + ' yards of cloth and costs a partner country ' + b + ' yards of cloth. Which terms of trade would let both countries gain if the U.S. exports wheat?',
      '1 bushel of wheat for ' + mid + ' yards of cloth', ['1 bushel of wheat for ' + (a - 1) + ' yards of cloth', '1 bushel of wheat for ' + (b + 1) + ' yards of cloth', '1 bushel of wheat for ' + (a + b) + ' yards of cloth'],
      'Trade helps both when the price falls between the two opportunity costs: the U.S. must get more than ' + a + ' yards per bushel (its own cost) and the partner must pay less than ' + b + ' (its own cost). Only ' + mid + ' yards does both.', salt), false); }
  { const rnd = R('xrate');
    const e = pickOf(rnd, [0.8, 0.85, 0.9, 0.95]), price = pickOf(rnd, [400, 600, 900, 1200]), right = price / e;
    add(mc('xrate', 'u6', 'One U.S. dollar buys ' + e + ' euros. A German machine sells for ' + commas(price) + ' euros. What does it cost an American buyer in dollars, before shipping?', usd(right),
      wrongNums(right, [price * e, price, price / e / e], usd), 'Dollars needed = euros / (euros per dollar) = ' + commas(price) + ' / ' + e + ' = ' + usd(right) + '.', salt), false); }
  return out;
}

// ------------------------------------------------------------------ the written response, by unit
function frqFor(F, focus) {
  const { end, fed, rate, signed, evs, title } = F;
  const dir = fed && rate !== START.r ? (rate > START.r ? 'raised' : 'cut') : null;
  const realNow = f1(rate - end.i);
  if (focus === 'u1') {
    const pc = firstIn(signed, Object.keys(CEILINGS)), pf = firstIn(signed, Object.keys(FLOORS));
    if (pc || pf) {
      const ceil = !!pc; const id = pc || pf, mk = ceil ? CEILINGS[id] : FLOORS[id];
      return { id: 'control', q: 'You signed ' + title(id) + ', a price ' + (ceil ? 'ceiling' : 'floor') + ' in the market for ' + mk + '. Assume it is set ' + (ceil ? 'below' : 'above') + ' the equilibrium price.\n(a) Draw a correctly labeled supply and demand graph for this market. Show the equilibrium price and quantity, and the controlled price.\n(b) On your graph, show and label the ' + (ceil ? 'shortage' : 'surplus') + '.\n(c) Shade the deadweight loss.\n(d) Identify one group that gains from the policy and one group that loses, and explain why.',
        rubric: ['(a) Correctly labeled graph (P, Q, S, D) with the controlled price ' + (ceil ? 'below' : 'above') + ' equilibrium', '(b) ' + (ceil ? 'Shortage: quantity demanded exceeds quantity supplied at the ceiling' : 'Surplus: quantity supplied exceeds quantity demanded at the floor'), '(c) Deadweight loss shaded between supply and demand, from the traded quantity to the equilibrium quantity', '(d) A plausible winner (' + (ceil ? 'buyers who still get the good at the lower price' : 'people who keep jobs or sales at the higher price') + ') and loser (' + (ceil ? 'buyers who go without, or sellers' : 'people priced out, or buyers') + ') with a reason'] };
    }
    const ev = evs.find((e) => MARKETS[e.id]);
    if (ev) {
      const m = MARKETS[ev.id], dem = m[2] === 'd';
      return { id: 'market', q: 'On day ' + ev.day + ' of your term, ' + m[0] + '.\n(a) Draw a correctly labeled supply and demand graph for ' + m[1] + ', and show the effect of the event.\n(b) What happens to the equilibrium price and quantity?\n(c) What happens to consumer surplus? Explain.\n(d) If the government then capped the price at its level before the event, what would happen in this market? Explain.',
        rubric: ['(a) Correctly labeled graph with ' + (dem ? 'demand shifting right' : 'supply shifting left'), '(b) Price rises; quantity ' + (dem ? 'rises' : 'falls'), '(c) ' + (dem ? 'A reasonable answer: buyers pay more, though more buyers trade; consumer surplus changes are explained from the graph' : 'Consumer surplus falls: buyers pay more and buy less'), '(d) A shortage: at the old price, quantity demanded exceeds quantity supplied'] };
    }
  }
  if (focus === 'u2') return { id: 'indicators',
    q: 'Your term ended with real GDP growth at ' + f1(end.g) + '%, inflation at ' + f1(end.i) + '%, unemployment at ' + f1(end.j) + '% and the Fed’s interest rate at ' + f2(rate) + '%.\n(a) Calculate the approximate growth rate of nominal GDP. Show your work.\n(b) Calculate the real interest rate. Show your work.\n(c) The natural rate of unemployment is about ' + f1(NATURAL) + '%. Is there cyclical unemployment at the end of your term? Explain.\n(d) Explain one reason the consumer price index may overstate the true increase in the cost of living.',
    rubric: ['(a) ' + f1(end.g) + '% + ' + f1(end.i) + '% = about ' + f1(end.g + end.i) + '%', '(b) ' + f2(rate) + '% - ' + f1(end.i) + '% = ' + realNow + '%', '(c) ' + (end.j > NATURAL + 0.05 ? 'Yes: unemployment is above the natural rate, so about ' + f1(end.j - NATURAL) + ' points is cyclical' : 'No: unemployment is at or below the natural rate, so there is no cyclical unemployment'), '(d) Substitution bias, new products, or quality improvements, with an explanation'] };
  if (focus === 'u4') return { id: 'monetary',
    q: (dir ? 'Over your term the Federal Reserve ' + dir + ' its target interest rate from ' + f2(START.r) + '% to ' + f2(rate) + '%.' : 'Your term ended with inflation at ' + f1(end.i) + '%, ' + (end.i > 2 ? 'above' : 'at or below') + ' the Fed’s 2% goal. Assume the Fed ' + (end.i > 2 ? 'raises' : 'cuts') + ' its target interest rate.') +
      '\n(a) Identify one tool the Fed could use to make that change.\n(b) Draw a correctly labeled graph of the money market and show the effect on the nominal interest rate.\n(c) Explain how the change affects investment and aggregate demand.\n(d) With inflation at ' + f1(end.i) + '% and a nominal rate of ' + f2(rate) + '%, calculate the real interest rate.',
    rubric: ['(a) ' + ((dir ? dir === 'raised' : end.i > 2) ? 'Sell bonds (open market sale), or raise the interest rate on reserves, or raise the discount rate' : 'Buy bonds (open market purchase), or lower the interest rate on reserves, or lower the discount rate'), '(b) Correctly labeled money market (nominal interest rate, quantity of money, vertical MS, downward MD) with MS shifting ' + ((dir ? dir === 'raised' : end.i > 2) ? 'left' : 'right'), '(c) Investment ' + ((dir ? dir === 'raised' : end.i > 2) ? 'falls, so AD shifts left' : 'rises, so AD shifts right'), '(d) ' + f2(rate) + '% - ' + f1(end.i) + '% = ' + realNow + '%'] };
  if (focus === 'u6') {
    const up = dir ? dir === 'raised' : true;
    return { id: 'forex',
      q: (dir ? 'During your term the Fed ' + dir + ' U.S. interest rates from ' + f2(START.r) + '% to ' + f2(rate) + '% while rates in the euro area stayed the same.' : 'Assume the Fed raises U.S. interest rates while rates in the euro area stay the same.') +
        '\n(a) Draw a correctly labeled graph of the foreign exchange market for U.S. dollars and show the effect.\n(b) What happens to the value of the dollar relative to the euro?\n(c) What happens to U.S. net exports? Explain.\n(d) Explain the effect of your answer in (c) on U.S. aggregate demand.',
      rubric: ['(a) Correctly labeled FX graph (price of the dollar in euros, quantity of dollars) with ' + (up ? 'demand for dollars shifting right (or supply left)' : 'demand for dollars shifting left (or supply right)'), '(b) The dollar ' + (up ? 'appreciates' : 'depreciates'), '(c) Net exports ' + (up ? 'fall: U.S. goods cost more abroad and imports cost less here' : 'rise: U.S. goods cost less abroad and imports cost more here'), '(d) AD shifts ' + (up ? 'left' : 'right') + ' because net exports are part of aggregate demand'] };
  }
  if (focus === 'u5' && end.d >= 7.5) return frqByOutcome(end, 'crowding');
  if (focus === 'u5' && Math.abs(end.j - START.j) >= 0.2) return { id: 'phillipsfrq',
    q: 'Over your term, unemployment went from ' + f1(START.j) + '% to ' + f1(end.j) + '% and inflation from ' + f1(START.i) + '% to ' + f1(end.i) + '%. Assume the natural rate of unemployment is ' + f1(NATURAL) + '%.\n(a) Draw a correctly labeled graph with a short-run and a long-run Phillips curve. Label the natural rate.\n(b) Plot points A (where you started) and B (where you ended) as best you can.\n(c) If the economy is left alone, what happens to unemployment in the long run? Explain.\n(d) Explain how inflation expectations affect the short-run Phillips curve.',
    rubric: ['(a) Correctly labeled axes (inflation, unemployment) with a downward SRPC and a vertical LRPC at ' + f1(NATURAL) + '%', '(b) A and B placed consistently with the numbers given', '(c) Unemployment returns to the natural rate of ' + f1(NATURAL) + '%', '(d) Higher expected inflation shifts the SRPC up (right); lower expectations shift it down (left)'] };
  if (focus === 'u5') return frqByOutcome(end, 'growth');
  return frqByOutcome(end);
}

// The written response picked by how the term ended (mixed sessions and Unit 3), or a named one.
function frqByOutcome(end, want) {
  const k = want || (end.j >= 5.0 ? 'recession' : end.i >= 4.0 ? 'inflation' : end.d >= 7.5 ? 'crowding' : 'growth');
  if (k === 'recession') return {
    id: 'recession',
    q: 'Your term ended with unemployment at ' + end.j.toFixed(1) + '%, above the 4.3% you started with. Assume the economy is in a recessionary gap.\n(a) Draw a correctly labeled AD-AS graph showing a recessionary gap. Label the current output Y1 and full-employment output Yf.\n(b) Identify one specific fiscal policy action that would close the gap.\n(c) Explain how your action in (b) affects real output and the price level.\n(d) If your action increases the budget deficit, explain its effect on the real interest rate in the loanable funds market.',
    rubric: ['(a) Correctly labeled AD-AS graph with the AD-SRAS intersection to the left of a vertical LRAS', '(b) An expansionary fiscal action: cut taxes or raise government spending', '(c) AD shifts right: real output rises and the price level rises', '(d) Government borrowing increases the demand for loanable funds, so the real interest rate rises'],
  };
  if (k === 'inflation') return {
    id: 'inflation',
    q: 'Your term ended with inflation at ' + end.i.toFixed(1) + '%, above the 3.0% you started with. Assume the economy is in an inflationary gap.\n(a) Draw a correctly labeled AD-AS graph showing an inflationary gap. Label the current output Y1 and full-employment output Yf.\n(b) Identify one specific fiscal policy action that would close the gap.\n(c) Explain how your action in (b) affects real output and the price level.\n(d) Explain one cost of that action for a group of voters.',
    rubric: ['(a) Correctly labeled AD-AS graph with the AD-SRAS intersection to the right of a vertical LRAS', '(b) A contractionary fiscal action: raise taxes or cut government spending', '(c) AD shifts left: real output falls and the price level falls (or rises less)', '(d) A reasonable cost, e.g. higher taxes reduce disposable income or spending cuts end services some voters rely on'],
  };
  if (k === 'crowding') return {
    id: 'crowding',
    q: 'Your term ended with a budget deficit of ' + end.d.toFixed(1) + '% of GDP.\n(a) Draw a correctly labeled graph of the loanable funds market and show the effect of the higher government borrowing.\n(b) What happens to the real interest rate?\n(c) Explain the effect on private investment and on long-run economic growth.\n(d) Name one decision from your term that changed the deficit and explain how it did.',
    rubric: ['(a) Correctly labeled loanable funds graph (real interest rate, quantity of loanable funds) with demand shifting right', '(b) The real interest rate rises', '(c) Private investment falls (crowding out), so the capital stock grows more slowly and long-run growth is lower', '(d) A specific bill or response from their game tied correctly to higher or lower revenue or spending'],
  };
  return {
    id: 'growth',
    q: 'Your term ended with growth at ' + end.g.toFixed(1) + '%, unemployment at ' + end.j.toFixed(1) + '% and inflation at ' + end.i.toFixed(1) + '%.\n(a) Identify one decision from your term that likely affected the economy’s long-run productive capacity, and say whether it raised or lowered it.\n(b) Show the long-run effect on a correctly labeled AD-AS graph (or a production possibilities curve).\n(c) Explain one tradeoff of that decision: who gained, and who paid.',
    rubric: ['(a) A specific bill or response from their game, with a plausible effect on capital, labor, human capital or technology', '(b) LRAS (or the PPC) shifts in the direction given in (a), correctly labeled', '(c) A clear tradeoff naming a group that gained and a cost someone bore'],
  };
}

// ------------------------------------------------------------------ choosing three
export function buildQuiz(r, opts) {
  const o = opts || {};
  const d = (r && r.digest) || null;
  if (!d) return null;
  const F = facts(r, o);
  const items = allItems(F);
  const f = o.focus && UNIT_NAMES[o.focus] ? o.focus : null;
  // Questions about the student's own decisions and events come first; within each group the order is shuffled per
  // student (deterministically) so classmates who made the same choices still see different mixes.
  const order = (list) => list.map((x) => [hash(x.id + '|' + F.salt), x]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
  const game = order(items.filter((x) => x.g)), calc = order(items.filter((x) => !x.g));
  const picked = [];
  const take = (list, ok) => { for (const x of list) { if (picked.length >= MC_COUNT) return; if (picked.indexOf(x) < 0 && ok(x)) picked.push(x); } };
  if (f) {
    take(game, (x) => x.unit === f); take(calc, (x) => x.unit === f);
    take(game, () => true); take(calc, () => true);
  } else {
    // Mixed: a spread of units, own-game questions first.
    const fresh = (x) => !picked.some((p) => p.unit === x.unit);
    take(game, fresh); take(calc, fresh); take(game, () => true); take(calc, () => true);
  }
  const mcs = picked.map((x) => { const y = Object.assign({}, x); delete y.g; return y; });
  return { v: QUIZ_VERSION, mc: mcs, frq: f ? frqFor(F, f) : frqByOutcome(F.end) };
}

// Teacher-facing topic and unit for each kind of question (the part of the id before ':'), versions 1 and 2.
export const QUESTION_TOPICS = {
  market: ['u1', 'Supply and demand shifts'], control: ['u1', 'Price floors and ceilings'], taxsub: ['u1', 'Taxes, subsidies and market entry'],
  compadv: ['u1', 'Comparative advantage'], ppcoc: ['u1', 'Opportunity cost on a PPC'], ppc: ['u1', 'Unemployment on a PPC'],
  nominal: ['u2', 'Nominal and real GDP'], urate: ['u2', 'Calculating the unemployment rate'], cpi: ['u2', 'CPI and the inflation rate'],
  utype: ['u2', 'Types of unemployment'], index: ['u2', 'Inflation and indexing'], gdpcount: ['u2', 'What GDP counts'], cycle: ['u2', 'The business cycle'],
  fiscal: ['u3', 'Fiscal policy and AD'], shock: ['u3', 'Shocks in the AD-AS model'], multiplier: ['u3', 'The spending multiplier'], taxmult: ['u3', 'The tax multiplier'],
  gap: ['u3', 'Output gaps'],
  omo: ['u4', 'Monetary policy tools'], mmkt: ['u4', 'The money market'], transmit: ['u4', 'How interest rates reach AD'], realrate: ['u4', 'Real interest rates'],
  banklend: ['u4', 'Banks and the money multiplier'], moneymult: ['u4', 'The money multiplier'], fedchair: ['u4', 'Central bank independence'],
  lolr: ['u4', 'Lender of last resort'], fedbill: ['u4', 'The Fed’s goals'],
  phillips: ['u5', 'The Phillips curve'], loanable: ['u5', 'Loanable funds and crowding out'], lras: ['u5', 'Long-run growth (LRAS)'],
  debt: ['u5', 'Deficits and the debt'], lrpc: ['u5', 'The long-run Phillips curve'],
  trade: ['u6', 'Tariffs and free trade'], fx: ['u6', 'Exchange rates and interest rates'], capflow: ['u6', 'Capital flows'],
  tot: ['u6', 'Terms of trade'], xrate: ['u6', 'Converting currencies'],
};
export const topicOf = (id) => QUESTION_TOPICS[String(id).split(':')[0]] || ['', String(id).split(':')[0]];

// The quiz a stored result was (or will be) answered with: version 1 answers are rebuilt with the version 1 builder.
export function buildQuizFor(r, opts) {
  if (r && r.quiz && r.quiz.v === 1) return buildQuizV1(r, opts);
  return buildQuiz(r, opts);
}

// Grades multiple-choice answers against the rebuilt quiz. answers: array of choice indexes, one per question.
export function gradeQuiz(quiz, answers) {
  if (!quiz || !Array.isArray(answers) || answers.length !== quiz.mc.length) return null;
  if (!answers.every((a) => Number.isInteger(a) && a >= 0 && a < 4)) return null;
  const right = quiz.mc.map((m, i) => answers[i] === m.answer);
  return { correct: right.filter(Boolean).length, of: quiz.mc.length, right };
}
