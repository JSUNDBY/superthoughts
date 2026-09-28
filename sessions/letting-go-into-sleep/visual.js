/* Superthoughts — Letting go into sleep. Moon over dark water: a faint pearl glow high in
   the frame and its reflection as slow, soft streaks on the water below. Everything dims
   across the guidance and stays low for the quiet sound after it. Does not react to sound.
   2D and structured like the other session fields so the YouTube renderer can replay it
   (it sets `elapsed` and calls render()). */
(()=>{
'use strict';
const canvas=document.getElementById('flow'),ctx=canvas.getContext('2d',{alpha:false});
const audio=document.getElementById('pilot-audio');
const preference=matchMedia('(prefers-reduced-motion: reduce)');
const mobile=matchMedia('(pointer: coarse)').matches,frameMs=1000/(mobile?15:24);
const BASE=0,GUIDANCE=1250;
let w=0,h=0,frame=0,last=0,elapsed=BASE,paused=preference.matches,playing=false,dim=false;

// Session position: the audio clock on the page, the render clock offline.
function position(){const a=audio&&audio.currentTime;return Number.isFinite(a)&&a>0?a:Math.max(0,elapsed-BASE);}
function glow(x,y,r,rgb,a){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${rgb},${a})`);g.addColorStop(.4,`rgba(${rgb},${a*.35})`);g.addColorStop(1,`rgba(${rgb},0)`);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}

function render(){
 if(!w||!h)return;
 const pos=position(),t=elapsed;
 const light=1-.62*Math.min(1,pos/GUIDANCE);  // dims across the guidance, then stays low
 const horizon=h*.56,mx=w*(.62+.03*Math.sin(t*.004)),my=h*.24;
 const sky=ctx.createLinearGradient(0,0,0,h);
 sky.addColorStop(0,'#04050e');sky.addColorStop(.56,'#080a1c');sky.addColorStop(.57,'#05060f');sky.addColorStop(1,'#020308');
 ctx.globalCompositeOperation='source-over';ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
 const unit=Math.min(w,h);
 glow(mx,my,unit*.55,'70,82,150',.16*light);
 glow(mx,my,unit*.16,'214,220,240',.26*light);
 glow(mx,my,unit*.045,'236,238,248',.7*light);
 glow(mx,horizon,unit*.7,'58,70,150',.12*light);  // faint light where water meets sky
 // The reflection: soft horizontal streaks that drift and shimmer, wider toward the viewer.
 ctx.globalCompositeOperation='lighter';
 const rows=mobile?26:40;
 for(let i=0;i<rows;i++){
  const k=i/rows,y=horizon+Math.pow(k,1.35)*(h-horizon)*.96+2;
  const spread=unit*(.06+.42*k);
  const sway=Math.sin(t*.35+i*1.7)*spread*.35+Math.sin(t*.13+i*.6)*spread*.2;
  const shimmer=.45+.55*Math.pow(.5+.5*Math.sin(t*.9+i*2.3),2);
  const a=(.28-.16*k)*shimmer*light;
  const len=spread*(1.1+.6*Math.sin(t*.2+i));
  const x=mx+sway,g=ctx.createLinearGradient(x-len,0,x+len,0);
  g.addColorStop(0,'rgba(200,210,240,0)');g.addColorStop(.5,`rgba(200,210,240,${a})`);g.addColorStop(1,'rgba(200,210,240,0)');
  ctx.fillStyle=g;ctx.fillRect(x-len,y-1.5-k*3.5,len*2,3+k*7);
 }
 ctx.globalCompositeOperation='source-over';
 const v=ctx.createRadialGradient(w*.5,h*.45,unit*.25,w*.5,h*.45,Math.max(w,h)*.85);
 v.addColorStop(0,'rgba(1,2,6,0)');v.addColorStop(1,'rgba(1,2,6,.6)');ctx.fillStyle=v;ctx.fillRect(0,0,w,h);
 canvas.dataset.frameTime=elapsed.toFixed(2);
}
function shouldRun(){return playing&&!paused&&!dim&&!document.hidden;}
function tick(now){frame=0;if(!shouldRun())return;if(last&&now-last<frameMs){frame=requestAnimationFrame(tick);return;}if(last)elapsed+=Math.min((now-last)/1000,.12);last=now;render();frame=requestAnimationFrame(tick);}
function run(){cancelAnimationFrame(frame);frame=0;last=0;if(shouldRun())frame=requestAnimationFrame(tick);else render();}
function resize(){w=innerWidth;h=innerHeight;if(!w||!h)return;const d=Math.min(devicePixelRatio||1,mobile?1:1.5,(mobile?720:1400)/w,(mobile?840:1000)/h);canvas.width=Math.max(1,Math.round(w*d));canvas.height=Math.max(1,Math.round(h*d));ctx.setTransform(d,0,0,d,0,0);render();}
window.setFlowPaused=value=>{paused=value;run();};
window.setFlowPlaying=value=>{playing=value;run();};
window.setFlowDim=value=>{dim=value;run();};
if(audio&&audio.addEventListener)audio.addEventListener('seeked',()=>{if(!shouldRun())render();});
document.addEventListener('visibilitychange',run);window.addEventListener('resize',resize);preference.addEventListener('change',e=>{paused=e.matches;run();});resize();run();
})();
