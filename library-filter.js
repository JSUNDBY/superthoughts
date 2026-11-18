/* Library filter (preview 2026-11-17): plain-word needs + length, on top of the moment shelves.
   Works from the URL too: library.html?need=sleep&len=short&free=1 */
(function () {
  var box = document.querySelector('[data-filter]'); if (!box) return;
  box.hidden = false;
  var rows = [].slice.call(document.querySelectorAll('.th-shelf li[data-needs]'));
  var shelves = [].slice.call(document.querySelectorAll('.th-shelf'));
  var status = box.querySelector('[data-status]'), clear = box.querySelector('[data-clear]');
  var q = new URLSearchParams(location.search);
  var state = { need: q.get('need') || '', len: q.get('len') || '', free: q.get('free') === '1' };
  var inLen = { short: function (m) { return m < 10; }, mid: function (m) { return m >= 10 && m <= 20; }, long: function (m) { return m > 20; } };
  function name(btn) { return btn ? btn.textContent : ''; }
  function apply(push) {
    var shown = 0;
    rows.forEach(function (li) {
      var ok = (!state.need || li.dataset.needs.split(' ').indexOf(state.need) > -1) &&
               (!state.len || inLen[state.len](+li.dataset.min)) && (!state.free || li.hasAttribute('data-free'));
      li.hidden = !ok; if (ok) shown++;
    });
    shelves.forEach(function (s) { s.hidden = !s.querySelector('li[data-needs]:not([hidden])'); });
    box.querySelectorAll('[data-need]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.need === state.need); });
    box.querySelectorAll('[data-len]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.len === state.len); });
    box.querySelector('[data-free-only]').setAttribute('aria-pressed', state.free);
    var any = state.need || state.len || state.free;
    var parts = [];
    if (state.need) parts.push(name(box.querySelector('[data-need="' + state.need + '"]')).toLowerCase());
    if (state.len) parts.push(name(box.querySelector('[data-len="' + state.len + '"]')).toLowerCase());
    if (state.free) parts.push('free');
    status.textContent = any ? (shown === 0 ? 'Nothing matches all of those yet.' : shown + (shown === 1 ? ' session' : ' sessions') + ': ' + parts.join(', ') + '.') : '';
    clear.hidden = !any;
    document.querySelectorAll('.th-library-intro .th-or, .th-library-intro .th-jump').forEach(function (el) { el.hidden = !!any; });
    if (push) {
      var p = new URLSearchParams();
      if (state.need) p.set('need', state.need); if (state.len) p.set('len', state.len); if (state.free) p.set('free', '1');
      history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
    }
  }
  box.addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.need) state.need = state.need === b.dataset.need ? '' : b.dataset.need;
    else if (b.dataset.len) state.len = state.len === b.dataset.len ? '' : b.dataset.len;
    else if (b.hasAttribute('data-free-only')) state.free = !state.free;
    else if (b.hasAttribute('data-clear')) state = { need: '', len: '', free: false };
    apply(true);
  });
  apply(false);
})();
