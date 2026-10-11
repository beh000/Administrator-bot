// «📊 Статистика»: месяц с переключением, сравнение с прошлым месяцем
const { Composer, InlineKeyboard } = require('grammy');
const { now, atLocal } = require('../../utils/time');
const { monthStats, delta } = require('../../services/stats');
const { show, fmtMoney } = require('../ui');

const composer = new Composer();

function fmtDelta(ctx, value) {
  if (value === null) return '';
  return ctx.t('st.delta', { sign: value >= 0 ? '+' : '−', value: Math.abs(value) });
}

async function showMonth(ctx, year, month) {
  const first = atLocal(`${year}-${String(month).padStart(2, '0')}-01`);
  const p = first.subtract(1, 'month');
  const n = first.add(1, 'month');
  const cur = await monthStats(ctx.master._id, year, month);
  const prev = await monthStats(ctx.master._id, p.year(), p.month() + 1);

  const lines = [
    ctx.t('st.title', { month: ctx.t(`months.${month}`), year }),
    '',
    ctx.t('st.revenue', { value: fmtMoney(cur.revenue), delta: fmtDelta(ctx, delta(cur.revenue, prev.revenue)) }),
    ctx.t('st.visits', { value: cur.visits, delta: fmtDelta(ctx, delta(cur.visits, prev.visits)) }),
    ctx.t('st.avgCheck', { value: fmtMoney(cur.avgCheck) }),
  ];
  if (cur.upcoming) lines.push(ctx.t('st.upcoming', { count: cur.upcoming, value: fmtMoney(cur.upcomingRevenue) }));
  lines.push(
    '',
    ctx.t('st.clients', { value: cur.clients, fresh: cur.newClients, returning: cur.returning }),
    ctx.t('st.noShows', { value: cur.noShows, rate: cur.noShowRate }),
    ctx.t('st.cancelled', { value: cur.cancelled }),
    ctx.t('st.viaBot', { value: cur.viaBot }),
  );
  if (ctx.master.rating?.count) {
    lines.push('', ctx.t('st.rating', { avg: (ctx.master.rating.sum / ctx.master.rating.count).toFixed(1), count: ctx.master.rating.count }));
  }
  if (!cur.visits && !cur.upcoming && !cur.noShows) lines.push('', ctx.t('st.empty'));

  const kb = new InlineKeyboard();
  kb.text(`◀️ ${ctx.t(`months.${p.month() + 1}`)}`, `st:${p.format('YYYYMM')}`);
  // будущие месяцы (кроме следующего — там уже есть записи) не показываем
  if (!n.isAfter(now().add(1, 'month'), 'month')) kb.text(`${ctx.t(`months.${n.month() + 1}`)} ▶️`, `st:${n.format('YYYYMM')}`);
  if (ctx.master.rating?.count) kb.row().text(ctx.t('rv.listBtn'), 'rv:list');
  kb.row().text(ctx.t('common.back'), 'nav:home');
  return show(ctx, lines.join('\n'), kb);
}

composer.callbackQuery('st:now', (ctx) => showMonth(ctx, now().year(), now().month() + 1));
composer.callbackQuery(/^st:(\d{4})(\d{2})$/, (ctx) => {
  const month = Number(ctx.match[2]);
  if (month < 1 || month > 12) return undefined;
  return showMonth(ctx, Number(ctx.match[1]), month);
});

module.exports = { composer };
