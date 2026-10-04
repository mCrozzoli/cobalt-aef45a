window.FITV = window.FITV || {}; FITV['coach-ui'] = '19';
/* Renders the coach panel. Used by index.html and the training log. */
(function () {
  var STYLE =
    '.cstat{display:flex;gap:8px;margin:0 0 10px;flex-wrap:wrap}' +
    '.cstat > div{flex:1;min-width:76px;background:#171b22;border:1px solid #2a3140;' +
    'border-radius:12px;padding:10px 11px}' +
    '.cstat .n{font-size:19px;font-weight:700;color:#e9edf4;font-variant-numeric:tabular-nums;' +
    'letter-spacing:-.02em}' +
    '.cstat .l{font-size:9.5px;letter-spacing:.07em;text-transform:uppercase;color:#6b7789;' +
    'font-weight:700;margin-top:1px}' +
    '.citem{border-radius:14px;padding:13px 14px;margin-bottom:10px;font-size:13.3px;' +
    'line-height:1.5;border:1px solid #2a3140;background:#171b22;color:#9aa6b8}' +
    '.citem b{display:block;color:#e9edf4;font-size:14px;margin-bottom:3px;font-weight:650}' +
    '.citem.act{background:#241a12;border-color:#4a3226;color:#e7c9b4}' +
    '.citem.act b{color:#ffd9c2}' +
    '.citem.good{background:#14231a;border-color:#2c4634;color:#c3dccd}' +
    '.citem.good b{color:#dcf3e4}' +
    '.citem.warn{background:#241f12;border-color:#4a3d22;color:#e6d4ae}' +
    '.citem.warn b{color:#fbe9c4}' +
    '.chead{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;' +
    'color:#f2814f;margin:0 0 8px}';
  var s = document.createElement('style');
  s.textContent = STYLE;
  document.head.appendChild(s);

  function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  window.renderCoach = function (el, opts) {
    if (!window.FIT || !el) return;
    opts = opts || {};
    var st = FIT.status();
    var h = '';

    if (opts.stats !== false) {
      var days = st.stats.last
        ? Math.round((new Date(FIT.today()) - new Date(st.stats.last)) / 86400000)
        : null;
      h += '<div class="cstat">' +
           '<div><div class="n">' + st.stats.wk + '</div><div class="l">' + st.stats.wkLabel + '</div></div>' +
           '<div><div class="n">' + st.stats.next + '</div><div class="l">Next day</div></div>' +
           '<div><div class="n">' + st.stats.recent + '</div><div class="l">Last 7 days</div></div>' +
           '<div><div class="n">' + (days === null ? '—' : days + 'd') + '</div>' +
           '<div class="l">Since last</div></div>' +
           '</div>';
    }

    if (opts.title !== false && st.items.length) {
      h += '<div class="chead">What to do next</div>';
    }
    st.items.forEach(function (i) {
      h += '<div class="citem ' + i.level + '"><b>' + esc(i.title) + '</b>' + esc(i.text) + '</div>';
    });

    if (!st.items.length) {
      h += '<div class="citem"><b>Nothing needs changing</b>' +
           'Keep doing what you are doing. Add weight whenever a lift hits the top of its rep range.</div>';
    }
    el.innerHTML = h;
  };
})();

/* Version check: every page and script carries the same version number.
   If the site ends up with a mix of old and new files, say so plainly. */
window.addEventListener('load', function () {
  var m = document.querySelector('meta[name="fitv"]');
  if (!m) return;
  var want = m.getAttribute('content'), bad = [];
  [].slice.call(document.querySelectorAll('script[src]')).forEach(function (sc) {
    var n = (sc.getAttribute('src') || '').split('/').pop().replace(/\.js.*$/, '');
    if (!n) return;
    if (!window.FITV || FITV[n] !== want) bad.push(n + '.js');
  });
  if (!bad.length) return;
  var b = document.createElement('div');
  b.style.cssText = 'position:sticky;top:0;z-index:99;background:#3a2e12;color:#f1dca8;border-bottom:1px solid #6b5420;' +
    'padding:10px 14px;font:600 13px/1.4 -apple-system,system-ui,sans-serif';
  b.innerHTML = 'Out-of-date files on the site: ' + bad.join(', ') + '. Upload <b>all</b> files from the ' +
    'cobalt-aef45a folder to GitHub again, then reload.';
  document.body.insertBefore(b, document.body.firstChild);
});
