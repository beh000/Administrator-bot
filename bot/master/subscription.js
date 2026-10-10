// Статус подписки мастера (оплата подписки — этап 6)
const { Composer, InlineKeyboard } = require('grammy');
const { now, local } = require('../../utils/time');
const { show: showScreen } = require('../ui');

const composer = new Composer();

function show(ctx) {
  const { status, paidUntil } = ctx.master.subscription;
  const daysLeft = paidUntil ? Math.max(0, local(paidUntil).startOf('day').diff(now().startOf('day'), 'day')) : 0;
  const text = ctx.t('sub.screen', {
    status: ctx.t(`sub.status.${status}`),
    until: paidUntil ? local(paidUntil).format('DD.MM.YYYY') : '—',
    days: daysLeft,
  });
  return showScreen(ctx, text, new InlineKeyboard().text(ctx.t('common.back'), 'nav:home'));
}

composer.callbackQuery('m:sub', (ctx) => show(ctx));

module.exports = { composer, show };
