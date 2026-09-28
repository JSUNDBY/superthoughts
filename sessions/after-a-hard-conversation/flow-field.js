/* Superthoughts — Gossamer. Glowing threads that the voice paints and the session untangles.
   Tangled while the conversation is still charged; loosening around a calm centre;
   a warm low light for the return. Filaments brighten while Josh speaks (precomputed
   loudness in envelope.js, so audio never routes through Web Audio). Falls back to a
   still gradient where WebGL is unavailable. */
(()=>{
'use strict';
const canvas=document.getElementById('flow'),audio=document.getElementById('pilot-audio');
const preference=matchMedia('(prefers-reduced-motion: reduce)');
const mobile=matchMedia('(pointer: coarse)').matches,frameMs=1000/(mobile?18:24),DUR=480;
const env=window.ST_ENVELOPE||null;
let frame=0,last=0,motion=20,paused=preference.matches,playing=false,dim=false,voice=0,music=.5;

const VERT='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FRAG=`precision highp float;
uniform vec2 res;uniform float t,arc,voice,music;
vec2 h2(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return -1.+2.*fract(sin(p)*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);
 return mix(mix(dot(h2(i),f),dot(h2(i+vec2(1,0)),f-vec2(1,0)),u.x),mix(dot(h2(i+vec2(0,1)),f-vec2(0,1)),dot(h2(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float a=.5,s=0.;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<4;i++){s+=a*noise(p);p=m*p;a*=.5;}return s;}
vec2 web(vec2 p,float warp,float seed,float tt){
 vec2 q=vec2(fbm(p+seed+vec2(tt*.031,0.)),fbm(p+seed*1.7-vec2(0.,tt*.026)));
 vec2 r=p+warp*q;
 float a=clamp(1.-abs(noise(r*1.05+seed))*4.6,0.,1.);
 float b=clamp(1.-abs(noise(r*2.2-seed+q))*7.,0.,1.);
 float cluster=smoothstep(-.2,.24,fbm(p*.32+seed*2.3+vec2(0.,tt*.006)));
 return vec2((pow(a,5.)+.3*pow(b,7.))*cluster,pow(a*b,2.)*cluster);
}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*res)/res.y;
 float apart=smoothstep(.05,.6,arc),back=smoothstep(.75,.9,arc),rad=length(uv);
 vec3 col=mix(vec3(.028,.024,.062),vec3(.05,.026,.058),uv.y*.5+.5);
 col+=vec3(.10,.08,.26)*max(fbm(uv*1.1+vec2(t*.008,0.)),0.)*.55;
 vec3 tint[3];tint[0]=vec3(.38,.36,.95);tint[1]=vec3(.78,.34,.72);tint[2]=vec3(1.,.55,.43);
 float warp=mix(1.7,.55,apart),tt=t*(1.-.45*apart);
 for(int k=0;k<3;k++){
  float d=float(k)/2.;
  vec2 p=uv*(1.-apart*.3*(1.-d*.3)*exp(-rad*1.4));
  float ang=.06*sin(tt*.02+d*2.);p=mat2(cos(ang),-sin(ang),sin(ang),cos(ang))*p;
  p=p*mix(1.5,2.7,d)+vec2(d*6.2,d*3.4);
  vec2 w=web(p,warp,d*5.3+1.,tt);
  float hole=mix(1.,.12+.88*smoothstep(.04+.16*apart,.16+.3*apart,rad),apart);
  float glow=(.2+.24*d)*(.75+.7*voice*(1.-.3*d))*(.85+.3*music);
  col+=tint[k]*(w.x+1.2*w.y)*hole*glow;
 }
 col+=vec3(1.,.8,.74)*(exp(-rad*rad*30.)*(.02+.09*apart)+voice*.06*exp(-rad*rad*9.));
 col+=vec3(.95,.55,.38)*back*.34*exp(-pow(uv.y+.6,2.)*4.);
 col*=1.-.55*smoothstep(.35,1.15,rad);
 col=1.-exp(-col*1.15);
 col+=(fract(sin(dot(gl_FragCoord.xy+t,vec2(12.9898,78.233)))*43758.5453)-.5)*.018;
 gl_FragColor=vec4(pow(max(col,0.),vec3(.95)),1.);
}`;

let gl=null,u=null;
try{
 gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'});
 if(gl){
  const make=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return gl.getShaderParameter(s,gl.COMPILE_STATUS)?s:null;};
  const vs=make(gl.VERTEX_SHADER,VERT),fs=make(gl.FRAGMENT_SHADER,FRAG);
  const prog=vs&&fs&&gl.createProgram();
  if(prog){gl.attachShader(prog,vs);gl.attachShader(prog,fs);gl.linkProgram(prog);}
  if(!prog||!gl.getProgramParameter(prog,gl.LINK_STATUS))gl=null;
  else{
   gl.useProgram(prog);
   gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
   gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
   const loc=gl.getAttribLocation(prog,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
   u=Object.fromEntries(['res','t','arc','voice','music'].map(n=>[n,gl.getUniformLocation(prog,n)]));
  }
 }
}catch{gl=null;}
// Without WebGL the room's own CSS gradient stays visible behind a transparent canvas.
if(!gl)canvas.style.opacity='0';

function levels(){
 if(!env)return;
 const i=Math.min(env.voice.length-1,Math.max(0,Math.floor((audio.currentTime||0)*env.rate)));
 voice+=(env.voice[i]-voice)*.3;music+=(env.music[i]-music)*.15;
}
function render(){
 if(!gl)return;
 gl.viewport(0,0,canvas.width,canvas.height);
 gl.uniform2f(u.res,canvas.width,canvas.height);
 gl.uniform1f(u.t,motion);gl.uniform1f(u.arc,Math.min(1,(audio.currentTime||0)/DUR));
 gl.uniform1f(u.voice,paused?0:voice);gl.uniform1f(u.music,paused?.5:music);
 gl.drawArrays(gl.TRIANGLES,0,3);
 canvas.dataset.frameTime=motion.toFixed(2);
}
function shouldRun(){return !!gl&&playing&&!paused&&!dim&&!document.hidden;}
function tick(now){frame=0;if(!shouldRun())return;if(last&&now-last<frameMs){frame=requestAnimationFrame(tick);return;}if(last)motion+=Math.min((now-last)/1000,.12);last=now;levels();render();frame=requestAnimationFrame(tick);}
function run(){cancelAnimationFrame(frame);frame=0;last=0;if(shouldRun())frame=requestAnimationFrame(tick);else render();}
function resize(){
 const w=innerWidth,h=innerHeight;if(!w||!h)return;
 // A soft field: render below screen resolution and let the browser smooth it up.
 const width=Math.max(1,Math.round(Math.min(w*Math.min(devicePixelRatio||1,1.5)*.6,mobile?540:1100)));
 canvas.width=width;canvas.height=Math.max(1,Math.round(width*h/w));render();
}
window.setFlowPaused=value=>{paused=value;run();};
window.setFlowPlaying=value=>{playing=value;run();};
window.setFlowDim=value=>{dim=value;run();};
// Seeking while paused still shows the right point in the arc.
audio.addEventListener('seeked',()=>{if(!shouldRun()){levels();render();}});
document.addEventListener('visibilitychange',run);window.addEventListener('resize',resize);preference.addEventListener('change',e=>{paused=e.matches;run();});resize();run();
})();
