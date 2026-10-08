// Compact constructor for the policy catalog. Positional on purpose so the long catalog stays readable.
// f = effects [GDP %, jobless pts, inflation pts, deficit % GDP, approval pts, unrest pts]
// o = optional tree fields:
//   req  : conditions that must ALL hold before the bill can reach the desk. A string is one condition, an array inside is "any of".
//          'id' = that policy or executive action is in effect;  '~id' = you vetoed it;  '!id' = it is NOT in effect.
//   dl   : days to wait after the parent decision (default 1)
//   slot : mutually exclusive topic slots (two bills sharing a slot can never both be law)
//   sys  : systems this bill depends on (inctax, deduct, corp, unions, postal, privins)
//   kill : systems this bill abolishes (conflicts with every bill that depends on them)
// IMPORTANT: the slim server engine blanks every string longer than 15 characters, so ids, req tokens, slots, systems and topics must stay short.
export const P = (id, tp, lean, f, sd, ang, who, wd, t, m, hl, hlx, real, pro, con, mean, o) =>
  Object.assign({ id, tp, t, m, lean, f, sd, ang, who, wd, real, pro, con, hl, hlx, mean }, o || {});
