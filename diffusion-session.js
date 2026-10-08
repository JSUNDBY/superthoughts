import {createPracticeStore,createPlaybackTracker} from './pilot-progress.mjs';
import {createArtwork} from './diffusion-artwork.js';
import {sessions,clock} from './diffusion-catalog.js';
const id=document.querySelector('#room').dataset.design;
const session=sessions[id]||sessions.still;
const $=s=>document.querySelector(s);
const room=$('#room'),audio=$('#pilot-audio'),play=$('#play'),seek=$('#seek'),art=$('#session-art');
art.dataset.color=session.color;
const artwork=createArtwork(art,{variant:'diffusion',layout:session.layout,phase:session.phase,color:session.color});
$('#title').textContent=session.title;$('#description').textContent=session.description;$('#player-title').textContent=session.title;
document.title=`${session.title} · Superthoughts`;
const item=(window.STCatalog||[]).find(s=>s.id===session.id);
if(!item)throw Error('Missing session metadata');
audio.src=item.src;seek.max=session.duration;$('#duration').textContent=clock(session.duration);
play.setAttribute('aria-label',`Play ${session.title}`);
let store;try{store=createPracticeStore(localStorage)}catch{store=createPracticeStore(null)}
const playback=createPlaybackTracker(audio,store,{onComplete:()=>setStatus('Welcome back')});
const resume=playback.select(session.id,session.duration);
if(resume>10&&resume<session.duration-30){audio.preload='metadata';$('#resume-note').textContent=`Your place at ${clock(resume)} is saved on this device.`}
let cues=[],words=false,hideTimer,captionTimer,captionKey='',keyboard=false;
const setStatus=text=>$('#status').textContent=text;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function reveal(){room.classList.remove('immersed');$('#wake').tabIndex=-1;$('#wake').setAttribute('aria-hidden','true');clearTimeout(hideTimer);if(!audio.paused&&!audio.ended)hideTimer=setTimeout(()=>{if(!(keyboard&&room.contains(document.activeElement))){room.classList.add('immersed');$('#wake').tabIndex=0;$('#wake').setAttribute('aria-hidden','false')}},6500)}
room.addEventListener('pointerdown',()=>{keyboard=false;reveal()});room.addEventListener('pointermove',reveal);
room.addEventListener('focusin',()=>{if(keyboard)reveal()});
addEventListener('keydown',event=>{keyboard=true;reveal();if(event.key==='Escape'&&room.classList.contains('expanded')){room.classList.remove('expanded');document.body.classList.remove('has-expanded');syncFull()}});
$('#wake').addEventListener('click',reveal);
function updateCaption(){
 const cue=words?cues.find(c=>audio.currentTime>=c.start&&audio.currentTime<c.end+2.5):null;
 const key=cue?String(cue.start):'';if(key===captionKey)return;captionKey=key;
 const caption=$('#caption');clearTimeout(captionTimer);caption.classList.remove('visible');caption.setAttribute('aria-hidden','true');
 if(cue)captionTimer=setTimeout(()=>{if(words&&captionKey===key){caption.querySelector('span').textContent=cue.text;caption.classList.add('visible');caption.setAttribute('aria-hidden','false')}},450);
}
function update(){seek.setAttribute('aria-valuetext',clock(audio.currentTime));seek.value=audio.currentTime;$('#elapsed').textContent=clock(audio.currentTime);updateCaption()}
play.addEventListener('click',async()=>{if(!audio.paused){audio.pause();return}try{if(audio.ended){playback.select(session.id,session.duration,{restart:true});audio.currentTime=0;$('#resume-note').textContent='';}setStatus('Loading the session…');await audio.play()}catch{setStatus('Could not start. Please try Play again.');reveal()}});
audio.addEventListener('loadedmetadata',()=>{seek.disabled=false;seek.max=audio.duration;if(resume>10&&resume<audio.duration-30)audio.currentTime=resume;$('#duration').textContent=clock(audio.duration)});
audio.addEventListener('play',()=>{$('#play-symbol').setAttribute('d','M7 5h3v14H7zM14 5h3v14h-3z');play.setAttribute('aria-label',`Pause ${session.title}`);setStatus('Listening now');reveal()});
audio.addEventListener('pause',()=>{$('#play-symbol').setAttribute('d','M8 5.5 18 12 8 18.5Z');play.setAttribute('aria-label',`Play ${session.title}`);setStatus(audio.ended?'Welcome back':'Paused');reveal()});
audio.addEventListener('ended',()=>{setStatus('Welcome back');reveal()});audio.addEventListener('timeupdate',update);
audio.addEventListener('waiting',()=>{if(!audio.paused)setStatus('Loading the session…')});audio.addEventListener('playing',()=>setStatus('Listening now'));
audio.addEventListener('error',()=>{setStatus('The audio could not load. Please refresh and try again.');reveal()});
seek.addEventListener('input',()=>{audio.currentTime=Number(seek.value);update();reveal()});
$('#captions').addEventListener('click',()=>{words=!words;$('#captions').textContent=words?'Words on':'Words off';$('#captions').setAttribute('aria-pressed',String(words));captionKey='reset';updateCaption()});
function syncMotion(){const paused=artwork.getState().paused;$('#motion').textContent=paused?'Resume motion':'Pause motion';$('#motion').setAttribute('aria-pressed',String(paused))}
syncMotion();reduced.addEventListener('change',()=>queueMicrotask(syncMotion));
$('#motion').addEventListener('click',()=>{artwork.setPaused(!artwork.getState().paused);syncMotion()});
$('#dim').addEventListener('click',()=>{const dim=!artwork.getState().dim;artwork.setDim(dim);$('#dim').textContent=dim?'Restore light':'Dim light';$('#dim').setAttribute('aria-pressed',String(dim))});
function syncFull(){const full=document.fullscreenElement===room||room.classList.contains('expanded');$('#fullscreen').textContent=full?'Exit full screen':'Full screen';$('#fullscreen').setAttribute('aria-pressed',String(full));reveal()}
$('#fullscreen').addEventListener('click',async()=>{if(document.fullscreenElement){await document.exitFullscreen()}else if(room.classList.contains('expanded')){room.classList.remove('expanded');document.body.classList.remove('has-expanded')}else{try{if(!room.requestFullscreen)throw Error('fallback');await room.requestFullscreen()}catch{room.classList.add('expanded');document.body.classList.add('has-expanded')}}syncFull()});document.addEventListener('fullscreenchange',syncFull);
fetch(item.cues).then(r=>{if(!r.ok)throw Error('cues unavailable');return r.json()}).then(data=>{cues=data;const lines=$('#transcript-lines');lines.replaceChildren(...cues.map(c=>{const p=document.createElement('p');p.textContent=c.text;return p}));updateCaption()}).catch(()=>{$('#transcript-lines').textContent='The words could not load. The recording is still available.'});
if('mediaSession' in navigator){navigator.mediaSession.metadata=new MediaMetadata({title:session.title,artist:'Superthoughts',artwork:[{src:new URL(`images/art/${session.id}.jpg`,location.href).href,sizes:'768x768',type:'image/jpeg'}]});navigator.mediaSession.setActionHandler('play',()=>{if(audio.paused)play.click()});navigator.mediaSession.setActionHandler('pause',()=>audio.pause());navigator.mediaSession.setActionHandler('seekto',event=>{if(Number.isFinite(event.seekTime)){audio.currentTime=event.seekTime;update()}})}
let suspendedMotion=null;
addEventListener('pagehide',()=>{playback.flush();clearTimeout(hideTimer);clearTimeout(captionTimer);suspendedMotion=artwork.getState().paused;artwork.setPaused(true)});
addEventListener('pageshow',event=>{if(event.persisted&&suspendedMotion!==null){artwork.setPaused(suspendedMotion||reduced.matches);syncMotion();reveal()}});

$('#restart').addEventListener('click',async()=>{const wasPlaying=!audio.paused;audio.pause();playback.select(session.id,session.duration,{restart:true});audio.currentTime=0;$('#resume-note').textContent='';update();reveal();if(wasPlaying){try{await audio.play()}catch{setStatus('Please tap Play to begin again.')}}});
$('#share').addEventListener('click',async()=>{const url=new URL(session.page,location.href).href;try{if(navigator.share)await navigator.share({title:session.title,url});else{await navigator.clipboard.writeText(url);setStatus('Session link copied')}}catch(e){if(e.name!=='AbortError')setStatus('The link could not be shared here')}reveal()});
if(navigator.connection?.saveData)artwork.setPaused(true);
syncMotion();
