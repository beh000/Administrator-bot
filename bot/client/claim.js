// Клиент открыл ссылку-подтверждение ручной записи (start=b_<token>):
// запись становится его — напоминания, «Мои записи», перенос и отмена.
const { InlineKeyboard } = require('grammy');
const { Booking, Master } = require('../../models');
const { t } = require('../../locales');
const { claimBooking } = require('../../services/booking');
const { addressLine } = require('../location');
const { sendTo } = require('../notify');
const { esc, fmtDay, fmtTime } = require('../ui');

async function claim(ctx, token) {
  const myKb = new InlineKeyboard().text(ctx.t('client.myButton'), 'c:my');
  const pending = await Booking.findOne({ claimToken: token }, { masterId: 1 });
  const master = pending && (await Master.findById(pending.masterId));
  if (!master) return ctx.reply(ctx.t('mb.claimNotFound'));
  if (master.telegramId === ctx.from.id) return ctx.reply(ctx.t('mb.claimOwn'));

  const res = await claimBooking(token, ctx.user);
  // повторно открыл свою же ссылку — просто показываем запись
  if (!res.ok && res.reason !== 'own') {
    const key = { taken: 'mb.claimTaken', inactive: 'mb.claimInactive' }[res.reason] || 'mb.claimNotFound';
    return ctx.reply(ctx.t(key));
  }
  const b = res.booking;
  // имя и телефон из записи мастера — если клиент их ещё не указывал
  if (!ctx.user.name && b.manualName) ctx.user.name = b.manualName;
  if (!ctx.user.phone && b.manualPhone) ctx.user.phone = b.manualPhone;
  if (ctx.user.isModified()) await ctx.user.save();
  const firstTime = res.ok;

  await ctx.reply(
    ctx.t('mb.claimed', {
      master: esc(master.name),
      phone: esc(master.phone),
      service: esc(b.serviceTitle),
      date: fmtDay(ctx.t, b.start),
      time: fmtTime(b.start),
      address: addressLine(ctx.t, master),
    }),
    { reply_markup: myKb },
  );
  if (!firstTime) return undefined;
  const lang = master.language || 'ru';
  return sendTo(ctx.api, master.telegramId, lang, 'mb.claimedMaster', {
    client: esc(b.manualName || ctx.user.name || ctx.from.first_name || '—'),
    date: fmtDay((k, p) => t(lang, k, p), b.start),
    time: fmtTime(b.start),
  });
}

module.exports = { claim };
