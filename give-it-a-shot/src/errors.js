// Reports uncaught errors and failed server calls to the owner dashboard (public.log_client_error).
// Best effort and quiet: at most 8 reports per page load, each distinct problem once, and a failure to report is ignored.
// Only our own scripts are reported (browser extensions and third-party scripts are skipped). No form input is ever sent.
import { sb } from './api.js';

const BUILD = typeof __BUILD__ !== 'undefined' ? __BUILD__ : 'dev';
const MAX = 8;
const seen = new Set();
let sent = 0;

const IGNORE = /ResizeObserver loop|^Script error\.?$|Non-Error promise rejection captured|AbortError|Load failed|NetworkError when attempting|Failed to fetch/i;

export function report(kind, message, source, stack) {
  try {
    const msg = String(message || '').slice(0, 500).trim();
    if (!import.meta.env.PROD || !sb || !msg || IGNORE.test(msg) || sent >= MAX) return;
    const key = kind + '|' + msg + '|' + (source || '');
    if (seen.has(key)) return;
    seen.add(key); sent += 1;
    sb.rpc('log_client_error', {
      p_kind: kind, p_message: msg, p_source: source ? String(source).slice(0, 300) : null,
      p_stack: stack ? String(stack).slice(0, 2000) : null, p_path: window.location.pathname.slice(0, 200),
      p_build: BUILD, p_ua: navigator.userAgent.slice(0, 200),
    }).then(() => {}, () => {});
  } catch (e) { /* reporting must never break the page */ }
}

// A failed call to our own backend (5xx or an unexpected error code). `what` names the call, e.g. "submit-score".
export const reportApi = (what, detail) => report('api', what + ' failed: ' + String(detail || 'server error').slice(0, 300), what);

const ours = (file) => !file || file.startsWith(window.location.origin);
const short = (file, line, col) => (file ? file.replace(window.location.origin, '') + ':' + (line || 0) + ':' + (col || 0) : null);

export function installErrorReporting() {
  if (typeof window === 'undefined' || window.__giasErrors) return;
  window.__giasErrors = true;
  window.addEventListener('error', (e) => {
    if (!e || !e.message || !ours(e.filename)) return;
    report('error', e.message, short(e.filename, e.lineno, e.colno), e.error && e.error.stack);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e && e.reason;
    const msg = r && r.message ? r.message : typeof r === 'string' ? r : '';
    if (!msg) return;
    const stack = r && r.stack ? String(r.stack) : '';
    if (stack && /(chrome|moz|safari)-extension:\/\//.test(stack)) return;
    report('rejection', (r && r.name && r.name !== 'Error' ? r.name + ': ' : '') + msg, null, stack);
  });
}
