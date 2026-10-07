// Small shared helpers for the classroom/teacher pages: escaping, formatting, charts, dialogs, toasts.
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const num = (v, d = 1) => (v == null || v === '' || isNaN(Number(v)) ? '-' : Number(v).toFixed(d));
export const sgn = (v, d = 1) => (v == null || isNaN(Number(v)) ? '-' : (Number(v) >= 0 ? '+' : '−') + Math.abs(Number(v)).toFixed(d));

export function relTime(iso) {
  if (!iso) return 'never';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return Math.round(s / 60) + ' min ago';
  if (s < 86400) return Math.round(s / 3600) + ' h ago';
  return Math.round(s / 86400) + ' d ago';
}
export const when = (iso) => (iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '');
export function untilText(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const h = ms / 3600000;
  return h < 1 ? 'expires in ' + Math.max(1, Math.round(ms / 60000)) + ' min' : h < 48 ? 'expires in ' + Math.round(h) + ' h' : 'expires in ' + Math.round(h / 24) + ' days';
}

// The six meters the game reports. `good` says which direction is better so charts can say so in words, not just colour.
export const METRICS = [
  { key: 'econ_growth', label: 'Economy (GDP growth)', unit: '%', d: 1, signed: true, lo: -6, hi: 6, good: 'higher is better' },
  { key: 'unemployment', label: 'Unemployment', unit: '%', d: 1, lo: 0, hi: 15, good: 'lower is better' },
  { key: 'inflation', label: 'Inflation', unit: '%', d: 1, lo: -2, hi: 12, good: 'about 2% is ideal' },
  { key: 'deficit', label: 'Deficit / GDP', unit: '%', d: 1, lo: 0, hi: 15, good: 'lower is better' },
  { key: 'approval', label: 'Approval', unit: '%', d: 0, lo: 0, hi: 100, good: 'higher is better' },
  { key: 'unrest', label: 'Unrest', unit: '', d: 0, lo: 0, hi: 100, good: 'lower is better' },
];
export const fmtMetric = (m, v) => (v == null ? '-' : (m.signed ? sgn(v, m.d) : num(v, m.d)) + m.unit);

// Score distribution: every bar carries its number, so nothing depends on colour.
export function distChart(dist) {
  const max = Math.max(1, ...dist.map((b) => b.count));
  const total = dist.reduce((a, b) => a + b.count, 0);
  return '<div class="t-dist" role="img" aria-label="Score distribution: ' + esc(dist.map((b) => b.label + ': ' + b.count).join(', ')) + '">' +
    dist.map((b) => '<div class="t-dist-col"><span class="t-dist-n">' + b.count + '</span><span class="t-dist-bar" style="height:' + Math.round((b.count / max) * 100) + '%"></span><span class="t-dist-l">' + esc(b.label) + '</span></div>').join('') +
    '</div><div class="t-note">Score ranges, ' + total + ' result' + (total === 1 ? '' : 's') + '. Higher scores mean a stronger long-term outcome.</div>';
}

// Min / average / max for each meter across the class, on a fixed scale so charts are comparable between sessions.
export function rangeChart(results) {
  if (!results.length) return '';
  return '<div class="t-ranges">' + METRICS.map((m) => {
    const vals = results.map((r) => Number(r[m.key])).filter((v) => !isNaN(v));
    if (!vals.length) return '';
    const lo = Math.min(m.lo, ...vals), hi = Math.max(m.hi, ...vals), span = hi - lo || 1;
    const mn = Math.min(...vals), mx = Math.max(...vals), av = vals.reduce((a, b) => a + b, 0) / vals.length;
    const pos = (v) => (((v - lo) / span) * 100).toFixed(1);
    return '<div class="t-range"><div class="t-range-h"><b>' + esc(m.label) + '</b><span class="t-note">' + esc(m.good) + '</span></div>' +
      '<div class="t-track" role="img" aria-label="' + esc(m.label + ': lowest ' + fmtMetric(m, mn) + ', average ' + fmtMetric(m, av) + ', highest ' + fmtMetric(m, mx)) + '">' +
      '<i class="t-span" style="left:' + pos(mn) + '%;width:' + Math.max(1, pos(mx) - pos(mn)).toFixed(1) + '%"></i><i class="t-avg" style="left:' + pos(av) + '%"></i></div>' +
      '<div class="t-range-v"><span>lowest ' + esc(fmtMetric(m, mn)) + '</span><span class="t-avg-l">class average ' + esc(fmtMetric(m, av)) + '</span><span>highest ' + esc(fmtMetric(m, mx)) + '</span></div></div>';
  }).join('') + '</div>';
}

export function avgCards(avg) {
  if (!avg) return '<div class="t-empty">Results appear here as students finish.</div>';
  const cards = [{ label: 'Class average score', v: String(avg.score), big: true }].concat(
    METRICS.map((m) => ({ label: m.label + ' (avg)', v: fmtMetric(m, avg[m.key]) })));
  return '<div class="t-cards">' + cards.map((c) => '<div class="t-stat' + (c.big ? ' big' : '') + '"><span class="t-stat-l">' + esc(c.label) + '</span><span class="t-stat-v">' + esc(c.v) + '</span></div>').join('') + '</div>';
}

// Highlights are VALUES, never names: "Highest GDP growth 3.2%" rather than a student's nickname.
export function highlightList(h) {
  if (!h) return '';
  const rows = [
    ['Most resilient economy (top score)', h.most_resilient_score],
    ['Strongest economy (highest GDP growth)', sgn(h.strongest_economy) + '%'],
    ['Lowest deficit', num(h.lowest_deficit) + '% of GDP'],
    ['Lowest unemployment', num(h.lowest_unemployment) + '%'],
    ['Highest approval', Math.round(h.highest_approval) + '%'],
    ['Calmest country (lowest unrest)', Math.round(h.calmest_country)],
  ];
  return '<dl class="t-hl">' + rows.map((r) => '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>').join('') + '</dl>';
}

export function gradeChips(obj) {
  const keys = Object.keys(obj || {}).sort();
  return keys.length ? keys.map((k) => '<span class="t-chip">' + esc(k) + ' × ' + obj[k] + '</span>').join(' ') : '<span class="t-note">none yet</span>';
}

// ---- dialogs and toasts
export function confirmDialog({ title, body, confirm = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    if (typeof HTMLDialogElement === 'undefined') { resolve(window.confirm(title + '\n\n' + body)); return; }
    const d = document.createElement('dialog');
    d.className = 't-dialog';
    d.innerHTML = '<form method="dialog"><h2>' + esc(title) + '</h2><p>' + esc(body) + '</p><div class="t-actions"><button class="t-btn ghost" value="cancel" autofocus>Cancel</button><button class="t-btn ' + (danger ? 'danger' : 'gold') + '" value="ok">' + esc(confirm) + '</button></div></form>';
    d.addEventListener('close', () => { const ok = d.returnValue === 'ok'; d.remove(); resolve(ok); });
    document.body.appendChild(d);
    d.showModal();
  });
}
let toastTimer = null;
export function toast(msg, kind = 'ok') {
  let el = document.getElementById('t-toast');
  if (!el) { el = document.createElement('div'); el.id = 't-toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
  el.className = 't-toast ' + kind; el.textContent = msg; el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, kind === 'err' ? 6000 : 3200);
}
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Copied.'); } catch (e) { toast('Copy failed. Select the text and copy it manually.', 'err'); }
}
