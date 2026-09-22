/* study-os web app. No dependencies, no network, no install.
   Runs from a URL or straight off the filesystem. Progress is per-browser. */
(function () {
  'use strict';

  var DATA = window.__STUDY_DATA__;
  var KEY = 'study-os:' + DATA.course.id + ':v1';
  var BOX_DAYS = { 1: 1, 2: 3, 3: 7, 4: 16, 5: 35 };
  var MAX_BOX = 5;

  // ---------------------------------------------------------------- storage

  function today() { return new Date().toISOString().slice(0, 10); }
  function addDays(iso, n) {
    var d = new Date(iso + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function emptyState() { return { version: 1, cards: {}, sessions: [] }; }

  var state = (function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return emptyState();
      var s = JSON.parse(raw);
      return { version: 1, cards: s.cards || {}, sessions: s.sessions || [] };
    } catch (e) {
      // Private mode, blocked storage, or corrupt data must never block study.
      return emptyState();
    }
  })();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { toast('Could not save progress in this browser'); }
  }

  function cardState(id) {
    return state.cards[id] || { box: 0, due: null, reps: 0, lapses: 0 };
  }
  function isDue(id, day) {
    var c = cardState(id);
    return c.box === 0 || !c.due || c.due <= (day || today());
  }
  function grade(id, result) {
    var prev = cardState(id), box;
    if (result === 'got') box = Math.min(MAX_BOX, Math.max(1, prev.box + 1));
    else if (result === 'shaky') box = Math.max(1, prev.box);
    else box = 1;
    var day = today();
    state.cards[id] = {
      box: box, due: addDays(day, BOX_DAYS[box]),
      reps: prev.reps + 1, lapses: prev.lapses + (result === 'missed' ? 1 : 0),
      lastSeen: day
    };
    save();
    return BOX_DAYS[box];
  }

  // ------------------------------------------------------------ markdown

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function inline(s) {
    // Links are extracted before the emphasis passes run. URLs legitimately
    // contain underscores (search_query=) and asterisks, and letting the
    // italic rule loose on them corrupts the href — which shipped, and broke
    // every video link in every pack.
    var slots = [];
    var stash = function (html) { return '\u0000' + (slots.push(html) - 1) + '\u0000'; };

    var out = esc(s)
      .replace(/`([^`]+)`/g, function (m, c) { return stash('<code>' + c + '</code>'); })
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, text, url) {
        return stash('<a href="' + url + '" target="_blank" rel="noopener">' + text + '</a>');
      })
      .replace(/(^|[\s(])&lt;(https?:\/\/\S+?)&gt;/g, function (m, pre, url) {
        return pre + stash('<a href="' + url + '" target="_blank" rel="noopener">' + url + '</a>');
      })
      .replace(/(^|[^*])\*\*([^*]+)\*\*/g, '$1<strong>$2</strong>')
      .replace(/(^|[^*_])_([^_]+)_/g, '$1<em>$2</em>');

    return out.replace(/\u0000(\d+)\u0000/g, function (m, i) { return slots[Number(i)]; });
  }

  /* Renders the markdown subset the packs are written in: headings, lists,
     checkbox lists, tables, blockquotes, rules, paragraphs. */
  function md(src) {
    if (!src) return '';
    var lines = String(src).replace(/\r/g, '').split('\n');
    var out = [], i = 0;

    function flushList(tag, items) {
      out.push('<' + tag + '>' + items.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</' + tag + '>');
    }

    /* Rebuild indentation as real nesting, so sub-points stay sub-points. */
    function nestList(items, start) {
      var base = items[start].indent, html = '<ul>', k = start;
      while (k < items.length) {
        if (items[k].indent < base) break;
        if (items[k].indent > base) {
          var sub = nestList(items, k);
          html = html.replace(/<\/li>$/, '') + sub.html + '</li>';
          k = sub.next;
          continue;
        }
        html += '<li>' + items[k].html + '</li>';
        k++;
      }
      return { html: html + '</ul>', next: k };
    }

    while (i < lines.length) {
      var line = lines[i];

      if (!line.trim()) { i++; continue; }

      if (/^\s*(---|\*\*\*)\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

      if (/^\s*```/.test(line)) {
        var fence = [];
        i++;
        while (i < lines.length && !/^\s*```/.test(lines[i])) { fence.push(lines[i]); i++; }
        i++; // closing fence
        out.push('<pre>' + esc(fence.join('\n')) + '</pre>');
        continue;
      }

      var h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        var lvl = Math.min(h[1].length + 1, 6);
        out.push('<h' + lvl + '>' + inline(h[2]) + '</h' + lvl + '>');
        i++; continue;
      }

      if (/^>\s?/.test(line)) {
        var quote = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { quote.push(lines[i].replace(/^>\s?/, '')); i++; }
        out.push('<blockquote>' + md(quote.join('\n')) + '</blockquote>');
        continue;
      }

      if (/^\|/.test(line) && i + 1 < lines.length && /^\|[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
        var cells = function (r) {
          return r.replace(/^\||\|$/g, '').split('|').map(function (c) { return inline(c.trim()); });
        };
        var head = cells(lines[i]); i += 2;
        var body = [];
        while (i < lines.length && /^\|/.test(lines[i])) { body.push(cells(lines[i])); i++; }
        out.push('<table><thead><tr>' + head.map(function (c) { return '<th>' + c + '</th>'; }).join('') +
          '</tr></thead><tbody>' + body.map(function (r) {
            return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
          }).join('') + '</tbody></table>');
        continue;
      }

      if (/^\s*[-*]\s+/.test(line)) {
        var items = [];
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
          var indent = lines[i].match(/^\s*/)[0].replace(/\t/g, '  ').length;
          var t = lines[i].replace(/^\s*[-*]\s+/, '');
          // Escape first, then prepend the checkbox glyph — the other way
          // round escapes our own markup and shows it as text.
          var box = '';
          if (/^\[ \]\s*/.test(t)) { box = '<span class="box">&#9633;</span> '; t = t.replace(/^\[ \]\s*/, ''); }
          else if (/^\[x\]\s*/i.test(t)) { box = '<span class="box done">&#9745;</span> '; t = t.replace(/^\[x\]\s*/i, ''); }
          items.push({ indent: indent, html: box + inline(t) });
          i++;
        }
        out.push(nestList(items, 0).html);
        continue;
      }

      if (/^\s*\d+\.\s+/.test(line)) {
        var ol = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          ol.push(inline(lines[i].replace(/^\s*\d+\.\s+/, ''))); i++;
        }
        flushList('ol', ol); continue;
      }

      if (/^ {4}\S/.test(line)) {
        var pre = [];
        while (i < lines.length && (/^ {4}/.test(lines[i]) || !lines[i].trim())) {
          if (!lines[i].trim() && !(i + 1 < lines.length && /^ {4}/.test(lines[i + 1]))) break;
          pre.push(lines[i].replace(/^ {4}/, '')); i++;
        }
        out.push('<pre>' + esc(pre.join('\n')) + '</pre>'); continue;
      }

      var para = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|>|\||\s*[-*]\s|\s*\d+\.\s)/.test(lines[i])) {
        para.push(lines[i]); i++;
      }
      if (para.length) out.push('<p>' + inline(para.join(' ')) + '</p>');
      else i++;
    }
    return out.join('\n');
  }

  // ------------------------------------------------------------- helpers

  var topics = DATA.topics;
  var byCode = {};
  topics.forEach(function (t) { byCode[t.code] = t; });
  var packed = topics.filter(function (t) { return t.pack; });

  function allCards() {
    var out = [];
    packed.forEach(function (t) {
      t.pack.cards.forEach(function (c) { out.push({ card: c, topic: t }); });
    });
    return out;
  }
  function dueCards(topic) {
    var day = today();
    var pool = topic
      ? topic.pack.cards.map(function (c) { return { card: c, topic: topic }; })
      : allCards();
    return pool.filter(function (x) { return isDue(x.card.id, day); });
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function topicStats(t) {
    var total = t.pack.cards.length, seen = 0, due = 0, boxSum = 0, day = today();
    t.pack.cards.forEach(function (c) {
      var s = cardState(c.id);
      if (s.box > 0) { seen++; boxSum += s.box; }
      if (isDue(c.id, day)) due++;
    });
    return { total: total, seen: seen, due: due, strength: seen ? boxSum / seen / MAX_BOX : 0 };
  }

  var el = document.getElementById('view');
  function html(s) { el.innerHTML = s; window.scrollTo(0, 0); }
  function on(sel, ev, fn) {
    Array.prototype.forEach.call(el.querySelectorAll(sel), function (n) { n.addEventListener(ev, fn); });
  }
  var toastEl = document.getElementById('toast');
  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  // --------------------------------------------------------------- views

  var views = {};

  views.home = function () {
    var due = dueCards(null);
    var byTopic = {};
    due.forEach(function (x) {
      byTopic[x.topic.code] = (byTopic[x.topic.code] || 0) + 1;
    });
    var codes = Object.keys(byTopic);
    var totalCards = allCards().length;
    var seen = allCards().filter(function (x) { return cardState(x.card.id).box > 0; }).length;

    if (!packed.length) {
      return html('<div class="empty"><h1>No topics yet</h1><p>No study packs have been added to this build.</p></div>');
    }

    var focus = codes.length ? byCode[codes[0]] : packed[0];
    html(
      '<h1>' + esc(DATA.course.title) + '</h1>' +
      '<p class="sub">' + (due.length
        ? '<strong>' + due.length + ' card' + (due.length === 1 ? '' : 's') + '</strong> due across ' + codes.length + ' topic' + (codes.length === 1 ? '' : 's') + '.'
        : 'Nothing due right now. Good time to start a new topic.') + '</p>' +

      (due.length ? '<button class="btn wide" data-go="quiz">Start review &rarr;</button>' : '') +

      '<div class="stat" style="margin-top:22px">' +
        '<div><b>' + seen + '/' + totalCards + '</b><span>cards attempted</span></div>' +
        '<div><b>' + due.length + '</b><span>due now</span></div>' +
        '<div><b>' + packed.length + '</b><span>topics ready</span></div>' +
      '</div>' +

      (codes.length ? '<h2>Due</h2><ul class="clean">' + codes.map(function (c) {
        var t = byCode[c];
        return '<li><button class="topic-row" data-topic="' + c + '">' +
          '<span class="code">' + c + '</span><span class="t">' + esc(t.title) + '</span>' +
          '<span class="pill due">' + byTopic[c] + '</span></button></li>';
      }).join('') + '</ul>' : '') +

      '<h2>A session looks like this</h2>' +
      '<div class="card"><ol class="steps">' +
        '<li><b>Watch</b><small>One video, holding the questions from the pack. 15 min.</small></li>' +
        '<li><b>Capture</b><small>Close the video. Write what you remember. Then check the book. 5 min.</small></li>' +
        '<li><b>Recall</b><small>Quiz yourself out loud, and grade honestly. 10 min.</small></li>' +
        '<li><b>Check</b><small>One exam question, marked strictly. 10 min.</small></li>' +
      '</ol>' +
      '<button class="btn ghost wide sm" data-topic="' + focus.code + '">Start with ' + focus.code + ' ' + esc(focus.title) + '</button>' +
      '</div>' +
      '<p class="sub">The capture step is the one that does the work, and the one that feels worst. <a href="#" data-go="why">Why that is.</a></p>'
    );
  };

  views.why = function () {
    html(
      '<h1>Why this works</h1>' +
      md(DATA.method || '') +
      '<button class="btn ghost" data-go="home">Back</button>'
    );
  };

  views.browse = function () {
    var groups = {};
    topics.forEach(function (t) {
      (groups[t.theme] = groups[t.theme] || []).push(t);
    });
    html('<h1>All topics</h1><p class="sub">' + packed.length + ' of ' + topics.length + ' have study packs.</p>' +
      Object.keys(groups).sort().map(function (th) {
        return '<h2>Theme ' + th + ' &middot; <span style="font-weight:400;color:var(--muted)">' + esc(DATA.themes[th]) + '</span></h2><ul class="clean">' +
          groups[th].map(function (t) {
            var s = t.pack ? topicStats(t) : null;
            return '<li>' + (t.pack
              ? '<button class="topic-row" data-topic="' + t.code + '"><span class="code">' + t.code + '</span>' +
                '<span class="t">' + esc(t.title) + (t.hlOnly ? ' <span class="pill hl">HL</span>' : '') + '</span>' +
                '<span class="bar-track"><span class="bar-fill" style="width:' + Math.round(s.strength * 100) + '%"></span></span></button>'
              : '<span class="topic-row" style="opacity:.45"><span class="code">' + t.code + '</span>' +
                '<span class="t">' + esc(t.title) + (t.hlOnly ? ' <span class="pill hl">HL</span>' : '') + '</span>' +
                '<span class="pill">no pack</span></span>') + '</li>';
          }).join('') + '</ul>';
      }).join('')
    );
  };

  views.progress = function () {
    if (!packed.length) return html('<div class="empty"><p>Nothing to show yet.</p></div>');
    var totals = packed.map(topicStats);
    var cards = totals.reduce(function (n, s) { return n + s.total; }, 0);
    var seen = totals.reduce(function (n, s) { return n + s.seen; }, 0);
    var due = totals.reduce(function (n, s) { return n + s.due; }, 0);
    var sessions = state.sessions.length;

    html('<h1>Progress</h1>' +
      '<p class="sub">Bars show how well you can <em>recall</em> a topic, not how much you have read.</p>' +
      '<div class="stat">' +
        '<div><b>' + seen + '/' + cards + '</b><span>cards attempted</span></div>' +
        '<div><b>' + due + '</b><span>due now</span></div>' +
        '<div><b>' + sessions + '</b><span>sessions done</span></div>' +
      '</div>' +
      '<ul class="clean">' + packed.map(function (t) {
        var s = topicStats(t);
        return '<li><button class="topic-row" data-topic="' + t.code + '">' +
          '<span class="code">' + t.code + '</span><span class="t">' + esc(t.title) + '</span>' +
          '<span style="font-size:12px;color:var(--muted);min-width:3.4em;text-align:right">' + s.seen + '/' + s.total + '</span>' +
          '<span class="bar-track"><span class="bar-fill" style="width:' + Math.round(s.strength * 100) + '%"></span></span></button></li>';
      }).join('') + '</ul>' +
      '<h2>Moving between devices</h2>' +
      '<div class="card"><p>Progress is saved in <strong>this browser only</strong>. If you study on a school laptop and at home, carry it across with these.</p>' +
      '<div class="row"><button class="btn ghost sm" id="exp">Copy my progress</button>' +
      '<button class="btn ghost sm" id="imp">Paste progress in</button>' +
      '<button class="btn ghost sm" id="dl">Download backup</button></div></div>'
    );

    document.getElementById('exp').onclick = function () {
      var text = JSON.stringify(state);
      navigator.clipboard && navigator.clipboard.writeText(text).then(
        function () { toast('Progress copied. Paste it on the other device.'); },
        function () { window.prompt('Copy this:', text); }
      ) || window.prompt('Copy this:', text);
    };
    document.getElementById('imp').onclick = function () {
      var text = window.prompt('Paste the progress text from your other device:');
      if (!text) return;
      try {
        var s = JSON.parse(text);
        if (!s || typeof s.cards !== 'object') throw new Error('bad');
        // Merge rather than replace: keep whichever record is further along.
        Object.keys(s.cards).forEach(function (id) {
          var mine = state.cards[id], theirs = s.cards[id];
          if (!mine || (theirs.reps || 0) > (mine.reps || 0)) state.cards[id] = theirs;
        });
        state.sessions = (state.sessions || []).concat(s.sessions || []).slice(-500);
        save(); toast('Progress merged.'); views.progress();
      } catch (e) { toast('That did not look like progress data.'); }
    };
    document.getElementById('dl').onclick = function () {
      var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = DATA.course.id + '-progress-' + today() + '.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    };
  };

  views.topic = function (code) {
    var t = byCode[code];
    if (!t || !t.pack) return views.browse();
    var s = topicStats(t);
    var book = DATA.book;
    html(
      '<p class="meta">Theme ' + t.theme + ' &middot; ' + esc(t.levelTitle) + (t.hlOnly ? ' &middot; HL only' : '') + '</p>' +
      '<h1>' + t.code + ' ' + esc(t.title) + '</h1>' +
      (t.pack.oneLiner ? '<p class="sub">' + inline(t.pack.oneLiner) + '</p>' : '') +
      '<div class="card"><ol class="steps">' +
        '<li><b>Watch</b><small>One video, with the questions in front of you.</small></li>' +
        '<li><b>Capture</b><small>Write what you remember' + (book && t.pages ? ', then check pp. ' + t.pages + ' of your study guide' : '') + '.</small></li>' +
        '<li><b>Recall</b><small>' + s.due + ' of ' + s.total + ' cards due.</small></li>' +
        '<li><b>Check</b><small>' + t.pack.exam.length + ' exam questions with mark schemes.</small></li>' +
      '</ol>' +
      '<div class="row"><button class="btn" data-go="watch" data-code="' + t.code + '">Start: watch &rarr;</button>' +
      '<button class="btn ghost" data-go="quiz" data-code="' + t.code + '">Quiz only</button>' +
      '<button class="btn ghost" data-go="exam" data-code="' + t.code + '">Exam question</button></div></div>' +
      '<h2>What you have to be able to do</h2>' + md(t.pack.essentials) +
      (t.pack.traps ? '<h2>Where the marks go</h2>' + md(t.pack.traps) : '')
    );
  };

  views.watch = function (code) {
    var t = byCode[code];
    if (!t || !t.pack) return views.browse();
    var book = DATA.book;
    html(
      '<p class="meta">' + t.code + ' &middot; step 1 of 4</p>' +
      '<h1>Watch</h1>' +
      md(t.pack.videos) +
      '<h2>Now close the video</h2>' +
      '<div class="capture">' +
        '<p><strong>From memory, with nothing open:</strong></p>' +
        '<textarea id="cap" placeholder="Three things I can now state:&#10;1.&#10;2.&#10;3.&#10;&#10;One thing I could explain out loud:&#10;-&#10;&#10;One thing still fuzzy:&#10;-"></textarea>' +
        '<p class="note">This will feel bad. You just watched a clear explanation and can produce almost none of it. That gap is the real state of your knowledge — everyone has it, most people never look.</p>' +
      '</div>' +
      (book && t.pages
        ? '<div class="card"><h3>Then check yourself</h3><p>' + esc(book.author) + ', <em>' + esc(book.title) + '</em>, <strong>section ' + t.code + ', pp. ' + t.pages + '</strong>.' +
          (t.bookTitle ? ' The book prints this one as &ldquo;' + esc(t.bookTitle) + '&rdquo;.' : '') +
          '</p><p class="note">Read it only after you have written the box above. Mark every point you missed — those are the ones to watch for in the quiz.</p></div>'
        : '') +
      '<button class="btn wide" data-go="quiz" data-code="' + t.code + '">Done — quiz me &rarr;</button>'
    );
    // Keep the capture text for this topic so a reload does not lose it.
    var box = document.getElementById('cap');
    var ck = 'study-os:capture:' + t.code;
    try { box.value = sessionStorage.getItem(ck) || ''; } catch (e) {}
    box.addEventListener('input', function () {
      try { sessionStorage.setItem(ck, box.value); } catch (e) {}
    });
  };

  var quiz = null;

  views.quiz = function (code) {
    var topic = code ? byCode[code] : null;
    if (code && (!topic || !topic.pack)) return views.browse();
    var pool = dueCards(topic);
    if (!pool.length && topic) pool = topic.pack.cards.map(function (c) { return { card: c, topic: topic }; });
    if (!pool.length) {
      return html('<div class="empty"><h1>Nothing due</h1><p>Every card you have seen is resting. Start a new topic, or try an exam question.</p>' +
        '<div class="row" style="justify-content:center"><button class="btn ghost" data-go="browse">Browse topics</button></div></div>');
    }
    quiz = { deck: shuffle(pool).slice(0, 20), i: 0, got: 0, shaky: 0, missed: 0, revealed: false };
    renderCard();
  };

  function renderCard() {
    if (quiz.i >= quiz.deck.length) return quizDone();
    var item = quiz.deck[quiz.i], c = item.card;
    var pct = Math.round((quiz.i / quiz.deck.length) * 100);
    html(
      '<p class="meta">' + item.topic.code + ' &middot; card ' + (quiz.i + 1) + ' of ' + quiz.deck.length + '</p>' +
      '<div class="card">' +
        '<p class="q">' + inline(c.q) + '</p>' +
        (c.marks ? '<p class="note">[' + c.marks + ' marks]</p>' : '') +
        '<div id="ans" class="hide">' +
          '<div class="a">' + md(c.a) + (c.note ? '<p class="note">' + inline(c.note) + '</p>' : '') + '</div>' +
          '<div class="grade">' +
            '<button class="g-got" data-grade="got">Got it<span>solid</span></button>' +
            '<button class="g-shaky" data-grade="shaky">Shaky<span>half there</span></button>' +
            '<button class="g-missed" data-grade="missed">Missed<span>no idea</span></button>' +
          '</div>' +
        '</div>' +
        '<button class="btn wide" id="reveal" style="margin-top:16px">Say it out loud, then reveal</button>' +
      '</div>' +
      '<div class="progress-track"><div style="width:' + pct + '%"></div></div>'
    );
    document.getElementById('reveal').onclick = function () {
      document.getElementById('ans').classList.remove('hide');
      this.classList.add('hide');
    };
    on('[data-grade]', 'click', function () {
      var days = grade(c.id, this.getAttribute('data-grade'));
      quiz[this.getAttribute('data-grade')]++;
      quiz.i++;
      toast(days === 1 ? 'Back tomorrow' : 'Back in ' + days + ' days');
      renderCard();
    });
  }

  function quizDone() {
    var n = quiz.got + quiz.shaky + quiz.missed;
    if (n) {
      state.sessions.push({ date: today(), cards: n, got: quiz.got, shaky: quiz.shaky, missed: quiz.missed });
      if (state.sessions.length > 500) state.sessions = state.sessions.slice(-500);
      save();
    }
    var weak = quiz.missed + quiz.shaky;
    html('<h1>Done</h1>' +
      '<div class="stat">' +
        '<div><b style="color:var(--good)">' + quiz.got + '</b><span>got it</span></div>' +
        '<div><b style="color:var(--mid)">' + quiz.shaky + '</b><span>shaky</span></div>' +
        '<div><b style="color:var(--bad)">' + quiz.missed + '</b><span>missed</span></div>' +
      '</div>' +
      '<div class="card"><p>' + (weak
        ? 'The ' + weak + ' you did not have are the useful ones. They come back within a day or three. <strong>Missing cards is the system working, not you failing.</strong>'
        : 'Clean run. Those cards now move out to longer intervals.') + '</p></div>' +
      '<div class="row"><button class="btn" data-go="home">Home</button>' +
      '<button class="btn ghost" data-go="quiz">More cards</button></div>');
  }

  views.exam = function (code) {
    var t = byCode[code];
    if (!t || !t.pack || !t.pack.exam.length) return views.browse();
    var q = t.pack.exam[Math.floor(Math.random() * t.pack.exam.length)];
    var book = DATA.book;
    html(
      '<p class="meta">' + t.code + ' &middot; exam practice</p>' +
      '<div class="card">' + md(q.question) +
        '<p class="note">Write the answer out in full, on paper, before you reveal the mark scheme. Reading one and agreeing with it is worth nothing.</p>' +
        '<button class="btn wide" id="reveal">Reveal mark scheme</button>' +
        '<div id="ms" class="hide" style="margin-top:16px"><div class="scheme">' + md(q.scheme) + '</div>' +
        '<p class="note">Mark yourself strictly. A point you &ldquo;basically said&rdquo; did not score.</p></div>' +
      '</div>' +
      (book && t.questionsPage
        ? '<p class="sub">More: your study guide has a ' + t.theme + t.level + ' question set on p. ' + t.questionsPage +
          ', with answers free at <a href="' + esc(book.answersUrl) + '" target="_blank" rel="noopener">oxfordsecondary.com</a>.</p>'
        : '') +
      '<div class="row"><button class="btn ghost" data-go="exam" data-code="' + t.code + '">Another question</button>' +
      '<button class="btn ghost" data-go="topic" data-code="' + t.code + '">Back to ' + t.code + '</button></div>'
    );
    document.getElementById('reveal').onclick = function () {
      document.getElementById('ms').classList.remove('hide');
      this.classList.add('hide');
    };
  };

  // -------------------------------------------------------------- routing

  function go(name, arg) {
    location.hash = '#' + name + (arg ? '/' + arg : '');
  }
  function route() {
    var raw = (location.hash || '#home').slice(1).split('/');
    var name = raw[0] || 'home';
    var fn = views[name] || views.home;
    Array.prototype.forEach.call(document.querySelectorAll('nav button'), function (b) {
      if (b.getAttribute('data-go') === name) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    fn(raw[1]);
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-go],[data-topic]');
    if (!t) return;
    if (t.hasAttribute('data-topic')) { e.preventDefault(); return go('topic', t.getAttribute('data-topic')); }
    e.preventDefault();
    go(t.getAttribute('data-go'), t.getAttribute('data-code') || '');
  });

  window.addEventListener('hashchange', route);
  route();
})();
