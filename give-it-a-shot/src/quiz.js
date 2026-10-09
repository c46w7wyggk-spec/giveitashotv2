// AP Macroeconomics check-up built from one student's own classroom game. Pure and deterministic: the student's browser,
// the teacher's browser and the classroom edge function all build the same questions from the same stored result,
// so the server can grade the multiple-choice answers itself. No imports: the edge function gets a verbatim copy
// (scripts/make-server-engine.mjs). Bill titles are optional (titleOf); the server builds questions without them.
//
// r: a stored classroom result { digest, econ_growth, unemployment, inflation, deficit }.
// opts: { focus: AP unit key or null, titleOf: (billId) => title }
export const QUIZ_VERSION = 1;
export const MC_COUNT = 3;
export const FRQ_MAX = 1200;

export const UNIT_NAMES = {
  u1: 'Unit 1: Basic economic concepts',
  u3: 'Unit 3: National income, price determination and fiscal policy',
  u4: 'Unit 4: The financial sector',
  u5: 'Unit 5: Long-run consequences of stabilization policies',
  u6: 'Unit 6: The open economy',
};

const START = { g: 2.0, j: 4.3, i: 3.0, d: 5.8 };
const FISCAL = {
  tc: ['stdded', 'salt', 'taxfree', 'payrollhol', 'cg0', 'corp15', 'estate', 'charity', 'cgindex', 'rdcredit', 'gasholiday', 'eitc', 'ctc', 'eitcless'],
  ti: ['top70', 'wealth', 'progbrk', 'closeloop', 'minimumtax', 'dividendtax', 'unrealized'],
  su: ['infra', 'jobg', 'ubi', 'ssx', 'hsr', 'gridfund', 'portinfra', 'waterinfra', 'transitfund', 'broadband', 'defup', 'teacherpay', 'college',
    'prek', 'meals', 'ccollege', 'tenantaid', 'housevoucher', 'firsthome', 'wildfire', 'nursefund', 'chips', 'uireform'],
  sd: ['cut10', 'defcut', 'aidcut', 'medadv'],
};
const FLOORS = ['mw15'];
const CEILINGS = { rc: 'rental housing', gascap: 'gasoline', ccap: 'credit-card loans', payday: 'small loans' };
const TARIFFS = ['tar25', 'targettariff'];
const OPENING = ['trade', 'pacpact'];
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

// Every bill id this file names, so test/quiz.mjs can check they all exist in the catalog.
export const referencedBills = () => [].concat(...Object.values(FISCAL), FLOORS, Object.keys(CEILINGS), TARIFFS, OPENING);
const r1 = (v) => Math.round(Number(v) * 10) / 10;
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
// Shuffles the choices the same way everywhere; returns the item with `answer` pointing at the correct choice's new index.
function mc(id, unit, q, right, wrong, why, salt) {
  const all = [right].concat(wrong);
  let h = hash(id + '|' + salt);
  const idx = all.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; const j = h % (i + 1); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
  return { id, unit, kind: 'mc', q, choices: idx.map((i) => all[i]), answer: idx.indexOf(0), why };
}
const firstIn = (ids, list) => ids.find((x) => list.indexOf(x) >= 0);

export function buildQuiz(r, opts) {
  const o = opts || {};
  const d = (r && r.digest) || null;
  if (!d) return null;
  const title = (id) => { const t = o.titleOf ? o.titleOf(id) : ''; return t ? '“' + t + '”' : 'that bill'; };
  const signed = (d.signed || []).filter((x) => (d.repealed || []).indexOf(x) < 0);
  const salt = signed.join(',') + '|' + (d.ev || []).join(',');
  const end = { g: r1(r.econ_growth), j: r1(r.unemployment), i: r1(r.inflation), d: r1(r.deficit) };
  const items = [];

  // Fiscal policy: a tax or spending bill the student signed.
  const fk = Object.keys(FISCAL).map((k) => [k, firstIn(signed, FISCAL[k])]).filter((x) => x[1]).sort((a, b) => signed.indexOf(a[1]) - signed.indexOf(b[1]))[0];
  if (fk) {
    const exp = fk[0] === 'tc' || fk[0] === 'su';
    const kind = { tc: 'cuts taxes', ti: 'raises taxes', su: 'raises government spending', sd: 'cuts government spending' }[fk[0]];
    const A = 'Expansionary fiscal policy: aggregate demand shifts right', B = 'Contractionary fiscal policy: aggregate demand shifts left';
    items.push(mc('fiscal:' + fk[1], 'u3', 'You signed ' + title(fk[1]) + ', which ' + kind + '. In the short run, this is best described as:',
      exp ? A : B, [exp ? B : A, 'Expansionary monetary policy: the money supply increases', 'A negative supply shock: short-run aggregate supply shifts left'],
      { tc: 'Lower taxes raise households’ and firms’ after-tax income, so consumption and investment rise and AD shifts right.',
        su: 'Government spending and transfers add to total spending, directly or through higher household income, so AD shifts right.',
        ti: 'Higher taxes lower after-tax income, so consumption and investment fall and AD shifts left.',
        sd: 'Less government spending removes demand directly, so AD shifts left.' }[fk[0]] + ' Fiscal policy is set by Congress and the President; monetary policy is the central bank’s.', salt));
  }

  // Phillips curve: how unemployment and inflation moved over the term.
  const dj = end.j - START.j, di = end.i - START.i;
  if (Math.abs(dj) >= 0.2 && Math.abs(di) >= 0.2) {
    const along = (dj < 0 && di > 0) || (dj > 0 && di < 0);
    const right = along ? 'A movement along the short-run Phillips curve, as a change in aggregate demand traded unemployment against inflation'
      : (dj >= 0 && di >= 0) ? 'A rightward shift of the short-run Phillips curve, as from a negative supply shock'
        : 'A leftward shift of the short-run Phillips curve, as from a positive supply shock';
    const pool = ['A movement along the short-run Phillips curve, as a change in aggregate demand traded unemployment against inflation',
      'A rightward shift of the short-run Phillips curve, as from a negative supply shock',
      'A leftward shift of the short-run Phillips curve, as from a positive supply shock',
      'A shift of the long-run Phillips curve caused by a change in the inflation rate'];
    items.push(mc('phillips', 'u5', 'Over your term, unemployment went from ' + START.j.toFixed(1) + '% to ' + end.j.toFixed(1) + '% and inflation from ' + START.i.toFixed(1) + '% to ' + end.i.toFixed(1) + '%. On a Phillips curve graph, this pattern is most consistent with:',
      right, pool.filter((x) => x !== right).slice(0, 3),
      along ? 'When unemployment and inflation move in opposite directions, the economy is moving along the short-run Phillips curve, usually because aggregate demand changed.'
        : 'When unemployment and inflation move in the same direction, the short-run Phillips curve itself has shifted, usually because of a supply shock or changed inflation expectations. The long-run Phillips curve is vertical at the natural rate and does not move with inflation.', salt));
  }

  // A shock the student lived through.
  const ev = (d.ev || []).map((x) => { const p = String(x).split(':'); return { day: +p[0], id: p[1] }; }).find((e) => SHOCKS[e.id]);
  if (ev) {
    const sk = SHOCKS[ev.id];
    const ans = { sras: 'Short-run aggregate supply shifts left: the price level rises and real output falls', adl: 'Aggregate demand shifts left: the price level and real output both fall', lras: 'Long-run aggregate supply shifts right: potential output rises' }[sk[1]];
    const pool = ['Short-run aggregate supply shifts left: the price level rises and real output falls', 'Aggregate demand shifts left: the price level and real output both fall',
      'Long-run aggregate supply shifts right: potential output rises', 'Aggregate demand shifts right: the price level and real output both rise'];
    items.push(mc('shock:' + ev.id, sk[1] === 'lras' ? 'u5' : 'u3', 'On day ' + ev.day + ' of your term, ' + sk[0] + '. In the AD-AS model, the most likely immediate effect is:',
      ans, pool.filter((x) => x !== ans),
      { sras: 'Destroyed property, damaged infrastructure or costlier energy raise production costs, a negative supply shock. SRAS shifts left, causing stagflation: higher prices and lower output.',
        adl: 'Falling stock prices make households feel poorer and banks lend less, so consumption and investment fall. AD shifts left.',
        lras: 'Better technology raises productivity, so the economy can produce more at full employment. LRAS (and SRAS) shift right.' }[sk[1]], salt));
  }

  // Loanable funds: what the student did to the deficit.
  const dd = end.d - START.d;
  if (Math.abs(dd) >= 0.5) {
    const up = dd > 0;
    const right = up ? 'The demand for loanable funds increases, raising the real interest rate and crowding out private investment'
      : 'The demand for loanable funds decreases, lowering the real interest rate and encouraging private investment';
    items.push(mc('loanable', 'u5', 'Your deficit went from ' + START.d.toFixed(1) + '% to ' + end.d.toFixed(1) + '% of GDP. In the loanable funds market, this ' + (up ? 'extra' : 'reduced') + ' government borrowing most likely means:',
      right, [up ? 'The demand for loanable funds decreases, lowering the real interest rate and encouraging private investment' : 'The demand for loanable funds increases, raising the real interest rate and crowding out private investment',
        'The supply of loanable funds increases, lowering the real interest rate', 'The real interest rate is unchanged because the central bank sets it'],
      up ? 'A government that borrows more adds to the demand for loanable funds. The real interest rate rises, and some private investment is crowded out.'
        : 'Less government borrowing reduces the demand for loanable funds. The real interest rate falls, which makes private investment cheaper.', salt));
  }

  // Price controls.
  const pf = firstIn(signed, FLOORS), pc = firstIn(signed, Object.keys(CEILINGS));
  if (pf || pc) {
    const floor = !!pf && (!pc || signed.indexOf(pf) < signed.indexOf(pc));
    const id = floor ? pf : pc;
    const right = floor ? 'A surplus: more workers want jobs at that wage than employers want to hire' : 'A shortage: people want more ' + CEILINGS[id] + ' than sellers offer at that price';
    const pool = [right, floor ? 'A shortage: employers want to hire more workers than are available at that wage' : 'A surplus: sellers offer more ' + CEILINGS[id] + ' than people want at that price',
      'A higher equilibrium quantity bought and sold', 'No change, because price controls only affect the government budget'];
    items.push(mc('control:' + id, 'u1', 'You signed ' + title(id) + '. If it is set ' + (floor ? 'above' : 'below') + ' the market equilibrium, it acts as a binding price ' + (floor ? 'floor' : 'ceiling') + '. The most likely result is:',
      right, pool.filter((x) => x !== right).slice(0, 3),
      floor ? 'A price floor above equilibrium makes the quantity supplied (workers looking for jobs) exceed the quantity demanded (jobs employers offer).'
        : 'A price ceiling below equilibrium makes the quantity demanded exceed the quantity supplied, so there is a shortage.', salt));
  }

  // Trade.
  const tf = firstIn(signed, TARIFFS), op = firstIn(signed, OPENING);
  if (tf || op) {
    const tar = !!tf && (!op || signed.indexOf(tf) < signed.indexOf(op));
    const id = tar ? tf : op;
    const A = 'Domestic prices rise, domestic producers gain, and consumer surplus falls';
    const B = 'Domestic prices fall, consumers gain, and some import-competing producers and workers lose';
    items.push(mc('trade:' + id, 'u6', 'You signed ' + title(id) + '. Compared with before, this most likely means:', tar ? A : B,
      [tar ? B : A, 'Imports rise because foreign goods become cheaper for domestic buyers', 'Prices stay the same because trade only affects exporters'],
      tar ? 'A tariff raises the price of imports, so domestic producers can charge more and sell more. Consumers pay more and buy less, so consumer surplus falls and there is deadweight loss.'
        : 'Lower trade barriers let cheaper imports in. Consumers gain more than producers lose overall, but the losses are concentrated on import-competing industries.', salt));
  }

  // Generic concept checks, used when the game above did not produce enough questions.
  items.push(mc('multiplier', 'u3', 'Suppose the marginal propensity to consume (MPC) is 0.8. What is the spending multiplier?', '5', ['1.25', '4', '0.8'],
    'The spending multiplier is 1 / (1 − MPC) = 1 / 0.2 = 5, so each $1 of new government spending can raise real GDP by up to $5.', salt));
  items.push(mc('lras', 'u5', 'Which policy would most directly shift the long-run aggregate supply curve to the right?', 'Funding job training that raises workers’ productivity',
    ['A temporary cut in the payroll tax', 'A price ceiling on gasoline', 'A higher tariff on imported steel'],
    'Long-run growth comes from more or better resources: physical capital, human capital and technology. Job training raises human capital, so potential output rises.', salt));
  items.push(mc('moneymult', 'u4', 'If banks must hold 10% of deposits as reserves, what is the maximum (simple) money multiplier?', '10', ['0.1', '1.1', '90'],
    'The simple money multiplier is 1 / reserve requirement = 1 / 0.10 = 10.', salt));

  const f = o.focus && UNIT_NAMES[o.focus] ? o.focus : null;
  const ordered = f ? items.filter((x) => x.unit === f).concat(items.filter((x) => x.unit !== f)) : items;
  const mcs = ordered.slice(0, MC_COUNT);
  return { v: QUIZ_VERSION, mc: mcs, frq: frqFor(end) };
}

function frqFor(end) {
  if (end.j >= 5.0) return {
    id: 'recession',
    q: 'Your term ended with unemployment at ' + end.j.toFixed(1) + '%, above the 4.3% you started with. Assume the economy is in a recessionary gap.\n(a) Draw a correctly labeled AD-AS graph showing a recessionary gap. Label the current output Y1 and full-employment output Yf.\n(b) Identify one specific fiscal policy action that would close the gap.\n(c) Explain how your action in (b) affects real output and the price level.\n(d) If your action increases the budget deficit, explain its effect on the real interest rate in the loanable funds market.',
    rubric: ['(a) Correctly labeled AD-AS graph with the AD-SRAS intersection to the left of a vertical LRAS', '(b) An expansionary fiscal action: cut taxes or raise government spending', '(c) AD shifts right: real output rises and the price level rises', '(d) Government borrowing increases the demand for loanable funds, so the real interest rate rises'],
  };
  if (end.i >= 4.0) return {
    id: 'inflation',
    q: 'Your term ended with inflation at ' + end.i.toFixed(1) + '%, above the 3.0% you started with. Assume the economy is in an inflationary gap.\n(a) Draw a correctly labeled AD-AS graph showing an inflationary gap. Label the current output Y1 and full-employment output Yf.\n(b) Identify one specific fiscal policy action that would close the gap.\n(c) Explain how your action in (b) affects real output and the price level.\n(d) Explain one cost of that action for a group of voters.',
    rubric: ['(a) Correctly labeled AD-AS graph with the AD-SRAS intersection to the right of a vertical LRAS', '(b) A contractionary fiscal action: raise taxes or cut government spending', '(c) AD shifts left: real output falls and the price level falls (or rises less)', '(d) A reasonable cost, e.g. higher taxes reduce disposable income or spending cuts end services some voters rely on'],
  };
  if (end.d >= 7.5) return {
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

// Grades multiple-choice answers against the rebuilt quiz. answers: array of choice indexes, one per question.
export function gradeQuiz(quiz, answers) {
  if (!quiz || !Array.isArray(answers) || answers.length !== quiz.mc.length) return null;
  if (!answers.every((a) => Number.isInteger(a) && a >= 0 && a < 4)) return null;
  const right = quiz.mc.map((m, i) => answers[i] === m.answer);
  return { correct: right.filter(Boolean).length, of: quiz.mc.length, right };
}
