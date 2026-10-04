window.FITV = window.FITV || {}; FITV['coach'] = '19';
/* Shared coaching logic + markdown export.
   Reads only localStorage on this device. Exposes window.FIT. */
(function () {
  var K = 'fit.v1.';
  var START = '2026-08-10';          // week 0 of the programme (v1)
  var V2 = '2026-10-12';             // version 2 (A / B / optional C) starts

  function get(k, d) {
    try { var v = localStorage.getItem(K + k); return v == null ? d : JSON.parse(v); }
    catch (e) { return d; }
  }
  function today() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function days(a, b) {
    return Math.round((new Date(b) - new Date(a)) / 86400000);
  }
  function trend(a) {
    return a.map(function (_, i) {
      var s = Math.max(0, i - 2), sl = a.slice(s, i + 1);
      return sl.reduce(function (x, y) { return x + y; }, 0) / sl.length;
    });
  }

  /* ---------- what should change next ---------- */
  function readyForMore(sessions, targets) {
    /* an exercise is "ready" when the most recent time it was done,
       every set with a weight hit the top of the rep range */
    var seen = {}, out = [];
    for (var i = sessions.length - 1; i >= 0; i--) {
      var s = sessions[i];
      if (!s.ex) continue;
      Object.keys(s.ex).forEach(function (name) {
        if (seen[name]) return;
        var t = targets[name];
        if (!t || t.noprog || !t.top) return;
        var rows = s.ex[name].filter(function (r) { return r[0] && r[1]; });
        if (!rows.length) return;
        seen[name] = 1;
        var allTop = rows.every(function (r) { return parseFloat(r[1]) >= t.top; });
        if (allTop) {
          out.push({ name: name, kg: parseFloat(rows[0][0]), inc: t.inc, date: s.date });
        }
      });
    }
    return out;
  }

  function status() {
    var sessions = get('sessions', []);
    var checkins = get('checkins', []);
    var targets = get('targets', {});
    var t = today();
    var items = [];

    var first = sessions.length ? sessions[0].date : null;
    var lifts = sessions.filter(function (s) { return s.day !== 'Class'; });
    var last = lifts.length ? lifts[lifts.length - 1].date : null;
    var weeks = Math.floor(days(first || START, t) / 7);

    var recent = sessions.filter(function (s) { return days(s.date, t) <= 7; }).length;
    var recent14 = sessions.filter(function (s) { return days(s.date, t) <= 14; }).length;

    /* --- consistency --- */
    if (!sessions.length) {
      items.push({ level: 'info', title: 'Nothing logged yet',
        text: 'Run a session and tap Finish & save. Everything below starts working once there is data.' });
    } else if (days(last, t) >= 10) {
      items.push({ level: 'warn', title: days(last, t) + ' days since your last session',
        text: 'Not a crisis. Start with Day ' + nextDay(sessions) + ' at the same weights as last time and rebuild from there.' });
    }

    /* --- load progression --- */
    var ready = readyForMore(sessions, targets);
    if (ready.length) {
      items.push({ level: 'good', title: ready.length + (ready.length === 1 ? ' lift is' : ' lifts are') + ' ready for more weight',
        text: ready.slice(0, 6).map(function (r) {
          return r.name + ': ' + r.kg + ' → ' + (r.kg + r.inc) + ' kg';
        }).join(' · ') });
    }

    /* --- phase of the programme --- */
    if (sessions.length) {
      if (t < V2) {
        items.push({ level: 'act', title: 'Deload week — then version 2 starts on ' + V2,
          text: 'Same exercises, same reps, about 70% of the weight (or the Hotel tab if you are travelling). From ' + V2 + ' the new Day A / Day B / optional Day C take over.' });
        items.push({ level: 'act', title: 'Eight-week injury review',
          text: 'You logged the hamstring as "same" after eight weeks of loading. That was the agreed trigger: book a physiotherapist, and mention the right inner elbow too. Keep training meanwhile.' });
      } else {
        var w2 = Math.floor(days(V2, t) / 7);
        if (w2 >= 8) {
          items.push({ level: 'act', title: 'Version 2, week ' + (w2 + 1) + ' — time for the next rewrite',
            text: 'Export your log below and send it to Claude for version 3.' });
        } else if (w2 === 6) {
          items.push({ level: 'act', title: 'Version 2, week 7 — deload week',
            text: 'Same exercises, same reps, about 70% of the weight, for one week.' });
        } else if (w2 <= 1) {
          items.push({ level: 'info', title: 'Version 2, week ' + (w2 + 1) + ' — settle in',
            text: 'Main lifts now run 6–10 reps. Start at the weights shown on each card and let double progression do the rest. A then B; Day C only if the week allows.' });
        } else {
          items.push({ level: 'info', title: 'Version 2, week ' + (w2 + 1) + ' — build phase',
            text: 'Add weight whenever a lift hits the top of its rep range on every set. Deload in week 7.' });
        }
      }
    }

    /* --- bodyweight trend --- */
    var w = checkins.filter(function (c) { return c.w != null; });
    if (w.length >= 4) {
      var span = days(w[0].d, w[w.length - 1].d);
      if (span >= 21) {
        var tr = trend(w.map(function (c) { return c.w; }));
        var recentTr = tr.slice(-3);
        var change = recentTr[recentTr.length - 1] - tr[Math.max(0, tr.length - 4)];
        if (Math.abs(change) < 0.3) {
          items.push({ level: 'act', title: 'Weight trend has been flat for about three weeks',
            text: 'This is the signal to take roughly 150 kcal off the daily target — but check the waist first. If the tape is still shrinking, change nothing.' });
        } else if (change < -1.8) {
          items.push({ level: 'warn', title: 'Losing faster than planned',
            text: 'Down ' + Math.abs(change).toFixed(1) + ' kg over three weeks. Above about 0.6 kg a week you start giving back muscle. Add 150 kcal.' });
        }
      }
    }

    return {
      items: items,
      stats: { sessions: sessions.length, weeks: weeks, last: last, first: first,
               wk: t >= V2 ? Math.floor(days(V2, t) / 7) + 1 : weeks + 1,
               wkLabel: t >= V2 ? 'v2 week' : 'Week', next: nextDay(sessions),
               recent: recent, recent14: recent14, checkins: checkins.length }
    };
  }

  function nextDay(sessions) {
    /* v2: A and B alternate; C is an optional extra and does not move the queue */
    var lifts = sessions.filter(function (s) { return s.day === 'A' || s.day === 'B'; });
    if (!lifts.length) return 'A';
    return lifts[lifts.length - 1].day === 'A' ? 'B' : 'A';
  }

  function foodDays() {
    var out = [];
    try {
      Object.keys(localStorage).forEach(function (k) {
        if (k.indexOf(K + 'food.') !== 0) return;
        var d = k.slice((K + 'food.').length);
        var items = get('food.' + d, []);
        if (!items || !items.length) return;
        var kc = 0, pr = 0;
        items.forEach(function (e) { kc += e.k * e.q; pr += e.p * e.q; });
        out.push({ d: d, kcal: Math.round(kc), p: Math.round(pr), items: items });
      });
    } catch (e) {}
    out.sort(function (a, b) { return a.d < b.d ? -1 : 1; });
    return out;
  }

  /* days with fewer kcal than this were almost certainly only partly logged */
  var PARTIAL = 1200;
  function foodAvg(list) {
    var full = list.filter(function (f) { return f.kcal >= PARTIAL; });
    if (!full.length) return { n: 0, k: 0, p: 0 };
    return { n: full.length,
             k: Math.round(full.reduce(function (s, f) { return s + f.kcal; }, 0) / full.length),
             p: Math.round(full.reduce(function (s, f) { return s + f.p; }, 0) / full.length) };
  }
  function dedupe(cs) {
    var by = {};
    cs.forEach(function (c) { by[c.d] = c; });
    return Object.keys(by).sort().map(function (d) { return by[d]; });
  }

  /* ---------- markdown export ---------- */
  function markdown() {
    var sessions = get('sessions', []);
    var checkins = dedupe(get('checkins', []));
    var food = foodDays();
    var st = status();
    var NL = String.fromCharCode(10);
    var L = [];

    L.push('# Training & nutrition log');
    L.push('');
    L.push('Exported ' + today() + ' from the Fitness app.');
    L.push('');
    L.push('- Sessions logged: **' + sessions.length + '**');
    L.push('- Programme: **' + (today() < V2 ? 'v1, week ' + (st.stats.weeks + 1) + ' (deload)' :
           'v2 (A / B / optional C), week ' + (Math.floor(days(V2, today()) / 7) + 1)) + '**');
    L.push('- Sessions in the last 14 days: **' + st.stats.recent14 + '**');
    L.push('- Check-ins: **' + checkins.length + '**');
    if (food.length) {
      var fa = foodAvg(food);
      L.push('- Days of food logged: **' + food.length + '** (' + fa.n + ' complete, ' +
             (food.length - fa.n) + ' partly logged — under ' + PARTIAL + ' kcal, left out of the averages)');
      if (fa.n) {
        L.push('- Average on complete days: **' + fa.k + ' kcal**, **' + fa.p + ' g protein** ' +
               '(targets 1900 / 140)');
        var l14 = foodAvg(food.filter(function (f) { return days(f.d, today()) <= 14; }));
        if (l14.n) L.push('- Last 14 days, complete days only: **' + l14.k + ' kcal**, **' + l14.p +
                          ' g protein** (' + l14.n + ' day' + (l14.n === 1 ? '' : 's') + ')');
      }
    }
    L.push('');

    if (st.items.length) {
      L.push('## What the app is flagging');
      L.push('');
      st.items.forEach(function (i) { L.push('- **' + i.title + '** — ' + i.text); });
      L.push('');
    }

    if (checkins.length) {
      L.push('## Check-ins');
      L.push('');
      L.push('| Date | kg | Waist | Chest | Arm | Thigh | Sess | Energy | Sleep | Hamstring | Shoulder |');
      L.push('|---|---|---|---|---|---|---|---|---|---|---|');
      checkins.forEach(function (c) {
        var v = function (x) { return (x == null || x === '') ? '-' : x; };
        L.push('| ' + [c.d, v(c.w), v(c.waist), v(c.chest), v(c.arm), v(c.thigh),
                       v(c.sess), v(c.energy), v(c.sleep), v(c.ham), v(c.sho)].join(' | ') + ' |');
      });
      L.push('');
      var notes = checkins.filter(function (c) { return c.notes; });
      if (notes.length) {
        L.push('**Notes**');
        L.push('');
        notes.forEach(function (c) { L.push('- ' + c.d + ': ' + c.notes); });
        L.push('');
      }
    }

    if (food.length) {
      L.push('## Food');
      L.push('');
      L.push('| Date | kcal | Protein | |');
      L.push('|---|---|---|---|');
      food.slice().reverse().forEach(function (f) {
        L.push('| ' + f.d + ' | ' + f.kcal + ' | ' + f.p + ' g' + (f.kcal < PARTIAL ? ' | partial' : ' | ') + ' |');
      });
      L.push('');
      L.push('### Most recent days in detail');
      L.push('');
      food.slice(-3).reverse().forEach(function (f) {
        L.push('**' + f.d + '** — ' + f.kcal + ' kcal, ' + f.p + ' g protein');
        L.push('');
        f.items.forEach(function (e) {
          L.push('- ' + e.n + (e.q > 1 ? ' x' + e.q : '') + ' — ' +
                 Math.round(e.k * e.q) + ' kcal, ' + (Math.round(e.p * e.q * 10) / 10) + ' g P');
        });
        L.push('');
      });
    }

    var uses = get('uses', {});
    var names = Object.keys(uses).sort(function (a, b) { return uses[b].c - uses[a].c; });
    if (names.length) {
      var totalTaps = names.reduce(function (s, n) { return s + uses[n].c; }, 0);
      L.push('## Button usage');
      L.push('');
      L.push(totalTaps + ' taps across ' + names.length + ' distinct items. ' +
             'Use this to decide which buttons to keep, merge or drop.');
      L.push('');
      L.push('| Item | Times | kcal | Protein |');
      L.push('|---|---|---|---|');
      names.forEach(function (n) {
        L.push('| ' + n + ' | ' + uses[n].c + ' | ' + uses[n].k + ' | ' + uses[n].p + ' g |');
      });
      L.push('');
      var never = [];
      if (typeof LIB !== 'undefined') {
        LIB.forEach(function (g) {
          g[1].forEach(function (it) { if (!uses[it[0]]) never.push(it[0]); });
        });
      }
      if (never.length) {
        L.push('**Never tapped (' + never.length + '):** ' + never.join(', '));
        L.push('');
      }
    }

    var classes = sessions.filter(function (s) { return s.day === 'Class'; });
    if (classes.length) {
      L.push('## Classes');
      L.push('');
      L.push('| Date | Class | Min | Effort | Notes |');
      L.push('|---|---|---|---|---|');
      classes.slice().reverse().forEach(function (s) {
        L.push('| ' + s.date + ' | ' + (s.cls||'-') + ' | ' + (s.mins||'-') + ' | ' +
               (s.rpe||'-') + ' | ' + ((s.pain? s.pain+' ':'') + (s.notes||'')).trim() + ' |');
      });
      L.push('');
    }

    if (sessions.length) {
      L.push('## Sessions');
      L.push('');
      sessions.slice().reverse().forEach(function (s) {
        if (s.day === 'Class') return;
        L.push('### ' + s.date + ' — ' + (s.day === 'H' ? 'Hotel (dumbbells)' : 'Day ' + (s.day || '?') + (s.date >= V2 ? ' (v2)' : '')) + (s.bw ? ' — ' + s.bw + ' kg' : ''));
        L.push('');
        Object.keys(s.ex).forEach(function (k) {
          var rows = s.ex[k].filter(function (r) { return r[0] || r[1]; });
          if (!rows.length) return;
          L.push('- **' + k + '** — ' + rows.map(function (r) {
            return (r[0] || '?') + ' kg x ' + (r[1] || '?');
          }).join(' | '));
        });
        if (s.pain) L.push('- _Hamstring / shoulder:_ ' + s.pain);
        if (s.notes) L.push('- _Notes:_ ' + s.notes);
        L.push('');
      });
    }

    L.push('---');
    L.push('');
    L.push('Ask Claude: "here is my log — what should change?"');
    L.push('');
    return L.join(NL);
  }

  function download(name, text, mime) {
    var blob = new Blob([text], { type: mime || 'text/markdown' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 500);
  }

  function exportMd() {
    download('fitness-log-' + today() + '.md', markdown());
  }

  window.FIT = { status: status, markdown: markdown, exportMd: exportMd,
                 download: download, today: today, nextDay: nextDay, foodDays: foodDays,
                 foodAvg: foodAvg, PARTIAL: PARTIAL, dedupe: dedupe };
})();
