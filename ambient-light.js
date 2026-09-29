/* Superthoughts ambient light. A soft, always-moving wash of dawn color behind the whole
   page: wide glows that wander and breathe, and slow ribbons of light that undulate.
   It opens from the bottom of the screen on load, the way first light comes up.
   Drawn small and scaled up by the browser, so it stays soft and cheap on phones. */
(() => {
  'use strict';
  const canvas = document.createElement('canvas');
  canvas.className = 'ambient-light';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const FRAME_MS = 1000 / 20, TAU = Math.PI * 2;
  // Grounded dawn palette: ochre, terracotta, deep teal, emerald, garnet.
  const GLOWS = [
    { c: [225, 140, 45], x: .22, y: .78, r: .62, sx: .07, sy: .05, p: 0 },
    { c: [195, 70, 60], x: .78, y: .66, r: .55, sx: .06, sy: .07, p: 1.7 },
    { c: [20, 140, 140], x: .16, y: .28, r: .58, sx: .08, sy: .06, p: 3.1 },
    { c: [30, 150, 95], x: .84, y: .2, r: .5, sx: .05, sy: .08, p: 4.4 },
    { c: [140, 45, 95], x: .5, y: .42, r: .46, sx: .09, sy: .05, p: 5.6 }
  ];
  const RIBBONS = [
    { c: [230, 165, 70], y: .72, a: .06, f: 1.3, s: .11, p: 0 },
    { c: [200, 80, 90], y: .55, a: .08, f: 1.7, s: -.08, p: 2 },
    { c: [30, 160, 150], y: .36, a: .07, f: 1.1, s: .07, p: 4 }
  ];
  let w = 0, h = 0, t = 0, last = 0, frame = 0;
  const sm = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;

  function size() {
    // About 1/6 of the screen, capped: the upscale does the blurring for free.
    const vw = innerWidth, vh = innerHeight, k = Math.min(1 / 6, 260 / vw);
    const nw = Math.max(40, Math.round(vw * k)), nh = Math.max(40, Math.round(vh * k));
    if (nw !== w || nh !== h) { w = canvas.width = nw; h = canvas.height = nh; }
  }

  function render() {
    const open = still.matches ? 1 : sm(t / 5.5), unit = Math.max(w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#11131a'; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    GLOWS.forEach((g, i) => {
      // Each glow rises from below as the light opens, then wanders.
      const x = (g.x + g.sx * Math.sin(t * .05 + g.p) + .03 * Math.sin(t * .13 + i)) * w;
      const y = (1.15 - (1.15 - g.y) * open + g.sy * Math.sin(t * .04 + g.p * 1.3)) * h;
      const r = unit * g.r * (.35 + .65 * open) * (.9 + .1 * Math.sin(t * .09 + g.p));
      const a = .38 * open * (.75 + .25 * Math.sin(t * .07 + g.p * 2));
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, rgba(g.c, a)); grad.addColorStop(.45, rgba(g.c, a * .4)); grad.addColorStop(1, rgba(g.c, 0));
      ctx.fillStyle = grad; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    });
    RIBBONS.forEach(rb => {
      const band = h * (.1 + .04 * Math.sin(t * .06 + rb.p)), y0 = (1.1 - (1.1 - rb.y) * open) * h;
      ctx.beginPath();
      for (let j = 0; j <= 24; j++) {
        const u = j / 24, y = y0 + h * rb.a * Math.sin(u * TAU * rb.f + t * rb.s * 3 + rb.p) + h * .02 * Math.sin(u * 9 + t * .2);
        j ? ctx.lineTo(u * w, y) : ctx.moveTo(0, y);
      }
      for (let j = 24; j >= 0; j--) {
        const u = j / 24, y = y0 + band + h * rb.a * Math.sin(u * TAU * rb.f + t * rb.s * 3 + rb.p + .7);
        ctx.lineTo(u * w, y);
      }
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      const a = .16 * open;
      grad.addColorStop(0, rgba(rb.c, 0)); grad.addColorStop(.35, rgba(rb.c, a)); grad.addColorStop(.7, rgba(rb.c, a * .8)); grad.addColorStop(1, rgba(rb.c, 0));
      ctx.fillStyle = grad; ctx.fill();
    });
  }

  function tick(now) {
    frame = 0;
    if (document.hidden || still.matches) return;
    if (!last || now - last >= FRAME_MS) { if (last) t += Math.min(now - last, 100) / 1000; last = now; render(); }
    frame = requestAnimationFrame(tick);
  }
  function run() {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    if (document.hidden || still.matches) render(); else frame = requestAnimationFrame(tick);
  }
  size(); render();
  addEventListener('resize', () => { size(); render(); });
  document.addEventListener('visibilitychange', run);
  still.addEventListener('change', run);
  run();
})();
