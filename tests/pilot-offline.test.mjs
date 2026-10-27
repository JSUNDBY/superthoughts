import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../pilot-sw.js', import.meta.url), 'utf8');
const catalogSource = readFileSync(new URL('../pilot-catalog.js', import.meta.url), 'utf8');
const catalogContext = { window: {} };
vm.runInNewContext(catalogSource, catalogContext, { filename: 'pilot-catalog.js' });
const catalog = Array.from(catalogContext.window.STCatalog, item => ({
  id: item.id, src: item.src, cues: item.cues, stream: item.stream === true
}));
const origin = 'http://localhost:8846/';
const guided = catalog.find(item => item.id === 'gratitude');
const sound = catalog.find(item => item.id === 'warmth');
const saved = response => Array.from(response.saved);

function worker(options = {}) {
  const listeners = new Map();
  const buckets = new Map();
  const fetchCalls = [];
  const allBytes = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  let failPut = null;
  let fetcher = options.fetcher || (async input => {
    const url = typeof input === 'string' ? input : input.url;
    if (url.endsWith('.mp3')) return new Response(allBytes, {
      status: 200, headers: { 'Content-Length': String(allBytes.byteLength) }
    });
    if (url.endsWith('.json')) return new Response('[]', {
      status: 200, headers: { 'Content-Length': '2' }
    });
    return new Response('network shell');
  });
  const key = input => typeof input === 'string' ? input : input.url;
  const context = {
    URL, Request, Response, TextDecoder,
    self: {
      registration: { scope: origin },
      addEventListener(type, callback) { listeners.set(type, callback); },
      skipWaiting: async () => {},
      clients: { claim: async () => {} }
    },
    caches: {
      async open(name) {
        let entries = buckets.get(name);
        if (!entries) buckets.set(name, entries = new Map());
        return {
          async match(input) { return entries.get(key(input))?.clone(); },
          async put(input, response) {
            if (failPut && key(input).endsWith(failPut)) throw Error('Quota exceeded');
            entries.set(key(input), response.clone());
          },
          async delete(input) { return entries.delete(key(input)); },
          async addAll(urls) {
            for (const url of urls) entries.set(url, new Response('cached pilot'));
          }
        };
      },
      async keys() { return [...buckets.keys()]; },
      async delete(name) { return buckets.delete(name); }
    },
    async fetch(input, init) {
      fetchCalls.push(key(input));
      return fetcher(input, init);
    }
  };
  // In a real service worker `self` is the global object.
  context.window = context.self;
  vm.createContext(context);
  context.importScripts = path => {
    assert.equal(path, 'pilot-catalog.js');
    vm.runInContext(options.catalogSource ?? catalogSource, context, { filename: path });
  };
  vm.runInContext(source, context, { filename: 'pilot-sw.js' });
  return {
    buckets,
    fetchCalls,
    setFetcher(next) { fetcher = next; },
    failPutFor(path) { failPut = path; },
    async install() {
      let pending;
      listeners.get('install')({ waitUntil(promise) { pending = promise; } });
      await pending;
    },
    async message(data) {
      let pending;
      let reply;
      listeners.get('message')({
        data,
        ports: [{ postMessage(value) { reply = value; } }],
        waitUntil(promise) { pending = promise; }
      });
      await pending;
      return reply;
    },
    async route(url, { mode = 'cors', range } = {}) {
      let handled;
      const request = {
        method: 'GET', url, mode,
        headers: new Headers(range ? { Range: range } : {})
      };
      listeners.get('fetch')({
        request,
        respondWith(promise) { handled = promise; },
        waitUntil() {}
      });
      return handled && await handled;
    }
  };
}

test('saved audio supports whole, bounded, open, suffix, and invalid byte ranges', async () => {
  const sw = worker();
  const save = await sw.message({ type: 'CACHE_SESSION', ...guided });
  assert.equal(save.ok, true);
  const cases = [
    [undefined, 200, null, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]],
    ['bytes=2-5', 206, 'bytes 2-5/10', [2, 3, 4, 5]],
    ['bytes=7-', 206, 'bytes 7-9/10', [7, 8, 9]],
    ['bytes=-3', 206, 'bytes 7-9/10', [7, 8, 9]],
    ['bytes=50-', 416, 'bytes */10', []],
    ['bytes=0-1,3-4', 416, 'bytes */10', []]
  ];
  for (const [range, status, contentRange, body] of cases) {
    const response = await sw.route(origin + guided.src, { range });
    assert.equal(response.status, status, range);
    assert.equal(response.headers.get('content-range'), contentRange, range);
    assert.equal(response.headers.get('accept-ranges'), 'bytes', range);
    assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], body, range);
  }
});

test('main shell uses live assets, then index fallback for root and pilot aliases offline', async () => {
  const sw = worker();
  await sw.install();
  const live = await sw.route(origin + 'pilot.css');
  assert.equal(await live.text(), 'network shell');
  sw.setFetcher(async () => new Response('pilot redirect page'));
  const aliasOnline = await sw.route(origin + 'pilot.html', { mode: 'navigate' });
  assert.equal(await aliasOnline.text(), 'pilot redirect page');
  sw.setFetcher(async () => { throw Error('offline'); });
  for (const path of ['?session=gratitude', 'index.html?session=gratitude',
    'pilot.html?session=gratitude']) {
    const response = await sw.route(origin + path, { mode: 'navigate' });
    assert.equal(await response.text(), 'cached pilot', path);
  }
  const cachedAsset = await sw.route(origin + 'pilot.css');
  assert.equal(await cachedAsset.text(), 'network shell');
  const dataNote = await sw.route(origin + 'privacy.html', { mode: 'navigate' });
  assert.equal(await dataNote.text(), 'cached pilot');
  assert.equal(await (await sw.route(origin + 'terms.html', { mode: 'navigate' })).text(), 'cached pilot');
  assert.equal(await sw.route(origin + 'audio/gratitude-v3.mp3'), undefined);
  assert.equal(await sw.route(origin + 'pilot.css?v=2'), undefined);
  assert.equal(await sw.route('https://elsewhere.example/pilot.html', { mode: 'navigate' }), undefined);
});

test('a guided session is listed only after audio and cues are complete', async () => {
  const sw = worker();
  assert.deepEqual(saved(await sw.message({ type: 'LIST_SAVED' })), []);
  const result = await sw.message({ type: 'CACHE_SESSION', ...guided });
  assert.equal(result.ok, true);
  assert.deepEqual(saved(result), [guided.src]);
  assert.deepEqual(saved(await sw.message({ type: 'LIST_SAVED' })), [guided.src]);
  assert.deepEqual(sw.fetchCalls, [origin + guided.cues, origin + guided.src]);
  const removed = await sw.message({ type: 'REMOVE_SESSION', ...guided });
  assert.equal(removed.ok, true);
  assert.deepEqual(saved(removed), []);
});

test('every current downloadable catalog session can be saved and removed offline', async () => {
  const sw = worker();
  const local = catalog.filter(item => !item.stream);
  for (const item of local) {
    const result = await sw.message({ type: 'CACHE_SESSION', src: item.src, cues: item.cues });
    assert.equal(result.ok, true, `${item.id}: ${result.error || ''}`);
    assert.ok(saved(result).includes(item.src), item.id);
  }
  assert.deepEqual(saved(await sw.message({ type: 'LIST_SAVED' })), local.map(item => item.src));
  for (const item of local) {
    const result = await sw.message({ type: 'REMOVE_SESSION', src: item.src, cues: item.cues });
    assert.equal(result.ok, true, item.id);
  }
  assert.deepEqual(saved(await sw.message({ type: 'LIST_SAVED' })), []);
});

test('failed cue, incomplete audio, and storage quota failures never report a new save', async () => {
  const cueFailure = worker({ fetcher: async input => {
    if (String(input).endsWith('.json')) throw Error('offline');
    return new Response(Uint8Array.of(1));
  } });
  let result = await cueFailure.message({ type: 'CACHE_SESSION', ...guided });
  assert.equal(result.ok, false);
  assert.deepEqual(saved(result), []);

  const incomplete = worker({ fetcher: async input => {
    if (String(input).endsWith('.json')) return new Response('[]');
    return new Response(Uint8Array.of(1, 2), { headers: { 'Content-Length': '4' } });
  } });
  result = await incomplete.message({ type: 'CACHE_SESSION', ...guided });
  assert.equal(result.ok, false);
  assert.deepEqual(saved(result), []);

  const quota = worker();
  quota.failPutFor(guided.src);
  result = await quota.message({ type: 'CACHE_SESSION', ...guided });
  assert.equal(result.ok, false);
  assert.deepEqual(saved(result), []);
  assert.deepEqual(saved(await quota.message({ type: 'LIST_SAVED' })), []);
});

test('message validation rejects foreign origins, mismatched cues, and path traversal', async () => {
  const sw = worker();
  const bad = [
    { src: 'https://elsewhere.example/' + guided.src, cues: guided.cues },
    { src: '../' + guided.src, cues: guided.cues },
    { src: 'audio/../' + guided.src, cues: guided.cues },
    { src: 'audio/%2e%2e/' + guided.src, cues: guided.cues },
    { src: 'audio/gratitude-v3.mp3', cues: 'audio/gratitude-v3-cues.json' },
    { src: guided.src, cues: catalog.find(item => item.id === 'whole-body').cues },
    { src: sound.src, cues: guided.cues }
  ];
  for (const item of bad) {
    const result = await sw.message({ type: 'CACHE_SESSION', ...item });
    assert.equal(result.ok, false, JSON.stringify(item));
    assert.deepEqual(saved(result), []);
  }
  assert.equal(sw.fetchCalls.length, 0);
});

test('streamed CDN sessions are skipped by the offline allowlist; other hosts still throw', async () => {
  const streamed = { id: 's', src: 'https://superthoughts-audio.b-cdn.net/site/s-v1.mp3', cues: 'audio/s-v1-cues.json', stream: true };
  const sw = worker({ catalogSource: `window.STCatalog = ${JSON.stringify([guided, streamed])};` });
  const result = await sw.message({ type: 'CACHE_SESSION', src: streamed.src, cues: streamed.cues });
  assert.equal(result.ok, false);
  for (const entry of [
    { src: 'https://elsewhere.example/site/s.mp3', cues: null, stream: true },
    { src: 'https://superthoughts-audio.b-cdn.net/deep-sleep/s.mp3', cues: null, stream: true },
    { src: 'https://superthoughts-audio.b-cdn.net/site/s.mp3', cues: null }
  ]) {
    assert.throws(() => worker({ catalogSource: `window.STCatalog = ${JSON.stringify([entry])};` }), /Invalid session catalog path/);
  }
});

test('imported catalog cannot expand the offline allowlist outside audio paths', () => {
  for (const entry of [
    { src: '../private.mp3', cues: null },
    { src: 'https://elsewhere.example/audio/file.mp3', cues: null },
    { src: 'audio/file.mp3?version=1', cues: null },
    { src: 'audio/file.mp3', cues: '../private.json' }
  ]) {
    assert.throws(() => worker({ catalogSource: `window.STCatalog = ${JSON.stringify([entry])};` }),
      /Invalid session catalog path/);
  }
});


test('focused session and practice query routes retain their own shell offline', async () => {
  const sw = worker({fetcher: async input => new Response(String(typeof input === 'string' ? input : input.url))});
  await sw.install();
  for (const page of ['session.html', 'practice.html', 'library.html', 'explore.html', 'still-enough.html', 'soft-place-to-land.html', 'let-them-think.html', 'precious-life.html', 'sessions/remembering-your-reason/', 'sessions/when-the-urge-arrives/', 'sessions/a-new-small-ritual/', 'sessions/stress-without-the-cigarette/', 'sessions/the-pause-before-asking/', 'sessions/after-a-tense-conversation/', 'sessions/the-abundance-practice/', 'sessions/the-empowerment-practice/', 'sessions/before-the-week-starts/', 'sessions/three-minute-reset/', 'sessions/five-minute-calm/', 'sessions/five-minute-morning-clarity/', 'sessions/a-practice-for-inner-peace/', 'sessions/calm-confidence-reset/', 'sessions/clear-your-mind-for-the-day/', 'sessions/stress-release/', 'sessions/creativity-reset/', 'sessions/set-down-guilt/', 'sessions/abundance-mindset/', 'sessions/clear-boundaries/', 'sessions/emotional-clarity/', 'sessions/evening-settle/', 'sessions/ground-your-mind/', 'sessions/let-the-day-close/', 'sessions/quiet-the-mind/', 'sessions/reignite-inner-vitality/', 'sessions/emotional-regulation/', 'sessions/emotional-softening/', 'sessions/evening-release/', 'sessions/evening-unwind/', 'sessions/gratitude-reset/', 'sessions/ground-into-your-body/', 'sessions/morning-calm-activation/', 'sessions/presence-recharge/', 'sessions/nervous-system-reset/', 'sessions/release-anxiety/', 'sessions/shifting-timelines/', 'sessions/grounded-in-gratitude/', 'sessions/quantum-abundance-tuning/', 'sessions/the-quantum-field/', 'sessions/pure-connection/', 'sessions/resonance-of-mind-and-heart/', 'sessions/universal-creative-energy/', 'sessions/awakening-to-the-fifth-dimension/', 'sessions/flow-state-activation/', 'sessions/vitality-and-balance/', 'sessions/before-you-say-yes/', 'sessions/before-you-pick-up-the-phone/', 'sessions/the-frequency-of-enough/', 'sessions/connecting-to-abundance/', 'sessions/still-enough-to-sleep/', 'sessions/when-you-wake-up-already-tense/', 'sessions/two-minutes-between-things/', 'sessions/when-your-mind-wont-stop-at-bedtime/', 'sessions/open-to-receive/', 'sessions/the-quantum-reset/']) {
    await sw.route(origin + page, {mode:'navigate'});
  }
  sw.setFetcher(async () => { throw Error('offline'); });
  for (const page of ['session.html', 'practice.html', 'library.html', 'explore.html', 'still-enough.html', 'soft-place-to-land.html', 'let-them-think.html', 'precious-life.html', 'sessions/remembering-your-reason/', 'sessions/when-the-urge-arrives/', 'sessions/a-new-small-ritual/', 'sessions/stress-without-the-cigarette/', 'sessions/the-pause-before-asking/', 'sessions/after-a-tense-conversation/', 'sessions/the-abundance-practice/', 'sessions/the-empowerment-practice/', 'sessions/before-the-week-starts/', 'sessions/three-minute-reset/', 'sessions/five-minute-calm/', 'sessions/five-minute-morning-clarity/', 'sessions/a-practice-for-inner-peace/', 'sessions/calm-confidence-reset/', 'sessions/clear-your-mind-for-the-day/', 'sessions/stress-release/', 'sessions/creativity-reset/', 'sessions/set-down-guilt/', 'sessions/abundance-mindset/', 'sessions/clear-boundaries/', 'sessions/emotional-clarity/', 'sessions/evening-settle/', 'sessions/ground-your-mind/', 'sessions/let-the-day-close/', 'sessions/quiet-the-mind/', 'sessions/reignite-inner-vitality/', 'sessions/emotional-regulation/', 'sessions/emotional-softening/', 'sessions/evening-release/', 'sessions/evening-unwind/', 'sessions/gratitude-reset/', 'sessions/ground-into-your-body/', 'sessions/morning-calm-activation/', 'sessions/presence-recharge/', 'sessions/nervous-system-reset/', 'sessions/release-anxiety/', 'sessions/shifting-timelines/', 'sessions/grounded-in-gratitude/', 'sessions/quantum-abundance-tuning/', 'sessions/the-quantum-field/', 'sessions/pure-connection/', 'sessions/resonance-of-mind-and-heart/', 'sessions/universal-creative-energy/', 'sessions/awakening-to-the-fifth-dimension/', 'sessions/flow-state-activation/', 'sessions/vitality-and-balance/', 'sessions/before-you-say-yes/', 'sessions/before-you-pick-up-the-phone/', 'sessions/the-frequency-of-enough/', 'sessions/connecting-to-abundance/', 'sessions/still-enough-to-sleep/', 'sessions/when-you-wake-up-already-tense/', 'sessions/two-minutes-between-things/', 'sessions/when-your-mind-wont-stop-at-bedtime/', 'sessions/open-to-receive/', 'sessions/the-quantum-reset/']) {
    const response = await sw.route(origin + page + '?session=warmth', {mode:'navigate'});
    assert.equal(await response.text(), origin + page);
  }
});

test('free sessions on the public audio host save, play offline with ranges, and stay host-scoped', async () => {
  const hosted = { id: 'h', src: 'https://audio.superthoughts.com/free/h-v1.mp3', cues: 'https://audio.superthoughts.com/cues/h-v1-cues.json' };
  const sw = worker({ catalogSource: `window.STCatalog = ${JSON.stringify([guided, hosted])};` });
  const result = await sw.message({ type: 'CACHE_SESSION', src: hosted.src, cues: hosted.cues });
  assert.equal(result.ok, true);
  assert.ok(saved(result).includes(hosted.src));
  assert.deepEqual(sw.fetchCalls, [hosted.cues, hosted.src]);
  sw.setFetcher(async () => { throw new Error('offline'); });
  const part = await sw.route(hosted.src, { mode: 'no-cors', range: 'bytes=2-5' });
  assert.equal(part.status, 206);
  assert.equal(part.headers.get('content-range'), 'bytes 2-5/10');
  const cues = await sw.route(hosted.cues);
  assert.equal(await cues.text(), '[]');
  // Unknown files on the audio host, other folders, and query strings are not handled.
  for (const url of ['https://audio.superthoughts.com/free/other-v1.mp3', 'https://audio.superthoughts.com/review/gCfh7/h-v1.mp3',
                     hosted.src + '?v=1']) {
    assert.equal(await sw.route(url), undefined, url);
  }
  const removed = await sw.message({ type: 'REMOVE_SESSION', src: hosted.src, cues: hosted.cues });
  assert.deepEqual(saved(removed), []);
});

test('the public audio host is only accepted for its free/ audio and cues/ folders', () => {
  for (const entry of [
    { src: 'https://audio.superthoughts.com/library/m-v1.mp3', cues: null },
    { src: 'https://audio.superthoughts.com/review/gCfh7/r.mp3', cues: null },
    { src: 'https://audio.superthoughts.com/free/../library/m.mp3', cues: null },
    { src: 'http://audio.superthoughts.com/free/h-v1.mp3', cues: null },
    { src: 'https://audio.superthoughts.com.evil.example/free/h-v1.mp3', cues: null },
    { src: 'https://audio.superthoughts.com/free/h-v1.mp3', cues: 'https://audio.superthoughts.com/free/h-v1-cues.json' },
    { src: 'https://audio.superthoughts.com/free/h-v1.mp3', cues: 'https://elsewhere.example/cues/h-v1-cues.json' }
  ]) {
    assert.throws(() => worker({ catalogSource: `window.STCatalog = ${JSON.stringify([entry])};` }),
      /Invalid session catalog path/, JSON.stringify(entry));
  }
});

test('a hosted session cannot be saved with another session\'s cues', async () => {
  const a = { id: 'a', src: 'https://audio.superthoughts.com/free/a-v1.mp3', cues: 'https://audio.superthoughts.com/cues/a-v1-cues.json' };
  const b = { id: 'b', src: 'https://audio.superthoughts.com/free/b-v1.mp3', cues: 'https://audio.superthoughts.com/cues/b-v1-cues.json' };
  const sw = worker({ catalogSource: `window.STCatalog = ${JSON.stringify([a, b])};` });
  const result = await sw.message({ type: 'CACHE_SESSION', src: a.src, cues: b.cues });
  assert.equal(result.ok, false);
  assert.equal(sw.fetchCalls.length, 0);
});
