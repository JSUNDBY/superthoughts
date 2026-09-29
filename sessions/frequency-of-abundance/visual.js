/* Superthoughts — The Frequency of Abundance. Golden frequency: dozens of fine threads of
   light across the frame, like a field of resonance. Cool violet and wide at the start;
   the threads near the centre warm to gold and swell with "a golden warmth rising in your
   chest" (about 4:21); the whole field turns gold under "a warm golden light" (about 6:22)
   while slow motes of light drift upward; it settles for the return. Follows the session
   position; it does not react to sound. 2D, structured like the other session fields so
   the YouTube renderer can replay it (it sets `elapsed` and calls render()). */
(()=>{
'use strict';
const canvas=document.getElementById('flow'),ctx=canvas.getContext('2d',{alpha:false});
const audio=document.getElementById('pilot-audio');
const preference=matchMedia('(prefers-reduced-motion: reduce)');
const mobile=matchMedia('(pointer: coarse)').matches,frameMs=1000/(mobile?18:24);
const BASE=0,DUR=665;
let w=0,h=0,frame=0,last=0,elapsed=BASE,paused=preference.matches,playing=false,dim=false;

function position(){const a=audio&&audio.currentTime;return Number.isFinite(a)&&a>0?a:Math.max(0,elapsed-BASE);}
const sm=(a,b,x)=>{x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x);};
const mix=(a,b,k)=>a.map((v,i)=>Math.round(v+(b[i]-v)*k));
// Fixed, seeded motes that rise through the golden light.
let seed=11;const rand=()=>(seed=(seed*16807)%2147483647)/2147483647;
const motes=Array.from({length:mobile?40:70},()=>({x:rand(),y:rand(),v:.006+.014*rand(),s:.6+1.8*rand(),p:rand()*6.28}));

function glow(x,y,r,rgb,a){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${rgb},${a})`);g.addColorStop(.4,`rgba(${rgb},${a*.35})`);g.addColorStop(1,`rgba(${rgb},0)`);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}

function render(){
 if(!w||!h)return;
 const arc=Math.min(1,position()/DUR),t=elapsed;
 const warmth=sm(.36,.5,arc),light=sm(.55,.68,arc),settle=sm(.82,.98,arc);
 const gold=Math.min(1,.4*warmth+.75*light)*(1-.35*settle);
 const bg=ctx.createLinearGradient(0,0,0,h);
 bg.addColorStop(0,'#07061a');bg.addColorStop(.5,`rgb(${mix([14,10,34],[26,16,24],gold).join(',')})`);bg.addColorStop(1,'#050410');
 ctx.globalCompositeOperation='source-over';ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 const cx=w*.5,cy=h*(.54-.04*warmth),unit=Math.min(w,h);
 glow(cx,cy,unit*(.55+.25*light),mix([80,70,180],[230,150,70],gold).join(','),.16+.14*warmth+.12*light);

 // The field: fine threads across the frame, displaced by slow standing waves that
 // swell toward the centre, the chest of the frame.
 ctx.globalCompositeOperation='lighter';
 const rows=mobile?34:54,steps=mobile?70:120;
 const cool=[120,120,235],warm=[255,196,110];
 for(let i=0;i<rows;i++){
  const k=i/(rows-1),y0=h*(.12+.76*k),near=1-Math.abs(k-.5)*2;
  const heat=Math.min(1,gold*(.55+.45*near)+.35*warmth*Math.pow(near,3));
  const col=mix(cool,warm,heat).join(',');
  const amp=h*(.012+.05*Math.pow(near,1.6)*(.6+.4*warmth+.3*light))*(1-.3*settle);
  const f1=1.2+.8*k,f2=2.6-.9*k,ph=i*.37;
  ctx.beginPath();
  for(let j=0;j<=steps;j++){
   const u=j/steps,x=u*w;
   const env=Math.sin(Math.PI*u);  // quiet at the edges, fullest in the middle
   const y=y0+amp*env*(Math.sin(u*Math.PI*2*f1+t*.22+ph)*.7+Math.sin(u*Math.PI*2*f2-t*.15+ph*1.7)*.4)
          -h*.05*light*env*env*Math.pow(near,2)*Math.sin(t*.05+ph);
   if(j)ctx.lineTo(x,y);else ctx.moveTo(x,y);
  }
  const a=(.055+.12*near)*(.6+.4*Math.sin(t*.3+i*.9)**2)*(.85+.45*gold);
  ctx.strokeStyle=`rgba(${col},${a*.45})`;ctx.lineWidth=Math.max(2,unit*.006);ctx.stroke();  // soft halo
  ctx.strokeStyle=`rgba(${col},${a})`;ctx.lineWidth=Math.max(.8,unit*.0016);ctx.stroke();    // fine core
 }
 // Motes of light rising once the warmth arrives, most in the golden light.
 const moteAmt=.25*warmth+.75*light;
 if(moteAmt>.01){
  for(const m of motes){
   const y=((m.y-t*m.v*.08)%1+1)%1,x=(m.x+.02*Math.sin(t*.1+m.p))*w;
   const r=unit*.004*m.s,a=moteAmt*(.25+.35*Math.sin(t*.6+m.p)**2)*(1-.4*settle)*Math.sin(Math.PI*y);
   const g=ctx.createRadialGradient(x,y*h,0,x,y*h,r*4);
   g.addColorStop(0,`rgba(255,214,150,${a})`);g.addColorStop(1,'rgba(255,214,150,0)');
   ctx.fillStyle=g;ctx.fillRect(x-r*4,y*h-r*4,r*8,r*8);
  }
 }
 ctx.globalCompositeOperation='source-over';
 const v=ctx.createRadialGradient(cx,h*.5,unit*.3,cx,h*.5,Math.max(w,h)*.8);
 v.addColorStop(0,'rgba(3,2,10,0)');v.addColorStop(1,'rgba(3,2,10,.62)');ctx.fillStyle=v;ctx.fillRect(0,0,w,h);
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
