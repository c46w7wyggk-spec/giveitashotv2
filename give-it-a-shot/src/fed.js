// The Federal Reserve. The President does not set interest rates; an independent Fed does, once a day in the game, by a
// Taylor (1993) rule: target = neutral real rate + inflation + 0.5 x (inflation - target) - 1.0 x (unemployment - natural rate),
// i.e. Taylor's 0.5 weight on the output gap with Okun's law (1 point of unemployment ~ 2% of output). It moves at most half
// a point a day, in quarter points, and never below zero.
// The rate is a read-out, not an extra force on the economy: the effects of the bills in the catalog are estimates that
// already include the Fed's usual response (as CBO's do), so feeding the rate back in would count it twice. What the player
// can change is how the Fed behaves (its goal, its target, who runs it), and those bills carry their own estimated effects.
export const FED = { start: 4.5, rstar: 1.0, target: 2.0, natural: 4.3, a: 0.5, b: 1.0, step: 0.25, maxMove: 0.5 };
// Bills and actions that change how the Fed sets rates.
export const FED_LEVERS = ['fedsingle', 'fedtarget3', 'fedaudit', 'fedfire'];

// on: { id: true } for the levers in effect. m: { i: inflation, j: unemployment }.
export function fedRule(m, on) {
  const pt = on.fedtarget3 ? 3.0 : FED.target;
  const a = on.fedsingle ? 1.0 : FED.a, b = on.fedsingle ? 0 : FED.b;
  let t = FED.rstar + m.i + a * (m.i - pt) - b * (m.j - FED.natural);
  if (on.fedfire) t -= 2.0;   // a loyalist chair holds rates well below what the economy calls for
  return Math.max(0, t);
}
// The next rate from the current one: toward the target, at most maxMove, in quarter points.
export function fedStep(prev, target) {
  const want = Math.round(target / FED.step) * FED.step;
  const mv = Math.max(-FED.maxMove, Math.min(FED.maxMove, want - prev));
  return Math.max(0, Math.round((prev + mv) / FED.step) * FED.step);
}
export const fedPct = (r) => r.toFixed(2) + '%';
