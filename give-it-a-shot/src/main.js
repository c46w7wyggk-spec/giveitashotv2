import './style.css';
import template from './template.html?raw';
import { mount } from './runtime.js';
import { App } from './ui.js';
import { watchForUpdates } from './update.js';
import * as api from './api.js';

const root = document.getElementById('app');
let view;
const app = new App(() => view && view.render());
view = mount(root, template, () => {
  const g = app.state.g;
  // jump back to the top of the panel whenever the screen changes (new memo, new day, new tab, incident, end)
  const key = [g.phase, g.day, g.mi, g.inc.length, app.state.tab, app.state.pstory, g.imp ? g.imp.r : -1].join(':');
  if (key !== app._screenKey) { app._screenKey = key; requestAnimationFrame(() => { const m = document.getElementById('stage'); if (m) m.scrollTop = 0; }); }
  return app.getValues();
});
window.__app = app; // handy for debugging and tests

// Supreme Leader mode lives in its own root and is loaded the first time it is opened.
let leader = null;
window.__showLeader = async () => {
  const lroot = document.getElementById('lapp');
  if (!leader) {
    const [{ LeaderApp }, tpl] = await Promise.all([import('./leaderui.js'), import('./leader.html?raw')]);
    let lview;
    const lapp = new LeaderApp(() => lview && lview.render());
    lview = mount(lroot, tpl.default, () => {
      const g = lapp.state.g;
      const key = [g.phase, g.day, lapp.state.tab].join(':');
      if (key !== lapp._screenKey) { lapp._screenKey = key; requestAnimationFrame(() => { const e = document.getElementById('lstage'); if (e) e.scrollTop = 0; }); }
      return lapp.getValues();
    });
    leader = lapp; window.__leader = lapp;
  }
  document.getElementById('viewport').dataset.mode = 'leader';
  leader.setState({});
};
window.__leaderExit = () => { document.getElementById('viewport').dataset.mode = 'president'; };
app.init();

// ---- Classroom / Teacher Beta routes (/teachers, /teacher/*, /classroom/*) ----
// These live in their own lazily loaded chunk, so the public game's bundle and behaviour are unchanged.
// Nothing here grants access: every teacher call is re-checked by the database (see the Teacher Beta migration).
const CLASS_ROUTE = /^\/(teachers?|classroom)(\/|$)/;
const RETURN_KEY = 'gias_after_login';
const viewportEl = document.getElementById('viewport');
window.__classPlay = (info) => { app.startClass(info); viewportEl.dataset.class = '1'; viewportEl.dataset.mode = 'president'; };
window.__classHome = () => { delete viewportEl.dataset.class; viewportEl.dataset.mode = 'teacher'; window.dispatchEvent(new Event('gias:class-home')); };
(async () => {
  let path = window.location.pathname.replace(/\/+$/, '') || '/';
  let ret = null;
  try { ret = window.localStorage.getItem(RETURN_KEY); } catch (e) { /* storage blocked */ }
  // A magic link always lands on the site root; send the teacher back to the page they came from.
  if (ret && path === '/' && /access_token=|[?&]code=|token_hash=/.test(window.location.hash + window.location.search) && api.sb) {
    try { await api.sb.auth.getSession(); } catch (e) { /* the sign-in exchange failed; the teacher page will ask them to sign in again */ }
    try { window.localStorage.removeItem(RETURN_KEY); } catch (e) { /* ignore */ }
    if (CLASS_ROUTE.test(ret)) { window.history.replaceState(null, '', ret); path = ret.replace(/\/+$/, ''); }
  }
  if (CLASS_ROUTE.test(path)) {
    viewportEl.dataset.mode = 'teacher';
    const m = await import('./classroom/boot.js');
    m.boot();
  }
})();
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (app.state.helpOpen) app.setState({ helpOpen: false }); else if (app.state.authOpen) app.setState({ authOpen: false }); else if (app.state.pstory != null) app.setState({ pstory: null }); } });

// PWA: offline-capable shell (production only, so dev and tests are unaffected)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  watchForUpdates();
}
