// The field: one framed rectangle painted by the session's voice.
// At rest it breathes on an 11s cycle, like ink settling in water under window light.
// Playing: low band swells the form, mids move the current, highs sharpen the filaments.
// Reduced motion: renders one frame and stops. No WebGL: leaves the fog tint block.
(function () {
  const canvas = document.getElementById('canvas');
  const audio = document.getElementById('audio');
  const play = document.getElementById('play');
  const status = document.getElementById('status');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) { wirePlayer(null); return; }

  const vs = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
  const fs = `
    precision highp float;
    uniform vec2 uRes; uniform float uTime, uLow, uMid, uHigh, uLevel;

    vec2 hash2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return -1.0 + 2.0 * fract(sin(p) * 43758.5453123); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
      return mix(mix(dot(hash2(i), f), dot(hash2(i+vec2(1,0)), f-vec2(1,0)), u.x),
                 mix(dot(hash2(i+vec2(0,1)), f-vec2(0,1)), dot(hash2(i+vec2(1,1)), f-vec2(1,1)), u.x), u.y);
    }
    float fbm(vec2 p){
      float v = 0.0, a = 0.5; mat2 m = mat2(0.8, 0.6, -0.6, 0.8);
      for (int i = 0; i < 6; i++) { v += a * noise(p); p = m * p * 2.02 + 3.7; a *= 0.5; }
      return 0.5 + 0.5 * v;
    }
    float hash1(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

    void main(){
      vec2 uv = gl_FragCoord.xy / uRes;
      vec2 q = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);

      float breath = 0.5 + 0.5 * sin(uTime * 6.2831853 / 11.0);
      float t = uTime * 0.02 * (1.0 + uMid * 1.5);
      float swell = 0.92 + 0.10 * breath + uLow * 0.35;

      // two layers of domain warp: slow current, then fine eddies
      vec2 w1 = vec2(fbm(q * 1.3 * swell + vec2(0.0, t)), fbm(q * 1.3 * swell + vec2(5.2, 1.3) - t * 0.7));
      vec2 w2 = vec2(fbm(q * 2.1 + 2.6 * w1 + vec2(1.7, 9.2) + t * 0.5), fbm(q * 2.1 + 2.6 * w1 + vec2(8.3, 2.8) - t * 0.4));
      float n = fbm(q * 1.15 + 2.4 * w2);

      // filaments: ridged noise, sharpened by the voice's highs
      float f = fbm(q * 2.8 + 1.8 * w2 + t * 0.6);
      float ridge = 1.0 - abs(2.0 * f - 1.0);
      float fil = pow(ridge, 7.0 - uHigh * 3.0);

      // palette: slate in the depths, moss, fog, paper in the light, a breath of clay
      vec3 paper = vec3(0.930, 0.922, 0.900);
      vec3 fog   = vec3(0.790, 0.792, 0.760);
      vec3 moss  = vec3(0.520, 0.590, 0.505);
      vec3 slate = vec3(0.250, 0.310, 0.275);
      vec3 clay  = vec3(0.735, 0.610, 0.520);

      float nn = n + uLevel * 0.12;
      vec3 c = mix(slate, moss, smoothstep(0.22, 0.46, nn));
      c = mix(c, fog,   smoothstep(0.44, 0.60, nn));
      c = mix(c, paper, smoothstep(0.58, 0.82, nn));
      c = mix(c, clay,  smoothstep(0.62, 0.92, w2.x) * 0.22);
      c += vec3(0.96, 0.94, 0.90) * fil * (0.16 + 0.18 * breath + uHigh * 0.3) * smoothstep(0.30, 0.55, nn);

      // window light from the upper left, soft
      float light = smoothstep(1.9, 0.0, distance(q, vec2(-0.55, 0.55)));
      c = mix(c, paper, light * 0.18 * (0.7 + 0.3 * breath));

      // held vignette so the edges settle into the frame
      float v = smoothstep(1.25, 0.30, length(uv - 0.5));
      c = mix(c * 0.93, c, v);

      // paper grain
      float g = hash1(gl_FragCoord.xy + fract(uTime * 0.37)) - 0.5;
      c += g * 0.022;

      gl_FragColor = vec4(c, 1.0);
    }`;

  function shader(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ['uRes', 'uTime', 'uLow', 'uMid', 'uHigh', 'uLevel'].forEach(n => U[n] = gl.getUniformLocation(prog, n));

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const w = Math.min(Math.round(r.width * dpr), 1600), h = Math.round(w * r.height / r.width);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    gl.uniform2f(U.uRes, w, h);
  }
  addEventListener('resize', resize, { passive: true });

  // audio analysis, smoothed so the field moves like breath, not a meter
  let ctx = null, analyser = null, freq = null;
  const band = { low: 0, mid: 0, high: 0, level: 0 };
  function connect() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    if (navigator.audioSession) { try { navigator.audioSession.type = 'playback'; } catch (e) {} }
    const src = ctx.createMediaElementSource(audio);
    analyser = ctx.createAnalyser(); analyser.fftSize = 1024; analyser.smoothingTimeConstant = 0.85;
    src.connect(analyser); analyser.connect(ctx.destination);
    freq = new Uint8Array(analyser.frequencyBinCount);
  }
  function avg(a, b) { let s = 0; for (let i = a; i < b; i++) s += freq[i]; return s / (b - a) / 255; }
  function sample() {
    if (!analyser || audio.paused) {
      band.low += (0 - band.low) * 0.03; band.mid += (0 - band.mid) * 0.03;
      band.high += (0 - band.high) * 0.03; band.level += (0 - band.level) * 0.03; return;
    }
    analyser.getByteFrequencyData(freq);
    const lo = avg(2, 12), mi = avg(12, 60), hi = avg(60, 200);
    band.low += (lo - band.low) * 0.06; band.mid += (mi - band.mid) * 0.08;
    band.high += (hi - band.high) * 0.12; band.level += ((lo + mi + hi) / 3 - band.level) * 0.06;
  }

  const t0 = performance.now();
  let visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(e => { visible = e[0].isIntersecting; if (visible && !reduced) requestAnimationFrame(frame); }, { threshold: 0 }).observe(canvas);
  }
  function frame() {
    resize(); sample();
    gl.uniform1f(U.uTime, (performance.now() - t0) / 1000);
    gl.uniform1f(U.uLow, band.low); gl.uniform1f(U.uMid, band.mid);
    gl.uniform1f(U.uHigh, band.high); gl.uniform1f(U.uLevel, band.level);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!reduced && visible) requestAnimationFrame(frame);
  }
  frame();

  wirePlayer(connect);

  function wirePlayer(onFirstPlay) {
    function setState(s) {
      const on = s === 'Playing';
      play.setAttribute('aria-pressed', on ? 'true' : 'false');
      play.setAttribute('aria-label', (on ? 'Pause ' : 'Play ') + 'Three Minute Reset');
      status.textContent = s;
    }
    play.addEventListener('click', async () => {
      if (audio.paused) {
        if (onFirstPlay) onFirstPlay();
        if (ctx && ctx.state === 'suspended') await ctx.resume();
        try { await audio.play(); } catch (e) { setState('Idle'); }
      } else { audio.pause(); }
    });
    play.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { audio.currentTime = Math.max(0, audio.currentTime - 5); e.preventDefault(); }
    });
    audio.addEventListener('play', () => setState('Playing'));
    audio.addEventListener('pause', () => setState(audio.ended ? 'Finished' : 'Paused'));
    audio.addEventListener('ended', () => setState('Finished'));
    setState('Idle');
  }
})();
