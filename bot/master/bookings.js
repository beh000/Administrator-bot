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

// Имя и телефон клиента: из бота или записанного мастером вручную
function clientOf(b) {
  if (b.clientId && b.clientId.name !== undefined) return { name: b.clientId.name, phone: b.clientId.phone };
  return { name: b.manualName, phone: b.manualPhone };
}

function bookingLine(ctx, b) {
  const start = local(b.start).format('HH:mm');
  const end = local(b.end).format('HH:mm');
  if (b.kind === 'block') return ctx.t('bk.blockLine', { start, end });
  const client = clientOf(b);
  return ctx.t('bk.line', {
    start,
    end,
    service: esc(b.serviceTitle),
    client: esc(client.name || '—'),
    phone: esc(client.phone || ''),
    price: fmtMoney(b.price),
    status: ctx.t(`status.${b.status}`),
  }).replace(/ +·/g, ' ·'); // у ручной записи телефона может не быть
}

async function loadRange(masterId, range) {
  const [from, to] = RANGES[range]();
  return Booking.find({
    masterId,
    status: { $in: VISIBLE },
    start: { $gte: from.toDate(), $lt: to.toDate() },
  })
    .sort({ start: 1 })
    .populate('clientId', 'name phone');
}

function renderList(ctx, bookings, range) {
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

// Текст списка (используется и в утреннем расписании)
async function listText(ctx, masterId, range) {
  return renderList(ctx, await loadRange(masterId, range), range);
}

async function showList(ctx, range) {
  const bookings = await loadRange(ctx.master._id, range);
  const kb = new InlineKeyboard();
  // кнопка на каждую активную будущую запись — открыть, отменить, перенести
  const nowMs = Date.now();
  bookings
    .filter((b) => Booking.ACTIVE_STATUSES.includes(b.status) && b.end.getTime() > nowMs)
    .slice(0, 40)
    .forEach((b) => {
      const time = local(b.start).format(range === 'week' ? 'DD.MM HH:mm' : 'HH:mm');
      const who = b.kind === 'block' ? ctx.t('bk.blockShort') : clientOf(b).name || '—';
      kb.text(`${time} · ${who}`, `mb:v:${b._id}`).row();
    });
  kb.text(ctx.t('mb.newBtn'), 'mb:new').text(ctx.t('mb.blockBtn'), 'mb:block').row();
  kb.text(ctx.t('menu.today'), 'bk:today').text(ctx.t('menu.tomorrow'), 'bk:tomorrow').text(ctx.t('menu.week'), 'bk:week');
  kb.row().text(ctx.t('common.back'), 'nav:home');
  ctx.session.bkRange = range;
  return showScreen(ctx, renderList(ctx, bookings, range), kb);
}

composer.callbackQuery(/^bk:(today|tomorrow|week)$/, (ctx) => showList(ctx, ctx.match[1]));

module.exports = { composer, listText, showList, clientOf };
