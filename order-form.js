/* Форма запроса копии документа.

   Любая кнопка с классом order-form-btn открывает модалку с формой вместо
   перехода на Familio: посетитель оставляет имя, почту и мессенджер, запрос
   уходит на почту генеалогу. Что именно запрашивают, берётся из data-doc
   кнопки (а если его нет, из заголовка страницы).

   Форма отправляется в тот же эндпоинт, что и запрос скана метрики в
   справочнике родов (/golubevskaya/foto-api/contact-author), поэтому письма
   приходят в одном формате и ничего нового на сервере поднимать не нужно. */
(function () {
  var API = 'https://fundus.hartschenberg.de/golubevskaya/foto-api';
  var btns = document.querySelectorAll('.order-form-btn');

  var CSS = `
  .of-modal{position:fixed;inset:0;background:rgba(20,17,12,.6);display:none;
    align-items:center;justify-content:center;padding:20px;z-index:200}
  .of-modal.on{display:flex}
  .of-box{background:var(--card);border:1px solid var(--rule);border-radius:6px;
    max-width:520px;width:100%;padding:22px 24px;position:relative;
    max-height:88vh;overflow:auto}
  .of-close{position:absolute;top:10px;right:12px;background:none;border:0;
    font-size:1.2em;color:var(--ink-dim);cursor:pointer;line-height:1}
  .of-box h3{margin:0 0 4px;font-size:1.15em}
  .of-doc{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PT Sans",sans-serif;
    font-size:.86em;color:var(--ink-dim);margin:0 0 14px}
  .of-box label{display:block;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    font-size:.8em;color:var(--ink-dim);margin:10px 0 4px}
  .of-box input,.of-box textarea{width:100%;box-sizing:border-box;font:inherit;
    font-size:.95em;background:var(--paper);color:var(--ink);
    border:1px solid var(--rule);border-radius:4px;padding:8px 10px}
  .of-box textarea{min-height:74px;resize:vertical}
  .of-send{margin-top:14px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    font-size:.86rem;font-weight:600;color:var(--accent-ink);background:var(--accent);
    border:0;border-radius:3px;padding:9px 18px;cursor:pointer}
  .of-send:hover{filter:brightness(1.08)}
  .of-msg{margin-top:10px;font-size:.9em;color:var(--accent)}
  .of-msg.ok{color:var(--accent-2)}
  .of-note{font-size:.82em;color:var(--ink-dim);margin:12px 0 0}`;

  var st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);

  var wrap = document.createElement('div');
  wrap.className = 'of-modal';
  wrap.innerHTML =
    '<div class="of-box">' +
    '<button class="of-close" type="button" aria-label="Закрыть">&#10005;</button>' +
    '<h3>Запрос копии документа</h3>' +
    '<p class="of-doc" id="of-doc"></p>' +
    '<form id="of-form">' +
    '<label>Ваше имя *</label><input name="name" required maxlength="100">' +
    '<label>Ваш e-mail *</label><input name="email" type="email" required maxlength="200">' +
    '<label>WhatsApp или ник в Telegram</label>' +
    '<input name="messenger" maxlength="200" placeholder="+49… или @nickname">' +
    '<label>Что именно нужно</label>' +
    '<textarea name="comment" maxlength="1500" placeholder="Фамилия, годы, что ищете"></textarea>' +
    '<button class="of-send" type="submit">Отправить запрос</button>' +
    '<div class="of-msg" id="of-msg"></div>' +
    '</form>' +
    '<p class="of-note">Копия готовится вручную: генеалог отвечает на почту, ' +
    'сообщает стоимость и сроки. Оплата только после согласования.</p>' +
    '</div>';
  document.body.appendChild(wrap);

  var docEl = wrap.querySelector('#of-doc');
  var form = wrap.querySelector('#of-form');
  var msg = wrap.querySelector('#of-msg');
  var current = '';

  function close() { wrap.classList.remove('on'); }
  wrap.querySelector('.of-close').addEventListener('click', close);
  wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });

  /* внешний вызов: модалка листа дела открывает эту же форму */
  window.openOrderForm = function (doc) {
    current = doc || document.title;
    docEl.textContent = current;
    msg.textContent = '';
    msg.className = 'of-msg';
    wrap.classList.add('on');
  };

  Array.prototype.forEach.call(btns, function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      current = b.dataset.doc || document.title;
      docEl.textContent = current;
      msg.textContent = '';
      msg.className = 'of-msg';
      wrap.classList.add('on');
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(form);
    fd.append('photo', 'ЗАПРОС КОПИИ: ' + current);
    msg.className = 'of-msg';
    msg.textContent = 'Отправка…';
    fetch(API + '/contact-author', { method: 'POST', body: fd })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.ok) {
          msg.className = 'of-msg ok';
          msg.textContent = 'Запрос отправлен. Подтверждение ушло на вашу почту, ' +
            'генеалог свяжется с вами.';
          form.reset();
        } else {
          msg.textContent = j.error || 'Не получилось отправить, попробуйте ещё раз.';
        }
      })
      .catch(function () { msg.textContent = 'Сеть недоступна, попробуйте позже.'; });
  });
})();
