// Validates the policy catalog: shape, text, tree logic. Usage: node scripts/check-catalog.mjs [part.js ...]  (no args = every part file, strict)
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
import { Engine } from '../src/engine.js';
import { BASE_TOPIC, BASE_SYS, BASE_KILL } from '../src/policies/base_tree.js';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'src/policies');
const all = fs.readdirSync(dir).filter((f) => f.endsWith('.js') && !['p.js', 'base_tree.js'].includes(f));
const args = process.argv.slice(2);
const files = args.length ? args : all;
const strict = !args.length;
const D = new Engine().data();
const FAC = Object.keys(D.FAC), STS = Object.keys(D.ST);
const errs = [], warn = [];
const E = (id, m) => errs.push(id + ': ' + m);
const planned = fs.existsSync(process.env.PLANNED || '') ? JSON.parse(fs.readFileSync(process.env.PLANNED, 'utf8')) : [];

// every catalog entry, from every part (so cross-file references resolve)
const cat = [];
const raw = {};
for (const f of all) {
  const m = await import(path.join(dir, f));
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  raw[f] = src;
  Object.values(m).forEach((arr) => { if (Array.isArray(arr)) arr.forEach((p) => cat.push({ ...p, _file: f })); });
}
const catIds = new Set(cat.map((p) => p.id));
const base = {}; D.POL.filter((p) => !catIds.has(p.id)).forEach((p) => { base[p.id] = { ...p, desk: true, slot: D.SLOT[p.id] || [], sys: BASE_SYS[p.id] || [], kill: BASE_KILL[p.id] || [] }; });
D.XA.forEach((p) => { base[p.id] = { ...p, desk: false, slot: D.SLOT[p.id] || [], sys: BASE_SYS[p.id] || [], kill: BASE_KILL[p.id] || [] }; });
const byId = { ...base };
const dup = new Set();
cat.forEach((p) => { if (byId[p.id]) { E(p.id, 'duplicate id'); } byId[p.id] = { ...p, desk: true, slot: p.slot || [], sys: p.sys || [], kill: p.kill || [] }; });
const titles = new Map();
Object.values(byId).forEach((p) => { const k = (p.t || '').toLowerCase(); if (titles.has(k)) E(p.id, 'duplicate title with ' + titles.get(k)); titles.set(k, p.id); });

const str = (id, p, k, min, max) => { const v = p[k]; if (typeof v !== 'string' || v.trim().length < min) return E(id, 'missing/short ' + k); if (v.length > max) E(id, k + ' too long (' + v.length + '>' + max + ')'); if (/[—–]/.test(v)) E(id, k + ' has an em/en dash'); if (/\s{2}|^\s|\s$/.test(v)) E(id, k + ' has odd spacing'); };
const short = (id, what, v) => { if (typeof v !== 'string' || v.length < 1 || v.length > 15 || !/^[a-z0-9]+$/.test(v)) E(id, what + ' "' + v + '" must be 1-15 chars a-z0-9'); };

const check = cat.filter((p) => files.some((f) => path.basename(f) === p._file));
for (const p of check) {
  const id = p.id; short(id, 'id', id);
  short(id, 'tp', (p.tp || '').toLowerCase().replace(/[^a-z]/g, '') || '');
  if (typeof p.tp !== 'string' || p.tp.length > 15) E(id, 'tp must be a string up to 15 chars');
  if (![-3, -2, -1, 0, 1, 2, 3].includes(p.lean)) E(id, 'lean must be an integer -3..3');
  if (!Array.isArray(p.f) || p.f.length !== 6 || p.f.some((x) => typeof x !== 'number' || Math.abs(x) > 8)) E(id, 'f must be 6 numbers');
  else { if (Math.abs(p.f[0]) > 1.6) E(id, 'GDP effect too big'); if (Math.abs(p.f[1]) > 1.6) E(id, 'jobless effect too big'); if (Math.abs(p.f[2]) > 1.4) E(id, 'inflation effect too big'); if (Math.abs(p.f[3]) > 5.6) E(id, 'deficit effect too big'); if (Math.abs(p.f[4]) > 7) E(id, 'approval effect too big'); if (Math.abs(p.f[5]) > 5) E(id, 'unrest effect too big'); }
  if (typeof p.sd !== 'number' || p.sd < 0.3 || p.sd > 1) E(id, 'sd must be 0.3..1');
  if (p.ang !== null && !(Array.isArray(p.ang) && FAC.includes(p.ang[0]) && p.ang[1] > 0 && p.ang[1] <= 0.7)) E(id, 'ang must be null or [faction, 0..0.7]');
  if (!Array.isArray(p.who) || p.who.length < 1 || p.who.length > 6 || p.who.some((s) => !STS.includes(s))) E(id, 'who must be 1-6 state codes');
  if (!Number.isInteger(p.wd) || Math.abs(p.wd) > 6) E(id, 'wd must be an integer -6..6');
  str(id, p, 't', 12, 95); str(id, p, 'm', 25, 190); str(id, p, 'hl', 25, 150);
  if (!Array.isArray(p.hlx) || p.hlx.length !== 2) E(id, 'hlx must be 2 headlines'); else p.hlx.forEach((h, i) => str(id, { h }, 'h', 20, 120));
  str(id, p, 'real', 60, 330); str(id, p, 'pro', 20, 150); str(id, p, 'con', 20, 150); str(id, p, 'mean', 120, 520);
  // direction sanity: planned-leaning bills (lean<0) should not make approval worse by a lot with no cost, etc. (soft)
  const arrs = { req: p.req, slot: p.slot, sys: p.sys, kill: p.kill };
  for (const k of ['slot', 'sys', 'kill']) if (p[k] !== undefined) { if (!Array.isArray(p[k])) E(id, k + ' must be an array'); else p[k].forEach((v) => short(id, k, v)); }
  if (p.dl !== undefined && !(Number.isInteger(p.dl) && p.dl >= 1 && p.dl <= 4)) E(id, 'dl must be 1..4');
  if (p.req !== undefined) {
    if (!Array.isArray(p.req)) E(id, 'req must be an array');
    else p.req.forEach((c) => {
      const opts = Array.isArray(c) ? c : [c];
      opts.forEach((o) => {
        if (typeof o !== 'string') return E(id, 'bad req item');
        const neg = o[0] === '!' || o[0] === '~'; const rid = neg ? o.slice(1) : o;
        short(id, 'req', rid);
        const t = byId[rid] || (planned.includes(rid) ? { desk: true, slot: [], sys: [], kill: [] } : null);
        if (!t) return E(id, 'req refers to unknown id ' + rid);
        if (rid === id) E(id, 'req refers to itself');
        if (o[0] === '~' && !t.desk) E(id, 'req ' + o + ' needs a desk bill (executive actions cannot be vetoed)');
        if (!neg) {
          if ((t.slot || []).some((s) => (p.slot || []).includes(s))) E(id, 'req ' + rid + ' shares a slot with this bill: it could never appear');
          if ((t.kill || []).some((s) => (p.sys || []).includes(s))) E(id, 'req ' + rid + ' abolishes a system this bill needs: it could never appear');
          if ((p.kill || []).some((s) => (t.sys || []).includes(s))) E(id, 'this bill abolishes a system that required ' + rid + ' needs');
        }
      });
    });
  }
  // consistency: the bill must not conflict with its own prerequisites
  if ((p.kill || []).some((s) => (p.sys || []).includes(s))) E(id, 'bill both needs and kills the same system');
}
for (const f of files) { const b = path.basename(f); if (raw[b] && /\\'/.test(raw[b])) E(b, "contains \\' - use a typographic apostrophe instead"); }

// reachability (strict mode, or whenever every referenced id exists): fixpoint over req, assuming any root bill can be signed
if (strict) {
  const reach = new Set(Object.keys(base));
  let ch = true;
  const okCond = (c, R) => (Array.isArray(c) ? c : [c]).some((o) => { const k = o[0]; const rid = k === '!' || k === '~' ? o.slice(1) : o; if (k === '!') return true; if (k === '~') return byId[rid] && byId[rid].desk && R.has(rid); return R.has(rid); });
  const R = new Set(Object.keys(base));
  cat.forEach((p) => R.delete(p.id));
  while (ch) { ch = false; cat.forEach((p) => { if (!R.has(p.id) && (p.req || []).every((c) => okCond(c, R))) { R.add(p.id); ch = true; } }); }
  cat.forEach((p) => { if (!R.has(p.id)) E(p.id, 'unreachable: its prerequisites can never be met'); });
  const roots = cat.filter((p) => !(p.req || []).length).length;
  const kids = cat.length - roots;
  console.log('catalog:', cat.length, 'bills,', roots, 'roots,', kids, 'follow-ups; base desk bills', D.POL.length - cat.length, '+ actions', D.XA.length);
  const tps = {}; cat.forEach((p) => { tps[p.tp] = (tps[p.tp] || 0) + 1; }); console.log('topics:', JSON.stringify(tps));
  const lean = { pl: cat.filter((p) => p.lean < 0).length, fm: cat.filter((p) => p.lean > 0).length }; console.log('lean split:', JSON.stringify(lean));
} else console.log('checked', check.length, 'bills in', files.join(', '));
if (errs.length) { console.log(errs.slice(0, 200).join('\n')); console.log(errs.length + ' problem(s)'); process.exit(1); }
console.log('catalog OK');
