// Pure helpers for the classroom edge function. No Deno or Supabase APIs here, so test/classroom-lib.mjs can run them in Node.

export const CODE_RE = /^[A-HJKMNP-Z2-9]{6}$/;
const ADJ = ['Brave','Calm','Quick','Keen','Warm','Bright','Bold','Clever','Gentle','Lucky','Merry','Noble','Proud','Swift','Witty','Sunny','Steady','Plucky','Nimble','Jolly','Mellow','Daring','Eager','Fancy','Happy','Honest','Kind','Lively','Polite','Silver','Golden','Crimson','Amber','Cobalt','Misty','Rustic','Stormy','Velvet','Zesty','Cosmic'];
const ANIMAL = ['Otter','Fox','Lynx','Wolf','Hare','Owl','Crow','Heron','Badger','Beaver','Bison','Falcon','Finch','Gecko','Koala','Lemur','Moose','Newt','Ocelot','Panda','Quail','Raven','Seal','Tiger','Turtle','Vole','Walrus','Wren','Yak','Zebra','Marten','Puffin','Stoat','Robin','Eagle','Dolphin','Cougar','Magpie','Ibis','Mantis'];

// Accepts what a student might type: "abc 234", "ABC-234". Returns the canonical code, or null if it cannot be valid.
export function normalizeCode(input) {
  if (typeof input !== 'string' || input.length > 32) return null;
  const c = input.toUpperCase().replace(/[\s-]/g, '');
  return CODE_RE.test(c) ? c : null;
}

function randBelow(n, rnd = crypto.getRandomValues.bind(crypto)) {
  // rejection sampling over 32-bit values: no modulo bias
  const lim = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  for (;;) { rnd(buf); if (buf[0] < lim) return buf[0] % n; }
}

// Random, human-safe nicknames. Students never type a name, so there is no profanity or personal data to moderate.
export function makeNicknames(count = 12, rnd) {
  const out = new Set();
  while (out.size < count) out.add(ADJ[randBelow(ADJ.length, rnd)] + ' ' + ANIMAL[randBelow(ANIMAL.length, rnd)] + ' ' + (10 + randBelow(90, rnd)));
  return [...out];
}

const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
export function newToken(rnd = crypto.getRandomValues.bind(crypto)) { const b = new Uint8Array(32); rnd(b); return b64url(b); }

export async function sha256Hex(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Same shape check submit-score uses for action logs.
export const validLog = (log) => typeof log === 'string' && /^[svne0-3xA-Za-z0-9]{1,600}$/.test(log);

const r2 = (x) => Math.round(x * 100) / 100;
// Turn a replayed game into the metrics row we store. Everything comes from the server-side replay, never from the browser.
export function metricsFrom(run, engineVersion, log) {
  const m = run.sc.m;
  return {
    completion_status: run.g.over ? 'removed' : 'completed',
    score: run.sc.score, cons_letter: run.cons, lib_letter: run.lib, needle: run.needle,
    econ_growth: r2(m.g), unemployment: r2(m.j), inflation: r2(m.i), deficit: r2(m.d), approval: r2(m.a), unrest: r2(m.u),
    scandal: r2(run.g.scand || 0), engine_version: engineVersion, log,
  };
}
