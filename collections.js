// Existing shared links keep leading directly to their listening room.
if (!document.body.classList.contains('page-session') && !document.body.classList.contains('page-practice')) {
  const id = new URLSearchParams(location.search).get('session');
  if ((window.STCatalog || []).some(item => item.id === id)) location.replace(({'still-enough-to-listen':'still-enough.html','soft-place-to-land':'soft-place-to-land.html'})[id] || `session.html?session=${encodeURIComponent(id)}`);
}
const entries = {
  morning: { title: 'Begin gently', description: 'A little room to choose how your day begins.' },
  reset: { title: 'Come back to yourself', description: 'Short pauses for the middle of it all.' },
  evening: { title: 'Sleep', description: 'A softer pace when the day is winding down.' },
  sound: { title: 'Just listen', description: 'No words to follow. Only space to listen.' },
};

if (document.body.classList.contains('page-practice')) {
  const title = document.getElementById('library-title');
  const intro = document.querySelector('.library .section-intro > p');
  const renderHeading = key => {
    const entry = entries[key];
    title.textContent = entry ? entry.title : key === 'favorites' ? 'Your saved sessions' : 'The library';
    const period = document.createElement('span');
    period.className = 'title-period';
    period.textContent = '.';
    title.append(period);
    intro.textContent = entry?.description || (key === 'favorites' ? 'Your favorites, here whenever you need them.' : 'Find a practice for the moment you are in.');
    document.title = `${entry?.title || (key === 'favorites' ? 'Saved sessions' : 'Explore practices')} · Superthoughts`;
  };
  const initial = new URLSearchParams(location.search).get('practice');
  renderHeading(entries[initial] ? initial : 'all');
  for (const button of document.querySelectorAll('[data-filter]')) {
    button.addEventListener('click', () => {
      const key = button.dataset.filter;
      renderHeading(key);
      const url = new URL(location.href);
      if (entries[key]) url.searchParams.set('practice', key);
      else url.searchParams.delete('practice');
      history.replaceState(null, '', url);
    });
  }
}

if (document.body.classList.contains('page-session')) {
  const requested = new URLSearchParams(location.search).get('session');
  const item = (window.STCatalog || []).find(entry => entry.id === requested);
  if (item) {
    document.title = `${item.title} · Superthoughts`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', item.description);
  }
  const back = document.getElementById('session-back');
  try {
    const previous = new URL(document.referrer);
    if (previous.origin === location.origin && previous.pathname.endsWith('/practice.html')) back.href = previous.href;
  } catch {}
  const button = document.getElementById('fullscreen-button');
  const shell = document.getElementById('player-shell');
  const updateButton = () => {
    const full = document.fullscreenElement === shell || document.webkitFullscreenElement === shell;
    button.setAttribute('aria-pressed', String(full));
    button.textContent = full ? 'Exit full screen' : 'Full screen';
  };
  button.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      } else if (shell.requestFullscreen) await shell.requestFullscreen();
      else if (shell.webkitRequestFullscreen) shell.webkitRequestFullscreen();
      else {
        document.body.classList.toggle('css-fullscreen');
        button.setAttribute('aria-pressed', String(document.body.classList.contains('css-fullscreen')));
        button.textContent = document.body.classList.contains('css-fullscreen') ? 'Exit full screen' : 'Full screen';
      }
    } catch {
      document.body.classList.toggle('css-fullscreen');
      button.setAttribute('aria-pressed', String(document.body.classList.contains('css-fullscreen')));
      button.textContent = document.body.classList.contains('css-fullscreen') ? 'Exit full screen' : 'Full screen';
    }
  });
  document.addEventListener('fullscreenchange', updateButton);
  document.addEventListener('webkitfullscreenchange', updateButton);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && (document.fullscreenElement || document.webkitFullscreenElement)) {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else document.webkitExitFullscreen?.();
    }
    if (event.key === 'Escape' && document.body.classList.contains('css-fullscreen')) {
      document.body.classList.remove('css-fullscreen');
      button.setAttribute('aria-pressed', 'false');
      button.textContent = 'Full screen';
    }
  });
}
