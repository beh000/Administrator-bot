// Записи мастера на сегодня / завтра / неделю
const { Composer, InlineKeyboard } = require('grammy');
const { Booking } = require('../../models');
const { now, local, weekdayKey } = require('../../utils/time');
const { show: showScreen, esc, fmtMoney } = require('../ui');

const composer = new Composer();

// Отменённые и просроченные не показываем
const VISIBLE = [...Booking.ACTIVE_STATUSES, 'completed', 'no_show'];

const RANGES = {
  today: () => [now().startOf('day'), now().startOf('day').add(1, 'day')],
  tomorrow: () => [now().startOf('day').add(1, 'day'), now().startOf('day').add(2, 'day')],
  week: () => [now().startOf('day'), now().startOf('day').add(7, 'day')],
};

function bookingLine(ctx, b) {
  const client = b.clientId || {};
  return ctx.t('bk.line', {
    start: local(b.start).format('HH:mm'),
    end: local(b.end).format('HH:mm'),
    service: esc(b.serviceTitle),
    client: esc(client.name || '—'),
    phone: esc(client.phone || ''),
    price: fmtMoney(b.price),
    status: ctx.t(`status.${b.status}`),
  });
}

async function listText(ctx, masterId, range) {
  const [from, to] = RANGES[range]();
  const bookings = await Booking.find({
    masterId,
    status: { $in: VISIBLE },
    start: { $gte: from.toDate(), $lt: to.toDate() },
  })
    .sort({ start: 1 })
    .populate('clientId', 'name phone');

  const lines = [ctx.t(`bk.title.${range}`), ''];
  if (!bookings.length) {
    lines.push(ctx.t('bk.empty'));
    return lines.join('\n');
  }
  let currentDay = null;
  bookings.forEach((b) => {
    const day = local(b.start);
    const dayKey = day.format('YYYY-MM-DD');
    if (range === 'week' && dayKey !== currentDay) {
      if (currentDay) lines.push('');
      lines.push(`<b>${day.format('DD.MM')} ${ctx.t(`days.short.${weekdayKey(day)}`)}</b>`);
      currentDay = dayKey;
    }
    lines.push(bookingLine(ctx, b));
  });
  return lines.join('\n');
}

composer.callbackQuery(/^bk:(today|tomorrow|week)$/, async (ctx) => {
  const text = await listText(ctx, ctx.master._id, ctx.match[1]);
  const kb = new InlineKeyboard()
    .text(ctx.t('menu.today'), 'bk:today')
    .text(ctx.t('menu.tomorrow'), 'bk:tomorrow')
    .text(ctx.t('menu.week'), 'bk:week')
    .row()
    .text(ctx.t('common.back'), 'nav:home');
  return showScreen(ctx, text, kb);
});

module.exports = { composer, listText };
