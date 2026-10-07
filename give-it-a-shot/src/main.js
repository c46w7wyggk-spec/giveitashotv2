import './style.css';
import template from './template.html?raw';
import { mount } from './runtime.js';
import { App } from './ui.js';

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
  document.getElementById('app').hidden = true; lroot.hidden = false;
  leader.setState({});
};
window.__leaderExit = () => { document.getElementById('lapp').hidden = true; document.getElementById('app').hidden = false; };
app.init();
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (app.state.authOpen) app.setState({ authOpen: false }); else if (app.state.pstory != null) app.setState({ pstory: null }); } });

// PWA: offline-capable shell (production only, so dev and tests are unaffected)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
