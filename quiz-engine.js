// AIGP Quiz Engine v1.3
// One-time asset on GitHub Pages. Referenced by every quiz HTML file.
// Usage: <script src="quiz-engine.js"></script> then call initQuiz(config)
//
// config shape:
//   { day, week, comp, topic, filename, webhookUrl, questions[] }
// question shape:
//   { id, comp, isRetrieval, stem, options:{A,B,C,D}, correct, explanation, bokRef }
//
// v1.2: full question text in review panel; bokRef sent as comp to Google Sheet
// v1.3: Previous button added — navigate back to any answered question

(function (global) {
  'use strict';

  var DOMAIN_COLORS = {
    'I':   { light: '#e8f5ee', dark: '#1a5c3a' },
    'II':  { light: '#e8f0f8', dark: '#1a4a7a' },
    'III': { light: '#fdf3de', dark: '#7a4a00' },
    'IV':  { light: '#fceae8', dark: '#7a1a1a' }
  };

  function domainNum(comp) {
    return (comp || 'I').split('.')[0].split('+')[0].trim();
  }

  function colors(comp) {
    return DOMAIN_COLORS[domainNum(comp)] || DOMAIN_COLORS['I'];
  }

  var STORAGE_KEY = 'aigp_quiz_history';

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function appendHistory(session) {
    try {
      var h = loadHistory();
      h.push(session);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(h));
      return true;
    } catch (e) { return false; }
  }

  function missCount(qId) {
    var count = 0;
    loadHistory().forEach(function (s) {
      (s.questions || []).forEach(function (q) {
        if (q.id === qId && q.correct === false) count++;
      });
    });
    return count;
  }

  function injectStyles(dark, light) {
    if (document.getElementById('aqe-style')) return;
    var s = document.createElement('style');
    s.id = 'aqe-style';
    s.textContent = [
      "@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');",
      "*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }",
      "body { font-family: 'DM Sans', sans-serif; background: #f5f5f0; color: #1a1a1a; min-height: 100vh; }",
      "#quiz-root { max-width: 720px; margin: 0 auto; padding: 20px 16px 48px; }",
      ".qe-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 2px solid " + dark + "; }",
      ".qe-title { font-size: 1rem; font-weight: 600; color: " + dark + "; line-height: 1.3; }",
      ".qe-sid { font-family: 'DM Mono', monospace; font-size: 0.62rem; color: #aaa; white-space: nowrap; margin-top: 2px; }",
      ".qe-progress { height: 5px; background: #e0e0e0; border-radius: 3px; margin-bottom: 26px; overflow: hidden; }",
      ".qe-fill { height: 100%; background: " + dark + "; border-radius: 3px; transition: width 0.3s ease; }",
      ".qe-meta { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; }",
      ".qe-qnum { font-family: 'DM Mono', monospace; font-size: 0.72rem; color: #999; }",
      ".chip { font-family: 'DM Mono', monospace; font-size: 0.68rem; font-weight: 500; padding: 2px 8px; border-radius: 4px; }",
      ".chip-domain { background: " + light + "; color: " + dark + "; }",
      ".chip-retrieval { background: #fff3cd; color: #7a5000; }",
      ".chip-tricky { background: #fce4ec; color: #9b1c1c; }",
      ".qe-banner { background: #fffbeb; border-left: 3px solid #f59e0b; padding: 9px 13px; border-radius: 0 4px 4px 0; margin-bottom: 14px; font-size: 0.83rem; color: #7a5000; line-height: 1.45; }",
      ".qe-stem { font-size: 0.97rem; line-height: 1.7; margin-bottom: 18px; }",
      ".qe-options { display: flex; flex-direction: column; gap: 9px; margin-bottom: 22px; }",
      ".qe-opt { display: flex; align-items: flex-start; gap: 11px; padding: 12px 14px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; background: #fff; font-size: 0.93rem; line-height: 1.5; transition: border-color 0.12s, background 0.12s; }",
      ".qe-opt:hover { border-color: " + dark + "; background: " + light + "; }",
      ".qe-opt.selected { border-color: #2563eb; background: #eff6ff; color: #1d4ed8; }",
      ".qe-opt.correct  { border-color: #16a34a; background: #f0fdf4; }",
      ".qe-opt.wrong    { border-color: #dc2626; background: #fef2f2; }",
      ".qe-key { font-family: 'DM Mono', monospace; font-weight: 600; font-size: 0.82rem; min-width: 18px; flex-shrink: 0; color: #777; padding-top: 1px; }",
      ".qe-opt.selected .qe-key { color: #2563eb; }",
      ".qe-opt.correct  .qe-key { color: #15803d; }",
      ".qe-opt.wrong    .qe-key { color: #dc2626; }",
      ".qe-nav { display: flex; justify-content: space-between; align-items: center; }",
      ".btn { font-family: 'DM Sans', sans-serif; font-size: 0.93rem; font-weight: 600; padding: 10px 26px; border: none; border-radius: 6px; cursor: pointer; transition: opacity 0.15s; }",
      ".btn-primary { background: " + dark + "; color: #fff; }",
      ".btn-primary:disabled { opacity: 0.3; cursor: not-allowed; }",
      ".btn-ghost { background: #ebebeb; color: #444; }",
      ".btn-back { background: #f0f0ec; color: #555; border: 1px solid #ddd; }",
      ".btn-back:disabled { opacity: 0.25; cursor: not-allowed; }",
      ".qe-results-top { text-align: center; padding: 24px 0 18px; }",
      ".qe-score-ring { display: inline-flex; align-items: center; justify-content: center; width: 96px; height: 96px; border-radius: 50%; border: 5px solid " + dark + "; font-size: 1.9rem; font-weight: 700; color: " + dark + "; margin-bottom: 10px; }",
      ".qe-score-label { font-size: 1.1rem; font-weight: 600; margin-bottom: 3px; }",
      ".qe-score-sub { font-family: 'DM Mono', monospace; font-size: 0.75rem; color: #888; }",
      ".qe-stats { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin: 18px 0 24px; }",
      ".stat { text-align: center; padding: 11px 18px; border-radius: 8px; background: #fff; border: 1px solid #e8e8e8; }",
      ".stat-n { font-size: 1.55rem; font-weight: 700; }",
      ".stat-l { font-size: 0.72rem; color: #999; margin-top: 1px; }",
      ".stat-ok .stat-n { color: #16a34a; }",
      ".stat-no .stat-n { color: #dc2626; }",
      ".stat-sk .stat-n { color: #d97706; }",
      ".qe-review-hd { font-size: 0.8rem; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px; }",
      ".qe-ri { border: 1px solid #e5e5e5; border-radius: 8px; margin-bottom: 9px; background: #fff; overflow: hidden; }",
      ".qe-ri-toggle { display: flex; align-items: center; gap: 9px; padding: 11px 14px; cursor: pointer; user-select: none; }",
      ".qe-ri-dot { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; flex-shrink: 0; font-weight: 700; }",
      ".dot-ok { background: #dcfce7; color: #15803d; }",
      ".dot-no { background: #fee2e2; color: #dc2626; }",
      ".dot-sk { background: #fef9c3; color: #854d0e; }",
      ".qe-ri-preview { flex: 1; font-size: 0.86rem; color: #555; line-height: 1.5; }",
      ".qe-ri-chev { font-size: 0.75rem; color: #bbb; transition: transform 0.18s; flex-shrink: 0; margin-left: 8px; }",
      ".qe-ri.open .qe-ri-chev { transform: rotate(180deg); }",
      ".qe-ri-body { padding: 0 14px 14px; border-top: 1px solid #f0f0f0; display: none; }",
      ".qe-ri.open .qe-ri-body { display: block; }",
      ".qe-ans-rows { font-family: 'DM Mono', monospace; font-size: 0.78rem; margin: 11px 0; display: flex; flex-direction: column; gap: 5px; }",
      ".ans-row { display: flex; gap: 8px; }",
      ".ans-lbl { color: #aaa; min-width: 86px; }",
      ".ans-ok  { color: #15803d; font-weight: 600; }",
      ".ans-bad { color: #dc2626; }",
      ".qe-expl { font-size: 0.88rem; line-height: 1.65; color: #333; margin: 10px 0 8px; }",
      ".bok-tag { font-family: 'DM Mono', monospace; font-size: 0.67rem; padding: 3px 9px; border-radius: 4px; display: inline-block; }",
      ".qe-save-note { font-family: 'DM Mono', monospace; font-size: 0.71rem; color: #aaa; text-align: center; margin-top: 18px; padding: 10px 14px; background: #f9f9f7; border-radius: 6px; }",
      ".qe-actions { display: flex; gap: 10px; justify-content: center; margin-top: 14px; flex-wrap: wrap; }"
    ].join('\n');
    document.head.appendChild(s);
  }

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function headerHTML(title, sid, pct) {
    return '<div class="qe-header">' +
      '<div class="qe-title">' + esc(title) + '</div>' +
      '<div class="qe-sid">' + esc(sid) + '</div>' +
    '</div>' +
    '<div class="qe-progress"><div class="qe-fill" id="qe-fill" style="width:' + pct + '%"></div></div>';
  }

  global.initQuiz = function (cfg) {
    var root = document.getElementById('quiz-root');
    if (!root) { console.error('quiz-engine: #quiz-root element not found'); return; }

    var qs       = cfg.questions || [];
    var sid      = 'S' + Date.now();
    var title    = 'AIGP Quiz — Day ' + cfg.day + ' · ' + cfg.topic;
    var dc       = colors(cfg.comp);
    var current  = 0;
    var selected = null;
    var answers  = new Array(qs.length).fill(null);

    injectStyles(dc.dark, dc.light);

    function pct() { return Math.round(((current + 1) / qs.length) * 100); }

    function renderQuestion() {
      var q   = qs[current];
      var qc  = colors(q.comp);
      var mc  = missCount(q.id);
      var isFirstRetrieval = q.isRetrieval && (current === 0 || !qs[current - 1].isRetrieval);

      var chips = '<span class="chip chip-domain" style="background:' + qc.light + ';color:' + qc.dark + '">' + esc(q.comp) + '</span>';
      if (q.isRetrieval) chips += ' <span class="chip chip-retrieval">Retrieval</span>';
      if (mc >= 2)       chips += ' <span class="chip chip-tricky">&#9873; Tricky — missed ' + mc + '×</span>';

      var banner = isFirstRetrieval
        ? '<div class="qe-banner">Retrieval round — these questions target prior competencies based on your weaker areas.</div>'
        : '';

      var opts = Object.keys(q.options).map(function (k) {
        return '<div class="qe-opt" data-k="' + k + '">' +
          '<span class="qe-key">' + k + '</span>' +
          '<span>' + esc(q.options[k]) + '</span>' +
        '</div>';
      }).join('');

      var isLast  = current === qs.length - 1;
      var isFirst = current === 0;

      // v1.3: nav row has Back (left) and Next (right)
      var navHTML =
        '<div class="qe-nav">' +
          '<button class="btn btn-back" id="qe-back"' + (isFirst ? ' disabled' : '') + '>&#8592; Back</button>' +
          '<button class="btn btn-primary" id="qe-next" disabled>' +
            (isLast ? 'Submit &amp; Review Results' : 'Next &#8594;') +
          '</button>' +
        '</div>';

      root.innerHTML =
        headerHTML(title, sid, pct()) +
        banner +
        '<div class="qe-meta"><span class="qe-qnum">Q' + (current + 1) + ' of ' + qs.length + '</span>' + chips + '</div>' +
        '<div class="qe-stem">' + esc(q.stem) + '</div>' +
        '<div class="qe-options">' + opts + '</div>' +
        navHTML;

      // Restore previously selected answer (allows re-selection after Back)
      if (answers[current] !== null) {
        var prev = root.querySelector('[data-k="' + answers[current] + '"]');
        if (prev) { prev.classList.add('selected'); selected = answers[current]; }
        document.getElementById('qe-next').disabled = false;
      } else {
        selected = null;
      }

      // Option click handler
      root.querySelectorAll('.qe-opt').forEach(function (opt) {
        opt.addEventListener('click', function () {
          root.querySelectorAll('.qe-opt').forEach(function (o) { o.classList.remove('selected'); });
          opt.classList.add('selected');
          selected = opt.dataset.k;
          answers[current] = selected;
          document.getElementById('qe-next').disabled = false;
        });
      });

      // Next button
      document.getElementById('qe-next').addEventListener('click', function () {
        if (current < qs.length - 1) { current++; renderQuestion(); }
        else { showResults(); }
      });

      // Back button (v1.3)
      var backBtn = document.getElementById('qe-back');
      if (backBtn) {
        backBtn.addEventListener('click', function () {
          if (current > 0) { current--; renderQuestion(); }
        });
      }
    }

    function showResults() {
      var correct = 0, wrong = 0, skipped = 0;
      qs.forEach(function (q, i) {
        if (answers[i] === null) skipped++;
        else if (answers[i] === q.correct) correct++;
        else wrong++;
      });
      var score = Math.round((correct / qs.length) * 100);

      var sessionData = {
        sessionId: sid,
        title: 'AIGP Quiz — Day ' + cfg.day + ' · Competency ' + cfg.comp,
        week: cfg.week,
        day: cfg.day,
        filename: cfg.filename,
        ts: new Date().toISOString(),
        score: score,
        correct: correct,
        total: qs.length,
        questions: qs.map(function (q, i) {
          return {
            id: q.id,
            day: cfg.day,
            week: cfg.week,
            domain: 'Domain ' + domainNum(q.comp),
            comp: q.bokRef || q.comp,   // v1.2: granular PI tag for Google Sheet column E
            isRetrieval: !!q.isRetrieval,
            correct: answers[i] === q.correct,
            skipped: answers[i] === null,
            userAns: answers[i] || 'skipped',
            correctAns: q.correct,
            qText: q.stem   // v1.2: full stem
          };
        })
      };

      var savedLocally = appendHistory(sessionData);
      postWebhook(sessionData);

      var label = score >= 80 ? 'Strong result'
        : score >= 60 ? 'Passing — review your mistakes'
        : 'Needs work — re-read the study card';

      var reviewItems = qs.map(function (q, i) {
        var ua = answers[i];
        var ok = ua === q.correct;
        var sk = ua === null;
        var dotCls = sk ? 'dot-sk' : ok ? 'dot-ok' : 'dot-no';
        var dotIcon = sk ? '—' : ok ? '&#10003;' : '&#10007;';
        var mc = missCount(q.id);
        var qc = colors(q.comp);
        var trickyChip = mc >= 2 ? '<span class="chip chip-tricky" style="margin-right:4px">&#9873; Tricky — missed ' + mc + '×</span>' : '';
        var ansRows;
        if (sk) {
          ansRows = '<div class="ans-row"><span class="ans-lbl">You answered:</span><span style="color:#d97706">Skipped</span></div><div class="ans-row"><span class="ans-lbl">Correct:</span><span class="ans-ok">' + q.correct + ': ' + esc(q.options[q.correct]) + '</span></div>';
        } else if (ok) {
          ansRows = '<div class="ans-row"><span class="ans-lbl">Your answer:</span><span class="ans-ok">' + ua + ': ' + esc(q.options[ua]) + '</span></div>';
        } else {
          ansRows = '<div class="ans-row"><span class="ans-lbl">You answered:</span><span class="ans-bad">' + ua + ': ' + esc(q.options[ua]) + '</span></div><div class="ans-row"><span class="ans-lbl">Correct:</span><span class="ans-ok">' + q.correct + ': ' + esc(q.options[q.correct]) + '</span></div>';
        }
        return '<div class="qe-ri" id="ri' + i + '"><div class="qe-ri-toggle" onclick="qeToggle(' + i + ')"><div class="qe-ri-dot ' + dotCls + '">' + dotIcon + '</div><div class="qe-ri-preview">' + trickyChip + 'Q' + (i + 1) + ': ' + esc(q.stem) + '</div><div class="qe-ri-chev">&#9660;</div></div><div class="qe-ri-body"><div class="qe-ans-rows">' + ansRows + '</div><div class="qe-expl">' + esc(q.explanation) + '</div><div><span class="bok-tag" style="background:' + qc.light + ';color:' + qc.dark + '">BOK ' + esc(q.bokRef) + '</span></div></div></div>';
      }).join('');

      var attemptNum = loadHistory().length;
      var saveNote = savedLocally
        ? 'Saved to localStorage · Attempt #' + attemptNum + ' · ' + new Date().toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })
        : 'localStorage unavailable — results shown above only';

      root.innerHTML =
        headerHTML(title, sid, 100) +
        '<div class="qe-results-top"><div class="qe-score-ring">' + score + '%</div><div class="qe-score-label">' + label + '</div><div class="qe-score-sub">Day ' + cfg.day + ' · ' + esc(cfg.topic) + ' · ' + qs.length + ' questions</div></div>' +
        '<div class="qe-stats"><div class="stat stat-ok"><div class="stat-n">' + correct + '</div><div class="stat-l">Correct</div></div><div class="stat stat-no"><div class="stat-n">' + wrong + '</div><div class="stat-l">Wrong</div></div><div class="stat stat-sk"><div class="stat-n">' + skipped + '</div><div class="stat-l">Skipped</div></div></div>' +
        '<div class="qe-review-hd">Question Review</div>' +
        reviewItems +
        '<div class="qe-save-note">' + saveNote + '</div>' +
        '<div class="qe-actions"><button class="btn btn-ghost" onclick="qeExport()">Export History</button></div>';

      document.getElementById('qe-fill').style.width = '100%';
    }

    // Content-Type must be 'text/plain' in no-cors mode (see v1.1 note)
    function postWebhook(data) {
      if (!cfg.webhookUrl) return;
      try {
        fetch(cfg.webhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(Object.assign({ action: 'saveQuizResult' }, data))
        }).catch(function () {});
      } catch (e) {}
    }

    global.qeToggle = function (i) {
      var el = document.getElementById('ri' + i);
      if (el) el.classList.toggle('open');
    };

    global.qeExport = function () {
      var h = loadHistory();
      var blob = new Blob([JSON.stringify(h, null, 2)], { type: 'application/json' });
      var url  = URL.createObjectURL(blob);
      var a    = document.createElement('a');
      a.href     = url;
      a.download = 'aigp_quiz_history.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    renderQuestion();
  };

}(window));
