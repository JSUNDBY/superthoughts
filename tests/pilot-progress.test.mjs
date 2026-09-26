import test from 'node:test';
import assert from 'node:assert/strict';
import { createPracticeStore, createPlaybackTracker } from '../pilot-progress.mjs';

class MemoryStorage {
  data = new Map();
  writes = 0;
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { this.writes++; this.data.set(key, value); }
  removeItem(key) { this.data.delete(key); }
}

class FakeAudio {
  currentTime = 0;
  paused = true;
  ended = false;
  playbackRate = 1;
  listeners = new Map();
  addEventListener(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(fn); }
  removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); }
  emit(name) { for (const fn of this.listeners.get(name) || []) fn({ type: name }); }
  play() { this.paused = false; this.ended = false; this.emit('play'); this.emit('playing'); }
  pause() { this.paused = true; this.emit('pause'); }
  seek(seconds) { this.emit('seeking'); this.currentTime = seconds; this.emit('seeked'); }
}

function fixture(initial = new Date(2026, 8, 26, 12), storage = new MemoryStorage()) {
  let ms = new Date(initial).getTime();
  const now = () => new Date(ms);
  const store = createPracticeStore(storage, now);
  const audio = new FakeAudio();
  const completions = [];
  const tracker = createPlaybackTracker(audio, store, { onComplete: id => completions.push(id) });
  return {
    storage, store, audio, tracker, completions, now,
    advance(seconds, mediaSeconds = seconds) { ms += seconds * 1000; audio.currentTime += mediaSeconds; audio.emit('timeupdate'); },
    moveClock(seconds) { ms += seconds * 1000; }
  };
}

test('counts playing time, not paused, waiting, or stalled time', () => {
  const f = fixture();
  f.tracker.select('reset', 100);
  f.audio.play();
  f.advance(10);
  f.audio.pause();
  f.moveClock(20);
  f.audio.currentTime += 20;
  f.audio.emit('timeupdate');
  f.audio.play();
  f.advance(5);
  f.audio.emit('waiting');
  f.moveClock(12);
  f.audio.emit('timeupdate');
  f.audio.emit('playing');
  f.advance(4);
  f.audio.emit('stalled');
  f.moveClock(9);
  f.audio.emit('timeupdate');
  f.audio.emit('playing');
  assert.equal(f.store.snapshot().totalSeconds, 19);
  assert.equal(f.store.snapshot().todaySeconds, 19);
  assert.equal(f.store.snapshot().practiceDays, 1);
  f.tracker.destroy();
});

test('seek near the end does not award completion; replay counts time but completion once per run', () => {
  const f = fixture();
  f.tracker.select('reset', 100);
  f.audio.play();
  f.advance(20);
  f.audio.seek(85);
  f.advance(15);
  assert.equal(f.store.snapshot().completedSessions, 0);
  assert.equal(f.store.snapshot().totalSeconds, 35);
  f.audio.seek(0);
  f.advance(85);
  assert.equal(f.store.snapshot().completedSessions, 1);
  assert.deepEqual(f.completions, ['reset']);
  f.audio.seek(0);
  f.advance(10);
  assert.equal(f.store.snapshot().totalSeconds, 130);
  assert.equal(f.store.snapshot().completedSessions, 1);
  f.tracker.destroy();
});

test('covered ranges and resume position survive reload', () => {
  const first = fixture();
  first.tracker.select('body', 100);
  first.audio.play();
  first.advance(50);
  first.audio.pause();
  assert.equal(first.store.snapshot().resume.body, 50);
  first.tracker.destroy();

  const second = fixture('2026-09-26T12:02:00-05:00', first.storage);
  assert.equal(second.tracker.select('body', 100), 50);
  second.audio.currentTime = 50;
  second.audio.play();
  second.advance(40);
  assert.equal(second.store.snapshot().completedSessions, 1);
  assert.equal(second.store.snapshot().totalSeconds, 90);
  assert.equal(second.store.snapshot().resume.body, undefined);
  second.tracker.destroy();
});

test('credits local calendar days across midnight', () => {
  const f = fixture(new Date(2026, 8, 26, 23, 59, 55));
  f.tracker.select('reset', 100);
  f.audio.play();
  f.advance(10);
  assert.equal(f.store.snapshot().practiceDays, 2);
  assert.equal(f.store.snapshot().todaySeconds, 5);
  assert.equal(f.store.snapshot().totalSeconds, 10);
  f.tracker.destroy();
});

test('clear resets state and prevents active tracker from restoring prior listening', () => {
  const f = fixture();
  f.tracker.select('reset', 100);
  f.audio.play();
  f.advance(25);
  f.store.toggleFavorite('reset');
  f.store.setGoal(20);
  f.store.clear();
  f.tracker.flush();
  assert.deepEqual(f.store.snapshot(), {
    totalSeconds: 0, completedSessions: 0, practiceDays: 0, todaySeconds: 0,
    goalMinutes: 0, favorites: [], resume: {}, lastSessionId: null,
    hasHistory: false, storageAvailable: true
  });
  f.advance(5);
  assert.equal(f.store.snapshot().totalSeconds, 5);
  assert.equal(f.store.snapshot().lastSessionId, 'reset');
  f.tracker.destroy();
});

test('select before source change cannot save the old track position as the new resume point', () => {
  const f = fixture();
  f.tracker.select('first', 100);
  f.audio.play();
  f.advance(25);
  f.tracker.select('second', 100);
  f.audio.pause(); // A browser may deliver this while swapping the source.
  assert.equal(f.store.snapshot().resume.first, 25);
  assert.equal(f.store.snapshot().resume.second, undefined);
  f.audio.currentTime = 0;
  f.audio.play();
  f.advance(10);
  assert.equal(f.store.snapshot().resume.second, 10);
  f.tracker.destroy();
});

test('corrupt or disabled storage is safe and invalid values are bounded', () => {
  const broken = new MemoryStorage();
  broken.setItem('st_pilot_practice_v1', '{');
  assert.equal(createPracticeStore(broken).snapshot().totalSeconds, 0);
  broken.setItem('st_pilot_practice_v1', JSON.stringify({
    totalSeconds: -100, completedSessions: 1e99, goalMinutes: 1e99,
    favorites: ['reset', 'reset', null], resume: { reset: -3, body: 1e99 },
    days: { '2026-09-26': -4, '2026-09-25': 4 }
  }));
  const snapshot = createPracticeStore(broken).snapshot();
  assert.equal(snapshot.totalSeconds, 0);
  assert.equal(snapshot.completedSessions, 100_000);
  assert.equal(snapshot.goalMinutes, 240);
  assert.deepEqual(snapshot.favorites, ['reset']);
  assert.equal(snapshot.resume.body, 86_400);
  assert.equal(snapshot.practiceDays, 1);

  const optional = new MemoryStorage();
  const optionalStore = createPracticeStore(optional);
  assert.equal(optionalStore.snapshot().goalMinutes, 0);
  optionalStore.setGoal(20);
  optionalStore.setGoal(0);
  assert.equal(createPracticeStore(optional).snapshot().goalMinutes, 0);

  const denied = { getItem() { throw Error('disabled'); }, setItem() { throw Error('disabled'); } };
  const store = createPracticeStore(denied);
  assert.equal(store.snapshot().storageAvailable, false);
  store.setGoal(15);
  assert.equal(store.snapshot().goalMinutes, 15);
});

test('seeking event after currentTime changes does not credit the jump', () => {
  const f = fixture();
  f.tracker.select('reset', 100);
  f.audio.play();
  f.advance(10);
  f.moveClock(1);
  f.audio.currentTime = 90;
  f.audio.emit('seeking');
  f.audio.emit('seeked');
  f.advance(10);
  assert.equal(f.store.snapshot().totalSeconds, 20);
  assert.equal(f.store.snapshot().completedSessions, 0);
  f.tracker.destroy();
});

test('sparse timeupdates and playback rate changes credit elapsed listening time', () => {
  const f = fixture();
  f.tracker.select('long', 200);
  f.audio.play();
  f.advance(40); // A sparse timeupdate still represents continuous playback.
  f.moveClock(5);
  f.audio.currentTime += 5; // Rate change can arrive before another timeupdate.
  f.audio.playbackRate = 2;
  f.audio.emit('ratechange');
  f.advance(20, 40);
  assert.equal(f.store.snapshot().totalSeconds, 65);
  assert.equal(f.store.snapshot().todaySeconds, 65);
  f.tracker.destroy();
});

test('reselecting a completed recording starts a new completion run', () => {
  const f = fixture();
  f.tracker.select('reset', 100);
  f.audio.play();
  f.advance(90);
  assert.equal(f.store.snapshot().completedSessions, 1);
  f.tracker.select('reset', 100);
  f.audio.pause();
  f.audio.currentTime = 0;
  f.audio.play();
  f.advance(90);
  assert.equal(f.store.snapshot().completedSessions, 2);
  assert.deepEqual(f.completions, ['reset', 'reset']);
  f.tracker.destroy();
});

test('explicit restart discards incomplete coverage and saves the new place after pause', () => {
  const f = fixture();
  f.tracker.select('reset', 100);
  f.audio.play();
  f.advance(80);
  f.audio.pause();
  assert.equal(f.store.snapshot().resume.reset, 80);

  assert.equal(f.tracker.select('reset', 100, { restart: true }), 0);
  f.audio.currentTime = 0;
  f.audio.play();
  f.advance(10);
  f.audio.pause();
  assert.equal(f.store.snapshot().completedSessions, 0);
  assert.equal(f.store.snapshot().totalSeconds, 90);
  assert.equal(f.store.snapshot().resume.reset, 10);

  const loaded = createPracticeStore(f.storage, f.now).snapshot();
  assert.equal(loaded.completedSessions, 0);
  assert.equal(loaded.resume.reset, 10);
  f.tracker.destroy();
});

test('routine timeupdates are throttled, and pause persists the latest position', () => {
  const f = fixture();
  f.tracker.select('reset', 100);
  const initialWrites = f.storage.writes;
  f.audio.play();
  for (let i = 0; i < 8; i++) f.advance(0.25);
  assert.ok(f.storage.writes - initialWrites <= 2);
  f.audio.pause();
  const reloaded = createPracticeStore(f.storage, f.now).snapshot();
  assert.equal(reloaded.totalSeconds, 2);
  assert.equal(reloaded.resume.reset, 2);
  f.tracker.destroy();
});
