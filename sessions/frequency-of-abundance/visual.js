/* Superthoughts — The Frequency of Abundance. An aurora of abundance: emerald and teal
   curtains of light, frequency threads that shift through gold, coral and teal, a radiant
   bloom at the heart of the frame, and colored sparks. It opens cool and calm; the bloom
   warms with "a golden warmth rising in your chest" (about 4:21); under "a warm golden
   light" (about 6:22) the field becomes a full warm blaze with soft rays and rising
   sparks; it settles into warm gold and teal for the return. Follows the session
   position; it does not react to sound. 2D so the YouTube renderer can replay it
   (it sets `elapsed` and calls render()). */
(()=>{
'use strict';
const canvas=document.getElementById('flow'),ctx=canvas.getContext('2d',{alpha:false});
const audio=document.getElementById('pilot-audio');
const preference=matchMedia('(prefers-reduced-motion: reduce)');
const mobile=matchMedia('(pointer: coarse)').matches,frameMs=1000/(mobile?18:24);
const BASE=0,DUR=665,TAU=Math.PI*2;
let w=0,h=0,frame=0,last=0,elapsed=BASE,paused=preference.matches,playing=false,dim=false;

function position(){const a=audio&&audio.currentTime;return Number.isFinite(a)&&a>0?a:Math.max(0,elapsed-BASE);}
const sm=(a,b,x)=>{x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x);};
const lerp=(a,b,k)=>a.map((v,i)=>Math.round(v+(b[i]-v)*k));
const rgba=(c,a)=>`rgba(${c[0]},${c[1]},${c[2]},${Math.max(0,a).toFixed(3)})`;
// Palette: no default indigo. Emerald, teal, gold, coral, magenta, amber.
const EMERALD=[40,220,150],TEAL=[30,190,210],GOLD=[255,200,80],CORAL=[255,120,90],MAGENTA=[235,70,170],AMBER=[255,160,40],PEARL=[255,244,220];
let seed=23;const rand=()=>(seed=(seed*16807)%2147483647)/2147483647;
const sparks=Array.from({length:mobile?60:110},()=>({x:rand(),y:rand(),v:.5+rand(),s:.5+1.6*rand(),p:rand()*TAU,c:[GOLD,PEARL,CORAL,TEAL,AMBER][Math.floor(rand()*5)]}));

function blob(x,y,r,c,a){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,rgba(c,a));g.addColorStop(.45,rgba(c,a*.35));g.addColorStop(1,rgba(c,0));ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}

function render(){
 if(!w||!h)return;
 const arc=Math.min(1,position()/DUR),t=elapsed,unit=Math.min(w,h);
 const warmth=sm(.34,.5,arc),light=sm(.55,.68,arc),settle=sm(.84,.98,arc);
 const blaze=light*(1-.4*settle);
 // Ground: deep teal-black above, deep warm plum below; warmer as the session opens.
 const bg=ctx.createLinearGradient(0,0,0,h);
 bg.addColorStop(0,rgba(lerp([4,18,22],[20,12,8],warmth),1));
 bg.addColorStop(.55,rgba(lerp([6,26,30],[40,18,16],blaze),1));
 bg.addColorStop(1,rgba(lerp([18,8,24],[48,14,30],warmth),1));
 ctx.globalCompositeOperation='source-over';ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 ctx.globalCompositeOperation='lighter';

 // Aurora curtains: tall soft ribbons of color that sway and fold.
 const curtains=[[EMERALD,.18],[TEAL,.32],[GOLD,.5],[CORAL,.68],[MAGENTA,.84]];
 curtains.forEach(([c0,cx0],i)=>{
  const col=lerp(c0,i<2?lerp(c0,GOLD,.5*warmth):c0,1);
  const baseA=(.06+.05*Math.sin(t*.13+i*1.9)**2)*(i>=2?(.35+.9*warmth):1.1)*(1-.25*settle);
  const top=h*(.05+.08*Math.sin(t*.07+i)),bottom=h*(.72+.1*Math.sin(t*.05+i*2));
  const width=w*(.11+.05*Math.sin(t*.09+i*1.3));
  const steps=24;
  ctx.beginPath();
  for(let j=0;j<=steps;j++){const v=j/steps,y=top+(bottom-top)*v;const x=w*cx0+Math.sin(v*3.2+t*.18+i)*w*.06+Math.sin(v*7+t*.11+i*2)*w*.015-width/2;j?ctx.lineTo(x,y):ctx.moveTo(x,y);}
  for(let j=steps;j>=0;j--){const v=j/steps,y=top+(bottom-top)*v;const x=w*cx0+Math.sin(v*3.2+t*.18+i+.6)*w*.06+Math.sin(v*6+t*.13+i)*w*.02+width/2;ctx.lineTo(x,y);}
  ctx.closePath();
  const g=ctx.createLinearGradient(0,top,0,bottom);
  g.addColorStop(0,rgba(col,0));g.addColorStop(.35,rgba(col,baseA));g.addColorStop(.75,rgba(lerp(col,PEARL,.3),baseA*1.2));g.addColorStop(1,rgba(col,0));
  ctx.fillStyle=g;ctx.fill();
 });

 // The radiant bloom at the heart of the frame.
 const cx=w*.5,cy=h*(.56-.05*warmth),pulse=.92+.08*Math.sin(t*.5);
 blob(cx,cy,unit*(.75+.35*blaze)*pulse,lerp(TEAL,MAGENTA,warmth),.10+.12*warmth);
 blob(cx,cy,unit*(.42+.25*blaze)*pulse,lerp(EMERALD,CORAL,warmth),.12+.2*warmth+.1*blaze);
 blob(cx,cy,unit*(.2+.12*blaze)*pulse,lerp(TEAL,GOLD,Math.max(warmth,.3)),.16+.3*warmth+.2*blaze);
 blob(cx,cy,unit*.07*pulse,PEARL,.18+.35*warmth+.3*blaze);

 // Soft rays in the golden light: wide, blurred wedges turning slowly.
 if(blaze>.01){
  const rays=9;
  for(let k=0;k<rays;k++){
   const a0=t*.02+k*TAU/rays,spread=.09+.04*Math.sin(t*.1+k),len=unit*(1.1+.2*Math.sin(t*.07+k));
   const g=ctx.createRadialGradient(cx,cy,0,cx,cy,len);
   const c=[GOLD,AMBER,CORAL][k%3];
   g.addColorStop(0,rgba(c,.12*blaze));g.addColorStop(.5,rgba(c,.05*blaze));g.addColorStop(1,rgba(c,0));
   ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,len,a0-spread,a0+spread);ctx.closePath();ctx.fill();
  }
 }

 // Frequency threads: fine lines whose color shifts along their length.
 const rows=mobile?22:36,steps=mobile?60:100;
 for(let i=0;i<rows;i++){
  const k=i/(rows-1),y0=h*(.2+.66*k),near=1-Math.abs(k-.5)*2;
  const amp=h*(.015+.06*Math.pow(near,1.5)*(.6+.5*warmth+.3*blaze));
  const f1=1.1+.9*k,f2=2.4-.8*k,ph=i*.41;
  const g=ctx.createLinearGradient(0,0,w,0);
  const left=lerp(TEAL,GOLD,warmth*.6),mid=lerp(GOLD,PEARL,blaze*.4),right=lerp(EMERALD,MAGENTA,warmth);
  const a=(.07+.16*near)*(.6+.4*Math.sin(t*.35+i*.8)**2)*(1-.2*settle);
  g.addColorStop(0,rgba(left,0));g.addColorStop(.25,rgba(left,a));g.addColorStop(.5,rgba(mid,a*1.3));g.addColorStop(.75,rgba(right,a));g.addColorStop(1,rgba(right,0));
  ctx.beginPath();
  for(let j=0;j<=steps;j++){
   const u=j/steps,env=Math.sin(Math.PI*u);
   const y=y0+amp*env*(Math.sin(u*TAU*f1+t*.3+ph)*.7+Math.sin(u*TAU*f2-t*.21+ph*1.7)*.4);
   j?ctx.lineTo(u*w,y):ctx.moveTo(0,y);
  }
  ctx.strokeStyle=g;ctx.lineWidth=Math.max(2.4,unit*.007);ctx.globalAlpha=.4;ctx.stroke();
  ctx.lineWidth=Math.max(1,unit*.0018);ctx.globalAlpha=1;ctx.stroke();
 }

 // Colored sparks, rising most in the golden light.
 const amt=.35+.35*warmth+.6*blaze;
 for(const s of sparks){
  const yy=((s.y-t*s.v*.012)%1+1)%1,x=(s.x+.015*Math.sin(t*.2+s.p))*w,y=yy*h;
  const r=unit*.005*s.s,tw=.4+.6*Math.sin(t*1.1+s.p)**2;
  const a=amt*tw*Math.sin(Math.PI*yy)*.55;
  const g=ctx.createRadialGradient(x,y,0,x,y,r*5);
  g.addColorStop(0,rgba(s.c,a));g.addColorStop(.3,rgba(s.c,a*.4));g.addColorStop(1,rgba(s.c,0));
  ctx.fillStyle=g;ctx.fillRect(x-r*5,y-r*5,r*10,r*10);
 }
 ctx.globalCompositeOperation='source-over';
 const v=ctx.createRadialGradient(cx,h*.5,unit*.35,cx,h*.5,Math.max(w,h)*.85);
 v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(2,4,6,.55)');ctx.fillStyle=v;ctx.fillRect(0,0,w,h);
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
