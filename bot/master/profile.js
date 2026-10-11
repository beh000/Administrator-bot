// «🖼 Профиль»: описание и до 6 фото работ — клиент видит их, открыв ссылку
const { Composer, InlineKeyboard } = require('grammy');
const { Master } = require('../../models');
const { defineStep, setStep, clearStep } = require('../steps');
const { show, prompt, esc } = require('../ui');

const composer = new Composer();
const MAX_PHOTOS = 6;
const MAX_ABOUT = 500;

function show_(ctx, opts = {}) {
  clearStep(ctx);
  const m = ctx.master;
  const text = ctx.t('pf.screen', {
    about: m.about ? `<i>${esc(m.about)}</i>` : ctx.t('pf.noAbout'),
    photos: m.photos.length,
    max: MAX_PHOTOS,
  });
  const kb = new InlineKeyboard().text(ctx.t('pf.editAbout'), 'pf:about').row();
  if (m.photos.length < MAX_PHOTOS) kb.text(ctx.t('pf.addPhotos'), 'pf:add').row();
  if (m.photos.length) kb.text(ctx.t('pf.clearPhotos'), 'pf:clr').row();
  kb.text(ctx.t('pf.preview'), 'pf:preview').row().text(ctx.t('common.back'), 'nav:home');
  return show(ctx, text, kb, opts);
}

// Альбом фото + описание — так профиль видит клиент
async function sendProfile(api, chatId, master, tr) {
  if (master.photos?.length) {
    try {
      await api.sendMediaGroup(
        chatId,
        master.photos.map((fileId, i) => ({
          type: 'photo',
          media: fileId,
          ...(i === 0 && master.about ? { caption: master.about.slice(0, 1000) } : {}),
        })),
      );
      return true;
    } catch (err) {
      console.error('[profile] Не удалось отправить фото профиля:', err.description || err.message);
    }
  }
  return false;
}

composer.callbackQuery('pf:show', (ctx) => show_(ctx));

composer.callbackQuery('pf:about', (ctx) => {
  setStep(ctx, 'pf_about');
  return prompt(ctx, ctx.t('pf.askAbout', { max: MAX_ABOUT }), 'pf:show');
});

defineStep(
  'pf_about',
  async (ctx) => {
    const text = String(ctx.message?.text || '').trim();
    if (!text) return ctx.reply(ctx.t('pf.askAbout', { max: MAX_ABOUT }));
    if (text.length > MAX_ABOUT) return ctx.reply(ctx.t('pf.tooLong', { max: MAX_ABOUT }));
    ctx.master.about = text === '-' ? '' : text;
    await ctx.master.save();
    await ctx.reply(ctx.t('common.saved'));
    return show_(ctx, { fresh: true });
  },
  { master: true },
);

composer.callbackQuery('pf:add', (ctx) => {
  setStep(ctx, 'pf_photo');
  const kb = new InlineKeyboard().text(ctx.t('pf.done'), 'pf:show');
  return prompt(ctx, ctx.t('pf.askPhotos', { max: MAX_PHOTOS }), null, kb);
});

defineStep(
  'pf_photo',
  async (ctx) => {
    const photo = ctx.message?.photo;
    if (!photo?.length) return ctx.reply(ctx.t('pf.needPhoto'));
    const fileId = photo[photo.length - 1].file_id;
    // атомарно и не больше MAX_PHOTOS — фото из альбома приходят пачкой
    const res = await Master.updateOne(
      { _id: ctx.master._id, [`photos.${MAX_PHOTOS - 1}`]: { $exists: false } },
      { $push: { photos: fileId } },
    );
    const fresh = await Master.findById(ctx.master._id, { photos: 1 });
    const count = fresh.photos.length;
    const kb = { inline_keyboard: [[{ text: ctx.t('pf.done'), callback_data: 'pf:show' }]] };
    if (!res.modifiedCount) {
      clearStep(ctx);
      return ctx.reply(ctx.t('pf.limit', { max: MAX_PHOTOS }), { reply_markup: kb });
    }
    return ctx.reply(ctx.t('pf.added', { count, max: MAX_PHOTOS }), { reply_markup: kb });
  },
  { master: true },
);

composer.callbackQuery('pf:clr', async (ctx) => {
  ctx.master.photos = [];
  await ctx.master.save();
  return show_(ctx);
});

composer.callbackQuery('pf:preview', async (ctx) => {
  const sent = await sendProfile(ctx.api, ctx.chat.id, ctx.master, ctx.t);
  if (!sent && !ctx.master.about) return ctx.reply(ctx.t('pf.emptyPreview'));
  if (!sent && ctx.master.about) return ctx.reply(`<i>${esc(ctx.master.about)}</i>`);
  return undefined;
});

module.exports = { composer, sendProfile };
