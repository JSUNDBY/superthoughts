/* Optional offline support for the pilot. This worker ignores the rest of the site. */
'use strict';

const SHELL_CACHE = 'superthoughts-pilot-shell-v23-sleep';
const SESSION_CACHE = 'superthoughts-pilot-sessions-v1';
const ROOT = new URL(self.registration.scope);
const SHELL_FILES = [
  'index.html', 'session.html', 'practice.html', 'navigation.css', 'collections.js', 'pilot.html', 'privacy.html', 'pilot.css', 'pilot.js', 'pilot-catalog.js',
  'pilot-visuals.js', 'pilot-progress.mjs', 'pilot-offline.js',
  'pilot-feedback.js', 'pilot-analytics.js', 'pilot-analytics-core.mjs', 'terms.html', 'pilot.webmanifest',
  'images/favicon.svg', 'images/superthoughts-symbol.svg',
  'fonts/dm-sans-300.woff2', 'fonts/fonts.css', 'fonts/space-grotesk-400.woff2'
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
    const src = item && item.src;
    const cues = item && item.cues;
    // Restrict the imported data to versioned same-origin audio and cue paths.
    if (typeof src !== 'string' || !/^audio\/[a-z0-9][a-z0-9-]*\.mp3$/.test(src) ||
        !(cues === null || (typeof cues === 'string' && /^audio\/[a-z0-9][a-z0-9-]*-cues\.json$/.test(cues))) ||
        files.has(src)) throw new Error('Invalid session catalog path.');
    files.set(src, cues);
  }
  return files;
})();

const pathFor = relative => new URL(relative, ROOT).pathname;
const urlFor = relative => new URL(relative, ROOT).href;
const shellPaths = new Set(SHELL_FILES.map(pathFor));
const audioByPath = new Map([...SESSION_FILES].map(([src, cues]) => [pathFor(src), { src, cues }]));
const cuePaths = new Set([...SESSION_FILES.values()].filter(Boolean).map(pathFor));
const indexPath = pathFor('index.html');
const pilotPath = pathFor('pilot.html');

function cleanPath(raw) {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    if (raw.includes('\\') || /(?:^|\/)\.\.?(?=\/|[?#]|$)/.test(decoded)) return null;
    const url = new URL(raw, ROOT);
    if (url.origin !== ROOT.origin || url.search || url.hash ||
        !url.pathname.startsWith(ROOT.pathname)) return null;
    return url.pathname;
  } catch (_) {
    return null;
  }
}

function validateSession(src, cues) {
  const path = cleanPath(src);
  const session = audioByPath.get(path);
  if (!session) throw new Error('Unknown session audio.');
  if (session.cues === null) {
    if (cues !== null && cues !== undefined && cues !== '') throw new Error('Unexpected cue file.');
  } else if (cleanPath(cues) !== pathFor(session.cues)) {
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
  const canonical = urlFor(isNavigation ? (['session.html', 'practice.html'].find(file => pathFor(file) === requestPath) || 'index.html') :
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
  if (url.origin !== ROOT.origin || url.hash) return;
  if ((url.pathname === ROOT.pathname || url.pathname === indexPath ||
       url.pathname === pilotPath || url.pathname === pathFor('session.html') ||
       url.pathname === pathFor('practice.html')) && request.mode === 'navigate') {
    event.respondWith(shellResponse(request, true));
  } else if (url.search) {
    return;
  } else if (audioByPath.has(url.pathname)) {
    event.respondWith(audioResponse(request));
  } else if (shellPaths.has(url.pathname)) {
    event.respondWith(shellResponse(request, false));
  } else if (cuePaths.has(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(SESSION_CACHE);
      return (await cache.match(request)) || fetch(request);
    })());
  }
});

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
