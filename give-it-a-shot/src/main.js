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
  const key = [g.phase, g.day, g.mi, g.inc.length, app.state.tab, app.state.story].join(':');
  if (key !== app._screenKey) { app._screenKey = key; requestAnimationFrame(() => { const m = document.querySelector('.main'); if (m) m.scrollTop = 0; }); }
  return app.getValues();
});
window.__app = app; // handy for debugging and tests
app.init();
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (app.state.authOpen) app.setState({ authOpen: false }); else if (app.state.story != null) app.setState({ story: null }); } });
