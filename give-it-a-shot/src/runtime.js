// Tiny template runtime for the game's <sc-if>/<sc-for>/{{hole}} syntax.
// compile() parses the template once; each render walks it with the current values, builds an HTML string,
// and morphdom patches the live DOM so animations, focus and scroll position survive re-renders.
import morphdom from 'morphdom';

const VOID = new Set(['input', 'br', 'img', 'hr', 'link', 'meta']);
const EVENTS = { onclick: 'click', oninput: 'input', onchange: 'change' };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => esc(s).replace(/"/g, '&quot;');
const HOLE = /\{\{\s*([\w.]+)\s*\}\}/g;

function get(scope, path) {
  let v = scope;
  for (const k of path.split('.')) { if (v == null) return undefined; v = v[k]; }
  return v;
}
const sub = (str, scope, f) => str.replace(HOLE, (_, p) => { const v = get(scope, p); return v == null || typeof v === 'function' ? '' : f(v); });

function emit(node, scope, out, handlers) {
  if (node.nodeType === 3) { out.push(sub(esc(node.nodeValue).replace(/&#123;/g, '{'), scope, esc)); return; }
  if (node.nodeType !== 1) return;
  const tag = node.localName;
  if (tag === 'sc-if') {
    const m = /\{\{\s*([\w.]+)\s*\}\}/.exec(node.getAttribute('value') || '');
    if (m && get(scope, m[1])) for (const c of node.childNodes) emit(c, scope, out, handlers);
    return;
  }
  if (tag === 'sc-for') {
    const m = /\{\{\s*([\w.]+)\s*\}\}/.exec(node.getAttribute('list') || '');
    const as = node.getAttribute('as') || 'item';
    const list = (m && get(scope, m[1])) || [];
    for (const item of list) {
      const s2 = Object.create(scope); s2[as] = item;
      for (const c of node.childNodes) emit(c, s2, out, handlers);
    }
    return;
  }
  out.push('<' + tag);
  for (const a of node.attributes) {
    const name = a.name;
    if (name.startsWith('hint-')) continue;
    const ev = EVENTS[name];
    if (ev) {
      const m = /\{\{\s*([\w.]+)\s*\}\}/.exec(a.value);
      const fn = m && get(scope, m[1]);
      if (typeof fn === 'function') { handlers.push(fn); out.push(' data-h-' + ev + '="' + (handlers.length - 1) + '"'); }
      continue;
    }
    out.push(' ' + name + '="' + sub(escAttr(a.value), scope, escAttr) + '"');
  }
  out.push('>');
  if (VOID.has(tag)) return;
  for (const c of node.childNodes) emit(c, scope, out, handlers);
  out.push('</' + tag + '>');
}

export function mount(root, templateHtml, getValues) {
  const doc = new DOMParser().parseFromString('<body>' + templateHtml + '</body>', 'text/html');
  const tpl = Array.from(doc.body.childNodes);
  let handlers = [];
  let queued = false;

  function render() {
    queued = false;
    const out = []; const hs = [];
    const vals = getValues();
    for (const n of tpl) emit(n, vals, out, hs);
    handlers = hs;
    const next = document.createElement('div');
    next.id = root.id; next.className = root.className;
    next.innerHTML = out.join('');
    morphdom(root, next, {
      onBeforeElUpdated(from, to) {
        // keep the user's caret and value while they type
        if (from === document.activeElement && (from.tagName === 'INPUT' || from.tagName === 'TEXTAREA')) {
          to.value = from.value;
        }
        return true;
      },
    });
  }
  const schedule = () => { if (!queued) { queued = true; queueMicrotask(render); } };

  for (const [dom, key] of [['click', 'click'], ['input', 'input'], ['change', 'change']]) {
    root.addEventListener(dom, (e) => {
      const el = e.target.closest && e.target.closest('[data-h-' + key + ']');
      if (!el || !root.contains(el)) return;
      const fn = handlers[+el.getAttribute('data-h-' + key)];
      if (fn) fn(e);
    });
  }
  render();
  return { render: schedule, renderNow: render };
}
