/* Persistence for the training log. Runs only on the hosted site.
   Everything is stored in this browser on this device. Nothing is sent anywhere. */
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
    '.lastt{font-size:11.5px;color:#7e8a9c;padding:8px 12px 0}' +
    '.lastt b{color:#9aa6b8;font-weight:650}' +
    '.savebar{display:flex;gap:8px;margin:12px 0 4px}' +
    '.savebar button{flex:1;border-radius:11px;padding:13px 8px;font-size:14px;font-weight:700;' +
    'font-family:inherit;cursor:pointer;border:1px solid #2a3140;background:#1e232c;color:#e9edf4}' +
    '.savebar button.p{background:#4fbf85;border-color:#4fbf85;color:#08130d}' +
    '.savebar button.warn{color:#e0b24e}' +
    '.dcard{background:#171b22;border:1px solid #2a3140;border-radius:14px;padding:14px;margin:12px 0}' +
    '.dcard h3{margin:0 0 6px;font-size:15px;color:#e9edf4}' +
    '.dcard p{font-size:13px;color:#9aa6b8;margin:0 0 10px}' +
    '.nostore{background:#241f12;border:1px solid #4a3d22;color:#e6d4ae;border-radius:12px;' +
    'padding:12px;margin:12px 0;font-size:13px}';
  document.head.appendChild(css);

  var OK = available();
  var sessions = OK ? get('sessions', []) : [];

  function secs() {
    return [].slice.call(document.querySelectorAll(
      'section[data-s="A"],section[data-s="B"],section[data-s="C"]'));
  }

  /* ---------- snapshot / restore ---------- */
  function snap(sec) {
    var g = function (c) { var e = sec.querySelector('.' + c); return e ? e.value : ''; };
    var o = { date: g('f_date'), bw: g('f_bw'), pain: g('f_pain'), notes: g('f_notes'), ex: {} };
    sec.querySelectorAll('.ex').forEach(function (ex) {
      var rows = [];
      ex.querySelectorAll('.setrow').forEach(function (r) {
        rows.push([
          r.querySelector('.w').value,
          r.querySelector('.r').value,
          r.querySelector('.chk').getAttribute('aria-pressed') === 'true' ? 1 : 0
        ]);
      });
      o.ex[ex.dataset.name] = rows;
    });
    return o;
  }
  function restore(sec, o) {
    if (!o) return;
    var s = function (c, v) { var e = sec.querySelector('.' + c); if (e && v) e.value = v; };
    s('f_date', o.date); s('f_bw', o.bw); s('f_pain', o.pain); s('f_notes', o.notes);
    sec.querySelectorAll('.ex').forEach(function (ex) {
      var rows = o.ex && o.ex[ex.dataset.name];
      if (!rows) return;
      ex.querySelectorAll('.setrow').forEach(function (r, i) {
        if (!rows[i]) return;
        r.querySelector('.w').value = rows[i][0] || '';
        r.querySelector('.r').value = rows[i][1] || '';
        var c = r.querySelector('.chk');
        if (rows[i][2]) { c.setAttribute('aria-pressed', 'true'); c.textContent = '✓'; }
      });
    });
  }
  function saveDraft(sec) { if (OK) set('draft.' + sec.dataset.s, snap(sec)); }

  /* ---------- last time ---------- */
  function lastFor(name) {
    for (var i = sessions.length - 1; i >= 0; i--) {
      var s = sessions[i];
      if (s.ex && s.ex[name]) {
        var rows = s.ex[name].filter(function (r) { return r[0] || r[1]; });
        if (rows.length) return { date: s.date, rows: rows };
      }
    }
    return null;
  }
  function paintLast() {
    document.querySelectorAll('.ex').forEach(function (ex) {
      var old = ex.querySelector('.lastt');
      if (old) old.parentNode.removeChild(old);
      var l = lastFor(ex.dataset.name);
      if (!l) return;
      var txt = l.rows.map(function (r) { return (r[0] || '?') + ' kg x ' + (r[1] || '?'); }).join('   ');
      var d = document.createElement('div');
      d.className = 'lastt';
      d.innerHTML = '<b>Last time (' + l.date + '):</b> ' + txt;
      var sets = ex.querySelector('.sets');
      if (sets) ex.insertBefore(d, sets); else ex.appendChild(d);
    });
  }

  /* ---------- wire up each day ---------- */
  secs().forEach(function (sec) {
    if (OK) restore(sec, get('draft.' + sec.dataset.s, null));
    sec.addEventListener('input', function () { saveDraft(sec); });
    sec.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.chk')) setTimeout(function () { saveDraft(sec); }, 0);
    });

    var bar = document.createElement('div');
    bar.className = 'savebar';
    var save = document.createElement('button');
    save.className = 'p'; save.textContent = 'Finish & save session';
    var dis = document.createElement('button');
    dis.className = 'warn'; dis.textContent = 'Clear day';
    bar.appendChild(save); bar.appendChild(dis);
    sec.appendChild(bar);

    function wipe() {
      sec.querySelectorAll('.setrow').forEach(function (r) {
        r.querySelector('.w').value = '';
        r.querySelector('.r').value = '';
        var c = r.querySelector('.chk');
        c.setAttribute('aria-pressed', 'false'); c.textContent = '';
      });
      ['f_bw', 'f_pain', 'f_notes'].forEach(function (c) {
        var e = sec.querySelector('.' + c); if (e) e.value = '';
      });
      try { localStorage.removeItem(K + 'draft.' + sec.dataset.s); } catch (e) {}
    }

    save.onclick = function () {
      var o = snap(sec);
      var any = Object.keys(o.ex).some(function (k) {
        return o.ex[k].some(function (r) { return r[0] || r[1]; });
      });
      if (!any) { say('Nothing logged yet'); return; }
      o.date = o.date || today();
      o.day = sec.dataset.s;
      sessions.push(o);
      sessions.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      if (!set('sessions', sessions)) { say('Could not save'); return; }
      wipe(); paintLast(); renderData();
      say('Session saved');
    };

    var armed = false, timer = null;
    dis.onclick = function () {
      if (!armed) {
        armed = true; dis.textContent = 'Tap again to clear';
        timer = setTimeout(function () { armed = false; dis.textContent = 'Clear day'; }, 3000);
        return;
      }
      clearTimeout(timer); armed = false; dis.textContent = 'Clear day';
      wipe(); say('Day cleared');
    };
  });

  /* ---------- data card in the How tab ---------- */
  var host = document.querySelector('section[data-s="how"]');
  var dc = null;
  function renderData() {
    if (!dc) return;
    var n = sessions.length;
    var last = n ? sessions[n - 1].date : null;
    dc.querySelector('.dstat').textContent = n
      ? n + (n === 1 ? ' session' : ' sessions') + ' saved on this device, most recent ' + last + '.'
      : 'No sessions saved yet. Log some sets and tap "Finish & save session".';
  }
  if (host) {
    dc = document.createElement('div');
    dc.className = 'dcard';
    dc.innerHTML =
      '<h3>Your saved data</h3>' +
      '<p class="dstat"></p>' +
      '<p>Everything is stored in Safari on this phone and never leaves it. ' +
      'Reinstalling the page or clearing Safari data will delete it &mdash; export now and then.</p>' +
      '<div class="savebar">' +
      '<button class="ex1">Export backup</button>' +
      '<button class="cp1">Copy history</button>' +
      '</div><div class="savebar"><button class="warn wipe1">Delete all data</button></div>';
    host.appendChild(dc);
    renderData();

    dc.querySelector('.ex1').onclick = function () {
      var blob = new Blob([JSON.stringify({ sessions: sessions }, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'training-history-' + today() + '.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      say('Backup downloaded');
    };
    dc.querySelector('.cp1').onclick = function () {
      var NL = String.fromCharCode(10);
      var l = ['TRAINING HISTORY'];
      sessions.forEach(function (s) {
        l.push('');
        l.push(s.date + '  Day ' + (s.day || '?') + (s.bw ? '  (' + s.bw + ' kg)' : ''));
        Object.keys(s.ex).forEach(function (k) {
          var rows = s.ex[k].filter(function (r) { return r[0] || r[1]; });
          if (rows.length) {
            l.push('  ' + k + ' - ' + rows.map(function (r) {
              return (r[0] || '?') + 'kg x ' + (r[1] || '?');
            }).join(' | '));
          }
        });
        if (s.pain) l.push('  hamstring/shoulder: ' + s.pain);
        if (s.notes) l.push('  notes: ' + s.notes);
      });
      var txt = l.join(NL);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(function () { say('Copied'); }, function () { say('Copy failed'); });
      } else { say('Copy not available'); }
    };
    var armed2 = false, t2 = null;
    var wb = dc.querySelector('.wipe1');
    wb.onclick = function () {
      if (!armed2) {
        armed2 = true; wb.textContent = 'Tap again to delete everything';
        t2 = setTimeout(function () { armed2 = false; wb.textContent = 'Delete all data'; }, 3500);
        return;
      }
      clearTimeout(t2); armed2 = false; wb.textContent = 'Delete all data';
      try {
        Object.keys(localStorage).forEach(function (k) {
          if (k.indexOf(K) === 0) localStorage.removeItem(k);
        });
      } catch (e) {}
      sessions = []; paintLast(); renderData(); say('All data deleted');
    };
  }

  if (!OK && host) {
    var w = document.createElement('div');
    w.className = 'nostore';
    w.innerHTML = '<b>Saving is unavailable in this browser.</b> You are probably in Private Browsing. ' +
      'Everything still works, but nothing will be remembered &mdash; use the Copy log button instead.';
    host.insertBefore(w, host.firstChild);
  }

  /* publish progression targets so the coach can reason about them anywhere */
  (function () {
    var t = {};
    document.querySelectorAll('.ex[data-name]').forEach(function (ex) {
      t[ex.dataset.name] = {
        top: parseInt(ex.dataset.top || '0', 10),
        inc: parseFloat(ex.dataset.inc || '2.5'),
        noprog: ex.dataset.noprog === '1' ? 1 : 0
      };
    });
    if (OK) set('targets', t);
  })();

  /* markdown export button */
  if (dc && window.FIT) {
    var bar2 = document.createElement('div');
    bar2.className = 'savebar';
    var md = document.createElement('button');
    md.className = 'p'; md.textContent = 'Export log as .md for Claude';
    bar2.appendChild(md);
    dc.insertBefore(bar2, dc.querySelector('.savebar'));
    md.onclick = function () { FIT.exportMd(); say('Markdown file downloaded'); };
  }

  /* coach panel at the top of the How tab */
  if (host && window.FIT) {
    var panel = document.createElement('div');
    panel.id = 'coachpanel';
    host.insertBefore(panel, host.firstChild);
    if (window.renderCoach) renderCoach(panel);
  }

  paintLast();
})();
