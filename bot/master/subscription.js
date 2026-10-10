// Подписка мастера: статус, оплата на карту владельца сервиса, скриншот админу
const { Composer, InlineKeyboard } = require('grammy');
const { SubscriptionPayment, Client } = require('../../models');
const { config } = require('../../config');
const { t } = require('../../locales');
const { local } = require('../../utils/time');
const { formatCard } = require('../../utils/validate');
const { daysLeft, submitSubscriptionPayment, PERIOD_DAYS } = require('../../services/subscription');
const { defineStep, setStep, clearStep } = require('../steps');
const { show: showScreen, prompt, alert, esc, fmtMoney } = require('../ui');

const composer = new Composer();

async function show(ctx, opts = {}) {
  clearStep(ctx);
  const { status, paidUntil } = ctx.master.subscription;
  const lines = [
    ctx.t('sub.screen', {
      status: ctx.t(`sub.status.${status}`),
      until: paidUntil ? local(paidUntil).format('DD.MM.YYYY') : '—',
      days: Math.max(0, daysLeft(paidUntil)),
    }),
    ctx.t('sub.priceLine', { price: fmtMoney(config.SUB_PRICE), days: PERIOD_DAYS }),
  ];
  const pending = await SubscriptionPayment.exists({ masterId: ctx.master._id, status: 'pending' });
  if (pending) lines.push('', ctx.t('sub.pendingNote'));
  const kb = new InlineKeyboard().text(ctx.t('sub.payBtn'), 'sub:pay').row().text(ctx.t('common.back'), 'nav:home');
  return showScreen(ctx, lines.join('\n'), kb, opts);
}

composer.callbackQuery('m:sub', (ctx) => show(ctx));

composer.callbackQuery('sub:pay', (ctx) => {
  if (!config.SUB_CARD) {
    console.warn('[subscription] SUB_CARD не задан — мастер не может оплатить подписку');
    return alert(ctx, ctx.t('sub.noCard'));
  }
  const kb = new InlineKeyboard().text(ctx.t('sub.paidBtn'), 'sub:paid').row().text(ctx.t('common.back'), 'm:sub');
  return showScreen(
    ctx,
    ctx.t('sub.payInfo', {
      price: fmtMoney(config.SUB_PRICE),
      card: formatCard(config.SUB_CARD),
      holder: esc(config.SUB_CARD_NAME),
      days: PERIOD_DAYS,
    }),
    kb,
  );
});

composer.callbackQuery('sub:paid', (ctx) => {
  setStep(ctx, 'sub_screenshot');
  return prompt(ctx, ctx.t('sub.askScreenshot'), 'm:sub');
});

defineStep(
  'sub_screenshot',
  async (ctx) => {
    const m = ctx.message;
    const fileId = m?.photo?.length
      ? m.photo[m.photo.length - 1].file_id
      : m?.document?.mime_type?.startsWith('image/')
        ? m.document.file_id
        : null;
    if (!fileId) return ctx.reply(ctx.t('client.needPhoto'));

    const payment = await submitSubscriptionPayment(ctx.master._id, config.SUB_PRICE, fileId);
    clearStep(ctx);
    await ctx.reply(ctx.t('sub.sent'));
    return sendToAdmin(ctx.api, ctx.master, payment);
  },
  { master: true },
);

// Скриншот админу с кнопками ✅ / ❌ (на языке админа — берём из его профиля)
async function sendToAdmin(api, master, payment) {
  if (!config.ADMIN_ID) {
    console.error('[subscription] ADMIN_ID не задан — скриншот оплаты подписки некому отправить');
    return;
  }
  const admin = await Client.findOne({ telegramId: config.ADMIN_ID });
  const lang = admin?.language || 'ru';
  const { status, paidUntil } = master.subscription;
  const caption = t(lang, 'admin.subReview', {
    name: esc(master.name),
    phone: esc(master.phone),
    slug: master.slug,
    status: t(lang, `sub.status.${status}`),
    until: paidUntil ? local(paidUntil).format('DD.MM.YYYY') : '—',
    amount: fmtMoney(payment.amount),
  });
  const kb = new InlineKeyboard()
    .text(t(lang, 'admin.okBtn'), `ad:ok:${payment._id}`)
    .text(t(lang, 'admin.noBtn'), `ad:no:${payment._id}`);
  try {
    await api.sendPhoto(config.ADMIN_ID, payment.screenshotFileId, { caption, parse_mode: 'HTML', reply_markup: kb });
  } catch (err) {
    console.error('[subscription] Не удалось отправить скриншот админу:', err.description || err.message);
  }
}

module.exports = { composer, show, sendToAdmin };
