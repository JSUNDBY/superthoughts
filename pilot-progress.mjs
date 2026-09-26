/* Device-local practice history. No identifiers or listening data leave this module.
   Concurrent tabs keep separate in-memory snapshots; the last write wins. */
const KEY = 'st_pilot_practice_v1';
const MAX_SECONDS = 10_000_000;
const MAX_DURATION = 24 * 60 * 60;
const MAX_RANGES = 512;

const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, low, high) => Math.min(high, Math.max(low, finite(value)));
const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 120;
const localDay = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dateFrom = value => value instanceof Date ? value : new Date(value);

function cleanRanges(value, duration) {
  if (!Array.isArray(value)) return [];
  const ranges = value.slice(0, 2048).filter(pair => Array.isArray(pair) && pair.length === 2)
    .map(([start, end]) => [clamp(start, 0, duration), clamp(end, 0, duration)])
    .filter(([start, end]) => end > start).sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const range of ranges) {
    const last = merged.at(-1);
    if (last && range[0] <= last[1] + 0.05) last[1] = Math.max(last[1], range[1]);
    else merged.push(range);
  }
  // Dropping the smallest fragments can undercount, but can never award unearned completion.
  if (merged.length > MAX_RANGES) return merged.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0])).slice(0, MAX_RANGES).sort((a, b) => a[0] - b[0]);
  return merged;
}

function cleanState(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const days = {};
  if (source.days && typeof source.days === 'object') {
    for (const [day, seconds] of Object.entries(source.days).slice(-730)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(day) && finite(seconds) > 0) days[day] = clamp(seconds, 0, MAX_SECONDS);
    }
  }
  const trimmedDays = Object.fromEntries(Object.entries(days).sort(([a], [b]) => a.localeCompare(b)).slice(-365));
  const resume = {};
  if (source.resume && typeof source.resume === 'object') {
    for (const [id, seconds] of Object.entries(source.resume).slice(0, 100)) {
      if (validId(id) && finite(seconds) > 0) resume[id] = clamp(seconds, 0, MAX_DURATION);
    }
  }
  const runs = {};
  if (source.runs && typeof source.runs === 'object') {
    for (const [id, run] of Object.entries(source.runs).slice(0, 100)) {
      if (!validId(id) || !run || typeof run !== 'object') continue;
      const duration = clamp(run.duration, 0, MAX_DURATION);
      if (duration <= 0) continue;
      runs[id] = { duration, ranges: cleanRanges(run.ranges, duration), completed: run.completed === true };
    }
  }
  return {
    totalSeconds: clamp(source.totalSeconds, 0, MAX_SECONDS),
    completedSessions: Math.floor(clamp(source.completedSessions, 0, 100_000)),
    days: trimmedDays,
    goalMinutes: Math.floor(clamp(source.goalMinutes ?? 0, 0, 240)),
    favorites: Array.isArray(source.favorites) ? [...new Set(source.favorites.filter(validId))].slice(0, 100) : [],
    resume,
    runs,
    lastSessionId: validId(source.lastSessionId) ? source.lastSessionId : null
  };
}

export function createPracticeStore(storage, now = () => new Date()) {
  let available = Boolean(storage);
  let raw = null;
  if (available) {
    try { raw = storage.getItem(KEY); } catch { available = false; }
  }
  let state;
  try { state = cleanState(raw ? JSON.parse(raw) : null); } catch { state = cleanState(null); }
  let epoch = 0;
  const currentDate = () => {
    const date = dateFrom(now());
    return Number.isFinite(date.getTime()) ? date : new Date();
  };
  let lastSavedAt = -Infinity;
  let pending = false;
  const save = (force = false) => {
    pending = true;
    if (!available) return;
    const timestamp = currentDate().getTime();
    if (!force && timestamp - lastSavedAt < 2000) return;
    try {
      storage.setItem(KEY, JSON.stringify(state));
      lastSavedAt = timestamp;
      pending = false;
    } catch { available = false; }
  };
  const store = {
    _now: currentDate,
    snapshot() {
      const today = localDay(currentDate());
      return {
        totalSeconds: state.totalSeconds,
        completedSessions: state.completedSessions,
        practiceDays: Object.values(state.days).filter(seconds => seconds > 0).length,
        todaySeconds: state.days[today] || 0,
        goalMinutes: state.goalMinutes,
        favorites: [...state.favorites],
        resume: { ...state.resume },
        lastSessionId: state.lastSessionId,
        hasHistory: state.totalSeconds > 0 || state.completedSessions > 0,
        storageAvailable: available
      };
    },
    setGoal(minutes) {
      if (!Number.isFinite(Number(minutes))) return store.snapshot();
      state.goalMinutes = Math.round(clamp(minutes, 0, 240));
      save(true);
      return store.snapshot();
    },
    toggleFavorite(id) {
      if (!validId(id)) return store.snapshot();
      state.favorites = state.favorites.includes(id) ? state.favorites.filter(item => item !== id)
        : [...state.favorites, id].slice(-100);
      save(true);
      return store.snapshot();
    },
    clear() {
      epoch += 1;
      state = cleanState(null);
      pending = false;
      lastSavedAt = -Infinity;
      if (available) {
        try { storage.removeItem(KEY); } catch { available = false; }
      }
      return store.snapshot();
    },
    _epoch() { return epoch; },
    _flush() { if (pending) save(true); },
    _begin(id, duration, restart = false) {
      if (!validId(id)) return 0;
      duration = clamp(duration, 0, MAX_DURATION);
      state.lastSessionId = id;
      const previous = state.runs[id];
      if (restart) { delete state.runs[id]; delete state.resume[id]; }
      if (duration > 0 && (restart || !previous || previous.completed || Math.abs(previous.duration - duration) > 2)) {
        state.runs[id] = { duration, ranges: [], completed: false };
        if (previous && Math.abs(previous.duration - duration) > 2) delete state.resume[id];
      }
      save(true);
      return state.resume[id] || 0;
    },
    _record(id, duration, startMs, endMs, startPosition, endPosition, creditedSeconds) {
      if (!validId(id) || !Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return false;
      duration = clamp(duration, 0, MAX_DURATION);
      const seconds = clamp(creditedSeconds, 0, (endMs - startMs) / 1000);
      if (seconds <= 0) return false;
      state.lastSessionId = id;
      state.totalSeconds = clamp(state.totalSeconds + seconds, 0, MAX_SECONDS);
      let cursor = startMs;
      while (cursor < endMs) {
        const date = new Date(cursor);
        const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
        const boundary = Math.min(endMs, next > cursor ? next : endMs);
        const credited = seconds * (boundary - cursor) / (endMs - startMs);
        const day = localDay(date);
        state.days[day] = clamp((state.days[day] || 0) + credited, 0, MAX_SECONDS);
        cursor = boundary;
      }
      state.days = Object.fromEntries(Object.entries(state.days).sort(([a], [b]) => a.localeCompare(b)).slice(-365));
      let completed = false;
      if (duration > 0) {
        const run = state.runs[id] || { duration, ranges: [], completed: false };
        run.duration = duration;
        run.ranges = cleanRanges([...run.ranges, [startPosition, endPosition]], duration);
        if (!run.completed && run.ranges.reduce((sum, [a, b]) => sum + b - a, 0) >= duration * 0.9) {
          run.completed = true;
          state.completedSessions = Math.min(100_000, state.completedSessions + 1);
          delete state.resume[id];
          completed = true;
        }
        state.runs[id] = run;
      }
      save(completed);
      return completed;
    },
    _position(id, seconds, duration) {
      if (!validId(id)) return;
      const run = state.runs[id];
      if (run?.completed) {
        if (id in state.resume) { delete state.resume[id]; save(); }
        return;
      }
      const limit = clamp(duration, 0, MAX_DURATION);
      const position = clamp(seconds, 0, limit || MAX_DURATION);
      if (position > 0 && (!limit || position < limit - 2)) {
        if (Math.abs((state.resume[id] ?? -1) - position) < 0.1) return;
        state.resume[id] = position;
      } else {
        if (!(id in state.resume)) return;
        delete state.resume[id];
      }
      save();
    }
  };
  return store;
}

export function createPlaybackTracker(audio, store, { onUpdate, onComplete } = {}) {
  let id = null;
  let duration = 0;
  let lastMs = null;
  let lastPosition = null;
  let active = false;
  let waiting = false;
  let seeking = false;
  let armed = false;
  let sampleRate = 1;
  let destroyed = false;
  let epoch = store._epoch();
  const clock = () => dateFrom(store._now?.() || new Date()).getTime();
  // Store's injected clock also drives tracker sampling in deterministic tests.
  const time = () => { const value = clock(); return Number.isFinite(value) ? value : Date.now(); };
  const position = () => finite(audio.currentTime);
  const canPlay = () => id && !audio.paused && !audio.ended && !waiting && !seeking;
  const notify = () => { if (typeof onUpdate === 'function') onUpdate(store.snapshot()); };
  const resetSample = () => {
    lastMs = time();
    lastPosition = position();
    sampleRate = clamp(audio.playbackRate || 1, 0.25, 4);
    active = Boolean(canPlay());
  };
  const sample = () => {
    if (destroyed || !id) return false;
    if (epoch !== store._epoch()) {
      epoch = store._epoch();
      resetSample();
      return false;
    }
    const endMs = time();
    const endPosition = position();
    if (active && Number.isFinite(lastMs) && Number.isFinite(lastPosition)) {
      const wall = (endMs - lastMs) / 1000;
      const media = endPosition - lastPosition;
      const rate = sampleRate;
      if (wall > 0 && media > 0 && media <= wall * rate + 0.75) {
        const credited = Math.min(wall, media / rate);
        if (store._record(id, duration, lastMs, endMs, lastPosition, endPosition, credited)) {
          if (typeof onComplete === 'function') onComplete(id, store.snapshot());
        }
        notify();
      }
    }
    lastMs = endMs;
    lastPosition = endPosition;
    return true;
  };
  const handle = event => {
    if (destroyed) return;
    // A seek can change currentTime before its event arrives; never credit that jump.
    const sampled = event.type === 'seeking' ? (resetSample(), false) : sample();
    if (event.type === 'waiting' || event.type === 'stalled') waiting = true;
    if (event.type === 'seeking') seeking = true;
    if (event.type === 'playing' || event.type === 'canplay') waiting = false;
    if (event.type === 'seeked') seeking = false;
    if (event.type === 'play' || event.type === 'playing') armed = true;
    if (event.type === 'ratechange') sampleRate = clamp(audio.playbackRate || 1, 0.25, 4);
    active = Boolean(canPlay());
    if (armed && sampled && id && ['pause', 'ended', 'seeked', 'timeupdate'].includes(event.type)) store._position(id, position(), duration);
    if (event.type === 'pause' || event.type === 'ended') store._flush();
    if (event.type === 'ended') notify();
  };
  const events = ['play', 'playing', 'pause', 'timeupdate', 'waiting', 'stalled', 'canplay', 'seeking', 'seeked', 'ended', 'ratechange'];
  for (const event of events) audio.addEventListener(event, handle);
  // The page can disappear without another timeupdate event.
  const pagehide = () => tracker.flush();
  if (typeof window !== 'undefined') window.addEventListener('pagehide', pagehide);
  const tracker = {
    select(nextId, nextDuration, { restart = false } = {}) {
      if (destroyed) return 0;
      tracker.flush();
      id = validId(nextId) ? nextId : null;
      duration = clamp(nextDuration, 0, MAX_DURATION);
      const resume = id ? store._begin(id, duration, restart) : 0;
      epoch = store._epoch();
      waiting = false;
      seeking = false;
      armed = false;
      resetSample();
      active = false; // Wait for a play event after the caller changes the source.
      notify();
      return resume;
    },
    flush() {
      if (destroyed || !id) return;
      if (sample() && armed) store._position(id, position(), duration);
      store._flush();
      active = Boolean(canPlay());
    },
    destroy() {
      if (destroyed) return;
      tracker.flush();
      destroyed = true;
      for (const event of events) audio.removeEventListener(event, handle);
      if (typeof window !== 'undefined') window.removeEventListener('pagehide', pagehide);
    }
  };
  return tracker;
}
