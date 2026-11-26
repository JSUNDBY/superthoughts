/* Moment links lead to shelf anchors when JavaScript is unavailable. */
(function () {
  var box = document.querySelector('[data-filter]');
  if (!box) return;
  var doors = document.querySelector('.lib-doors');
  var back = document.querySelector('[data-back]');
  var featured = document.querySelector('[data-featured]');
  var filterLink = featured.querySelector('[data-filter-link]');
  var options = box.querySelector('details');
  var summary = options.querySelector('summary');
  var feelLabel = box.querySelector('[data-feel-label]');
  var feel = box.querySelector('[data-feel]');
  var needLabels = JSON.parse(box.dataset.needLabels);
  var needs = Array.from(box.querySelectorAll('[data-need]'));
  var lengths = Array.from(box.querySelectorAll('[data-len]'));
  var freeOnly = box.querySelector('[data-free-only]');
  var rows = Array.from(document.querySelectorAll('.th-shelf li[data-needs]'));
  var shelves = Array.from(document.querySelectorAll('.th-shelf'));
  var statusGroup = box.querySelector('[data-filter-status]');
  var status = box.querySelector('[data-status]');
  var clear = box.querySelector('[data-clear]');
  var inLen = {
    short: function (m) { return m < 10; },
    mid: function (m) { return m >= 10 && m <= 20; },
    long: function (m) { return m > 20; }
  };

  function readState() {
    var q = new URLSearchParams(location.search);
    var hash = location.hash.slice(1);
    var need = q.get('need');
    var len = q.get('len');
    var door = shelves.some(function (shelf) { return shelf.id === hash; }) ? hash : '';
    return {
      door: door,
      need: !door && rows.some(function (row) { return row.dataset.needs.split(' ').includes(need); }) ? need : '',
      len: lengths.some(function (button) { return button.dataset.len === len; }) ? len : '',
      free: q.get('free') === '1'
    };
  }

  var state = readState();

  function hasFilters() {
    return !!(state.need || state.len || state.free);
  }

  function apply() {
    var shown = 0;
    rows.forEach(function (row) {
      row.hidden = !!(
        (state.door && row.closest('.th-shelf').id !== state.door) ||
        (state.need && !row.dataset.needs.split(' ').includes(state.need)) ||
        (state.len && !inLen[state.len](+row.dataset.min)) ||
        (state.free && !row.hasAttribute('data-free'))
      );
      if (!row.hidden) shown++;
    });
    shelves.forEach(function (shelf) {
      var matches = shelf.querySelectorAll('li[data-needs]:not([hidden])').length;
      var count = shelf.querySelector('.lib-count');
      if (!count.dataset.total) count.dataset.total = count.textContent;
      count.textContent = hasFilters() ? matches + (matches === 1 ? ' match' : ' matches') : count.dataset.total;
      shelf.hidden = state.door
        ? shelf.id !== state.door || (hasFilters() && !shown)
        : !matches;
    });

    var active = !!state.door || hasFilters();
    featured.hidden = doors.hidden = active;
    back.hidden = !active;
    document.body.classList.toggle('library-browse-active', active);
    feelLabel.hidden = feel.hidden = !!state.door;
    needs.forEach(function (button) {
      button.setAttribute('aria-pressed', button.dataset.need === state.need);
    });
    lengths.forEach(function (button) {
      button.setAttribute('aria-pressed', button.dataset.len === state.len);
    });
    freeOnly.setAttribute('aria-pressed', state.free);

    var selectedLength = lengths.find(function (button) { return button.dataset.len === state.len; });
    var parts = [
      needLabels[state.need],
      selectedLength && selectedLength.textContent,
      state.free && 'Free only'
    ].filter(Boolean);
    statusGroup.classList.toggle('has-results-status', hasFilters());
    status.textContent = hasFilters() ? (
      parts.join(' · ') + '. ' +
      (shown ? shown + (shown === 1 ? ' result.' : ' results.') : 'No matches. Try clearing a filter.')
    ) : '';
    clear.textContent = state.door ? 'Clear filters' : 'Show all';
    clear.hidden = !hasFilters();
  }

  function pushState() {
    var url = new URL(location.href);
    url.searchParams.delete('need');
    url.searchParams.delete('len');
    url.searchParams.delete('free');
    if (state.need) url.searchParams.set('need', state.need);
    if (state.len) url.searchParams.set('len', state.len);
    if (state.free) url.searchParams.set('free', '1');
    url.hash = state.door;
    if (url.href !== location.href) history.pushState(null, '', url);
  }

  function focusTop(target) {
    if (target) {
      target.focus({ preventScroll: true });
      target.closest('.th-library-intro').scrollIntoView({ block: 'start' });
    }
  }

  function showAll() {
    state = { door: '', need: '', len: '', free: false };
    pushState();
    options.open = true;
    apply();
    focusTop(featured.querySelector('a'));
  }

  doors.addEventListener('click', function (event) {
    var link = event.target.closest('[data-door]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey ||
        event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    state.door = link.dataset.door;
    state.need = '';
    pushState();
    options.open = false;
    apply();
    focusTop(back.querySelector('button'));
  });

  filterLink.addEventListener('click', function () {
    options.open = true;
  });

  back.addEventListener('click', showAll);
  box.addEventListener('click', function (event) {
    var button = event.target.closest('button');
    if (!button) return;
    if (button === clear && !state.door) {
      showAll();
      return;
    }
    var wasActive = state.door || hasFilters();
    if (button.dataset.need) state.need = state.need === button.dataset.need ? '' : button.dataset.need;
    else if (button.dataset.len) state.len = state.len === button.dataset.len ? '' : button.dataset.len;
    else if (button === freeOnly) state.free = !state.free;
    else if (button === clear) { state.len = ''; state.free = false; }
    pushState();
    apply();
    if (!wasActive && hasFilters()) {
      options.open = false;
      focusTop(summary);
    } else if (button === clear) {
      summary.focus();
    }
  });

  function restore() {
    state = readState();
    options.open = !(state.door || hasFilters());
    apply();
  }

  window.addEventListener('popstate', restore);
  window.addEventListener('hashchange', restore);
  box.hidden = false;
  filterLink.hidden = false;
  restore();
})();
