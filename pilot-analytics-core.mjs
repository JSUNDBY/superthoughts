/* Consent-gated listening measurement. No network or storage access lives here. */
const MILESTONES = [25, 50, 75];
const MAX_RANGES = 512;
const MAX_DURATION = 24 * 60 * 60;

function mergeRanges(ranges, start, end) {
  if (!(end > start)) return ranges;
  const ordered = [...ranges, [start, end]].sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const range of ordered) {
    const last = merged.at(-1);
    if (last && range[0] <= last[1] + 0.05) last[1] = Math.max(last[1], range[1]);
    else merged.push([...range]);
  }
  // Keep the longest sections if an unusual playback creates too many fragments.
  if (merged.length > MAX_RANGES) return merged.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0])).slice(0, MAX_RANGES).sort((a, b) => a[0] - b[0]);
  return merged;
}

export function createListeningAnalytics({ audio, catalog, baseUrl, now = () => performance.now(), emit }) {
  const sourceMap = new Map();
  for (const item of catalog || []) {
    if (!item?.id || !item.src || !item.title || !item.category) continue;
    try { sourceMap.set(new URL(item.src, baseUrl).href, item); } catch {}
  }
  let enabled = false;
  let selected = null;
  let ranges = [];
  let playedSeconds = 0;
  let unsentSeconds = 0;
  let sentStart = false;
  let sentCompletion = false;
  let sentMilestones = new Set();
  let lastAt = null;
  let lastPosition = null;
  let lastRate = 1;
  let playing = false;
  let waiting = false;
  let seeking = false;
  let destroyed = false;

  const currentItem = () => sourceMap.get(audio.src || audio.currentSrc) || null;
  const position = () => Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
  const clock = () => { const value = Number(now()); return Number.isFinite(value) ? value : 0; };
  const rate = () => { const value = Number(audio.playbackRate); return Number.isFinite(value) && value > 0 ? Math.min(4, Math.max(.25, value)) : 1; };
  const canCount = () => enabled && selected && !audio.paused && !audio.ended && !waiting && !seeking;
  const duration = () => {
    const measured = Number(audio.duration);
    const value = Number.isFinite(measured) && measured > 0 ? measured : Number(selected?.duration);
    return Number.isFinite(value) && value > 0 ? Math.min(MAX_DURATION, value) : 0;
  };
  const payload = extra => ({
    experience_id: selected.id,
    experience_title: selected.title,
    experience_category: selected.category,
    experience_type: selected.type === 'sound' ? 'sound' : 'guided',
    ...extra
  });
  const send = (name, extra = {}) => { if (enabled && selected) emit(name, payload(extra)); };
  const flushTime = force => {
    if (!enabled || !selected || (!force && unsentSeconds < 30)) return;
    const delta = Math.round(unsentSeconds * 10) / 10;
    if (delta < .1) return;
    unsentSeconds = Math.max(0, unsentSeconds - delta);
    send('listen_time', { listening_seconds: delta });
  };
  const resetSample = () => { lastAt = clock(); lastPosition = position(); lastRate = rate(); playing = Boolean(canCount()); };
  const resetRun = item => {
    selected = item;
    ranges = [];
    playedSeconds = 0;
    unsentSeconds = 0;
    sentStart = false;
    sentCompletion = false;
    sentMilestones = new Set();
    waiting = false;
    seeking = false;
    resetSample();
    playing = false;
  };
  const syncSource = () => {
    const item = currentItem();
    if (item?.id !== selected?.id || !item) { flushTime(true); resetRun(item); }
  };
  const sample = () => {
    if (!enabled || !selected) return;
    const at = clock(), end = position();
    const wall = (at - lastAt) / 1000;
    const media = end - lastPosition;
    if (playing && Number.isFinite(wall) && wall > 0 && media > 0 && media <= wall * lastRate + .75) {
      const credited = Math.min(wall, media / lastRate);
      if (!sentStart) { sentStart = true; send('listen_start'); }
      playedSeconds += credited;
      unsentSeconds += credited;
      flushTime(false);
      const limit = duration();
      if (limit > 0) {
        ranges = mergeRanges(ranges, Math.max(0, Math.min(limit, lastPosition)), Math.max(0, Math.min(limit, end)));
        const covered = ranges.reduce((sum, [start, finish]) => sum + finish - start, 0);
        const percent = Math.min(100, 100 * covered / limit);
        for (const milestone of MILESTONES) {
          if (percent >= milestone && !sentMilestones.has(milestone)) {
            sentMilestones.add(milestone);
            send('listen_milestone', { milestone_percent: milestone, coverage_percent: Math.floor(percent) });
          }
        }
        if (percent >= 90 && !sentCompletion) {
          sentCompletion = true;
          send('listen_complete', { coverage_percent: Math.floor(percent) });
        }
      }
    }
    lastAt = at;
    lastPosition = end;
    lastRate = rate();
  };
  const handle = event => {
    if (destroyed || !enabled) return;
    syncSource();
    if (!selected) return;
    if (event.type === 'seeking') resetSample();
    else sample();
    if (['pause', 'ended', 'waiting', 'stalled', 'loadstart'].includes(event.type)) flushTime(true);
    if (event.type === 'waiting' || event.type === 'stalled') waiting = true;
    if (event.type === 'seeking') seeking = true;
    if (event.type === 'canplay' || event.type === 'playing') waiting = false;
    if (event.type === 'seeked') seeking = false;
    if (event.type === 'playing' && !sentStart) { sentStart = true; send('listen_start'); }
    if (event.type === 'ended') {
      // A new explicit play after the end is a new listen.
      resetRun(selected);
    } else {
      resetSample();
    }
  };
  const events = ['loadstart', 'playing', 'pause', 'timeupdate', 'waiting', 'stalled', 'canplay', 'seeking', 'seeked', 'ended', 'ratechange'];
  for (const name of events) audio.addEventListener(name, handle);
  return {
    enable() { if (destroyed || enabled) return; enabled = true; syncSource(); resetSample(); },
    disable() { enabled = false; resetRun(null); },
    flush() { if (enabled) { syncSource(); sample(); flushTime(true); resetSample(); } },
    destroy() { if (destroyed) return; this.flush(); destroyed = true; for (const name of events) audio.removeEventListener(name, handle); },
    snapshot() { return { enabled, sessionId: selected?.id || null, playedSeconds, unsentSeconds, ranges: ranges.map(pair => [...pair]), sentStart, sentCompletion, milestones: [...sentMilestones] }; }
  };
}
