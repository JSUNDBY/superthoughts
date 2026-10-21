/** Light pieces for Superthoughts sessions (2026-10-20), in the spirit of James Turrell: light as the material.
 * Josh: "a motion generative visual … all unique … code … kind of a James Turrell light vibe that goes with the session."
 * One WebGL fragment shader draws every form; each session picks a form and a color arc. The arc follows the
 * listening position (audio currentTime / duration), so the light changes as the session goes; a very slow drift
 * keeps it alive before play. Fields are smooth by construction and dithered to avoid banding. Rendered below
 * screen resolution (light fields need no detail), capped at 30 fps, paused when hidden. */

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

const FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform int uForm; uniform vec2 uFocus;
uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform vec3 uD; uniform float uDim;
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
float box(vec2 p, vec2 b, float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float soft(float d, float k){return exp(-max(d,0.)*k);}
float outer(float d, float k){return d>0.?exp(-d*k):0.;}
float innerLit(float d, float k){return d<0.?exp(d*k):0.;}
float edge(float d){float px=1.4/min(uRes.x,uRes.y);return smoothstep(px,-px,d);}
vec3 lin(vec3 c){return pow(c,vec3(2.2));}
// A lit room: the wall brightens toward the light and falls off into soft coves at the frame edges.
vec3 room(vec2 p, vec3 wall, vec3 bounce, float spread){
  float l=exp(-dot(p,p)/spread); vec3 c=mix(wall*.1,wall*.5,smoothstep(1.3,0.,length(p*vec2(.8,1.))));
  return c+bounce*l*.35;
}
void main(){
  vec2 frag=gl_FragCoord.xy; float asp=uRes.x/uRes.y;
  vec2 uv=frag/uRes; vec2 p=vec2((uv.x-uFocus.x)*asp, uv.y-uFocus.y); if(asp<1.) p/=max(.55,asp*1.5);
  float t=uTime; float br=.5+.5*sin(t*.21); float slow=sin(t*.017);
  vec3 A=lin(uA),B=lin(uB),C=lin(uC),D=lin(uD); vec3 col; float haze=0.; vec3 hazeC=B; float inside=0.;

  if(uForm==0){ // Ganzfeld: an edgeless lit room; no corners, no horizon, the colour itself is the space
    vec2 q=p+.12*vec2(sin(t*.011),cos(t*.013));
    float r=length(q*vec2(.7,1.));
    col=mix(B,A*.4,smoothstep(.0,1.3,r)); col=mix(col,C,.55*exp(-dot(q-vec2(.3,.1),q-vec2(.3,.1))*1.8));
    col=mix(col,D,.35*smoothstep(-.2,-.9,p.y)); col*=1.+.06*br; haze=.25; hazeC=C;
  } else if(uForm==1){ // Skyspace: a square cut in a ceiling lit by coloured light; the sky reads as a flat painted plane
    float d=box(p,vec2(.3),.002);
    vec3 ceil=room(p,A,D,.55);
    vec3 sky=mix(C,B,smoothstep(-.4,.4,p.y+.05*slow));
    sky+=C*.3*innerLit(d,9.); col=mix(ceil,sky,edge(d)); inside=edge(d); col+=D*.45*outer(d,5.)+C*.25*outer(d,1.6);
    haze=.12; hazeC=D;
  } else if(uForm==2){ // Space Division: a rectangle in a coloured wall that reads as a solid plane and a void at once
    float d=box(p,vec2(.19,.32),.002);
    vec3 wall=room(p+vec2(0.,.15),A,D,.7);
    vec3 inner=mix(B,C,smoothstep(-.35,.35,p.y+.08*slow)); inner*=.97+.05*br;
    inner+=C*.35*innerLit(d,10.); col=mix(wall,inner,edge(d)); inside=edge(d); col+=B*.4*outer(d,5.)+C*.2*outer(d,1.5);
    haze=.1; hazeC=D;
  } else if(uForm==3){ // Projection: a cube of pale light floating in a dark corner, its faces differing only in strength
    mat2 R=mat2(.94,.34,-.34,.94); vec2 q=R*p;
    float face=box(q-vec2(-.05,-.02),vec2(.15,.15),.0015);
    vec2 s=q-vec2(.135,.03); s.x-=s.y*.45; float side=box(s,vec2(.05,.15),.0015);
    vec2 tp=q-vec2(.02,.165); tp.x-=tp.y*1.6; float top=box(tp,vec2(.16,.035),.0015);
    float corner=abs(p.x-.135)+.02; 
    col=room(p,A,D*.6,.4); col*=.85+.15*smoothstep(0.,.5,corner);
    vec3 L=mix(B,C,.35+.25*br);
    col=mix(col,L,edge(face)); col=mix(col,L*.9,edge(side)); col=mix(col,L*1.05,edge(top));
    col+=B*.3*outer(min(face,min(side,top)),5.)+C*.15*outer(min(face,min(side,top)),1.5); haze=.15; hazeC=B;
  } else if(uForm==4){ // Wedgework: a sheet of coloured light standing in a dark room, a hidden source beyond the partition
    vec2 n=normalize(vec2(1.,.5)); float pl=dot(p,n)+.04*slow;
    float sheet=exp(-pl*pl*28.)*smoothstep(.8,.1,abs(p.y+.02));
    float sheet2=exp(-(pl-.38)*(pl-.38)*40.)*smoothstep(.7,.0,abs(p.y))*.7;
    col=room(p,A,D*.25,.3); col=mix(col,B,sheet*.9); col=mix(col,C,sheet2);
    col+=D*.9*exp(-length(p-vec2(.8,.05))*2.2); col*=1.-.55*smoothstep(-.02,.02,pl-.6)*step(pl,.62);
    haze=.25; hazeC=B;
  } else if(uForm==5){ // Slot: a long opening of light cut into a dark wall; light pours across wall and floor
    float d=box(p-vec2(.2,0.),vec2(.62,.028+.004*br),.002);
    col=room(p+vec2(-.2,.0),A,D,.25);
    col=mix(col,mix(B,C,smoothstep(-.4,.8,p.x)),edge(d));
    col+=C*.6*soft(d,16.)+B*.35*soft(d,4.)+D*.4*exp(-abs(p.y+.35)*6.)*smoothstep(-.6,.6,p.x);
    haze=.18; hazeC=C;
  } else if(uForm==6){ // Tunnel: frames of coloured light receding toward a bright centre
    float k=clamp(-box(p,vec2(.3,.32),.16)/.46,0.,1.); float dk=pow(k,1.4);
    col=mix(A*.5,C,smoothstep(0.,.55,dk)); col=mix(col,B,smoothstep(.45,1.,dk));
    col*=.9+.1*sin(dk*9.-t*.05); col+=D*.5*exp(-length(p)*4.); col=mix(A*.25,col,smoothstep(-.01,.03,-box(p,vec2(.3,.32),.16)+.02));
    haze=.2; hazeC=D;
  } else if(uForm==7){ // Oculus: a round opening in a dome; the dome glows with coloured light, the sky is one deep colour
    float r=length(p); float d=r-.27;
    vec3 dome=room(p,A,D,.35)+D*.4*outer(d,6.);
    vec3 sky=mix(B,C,smoothstep(.27,-.1,p.y+.06*slow)); sky*=.97+.05*br;
    sky+=D*.3*innerLit(d,8.); col=mix(dome,sky,edge(d)); inside=edge(d); col+=B*.35*outer(d,4.)+C*.2*outer(d,1.4); haze=.12; hazeC=D;
  } else if(uForm==8){ // Passing wave: a broad band of colour rises through an edgeless field and passes, again and again
    float ph=fract(t*.018+.35); float y=p.y-(-1.2+2.6*ph); float band=exp(-y*y*3.2);
    col=mix(A*.4,B,smoothstep(1.3,0.,length(p*vec2(.7,1.)))); col=mix(col,C,band*.85); col+=D*.25*band*exp(-abs(p.x)*1.5);
    haze=.2; hazeC=C;
  } else if(uForm==9){ // Niche: a tall arched recess in a dark wall, lit from within; light spills onto the wall
    vec2 q=p-vec2(0.,-.04); float w=.11, hgt=.2;
    float arch=q.y>hgt-w? length(q-vec2(0.,hgt-w))-w : box(q-vec2(0.,(hgt-w-.32)*.5),vec2(w,(hgt-w+.32)*.5),.0);
    col=room(p,A,D,.3); vec3 inner=mix(C,B,smoothstep(-.32,.2,q.y)); col=mix(col,inner,edge(arch)); inside=edge(arch);
    col+=B*.45*outer(arch,6.)+C*.2*outer(arch,1.6); haze=.18; hazeC=B;
  } else if(uForm==11){ // Elliptic: a wide elliptical opening onto pearl light, the dark room barely lit by it
    float d=(length(p/vec2(.42,.22))-1.)*.2;
    vec3 wall=room(p,A,D,.25); vec3 sky=mix(B,C,smoothstep(-.17,.17,p.y+.03*slow)); sky*=.97+.05*br;
    sky=mix(sky*.55,sky,innerLit(d,7.)); col=mix(wall,sky,edge(d)); inside=edge(d); col+=B*.35*outer(d,5.)+C*.18*outer(d,1.4); haze=.1; hazeC=D;
  } else if(uForm==12){ // Shallow space: a dark panel floats off the wall on a halo of light leaking from behind it
    float d=box(p,vec2(.26,.34),.01);
    vec3 wall=room(p,A,D*.3,.6); float halo=outer(d,7.)*(1.+.1*br);
    col=wall+B*1.1*halo+C*.5*outer(d,22.); col=mix(col,A*.18+B*.04,edge(d)); inside=edge(d); haze=.12; hazeC=B;
  } else if(uForm==13){ // Two fields: an upper and a lower colour meet at a soft horizon that slowly breathes
    float y=p.y-.04*slow; float h=smoothstep(-.06-.03*br,.06+.03*br,y);
    col=mix(C,B,h); col+=D*.35*exp(-y*y*60.); col=mix(col,A*.3,smoothstep(.7,1.5,length(p*vec2(.6,1.)))); haze=.08; hazeC=D;
  } else if(uForm==14){ // Halo: a slow ring of light on a dark wall, its centre a quieter colour
    float r=length(p*vec2(1.,1.05)); float ring=exp(-pow((r-.24-.01*br+.015*sin(atan(p.y,p.x)*2.+t*.03))*7.,2.));
    col=room(p,A,D*.4,.4); col=mix(col,C*.7,smoothstep(.24,.0,r)*.6); col+=B*ring*1.1+B*.3*exp(-pow((r-.24)*4.,2.)); haze=.12; hazeC=B;
  } else { // 10 Clearing: grey haze lifts off the bottom of the field and clear colour opens above
    float lift=.5+.5*sin(t*.03); float h=smoothstep(-.7+.25*lift,.55,p.y);
    col=mix(C,B,h); col=mix(col,D,.5*exp(-pow(p.y-.35,2.)*5.)*smoothstep(1.3,0.,abs(p.x)));
    col=mix(col,A*.35,smoothstep(.6,1.4,length(p*vec2(.6,1.)))); haze=.15; hazeC=D;
  }
  // light in the air: a little of the source colour fills the whole frame, strongest near the light
  col+=hazeC*haze*.45*exp(-length(p*vec2(.8,1.))*1.6)*(1.-inside);
  col*=1.-.5*smoothstep(.45,1.2,length((uv-vec2(uFocus.x,.5))*vec2(1.,.9))*1.4);
  col=mix(col,col*.18,uDim);
  col=col/(1.+col*.12);
  col=pow(max(col,0.),vec3(1./2.2));
  col+=(hash(frag+fract(t)*91.)-.5)/255.;
  gl_FragColor=vec4(col,1.);
}`;

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
function arcAt(arc, k) {  // arc: [[p, {A,B,C,D}], …] sorted by p; returns rgb triples
  let i = 0; while (i < arc.length - 2 && k > arc[i + 1][0]) i++;
  const [p0, c0] = arc[i], [p1, c1] = arc[Math.min(i + 1, arc.length - 1)];
  const f = p1 === p0 ? 0 : Math.min(1, Math.max(0, (k - p0) / (p1 - p0))), s = f * f * (3 - 2 * f);
  return Object.fromEntries(['A', 'B', 'C', 'D'].map(n => [n, mix(hex(c0[n]), hex(c1[n]), s)]));
}

/* Each session: a form, where it sits (focus, as a fraction of the frame), and a colour arc across the session.
 * A = surrounding wall or field, B = the light itself, C = second light, D = bounce on the wall. */
const K = (A, B, C, D) => ({A, B, C, D});
export const PIECES = {
  // Sunday dusk into night: ceiling lit warm orange, the sky deep cobalt; by the end both are night.
  week: {form: 1, focus: [.7, .66], arc: [[0, K('#7a3a2a', '#1a3a8a', '#3a5ab8', '#ff7a3a')], [.55, K('#5a2a3a', '#14246a', '#2a3a8a', '#e0507a')], [1, K('#1a1426', '#070c26', '#0e1640', '#5a2a6a')]]},
  // A coral wall with a deep teal plane that reads as solid or void; the wall cools toward rose.
  yesmouth: {form: 2, focus: [.62, .56], arc: [[0, K('#0e4a48', '#ff6a3a', '#ffb07a', '#2ab8a8')], [1, K('#123a48', '#ff7a8a', '#ffc0b0', '#3aa8b8')]]},
  // An edgeless field that starts charged (teal and coral) and settles to pale sea-glass.
  tense: {form: 0, focus: [.62, .5], arc: [[0, K('#0a3a40', '#1ab0a0', '#ff8a6a', '#0a6070')], [.6, K('#0a3440', '#40c0b0', '#c0e8d0', '#1a6a70')], [1, K('#0c2c3a', '#8ad8cc', '#f0fff4', '#2a6a74')]]},
  // A slot of pre-dawn blue that warms into morning gold, washing the wall and floor.
  phone: {form: 5, focus: [.56, .52], arc: [[0, K('#0e1430', '#4a7ae0', '#a8c8ff', '#2a3a8a')], [.5, K('#2a1a30', '#ff9a8a', '#ffd0b0', '#8a3a5a')], [1, K('#3a2410', '#ffb43a', '#fff0b0', '#c8701a')]]},
  // A pale cube of light in a dark red room; it warms from ember to gold as strength builds.
  empower: {form: 3, focus: [.58, .5], arc: [[0, K('#3a0a08', '#ffd0b8', '#ff6a3a', '#a01a10')], [.6, K('#4a1406', '#ffe0b0', '#ffa040', '#c0400a')], [1, K('#4a2006', '#fff2c8', '#ffd060', '#d07a10')]]},
  // A sheet of aurora green in a dark room, a magenta source behind the partition.
  asking: {form: 4, focus: [.58, .5], arc: [[0, K('#06121a', '#20e0a0', '#40a0ff', '#ff3aa0')], [1, K('#0a0e1a', '#7af0d0', '#a080ff', '#ff7ac0')]]},
  // A band of hot colour rises through a deep blue field and passes; by the end the field is calm green.
  urge: {form: 8, focus: [.6, .5], stillT: 6, arc: [[0, K('#120c08', '#5a2a14', '#ff7a3a', '#ffc070')], [.5, K('#100a10', '#4a1a1a', '#ff4a3a', '#ff9a6a')], [1, K('#04201e', '#0a7a6a', '#7af0c0', '#d0ffe8')]]},
  // Grey haze lifting to clear blue air.
  stress: {form: 10, focus: [.6, .5], stillT: 52, arc: [[0, K('#2a1e18', '#c89a6a', '#5a3a2a', '#ffd0a0')], [.6, K('#14202c', '#5aa8e0', '#606a74', '#c8e8ff')], [1, K('#081a30', '#3ab0ff', '#7ab0d0', '#e0f6ff')]]},
  // A dome lit rose-gold around a round opening onto deep blue that turns gold.
  abundance: {form: 7, focus: [.7, .62], arc: [[0, K('#4a1028', '#ffa83a', '#ffe8a0', '#ff4a6a')], [.5, K('#5a1a20', '#ffc04a', '#fff0b8', '#ff7a5a')], [1, K('#5a3008', '#ffe08a', '#fffbe8', '#ffb04a')]]},
  // A dark green wall with a tall niche of lime light deepening to jade.
  ritual: {form: 9, focus: [.64, .5], arc: [[0, K('#0a2416', '#d8ff6a', '#3ac080', '#6ad04a')], [1, K('#0a2a20', '#f0ffb0', '#2ad0a0', '#4ae0a0')]]},
  // Still Enough to Listen: a wide ellipse of pearl light in a near-dark room, warming very slightly.
  still: {form: 11, focus: [.6, .42], arc: [[0, K('#0c1418', '#7ab4d0', '#e8f0f0', '#3a6a7a')], [1, K('#141414', '#d8b8a8', '#fff2e6', '#8a6a5a')]]},
  // A Soft Place to Land: a dark panel floating on honey light.
  soft: {form: 12, focus: [.64, .5], arc: [[0, K('#2a1a20', '#ffb46a', '#ffe0a0', '#c86a4a')], [1, K('#2a1a24', '#ff9a8a', '#ffd8c8', '#c05a6a')]]},
  // Let Them Think What They Think: slate sky over sea-green field, the horizon breathing.
  let: {form: 13, focus: [.6, .5], arc: [[0, K('#0e1a1c', '#3a5a7a', '#2a8a6a', '#a0d0c0')], [1, K('#0e1a1c', '#6a8ab0', '#5ab08a', '#e0f0e0')]]},
  // This Precious Life: a slow ring of rose-gold light around a quiet blue centre.
  life: {form: 14, focus: [.64, .5], arc: [[0, K('#1a1418', '#ffb08a', '#2a4a7a', '#a05a5a')], [1, K('#1a1418', '#ffd0a0', '#3a6a8a', '#c07a5a')]]},
  // Frames receding from deep violet-red to a warm lit centre.
  reason: {form: 6, focus: [.64, .5], arc: [[0, K('#1a0820', '#ffd08a', '#a02a5a', '#ff9a4a')], [1, K('#100a26', '#fff0c8', '#c04a7a', '#ffc070')]]},
};

/* Shared GL program; one per canvas (contexts are cheap here and pages show one live piece). */
function makeGL(canvas) {
  const gl = canvas.getContext('webgl', {antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'low-power'});
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = n => gl.getUniformLocation(pr, n);
  const U = {res: u('uRes'), time: u('uTime'), form: u('uForm'), focus: u('uFocus'), A: u('uA'), B: u('uB'), C: u('uC'), D: u('uD'), dim: u('uDim')};
  return {gl, draw(piece, w, h, t, k, dim = 0) {
    gl.viewport(0, 0, w, h); const c = arcAt(piece.arc, k);
    gl.uniform2f(U.res, w, h); gl.uniform1f(U.time, t); gl.uniform1i(U.form, piece.form); const f = w < h ? [.5, .56] : [piece.focus[0], piece.focus[1]]; gl.uniform2f(U.focus, f[0], f[1]);
    gl.uniform3fv(U.A, c.A); gl.uniform3fv(U.B, c.B); gl.uniform3fv(U.C, c.C); gl.uniform3fv(U.D, c.D); gl.uniform1f(U.dim, dim);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }};
}

/** Live piece on a canvas. progress(): 0..1 position in the session (audio), or null before play. */
export function createLight(canvas, key, {progress = () => null, scale = .5} = {}) {
  const piece = PIECES[key]; if (!piece) return null;
  let g; try { g = makeGL(canvas); } catch (e) { console.warn('light piece', e); return null; }
  if (!g) return null;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false, dim = 0, dimTarget = 0, raf = 0, last = 0, t0 = performance.now(), prev = t0, clock = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden || now - last < (paused || reduced.matches ? 500 : 33)) return; last = now; draw(now);
  }
  function draw(now) {
    const box = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(box.width * dpr * scale)), h = Math.max(1, Math.round(box.height * dpr * scale));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    dim += (dimTarget - dim) * .12;
    const p = progress(); const k = p == null ? .04 * (.5 + .5 * Math.sin((now - t0) / 1000 * .01)) : Math.min(1, Math.max(0, p));
    if (!paused && !reduced.matches) clock += Math.min(.1, (now - prev) / 1000); prev = now;
    g.draw(piece, w, h, 30 + clock, k, dim);
  }
  raf = requestAnimationFrame(frame);
  return {setPaused(v) { paused = !!v; if (paused) draw(performance.now()); }, setDim(v) { dimTarget = v ? 1 : 0; }, getState() { return {paused, dim: dimTarget === 1}; }, destroy() { cancelAnimationFrame(raf); }};
}

/** A still for library cards and share images: drawn once into an offscreen WebGL canvas, then copied. */
let stillGL = null, stillCanvas = null;
export function drawStill(target, key, k = .15, t = 40) {
  const piece = PIECES[key]; if (!piece) return false;
  try {
    if (!stillGL) { stillCanvas = document.createElement('canvas'); stillGL = makeGL(stillCanvas); }
    if (!stillGL) return false;
    const w = target.width, h = target.height; stillCanvas.width = w; stillCanvas.height = h;
    stillGL.draw(piece, w, h, piece.stillT ?? t, k);
    target.getContext('2d').drawImage(stillCanvas, 0, 0); return true;
  } catch (e) { console.warn('light still', e); return false; }
}
