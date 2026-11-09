// 不法行為法を学ぶ：画面を組み立てる
// データは data/tort-data.js（window.TORT_DATA）。中身を直すときは、そちらだけ直す
(function () {
  'use strict';
  var D = window.TORT_DATA;

  // 要素を作る小さな道具
  function el(tag, props, children) {
    var n = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      if (k === 'class') n.className = props[k];
      else if (k === 'text') n.textContent = props[k];
      else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), props[k]);
      else n.setAttribute(k, props[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }

  // 図：種類ごとに作り方を分ける
  var DIAGRAMS = {
    flow: function (d) {
      var out = [];
      d.nodes.forEach(function (x, i) {
        if (i) out.push(el('div', { class: 'arrow', 'aria-hidden': 'true', text: '▼' }));
        out.push(el('div', { class: 'box' + (x.goal ? ' goal' : '') }, [el('b', { text: x.label }), x.note ? el('small', { text: x.note }) : null]));
      });
      return el('div', { class: 'flow' }, out);
    },
    compare: function (d) {
      var head = el('tr', null, d.cols.map(function (c) { return el('th', { scope: 'col', text: c }); }));
      var rows = d.rows.map(function (r) { return el('tr', null, r.map(function (c, i) { return el(i ? 'td' : 'th', i ? { text: c } : { scope: 'row', text: c }); })); });
      return el('div', { class: 'cmp-wrap' }, [el('table', { class: 'cmp' }, [el('thead', null, [head]), el('tbody', null, rows)])]);
    },
    tree: function (d) {
      return el('div', { class: 'tree' }, [el('div', { class: 'root', text: d.root })].concat(d.children.map(function (c) {
        return el('div', { class: 'branch' }, [el('b', { text: c.label }), el('ul', null, c.children.map(function (t) { return el('li', { text: t }); }))]);
      })));
    },
    timeline: function (d) {
      var max = Math.max.apply(null, d.bars.map(function (b) { return b.years; }));
      return el('div', { class: 'bars' }, d.bars.map(function (b) {
        var bar = el('div', { class: 'bar', text: b.years + '年' });
        bar.style.width = (b.years / max * 100) + '%';
        return el('div', { class: 'bar-row' }, [el('span', { text: b.label }), el('div', null, [bar])]);
      }));
    }
  };

  function renderRead() {
    var root = document.getElementById('read');
    root.appendChild(el('p', { class: 'note', text: D.basis }));
    root.appendChild(el('ul', { class: 'toc' }, D.sections.map(function (s, i) {
      return el('li', null, [el('a', { href: '#' + s.id, text: (i + 1) + '. ' + s.title })]);
    })));
    D.sections.forEach(function (s, i) {
      var fig = s.diagram ? el('figure', null, [el('figcaption', { text: '図：' + s.diagram.caption }), DIAGRAMS[s.diagram.type](s.diagram)]) : null;
      root.appendChild(el('article', { class: 'card', id: s.id }, [
        el('h2', { text: (i + 1) + '. ' + s.title }),
        el('p', { class: 'ref', text: s.ref })
      ].concat(s.body.map(function (t) { return el('p', { text: t }); })).concat([fig])));
    });
    // 参考にした資料（ライセンスの表示を兼ねる）
    if (D.sources && D.sources.length) {
      root.appendChild(el('footer', { class: 'card sources' }, [el('h2', { text: '参考にした資料' }), el('ul', null, D.sources.map(function (x) {
        return el('li', null, [el('a', { href: x.url, target: '_blank', rel: 'noopener', text: x.title }), x.note ? '（' + x.note + '）' : null]);
      }))]));
    }
  }

  // 解説の場所へ移る
  function goRead(id) {
    showTab('read');
    var t = document.getElementById(id);
    if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // 問題の画面（選択問題と〇×で共通）
  function renderQuestions(rootId, list, isOX) {
    var root = document.getElementById(rootId);
    var done = 0, right = 0;
    var label = el('span');
    function update() { label.textContent = '答えた数 ' + done + ' / ' + list.length + '　正解 ' + right; }
    root.innerHTML = '';
    root.appendChild(el('div', { class: 'score' }, [label, el('button', { type: 'button', text: 'もう一度', onclick: function () { renderQuestions(rootId, list, isOX); } })]));
    update();
    list.forEach(function (q, i) {
      var box = el('div', { class: 'opts' + (isOX ? ' ox' : '') });
      var card = el('article', { class: 'card' }, [el('div', { class: 'q-num', text: (isOX ? '〇×' : '選択') + ' 第' + (i + 1) + '問' }), el('p', { class: 'q-text', text: q.q }), box]);
      var opts = isOX ? [{ t: '〇', v: true }, { t: '×', v: false }] : q.choices.map(function (c, j) { return { t: '(' + (j + 1) + ') ' + c, v: j }; });
      var buttons = opts.map(function (o) {
        var b = el('button', { type: 'button', text: o.t, 'aria-label': isOX ? (o.v ? '正しい' : 'まちがい') : o.t });
        b.addEventListener('click', function () {
          var ok = o.v === q.answer;
          done++; if (ok) right++; update();
          buttons.forEach(function (x, k) {
            x.disabled = true;
            if (opts[k].v === q.answer) x.classList.add('right');
          });
          if (!ok) b.classList.add('wrong');
          var link = el('a', { href: '#' + q.ref, text: '解説を読む', onclick: function (e) { e.preventDefault(); goRead(q.ref); } });
          card.appendChild(el('div', { class: 'result' + (ok ? '' : ' ng') }, [el('b', { text: ok ? '正解' : '不正解' }), el('p', { text: q.explain }), link]));
        });
        box.appendChild(b);
        return b;
      });
      root.appendChild(card);
    });
  }

  function showTab(name) {
    document.querySelectorAll('.tabs button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === name); });
    document.querySelectorAll('.pane').forEach(function (p) { p.classList.toggle('on', p.id === name); });
    window.scrollTo(0, 0);
  }

  document.querySelectorAll('.tabs button').forEach(function (b) {
    b.addEventListener('click', function () { showTab(b.getAttribute('data-tab')); });
  });
  document.getElementById('title').textContent = D.title;
  renderRead();
  renderQuestions('choice', D.choice, false);
  renderQuestions('quiz', D.quiz, true);
})();
