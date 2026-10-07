import {createArtwork} from './diffusion-artwork.js';
import {diffusion} from './diffusion-nature.js';
import {sessions} from './diffusion-catalog.js';
const hero = document.querySelector('#art');
if (hero) {
 const artwork=createArtwork(hero,{variant:'diffusion'});
 let userPaused=navigator.connection?.saveData===true;const control=document.querySelector('#home-motion');
 control?.addEventListener('click',()=>{userPaused=!userPaused;artwork.setPaused(userPaused);control.textContent=userPaused?'Resume artwork':'Pause artwork';control.setAttribute('aria-pressed',String(userPaused))});
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const sync=()=>{if(control){const paused=artwork.getState().paused;control.textContent=paused?'Resume artwork':'Pause artwork';control.setAttribute('aria-pressed',String(paused))}};
 artwork.setPaused(userPaused||reduced.matches);sync();reduced.addEventListener('change',()=>queueMicrotask(sync));
 const observer=new IntersectionObserver(([entry])=>artwork.setPaused(!entry.isIntersecting || reduced.matches || userPaused));
 observer.observe(hero);
 addEventListener('pagehide',()=>artwork.setPaused(true));
 addEventListener('pageshow',event=>{if(event.persisted)artwork.setPaused(userPaused||reduced.matches)});
}
// Card artwork is rendered once and on resize; no animation loops in the library.
const cards=[...document.querySelectorAll('canvas[data-preview]')];
function draw(canvas){
 const session=sessions[canvas.dataset.preview];if(!session)return;
 const box=canvas.getBoundingClientRect();if(!box.width||!box.height)return;
 canvas.width=Math.ceil(Math.min(box.width,800));canvas.height=Math.ceil(canvas.width*box.height/box.width);
 canvas.dataset.color=session.color;
 const ctx=canvas.getContext('2d',{alpha:false});const w=canvas.width,h=canvas.height;ctx.save();
 if(session.layout==='mirror'){ctx.translate(w,0);ctx.scale(-1,1)}
 else if(session.layout==='cross'){ctx.translate(w,0);ctx.rotate(Math.PI/2)}
 else if(session.layout==='inverted'){ctx.translate(w,h);ctx.rotate(Math.PI)}
 diffusion(ctx,session.layout==='cross'?h:w,session.layout==='cross'?w:h,session.phase);ctx.restore();
 canvas.dataset.static='true';
}
const observer=new ResizeObserver(entries=>entries.forEach(({target})=>draw(target)));
cards.forEach(canvas=>{draw(canvas);observer.observe(canvas)});
addEventListener('pageshow',event=>{if(event.persisted)cards.forEach(draw)});

// Preserve older shared query and practice links without changing their destination.
const requested=new URLSearchParams(location.search).get('session');
const item=(window.STCatalog||[]).find(s=>s.id===requested);
if(item){const featured=Object.values(sessions).find(s=>s.id===item.id);const destination=new URL(featured?.page||'session.html',location.href);destination.search=location.search;if(featured)destination.searchParams.delete('session');destination.hash=location.hash;location.replace(destination.href)}
if(['#practice','#collections','#listen'].includes(location.hash))location.replace('explore.html'+location.hash);
if('serviceWorker' in navigator && isSecureContext)navigator.serviceWorker.register('pilot-sw.js').catch(()=>{});
