// Главное меню мастера
const { Composer, InlineKeyboard } = require('grammy');
const { local } = require('../../utils/time');
const { show: showScreen, esc } = require('../ui');
const { clearStep } = require('../steps');

const composer = new Composer();

function subscriptionLine(ctx) {
  const { status, paidUntil } = ctx.master.subscription;
  const until = paidUntil ? local(paidUntil).format('DD.MM.YYYY') : '—';
  return ctx.t(`sub.line.${status}`, { until });
}

function show(ctx, opts = {}) {
  clearStep(ctx);
  const text = ctx.t('menu.master', { name: esc(ctx.master.name), sub: subscriptionLine(ctx) });
  const kb = new InlineKeyboard()
    .text(ctx.t('menu.today'), 'bk:today')
    .text(ctx.t('menu.tomorrow'), 'bk:tomorrow')
    .text(ctx.t('menu.week'), 'bk:week')
    .row()
    .text(ctx.t('menu.services'), 'svc:list')
    .text(ctx.t('menu.schedule'), 'sch:list')
    .row()
    .text(ctx.t('menu.prepayment'), 'pp:show')
    .text(ctx.t('menu.link'), 'm:link')
    .row()
    .text(ctx.t('menu.subscription'), 'm:sub')
    .text(ctx.t('menu.language'), 'nav:lang');
  return showScreen(ctx, text, kb, opts);
}

composer.callbackQuery('m:menu', (ctx) => show(ctx));

module.exports = { composer, show, subscriptionLine };
