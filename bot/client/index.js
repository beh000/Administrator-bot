// Сторона клиента. Полная запись (услуга → дата → время) — этап 3.
const { Composer, InlineKeyboard } = require('grammy');
const { Master } = require('../../models');
const { show, esc } = require('../ui');
const { clearStep } = require('../steps');

const composer = new Composer();

async function openMaster(ctx, slug) {
  clearStep(ctx);
  const master = await Master.findOne({ slug, registered: true });
  if (!master) return show(ctx, ctx.t('client.masterNotFound'), undefined, { fresh: true });
  ctx.session.masterSlug = slug;
  return show(ctx, ctx.t('client.bookingSoon', { name: esc(master.name) }), undefined, { fresh: true });
}

function home(ctx) {
  clearStep(ctx);
  const kb = new InlineKeyboard().text(ctx.t('menu.language'), 'nav:lang');
  if (ctx.master) kb.text(ctx.t('role.master'), 'role:master');
  return show(ctx, ctx.t('client.home'), kb);
}

module.exports = { composer, openMaster, home };
