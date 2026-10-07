import './classroom.css';

// Picks the student or teacher experience from the URL. Both render into #tapp.
export async function boot() {
  const root = document.getElementById('tapp');
  const path = window.location.pathname.replace(/\/+$/, '');
  if (/^\/classroom(\/|$)/.test(path)) (await import('./student.js')).mount(root);
  else (await import('./teacher.js')).mount(root);
}
