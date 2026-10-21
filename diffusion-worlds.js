/** Session worlds, v2 (2026-10-20). Each featured session gets its own light structure, rendered as an art-film frame:
 * multi-hue light fields, depth haze and bloom, subject off-center right, no outlines, no centered emblem, no floor pool.
 * Josh: "just cause the color is different doesnt make it different enough.. we have to do better visually".
 * Performance: each world is painted ONCE per size into a cached frame (heavy blur and bloom are one-time costs);
 * every animation frame only redraws that frame with a slow drift plus a handful of soft motes from a sprite,
 * so it holds frame rate on slow phones (rule: smooth on every device). */
const TAU = Math.PI * 2;
const rgba = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
const h2c = (h, l, sat) => { const a = sat * Math.min(l, 1 - l), f = n => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return '#' + [f(0), f(8), f(4)].map(v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join(''); };

function rand(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function glow(ctx, x, y, rx, ry, stops, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore();
}
const soft = (ctx, x, y, r, hex, a, ry = r, rot = 0) => glow(ctx, x, y, r, ry, [[0, rgba(hex, a)], [.45, rgba(hex, a * .45)], [1, rgba(hex, 0)]], rot);
function field(ctx, w, h, top, bottom) { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(1, bottom); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }

/* Each painter lays down light structure in several hues. The cache pass turns it into film light. */
const PAINT = {
  // Sunday dusk: a wide horizontal band of low sun on the horizon, a broken reflection column under it, cool sky above.
  week(ctx, w, h, c) {
    field(ctx, w, h, c.deep, c.night);
    soft(ctx, w * .66, h * .56, w * .75, c.warm, .55, h * .2); soft(ctx, w * .66, h * .56, w * .3, c.hot, .9, h * .05); soft(ctx, w * .5, h * .3, w * .6, c.cool, .35, h * .3);
    const r = rand(3);
    for (let i = 0; i < 60; i++) { const y = h * (.6 + .38 * Math.pow(r(), 1.3)), s = (y - h * .6) / (h * .4);
      soft(ctx, w * .66 + (r() - .5) * w * (.05 + .35 * s), y, w * (.03 + .07 * r()), r() < .5 ? c.hot : c.warm, .5 * (1 - s) + .1, h * .006); }
    soft(ctx, w * .2, h * .62, w * .5, c.night, .7, h * .05);
  },
  // First morning light: three broad diagonal beams from the upper right falling into a dim room, warm on cool.
  phone(ctx, w, h, c) {
    field(ctx, w, h, c.night, c.deep);
    soft(ctx, w * .2, h * .7, w * .6, c.cool, .3, h * .4);
    for (const [x, a, hue] of [[.62, .7, c.hot], [.76, .5, c.warm], [.9, .35, c.hot]])
      soft(ctx, w * x - w * .1, h * .5, w * .55, hue, a, w * .06, -1.05);
    soft(ctx, w * .62, h * .78, w * .3, c.warm, .45, h * .12);
  },
  // Before you say yes: two massive dark slabs with lit edges; colored light and haze spill through the gap.
  yesmouth(ctx, w, h, c) {
    field(ctx, w, h, c.deep, c.night);
    soft(ctx, w * .66, h * .5, w * .55, c.warm, .55, h * .8);
    soft(ctx, w * .66, h * .5, w * .08, c.hot, .95, h * .7);
    soft(ctx, w * .74, h * .35, w * .3, c.cool, .35, h * .5);
    ctx.fillStyle = c.night; ctx.beginPath(); ctx.moveTo(-w * .1, -h * .1); ctx.lineTo(w * .63, -h * .1); ctx.lineTo(w * .615, h * 1.1); ctx.lineTo(-w * .1, h * 1.1); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w * .695, -h * .1); ctx.lineTo(w * 1.1, -h * .1); ctx.lineTo(w * 1.1, h * 1.1); ctx.lineTo(w * .71, h * 1.1); ctx.fill();
    soft(ctx, w * .62, h * .5, w * .012, c.hot, .9, h * .55); soft(ctx, w * .7, h * .5, w * .012, c.warm, .8, h * .55);
    soft(ctx, w * .55, h * .55, w * .12, c.warm, .25, h * .6); soft(ctx, w * .78, h * .5, w * .12, c.cool, .22, h * .6);
    soft(ctx, w * .66, h * .98, w * .4, c.warm, .45, h * .08);
  },
  // The pause before asking: aurora curtains folding across the upper sky in green, rose and gold.
  asking(ctx, w, h, c) {
    field(ctx, w, h, c.night, c.deep);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [y0, hue, k, ph] of [[.30, c.cool, 1, 0], [.24, c.warm, .8, 1.7], [.36, c.hot, .5, 3.1]]) {
      for (let i = 0; i <= 300; i++) {
        const u = i / 300, x = w * (.05 + 1 * u), y = h * (y0 + .08 * Math.sin(u * 5.2 + ph) + .03 * Math.sin(u * 13 + ph * 2));
        const tall = h * (.2 + .14 * (.5 + .5 * Math.sin(u * 7 + ph))), a = .24 * k * Math.min(1, u * 3) * (.6 + .4 * Math.sin(u * 23 + ph));
        const g = ctx.createLinearGradient(0, y - tall, 0, y); g.addColorStop(0, rgba(hue, 0)); g.addColorStop(.85, rgba(hue, a)); g.addColorStop(1, rgba(hue, a * 2));
        ctx.fillStyle = g; ctx.fillRect(x, y - tall, w / 300 + 1, tall + h * .01);
      }
    }
    ctx.restore();
    soft(ctx, w * .65, h * .22, w * .5, c.cool, .2, h * .2);
    const r = rand(19); for (let i = 0; i < 90; i++) soft(ctx, w * r(), h * .7 * r(), w * .0025, c.light, .4 + .5 * r());
    const g = ctx.createLinearGradient(0, h * .5, 0, h); g.addColorStop(0, rgba(c.night, 0)); g.addColorStop(.45, rgba(c.night, .85)); g.addColorStop(1, rgba(c.night, 1));
    ctx.fillStyle = g; ctx.fillRect(0, h * .5, w, h * .5);
    soft(ctx, w * .6, h * .74, w * .7, c.cool, .22, h * .03);
  },

  // The urge: a dark wave rising from the right, backlit, light coming through its lifting lip, spray dissolving.
  urge(ctx, w, h, c) {
    field(ctx, w, h, c.deep, c.night);
    soft(ctx, w * .72, h * .3, w * .5, c.warm, .6, h * .35);
    soft(ctx, w * .78, h * .26, w * .16, c.hot, .9, h * .12);
    ctx.fillStyle = c.night; ctx.beginPath(); ctx.moveTo(-w * .1, h * .78);
    ctx.bezierCurveTo(w * .35, h * .74, w * .55, h * .66, w * .7, h * .42); ctx.bezierCurveTo(w * .78, h * .3, w * .9, h * .34, w * 1.1, h * .5);
    ctx.lineTo(w * 1.1, h * 1.1); ctx.lineTo(-w * .1, h * 1.1); ctx.fill();
    const bz = (p0, p1, p2, p3, u) => (1 - u) ** 3 * p0 + 3 * (1 - u) ** 2 * u * p1 + 3 * (1 - u) * u * u * p2 + u ** 3 * p3;
    for (let k = 0; k < 2; k++) for (let i = 0; i <= 40; i++) { const u = i / 40, x = k ? bz(.7, .78, .9, 1.05, u) : bz(.3, .5, .6, .7, u), y = k ? bz(.42, .3, .34, .48, u) : bz(.745, .7, .62, .42, u);
      const lift = k ? 1 : u; soft(ctx, w * x, h * y + h * .01, w * (.03 + .03 * lift), i % 3 ? c.cool : c.warm, .35 * lift, h * .02); }
    const r = rand(13); for (let i = 0; i < 90; i++) { const u = r(); soft(ctx, w * (.62 + .4 * u), h * (.42 - .22 * Math.sin(u * 3)) - h * .12 * r(), w * (.01 + .03 * r()), r() < .5 ? c.hot : c.cool, .35 * r()); }
  },
  // Stress without the cigarette: thick smoke volumes curling up from lower right, thinning into clean air.
  stress(ctx, w, h, c) {
    field(ctx, w, h, c.deep, c.night);
    soft(ctx, w * .66, h * .92, w * .35, c.warm, .6, h * .2);
    for (let k = 0; k < 5; k++) for (let s = 0; s < 40; s++) {
      const v = s / 40, x = w * (.66 + .06 * (k - 2) * v) + Math.sin(v * 7 + k * 1.9) * w * .07 * v, y = h * (.95 - .85 * v);
      soft(ctx, x, y, w * (.03 + .08 * v), k % 2 ? c.cool : c.hot, .16 * (1 - v * .9), w * (.03 + .08 * v));
    }
  },
  // After a tense conversation: night water, a low moon's broken reflection column, everything stilling.
  tense(ctx, w, h, c) {
    field(ctx, w, h, c.deep, c.night);
    soft(ctx, w * 1.02, h * .45, w * .55, c.warm, .55, h * .5); soft(ctx, w * .98, h * .42, w * .2, c.hot, .6, h * .2);
    for (const [y, a, hue] of [[.3, .22, c.cool], [.48, .3, c.warm], [.62, .26, c.cool], [.78, .2, c.warm], [.9, .25, c.cool]])
      soft(ctx, w * .62, h * y, w * .75, hue, a, h * .035);
  },


  // Abundance: a warm multi-hue light opening in a nebula of gold and rose dust, off to the right.
  abundance(ctx, w, h, c) {
    field(ctx, w, h, c.night, c.deep);
    soft(ctx, w * .7, h * .45, w * .55, c.warm, .55, h * .45); soft(ctx, w * .82, h * .3, w * .3, c.cool, .4, h * .3);
    soft(ctx, w * .58, h * .62, w * .28, c.hot, .35, h * .22); soft(ctx, w * .7, h * .45, w * .09, c.hot, .95);
    const r = rand(5); for (let i = 0; i < 120; i++) { const a = r() * TAU, d = Math.pow(r(), .6) * w * .45;
      soft(ctx, w * .7 + Math.cos(a) * d, h * .45 + Math.sin(a) * d * .8, w * .01, r() < .5 ? c.hot : c.warm, .4 * r()); }
  },
  // Empowerment: a column of heat and embers rising from below right, red into gold, with heat shimmer.
  empower(ctx, w, h, c) {
    field(ctx, w, h, c.night, c.deep);
    soft(ctx, w * .68, h * 1.02, w * .5, c.warm, .85, h * .35); soft(ctx, w * .68, h * .6, w * .16, c.hot, .35, h * .55);
    soft(ctx, w * .7, h * .25, w * .3, c.cool, .25, h * .25);
    const r = rand(23); for (let i = 0; i < 90; i++) { const v = Math.pow(r(), .7);
      soft(ctx, w * (.68 + (r() - .5) * .3 * (1 - v * .4)), h * (1 - v * .9), w * .012 * (1 - v * .6), v < .3 ? c.hot : c.warm, .7 * (1 - v)); }
  },
  // A new small ritual: low dawn mist across a field, one small jade-gold light just above the ground, a tiny rising thread.
  ritual(ctx, w, h, c) {
    field(ctx, w, h, c.deep, c.night);
    soft(ctx, w * .5, h * .7, w * .9, c.cool, .35, h * .1); soft(ctx, w * .6, h * .4, w * .6, c.warm, .2, h * .35);
    soft(ctx, w * .67, h * .7, w * .12, c.warm, .7, h * .07); soft(ctx, w * .67, h * .69, w * .03, c.hot, 1);
    for (let s = 0; s < 30; s++) { const v = s / 30; soft(ctx, w * .67 + Math.sin(v * 5) * w * .015, h * (.69 - .4 * v), w * .012, c.hot, .4 * (1 - v)); }
  },
  // Remembering your reason: a deep star field in warm and rose dust, one star blooming hot. No lines.
  reason(ctx, w, h, c) {
    field(ctx, w, h, c.night, c.deep);
    soft(ctx, w * .7, h * .42, w * .6, c.warm, .3, h * .3, -.4); soft(ctx, w * .55, h * .6, w * .5, c.cool, .25, h * .25, -.4);
    const r = rand(41); for (let i = 0; i < 260; i++) { const x = w * r(), y = h * r(), s = r();
      soft(ctx, x, y, w * (.002 + .006 * s * s), s > .8 ? c.hot : c.light, .5 + .5 * s); }
    soft(ctx, w * .72, h * .38, w * .14, c.hot, .85); soft(ctx, w * .72, h * .38, w * .03, c.light, 1);
  },
};

/* Palettes: one hue world per session, chosen so neighbours differ in hue, not only lightness. */
const P = (deep, night, cool, warm, hot, light = '#fff6e6') => ({deep, night, cool, warm, hot, light});
const c = (h, l, s) => h2c(h, l, s);
export const WORLD_COLORS = {
  week: P(c(205, .14, .5), c(215, .05, .5), c(195, .5, .55), c(28, .6, .9), c(40, .8, 1)),        // teal dusk, amber sun
  phone: P(c(30, .1, .4), c(25, .04, .4), c(205, .45, .35), c(36, .6, .95), c(48, .82, 1)),       // dim room, honey beams
  yesmouth: P(c(345, .12, .45), c(345, .04, .4), c(300, .5, .5), c(12, .6, .9), c(28, .82, 1)),   // wine dark, coral to peach
  asking: P(c(185, .12, .5), c(200, .04, .5), c(150, .55, .9), c(320, .6, .8), c(48, .7, .95)),    // aurora green, rose, gold
  urge: P(c(215, .16, .5), c(220, .05, .5), c(190, .7, .7), c(24, .6, .95), c(40, .82, 1)),        // storm blue, amber backlight
  stress: P(c(200, .1, .25), c(210, .04, .3), c(190, .7, .35), c(18, .55, .9), c(30, .8, .7)),     // slate, ember smoke to clean air
  tense: P(c(186, .12, .45), c(200, .04, .45), c(176, .45, .5), c(34, .6, .7), c(44, .88, .85)),     // still teal air, lamp-warm settling motes
  abundance: P(c(25, .12, .5), c(15, .04, .45), c(330, .62, .7), c(40, .6, .95), c(50, .82, 1)),   // umber, gold, rose dust
  empower: P(c(5, .12, .55), c(355, .04, .5), c(30, .55, .8), c(14, .55, 1), c(42, .75, 1)),       // ember red to gold
  ritual: P(c(160, .12, .5), c(170, .04, .5), c(150, .55, .45), c(75, .55, .8), c(60, .82, .95)),  // jade mist, lime-gold seed
  reason: P(c(250, .1, .45), c(255, .03, .45), c(330, .5, .6), c(35, .6, .85), c(45, .85, 1)),     // ink, rose and amber dust
};

/* Build a film frame once per world and size: sharp light structure, then three bloom scales and fine grain. */
const cache = new Map();
let sprite = null;
function frame(key, w, h) {
  const id = key + w + 'x' + h; if (cache.has(id)) return cache.get(id);
  const W = w * 1.12 | 0, H = h * 1.12 | 0, base = document.createElement('canvas'); base.width = W; base.height = H;
  const b = base.getContext('2d'); PAINT[key](b, W, H, WORLD_COLORS[key]);
  const out = document.createElement('canvas'); out.width = W; out.height = H; const o = out.getContext('2d');
  o.filter = `blur(${Math.max(1, W * .006)}px)`; o.drawImage(base, 0, 0);
  o.globalCompositeOperation = 'screen';
  for (const [r, a] of [[.03, .55], [.09, .4], [.2, .3]]) { o.globalAlpha = a; o.filter = `blur(${W * r}px)`; o.drawImage(base, 0, 0); }
  o.globalCompositeOperation = 'source-over'; o.globalAlpha = 1; o.filter = 'none';
  const v = o.createRadialGradient(W * .6, H * .5, Math.min(W, H) * .3, W * .6, H * .5, Math.max(W, H) * .78);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)'); o.fillStyle = v; o.fillRect(0, 0, W, H);
  const img = o.getImageData(0, 0, W, H), d = img.data, r = rand(97);
  for (let i = 0; i < d.length; i += 4) { const n = (r() - .5) * 10; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  o.putImageData(img, 0, 0);
  if (cache.size > 24) cache.clear(); cache.set(id, out); return out;
}
function getSprite() {
  if (sprite) return sprite; sprite = document.createElement('canvas'); sprite.width = sprite.height = 32;
  const s = sprite.getContext('2d'), g = s.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,248,230,.9)'); g.addColorStop(.4, 'rgba(255,240,210,.35)'); g.addColorStop(1, 'rgba(255,240,210,0)');
  s.fillStyle = g; s.fillRect(0, 0, 32, 32); return sprite;
}
const MOTES = {tense: [.65, .5, 1], phone: [.45, 1, -1], abundance: [.5, .8, -1], empower: [.55, 1.2, -1], ritual: [.6, .6, -1], urge: [.65, .7, -1], stress: [.6, .5, -1]};

/* Per frame: the cached frame drifts slowly (a few percent) plus a few motes for worlds that have them. */
function animate(key) {
  return (ctx, w, h, t) => {
    const f = frame(key, w, h), dx = (f.width - w) * (.5 + .45 * Math.sin(t * .021)), dy = (f.height - h) * (.5 + .45 * Math.cos(t * .017));
    ctx.drawImage(f, -dx, -dy);
    const m = MOTES[key]; if (!m) return;
    const r = rand(61), sp = getSprite(); ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 26; i++) {
      const x = w * (m[0] + (r() - .5) * .5) + Math.sin(t * .2 + i) * w * .01, speed = .3 + r() * m[1];
      const y = ((h * r() + m[2] * t * h * .006 * speed) % h + h) % h, s = w * (.006 + .01 * r());
      ctx.globalAlpha = .25 + .45 * r(); ctx.drawImage(sp, x - s, y - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };
}

export const WORLDS = Object.fromEntries(Object.keys(PAINT).map(k => [k, animate(k)]));
export const WORLD_PALETTES = {};
