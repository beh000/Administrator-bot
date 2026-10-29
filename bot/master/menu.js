// Главное меню мастера
const { Composer, InlineKeyboard } = require('grammy');
const { local } = require('../../utils/time');
const { show: showScreen, esc } = require('../ui');
const { clearStep } = require('../steps');
const { config } = require('../../config');

const composer = new Composer();

function subscriptionLine(ctx) {
  const { status, paidUntil } = ctx.master.subscription;
  const until = paidUntil ? local(paidUntil).format('DD.MM.YYYY') : '—';
  return ctx.t(`sub.line.${status}`, { until });
}

// Кнопка «Приложение» слева от поля ввода — только у мастеров, один раз на сессию
async function ensureMenuButton(ctx) {
  const url = config.WEBAPP_URL;
  const mark = `${url}|${ctx.lang}`; // язык сменился — переставим подпись
  if (!url || ctx.session.appMenuBtn === mark) return;
  try {
    await ctx.api.setChatMenuButton({
      chat_id: ctx.chat.id,
      menu_button: { type: 'web_app', text: ctx.t('menu.appShort'), web_app: { url } },
    });
    ctx.session.appMenuBtn = mark;
  } catch (err) {
    console.error('[menu] Не удалось поставить кнопку приложения:', err.description || err.message);
  }
}

async function show(ctx, opts = {}) {
  clearStep(ctx);
  await ensureMenuButton(ctx);
  const text = ctx.t('menu.master', { name: esc(ctx.master.name), sub: subscriptionLine(ctx) });
  const kb = new InlineKeyboard();
  if (config.WEBAPP_URL) kb.webApp(ctx.t('menu.app'), config.WEBAPP_URL).row();
  kb
    .text(ctx.t('menu.today'), 'bk:today')
    .text(ctx.t('menu.tomorrow'), 'bk:tomorrow')
    .text(ctx.t('menu.week'), 'bk:week')
    .row()
    .text(ctx.t('mb.newBtn'), 'mb:new')
    .text(ctx.t('mb.blockBtn'), 'mb:block')
    .row()
    .text(ctx.t('menu.stats'), 'st:now')
    .text(ctx.t('menu.clients'), 'cl:list')
    .row()
    .text(ctx.t('menu.services'), 'svc:list')
    .text(ctx.t('menu.schedule'), 'sch:list')
    .row()
    .text(ctx.t('menu.prepayment'), 'pp:show')
    .text(ctx.t('menu.location'), 'loc:show')
    .row()
    .text(ctx.t('menu.profile'), 'pf:show')
    .text(ctx.t('menu.link'), 'm:link')
    .row()
    .text(ctx.t('menu.subscription'), 'm:sub')
    .text(ctx.t('menu.invite'), 'ref:show')
    .row()
    .text(ctx.t('menu.language'), 'nav:lang')
    .text(ctx.t('menu.myAsClient'), 'c:my');
  return showScreen(ctx, text, kb, opts);
}

composer.callbackQuery('m:menu', (ctx) => show(ctx));

module.exports = { composer, show, subscriptionLine };
