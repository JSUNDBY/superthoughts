// Films load only for visible artwork. The still image always remains underneath.
(() => {
  const films = [...document.querySelectorAll('video[data-motion]')];
  const button = document.getElementById('home-motion');
  if (!films.length || !button) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const phone = matchMedia('(max-width: 600px)');
  const connection = navigator.connection;
  let userPaused = false;
  let desired = new Set();
  const visibility = new Map();

  const restricted = () => reducedMotion.matches || connection?.saveData === true;
  const stop = film => {
    film.pause();
    film.parentElement.classList.remove('is-moving');
  };

  function sync() {
    const blocked = restricted();
    const paused = blocked || userPaused;
    const limit = phone.matches ? 1 : 2;
    button.disabled = blocked;
    button.textContent = blocked ? 'Artwork still for this device' : userPaused ? 'Play artwork' : 'Pause artwork';
    button.setAttribute('aria-pressed', String(paused));

    const chosen = new Set();
    if (!paused && !document.hidden) {
      const eligible = films.filter(film => (visibility.get(film) || 0) >= .15);
      eligible.sort((a, b) => {
        const ratio = (visibility.get(b) || 0) - (visibility.get(a) || 0);
        if (Math.abs(ratio) > .05) return ratio;
        const center = innerHeight / 2;
        const distance = film => Math.abs((film.getBoundingClientRect().top + film.getBoundingClientRect().bottom) / 2 - center);
        return distance(a) - distance(b);
      });
      eligible.slice(0, limit).forEach(film => chosen.add(film));
    }

    desired = chosen;
    films.forEach(film => {
      if (!chosen.has(film)) { stop(film); return; }
      if (!film.src) film.src = film.dataset.motion;
      if (!film.paused) { film.parentElement.classList.add('is-moving'); return; }
      film.play().then(() => {
        if (restricted() || userPaused || document.hidden || !desired.has(film)) stop(film);
        else film.parentElement.classList.add('is-moving');
      }).catch(() => stop(film));
    });
  }

  if ('IntersectionObserver' in window) {
    const watcher = new IntersectionObserver(entries => {
      entries.forEach(entry => visibility.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0));
      sync();
    }, { threshold: [0, .15, .3, .5, .75, 1] });
    films.forEach(film => watcher.observe(film));
  } else {
    let queued = false;
    const checkVisibility = () => {
      queued = false;
      films.forEach(film => {
        const rect = film.getBoundingClientRect();
        const overlap = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0));
        visibility.set(film, overlap / Math.max(1, rect.height));
      });
      sync();
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(checkVisibility); } };
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
    queue();
  }

  button.addEventListener('click', () => { userPaused = !userPaused; sync(); });
  reducedMotion.addEventListener?.('change', sync);
  phone.addEventListener?.('change', sync);
  connection?.addEventListener?.('change', sync);
  document.addEventListener('visibilitychange', sync);
  addEventListener('pagehide', () => films.forEach(stop));
  sync();
})();
