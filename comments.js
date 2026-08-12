/* Комментарии Fundus: страницы фотографий (Lichtbilder) и газетных вырезок
   (Zeitungsecke). Виджет сам рисует форму, список и вход, ему достаточно
   пустого <div id="fundus-comments"> на странице.

   Вход: одноразовая ссылка на e-mail либо Telegram Login Widget. Кнопка
   Telegram появляется, только если у сервиса задан бот (GET /config).
   Первый комментарий нового автора проходит модерацию, автору он виден сразу
   с пометкой «ждёт одобрения». */
(function () {
  var API = '/api/comments';
  var box = document.getElementById('fundus-comments');
  if (!box) return;

  var page = location.pathname;
  var title = (document.querySelector('h1') || {}).textContent || document.title;
  var me = null, cfg = {};

  var CSS = `
  .fc{margin:38px 0 0;border-top:1px solid var(--rule);padding-top:22px}
  .fc h2{font-size:1.15em;margin:0 0 14px}
  .fc-item{border-bottom:1px solid var(--rule);padding:12px 0}
  .fc-item:last-of-type{border-bottom:0}
  .fc-head{font-size:.9em;color:var(--ink-dim);margin:0 0 4px}
  .fc-who{color:var(--ink);font-weight:700}
  .fc-text{margin:0;white-space:pre-wrap}
  .fc-pending{font-size:.85em;color:var(--accent)}
  .fc-empty{color:var(--ink-dim);font-style:italic;margin:0 0 14px}
  .fc textarea{width:100%;box-sizing:border-box;font:inherit;font-size:.95em;
    background:var(--card);color:var(--ink);border:1px solid var(--rule);
    border-radius:6px;padding:9px 11px;min-height:92px;resize:vertical}
  .fc input[type=text],.fc input[type=email]{font:inherit;font-size:.95em;
    background:var(--card);color:var(--ink);border:1px solid var(--rule);
    border-radius:6px;padding:7px 11px;margin:0 8px 8px 0;min-width:230px}
  .fc button{font:inherit;font-size:.9em;border:1px solid var(--accent);
    color:var(--accent);background:transparent;border-radius:14px;
    padding:5px 16px;cursor:pointer;margin:8px 8px 0 0}
  .fc button:hover{background:var(--accent);color:var(--accent-ink)}
  .fc button.plain{border-color:var(--rule);color:var(--ink-dim)}
  .fc button.plain:hover{background:var(--paper-2);color:var(--ink)}
  .fc-note{font-size:.87em;color:var(--ink-dim);margin:8px 0 0}
  .fc-msg{font-size:.92em;color:var(--accent);margin:10px 0 0}
  .fc-login{background:var(--card);border:1px solid var(--rule);
    border-radius:8px;padding:14px 16px;margin-top:10px}`;

  var st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);

  var root = document.createElement('section');
  root.className = 'fc';
  box.appendChild(root);

  function esc(s) {
    return (s || '').replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function when(ts) {
    var d = new Date(ts * 1000);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function post(url, data) {
    var fd = new FormData();
    Object.keys(data).forEach(function (k) { fd.append(k, data[k]); });
    return fetch(API + url, { method: 'POST', body: fd, credentials: 'same-origin' })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); });
  }

  function itemsHtml(items) {
    if (!items.length) return '<p class="fc-empty">Пока никто не откликнулся. Будьте первым.</p>';
    return items.map(function (i) {
      return '<div class="fc-item"><p class="fc-head"><span class="fc-who">' + esc(i.name) +
        '</span> · ' + when(i.created) +
        (i.pending ? ' · <span class="fc-pending">ждёт одобрения</span>' : '') +
        '</p><p class="fc-text">' + esc(i.text) + '</p></div>';
    }).join('');
  }

  function formHtml() {
    if (me && me.auth) {
      return '<form id="fc-form"><textarea name="text" maxlength="4000" ' +
        'placeholder="Что вы знаете об этих людях, месте или событии?"></textarea>' +
        '<button type="submit">Отправить</button>' +
        '<button type="button" class="plain" id="fc-out">Выйти (' + esc(me.name) + ')</button>' +
        (me.trusted ? '' : '<p class="fc-note">Ваш первый комментарий увидит модератор, ' +
          'дальше вы сможете писать сразу.</p>') +
        '<p class="fc-msg" id="fc-msg"></p></form>';
    }
    var tg = cfg.telegram
      ? '<p class="fc-note">Или войдите через Telegram:</p><div id="fc-tg"></div>'
      : '';
    return '<div class="fc-login"><p class="fc-note" style="margin-top:0">' +
      'Чтобы оставить комментарий, представьтесь. Пароль не нужен: мы пришлём ' +
      'одноразовую ссылку для входа.</p>' +
      '<form id="fc-login-form"><input type="text" name="name" placeholder="Как вас зовут" ' +
      'required><input type="email" name="email" placeholder="Ваш e-mail" required>' +
      '<button type="submit">Прислать ссылку</button>' +
      '<p class="fc-msg" id="fc-msg"></p></form>' + tg + '</div>';
  }

  function bind() {
    var f = document.getElementById('fc-form');
    if (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var msg = document.getElementById('fc-msg');
        var text = f.text.value.trim();
        if (text.length < 2) { msg.textContent = 'Напишите пару слов.'; return; }
        msg.textContent = 'Отправляю...';
        post('/add', { page: page, text: text, page_title: title }).then(function (r) {
          if (!r.j.ok) { msg.textContent = r.j.error || 'Не получилось отправить.'; return; }
          f.text.value = '';
          msg.textContent = r.j.pending
            ? 'Спасибо. Комментарий отправлен на модерацию.'
            : 'Спасибо, комментарий опубликован.';
          load();
        });
      });
      document.getElementById('fc-out').addEventListener('click', function () {
        post('/logout', {}).then(function () { me = null; load(); });
      });
    }
    var lf = document.getElementById('fc-login-form');
    if (lf) {
      lf.addEventListener('submit', function (e) {
        e.preventDefault();
        var msg = document.getElementById('fc-msg');
        msg.textContent = 'Отправляю письмо...';
        post('/auth/email', {
          email: lf.email.value.trim(), name: lf.name.value.trim(), back: page
        }).then(function (r) {
          msg.textContent = r.j.ok
            ? 'Письмо отправлено. Откройте ссылку из него, и вы вернётесь сюда.'
            : (r.j.error || 'Не получилось отправить письмо.');
        });
      });
    }
    var tgBox = document.getElementById('fc-tg');
    if (tgBox && cfg.telegram) {
      window.fcTelegramAuth = function (user) {
        fetch(API + '/auth/telegram', {
          method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user)
        }).then(function (r) { return r.json(); }).then(function () { load(); });
      };
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://telegram.org/js/telegram-widget.js?22';
      s.setAttribute('data-telegram-login', cfg.telegram);
      s.setAttribute('data-size', 'medium');
      s.setAttribute('data-userpic', 'false');
      s.setAttribute('data-onauth', 'fcTelegramAuth(user)');
      s.setAttribute('data-request-access', 'write');
      tgBox.appendChild(s);
    }
  }

  function render(items) {
    root.innerHTML = '<h2>Комментарии' + (items.length ? ' (' + items.length + ')' : '') +
      '</h2>' + itemsHtml(items) + formHtml();
    bind();
  }

  function load() {
    Promise.all([
      fetch(API + '/me', { credentials: 'same-origin' }).then(function (r) { return r.json(); }),
      fetch(API + '/list?page=' + encodeURIComponent(page), { credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
    ]).then(function (res) {
      me = res[0];
      render((res[1] && res[1].items) || []);
    }).catch(function () {
      root.innerHTML = '<h2>Комментарии</h2><p class="fc-empty">Не удалось загрузить ' +
        'комментарии, попробуйте обновить страницу.</p>';
    });
  }

  fetch(API + '/config').then(function (r) { return r.json(); })
    .then(function (c) { cfg = c || {}; }).catch(function () { cfg = {}; })
    .then(load);
})();
