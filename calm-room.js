// Calm room (2026-11-05): secondary controls wait behind "More"; the room knows when it has its light.
(() => {
  const room = document.getElementById('room'), player = document.getElementById('player');
  if (!room || !player) return;
  if (room.querySelector('iframe.session-field')) room.classList.add('has-field');
  const row = player.querySelector('.player-controls'); if (!row) return;
  ['restart', 'share', 'fullscreen', 'motion'].forEach(id => { const b = document.getElementById(id); if (b) b.classList.add('extra'); });
  const more = document.createElement('button');
  more.type = 'button'; more.id = 'more'; more.textContent = 'More'; more.setAttribute('aria-expanded', 'false');
  more.addEventListener('click', () => {
    const open = player.classList.toggle('more-open');
    more.textContent = open ? 'Less' : 'More'; more.setAttribute('aria-expanded', String(open));
  });
  row.appendChild(more);
  // Pause motion also holds the light's slow breathing (it lives in a same-origin frame).
  const motion = document.getElementById('motion'), field = room.querySelector('iframe.session-field');
  if (motion && field) motion.addEventListener('click', () => queueMicrotask(() => {
    try { const c = field.contentDocument.querySelector('canvas'); if (c) c.style.animationPlayState = motion.getAttribute('aria-pressed') === 'true' ? 'paused' : 'running'; } catch (_) {}
  }));
})();
