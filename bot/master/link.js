// Личная ссылка мастера и готовый текст для Instagram
const { Composer, InlineKeyboard } = require('grammy');
const { masterLink } = require('../../utils/ids');
const { show: showScreen, esc } = require('../ui');

const composer = new Composer();

function linkText(ctx) {
  const link = masterLink(ctx.me.username, ctx.master.slug);
  return ctx.t('link.text', { link, promo: esc(ctx.t('link.promo', { name: ctx.master.name, link })) });
}

// Отдельным сообщением — чтобы мастеру было удобно переслать или скопировать
function sendLink(ctx) {
  return ctx.reply(linkText(ctx), { parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
}

composer.callbackQuery('m:link', (ctx) =>
  showScreen(ctx, linkText(ctx), new InlineKeyboard().text(ctx.t('common.back'), 'nav:home')),
);

module.exports = { composer, sendLink };
