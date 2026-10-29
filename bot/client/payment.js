// Предоплата со стороны клиента: реквизиты мастера → «Я оплатил» → скриншот.
// Деньги идут напрямую на карту мастера; бот только передаёт скриншот мастеру.
const { Composer, InlineKeyboard } = require('grammy');
const { Booking, Master } = require('../../models');
const { formatCard } = require('../../utils/validate');
const { submitScreenshot, latestAwaitingPayment } = require('../../services/payments');
const { defineStep, setStep, clearStep } = require('../steps');
const { show, prompt, alert, esc, fmtMoney, fmtDay, fmtTime } = require('../ui');
const { addressLine } = require('../location');
const { sendScreenshotToMaster } = require('./masterNotify');

const composer = new Composer();

function paymentParams(ctx, booking, master) {
  return {
    master: esc(master.name),
    service: esc(booking.serviceTitle),
    date: fmtDay(ctx.t, booking.start),
    time: fmtTime(booking.start),
    amount: fmtMoney(booking.prepaymentAmount),
    card: formatCard(master.prepayment.cardNumber),
    holder: esc(master.prepayment.cardHolder),
    deadline: fmtTime(booking.paymentDeadline),
  };
}

// Экран после создания записи с предоплатой
function showPaymentInfo(ctx, booking, master) {
  const kb = new InlineKeyboard()
    .text(ctx.t('client.paidBtn'), `c:paid:${booking._id}`)
    .row()
    .text(ctx.t('client.myButton'), 'c:my');
  return show(ctx, ctx.t('client.payInfo', paymentParams(ctx, booking, master)) + addressLine(ctx.t, master), kb);
}

// Отправить скриншот мастеру и сообщить клиенту
async function handleScreenshot(ctx, bookingId, fileId) {
  const booking = await submitScreenshot(bookingId, ctx.user._id, fileId);
  clearStep(ctx);
  if (!booking) return ctx.reply(ctx.t('client.notPending'));

  const master = await Master.findById(booking.masterId);
  await ctx.reply(ctx.t('client.screenshotSent'));
  if (!master) return undefined;

  await sendScreenshotToMaster(ctx.api, master, ctx.user, booking, fileId);
  return undefined;
}

// Скриншот: фото или картинка, отправленная файлом
function screenshotFileId(message) {
  if (message?.photo?.length) return message.photo[message.photo.length - 1].file_id;
  if (message?.document?.mime_type?.startsWith('image/')) return message.document.file_id;
  return null;
}

composer.callbackQuery(/^c:paid:([0-9a-f]{24})$/, async (ctx) => {
  const booking = await Booking.findOne({ _id: ctx.match[1], clientId: ctx.user._id });
  const awaiting =
    booking &&
    (booking.status === 'payment_review' || (booking.status === 'pending_payment' && booking.paymentDeadline > new Date()));
  if (!awaiting) return alert(ctx, ctx.t('client.notPending'));
  setStep(ctx, 'cl_screenshot', { bookingId: String(booking._id) });
  return prompt(ctx, ctx.t('client.askScreenshot'), `c:b:${booking._id}`);
});

defineStep('cl_screenshot', (ctx) => {
  const fileId = screenshotFileId(ctx.message);
  if (!fileId) return ctx.reply(ctx.t('client.needPhoto'));
  return handleScreenshot(ctx, ctx.session.data.bookingId, fileId);
});

// Фото без нажатия «Я оплатил» — считаем скриншотом для последней неоплаченной записи
composer.on(['message:photo', 'message:document'], async (ctx, next) => {
  if (ctx.session.step) return next();
  const fileId = screenshotFileId(ctx.message);
  if (!fileId) return next();
  const booking = await latestAwaitingPayment(ctx.user._id);
  if (!booking) return next();
  return handleScreenshot(ctx, booking._id, fileId);
});

module.exports = { composer, showPaymentInfo, paymentParams };
