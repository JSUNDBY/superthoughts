import { createPracticeStore, createPlaybackTracker } from './pilot-progress.mjs';

const catalog = Array.isArray(window.STCatalog) ? window.STCatalog : [];
const byId = new Map(catalog.map(item => [item.id, item]));
const $ = id => document.getElementById(id);
const audio = $('pilot-audio');
const isSessionPage = document.body.classList.contains('page-session');
const isPracticePage = document.body.classList.contains('page-practice');
let browserStorage = null;
try { browserStorage = window.localStorage; } catch {}
const store = createPracticeStore(browserStorage, () => new Date());
const tracker = createPlaybackTracker(audio, store, { onUpdate: renderPractice, onComplete: acknowledgeCompletion });
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const heroScene = !isSessionPage && !isPracticePage && $('welcome-canvas') && typeof window.SuperthoughtsField === 'function' ? new window.SuperthoughtsField($('welcome-canvas')) : null;
const sessionUrl = id => id === 'still-enough-to-listen' ? 'still-enough.html' : id === 'soft-place-to-land' ? 'soft-place-to-land.html' : id === 'let-them-think' ? 'let-them-think.html' : id === 'precious-life' ? 'precious-life.html' : `session.html?session=${encodeURIComponent(id)}`;
if (heroScene) heroScene.unfurl = true;
heroScene?.setScene('first-light');
if (heroScene) { heroScene.elapsed = 0; heroScene.render(); heroScene.setPlaying(true); }
let active = null;
let filter = 'all';
let cues = [];
let pendingResume = 0;
let playRequest = 0;
let motionPaused = reducedMotion.matches;
let dimmed = false;
let earnedCompletionId = null;

function formatTime(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}
function durationText(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const mins = Math.floor(total / 60), remainder = total % 60;
  return `${mins} min${remainder ? ` ${remainder} sec` : ''}`;
}
function snapshot() { return store.snapshot(); }
function setStatus(message) { $('play-status').textContent = message; }

function pickDaily() {
  if (!catalog.length) return null;
  // Daily invitations promote only the four currently approved audio experiences.
  // Older sessions remain available in the complete library.
  const approved = new Set(['still-enough-to-listen', 'soft-place-to-land', 'let-them-think', 'precious-life']);
  const choices = catalog.filter(item => approved.has(item.id));
  if (!choices.length) return null;
  const now = new Date();
  const key = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return choices[hash % choices.length];
}

// Each session gets its own vivid palette for its library tile.
const TILE_COLORS = {
  gratitude: ['#e07a2e', '#c94f3a', '#f0b441'], 'begin-day': ['#e0962a', '#b8502c', '#1f8f86'],
  reset: ['#1f9e74', '#0f6f7a', '#9cbf3a'], 'whole-body': ['#b83a6e', '#d9723a', '#e8b04a'],
  'still-enough-to-listen': ['#ba6946', '#3d8092', '#e9b77c'],
  'after-conversation': ['#1f9c80', '#2a6fb0', '#d9a55a'], 'wind-down': ['#d07a2c', '#9e3350', '#3f8a6a'],
  'enter-your-work': ['#e08a2a', '#d4a52e', '#0f8f6f'], 'awake-again': ['#1d7a9c', '#2fae9e', '#d9a441'],
  'letting-go-into-sleep': ['#156a82', '#c9a86a', '#8f3f62'], 'frequency-of-abundance': ['#1fae74', '#e0a52e', '#d4593a'],
  warmth: ['#d9502f', '#e08a2a', '#a8305a'], 'open-space': ['#1f9eb0', '#6fa83a', '#2f5fb0'],
  drift: ['#2f55b8', '#1fa894', '#7a3fa8'], afterglow: ['#d95f45', '#e0a53a', '#7a3a9c'],
  'first-light': ['#e0943a', '#c94a6a', '#2fa8b0']
};

// Each session's tile has its own kind of light, not just its own colors.
const TILE_MOTIFS = {
  'first-light': 'bloom', 'begin-day': 'bloom', 'enter-your-work': 'bloom',
  gratitude: 'horizon', afterglow: 'horizon', 'wind-down': 'horizon',
  reset: 'breath', 'whole-body': 'curtain', 'frequency-of-abundance': 'curtain',
  'still-enough-to-listen': 'film',
  'after-conversation': 'merge', 'awake-again': 'moon', 'letting-go-into-sleep': 'moon',
  warmth: 'ember', drift: 'tide', 'open-space': 'tide'
};

// Tiles only animate while on screen; off screen they rest as their still art.
const tileWatcher = typeof IntersectionObserver === 'function'
  ? new IntersectionObserver(entries => entries.forEach(entry => entry.target.classList.toggle('is-live', entry.isIntersecting)), { rootMargin: '150px 0px' })
  : null;

// One light per session, grown from its id: the library tile and the session page share it,
// so what you tap is what you arrive in.
function buildLight(item, host, lazy = false) {
  const tint = TILE_COLORS[item.id] || TILE_COLORS[item.visual] || [item.accent || '#ffb870', '#ff7aa2', '#52d8e0'];
  tint.forEach((color, i) => host.style.setProperty(`--tile-${i + 1}`, color));
  // A genome seeded from the session id: every tile grows its own shapes and motion.
  let gene = [...item.id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) || 1;
  const next = () => (gene = (gene * 16807) % 2147483647) / 2147483647;
  const shape = () => [0, 0, 0, 0].map(() => `${Math.round(35 + next() * 30)}%`).join(' ');
  [['x1', 10, 60], ['y1', 5, 55], ['x2', 40, 90], ['y2', 40, 95], ['fan', 13, 19], ['tilt', -8, 8], ['sway', 7, 13], ['drift', 9, 16], ['delay', -40, 0]]
    .forEach(([k, lo, hi]) => host.style.setProperty(`--g-${k}`, (lo + next() * (hi - lo)).toFixed(1) + (k.startsWith('x') || k.startsWith('y') ? '%' : k === 'fan' || k === 'tilt' ? 'deg' : 's')));
  host.style.setProperty('--g-shape-a', shape()); host.style.setProperty('--g-shape-b', shape());
  const light = document.createElement('div'); light.className = 'tile-light'; light.setAttribute('aria-hidden', 'true');
  const motif = TILE_MOTIFS[item.id] || 'bloom'; host.dataset.motif = motif;
  if (['still-enough-to-listen', 'soft-place-to-land', 'let-them-think', 'precious-life'].includes(item.id)) {
    light.innerHTML = `<img class="tl-still" src="images/art/${item.id}.jpg" alt="" ${lazy ? 'loading="lazy" ' : ''}decoding="async">`;
    if (!lazy) {
      const film = document.createElement('video'); film.className = 'tl-session-film'; film.muted = true; film.loop = true; film.playsInline = true; film.preload = 'none'; film.poster = `images/art/${item.id}.jpg`; film.src = item.id === 'still-enough-to-listen' ? 'images/art/still-enough-motion-loop.mp4' : `images/art/${item.id}-motion.mp4`;
      light.append(film);
    }
    return light;
  }
  light.innerHTML = `<img class="tl-still" src="images/art/${item.id}.jpg" alt="" ${lazy ? 'loading="lazy" ' : ''}decoding="async">` + '<div class="tl-live"><i class="tl-back"></i><i class="tl-a"></i><i class="tl-b"></i><i class="tl-c"></i><i class="tl-d"></i>' + (motif === 'bloom' ? '<span class="tl-petals">' + Array.from({length: 7}, (_, k) => `<i style="--k:${k - 3}"></i>`).join('') + '</span>' : '') + '</div>';
  return light;
}

function renderLibrary() {
  if (isSessionPage) return;
  const saved = new Set(snapshot().favorites || []);
  const shown = catalog.filter(item => filter === 'all' || (filter === 'favorites' ? saved.has(item.id) : filter === 'sound' ? item.type === 'sound' : item.category === filter));
  const grid = $('session-grid');
  const focused = document.activeElement;
  const focusedId = focused?.closest('.session-card')?.dataset.id;
  const focusedKind = focused?.classList.contains('card-save') ? '.card-save' : '.card-listen';
  tileWatcher?.disconnect();
  grid.replaceChildren();
  for (const item of shown) {
    const card = document.createElement('article');
    card.className = 'session-card';
    card.dataset.id = item.id;
    card.dataset.selected = String(active?.id === item.id);
    const art = document.createElement('div'); art.className = 'session-art'; art.dataset.visual = item.visual || item.id;
    art.append(buildLight(item, card, true));
    if (document.body.classList.contains('page-home')) {
      const artLink = document.createElement('a'); artLink.className = 'art-link'; artLink.href = sessionUrl(item.id); artLink.setAttribute('aria-label', `Listen to ${item.title}`); artLink.tabIndex = -1; artLink.setAttribute('aria-hidden', 'true'); art.append(artLink);
    }
    const topline = document.createElement('div'); topline.className = 'card-topline';
    const kicker = document.createElement('span'); kicker.textContent = item.kicker || item.category;
    const heart = document.createElement('button'); heart.className = 'card-save'; heart.type = 'button'; heart.setAttribute('aria-label', `${saved.has(item.id) ? 'Remove' : 'Save'} ${item.title} ${saved.has(item.id) ? 'from' : 'to'} favorites`); heart.setAttribute('aria-pressed', String(saved.has(item.id))); heart.title = saved.has(item.id) ? 'Remove from saved' : 'Save session'; heart.innerHTML = '<span aria-hidden="true">♡</span>';
    heart.addEventListener('click', () => { store.toggleFavorite(item.id); renderLibrary(); updateFavoriteButton(); });
    topline.append(kicker, heart); art.append(topline);
    const body = document.createElement('div'); body.className = 'card-body';
    const meta = document.createElement('p'); meta.className = 'card-meta'; meta.textContent = `${item.type === 'sound' ? 'Sound' : 'Guided'} · ${durationText(item.duration)}`;
    const title = document.createElement('h3'); title.textContent = item.title;
    const description = document.createElement('p'); description.textContent = item.description;
    const listen = document.createElement('a'); listen.className = 'card-listen'; listen.href = sessionUrl(item.id); listen.innerHTML = '<span class="listen-mark" aria-hidden="true"><svg class="transport-icon" viewBox="0 0 24 24"><path d="M8 5.5 18 12 8 18.5Z" fill="currentColor"/></svg></span><span class="listen-word">Listen</span>'; listen.setAttribute('aria-label', `Listen to ${item.title}`);
    listen.addEventListener('click', () => { art.style.viewTransitionName = 'session-light'; });
    body.append(meta, title, description, listen); card.append(art, body); grid.append(card);
    tileWatcher?.observe(card);
  }
  if (focusedId) {
    const replacement = [...grid.children].find(card => card.dataset.id === focusedId)?.querySelector(focusedKind);
    (replacement || document.querySelector(`[data-filter="${filter}"]`))?.focus({preventScroll:true});
  }
  $('library-count').textContent = `${shown.length} ${shown.length === 1 ? 'session' : 'sessions'}`;
  $('library-empty').hidden = shown.length > 0;
}

function renderPractice() {
  const state = snapshot();
  $('total-minutes').innerHTML = `${Math.floor((state.totalSeconds || 0) / 60)} <small>min</small>`;
  $('session-count').textContent = state.completedSessions || 0;
  $('practice-days').textContent = state.practiceDays || 0;
  const today = Math.floor((state.todaySeconds || 0) / 60);
  $('today-minutes').innerHTML = `${today} <small>min</small>`;
  const goal = Number(state.goalMinutes) || 0;
  $('goal-select').value = String([0, 3, 5, 10].includes(goal) ? goal : 0);
  $('goal-track').hidden = goal === 0;
  $('goal-fill').style.width = `${goal ? Math.min(100, ((state.todaySeconds || 0) / (goal * 60)) * 100) : 0}%`;
  $('goal-caption').textContent = goal ? (state.todaySeconds >= goal * 60 ? 'You made the space you intended today.' : `${Math.max(0, goal - today)} more minute${goal - today === 1 ? '' : 's'} if it feels right.`) : 'The time you make is enough.';
  $('clear-history').disabled = !(state.hasHistory || state.favorites?.length || Object.keys(state.resume || {}).length);
  $('storage-note').textContent = state.storageAvailable === false ? 'Listening works here, though this browser cannot save your history.' : 'Your favorites and listening history stay in this browser.';
}

function updateFavoriteButton() {
  if (!active) return;
  const saved = (snapshot().favorites || []).includes(active.id);
  const button = $('player-favorite');
  button.setAttribute('aria-pressed', String(saved));
  button.setAttribute('aria-label', `${saved ? 'Remove' : 'Save'} ${active.title} ${saved ? 'from' : 'to'} favorites`);
  button.title = saved ? 'Remove from saved' : 'Save session';
}

function updateTransport() {
  const playing = !!active && !audio.paused && !audio.ended;
  $('player-field').dataset.playing = String(playing);
  $('play-toggle').classList.toggle('is-playing', playing);
  $('play-toggle').setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${active?.title || 'selected session'}`);
 
  if ('mediaSession' in navigator) { try { navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'; } catch {} }
}

function updateTime() {
  const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : active?.duration || 0;
  const current = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
  $('time-current').textContent = formatTime(current);
  $('time-total').textContent = formatTime(duration);
  $('seek-range').max = Math.max(1, Math.floor(duration));
  $('seek-range').value = Math.min(Math.floor(current), Number($('seek-range').max));
  $('seek-range').disabled = !audio.seekable.length && audio.readyState < 1;
  $('seek-range').setAttribute('aria-valuetext', `${formatTime(current)} of ${formatTime(duration)}`);
  if ('mediaSession' in navigator && navigator.mediaSession.setPositionState && Number.isFinite(duration) && duration > 0) {
    try { navigator.mediaSession.setPositionState({ duration, playbackRate: audio.playbackRate || 1, position: Math.min(duration, Math.max(0, current)) }); } catch {}
  }
  if (audio.paused) updateCaption();
}

let captionFrame = 0;
let captionsEnabled = false;
function updateCaption() {
  if (!captionsEnabled) { $('field-words').style.setProperty('--caption-opacity', 0); return; }
  const current = audio.currentTime || 0;
  const index = cues.findIndex((cue, i) => current >= cue.start - .8 && current < Math.min(cue.end + 1.8, cues[i + 1]?.start - .8 || Infinity));
  const line = cues[index];
  const smooth = x => { x = Math.min(1, Math.max(0, x)); return x*x*(3-2*x); };
  const end = line ? Math.min(line.end + 1.8, cues[index + 1]?.start - .8 || Infinity) : 0;
  const opacity = line && !audio.paused ? Math.min(smooth((current-line.start+.8)/1.6), smooth((end-current)/Math.min(1.6, end-line.end))) : 0;
  const words = $('field-words');
  if (line && words.textContent !== line.text) words.textContent = line.text;
  words.style.setProperty('--caption-opacity', opacity);
  words.style.setProperty('--caption-blur', `${reducedMotion.matches ? 0 : (1-opacity)*5}px`);
  words.style.setProperty('--caption-lift', `${reducedMotion.matches ? 0 : (1-opacity)*3}px`);
}
function animateCaptions() {
  cancelAnimationFrame(captionFrame);
  updateCaption();
  if (captionsEnabled && !audio.paused && !audio.ended && !document.hidden) captionFrame = requestAnimationFrame(animateCaptions);

}

async function loadCues(item) {
  cues = [];
  $('transcript-content').replaceChildren();
  $('transcript-toggle').hidden = !item.cues;
  $('field-words').textContent = '';
  $('field-words').classList.remove('is-visible');
  $('transcript-panel').hidden = true;
  $('transcript-toggle').setAttribute('aria-expanded', 'false');
  if (!item.cues) return;
  try {
    const response = await fetch(item.cues);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (active?.id !== item.id) return;
    cues = (Array.isArray(data) ? data : []).filter(cue => Number.isFinite(cue.start) && Number.isFinite(cue.end) && cue.start >= 0 && cue.end > cue.start && typeof cue.text === 'string').sort((a,b)=>a.start-b.start);
    for (const cue of cues) { const p = document.createElement('p'); p.textContent = cue.text; $('transcript-content').append(p); }
    if (!cues.length) { const p = document.createElement('p'); p.textContent = 'A transcript is not available for this recording yet.'; $('transcript-content').append(p); }
    updateTime();
  } catch { if (active?.id !== item.id) return; const p = document.createElement('p'); p.textContent = 'The transcript could not be loaded right now.'; $('transcript-content').append(p); }
}

function updateMediaSession(item) {
  if (!('mediaSession' in navigator) || !('MediaMetadata' in window)) return;
  try { navigator.mediaSession.metadata = new MediaMetadata({ title: item.title, artist: 'Superthoughts', album: 'A little space to listen', artwork: [{ src: new URL(`images/art/${item.id}.jpg`, location.href).href, sizes: '512x512', type: 'image/jpeg' }] }); } catch {}
}

function select(id, options = {}) {
  const item = byId.get(id);
  if (!item) return;
  if (active?.id === id) { if (options.play) togglePlay(); if (options.scroll) { $('listen').scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth' }); $('play-toggle').focus({preventScroll:true}); } return; }
  ++playRequest;
  if (active) tracker.flush();
  audio.pause();
  tracker.select(item.id, item.duration);
  active = item;
  earnedCompletionId = null;
  pendingResume = Number(snapshot().resume?.[id]) || 0;
  $('player-title').textContent = item.title;
  $('transport-title').textContent = item.title;
  $('player-description').textContent = item.description;
  $('field-kicker').textContent = (item.kicker || item.category).toUpperCase();
  $('field-duration').textContent = durationText(item.duration).toUpperCase();
  $('player-type').textContent = `${item.type === 'sound' ? 'Sound' : 'Guided practice'} · ${durationText(item.duration)}`;
  $('time-total').textContent = formatTime(item.duration);
  $('resume-message').hidden = !(pendingResume > 5);
  $('resume-message').textContent = pendingResume > 5 ? `Your place at ${formatTime(pendingResume)} is saved on this device. Use restart to begin again.` : '';
  audio.src = item.src;
  audio.setAttribute('aria-label', item.title);
  audio.load();
  { const field = $('player-field'); field.querySelector('.tile-light')?.remove(); field.prepend(buildLight(item, field)); field.classList.add('is-live'); }
  syncSessionFilm();
  (TILE_COLORS[item.id] || TILE_COLORS[item.visual] || []).forEach((color, i) => document.body.style.setProperty(`--tile-${i + 1}`, color));
  updateMediaSession(item);
  updateFavoriteButton(); if (!isSessionPage) renderLibrary(); updateTime(); updateTransport();
  setStatus('Ready to listen');
  loadCues(item);
  if (isSessionPage) { try { const url = new URL(location.href); url.searchParams.set('session', id); history.replaceState(null, '', url); } catch {} }
  if (options.scroll) { $('listen').scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth' }); $('play-toggle').focus({preventScroll:true}); }
  if (options.play) playAudio();
}

async function playAudio() {
  if (!active) return;
  if (audio.ended) restartRun();
  const request = ++playRequest;
  setStatus('Opening audio…');
  try { await audio.play(); }
  catch { if (request === playRequest) { setStatus('Audio could not start. Check your connection and try again.'); updateTransport(); } }
}
function togglePlay() { if (audio.paused) playAudio(); else audio.pause(); }
function restartRun() {
  if (!active) return;
  audio.pause();
  tracker.select(active.id, active.duration, { restart: true });
  earnedCompletionId = null;
  pendingResume = 0;
  try { audio.currentTime = 0; } catch {}
  $('resume-message').hidden = true;
  updateTime();
}
function acknowledgeCompletion(id) {
  earnedCompletionId = id;
  renderPractice();
}

const daily = pickDaily();
if (daily) { $('daily-meta').textContent = `${daily.title} · ${durationText(daily.duration)}`; $('daily-play').addEventListener('click', () => { location.href = sessionUrl(daily.id); }); }
else { $('daily-play').disabled = true; $('daily-meta').textContent = 'Sessions will appear here soon.'; }
const requestedPractice = new URLSearchParams(location.search).get('practice');
if (isPracticePage && ['morning', 'reset', 'evening', 'sound'].includes(requestedPractice)) filter = requestedPractice;
for (const button of document.querySelectorAll('[data-filter]')) button.addEventListener('click', () => { filter = button.dataset.filter; for (const other of document.querySelectorAll('[data-filter]')) other.setAttribute('aria-pressed', String(other === button)); renderLibrary(); });
$('play-toggle').addEventListener('click', togglePlay);
$('replay-button').addEventListener('click', () => { if (!active) return; restartRun(); setStatus('Ready from the beginning'); if (audio.paused) playAudio(); });
$('seek-range').addEventListener('input', event => { if (!active) return; try { audio.currentTime = Number(event.target.value); } catch {} updateTime(); });
$('player-favorite').addEventListener('click', () => { if (!active) return; store.toggleFavorite(active.id); updateFavoriteButton(); renderLibrary(); });
// A separate reading surface avoids burying the transcript under player controls.
const transcriptDialog = document.createElement('dialog');
transcriptDialog.className = 'transcript-dialog';
transcriptDialog.setAttribute('aria-labelledby', 'transcript-heading');
transcriptDialog.innerHTML = '<header><div><p class="eyebrow">Session transcript</p><h2 id="transcript-heading"></h2></div><button type="button" autofocus>Close</button></header>';
$('player-shell').append(transcriptDialog);
const transcriptPanel = $('transcript-panel');
transcriptDialog.append(transcriptPanel);
transcriptPanel.querySelector('.eyebrow')?.remove();
$('transcript-toggle').setAttribute('aria-haspopup', 'dialog');
$('transcript-toggle').addEventListener('click', () => {
  $('transcript-heading').textContent = active?.title || 'Transcript';
  transcriptPanel.hidden = false;
  transcriptDialog.showModal();
  transcriptPanel.scrollTop = 0;
  $('transcript-toggle').setAttribute('aria-expanded', 'true');
});
transcriptDialog.querySelector('button').addEventListener('click', () => transcriptDialog.close());
transcriptDialog.addEventListener('close', () => {
  transcriptPanel.hidden = true;
  $('transcript-toggle').setAttribute('aria-expanded', 'false');
  $('transcript-toggle').focus({ preventScroll: true });
});
$('dim-toggle').addEventListener('click', () => { dimmed = !dimmed; $('dim-toggle').setAttribute('aria-pressed', String(dimmed)); $('player-field').dataset.dim = String(dimmed); updateTime(); syncSessionFilm(); });
$('words-toggle')?.addEventListener('click', () => {
  captionsEnabled = !captionsEnabled;
  $('words-toggle').setAttribute('aria-pressed', String(captionsEnabled));
  $('words-toggle').textContent = captionsEnabled ? 'Words on' : 'Words off';
  animateCaptions();
});
$('motion-toggle').addEventListener('click', () => { motionPaused = !motionPaused; $('motion-toggle').setAttribute('aria-pressed', String(motionPaused)); $('motion-toggle').textContent = motionPaused ? 'Resume motion' : 'Pause motion'; $('player-field').classList.toggle('motion-paused', motionPaused); syncSessionFilm(); });
$('share-button').addEventListener('click', async () => { if (!active) return; const url = new URL(sessionUrl(active.id), location.href); try { if (navigator.share) await navigator.share({ title: active.title, url: url.href }); else { await navigator.clipboard.writeText(url.href); setStatus('Session link copied.'); } } catch (error) { if (error?.name !== 'AbortError') setStatus('The link could not be shared here.'); } });
$('goal-select').addEventListener('change', event => { store.setGoal(Number(event.target.value)); renderPractice(); });
$('clear-history').addEventListener('click', () => { $('clear-confirm').hidden = false; $('clear-cancel').focus(); });
$('clear-cancel').addEventListener('click', () => { $('clear-confirm').hidden = true; $('clear-history').focus(); });
$('clear-yes').addEventListener('click', () => { audio.pause(); tracker.flush(); store.clear(); earnedCompletionId = null; pendingResume = 0; $('resume-message').hidden = true; $('welcome-back').hidden = true; $('clear-confirm').hidden = true; renderPractice(); renderLibrary(); updateFavoriteButton(); $('goal-select').focus(); });

audio.addEventListener('loadedmetadata', () => { if (pendingResume > 5 && pendingResume < audio.duration - 5) { try { audio.currentTime = pendingResume; } catch {} } pendingResume = 0; updateTime(); if (audio.paused) setStatus('Ready to listen'); });
audio.addEventListener('canplay', () => { if (audio.paused && $('play-status').textContent === 'Loading audio…') setStatus('Ready to listen'); });
audio.addEventListener('timeupdate', updateTime);
audio.addEventListener('durationchange', updateTime);
audio.addEventListener('loadstart', () => { if (active) setStatus('Loading audio…'); });
audio.addEventListener('waiting', () => { if (active && !audio.paused) setStatus('Audio interrupted. Reconnecting…'); });
audio.addEventListener('stalled', () => { if (active && !audio.paused) setStatus('Audio interrupted. Check your connection.'); });
audio.addEventListener('playing', () => { setStatus('Playing'); updateTransport(); animateCaptions(); });
function syncSessionFilm() {
  // The earlier animated fields share the same rest policy as the newer films.
  $('player-field').classList.toggle('motion-resting', audio.paused || audio.ended || document.hidden || motionPaused || dimmed || reducedMotion.matches);
  const film = $('player-field').querySelector('.tl-session-film');
  if (!film) return;
  if (audio.paused || audio.ended || document.hidden || motionPaused || dimmed || reducedMotion.matches) film.pause();
  else film.play().catch(() => {});
}
audio.addEventListener('playing', syncSessionFilm);
audio.addEventListener('pause', syncSessionFilm);
audio.addEventListener('ended', syncSessionFilm);
document.addEventListener('visibilitychange', syncSessionFilm);
audio.addEventListener('pause', animateCaptions);
audio.addEventListener('seeked', animateCaptions);
document.addEventListener('visibilitychange', animateCaptions);
audio.addEventListener('pause', () => { if (active && !audio.ended && !audio.error) setStatus('Paused. Press play to continue.'); updateTransport(); });
audio.addEventListener('ended', () => { updateTransport(); if ('mediaSession' in navigator) { try { navigator.mediaSession.playbackState = 'none'; } catch {} } const earned = earnedCompletionId === active?.id; setStatus(earned ? 'A moment well spent. Thank you for making this time for yourself.' : 'You are welcome back whenever you like.'); $('resume-message').hidden = false; $('resume-message').textContent = earned ? 'A practice you can return to whenever you like.' : 'Your listening time has been saved on this device.'; });
audio.addEventListener('error', () => { if (active) setStatus('This audio is unavailable right now. Please try again later.'); updateTransport(); });
window.addEventListener('pagehide', () => tracker.flush());
if ('mediaSession' in navigator) {
  try {
    navigator.mediaSession.setActionHandler('play', playAudio);
    navigator.mediaSession.setActionHandler('pause', () => audio.pause());
    navigator.mediaSession.setActionHandler('seekbackward', e => { audio.currentTime = Math.max(0, audio.currentTime - (e.seekOffset || 10)); });
    navigator.mediaSession.setActionHandler('seekforward', e => { audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + (e.seekOffset || 10)); });
    navigator.mediaSession.setActionHandler('seekto', e => { if (Number.isFinite(e.seekTime)) audio.currentTime = e.seekTime; });
  } catch {}
}
reducedMotion.addEventListener?.('change', event => { if (event.matches) { motionPaused = true; $('motion-toggle').setAttribute('aria-pressed', 'true'); $('motion-toggle').textContent = 'Resume motion'; $('player-field').classList.add('motion-paused'); } });
 $('player-field').classList.toggle('motion-paused', motionPaused);
$('motion-toggle').setAttribute('aria-pressed', String(motionPaused));
if (motionPaused) $('motion-toggle').textContent = 'Resume motion';
renderPractice();
if (snapshot().hasHistory) $('welcome-back').hidden = false;
const requested = new URLSearchParams(location.search).get('session');
select(byId.has(requested) ? requested : daily?.id || catalog[0]?.id);
for (const button of document.querySelectorAll('[data-filter]')) button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
if (isPracticePage) renderLibrary();
window.addEventListener('pageshow', () => document.querySelectorAll('.session-art').forEach(el => { el.style.viewTransitionName = ''; }));
window.addEventListener('beforeunload', () => { tracker.destroy(); heroScene?.destroy(); });

// Enhance only after initialization; the native player remains a fallback without JS.
document.body.classList.add('pilot-ready');
let focusView = false;
const focusButton = $('focus-toggle');
const outside = [...document.querySelectorAll('.site-header,.welcome,.listening-intro,.library,.practice,.pilot-feedback,.site-footer')];
function setFocusView(enabled) {
  focusView = enabled;
  document.body.classList.toggle('focus-listening',enabled);
  focusButton.setAttribute('aria-pressed',String(enabled));
  focusButton.textContent = enabled ? 'Back to the library ↙' : 'Enter listening view ↗';
  outside.forEach(element => { element.inert = enabled; });
  (isSessionPage ? $('session-back') : focusButton).focus({preventScroll:true});
  document.body.classList.toggle('bath-view', enabled && active?.type === 'sound');
  revealBath();
}
focusButton.addEventListener('click',()=>setFocusView(!focusView));
document.addEventListener('keydown',event=>{
  if (!focusView || transcriptDialog.open) return;
  if (event.key==='Escape') { event.preventDefault();setFocusView(false);return; }
  if (event.key==='Tab') {
    const controls=[...$('player-shell').querySelectorAll('button:not(:disabled),input:not(:disabled),a[href]')].filter(el=>el.offsetParent!==null);
    const first=controls[0],last=controls.at(-1);
    if (event.shiftKey && document.activeElement===first) {event.preventDefault();last?.focus();}
    else if (!event.shiftKey && document.activeElement===last) {event.preventDefault();first?.focus();}
  }
});

// Sound baths fill the screen; interaction gently reveals their controls again.
let bathIdleTimer = 0;
function revealBath() {
  clearTimeout(bathIdleTimer);
  document.body.classList.remove('bath-idle');
  if ((!isSessionPage && !focusView) || audio.paused || audio.ended || transcriptDialog.open) return;
  bathIdleTimer = setTimeout(() => {
    if ((isSessionPage || focusView) && !audio.paused && !transcriptDialog.open && !document.activeElement?.matches(':focus-visible'))
      document.body.classList.add('bath-idle');
  }, 8000);
}
$('player-shell').addEventListener('pointermove', revealBath, {passive:true});
$('player-shell').addEventListener('pointerdown', revealBath, {passive:true});
document.addEventListener('keydown', revealBath, true);
audio.addEventListener('play', () => {
  if (active?.type === 'sound' && !isPracticePage) setFocusView(true);
  revealBath();
});
audio.addEventListener('pause', () => { if (isSessionPage) setFocusView(false); revealBath(); });
audio.addEventListener('ended', revealBath);
audio.addEventListener('error', revealBath);

transcriptDialog.addEventListener('close', revealBath);

// A light haptic tick on the main touch targets. Android supports vibrate(); on iOS 18+,
// toggling a hidden native switch plays the system haptic. Older browsers do nothing.
(() => {
  const label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  label.style.cssText = 'position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;left:-9px;top:0';
  const toggle = document.createElement('input'); toggle.type = 'checkbox'; toggle.setAttribute('switch', ''); toggle.tabIndex = -1;
  label.append(toggle); document.body.append(label);
  const tick = () => { if (navigator.vibrate) navigator.vibrate(8); else label.click(); };
  document.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse') return;
    if (event.target.closest?.('.card-listen, .card-save, #daily-play, #play-toggle, .collection-links a, .new-release, .filters button')) tick();
  }, { passive: true });
})();
