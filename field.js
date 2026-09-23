// The field: one framed rectangle painted by the session's voice.
// Idle: breathes on an 11s cycle. Playing: analyser bands drive swell, drift, shimmer.
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
    precision mediump float;
    uniform vec2 uRes; uniform float uTime, uLow, uMid, uHigh, uLevel;

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
      return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
    }
    float fbm(vec2 p){
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; }
      return v;
    }
    void main(){
      vec2 uv = gl_FragCoord.xy / uRes;
      vec2 q = uv; q.x *= uRes.x / uRes.y;

      float breath = 0.5 + 0.5 * sin(uTime * 6.2831853 / 11.0);
      float t = uTime * 0.035;
      float swell = 0.75 + 0.35 * breath + uLow * 0.6;

      vec2 w1 = vec2(fbm(q * 1.4 + t), fbm(q * 1.4 - t * 0.8 + 3.1));
      vec2 w2 = vec2(fbm(q * 2.2 + w1 * 1.6 + uMid * 0.8), fbm(q * 2.2 - w1 * 1.3 + 5.2));
      float n = fbm(q * 1.1 * swell + w2 * 1.2);
      float s = fbm(q * 6.0 + w2 * 2.0 + t * 2.0) * uHigh;

      // paper-side palette: fog, birch, moss, clay. Muted, but present.
      vec3 fog   = vec3(0.800, 0.804, 0.776);
      vec3 birch = vec3(0.910, 0.894, 0.851);
      vec3 moss  = vec3(0.596, 0.651, 0.569);
      vec3 clay  = vec3(0.741, 0.620, 0.541);

      vec3 c = mix(fog, birch, smoothstep(0.28, 0.60, n));
      c = mix(c, moss, smoothstep(0.42, 0.78, n) * (0.60 + 0.40 * breath));
      c = mix(c, clay, smoothstep(0.58, 0.92, n + uLevel * 0.25) * 0.75);
      c = mix(c, fog * 0.92, smoothstep(0.30, 0.05, n) * 0.6);
      c += s * 0.08;

      // light from the upper left, like a window
      float light = smoothstep(1.6, 0.0, distance(q, vec2(0.25, 0.85)));
      c = mix(c, birch, light * 0.35 * (0.6 + 0.4 * breath));

      // vignette held soft
      float v = smoothstep(1.35, 0.35, distance(uv, vec2(0.5)));
      c = mix(c * 0.94, c, v);

      // grain
      float g = hash(gl_FragCoord.xy + fract(uTime)) - 0.5;
      c += g * 0.028;

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
    const w = Math.min(Math.round(r.width * dpr), 1440), h = Math.round(w * r.height / r.width);
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
  function frame() {
    resize(); sample();
    gl.uniform1f(U.uTime, (performance.now() - t0) / 1000);
    gl.uniform1f(U.uLow, band.low); gl.uniform1f(U.uMid, band.mid);
    gl.uniform1f(U.uHigh, band.high); gl.uniform1f(U.uLevel, band.level);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!reduced) requestAnimationFrame(frame);
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
