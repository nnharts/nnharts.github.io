/* Подвал: живая посещаемость из /api/stats (сервис fundus-stats).
   Токен Метрики держим на сервере, в страницу он не попадает.
   Если сервис недоступен, строка просто не появляется и вёрстка не ломается. */
(function () {
  var MON = ['января','февраля','марта','апреля','мая','июня','июля','августа',
             'сентября','октября','ноября','декабря'];
  var el = document.getElementById('g-visits');
  if (!el) return;
  fetch('/api/stats').then(function (r) { return r.ok ? r.json() : null }).then(function (d) {
    if (!d || !d.today || !d.total) return;
    var day = '';
    if (d.since) {
      var p = d.since.split('-');
      day = parseInt(p[2], 10) + ' ' + MON[parseInt(p[1], 10) - 1] + ' ' + p[0];
    }
    el.textContent = 'Посетителей: сегодня ' + d.today.users
                   + ' · всего ' + d.total.users + (day ? ' (с ' + day + ')' : '');
    el.title = 'Данные Яндекс.Метрики.' + (day ? ' Счётчик установлен ' + day
             + ', более ранние заходы в статистику не попали.' : '');
  }).catch(function () {});
})();
