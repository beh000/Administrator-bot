// Отзывы: после визита клиент ставит ⭐1–5 и (по желанию) пишет пару слов.
// Мастер получает каждый отзыв; средний рейтинг виден клиентам при записи.
const { Composer, InlineKeyboard } = require('grammy');
const { Booking, Master } = require('../models');
const { t } = require('../locales');
const { defineStep, setStep, clearStep } = require('./steps');
const { show, alert, esc, fmtDay } = require('./ui');
const { sendTo } = require('./notify');

const composer = new Composer();
const MIN_REVIEWS_TO_SHOW = 3;

const stars = (n) => '⭐'.repeat(n);

// Рейтинг для клиентов: «⭐ 4.9 (12 отзывов)» или '' пока отзывов мало
function ratingLine(tr, master) {
  const { sum = 0, count = 0 } = master.rating || {};
  if (count < MIN_REVIEWS_TO_SHOW) return '';
  return tr('rv.ratingLine', { avg: (sum / count).toFixed(1), count });
}

// Просьба оценить визит — вызывается, когда мастер отметил «пришёл»
async function askForReview(api, booking, master) {
  const client = booking.clientId;
  if (!client?.telegramId) return;
  const lang = client.language;
  const kb = new InlineKeyboard();
  [1, 2, 3, 4, 5].forEach((n) => kb.text(`${n}⭐`, `rv:${booking._id}:${n}`));
  await sendTo(api, client.telegramId, lang, 'rv.ask', { master: esc(master.name), service: esc(booking.serviceTitle) }, { reply_markup: kb });
}

composer.callbackQuery(/^rv:([0-9a-f]{24}):([1-5])$/, async (ctx) => {
  const rating = Number(ctx.match[2]);
  // оценку можно поставить один раз — атомарно
  const booking = await Booking.findOneAndUpdate(
    { _id: ctx.match[1], clientId: ctx.user._id, status: 'completed', 'review.rating': { $exists: false } },
    { $set: { 'review.rating': rating, 'review.at': new Date() } },
    { returnDocument: 'after' },
  );
  if (!booking) return alert(ctx, ctx.t('rv.already'));
  const master = await Master.findOneAndUpdate(
    { _id: booking.masterId },
    { $inc: { 'rating.sum': rating, 'rating.count': 1 } },
    { returnDocument: 'after' },
  );
  setStep(ctx, 'rv_comment', { reviewBookingId: String(booking._id) });
  const kb = new InlineKeyboard().text(ctx.t('rv.skip'), 'rv:skip');
  await show(ctx, `${stars(rating)}\n\n${ctx.t(rating <= 3 ? 'rv.askImprove' : 'rv.askComment')}`, kb);
  // мастеру — сразу оценку; комментарий (если будет) придёт отдельно
  if (master) await notifyMaster(ctx.api, master, booking, ctx.user, rating, null);
  return undefined;
});

async function notifyMaster(api, master, booking, client, rating, comment) {
  const lang = master.language;
  const key = comment ? 'rv.masterComment' : 'rv.masterNew';
  await sendTo(api, master.telegramId, lang, key, {
    stars: stars(rating),
    client: esc(client.name || '—'),
    service: esc(booking.serviceTitle),
    date: fmtDay((k) => t(lang, k), booking.start),
    comment: esc(comment || ''),
  });
}

composer.callbackQuery('rv:skip', (ctx) => {
  clearStep(ctx);
  return show(ctx, ctx.t('rv.thanks'));
});

defineStep('rv_comment', async (ctx) => {
  const comment = String(ctx.message?.text || '').trim().slice(0, 500);
  if (!comment) return ctx.reply(ctx.t('rv.needText'));
  const booking = await Booking.findOneAndUpdate(
    { _id: ctx.session.data.reviewBookingId, clientId: ctx.user._id, 'review.comment': { $exists: false } },
    { $set: { 'review.comment': comment } },
    { returnDocument: 'after' },
  );
  clearStep(ctx);
  if (booking) {
    const master = await Master.findById(booking.masterId);
    if (master) await notifyMaster(ctx.api, master, booking, ctx.user, booking.review.rating, comment);
  }
  return ctx.reply(ctx.t('rv.thanks'));
});

// Мастер: последние отзывы
async function showReviews(ctx) {
  const list = await Booking.find({ masterId: ctx.master._id, 'review.rating': { $exists: true } })
    .sort({ 'review.at': -1 })
    .limit(10)
    .populate('clientId', 'name');
  const { sum = 0, count = 0 } = ctx.master.rating || {};
  const lines = [ctx.t('rv.listTitle', { avg: count ? (sum / count).toFixed(1) : '—', count }), ''];
  if (!list.length) lines.push(ctx.t('rv.listEmpty'));
  list.forEach((b) => {
    lines.push(
      ctx.t('rv.listItem', {
        stars: stars(b.review.rating),
        client: esc(b.clientId?.name || '—'),
        date: fmtDay(ctx.t, b.start),
        comment: b.review.comment ? `\n<i>«${esc(b.review.comment)}»</i>` : '',
      }),
    );
  });
  return show(ctx, lines.join('\n'), new InlineKeyboard().text(ctx.t('common.back'), 'st:now'));
}

composer.callbackQuery('rv:list', (ctx) => {
  if (!ctx.master) return alert(ctx, ctx.t('common.staleButton'));
  return showReviews(ctx);
});

module.exports = { composer, askForReview, ratingLine };
