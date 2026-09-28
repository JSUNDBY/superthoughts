/* Superthoughts — Gossamer, shared by immersive session pages.
   Each page sets window.ST_FIELD (palette and arc) and window.ST_ENVELOPE (voice and music
   loudness, 20 per second) before loading this file. Filaments brighten while Josh speaks;
   the session position shapes the arc. Same lifecycle hooks as the other session fields:
   setFlowPaused, setFlowPlaying, setFlowDim. Without WebGL the room's CSS gradient shows.
   ST_FIELD: {duration, tints:[[r,g,b]x3], warp:[start,end], hole, align, dim, back, backTint}
   - hole: how far the centre clears (After a Hard Conversation 1)
   - align: threads stretch into a shared direction (Enter your work)
   - dim: light lowers across the session instead of warming (Awake again)
   - back: warm low light for a daytime return */
(()=>{
'use strict';
const cfg=Object.assign({duration:480,tints:[[.38,.36,.95],[.78,.34,.72],[1,.55,.43]],warp:[1.7,.55],hole:1,align:0,dim:0,back:.34,backTint:[.95,.55,.38]},window.ST_FIELD||{});
const canvas=document.getElementById('flow'),audio=document.getElementById('pilot-audio');
const preference=matchMedia('(prefers-reduced-motion: reduce)');
const mobile=matchMedia('(pointer: coarse)').matches,frameMs=1000/(mobile?18:24);
const env=window.ST_ENVELOPE||null;
let frame=0,last=0,motion=20,paused=preference.matches,playing=false,dim=false,voice=0,music=.5;

const VERT='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FRAG=`precision highp float;
uniform vec2 res;uniform float t,arc,voice,music,warp0,warp1,holeAmt,alignAmt,dimAmt,backAmt;
uniform vec3 tint0,tint1,tint2,backTint;
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
 col+=tint0*.28*max(fbm(uv*1.1+vec2(t*.008,0.)),0.)*.55;
 float warp=mix(warp0,warp1,apart),tt=t*(1.-.45*apart);
 float light=1.-dimAmt*smoothstep(.1,.95,arc);
 for(int k=0;k<3;k++){
  float d=float(k)/2.;
  vec3 tint=k==0?tint0:(k==1?tint1:tint2);
  vec2 p=uv*(1.-holeAmt*apart*.3*(1.-d*.3)*exp(-rad*1.4));
  float ang=.06*sin(tt*.02+d*2.);p=mat2(cos(ang),-sin(ang),sin(ang),cos(ang))*p;
  // Align: threads stretch along one gentle diagonal as the session finds its direction.
  p=mat2(.94,-.34,.34,.94)*p;p.x*=1.-.62*alignAmt*apart;p=mat2(.94,.34,-.34,.94)*p;
  p=p*mix(1.5,2.7,d)+vec2(d*6.2,d*3.4)+vec2(tt*.01*alignAmt,0.);
  vec2 w=web(p,warp,d*5.3+1.,tt);
  float hole=mix(1.,.12+.88*smoothstep(.04+.16*apart,.16+.3*apart,rad),apart*holeAmt);
  float glow=(.2+.24*d)*(.75+.7*voice*(1.-.3*d))*(.85+.3*music)*light;
  col+=tint*(w.x+1.2*w.y)*hole*glow;
 }
 col+=mix(vec3(1.,.8,.74),tint2,.35)*(exp(-rad*rad*30.)*(.02+.09*apart*holeAmt)+voice*.06*exp(-rad*rad*9.))*light;
 col+=backTint*back*backAmt*exp(-pow(uv.y+.6,2.)*4.);
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
   u=Object.fromEntries(['res','t','arc','voice','music','warp0','warp1','holeAmt','alignAmt','dimAmt','backAmt','tint0','tint1','tint2','backTint'].map(n=>[n,gl.getUniformLocation(prog,n)]));
   gl.uniform1f(u.warp0,cfg.warp[0]);gl.uniform1f(u.warp1,cfg.warp[1]);
   gl.uniform1f(u.holeAmt,cfg.hole);gl.uniform1f(u.alignAmt,cfg.align);gl.uniform1f(u.dimAmt,cfg.dim);gl.uniform1f(u.backAmt,cfg.back);
   gl.uniform3fv(u.tint0,cfg.tints[0]);gl.uniform3fv(u.tint1,cfg.tints[1]);gl.uniform3fv(u.tint2,cfg.tints[2]);gl.uniform3fv(u.backTint,cfg.backTint);
  }
 }
}catch{gl=null;}
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
 gl.uniform1f(u.t,motion);gl.uniform1f(u.arc,Math.min(1,(audio.currentTime||0)/cfg.duration));
 gl.uniform1f(u.voice,paused?0:voice);gl.uniform1f(u.music,paused?.5:music);
 gl.drawArrays(gl.TRIANGLES,0,3);
 canvas.dataset.frameTime=motion.toFixed(2);
}
function shouldRun(){return !!gl&&playing&&!paused&&!dim&&!document.hidden;}
function tick(now){frame=0;if(!shouldRun())return;if(last&&now-last<frameMs){frame=requestAnimationFrame(tick);return;}if(last)motion+=Math.min((now-last)/1000,.12);last=now;levels();render();frame=requestAnimationFrame(tick);}
function run(){cancelAnimationFrame(frame);frame=0;last=0;if(shouldRun())frame=requestAnimationFrame(tick);else render();}
function resize(){
 const w=innerWidth,h=innerHeight;if(!w||!h)return;
 const width=Math.max(1,Math.round(Math.min(w*Math.min(devicePixelRatio||1,1.5)*.6,mobile?540:1100)));
 canvas.width=width;canvas.height=Math.max(1,Math.round(width*h/w));render();
}
window.setFlowPaused=value=>{paused=value;run();};
window.setFlowPlaying=value=>{playing=value;run();};
window.setFlowDim=value=>{dim=value;run();};
audio.addEventListener('seeked',()=>{if(!shouldRun()){levels();render();}});
document.addEventListener('visibilitychange',run);window.addEventListener('resize',resize);preference.addEventListener('change',e=>{paused=e.matches;run();});resize();run();
})();
