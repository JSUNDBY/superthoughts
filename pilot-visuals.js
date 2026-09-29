/* Eight quiet, playback-led fields for the pilot experiences. No external assets. */
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const FRAME_MS = 1000 / 24;
  const SCENES = new Set([
    'gratitude', 'whole-body', 'wind-down', 'reset',
    'begin-day', 'warmth', 'open-space', 'drift', 'afterglow', 'first-light', 'after-conversation'
  ]);

  class SuperthoughtsField {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas && canvas.getContext && canvas.getContext('2d', { alpha: false });
      this.scene = 'gratitude';
      this.playing = false;
      this.motion = true;
      this.dim = false;
      this.inView = true;
      this.elapsed = 0;
      this.lastTick = 0;
      this.frame = 0;
      this.destroyed = false;
      this.preference = typeof matchMedia === 'function'
        ? matchMedia('(prefers-reduced-motion: reduce)') : null;
      this.onVisibility = () => this.sync();
      this.onPreference = () => this.sync();
      this.onResize = () => this.render();

      // A canvas without a 2D context leaves the stage's CSS background visible.
      if (!this.ctx) {
        if (canvas) canvas.style.opacity = '0';
        return;
      }
      canvas.style.opacity = '0';
      document.addEventListener('visibilitychange', this.onVisibility);
      if (this.preference) {
        if (this.preference.addEventListener) this.preference.addEventListener('change', this.onPreference);
        else if (this.preference.addListener) this.preference.addListener(this.onPreference);
      }
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(this.onResize);
        this.resizeObserver.observe(canvas);
      } else {
        window.addEventListener('resize', this.onResize);
      }
      if (typeof IntersectionObserver !== 'undefined') {
        this.intersectionObserver = new IntersectionObserver(entries => {
          this.inView = entries[0].isIntersecting;
          this.sync();
        });
        this.intersectionObserver.observe(canvas);
      }
      this.render();
    }

    setScene(name) {
      if (!SCENES.has(name) || this.scene === name || this.destroyed) return;
      this.scene = name;
      this.render();
    }

    setPlaying(value) { this.playing = !!value; this.sync(); }
    setMotion(value) { this.motion = !!value; this.sync(); }
    setDim(value) { this.dim = !!value; this.sync(); }

    shouldRun() {
      return !!this.ctx && !this.destroyed && this.playing && this.motion && !this.dim &&
        !document.hidden && this.inView && !(this.preference && this.preference.matches);
    }

    sync() {
      if (this.frame) cancelAnimationFrame(this.frame);
      this.frame = 0;
      this.lastTick = 0;
      if (this.shouldRun()) this.frame = requestAnimationFrame(now => this.tick(now));
      else this.render();
    }

    tick(now) {
      this.frame = 0;
      if (!this.shouldRun()) { this.lastTick = 0; return; }
      if (this.lastTick) {
        const delta = now - this.lastTick;
        if (delta >= FRAME_MS) {
          // Clamp return from a suspended tab so a scene never visibly jumps.
          this.elapsed += Math.min(delta, 100) / 1000;
          this.render();
          this.lastTick = now;
        }
      } else {
        this.lastTick = now;
      }
      this.frame = requestAnimationFrame(time => this.tick(time));
    }

    size() {
      const rect = this.canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5, 1400 / rect.width, 1000 / rect.height);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
      }
      return true;
    }

    render() {
      if (!this.ctx || this.destroyed || !this.size()) return;
      const c = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;
      c.setTransform(w, 0, 0, h, 0, 0);
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
      const t = this.elapsed;
      switch (this.scene) {
        case 'gratitude': this.gratitude(t); break;
        case 'whole-body': this.wholeBody(t); break;
        case 'wind-down': this.windDown(t); break;
        case 'reset': this.reset(t); break;
        case 'begin-day': this.beginDay(t); break;
        case 'warmth': this.warmth(t); break;
        case 'open-space': this.openSpace(t); break;
        case 'drift': this.drift(t); break;
        case 'afterglow': this.afterglow(t); break;
        case 'first-light': this.firstLight(t); break;
        case 'after-conversation': this.afterConversation(t); break;
      }
      // Dimming is a CSS veil, so it fades even while rendering is paused.
      this.vignette();
      this.canvas.style.opacity = '1';
    }

    background(stops, x0 = 0, y0 = 0, x1 = 1, y1 = 1) {
      const c = this.ctx;
      const g = c.createLinearGradient(x0, y0, x1, y1);
      stops.forEach(([at, color]) => g.addColorStop(at, color));
      c.fillStyle = g;
      c.fillRect(0, 0, 1, 1);
    }

    glow(x, y, r, rgb, alpha = 1) {
      const c = this.ctx;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${rgb},${alpha})`);
      g.addColorStop(.36, `rgba(${rgb},${alpha * .38})`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      c.fillStyle = g;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }

    ellipse(x, y, rx, ry, rotation, fill, stroke, width = .001) {
      const c = this.ctx;
      c.beginPath();
      c.ellipse(x, y, rx, ry, rotation, 0, TAU);
      if (fill) { c.fillStyle = fill; c.fill(); }
      if (stroke) { c.lineWidth = width; c.strokeStyle = stroke; c.stroke(); }
    }

    vignette() {
      const c = this.ctx;
      const g = c.createRadialGradient(.5, .45, .16, .5, .48, .9);
      g.addColorStop(0, 'rgba(6,7,19,0)');
      g.addColorStop(1, 'rgba(6,7,19,.49)');
      c.fillStyle = g;
      c.fillRect(0, 0, 1, 1);
    }

    gratitude(t) {
      const c = this.ctx;
      const breathe = Math.sin(t * .105);
      this.background([[0, '#17182d'], [.48, '#40304e'], [1, '#693c52']]);
      c.globalCompositeOperation = 'screen';
      this.glow(.73, .55, .65, '223,111,116', .57);
      this.glow(.79 + breathe * .012, .48, .34, '255,195,139', .69);
      this.glow(.88, .22, .35, '161,124,190', .22);
      this.glow(.76, .49, .14, '255,220,176', .34);
      c.globalCompositeOperation = 'source-over';
      // A broad orbital sunrise, with generous negative space for copy.
      for (let i = 0; i < 7; i++) {
        const spread = i / 6;
        c.beginPath();
        c.ellipse(.78 + breathe * .009, .49, .16 + spread * .38,
          .21 + spread * .38, -.38 + Math.sin(t * .018 + i) * .012,
          Math.PI * (.2 + spread * .08), Math.PI * (1.33 + spread * .08));
        c.strokeStyle = `rgba(255,${Math.round(180 + spread * 35)},${Math.round(151 + spread * 42)},${.18 - spread * .105})`;
        c.lineWidth = .0023 - spread * .0013;
        c.stroke();
      }
      this.ellipse(.79, .48, .12, .16, -.3, 'rgba(255,203,159,.035)');
    }

    wholeBody(t) {
      const c = this.ctx;
      this.background([[0, '#15182c'], [.5, '#31294d'], [1, '#29243e']]);
      this.glow(.66, .48, .57, '116,110,189', .30);
      this.glow(.76, .56, .37, '195,150,204', .20);
      const x = .69 + Math.sin(t * .042) * .008;
      const y = .46 + Math.cos(t * .035) * .007;
      // Nested translucent bodies invite attention inward; the center stays dark.
      for (let i = 8; i >= 0; i--) {
        const p = i / 8;
        const pulse = Math.sin(t * .075 - i * .32) * .005;
        const r = .095 + p * .48 + pulse;
        this.ellipse(x, y, r, r * .91, -.18,
          `rgba(${Math.round(116 + p * 72)},${Math.round(105 + p * 48)},${Math.round(172 + p * 38)},${.022 + (1 - p) * .015})`,
          `rgba(205,179,231,${.13 - p * .07})`, .0012);
      }
      c.globalCompositeOperation = 'screen';
      this.glow(x, y, .16, '174,145,217', .15);
      c.globalCompositeOperation = 'source-over';
    }

    windDown(t) {
      const c = this.ctx;
      this.background([[0, '#101d27'], [.54, '#25253b'], [1, '#35243a']]);
      this.glow(.63, .52, .49, '40,130,111', .34);
      this.glow(.84, .69, .37, '164,84,118', .32);
      this.glow(.73, .37, .23, '238,155,88', .29);
      for (let i = 0; i < 6; i++) {
        const q = i / 5;
        const shift = Math.sin(t * (.035 + q * .01) + i * 1.2) * .024;
        c.beginPath();
        c.moveTo(.22 + q * .11, -.15);
        c.bezierCurveTo(.1 + q * .1 + shift, .25, .98 - q * .04, .21,
          .76 + shift, .61);
        c.bezierCurveTo(.59 + shift, .92, .85, 1.1, 1.12, 1.17);
        c.lineTo(1.12, -.15);
        c.closePath();
        const g = c.createLinearGradient(.32, .1, .92, .9);
        g.addColorStop(0, `rgba(23,101,92,${.015 + q * .008})`);
        g.addColorStop(.48, `rgba(232,149,92,${.025 + q * .011})`);
        g.addColorStop(1, `rgba(108,54,105,${.036 + q * .013})`);
        c.fillStyle = g;
        c.fill();
        c.lineWidth = .0011;
        c.strokeStyle = `rgba(241,177,125,${.05 - q * .005})`;
        c.stroke();
      }
    }

    reset(t) {
      const c = this.ctx;
      this.background([[0, '#112830'], [.5, '#1b4147'], [1, '#394655']]);
      this.glow(.72, .64, .48, '91,173,165', .23);
      this.glow(.9, .43, .36, '234,150,142', .24);
      for (let i = 0; i < 8; i++) {
        const q = i / 7;
        const base = .23 + q * .105;
        const phase = t * .045 + i * .48;
        c.beginPath();
        c.moveTo(-.1, base + Math.sin(phase) * .013);
        c.bezierCurveTo(.15, base - .09 + Math.sin(phase + 1) * .025,
          .32, base + .10 + Math.sin(phase + 2) * .023,
          .55, base + Math.sin(phase + 3) * .019);
        c.bezierCurveTo(.78, base - .10 + Math.sin(phase + 4) * .024,
          .95, base + .06 + Math.sin(phase + 5) * .025,
          1.1, base - .025);
        c.lineTo(1.1, 1.1);
        c.lineTo(-.1, 1.1);
        c.closePath();
        c.fillStyle = i % 3 === 0 ? `rgba(244,169,151,${.025 + q * .012})` :
          `rgba(80,174,173,${.027 + q * .013})`;
        c.fill();
        c.strokeStyle = i % 3 === 0 ? 'rgba(255,193,164,.075)' : 'rgba(144,215,205,.07)';
        c.lineWidth = .0013;
        c.stroke();
      }
    }

    beginDay(t) {
      const c = this.ctx;
      this.background([[0, '#2d2236'], [.52, '#6a3c51'], [1, '#513447']]);
      this.glow(.73, .64, .51, '245,155,100', .39);
      this.glow(.75, .84, .37, '255,208,123', .34);
      for (let i = 0; i < 7; i++) {
        const q = i / 6;
        const sway = Math.sin(t * .043 + i * .76) * .027;
        const x = .34 + q * .105;
        c.beginPath();
        c.moveTo(x - .15, 1.12);
        c.bezierCurveTo(x + sway - .22, .72, x + sway + .13, .5, x - .035, -.12);
        c.bezierCurveTo(x + .08, .35, x + .25 + sway, .63, x + .065, 1.12);
        c.closePath();
        const g = c.createLinearGradient(x - .12, 1, x + .1, .1);
        g.addColorStop(0, 'rgba(247,126,93,.015)');
        g.addColorStop(.52, `rgba(255,190,119,${.056 + q * .025})`);
        g.addColorStop(1, 'rgba(255,212,156,.014)');
        c.fillStyle = g;
        c.fill();
        c.strokeStyle = `rgba(255,215,165,${.06 + q * .01})`;
        c.lineWidth = .001;
        c.stroke();
      }
    }

    warmth(t) {
      const c = this.ctx;
      const driftX = Math.sin(t * .055) * .045;
      const driftY = Math.sin(t * .043) * .035;
      this.background([[0, '#271d31'], [.48, '#503043'], [1, '#603c47']]);
      this.glow(.71 + driftX, .49 + driftY, .6, '190,91,85', .33);
      this.glow(.79 - driftX, .65 - driftY, .39, '239,156,123', .26);
      // Broad, overlapping orbits remain slow but visibly unfold during listening.
      for (let i = 0; i < 8; i++) {
        const a = i * 1.75;
        const x = .69 + Math.sin(a) * (.11 + i * .008)
          + Math.sin(t * .075 + i * .65) * .055;
        const y = .52 + Math.cos(a) * (.1 + i * .012)
          + Math.sin(t * .061 + i * .8) * .04;
        const breath = Math.sin(t * .065 + i * .6);
        const rx = (.15 + (i % 3) * .043) * (1 + breath * .10);
        const ry = (.25 + (i % 2) * .06) * (1 - breath * .07);
        const rotation = -.55 + i * .32 + Math.sin(t * .052 + i * .7) * .24;
        this.ellipse(x, y, rx, ry, rotation,
          i % 2 ? 'rgba(242,151,132,.045)' : 'rgba(191,89,111,.055)',
          `rgba(255,202,166,${.105 - i * .005})`, .0014);
      }
      c.globalCompositeOperation = 'screen';
      this.glow(.71 + driftX, .51 - driftY, .21 + Math.sin(t * .065) * .018,
        '255,192,150', .16);
      c.globalCompositeOperation = 'source-over';
    }

    openSpace(t) {
      const c = this.ctx;
      this.background([[0, '#17243a'], [.54, '#31405e'], [1, '#373857']]);
      this.glow(.7, .38, .58, '100,158,203', .24);
      this.glow(.83, .72, .42, '176,148,210', .18);
      for (let i = 0; i < 6; i++) {
        const q = i / 5;
        const x = .76 + Math.sin(t * .022 + i) * .012;
        const y = .54 + Math.cos(t * .019 + i) * .009;
        c.beginPath();
        c.ellipse(x, y, .22 + q * .47, .085 + q * .22,
          -.38 + Math.sin(t * .014 + i * .3) * .009,
          Math.PI * (.1 + q * .06), Math.PI * (1.47 + q * .08));
        c.strokeStyle = `rgba(${Math.round(143 + q * 51)},${Math.round(186 - q * 11)},229,${.15 - q * .09})`;
        c.lineWidth = .0017 - q * .0007;
        c.stroke();
      }
      this.ellipse(.77, .36, .065, .023, -.4, 'rgba(182,205,237,.09)', 'rgba(212,221,249,.10)');
    }

    drift(t) {
      const c = this.ctx;
      this.background([[0, '#111428'], [.48, '#28243f'], [1, '#1d263a']]);
      this.glow(.72, .61, .48, '103,85,162', .20);
      this.glow(.89, .36, .32, '73,145,158', .16);
      for (let i = 0; i < 8; i++) {
        const q = i / 7;
        const x = .31 + q * .105;
        const sway = Math.sin(t * .025 + i * .65) * .021;
        c.beginPath();
        c.moveTo(x - .21, - .13);
        c.bezierCurveTo(x + .13 + sway, .22, x - .1 + sway, .62, x + .06, 1.13);
        c.bezierCurveTo(x + .24, .68, x + .04 + sway, .28, x + .14, -.13);
        c.closePath();
        const g = c.createLinearGradient(x - .14, 0, x + .18, 1);
        g.addColorStop(0, 'rgba(88,83,160,.008)');
        g.addColorStop(.46, i % 2 ? 'rgba(108,158,173,.048)' : 'rgba(164,115,190,.05)');
        g.addColorStop(1, 'rgba(81,75,145,.009)');
        c.fillStyle = g;
        c.fill();
        c.strokeStyle = i % 2 ? 'rgba(137,191,193,.045)' : 'rgba(198,148,215,.055)';
        c.lineWidth = .001;
        c.stroke();
      }
    }

    afterglow(t) {
      const c = this.ctx;
      this.background([[0, '#140e2e'], [.5, '#48233e'], [1, '#191d3e']]);
      this.glow(.28 + Math.sin(t*.025)*.12, .6, .65, '231,94,115', .38);
      this.glow(.77, .35 + Math.cos(t*.021)*.08, .5, '108,92,224', .38);
      for(let i=0;i<9;i++) {
        const y=.12+i*.095, sway=Math.sin(t*.028+i*.35)*.12;
        const g=c.createLinearGradient(0,y-.15,1,y+.2);
        g.addColorStop(0,'rgba(249,134,99,0)');
        g.addColorStop(.4,'rgba(250,139,115,.10)');
        g.addColorStop(.7,'rgba(172,117,236,.16)');
        g.addColorStop(1,'rgba(115,152,220,0)');
        c.beginPath();c.moveTo(-.1,y);
        c.bezierCurveTo(.24,y-.25+sway,.54,y+.25-sway,1.1,y-.04);
        c.bezierCurveTo(.6,y+.39-sway,.23,y-.1+sway,-.1,y+.07);
        c.closePath();c.fillStyle=g;c.fill();
      }
    }

    afterConversation(t) {
      // Plum, coral and indigo forms begin tangled, then drift apart around a calm
      // centre over the eight-minute session. The immersive page uses a WebGL version.
      const c = this.ctx, smooth = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
      const pr = Math.min(1, t / 480), apart = smooth(.05, .6, pr), settle = smooth(.45, .75, pr), back = smooth(.75, .9, pr);
      const p = t * .048, speed = 1 - .45 * settle;
      this.background([[0, '#0b0a1a'], [.55, '#140f24'], [1, '#1b0f1d']]);
      this.glow(.18, .26, .62, '52,48,122', .17);
      this.glow(.86, .74, .55, '104,44,88', .14);
      const cx = .5 + .012 * Math.sin(p * .5), cy = .48 + .014 * Math.cos(p * .43);
      const families = [
        { dir: -2.35, rgb: ['74,68,146', '96,86,172', '128,114,204'] },
        { dir: .32, rgb: ['106,50,104', '138,70,128', '172,98,150'] },
        { dir: 2.05, rgb: ['176,92,88', '204,122,106', '228,158,134'] }
      ];
      for (let layer = 0; layer < 3; layer++) {
        const depth = layer / 2;
        families.forEach((f, fi) => {
          const dist = .03 + apart * (.15 + .06 * depth);
          const ang = f.dir + .1 * Math.sin(p * .4 * speed + fi * 1.7);
          const x = cx + Math.cos(ang) * dist * 1.22, y = cy + Math.sin(ang) * dist;
          const radius = (.36 - layer * .075) * (1 - .16 * apart);
          const agitation = .11 * (1 - apart) + .032;
          const turn = f.dir * .6 + Math.sin(p * .55 * speed + fi + layer * .4) * (.16 - .08 * settle);
          const phase = p * (1.25 - .55 * settle);
          c.save(); c.translate(x, y); c.rotate(turn);
          const contour = (scale, reverse) => {
            for (let j = 0; j <= 128; j++) {
              const a = (reverse ? 128 - j : j) / 128 * TAU;
              const r = radius * scale * (1 + agitation * Math.cos(a * 3 + phase + fi * 2.1 + layer * .5) + .04 * Math.sin(a * 2 - phase * .8 + fi));
              if (j === 0) c.moveTo(Math.cos(a) * r * .8, Math.sin(a) * r); else c.lineTo(Math.cos(a) * r * .8, Math.sin(a) * r);
            }
            c.closePath();
          };
          const rgb = f.rgb[layer];
          c.beginPath(); contour(1, false); contour(.78, true);
          const fill = c.createLinearGradient(-radius, -radius, radius, radius);
          fill.addColorStop(0, `rgba(${rgb},.015)`); fill.addColorStop(.25, `rgba(${rgb},${.06 + depth * .05})`);
          fill.addColorStop(.5, `rgba(${rgb},.022)`); fill.addColorStop(.76, `rgba(${rgb},${.11 + depth * .08})`);
          fill.addColorStop(1, `rgba(${rgb},.02)`);
          c.fillStyle = fill; c.fill('evenodd');
          c.beginPath(); contour(.785, false);
          const rim = c.createLinearGradient(-radius, 0, radius, 0);
          rim.addColorStop(0, `rgba(${rgb},0)`); rim.addColorStop(.6, `rgba(${rgb},.025)`);
          rim.addColorStop(.85, `rgba(${rgb},${.1 + depth * .09})`); rim.addColorStop(1, `rgba(${rgb},0)`);
          c.strokeStyle = rim; c.lineWidth = .0011; c.stroke(); c.restore();
        });
      }
      this.glow(cx, cy, .2, '206,190,204', .02 + .12 * apart + .05 * back);
      this.glow(cx, cy + .01, .075, '244,224,212', .015 + .11 * apart + .06 * back);
      this.glow(.5, 1.08, .75, '222,146,116', .11 * back);
    }

    firstLight(t) {
      // The petals unfurl from closed over the first seconds, then each one sways on its own.
      const c=this.ctx, open=Math.min(1,t/6), ease=open*open*(3-2*open);
      this.background([[0,'#0e2630'],[.5,'#3a2640'],[1,'#8a4436']]);
      this.glow(.52,.72,.66,'225,130,60',.5*(.4+.6*ease));
      this.glow(.18,.24,.5,'40,200,190',.34);
      this.glow(.84,.26,.46,'170,50,80',.34);
      const colors=['235,160,60','205,80,90','30,170,160','225,120,45'];
      c.save();c.translate(.5+Math.sin(t*.05)*.04,.72);
      c.rotate(Math.sin(t*.04)*.1);
      c.globalCompositeOperation='lighter';
      for(let i=0;i<12;i++) {
        c.save();c.rotate((i-5.5)*.17*ease+Math.sin(t*.23+i*1.3)*.05);
        const reach=(.55+.45*ease)*(1+.08*Math.sin(t*.17+i));
        const g=c.createLinearGradient(0,0,0,-reach);
        g.addColorStop(0,'rgba(255,214,160,.05)');
        g.addColorStop(.45,`rgba(${colors[i%4]},${(.12+.05*Math.sin(t*.3+i)).toFixed(3)})`);
        g.addColorStop(1,'rgba(255,196,155,0)');
        const bend=.12*Math.sin(t*.19+i*.9);
        c.beginPath();c.moveTo(0,.1);
        c.bezierCurveTo(-.12+bend,-.25*reach,-.15+bend,-.7*reach,bend*.6,-1.1*reach);
        c.bezierCurveTo(.17+bend,-.65*reach,.08,-.2*reach,0,.1);
        c.fillStyle=g;c.fill();c.restore();
      }
      c.restore();
      c.globalCompositeOperation='source-over';
    }

    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      if (this.frame) cancelAnimationFrame(this.frame);
      this.frame = 0;
      if (!this.ctx) return;
      document.removeEventListener('visibilitychange', this.onVisibility);
      if (this.preference) {
        if (this.preference.removeEventListener) this.preference.removeEventListener('change', this.onPreference);
        else if (this.preference.removeListener) this.preference.removeListener(this.onPreference);
      }
      if (this.resizeObserver) this.resizeObserver.disconnect();
      else window.removeEventListener('resize', this.onResize);
      if (this.intersectionObserver) this.intersectionObserver.disconnect();
    }
  }

  window.SuperthoughtsField = SuperthoughtsField;
})();
