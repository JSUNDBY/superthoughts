/* Library: nine doors (believe added 2026-11-24) (D84 B, 2026-11-23) over the moment shelves, plus plain-word feelings and length.
   A door opens its shelf alone; a feeling shows matching sessions across shelves. Without JS the doors are anchors.
   Works from the URL too: library.html#sleep, library.html?need=stress&len=short&free=1 */
(function () {
  var box = document.querySelector('[data-filter]'); if (!box) return;
  box.hidden = false;
  var doors = document.querySelector('.lib-doors'), back = document.querySelector('[data-back]');
  var featured = document.querySelector('[data-featured]');
  var filterLink = featured && featured.querySelector('[data-filter-link]');
  if (filterLink) filterLink.hidden = false;
  var feelLabel = box.querySelector('[data-feel-label]'), feel = box.querySelector('[data-feel]');
  var rows = [].slice.call(document.querySelectorAll('.th-shelf li[data-needs]'));
  var shelves = [].slice.call(document.querySelectorAll('.th-shelf'));
  var status = box.querySelector('[data-status]'), clear = box.querySelector('[data-clear]');
  var q = new URLSearchParams(location.search);
  var hash = location.hash.slice(1);
  var state = { door: shelves.some(function (s) { return s.id === hash; }) ? hash : '',
                need: q.get('need') || '', len: q.get('len') || '', free: q.get('free') === '1' };
  if (state.door) state.need = '';
  var inLen = { short: function (m) { return m < 10; }, mid: function (m) { return m >= 10 && m <= 20; }, long: function (m) { return m > 20; } };
  function name(btn) { return btn ? btn.textContent : ''; }
  function apply(push) {
    var shown = 0;
    rows.forEach(function (li) {
      var ok = (!state.door || li.closest('.th-shelf').id === state.door) &&
               (!state.need || li.dataset.needs.split(' ').indexOf(state.need) > -1) &&
               (!state.len || inLen[state.len](+li.dataset.min)) && (!state.free || li.hasAttribute('data-free'));
      li.hidden = !ok; if (ok) shown++;
    });
    shelves.forEach(function (s) { s.hidden = state.door ? s.id !== state.door : !s.querySelector('li[data-needs]:not([hidden])'); });
    var open = !!(state.door || state.need);
    if (featured) featured.hidden = open || !!state.len || state.free;
    doors.hidden = open; back.hidden = !open;
    feelLabel.hidden = feel.hidden = !!state.door;
    box.querySelectorAll('[data-need]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.need === state.need); });
    box.querySelectorAll('[data-len]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.len === state.len); });
    box.querySelector('[data-free-only]').setAttribute('aria-pressed', state.free);
    var any = state.need || state.len || state.free;
    var parts = [];
    if (state.need) parts.push(name(box.querySelector('[data-need="' + state.need + '"]')).toLowerCase());
    if (state.len) parts.push(name(box.querySelector('[data-len="' + state.len + '"]')).toLowerCase());
    if (state.free) parts.push('free');
    status.textContent = any ? (shown === 0 ? 'Nothing matches all of those yet.' : shown + (shown === 1 ? ' session' : ' sessions') + ': ' + parts.join(', ') + '.') : '';
    clear.hidden = !(state.len || state.free);
    if (push) {
      var p = new URLSearchParams();
      if (state.need) p.set('need', state.need); if (state.len) p.set('len', state.len); if (state.free) p.set('free', '1');
      history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : '') + (state.door ? '#' + state.door : ''));
    }
  }
  function toTop() { var top = document.querySelector('.th-library-intro'); if (top) top.scrollIntoView({ block: 'start' }); }
  doors.addEventListener('click', function (ev) {
    var d = ev.target.closest('[data-door]'); if (!d) return;
    ev.preventDefault(); state.door = d.dataset.door; state.need = ''; apply(true); toTop();
    var h = document.getElementById('shelf-' + state.door); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  });
  back.addEventListener('click', function () { state = { door: '', need: '', len: '', free: false }; apply(true); toTop(); });
  box.addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.need) state.need = state.need === b.dataset.need ? '' : b.dataset.need;
    else if (b.dataset.len) state.len = state.len === b.dataset.len ? '' : b.dataset.len;
    else if (b.hasAttribute('data-free-only')) state.free = !state.free;
    else if (b.hasAttribute('data-clear')) { state.len = ''; state.free = false; }
    apply(true);
  });
  apply(false);
})();
