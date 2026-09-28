/* Superthoughts — Awake again. Night through a window: a few soft, out-of-focus points of
   light drifting very slowly in near-dark, and a faint low glow that fades as the session
   goes on. It never brightens and does not react to sound. Light 2D drawing, so a phone
   stays cool in the night. Same hooks as the other session fields. */
(()=>{
'use strict';
const canvas=document.getElementById('flow'),ctx=canvas.getContext('2d',{alpha:false});
const audio=document.getElementById('pilot-audio');
const preference=matchMedia('(prefers-reduced-motion: reduce)');
const mobile=matchMedia('(pointer: coarse)').matches,frameMs=1000/(mobile?15:24),DUR=600;
let w=0,h=0,frame=0,last=0,t=0,paused=preference.matches,playing=false,dim=false;

// Fixed, seeded field of lights: three depths, the far ones smaller, dimmer and slower.
let seed=7;const rand=()=>(seed=(seed*16807)%2147483647)/2147483647;
const lights=Array.from({length:mobile?26:38},()=>{
 const depth=rand();
 return {x:rand(),y:rand()*.82,depth,size:4+depth*22,drift:.0009+.0022*depth,phase:rand()*6.28,
  hue:rand()<.8?[176,190,232]:[222,168,178],base:.10+.28*depth};
});

function render(){
 if(!w||!h)return;
 const arc=Math.min(1,(audio.currentTime||0)/DUR);
 const fade=1-.55*Math.min(1,arc/.9);  // only ever darker across the session
 const bg=ctx.createLinearGradient(0,0,0,h);
 bg.addColorStop(0,'#03040b');bg.addColorStop(.6,'#060816');bg.addColorStop(1,'#0b0a1c');
 ctx.globalCompositeOperation='source-over';ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 // A faint low warmth, as if from far-off streetlight, fading with the session.
 const low=ctx.createRadialGradient(w*.62,h*1.08,0,w*.62,h*1.08,Math.max(w,h)*.75);
 low.addColorStop(0,`rgba(120,62,86,${.22*fade})`);low.addColorStop(1,'rgba(120,62,86,0)');
 ctx.fillStyle=low;ctx.fillRect(0,0,w,h);
 ctx.globalCompositeOperation='lighter';
 const unit=Math.min(w,h)/900;
 for(const l of lights){
  const x=((l.x+t*l.drift*.2)%1.08-.04)*w;
  const y=(l.y+.012*Math.sin(t*.05*l.drift*60+l.phase))*h;
  const r=l.size*unit*(mobile?1.3:1);
  const a=l.base*fade*(.8+.2*Math.sin(t*.07+l.phase));
  const g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,`rgba(${l.hue},${a})`);g.addColorStop(.35,`rgba(${l.hue},${a*.35})`);g.addColorStop(1,`rgba(${l.hue},0)`);
  ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
 }
 ctx.globalCompositeOperation='source-over';
 const v=ctx.createRadialGradient(w*.5,h*.45,Math.min(w,h)*.2,w*.5,h*.45,Math.max(w,h)*.8);
 v.addColorStop(0,'rgba(2,3,8,0)');v.addColorStop(1,'rgba(2,3,8,.7)');ctx.fillStyle=v;ctx.fillRect(0,0,w,h);
 canvas.dataset.frameTime=t.toFixed(2);
}
function shouldRun(){return playing&&!paused&&!dim&&!document.hidden;}
function tick(now){frame=0;if(!shouldRun())return;if(last&&now-last<frameMs){frame=requestAnimationFrame(tick);return;}if(last)t+=Math.min((now-last)/1000,.12);last=now;render();frame=requestAnimationFrame(tick);}
function run(){cancelAnimationFrame(frame);frame=0;last=0;if(shouldRun())frame=requestAnimationFrame(tick);else render();}
function resize(){w=innerWidth;h=innerHeight;if(!w||!h)return;const d=Math.min(devicePixelRatio||1,mobile?1:1.5);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);ctx.setTransform(d,0,0,d,0,0);render();}
window.setFlowPaused=value=>{paused=value;run();};
window.setFlowPlaying=value=>{playing=value;run();};
window.setFlowDim=value=>{dim=value;run();};
audio.addEventListener('seeked',()=>{if(!shouldRun())render();});
document.addEventListener('visibilitychange',run);window.addEventListener('resize',resize);preference.addEventListener('change',e=>{paused=e.matches;run();});resize();run();
})();
