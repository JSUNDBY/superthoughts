/* Superthoughts — Morning horizon. Slow, layered light rather than a central aperture. */
(()=>{
'use strict';
const canvas=document.getElementById('flow'),ctx=canvas.getContext('2d',{alpha:false});
const preference=matchMedia('(prefers-reduced-motion: reduce)');
const mobile=matchMedia('(pointer: coarse)').matches,frameMs=1000/(mobile?15:24);
let w=0,h=0,frame=0,last=0,elapsed=14,paused=preference.matches,playing=false,dim=false;
const TAU=Math.PI*2;
function glow(x,y,rx,ry,color,opacity){
 ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);
 const g=ctx.createRadialGradient(0,0,0,0,0,1);
 g.addColorStop(0,`rgba(${color},${opacity})`);g.addColorStop(.46,`rgba(${color},${opacity*.28})`);g.addColorStop(1,`rgba(${color},0)`);
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,1,0,TAU);ctx.fill();ctx.restore();
}
function edge(u,i,t){
 const base=.255+i*.068;
 const slope=(u-.5)*(.028+i*.021);
 const wave=(.019+i*.003)*Math.sin(u*TAU*1.23+t*.29+i*.73);
 const fold=.010*Math.sin(u*TAU*2.35-t*.18+i*.48);
 return h*(base+slope+wave+fold);
}
function ribbon(i,t){
 const steps=56,thickness=h*(.095+i*.008),depth=i/9;
 const top=u=>edge(u,i,t),bottom=u=>top(u)+thickness*(.83+.17*Math.sin(u*TAU*1.3+t*.23+i));
 ctx.beginPath();for(let s=0;s<=steps;s++){const u=s/steps;const x=w*u;const y=top(u);s?ctx.lineTo(x,y):ctx.moveTo(x,y)}
 for(let s=steps;s>=0;s--){const u=s/steps;ctx.lineTo(w*u,bottom(u))}ctx.closePath();
 const fill=ctx.createLinearGradient(w*.05,h*.31,w*.91,h*.9);
 const a=.25+depth*.12;
 fill.addColorStop(0,`rgba(41,64,117,${a})`);
 fill.addColorStop(.30,`rgba(84,92,153,${a*.83})`);
 fill.addColorStop(.53,`rgba(153,111,151,${a*.7})`);
 fill.addColorStop(.70,`rgba(202,143,140,${a*.76})`);
 fill.addColorStop(1,`rgba(50,65,120,${a})`);
 ctx.fillStyle=fill;ctx.fill();
 // A translucent folded edge gives each sheet a separate plane of depth.
 ctx.beginPath();for(let s=0;s<=steps;s++){const u=s/steps;s?ctx.lineTo(w*u,top(u)):ctx.moveTo(w*u,top(u))}
 const rim=ctx.createLinearGradient(0,0,w,0);
 rim.addColorStop(0,'rgba(118,149,202,.04)');rim.addColorStop(.24,'rgba(151,174,214,.19)');
 rim.addColorStop(.49,'rgba(232,203,212,.27)');rim.addColorStop(.68,'rgba(245,180,164,.38)');rim.addColorStop(1,'rgba(171,143,201,.09)');
 ctx.strokeStyle=rim;ctx.lineWidth=1.15+depth*1.4;ctx.shadowColor='rgba(234,168,180,.25)';ctx.shadowBlur=14;ctx.stroke();ctx.shadowBlur=0;
 // Soft reflected strand tracks below the edge, at a different rhythm.
 ctx.beginPath();for(let s=0;s<=steps;s++){const u=s/steps;const y=top(u)+thickness*(.34+.08*Math.sin(u*TAU*1.7-t*.2+i));s?ctx.lineTo(w*u,y):ctx.moveTo(w*u,y)}
 ctx.strokeStyle='rgba(226,195,211,.045)';ctx.lineWidth=Math.max(3,h*.011);ctx.stroke();
}
function render(){
 const t=elapsed*.42;
 const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#070c1d');bg.addColorStop(.48,'#141734');bg.addColorStop(1,'#080e22');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 glow(w*.17,h*.32,w*.55,h*.52,'47,71,132',.20);
 glow(w*.78,h*.54,w*.62,h*.40,'128,66,112',.20);
 glow(w*.57,h*.47,w*.48,h*.17,'210,150,146',.11);
 // The distant line lies behind the foreground sheets and slowly shifts sideways.
 const horizonY=h*(.37+.012*Math.sin(t*.22));
 const horizon=ctx.createLinearGradient(0,horizonY-h*.08,0,horizonY+h*.21);
 horizon.addColorStop(0,'rgba(199,181,211,0)');horizon.addColorStop(.41,'rgba(201,173,194,.05)');
 horizon.addColorStop(.58,'rgba(240,185,168,.10)');horizon.addColorStop(1,'rgba(72,80,133,0)');
 ctx.fillStyle=horizon;ctx.fillRect(0,horizonY-h*.08,w,h*.29);
 ctx.globalCompositeOperation='screen';
 for(let i=0;i<10;i++)ribbon(i,t);
 glow(w*(.68+.025*Math.sin(t*.19)),h*.57,w*.32,h*.15,'232,177,165',.08);
 glow(w*.38,h*.69,w*.38,h*.18,'145,164,210',.065);
 ctx.globalCompositeOperation='source-over';
 const vignette=ctx.createRadialGradient(w*.56,h*.52,Math.min(w,h)*.18,w*.5,h*.5,Math.max(w,h)*.81);
 vignette.addColorStop(0,'rgba(3,7,22,0)');vignette.addColorStop(1,'rgba(3,7,22,.58)');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
 canvas.dataset.frameTime=elapsed.toFixed(2);
}
function shouldRun(){return playing&&!paused&&!dim&&!document.hidden;}
function tick(now){frame=0;if(!shouldRun())return;if(last&&now-last<frameMs){frame=requestAnimationFrame(tick);return}if(last)elapsed+=Math.min((now-last)/1000,.12);last=now;render();frame=requestAnimationFrame(tick)}
function run(){cancelAnimationFrame(frame);frame=0;last=0;if(shouldRun())frame=requestAnimationFrame(tick)}
function resize(){w=innerWidth;h=innerHeight;if(!w||!h)return;const d=Math.min(devicePixelRatio||1,mobile?1:1.5,(mobile?720:1400)/w,(mobile?840:1000)/h);canvas.width=Math.max(1,Math.round(w*d));canvas.height=Math.max(1,Math.round(h*d));ctx.setTransform(d,0,0,d,0,0);render()}
window.setFlowPaused=value=>{paused=value;run()};
window.setFlowPlaying=value=>{playing=value;run()};
window.setFlowDim=value=>{dim=value;run()};
document.addEventListener('visibilitychange',run);window.addEventListener('resize',resize);preference.addEventListener('change',e=>{paused=e.matches;run()});resize();run();
})();
