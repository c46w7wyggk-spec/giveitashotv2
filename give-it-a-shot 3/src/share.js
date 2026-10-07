// Draws a 1200x630 result card to a canvas and shares or downloads it.
export function drawCard({ title, score, cons, lib, role, needle, label, site }) {
  const W = 1200, H = 630;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#0f1b2d'; x.fillRect(0, 0, W, H);
  const grad = x.createLinearGradient(0, 0, W, 0); grad.addColorStop(0, '#b4531c'); grad.addColorStop(0.5, '#ece6d6'); grad.addColorStop(1, '#1f5a9e');
  x.fillStyle = grad; x.fillRect(0, 0, W, 14);
  x.textBaseline = 'alphabetic';
  x.fillStyle = '#eef1f6'; x.font = "46px 'Alfa Slab One', serif"; x.fillText('GIVE IT A SHOT', 60, 100);
  x.fillStyle = '#a9b9d0'; x.font = "24px 'Space Grotesk', sans-serif"; x.fillText(label, 60, 140);
  x.fillStyle = '#eef1f6'; x.font = "54px 'Alfa Slab One', serif";
  wrap(x, title, 60, 240, 760, 62);
  x.fillStyle = '#ffd166'; x.font = "150px 'Alfa Slab One', serif"; x.fillText(String(score), 60, 470);
  x.fillStyle = '#a9b9d0'; x.font = "22px 'Space Grotesk', sans-serif"; x.fillText('SCORE · ' + role.toUpperCase(), 66, 510);
  const box = (bx, by, head, letter, hc) => {
    x.fillStyle = '#162a45'; roundRect(x, bx, by, 300, 190, 18); x.fill();
    x.fillStyle = hc; x.font = "bold 18px 'Space Grotesk', sans-serif"; x.fillText(head, bx + 24, by + 40);
    x.fillStyle = '#eef1f6'; x.font = "110px 'Alfa Slab One', serif"; x.fillText(letter, bx + 24, by + 150);
  };
  box(840, 100, 'CONSERVATIVES GIVE', cons, '#8fc0f2');
  box(840, 310, 'LIBERALS GIVE', lib, '#f4a874');
  // needle
  const nx = 60, ny = 560, nw = 1080;
  x.fillStyle = grad; roundRect(x, nx, ny, nw, 14, 7); x.fill();
  x.fillStyle = '#fff'; x.fillRect(nx + (nw * needle) / 100 - 4, ny - 8, 8, 30);
  x.fillStyle = '#a9b9d0'; x.font = "16px 'Space Grotesk', sans-serif";
  x.fillText('PLANNED', nx, ny - 14); const t = 'FREE MARKET'; x.fillText(t, nx + nw - x.measureText(t).width, ny - 14);
  x.fillStyle = '#eef1f6'; x.font = "bold 20px 'Space Grotesk', sans-serif";
  const s = site; x.fillText(s, W - 60 - x.measureText(s).width, 612);
  return c;
}
function wrap(x, text, px, py, maxW, lh) {
  const words = text.split(' '); let line = '', y = py;
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (x.measureText(t).width > maxW && line) { x.fillText(line, px, y); line = w; y += lh; } else line = t;
  }
  x.fillText(line, px, y);
}
function roundRect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }

export async function shareCard(info, text) {
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch { /* fonts optional */ }
  const canvas = drawCard(info);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  const file = new File([blob], 'give-it-a-shot.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], text }); return 'shared'; } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'give-it-a-shot.png';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'downloaded';
}
