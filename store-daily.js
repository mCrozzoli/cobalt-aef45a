/* Persistence for the daily log. Hosted site only.
   Stored in this browser on this device; nothing is transmitted. */
(function () {
  var K = 'fit.v1.';

  function available() {
    try { localStorage.setItem(K + '_t', '1'); localStorage.removeItem(K + '_t'); return true; }
    catch (e) { return false; }
  }
  function get(k, d) {
    try { var v = localStorage.getItem(K + k); return v == null ? d : JSON.parse(v); }
    catch (e) { return d; }
  }
  function set(k, v) {
    try { localStorage.setItem(K + k, JSON.stringify(v)); return true; } catch (e) { return false; }
  }
  function today() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function say(m) { if (window.toast) toast(m); }

  var css = document.createElement('style');
  css.textContent =
    '.dcard{background:#171b22;border:1px solid #2a3140;border-radius:14px;padding:14px;margin:12px 0}' +
    '.dcard h3{margin:0 0 6px;font-size:15px;color:#e9edf4}' +
    '.dcard p{font-size:13px;color:#9aa6b8;margin:0 0 10px}' +
    '.savebar{display:flex;gap:8px;margin:10px 0 0}' +
    '.savebar button{flex:1;border-radius:11px;padding:13px 8px;font-size:14px;font-weight:700;' +
    'font-family:inherit;cursor:pointer;border:1px solid #2a3140;background:#1e232c;color:#e9edf4}' +
    '.savebar button.warn{color:#e0b24e}' +
    '.nostore{background:#241f12;border:1px solid #4a3d22;color:#e6d4ae;border-radius:12px;' +
    'padding:12px;margin:12px 0;font-size:13px}';
  document.head.appendChild(css);

  var OK = available();
  if (!OK) {
    var host0 = document.querySelector('section[data-s="how"]');
    if (host0) {
      var w = document.createElement('div');
      w.className = 'nostore';
      w.innerHTML = '<b>Saving is unavailable in this browser.</b> Probably Private Browsing. ' +
        'Everything still works, but nothing is remembered between visits.';
      host0.insertBefore(w, host0.firstChild);
    }
    return;
  }

  /* ---------- today's food ---------- */
  var saved = get('food.' + today(), null);
  if (saved && saved.length) {
    saved.forEach(function (e) { LOG.push(e); });
    render();
  }
  var _render = render;
  render = function () { _render(); set('food.' + today(), LOG); };

  /* ---------- check-in history ---------- */
  var stored = get('checkins', []);
  if (stored.length) {
    var byDate = {};
    HIST.forEach(function (e) { byDate[e.d] = e; });
    stored.forEach(function (e) { byDate[e.d] = e; });     // stored wins
    HIST.length = 0;
    Object.keys(byDate).sort().forEach(function (d) { HIST.push(byDate[d]); });
    drawAll();
  }
  var wadd = document.getElementById('wadd');
  if (wadd) {
    wadd.addEventListener('click', function () {
      setTimeout(function () { set('checkins', HIST); renderData(); }, 60);
    });
  }

  /* ---------- data card ---------- */
  var host = document.querySelector('section[data-s="how"]');
  var dc = null;
  function renderData() {
    if (!dc) return;
    var days = 0;
    try {
      Object.keys(localStorage).forEach(function (k) {
        if (k.indexOf(K + 'food.') === 0) days++;
      });
    } catch (e) {}
    dc.querySelector('.dstat').textContent =
      HIST.length + (HIST.length === 1 ? ' check-in' : ' check-ins') + ' and ' +
      days + (days === 1 ? ' day' : ' days') + ' of food logged on this device.';
  }
  if (host) {
    dc = document.createElement('div');
    dc.className = 'dcard';
    dc.innerHTML =
      '<h3>Your saved data</h3>' +
      '<p class="dstat"></p>' +
      '<p>Stored in Safari on this phone only. Clearing Safari data deletes it &mdash; ' +
      'export a backup occasionally.</p>' +
      '<div class="savebar"><button class="mdx">Export log as .md for Claude</button></div>' +
      '<div class="savebar"><button class="ex1">Export backup (.json)</button></div>' +
      '<div class="savebar"><button class="warn wipe1">Delete all data</button></div>';
    host.appendChild(dc);
    renderData();

    if (window.FIT) {
      dc.querySelector('.mdx').onclick = function () { FIT.exportMd(); say('Markdown file downloaded'); };
    }
    dc.querySelector('.ex1').onclick = function () {
      var food = {};
      try {
        Object.keys(localStorage).forEach(function (k) {
          if (k.indexOf(K + 'food.') === 0) food[k.slice((K + 'food.').length)] = get(k.slice(K.length), []);
        });
      } catch (e) {}
      var blob = new Blob([JSON.stringify({ checkins: HIST, food: food }, null, 2)],
                          { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'daily-log-' + today() + '.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      say('Backup downloaded');
    };

    var armed = false, t = null;
    var wb = dc.querySelector('.wipe1');
    wb.onclick = function () {
      if (!armed) {
        armed = true; wb.textContent = 'Tap again to delete everything';
        t = setTimeout(function () { armed = false; wb.textContent = 'Delete all data'; }, 3500);
        return;
      }
      clearTimeout(t); armed = false; wb.textContent = 'Delete all data';
      try {
        Object.keys(localStorage).forEach(function (k) {
          if (k.indexOf(K) === 0) localStorage.removeItem(k);
        });
      } catch (e) {}
      LOG.length = 0; HIST.length = 0;
      render(); drawAll(); renderData();
      say('All data deleted');
    };
  }
})();
