// «📍 Адрес» в меню мастера: адрес текстом и/или точка на карте
const { Composer, InlineKeyboard, Keyboard } = require('grammy');
const { parseName } = require('../../utils/validate');
const { defineStep, setStep, clearStep } = require('../steps');
const { show: showScreen, prompt, esc, BASE_OPTS } = require('../ui');
const { hasGeo, sendMasterLocation } = require('../location');

const composer = new Composer();

function show(ctx, opts = {}) {
  clearStep(ctx);
  const loc = ctx.master.location || {};
  const lines = [ctx.t('loc.title'), ''];
  lines.push(loc.address ? ctx.t('loc.current', { address: esc(loc.address) }) : ctx.t('loc.noAddress'));
  lines.push(hasGeo(ctx.master) ? ctx.t('loc.geoSet') : ctx.t('loc.geoNotSet'));
  lines.push('', ctx.t('loc.hint'));
  const kb = new InlineKeyboard()
    .text(ctx.t('loc.editAddress'), 'loc:text')
    .row()
    .text(ctx.t('loc.setGeo'), 'loc:geo');
  if (loc.address || hasGeo(ctx.master)) kb.row().text(ctx.t('loc.clear'), 'loc:clear');
  kb.row().text(ctx.t('common.back'), 'nav:home');
  return showScreen(ctx, lines.join('\n'), kb, opts);
}

composer.callbackQuery('loc:show', (ctx) => show(ctx));

composer.callbackQuery('loc:text', (ctx) => {
  setStep(ctx, 'loc_text');
  return prompt(ctx, ctx.t('loc.askAddress'), 'loc:show');
});

defineStep(
  'loc_text',
  async (ctx) => {
    const address = parseName(ctx.message?.text, 200);
    if (!address) return ctx.reply(ctx.t('loc.badAddress'));
    ctx.master.set('location.address', address);
    await ctx.master.save();
    await ctx.reply(ctx.t('common.saved'));
    return show(ctx, { fresh: true });
  },
  { master: true },
);

composer.callbackQuery('loc:geo', async (ctx) => {
  setStep(ctx, 'loc_geo');
  const kb = new Keyboard().requestLocation(ctx.t('loc.sendGeoBtn')).row().text(ctx.t('common.cancel')).resized().oneTime();
  return ctx.reply(ctx.t('loc.askGeo'), { ...BASE_OPTS, reply_markup: kb });
});

defineStep(
  'loc_geo',
  async (ctx) => {
    const geo = ctx.message?.location || ctx.message?.venue?.location;
    if (!geo) {
      // «Отмена» с reply-клавиатуры или любой другой текст
      if (ctx.message?.text === ctx.t('common.cancel')) {
        await ctx.reply(ctx.t('loc.cancelled'), { reply_markup: { remove_keyboard: true } });
        return show(ctx, { fresh: true });
      }
      return ctx.reply(ctx.t('loc.needGeo'));
    }
    ctx.master.set('location.lat', geo.latitude);
    ctx.master.set('location.lng', geo.longitude);
    await ctx.master.save();
    await ctx.reply(ctx.t('loc.geoSaved'), { reply_markup: { remove_keyboard: true } });
    await sendMasterLocation(ctx.api, ctx.chat.id, ctx.master);
    return show(ctx, { fresh: true });
  },
  { master: true },
);

composer.callbackQuery('loc:clear', async (ctx) => {
  ctx.master.set('location', { address: '' });
  await ctx.master.save();
  return show(ctx);
});

module.exports = { composer, show };
