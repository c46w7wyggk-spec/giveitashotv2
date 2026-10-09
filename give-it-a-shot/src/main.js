import './style.css';
import template from './template.html?raw';
import { mount } from './runtime.js';
import { App } from './ui.js';
import { watchForUpdates } from './update.js';
import * as api from './api.js';
import { installErrorReporting } from './errors.js';

installErrorReporting();

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
  // Every auth email link (magic link, sign-up confirmation, password reset) lands on the site root; send teachers back to /teacher.
  // The hash is read before getSession() because the auth client clears it once it has consumed the tokens.
  const link = window.location.hash + window.location.search;
  if (path === '/' && api.sb && /access_token=|[?&]code=|token_hash=|error_code=/.test(link)) {
    const recovery = /[#&?]type=recovery(&|$)/.test(link), signup = /[#&?]type=signup(&|$)/.test(link);
    const err = (link.match(/error_description=([^&]*)/) || [])[1];
    let user = null;
    try { user = (await api.sb.auth.getSession()).data.session?.user || null; } catch (e) { /* the sign-in exchange failed; the teacher page will ask them to sign in again */ }
    // A confirmation opened on another device has no saved return path, but the account itself says it was made on /teacher.
    const teacherLink = recovery || (signup && user && user.user_metadata && user.user_metadata.teacher_signup) || (err && ret);
    const dest = ret && CLASS_ROUTE.test(ret) ? ret : teacherLink ? '/teacher' : null;
    try {
      if (ret) window.localStorage.removeItem(RETURN_KEY);
      if (recovery) window.sessionStorage.setItem('gias_pw_recovery', '1');
      if (err && dest) window.sessionStorage.setItem('gias_auth_err', decodeURIComponent(err.replace(/\+/g, ' ')));
    } catch (e) { /* storage blocked */ }
    if (dest) { window.history.replaceState(null, '', dest); path = dest.replace(/\/+$/, ''); }
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
