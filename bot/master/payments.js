// Мастер проверяет скриншот предоплаты: «✅ Оплата получена» / «❌ Оплаты нет»
const { Composer } = require('grammy');
const { Client } = require('../../models');
const { reviewPayment } = require('../../services/payments');
const { alert, esc } = require('../ui');
const { notifyPayment } = require('./clientNotify');

const composer = new Composer();

composer.callbackQuery(/^pm:(ok|no):([0-9a-f]{24})$/, async (ctx) => {
  const approved = ctx.match[1] === 'ok';
  const booking = await reviewPayment(ctx.match[2], ctx.master._id, approved);
  if (!booking) return alert(ctx, ctx.t('pm.notActive'));

  // Отметка под скриншотом вместо кнопок, чтобы не нажать дважды
  const mark = ctx.t(approved ? 'pm.approvedMark' : 'pm.rejectedMark');
  const caption = ctx.callbackQuery.message?.caption;
  await ctx
    .editMessageCaption({
      caption: caption ? `${esc(caption)}\n\n${mark}` : mark,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [] },
    })
    .catch(() => {});

  const client = await Client.findById(booking.clientId);
  await notifyPayment(ctx.api, ctx.master, client, booking, approved);
  return undefined;
});

module.exports = { composer };
