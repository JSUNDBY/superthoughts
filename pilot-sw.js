/* Optional offline support for the pilot. This worker ignores the rest of the site. */
'use strict';

const SHELL_CACHE = 'superthoughts-pilot-shell-v73-wayback';
const SESSION_CACHE = 'superthoughts-pilot-sessions-v1';
const ROOT = new URL(self.registration.scope);
// Free sessions and their cues live on the public audio host (2026-10-23 audio move, phase 3a).
// Only its free/ and cues/ folders are accepted; member audio stays same-origin until the paywall launches.
const AUDIO_HOST = 'https://audio.superthoughts.com';
const HOSTED_AUDIO = /^https:\/\/audio\.superthoughts\.com\/free\/[a-z0-9][a-z0-9-]*\.mp3$/;
const HOSTED_CUES = /^https:\/\/audio\.superthoughts\.com\/cues\/[a-z0-9][a-z0-9-]*-cues\.json$/;
const SHELL_FILES = [
  'explore.html', 'library.html', 'diffusion-site.css', 'diffusion-session.css', 'diffusion-artwork.js', 'diffusion-nature.js', 'diffusion-catalog.js', 'diffusion-common.js', 'diffusion-session.js',
  'newsletter.css', 'newsletter.js', 'contact.html', 'contact.css', 'contact.js',
  'visual-system.css', 'practice.css', 'session-art.css', 'guided-room.js', 'let-them-think.html', 'precious-life.html', 'sessions/remembering-your-reason/index.html', 'sessions/when-the-urge-arrives/index.html', 'sessions/a-new-small-ritual/index.html', 'sessions/stress-without-the-cigarette/index.html', 'sessions/the-pause-before-asking/index.html', 'sessions/after-a-tense-conversation/index.html', 'sessions/the-abundance-practice/index.html', 'sessions/the-empowerment-practice/index.html', 'sessions/before-the-week-starts/index.html', 'sessions/three-minute-reset/index.html', 'sessions/five-minute-calm/index.html', 'sessions/five-minute-morning-clarity/index.html', 'sessions/a-practice-for-inner-peace/index.html', 'sessions/calm-confidence-reset/index.html', 'sessions/clear-your-mind-for-the-day/index.html', 'sessions/stress-release/index.html', 'sessions/creativity-reset/index.html', 'sessions/set-down-guilt/index.html', 'sessions/abundance-mindset/index.html', 'sessions/clear-boundaries/index.html', 'sessions/emotional-clarity/index.html', 'sessions/evening-settle/index.html', 'sessions/ground-your-mind/index.html', 'sessions/let-the-day-close/index.html', 'sessions/quiet-the-mind/index.html', 'sessions/reignite-inner-vitality/index.html', 'sessions/emotional-regulation/index.html', 'sessions/emotional-softening/index.html', 'sessions/evening-release/index.html', 'sessions/evening-unwind/index.html', 'sessions/gratitude-reset/index.html', 'sessions/ground-into-your-body/index.html', 'sessions/morning-calm-activation/index.html', 'sessions/presence-recharge/index.html', 'sessions/nervous-system-reset/index.html', 'sessions/release-anxiety/index.html', 'sessions/shifting-timelines/index.html', 'sessions/grounded-in-gratitude/index.html', 'sessions/quantum-abundance-tuning/index.html', 'sessions/the-quantum-field/index.html', 'sessions/pure-connection/index.html', 'sessions/resonance-of-mind-and-heart/index.html', 'sessions/universal-creative-energy/index.html', 'sessions/awakening-to-the-fifth-dimension/index.html', 'sessions/flow-state-activation/index.html', 'sessions/vitality-and-balance/index.html', 'sessions/before-you-say-yes/index.html', 'sessions/before-you-pick-up-the-phone/index.html', 'sessions/the-frequency-of-enough/index.html', 'sessions/connecting-to-abundance/index.html', 'sessions/still-enough-to-sleep/index.html', 'images/art/stress-without-the-cigarette.jpg', 'images/art/the-pause-before-asking.jpg', 'images/art/after-a-tense-conversation.jpg', 'images/art/the-abundance-practice.jpg', 'images/art/the-empowerment-practice.jpg', 'images/art/before-the-week-starts.jpg', 'images/art/three-minute-reset.jpg', 'images/art/five-minute-calm.jpg', 'images/art/five-minute-morning-clarity.jpg', 'images/art/a-practice-for-inner-peace.jpg', 'images/art/calm-confidence-reset.jpg', 'images/art/clear-your-mind-for-the-day.jpg', 'images/art/stress-release.jpg', 'images/art/creativity-reset.jpg', 'images/art/set-down-guilt.jpg', 'images/art/abundance-mindset.jpg', 'images/art/clear-boundaries.jpg', 'images/art/emotional-clarity.jpg', 'images/art/evening-settle.jpg', 'images/art/ground-your-mind.jpg', 'images/art/let-the-day-close.jpg', 'images/art/quiet-the-mind.jpg', 'images/art/reignite-inner-vitality.jpg', 'images/art/emotional-regulation.jpg', 'images/art/emotional-softening.jpg', 'images/art/evening-release.jpg', 'images/art/evening-unwind.jpg', 'images/art/gratitude-reset.jpg', 'images/art/ground-into-your-body.jpg', 'images/art/morning-calm-activation.jpg', 'images/art/presence-recharge.jpg', 'images/art/nervous-system-reset.jpg', 'images/art/release-anxiety.jpg', 'images/art/shifting-timelines.jpg', 'images/art/grounded-in-gratitude.jpg', 'images/art/quantum-abundance-tuning.jpg', 'images/art/the-quantum-field.jpg', 'images/art/pure-connection.jpg', 'images/art/resonance-of-mind-and-heart.jpg', 'images/art/universal-creative-energy.jpg', 'images/art/awakening-to-the-fifth-dimension.jpg', 'images/art/flow-state-activation.jpg', 'images/art/vitality-and-balance.jpg', 'images/art/before-you-say-yes.jpg', 'images/art/before-you-pick-up-the-phone.jpg', 'images/art/the-frequency-of-enough.jpg', 'images/art/connecting-to-abundance.jpg', 'images/art/still-enough-to-sleep.jpg', 'images/art/a-new-small-ritual.jpg', 'images/art/when-the-urge-arrives.jpg', 'images/art/let-them-think.jpg', 'images/art/precious-life.jpg', 'images/art/remembering-your-reason.jpg', 'homepage.css', 'homepage.js', 'soft-place-to-land.html', 'soft-place-to-land.js', 'images/art/soft-place-to-land.jpg', 'index.html', 'session.html', 'practice.html', 'still-enough.html', 'still-enough.css', 'still-enough.js', 'navigation.css', 'collections.js', 'pilot.html', 'privacy.html', 'pilot.css', 'pilot.js', 'pilot-catalog.js',
  'pilot-visuals.js', 'ambient-light.js', 'pilot-progress.mjs', 'pilot-offline.js',
  'pilot-feedback.js', 'pilot-analytics.js', 'pilot-analytics-core.mjs', 'terms.html', 'pilot.webmanifest',
  'images/favicon.svg', 'images/superthoughts-symbol.svg', 'images/art/still-enough-to-listen.jpg', 'images/art/still-enough-motion-loop.mp4',
  'fonts/dm-sans-300.woff2', 'threshold.css', 'threshold-session.css', 'fonts/manrope-latin.woff2', 'fonts/fonts.css', 'fonts/space-grotesk-400.woff2'
];
// Import the same static catalog used by the player. A separate versioned list
// silently broke offline saving each time an audio master changed.
self.window = self;
importScripts('pilot-catalog.js');
const SESSION_FILES = (() => {
  const catalog = self.STCatalog;
  if (!Array.isArray(catalog) || !catalog.length) throw new Error('Missing session catalog.');
  const files = new Map();
  for (const item of catalog) {
    // Streamed catalog sessions live on the audio CDN and are never cached offline.
    if (item && item.stream === true && typeof item.src === 'string' &&
        /^https:\/\/superthoughts-audio\.b-cdn\.net\/site\/[a-z0-9][a-z0-9-]*\.mp3$/.test(item.src)) continue;
    const src = item && item.src;
    const cues = item && item.cues;
    // Restrict the imported data to versioned same-origin audio and cue paths.
    if (typeof src !== 'string' || !(/^audio\/[a-z0-9][a-z0-9-]*\.mp3$/.test(src) || HOSTED_AUDIO.test(src)) ||
        !(cues === null || (typeof cues === 'string' &&
          (/^audio\/[a-z0-9][a-z0-9-]*-cues\.json$/.test(cues) || HOSTED_CUES.test(cues)))) ||
        files.has(src)) throw new Error('Invalid session catalog path.');
    files.set(src, cues);
  }
  return files;
})();

const pathFor = relative => new URL(relative, ROOT).pathname;
const urlFor = relative => new URL(relative, ROOT).href;
const shellPaths = new Set(SHELL_FILES.map(pathFor));
// Saved files are keyed by full address (origin + path), so same-origin and hosted files never collide.
const keyFor = relative => { const url = new URL(relative, ROOT); return url.origin + url.pathname; };
const audioByKey = new Map([...SESSION_FILES].map(([src, cues]) => [keyFor(src), { src, cues }]));
const cueKeys = new Set([...SESSION_FILES.values()].filter(Boolean).map(keyFor));
const indexPath = pathFor('index.html');
const pilotPath = pathFor('pilot.html');

function cleanPath(raw) {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    if (raw.includes('\\') || /(?:^|\/)\.\.?(?=\/|[?#]|$)/.test(decoded)) return null;
    const url = new URL(raw, ROOT);
    if (url.search || url.hash) return null;
    if (url.origin === AUDIO_HOST) return url.origin + url.pathname;
    if (url.origin !== ROOT.origin || !url.pathname.startsWith(ROOT.pathname)) return null;
    return url.origin + url.pathname;
  } catch (_) {
    return null;
  }
}

function validateSession(src, cues) {
  const path = cleanPath(src);
  const session = audioByKey.get(path);
  if (!session) throw new Error('Unknown session audio.');
  if (session.cues === null) {
    if (cues !== null && cues !== undefined && cues !== '') throw new Error('Unexpected cue file.');
  } else if (cleanPath(cues) !== keyFor(session.cues)) {
    throw new Error('Cue file does not match this session.');
  }
  return session;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(SHELL_FILES.map(urlFor));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Only stale pilot shell caches are removed; saved sessions survive updates.
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('superthoughts-pilot-shell-') &&
      key !== SHELL_CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function shellResponse(request, isNavigation) {
  const cache = await caches.open(SHELL_CACHE);
  const requestPath = new URL(request.url).pathname;
  const canonical = urlFor(isNavigation ? (['library.html', 'explore.html', 'session.html', 'practice.html', 'still-enough.html', 'soft-place-to-land.html', 'let-them-think.html', 'precious-life.html', 'sessions/remembering-your-reason/index.html', 'sessions/when-the-urge-arrives/index.html', 'sessions/a-new-small-ritual/index.html', 'sessions/stress-without-the-cigarette/index.html', 'sessions/the-pause-before-asking/index.html', 'sessions/after-a-tense-conversation/index.html', 'sessions/the-abundance-practice/index.html', 'sessions/the-empowerment-practice/index.html', 'sessions/before-the-week-starts/index.html', 'sessions/three-minute-reset/index.html', 'sessions/five-minute-calm/index.html', 'sessions/five-minute-morning-clarity/index.html', 'sessions/a-practice-for-inner-peace/index.html', 'sessions/calm-confidence-reset/index.html', 'sessions/clear-your-mind-for-the-day/index.html', 'sessions/stress-release/index.html', 'sessions/creativity-reset/index.html', 'sessions/set-down-guilt/index.html', 'sessions/abundance-mindset/index.html', 'sessions/clear-boundaries/index.html', 'sessions/emotional-clarity/index.html', 'sessions/evening-settle/index.html', 'sessions/ground-your-mind/index.html', 'sessions/let-the-day-close/index.html', 'sessions/quiet-the-mind/index.html', 'sessions/reignite-inner-vitality/index.html', 'sessions/emotional-regulation/index.html', 'sessions/emotional-softening/index.html', 'sessions/evening-release/index.html', 'sessions/evening-unwind/index.html', 'sessions/gratitude-reset/index.html', 'sessions/ground-into-your-body/index.html', 'sessions/morning-calm-activation/index.html', 'sessions/presence-recharge/index.html', 'sessions/nervous-system-reset/index.html', 'sessions/release-anxiety/index.html', 'sessions/shifting-timelines/index.html', 'sessions/grounded-in-gratitude/index.html', 'sessions/quantum-abundance-tuning/index.html', 'sessions/the-quantum-field/index.html', 'sessions/pure-connection/index.html', 'sessions/resonance-of-mind-and-heart/index.html', 'sessions/universal-creative-energy/index.html', 'sessions/awakening-to-the-fifth-dimension/index.html', 'sessions/flow-state-activation/index.html', 'sessions/vitality-and-balance/index.html', 'sessions/before-you-say-yes/index.html', 'sessions/before-you-pick-up-the-phone/index.html', 'sessions/the-frequency-of-enough/index.html', 'sessions/connecting-to-abundance/index.html', 'sessions/still-enough-to-sleep/index.html'].find(file => pathFor(file) === requestPath || (file === 'sessions/remembering-your-reason/index.html' && requestPath === pathFor('sessions/remembering-your-reason/')) || (file === 'sessions/when-the-urge-arrives/index.html' && requestPath === pathFor('sessions/when-the-urge-arrives/')) || (file === 'sessions/a-new-small-ritual/index.html' && requestPath === pathFor('sessions/a-new-small-ritual/')) || (file === 'sessions/stress-without-the-cigarette/index.html' && requestPath === pathFor('sessions/stress-without-the-cigarette/')) || (file === 'sessions/the-pause-before-asking/index.html' && requestPath === pathFor('sessions/the-pause-before-asking/')) || (file === 'sessions/after-a-tense-conversation/index.html' && requestPath === pathFor('sessions/after-a-tense-conversation/')) || (file === 'sessions/the-abundance-practice/index.html' && requestPath === pathFor('sessions/the-abundance-practice/')) || (file === 'sessions/the-empowerment-practice/index.html' && requestPath === pathFor('sessions/the-empowerment-practice/')) || (file === 'sessions/before-the-week-starts/index.html' && requestPath === pathFor('sessions/before-the-week-starts/')) || (file === 'sessions/three-minute-reset/index.html' && requestPath === pathFor('sessions/three-minute-reset/')) || (file === 'sessions/five-minute-calm/index.html' && requestPath === pathFor('sessions/five-minute-calm/')) || (file === 'sessions/five-minute-morning-clarity/index.html' && requestPath === pathFor('sessions/five-minute-morning-clarity/')) || (file === 'sessions/a-practice-for-inner-peace/index.html' && requestPath === pathFor('sessions/a-practice-for-inner-peace/')) || (file === 'sessions/calm-confidence-reset/index.html' && requestPath === pathFor('sessions/calm-confidence-reset/')) || (file === 'sessions/clear-your-mind-for-the-day/index.html' && requestPath === pathFor('sessions/clear-your-mind-for-the-day/')) || (file === 'sessions/stress-release/index.html' && requestPath === pathFor('sessions/stress-release/')) || (file === 'sessions/creativity-reset/index.html' && requestPath === pathFor('sessions/creativity-reset/')) || (file === 'sessions/set-down-guilt/index.html' && requestPath === pathFor('sessions/set-down-guilt/')) || (file === 'sessions/abundance-mindset/index.html' && requestPath === pathFor('sessions/abundance-mindset/')) || (file === 'sessions/clear-boundaries/index.html' && requestPath === pathFor('sessions/clear-boundaries/')) || (file === 'sessions/emotional-clarity/index.html' && requestPath === pathFor('sessions/emotional-clarity/')) || (file === 'sessions/evening-settle/index.html' && requestPath === pathFor('sessions/evening-settle/')) || (file === 'sessions/ground-your-mind/index.html' && requestPath === pathFor('sessions/ground-your-mind/')) || (file === 'sessions/let-the-day-close/index.html' && requestPath === pathFor('sessions/let-the-day-close/')) || (file === 'sessions/quiet-the-mind/index.html' && requestPath === pathFor('sessions/quiet-the-mind/')) || (file === 'sessions/reignite-inner-vitality/index.html' && requestPath === pathFor('sessions/reignite-inner-vitality/')) || (file === 'sessions/emotional-regulation/index.html' && requestPath === pathFor('sessions/emotional-regulation/')) || (file === 'sessions/emotional-softening/index.html' && requestPath === pathFor('sessions/emotional-softening/')) || (file === 'sessions/evening-release/index.html' && requestPath === pathFor('sessions/evening-release/')) || (file === 'sessions/evening-unwind/index.html' && requestPath === pathFor('sessions/evening-unwind/')) || (file === 'sessions/gratitude-reset/index.html' && requestPath === pathFor('sessions/gratitude-reset/')) || (file === 'sessions/ground-into-your-body/index.html' && requestPath === pathFor('sessions/ground-into-your-body/')) || (file === 'sessions/morning-calm-activation/index.html' && requestPath === pathFor('sessions/morning-calm-activation/')) || (file === 'sessions/presence-recharge/index.html' && requestPath === pathFor('sessions/presence-recharge/')) || (file === 'sessions/nervous-system-reset/index.html' && requestPath === pathFor('sessions/nervous-system-reset/')) || (file === 'sessions/release-anxiety/index.html' && requestPath === pathFor('sessions/release-anxiety/')) || (file === 'sessions/shifting-timelines/index.html' && requestPath === pathFor('sessions/shifting-timelines/')) || (file === 'sessions/grounded-in-gratitude/index.html' && requestPath === pathFor('sessions/grounded-in-gratitude/')) || (file === 'sessions/quantum-abundance-tuning/index.html' && requestPath === pathFor('sessions/quantum-abundance-tuning/')) || (file === 'sessions/the-quantum-field/index.html' && requestPath === pathFor('sessions/the-quantum-field/')) || (file === 'sessions/pure-connection/index.html' && requestPath === pathFor('sessions/pure-connection/')) || (file === 'sessions/resonance-of-mind-and-heart/index.html' && requestPath === pathFor('sessions/resonance-of-mind-and-heart/')) || (file === 'sessions/universal-creative-energy/index.html' && requestPath === pathFor('sessions/universal-creative-energy/')) || (file === 'sessions/awakening-to-the-fifth-dimension/index.html' && requestPath === pathFor('sessions/awakening-to-the-fifth-dimension/')) || (file === 'sessions/flow-state-activation/index.html' && requestPath === pathFor('sessions/flow-state-activation/')) || (file === 'sessions/vitality-and-balance/index.html' && requestPath === pathFor('sessions/vitality-and-balance/')) || (file === 'sessions/before-you-say-yes/index.html' && requestPath === pathFor('sessions/before-you-say-yes/')) || (file === 'sessions/before-you-pick-up-the-phone/index.html' && requestPath === pathFor('sessions/before-you-pick-up-the-phone/')) || (file === 'sessions/the-frequency-of-enough/index.html' && requestPath === pathFor('sessions/the-frequency-of-enough/')) || (file === 'sessions/connecting-to-abundance/index.html' && requestPath === pathFor('sessions/connecting-to-abundance/')) || (file === 'sessions/still-enough-to-sleep/index.html' && requestPath === pathFor('sessions/still-enough-to-sleep/'))) || 'index.html') :
    SHELL_FILES.find(file => pathFor(file) === requestPath));
  try {
    const response = await fetch(request, { cache: 'no-cache' });
    if (!response.ok) return (await cache.match(canonical)) || response;
    // pilot.html is an online redirect page. Never replace cached index.html
    // with that page, or its offline fallback would redirect in a loop.
    if (!isNavigation || requestPath !== pilotPath) {
      try { await cache.put(canonical, response.clone()); }
      catch (_) { /* Serve live content even when shell caching is unavailable. */ }
    }
    return response;
  } catch (_) {
    return (await cache.match(canonical)) || Response.error();
  }
}

function rangeResponse(bytes, request) {
  const size = bytes.byteLength;
  const range = request.headers.get('range');
  const base = { 'Content-Type': 'audio/mpeg', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' };
  if (!range) {
    return new Response(bytes, { status: 200, headers: { ...base, 'Content-Length': String(size) } });
  }
  const match = /^bytes=(\d*)-(\d*)$/i.exec(range.trim());
  if (!match || (!match[1] && !match[2])) {
    return new Response(null, { status: 416,
      headers: { ...base, 'Content-Range': `bytes */${size}`, 'Content-Length': '0' } });
  }
  let start;
  let end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) start = size;
    else start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
      start >= size || end < start || start < 0) {
    return new Response(null, { status: 416,
      headers: { ...base, 'Content-Range': `bytes */${size}`, 'Content-Length': '0' } });
  }
  end = Math.min(end, size - 1);
  const part = bytes.slice(start, end + 1);
  return new Response(part, { status: 206, headers: {
    ...base, 'Content-Range': `bytes ${start}-${end}/${size}`,
    'Content-Length': String(part.byteLength)
  } });
}

async function audioResponse(request) {
  const cache = await caches.open(SESSION_CACHE);
  const canonical = new URL(request.url).origin + new URL(request.url).pathname;
  const saved = await cache.match(canonical);
  if (!saved) return fetch(request); // Streaming and ordinary range requests stay native until saved.
  try { return rangeResponse(await saved.arrayBuffer(), request); }
  catch (_) { return fetch(request); }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === AUDIO_HOST && !url.search && !url.hash) {
    const key = url.origin + url.pathname;
    if (audioByKey.has(key)) event.respondWith(audioResponse(request));
    else if (cueKeys.has(key)) event.respondWith(cueResponse(request));
    return;
  }
  if (url.origin !== ROOT.origin || url.hash) return;
  if ((url.pathname === ROOT.pathname || url.pathname === indexPath ||
       url.pathname === pilotPath || url.pathname === pathFor('session.html') ||
       url.pathname === pathFor('library.html') || url.pathname === pathFor('explore.html') || url.pathname === pathFor('practice.html') || url.pathname === pathFor('still-enough.html') || url.pathname === pathFor('soft-place-to-land.html') || url.pathname === pathFor('let-them-think.html') || url.pathname === pathFor('precious-life.html') || url.pathname === pathFor('sessions/remembering-your-reason/') || url.pathname === pathFor('sessions/when-the-urge-arrives/') || url.pathname === pathFor('sessions/a-new-small-ritual/') || url.pathname === pathFor('sessions/stress-without-the-cigarette/') || url.pathname === pathFor('sessions/the-pause-before-asking/') || url.pathname === pathFor('sessions/after-a-tense-conversation/') || url.pathname === pathFor('sessions/the-abundance-practice/') || url.pathname === pathFor('sessions/the-empowerment-practice/') || url.pathname === pathFor('sessions/before-the-week-starts/') || url.pathname === pathFor('sessions/three-minute-reset/') || url.pathname === pathFor('sessions/five-minute-calm/') || url.pathname === pathFor('sessions/five-minute-morning-clarity/') || url.pathname === pathFor('sessions/a-practice-for-inner-peace/') || url.pathname === pathFor('sessions/calm-confidence-reset/') || url.pathname === pathFor('sessions/clear-your-mind-for-the-day/') || url.pathname === pathFor('sessions/stress-release/') || url.pathname === pathFor('sessions/creativity-reset/') || url.pathname === pathFor('sessions/set-down-guilt/') || url.pathname === pathFor('sessions/abundance-mindset/') || url.pathname === pathFor('sessions/clear-boundaries/') || url.pathname === pathFor('sessions/emotional-clarity/') || url.pathname === pathFor('sessions/evening-settle/') || url.pathname === pathFor('sessions/ground-your-mind/') || url.pathname === pathFor('sessions/let-the-day-close/') || url.pathname === pathFor('sessions/quiet-the-mind/') || url.pathname === pathFor('sessions/reignite-inner-vitality/') || url.pathname === pathFor('sessions/emotional-regulation/') || url.pathname === pathFor('sessions/emotional-softening/') || url.pathname === pathFor('sessions/evening-release/') || url.pathname === pathFor('sessions/evening-unwind/') || url.pathname === pathFor('sessions/gratitude-reset/') || url.pathname === pathFor('sessions/ground-into-your-body/') || url.pathname === pathFor('sessions/morning-calm-activation/') || url.pathname === pathFor('sessions/presence-recharge/') || url.pathname === pathFor('sessions/nervous-system-reset/') || url.pathname === pathFor('sessions/release-anxiety/') || url.pathname === pathFor('sessions/shifting-timelines/') || url.pathname === pathFor('sessions/grounded-in-gratitude/') || url.pathname === pathFor('sessions/quantum-abundance-tuning/') || url.pathname === pathFor('sessions/the-quantum-field/') || url.pathname === pathFor('sessions/pure-connection/') || url.pathname === pathFor('sessions/resonance-of-mind-and-heart/') || url.pathname === pathFor('sessions/universal-creative-energy/') || url.pathname === pathFor('sessions/awakening-to-the-fifth-dimension/') || url.pathname === pathFor('sessions/flow-state-activation/') || url.pathname === pathFor('sessions/vitality-and-balance/') || url.pathname === pathFor('sessions/before-you-say-yes/') || url.pathname === pathFor('sessions/before-you-pick-up-the-phone/') || url.pathname === pathFor('sessions/the-frequency-of-enough/') || url.pathname === pathFor('sessions/connecting-to-abundance/') || url.pathname === pathFor('sessions/still-enough-to-sleep/')) && request.mode === 'navigate') {
    event.respondWith(shellResponse(request, true));
  } else if (url.search) {
    return;
  } else if (audioByKey.has(url.origin + url.pathname)) {
    event.respondWith(audioResponse(request));
  } else if (shellPaths.has(url.pathname)) {
    event.respondWith(shellResponse(request, false));
  } else if (cueKeys.has(url.origin + url.pathname)) {
    event.respondWith(cueResponse(request));
  }
});

async function cueResponse(request) {
  const cache = await caches.open(SESSION_CACHE);
  return (await cache.match(request)) || fetch(request);
}

async function completeResponse(relative, isAudio) {
  const response = await fetch(urlFor(relative), { cache: 'no-store' });
  if (!response.ok || response.status !== 200 || response.headers.has('content-range')) {
    throw new Error(`Could not download ${isAudio ? 'audio' : 'cues'} completely.`);
  }
  const bytes = await response.arrayBuffer();
  if (!bytes.byteLength) throw new Error(`Empty ${isAudio ? 'audio' : 'cue'} file.`);
  const declared = response.headers.get('content-length');
  // Content-Length may describe a compressed wire body while arrayBuffer()
  // contains decoded bytes, especially for JSON served with gzip.
  if (declared && !response.headers.has('content-encoding') &&
      Number(declared) !== bytes.byteLength) throw new Error('Incomplete download.');
  if (!isAudio) {
    try { JSON.parse(new TextDecoder().decode(bytes)); }
    catch (_) { throw new Error('Invalid cue file.'); }
  }
  return new Response(bytes, { status: 200, headers: {
    'Content-Type': isAudio ? 'audio/mpeg' : 'application/json',
    'Content-Length': String(bytes.byteLength)
  } });
}

async function listSaved() {
  const cache = await caches.open(SESSION_CACHE);
  const saved = [];
  for (const [src, cues] of SESSION_FILES) {
    const audio = await cache.match(urlFor(src));
    const cue = cues ? await cache.match(urlFor(cues)) : true;
    if (audio && cue) saved.push(src);
  }
  return saved;
}

async function handleMessage(data) {
  const type = data && data.type;
  if (type === 'LIST_SAVED') return { ok: true, saved: await listSaved() };
  if (type !== 'CACHE_SESSION' && type !== 'REMOVE_SESSION') throw new Error('Unknown offline request.');
  const { src, cues } = validateSession(data.src, data.cues);
  const cache = await caches.open(SESSION_CACHE);
  if (type === 'REMOVE_SESSION') {
    await cache.delete(urlFor(src));
    if (cues) await cache.delete(urlFor(cues));
    return { ok: true, saved: await listSaved() };
  }
  const alreadySaved = await cache.match(urlFor(src)) &&
    (!cues || await cache.match(urlFor(cues)));
  if (!alreadySaved) {
    // Read both entire bodies before writing either one. A failed download cannot
    // turn a partial stream into a purportedly saved session.
    const cueResponse = cues ? await completeResponse(cues, false) : null;
    const audio = await completeResponse(src, true);
    if (cueResponse) await cache.put(urlFor(cues), cueResponse);
    await cache.put(urlFor(src), audio);
  }
  return { ok: true, saved: await listSaved() };
}

self.addEventListener('message', event => {
  const port = event.ports && event.ports[0];
  if (!port) return;
  event.waitUntil((async () => {
    try { port.postMessage(await handleMessage(event.data)); }
    catch (error) {
      let saved = [];
      try { saved = await listSaved(); } catch (_) { /* Storage may be unavailable. */ }
      port.postMessage({ ok: false, error: error && error.message || 'Offline storage failed.', saved });
    }
  })());
});
