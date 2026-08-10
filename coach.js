/* Shared coaching logic + markdown export.
   Reads only localStorage on this device. Exposes window.FIT. */
(function () {
  var K = 'fit.v1.';
  var START = '2026-08-10';          // week 0 of the programme

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
    var last = sessions.length ? sessions[sessions.length - 1].date : null;
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
      if (weeks >= 9) {
        items.push({ level: 'act', title: 'Week ' + (weeks + 1) + ' — time to rewrite the programme',
          text: 'You have been on this one long enough for it to have done its job. Export your log below and send it to Claude for version 2 — new variations, and a decision on Nordic hamstring curls.' });
      } else if (weeks >= 7) {
        items.push({ level: 'act', title: 'Week ' + (weeks + 1) + ' — deload week',
          text: 'Same exercises, same reps, about 70% of the weight, for one week. This is recovery, not laziness, and skipping it is how weeks 9-12 go badly.' });
      } else if (weeks >= 3) {
        items.push({ level: 'info', title: 'Week ' + (weeks + 1) + ' — build phase',
          text: 'Keep adding weight whenever a lift hits the top of its rep range. Deload lands in week ' + (8 - weeks) + ' more week' + ((8 - weeks) === 1 ? '' : 's') + '.' });
      }
      if (weeks >= 8) {
        items.push({ level: 'act', title: 'Eight-week injury review',
          text: 'Compare the right hamstring and shoulder with how they felt at the start. Genuinely better: carry on. Unchanged after eight weeks of loading: book a physiotherapist. That is the whole point of the deadline.' });
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
               recent: recent, recent14: recent14, checkins: checkins.length }
    };
  }

  function nextDay(sessions) {
    if (!sessions.length) return 'A';
    var order = ['A', 'B', 'C'];
    var i = order.indexOf(sessions[sessions.length - 1].day);
    return order[(i + 1) % 3];
  }

  /* ---------- markdown export ---------- */
  function markdown() {
    var sessions = get('sessions', []);
    var checkins = get('checkins', []);
    var st = status();
    var NL = String.fromCharCode(10);
    var L = [];

    L.push('# Training & nutrition log');
    L.push('');
    L.push('Exported ' + today() + ' from the Fitness app.');
    L.push('');
    L.push('- Sessions logged: **' + sessions.length + '**');
    L.push('- Programme week: **' + (st.stats.weeks + 1) + '**');
    L.push('- Sessions in the last 14 days: **' + st.stats.recent14 + '**');
    L.push('- Check-ins: **' + checkins.length + '**');
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

    if (sessions.length) {
      L.push('## Sessions');
      L.push('');
      sessions.slice().reverse().forEach(function (s) {
        L.push('### ' + s.date + ' — Day ' + (s.day || '?') + (s.bw ? ' — ' + s.bw + ' kg' : ''));
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
                 download: download, today: today, nextDay: nextDay };
})();
