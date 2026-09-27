/* Superthoughts — Threshold. Slow light, translucent depth, continuous curves. */
(()=>{
'use strict';
const canvas=document.getElementById('flow'),ctx=canvas.getContext('2d',{alpha:false});
const preference=matchMedia('(prefers-reduced-motion: reduce)');
const mobile=matchMedia('(pointer: coarse)').matches,frameMs=1000/(mobile?15:24);
let w=0,h=0,frame=0,last=0,elapsed=25,paused=preference.matches,playing=false,dim=false;
const TAU=Math.PI*2;
function glow(x,y,r,color,alpha){
 const g=ctx.createRadialGradient(x,y,0,x,y,r);
 g.addColorStop(0,`rgba(${color},${alpha})`);g.addColorStop(.42,`rgba(${color},${alpha*.38})`);g.addColorStop(1,`rgba(${color},0)`);
 ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
}
function contour(depth,t){
 const scale=Math.min(w*.42,h*.55)*(1+.018*Math.sin(t*.68)),cx=w*.54+Math.sin(t*.25)*w*.045,cy=h*.44+Math.cos(t*.21)*h*.035;
 const points=[];
 for(let i=0;i<=180;i++){
  const a=i/180*TAU;
  const wave=.060*Math.sin(a*3+t*.46+depth*.7)+.035*Math.sin(a*2-t*.32);
  const r=1+depth*.42+wave;
  points.push([cx+Math.cos(a)*scale*r*(.84+.05*Math.sin(t*.12))+Math.sin(a*2+t*.2)*scale*.055,cy+Math.sin(a)*scale*r*1.04]);
 }
 ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();
}
function render(){
 const t=elapsed*.24;
 const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#070f20');bg.addColorStop(.48,'#17182e');bg.addColorStop(1,'#100d21');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 // Broad atmospheric color remains behind the translucent aperture.
 glow(w*.25,h*.35,Math.max(w,h)*.63,'46,92,145',.30);
 glow(w*.79,h*.52,Math.max(w,h)*.54,'126,48,101',.28);
 glow(w*.55,h*.43,Math.min(w,h)*.57,'189,113,101',.24);
 // Many overlapping soft bands create continuous light without mesh facets.
 ctx.globalCompositeOperation='screen';
 for(let i=58;i>=0;i--){
  const d=i/58;
  contour(d,t);
  const g=ctx.createLinearGradient(w*(.18+.12*Math.sin(t*.23)),h*(.1+.1*Math.cos(t*.27)),w*(.86-.1*Math.sin(t*.23)),h*.88);
  const strength=(.018+.042*Math.pow(1-d,2));
  g.addColorStop(0,`rgba(63,111,189,${strength})`);
  g.addColorStop(.30,`rgba(136,114,195,${strength})`);
  g.addColorStop(.54,`rgba(225,154,129,${strength*1.5})`);
  g.addColorStop(.75,`rgba(166,77,139,${strength})`);
  g.addColorStop(1,`rgba(69,78,164,${strength})`);
  ctx.strokeStyle=g;ctx.lineWidth=Math.min(w,h)*(.024+.038*d);ctx.stroke();
 }
 // Pearlescent light drifts across the surface, with broad, feathered color.
 for(let i=0;i<18;i++){
  const d=i/17;contour(-.04+d*.30,t);
  const angle=t*.19;
  const g=ctx.createLinearGradient(w*(.5+.48*Math.cos(angle)),h*(.5+.48*Math.sin(angle)),w*(.5-.48*Math.cos(angle)),h*(.5-.48*Math.sin(angle)));
  const a=.015*Math.sin(d*Math.PI);
  g.addColorStop(0,'rgba(149,210,223,0)');
  g.addColorStop(.24,`rgba(149,210,223,${a})`);
  g.addColorStop(.46,`rgba(236,214,232,${a*1.25})`);
  g.addColorStop(.67,`rgba(231,173,178,${a})`);
  g.addColorStop(1,'rgba(187,168,227,0)');
  ctx.strokeStyle=g;ctx.lineWidth=Math.min(w,h)*.038;ctx.stroke();
 }
 // A soft inner lip and a displaced echo give the opening depth.
 for(let i=0;i<24;i++){
  const d=i/24;contour(-.10+d*.12,t);
  const g=ctx.createLinearGradient(w*.25,h*.15,w*.8,h*.8);
  g.addColorStop(0,'rgba(111,160,218,0)');g.addColorStop(.36,`rgba(181,169,218,${.013*(1-d)})`);g.addColorStop(.62,`rgba(255,202,165,${.035*(1-d)})`);g.addColorStop(1,'rgba(202,98,163,0)');
  ctx.strokeStyle=g;ctx.lineWidth=Math.min(w,h)*.023;ctx.stroke();
 }
 glow(w*(.51+.035*Math.sin(t*.31)),h*.72,Math.min(w,h)*.34,'224,156,135',.24);
 ctx.globalCompositeOperation='source-over';
 // A quiet center: the composition has somewhere for the eye to rest.
 const center=ctx.createRadialGradient(w*.54,h*.43,0,w*.54,h*.43,Math.min(w,h)*.34);
 center.addColorStop(0,'#080f2248');center.addColorStop(1,'#080f2200');ctx.fillStyle=center;ctx.fillRect(0,0,w,h);
 const v=ctx.createRadialGradient(w*.54,h*.44,Math.min(w,h)*.2,w*.54,h*.44,Math.max(w,h)*.8);
 v.addColorStop(0,'#03071300');v.addColorStop(1,'#030713b5');ctx.fillStyle=v;ctx.fillRect(0,0,w,h);
 canvas.dataset.frameTime=elapsed.toFixed(2);
}
function shouldRun(){return playing&&!paused&&!dim&&!document.hidden;}
function tick(now){frame=0;if(!shouldRun())return;if(last&&now-last<frameMs){frame=requestAnimationFrame(tick);return;}if(last)elapsed+=Math.min((now-last)/1000,.12);last=now;render();frame=requestAnimationFrame(tick);}
function run(){cancelAnimationFrame(frame);frame=0;last=0;if(shouldRun())frame=requestAnimationFrame(tick);}
function resize(){w=innerWidth;h=innerHeight;if(!w||!h)return;const d=Math.min(devicePixelRatio||1,mobile?1:1.5,(mobile?720:1400)/w,(mobile?840:1000)/h);canvas.width=Math.max(1,Math.round(w*d));canvas.height=Math.max(1,Math.round(h*d));ctx.setTransform(d,0,0,d,0,0);render();}
window.setFlowPaused=value=>{paused=value;run();};
window.setFlowPlaying=value=>{playing=value;run();};
window.setFlowDim=value=>{dim=value;run();};
document.addEventListener('visibilitychange',run);window.addEventListener('resize',resize);preference.addEventListener('change',e=>{paused=e.matches;run();});resize();run();
})();
