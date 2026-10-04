import { createPracticeStore, createPlaybackTracker } from './pilot-progress.mjs';

const $ = id => document.getElementById(id);
const room = $('room'), audio = $('pilot-audio'), video = $('art-video');
const play = $('play'), state = $('play-state'), seek = $('seek');
const elapsed = $('elapsed'), words = $('words'), status = $('status');
const id = 'still-enough-to-listen', duration = 540;
const motionDisabled = matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData === true;
let motionPaused = motionDisabled, captionsOn = false, cues = [], idleTimer, activeCue = -1;

const fmt = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const say = message => { status.textContent = message; };
let store = null;
try { store = createPracticeStore(localStorage); } catch { store = createPracticeStore(null); }
const playback = createPlaybackTracker(audio, store, { onComplete: () => say('You made space for nine minutes. Welcome back.') });
const resume = playback.select(id, duration);
audio.addEventListener('loadedmetadata', () => {
  seek.disabled = false;
  if (resume > 10 && resume < duration - 30) {
    audio.currentTime = resume;
    state.textContent = `Continue at ${fmt(resume)}`;
  }
});

function wake() {
  room.classList.remove('is-idle');
  clearTimeout(idleTimer);
  if (!audio.paused) idleTimer = setTimeout(() => {
    if (!room.contains(document.activeElement) || document.activeElement === document.body) room.classList.add('is-idle');
  }, 8000);
}
for (const event of ['pointerdown', 'mousemove', 'touchstart', 'keydown']) room.addEventListener(event, wake, { passive: event !== 'keydown' });

async function syncVisual() {
  if (audio.paused || document.hidden || motionPaused) {
    video.pause();
    if (motionPaused) room.classList.remove('has-video');
    return;
  }
  video.playbackRate = 1.6;
  try { await video.play(); room.classList.add('has-video'); } catch { room.classList.remove('has-video'); }
}
function syncPlay() {
  const playing = !audio.paused && !audio.ended;
  room.classList.toggle('is-playing', playing);
  play.classList.toggle('is-playing', playing);
  play.setAttribute('aria-label', playing ? 'Pause Still enough to listen' : 'Play Still enough to listen');
  state.textContent = playing ? 'Listening now' : audio.ended ? 'Welcome back' : 'Ready when you are';
  if (playing) wake(); else { room.classList.remove('is-idle'); clearTimeout(idleTimer); }
  syncVisual();
}
play.addEventListener('click', async () => {
  if (audio.paused) {
    try { await audio.play(); } catch { say('Playback could not start. Please tap play again.'); }
  } else audio.pause();
});
for (const event of ['play', 'pause', 'ended']) audio.addEventListener(event, syncPlay);
document.addEventListener('visibilitychange', syncVisual);
audio.addEventListener('timeupdate', () => {
  const t = audio.currentTime;
  elapsed.textContent = fmt(t);
  seek.value = String(Math.min(duration, t));
  seek.setAttribute('aria-valuetext', `${Math.floor(t / 60)} minutes ${Math.floor(t % 60)} seconds`);
  if (!captionsOn) return;
  const index = cues.findIndex(cue => t >= cue.start && t <= cue.end + 3);
  if (index !== activeCue) {
    activeCue = index;
    words.classList.remove('is-visible');
    if (index >= 0) {
      words.textContent = cues[index].text;
      requestAnimationFrame(() => requestAnimationFrame(() => words.classList.add('is-visible')));
    }
  }
});
seek.addEventListener('input', () => { audio.currentTime = Math.min(duration, Number(seek.value)); wake(); });

fetch('audio/still-enough-to-listen-v5-cues.json').then(response => response.ok ? response.json() : []).then(data => {
  cues = Array.isArray(data) ? data : [];
  const container = $('transcript-lines');
  for (const cue of cues) {
    const p = document.createElement('p');
    p.textContent = cue.text;
    container.append(p);
  }
}).catch(() => say('The transcript is unavailable right now. The audio will still play.'));

$('captions').addEventListener('click', event => {
  captionsOn = !captionsOn;
  event.currentTarget.setAttribute('aria-pressed', String(captionsOn));
  event.currentTarget.textContent = captionsOn ? 'Words on' : 'Words off';
  if (!captionsOn) { words.classList.remove('is-visible'); activeCue = -1; }
  else { activeCue = -1; audio.dispatchEvent(new Event('timeupdate')); }
  wake();
});
const motionButton = $('motion');
motionButton.setAttribute('aria-pressed', String(motionPaused));
motionButton.textContent = motionPaused ? 'Resume motion' : 'Pause motion';
motionButton.addEventListener('click', () => {
  motionPaused = !motionPaused;
  motionButton.setAttribute('aria-pressed', String(motionPaused));
  motionButton.textContent = motionPaused ? 'Resume motion' : 'Pause motion';
  syncVisual(); wake();
});
$('dim').addEventListener('click', event => {
  const dim = room.classList.toggle('is-dim');
  event.currentTarget.setAttribute('aria-pressed', String(dim));
  event.currentTarget.textContent = dim ? 'Restore visuals' : 'Dim visuals';
  wake();
});
$('fullscreen').addEventListener('click', async event => {
  if (document.fullscreenElement) await document.exitFullscreen();
  else if (room.requestFullscreen) await room.requestFullscreen().catch(() => say('Full screen is unavailable in this browser.'));
  else say('For a full-screen view, add Superthoughts to your home screen.');
  event.currentTarget.textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen';
  wake();
});
document.addEventListener('fullscreenchange', () => { $('fullscreen').textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen'; });
$('share').addEventListener('click', async () => {
  const url = new URL('still-enough.html', location.href).href;
  try {
    if (navigator.share) await navigator.share({ title: 'Still enough to listen · Superthoughts', url });
    else { await navigator.clipboard.writeText(url); say('Session link copied.'); }
  } catch (error) { if (error?.name !== 'AbortError') say('The link could not be shared here.'); }
  wake();
});
if ('mediaSession' in navigator) {
  navigator.mediaSession.metadata = new MediaMetadata({
    title: 'Still enough to listen', artist: 'Superthoughts', album: 'Superthoughts',
    artwork: [{ src: new URL('images/art/still-enough-to-listen.jpg', location.href).href, sizes: '768x768', type: 'image/jpeg' }]
  });
  navigator.mediaSession.setActionHandler('play', () => audio.play());
  navigator.mediaSession.setActionHandler('pause', () => audio.pause());
  navigator.mediaSession.setActionHandler('seekto', details => { if (Number.isFinite(details.seekTime)) audio.currentTime = details.seekTime; });
}
window.addEventListener('pagehide', () => { playback.flush(); video.pause(); });
if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('pilot-sw.js').catch(() => {});
