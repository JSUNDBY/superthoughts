/* Superthoughts: each session's own light (palette, motif and a genome seeded from its id).
   Shared by the library tiles, the session page and landing pages, so what you tap is what
   you arrive in. Classic script: exposes window.STLight. */
(() => {
'use strict';
// Each session gets its own vivid palette for its library tile.
const TILE_COLORS = {
  gratitude: ['#e07a2e', '#c94f3a', '#f0b441'], 'begin-day': ['#e0962a', '#b8502c', '#1f8f86'],
  reset: ['#1f9e74', '#0f6f7a', '#9cbf3a'], 'whole-body': ['#b83a6e', '#d9723a', '#e8b04a'],
  'after-conversation': ['#1f9c80', '#2a6fb0', '#d9a55a'], 'wind-down': ['#d07a2c', '#9e3350', '#3f8a6a'],
  'enter-your-work': ['#e08a2a', '#d4a52e', '#0f8f6f'], 'awake-again': ['#1d7a9c', '#2fae9e', '#d9a441'],
  'letting-go-into-sleep': ['#156a82', '#c9a86a', '#8f3f62'], 'frequency-of-abundance': ['#1fae74', '#e0a52e', '#d4593a'],
  warmth: ['#d9502f', '#e08a2a', '#a8305a'], 'open-space': ['#1f9eb0', '#6fa83a', '#2f5fb0'],
  drift: ['#2f55b8', '#1fa894', '#7a3fa8'], afterglow: ['#d95f45', '#e0a53a', '#7a3a9c'],
  'first-light': ['#e0943a', '#c94a6a', '#2fa8b0']
};

// Each session's tile has its own kind of light, not just its own colors.
const TILE_MOTIFS = {
  'first-light': 'bloom', 'begin-day': 'bloom', 'enter-your-work': 'bloom',
  gratitude: 'horizon', afterglow: 'horizon', 'wind-down': 'horizon',
  reset: 'breath', 'whole-body': 'curtain', 'frequency-of-abundance': 'curtain',
  'after-conversation': 'merge', 'awake-again': 'moon', 'letting-go-into-sleep': 'moon',
  warmth: 'ember', drift: 'tide', 'open-space': 'tide'
};

// One light per session, grown from its id: the library tile and the session page share it,
// so what you tap is what you arrive in.
function build(item, host, lazy = false) {
  const tint = TILE_COLORS[item.id] || TILE_COLORS[item.visual] || [item.accent || '#ffb870', '#ff7aa2', '#52d8e0'];
  tint.forEach((color, i) => host.style.setProperty(`--tile-${i + 1}`, color));
  // A genome seeded from the session id: every tile grows its own shapes and motion.
  let gene = [...item.id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) || 1;
  const next = () => (gene = (gene * 16807) % 2147483647) / 2147483647;
  const shape = () => [0, 0, 0, 0].map(() => `${Math.round(35 + next() * 30)}%`).join(' ');
  [['x1', 10, 60], ['y1', 5, 55], ['x2', 40, 90], ['y2', 40, 95], ['fan', 13, 19], ['tilt', -8, 8], ['sway', 7, 13], ['drift', 9, 16], ['delay', -40, 0]]
    .forEach(([k, lo, hi]) => host.style.setProperty(`--g-${k}`, (lo + next() * (hi - lo)).toFixed(1) + (k.startsWith('x') || k.startsWith('y') ? '%' : k === 'fan' || k === 'tilt' ? 'deg' : 's')));
  host.style.setProperty('--g-shape-a', shape()); host.style.setProperty('--g-shape-b', shape());
  const light = document.createElement('div'); light.className = 'tile-light'; light.setAttribute('aria-hidden', 'true');
  const motif = TILE_MOTIFS[item.id] || 'bloom'; host.dataset.motif = motif;
  light.innerHTML = `<img class="tl-still" src="images/art/${item.id}.jpg" alt="" ${lazy ? 'loading="lazy" ' : ''}decoding="async">` + '<div class="tl-live"><i class="tl-back"></i><i class="tl-a"></i><i class="tl-b"></i><i class="tl-c"></i><i class="tl-d"></i>' + (motif === 'bloom' ? '<span class="tl-petals">' + Array.from({length: 7}, (_, k) => `<i style="--k:${k - 3}"></i>`).join('') + '</span>' : '') + '</div>';
  return light;
}

window.STLight = { colors: TILE_COLORS, motifs: TILE_MOTIFS, build };
})();
