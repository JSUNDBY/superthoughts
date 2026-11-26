// Keep a listener's place in this tab when a library result opens its own page.
const storageKey = 'st-library-visit';
const selectors = { featured: '.featured-covers a', shelf: '.th-shelf .th-row' };

function route(value) {
  const url = new URL(value, location.href);
  return url.origin === location.origin ? url.pathname + url.search + url.hash : '';
}

function storedVisit() {
  try { return JSON.parse(sessionStorage.getItem(storageKey)); } catch { return null; }
}

function saveVisit(visit) {
  try { sessionStorage.setItem(storageKey, JSON.stringify(visit)); } catch {}
}

function restoreRow(visit) {
  if (!visit || visit.library !== route(location.href) || !Object.hasOwn(selectors, visit.group)) return;
  const links = document.querySelectorAll(selectors[visit.group]);
  const link = Array.from(links).find(item => route(item.href) === visit.player && item.getClientRects().length);
  if (!link) return;
  requestAnimationFrame(() => {
    link.focus({ preventScroll: true });
    // Keep the row at the same point in the viewport even if the layout has shifted.
    window.scrollBy({ top: link.getBoundingClientRect().top - visit.rowTop, behavior: 'instant' });
  });
}

function rememberRow(event) {
  const link = event.target.closest('a[href]');
  if (!link || event.defaultPrevented || event.button > 1) return;
  const group = Object.keys(selectors).find(key => link.matches(selectors[key]));
  const player = route(link.href);
  if (!group || !player) return;
  const visit = { library: route(location.href), player, group, rowTop: link.getBoundingClientRect().top };
  history.replaceState({ ...history.state, stLibraryVisit: visit }, '');
  saveVisit(visit);
}

function restoreLibrary(event) {
  const traversal = event.persisted || performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
  if (traversal && history.state?.stLibraryVisit) {
    restoreRow(history.state.stLibraryVisit);
    return;
  }
  // A new tab, or a browser without a usable history entry, follows the normal link.
  const visit = storedVisit();
  if (visit?.returning && document.referrer && route(document.referrer) === visit.player) {
    saveVisit({ ...visit, returning: false });
    restoreRow(visit);
  }
}

function connectPlayer() {
  const back = document.getElementById('session-back');
  if (!back || !document.referrer) return;
  const previous = new URL(document.referrer);
  if (previous.origin !== location.origin || previous.pathname !== '/library.html') return;
  const visit = storedVisit();
  // Referrers omit fragments. Recover the moment shelf only for this exact result.
  const matched = visit?.player === route(location.href) && typeof visit.library === 'string'
    && visit.library.split('#')[0] === route(previous.href).split('#')[0];
  const library = matched ? visit.library : route(previous.href);
  const link = back.classList.contains('brand') ? document.createElement('a') : back;
  if (link !== back) {
    link.textContent = 'Library';
    back.after(link);
  }
  link.href = library;
  link.setAttribute('aria-label', 'Return to the library');
  link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (matched) saveVisit({ ...visit, returning: true });
    const nav = window.navigation;
    const previousEntry = nav?.currentEntry && nav.entries()[nav.currentEntry.index - 1];
    if (previousEntry?.url && route(previousEntry.url) === library) {
      event.preventDefault();
      history.back();
    }
  });
}

if (location.pathname === '/library.html') {
  document.addEventListener('click', rememberRow);
  document.addEventListener('auxclick', rememberRow);
  window.addEventListener('pageshow', restoreLibrary);
} else {
  connectPlayer();
}
