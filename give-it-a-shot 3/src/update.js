// Tells an installed copy of the app when a newer deploy exists, and lets the player reload into it.
const CURRENT = typeof __BUILD__ !== 'undefined' ? __BUILD__ : 'dev';

function showToast() {
  if (document.getElementById('upd-toast')) return;
  const t = document.createElement('div');
  t.id = 'upd-toast';
  t.setAttribute('role', 'status');
  t.innerHTML = '<span>A new version is ready.</span><button type="button">Update</button><button type="button" class="x" aria-label="Dismiss">Later</button>';
  const [go, later] = t.querySelectorAll('button');
  go.onclick = async () => {
    go.disabled = true; go.textContent = 'Updating…';
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) await reg.update();
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (e) { /* reload anyway */ }
    location.reload();
  };
  later.onclick = () => t.remove();
  document.body.appendChild(t);
}

async function check() {
  if (CURRENT === 'dev') return;
  try {
    const r = await fetch('/version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return;
    const j = await r.json();
    if (j && j.build && j.build !== CURRENT) showToast();
  } catch (e) { /* offline: try again later */ }
}

export function watchForUpdates() {
  check();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
  window.addEventListener('focus', check);
  setInterval(check, 10 * 60 * 1000);
}
