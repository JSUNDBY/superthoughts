/* Whole-body field: overlapping, translucent contour sheets with three drifting centers. */
(()=>{
'use strict';
const canvas=document.getElementById('flow'),ctx=canvas.getContext('2d',{alpha:false});
const preference=matchMedia('(prefers-reduced-motion: reduce)');
const mobile=matchMedia('(pointer: coarse)').matches,frameMs=1000/(mobile?15:24);
let w=0,h=0,frame=0,last=0,elapsed=12,paused=preference.matches,playing=false,dim=false;
const TAU=Math.PI*2,steps=64;
const fields=[
 {x:.28,y:.37,rx:.47,ry:.52,tilt:-.32,phase:.2,scale:.9,color:[95,65,145],edge:[164,132,226]},
 {x:.73,y:.48,rx:.43,ry:.47,tilt:.43,phase:2.2,scale:1,color:[188,96,105],edge:[245,177,119]},
 {x:.48,y:.73,rx:.36,ry:.39,tilt:-.48,phase:4.1,scale:.78,color:[70,82,151],edge:[145,159,230]}
];
function contour(field,r,t,reverse=false){
 const breath=1+.045*Math.sin(t*.44+field.phase);
 const driftX=.016*Math.sin(t*.17+field.phase),driftY=.016*Math.cos(t*.21+field.phase);
 const c=Math.cos(field.tilt),s=Math.sin(field.tilt);
 const points=[];
 for(let j=0;j<steps;j++){
  const a=j/steps*TAU;
  const warp=1+.11*Math.sin(3*a+field.phase+t*.11)+.065*Math.cos(5*a-field.phase-t*.08);
  const q=r*breath*warp;
  const px=Math.cos(a)*field.rx*q,py=Math.sin(a)*field.ry*q;
  const x=w*(field.x+driftX+px*c-py*s),y=h*(field.y+driftY+px*s+py*c);
  points.push([x,y]);
 }
 if(reverse)points.reverse();
 ctx.moveTo(...points[0]);
 for(let j=0;j<steps;j++){
  const p0=points[(j+steps-1)%steps],p1=points[j],p2=points[(j+1)%steps],p3=points[(j+2)%steps];
  ctx.bezierCurveTo(p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6,p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6,p2[0],p2[1]);
 }
}
function sheet(field,index,t){
 const outer=field.scale*(1-index*.145),inner=outer*.72;
 ctx.beginPath();contour(field,outer,t);contour(field,inner,t,true);ctx.closePath();
 const [r,g,b]=field.color,alpha=.12+index*.012;
 ctx.fillStyle=`rgba(${r},${g},${b},${alpha})`;ctx.fill('evenodd');
 ctx.beginPath();contour(field,outer,t);
 const [er,eg,eb]=field.edge;
 ctx.strokeStyle=`rgba(${er},${eg},${eb},${.14+index*.05})`;
 ctx.lineWidth=1.05+index*.19;ctx.shadowColor=`rgba(${er},${eg},${eb},.28)`;ctx.shadowBlur=11;
 ctx.stroke();ctx.shadowBlur=0;
}
function glow(x,y,rx,ry,rgb,opacity){
 ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);
 const grad=ctx.createRadialGradient(0,0,0,0,0,1);
 grad.addColorStop(0,`rgba(${rgb},${opacity})`);grad.addColorStop(.5,`rgba(${rgb},${opacity*.34})`);grad.addColorStop(1,`rgba(${rgb},0)`);
 ctx.fillStyle=grad;ctx.beginPath();ctx.arc(0,0,1,0,TAU);ctx.fill();ctx.restore();
}
function render(){
 const t=elapsed;
 const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#100d21');bg.addColorStop(.48,'#1a1430');bg.addColorStop(1,'#090c1d');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 glow(w*.27,h*.36,w*.52,h*.56,'93,54,125',.27);
 glow(w*.75,h*.45,w*.42,h*.47,'155,77,84',.19);
 glow(w*.51,h*.68,w*.42,h*.36,'54,68,141',.18);
 ctx.globalCompositeOperation='screen';
 for(const field of fields)for(let i=0;i<4;i++)sheet(field,i,t);
 glow(w*.61,h*.43,w*.32,h*.23,'226,137,92',.06);
 ctx.globalCompositeOperation='source-over';
 const vignette=ctx.createRadialGradient(w*.5,h*.43,Math.min(w,h)*.18,w*.5,h*.5,Math.max(w,h)*.78);
 vignette.addColorStop(0,'rgba(6,7,20,0)');vignette.addColorStop(1,'rgba(5,6,18,.58)');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
 canvas.dataset.frameTime=elapsed.toFixed(2);
}
function shouldRun(){return playing&&!paused&&!dim&&!document.hidden}
function tick(now){frame=0;if(!shouldRun())return;if(last&&now-last<frameMs){frame=requestAnimationFrame(tick);return}if(last)elapsed+=Math.min((now-last)/1000,.12);last=now;render();frame=requestAnimationFrame(tick)}
function run(){cancelAnimationFrame(frame);frame=0;last=0;if(shouldRun())frame=requestAnimationFrame(tick)}
function resize(){w=innerWidth;h=innerHeight;if(!w||!h)return;const d=Math.min(devicePixelRatio||1,mobile?1:1.5,(mobile?720:1400)/w,(mobile?840:1000)/h);canvas.width=Math.max(1,Math.round(w*d));canvas.height=Math.max(1,Math.round(h*d));ctx.setTransform(d,0,0,d,0,0);render()}
window.setFlowPaused=value=>{paused=value;run()};
window.setFlowPlaying=value=>{playing=value;run()};
window.setFlowDim=value=>{dim=value;run()};
document.addEventListener('visibilitychange',run);window.addEventListener('resize',resize);preference.addEventListener('change',event=>{paused=event.matches;run()});resize();run();
})();
