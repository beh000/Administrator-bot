// «Мои записи» клиента: список, карточка, отмена, перенос
const { Composer, InlineKeyboard } = require('grammy');
const { Booking, Master } = require('../../models');
const { t } = require('../../locales');
const { cancelByClient, canClientChange } = require('../../services/booking');
const { show, alert, esc, fmtMoney, fmtDay, fmtTime } = require('../ui');
const { sendTo } = require('../notify');

const composer = new Composer();

async function showList(ctx) {
  const bookings = await Booking.find({
    clientId: ctx.user._id,
    status: { $in: Booking.ACTIVE_STATUSES },
    end: { $gt: new Date() },
  })
    .sort({ start: 1 })
    .limit(20)
    .populate('masterId', 'name');

  const kb = new InlineKeyboard();
  if (!bookings.length) {
    kb.text(ctx.t('common.back'), 'nav:home');
    return show(ctx, ctx.t('client.myEmpty'), kb);
  }
  bookings.forEach((b) => {
    const label = ctx.t('client.myItem', {
      date: fmtDay(ctx.t, b.start),
      time: fmtTime(b.start),
      service: b.serviceTitle,
      master: b.masterId?.name || '',
    });
    kb.text(label, `c:b:${b._id}`).row();
  });
  kb.text(ctx.t('common.back'), 'nav:home');
  return show(ctx, ctx.t('client.myTitle'), kb);
}

async function findOwn(ctx, id) {
  if (!/^[0-9a-f]{24}$/.test(id)) return null;
  return Booking.findOne({ _id: id, clientId: ctx.user._id }).populate('masterId', 'name phone');
}

async function showCard(ctx, id) {
  const b = await findOwn(ctx, id);
  if (!b) return showList(ctx);
  const master = b.masterId || {};
  const active = Booking.ACTIVE_STATUSES.includes(b.status) && b.end > new Date();
  const changeable = active && canClientChange(b);
  const lines = [
    ctx.t('client.card', {
      master: esc(master.name),
      phone: esc(master.phone),
      service: esc(b.serviceTitle),
      date: fmtDay(ctx.t, b.start),
      time: fmtTime(b.start),
      price: fmtMoney(b.price),
      status: ctx.t(`status.${b.status}`),
    }),
  ];
  if (b.prepaymentAmount > 0) lines.push(ctx.t('client.cardPrepaid', { amount: fmtMoney(b.prepaymentAmount) }));
  if (active && !changeable) lines.push('', ctx.t('client.tooLateNote'));

  const kb = new InlineKeyboard();
  if (changeable && b.status === 'confirmed') kb.text(ctx.t('client.rescheduleBtn'), `c:rs:${b._id}`).row();
  if (changeable) kb.text(ctx.t('client.cancelBtn'), `c:cx:${b._id}`).row();
  if (master._id) kb.text(ctx.t('client.bookAgain'), `c:new:${master._id}`).row();
  kb.text(ctx.t('common.back'), 'c:my');
  return show(ctx, lines.join('\n'), kb);
}

composer.callbackQuery('c:my', (ctx) => showList(ctx));
composer.callbackQuery(/^c:b:(\w+)$/, (ctx) => showCard(ctx, ctx.match[1]));

// Записаться к этому мастеру ещё раз
composer.callbackQuery(/^c:new:([0-9a-f]{24})$/, (ctx) => {
  ctx.session.booking = { masterId: ctx.match[1] };
  return require('./index').continueBooking(ctx);
});

// --- Отмена ---

composer.callbackQuery(/^c:cx:(\w+)$/, async (ctx) => {
  const b = await findOwn(ctx, ctx.match[1]);
  if (!b) return showList(ctx);
  const kb = new InlineKeyboard()
    .text(ctx.t('client.cancelYes'), `c:cy:${b._id}`)
    .row()
    .text(ctx.t('client.cancelNo'), `c:b:${b._id}`);
  return show(ctx, ctx.t('client.cancelAsk', { service: esc(b.serviceTitle), date: fmtDay(ctx.t, b.start), time: fmtTime(b.start) }), kb);
});

composer.callbackQuery(/^c:cy:([0-9a-f]{24})$/, async (ctx) => {
  const result = await cancelByClient(ctx.match[1], ctx.user);
  if (!result.ok) {
    if (result.reason === 'too_late') {
      const master = await Master.findById(result.booking.masterId, 'phone');
      return alert(ctx, ctx.t('client.tooLate', { phone: master?.phone || '' }));
    }
    return showList(ctx);
  }
  const b = result.booking;
  const master = await Master.findById(b.masterId);
  const text = [ctx.t('client.cancelled')];
  if (b.prepaymentAmount > 0 && master) text.push('', ctx.t('client.cancelledPrepaid', { phone: esc(master.phone) }));
  await show(ctx, text.join('\n'), new InlineKeyboard().text(ctx.t('client.myButton'), 'c:my'));

  if (master) {
    const lang = master.language;
    await sendTo(ctx.api, master.telegramId, lang, 'notify.cancelled', {
      client: esc(ctx.user.name),
      phone: esc(ctx.user.phone),
      service: esc(b.serviceTitle),
      date: fmtDay((k) => t(lang, k), b.start),
      time: fmtTime(b.start),
    });
  }
  return undefined;
});

// --- Перенос: та же услуга, новое время; старая запись отменится при подтверждении ---

composer.callbackQuery(/^c:rs:(\w+)$/, async (ctx) => {
  const b = await findOwn(ctx, ctx.match[1]);
  if (!b || b.status !== 'confirmed') return showList(ctx);
  if (!canClientChange(b)) return alert(ctx, ctx.t('client.tooLate', { phone: b.masterId?.phone || '' }));
  ctx.session.booking = {
    masterId: String(b.masterId._id),
    rescheduleFrom: String(b._id),
    serviceId: b.serviceId,
  };
  return require('./index').continueBooking(ctx);
});

module.exports = { composer, showList };
