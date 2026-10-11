// Личная ссылка мастера и готовый текст для Instagram
const { Composer, InlineKeyboard, InputFile } = require('grammy');
const QRCode = require('qrcode');
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
  showScreen(
    ctx,
    linkText(ctx),
    new InlineKeyboard().text(ctx.t('link.qrBtn'), 'm:qr').row().text(ctx.t('common.back'), 'nav:home'),
  ),
);

// QR-код ссылки — распечатать и поставить на стойку / зеркало
composer.callbackQuery('m:qr', async (ctx) => {
  const link = masterLink(ctx.me.username, ctx.master.slug);
  const png = await QRCode.toBuffer(link, { width: 800, margin: 2, errorCorrectionLevel: 'M' });
  await ctx.replyWithPhoto(new InputFile(png, 'qr.png'), {
    caption: ctx.t('link.qrCaption', { name: esc(ctx.master.name), link }),
  });
});

module.exports = { composer, sendLink };
