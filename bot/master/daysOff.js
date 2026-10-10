// Отдельные выходные даты (отпуск, праздники)
const { Composer, InlineKeyboard } = require('grammy');
const { Booking } = require('../../models');
const { now, atLocal } = require('../../utils/time');
const { parseFutureDate } = require('../../utils/validate');
const { defineStep, setStep, clearStep } = require('../steps');
const { show: showScreen, prompt } = require('../ui');

const composer = new Composer();

function fmt(key) {
  return atLocal(key).format('DD.MM.YYYY');
}

async function show(ctx, opts = {}) {
  clearStep(ctx);
  const today = now().format('YYYY-MM-DD');
  // прошедшие даты больше не нужны
  const upcoming = [...new Set(ctx.master.daysOff)].filter((d) => d >= today).sort();
  if (upcoming.length !== ctx.master.daysOff.length) {
    ctx.master.daysOff = upcoming;
    await ctx.master.save();
  }
  const text = [ctx.t('off.title'), '', upcoming.length ? upcoming.map(fmt).join('\n') : ctx.t('off.empty')].join('\n');
  const kb = new InlineKeyboard();
  upcoming.forEach((d, i) => {
    kb.text(`❌ ${fmt(d)}`, `off:rm:${d}`);
    if (i % 2 === 1) kb.row();
  });
  kb.row().text(ctx.t('off.add'), 'off:add');
  kb.row().text(ctx.t('common.back'), 'sch:list');
  return showScreen(ctx, text, kb, opts);
}

composer.callbackQuery('off:list', (ctx) => show(ctx));

composer.callbackQuery(/^off:rm:(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
  ctx.master.daysOff = ctx.master.daysOff.filter((d) => d !== ctx.match[1]);
  await ctx.master.save();
  return show(ctx);
});

composer.callbackQuery('off:add', (ctx) => {
  setStep(ctx, 'off_add');
  return prompt(ctx, ctx.t('off.ask'), 'off:list');
});

defineStep(
  'off_add',
  async (ctx) => {
    const key = parseFutureDate(ctx.message?.text);
    if (!key) return ctx.reply(ctx.t('off.badDate'));
    if (!ctx.master.daysOff.includes(key)) {
      ctx.master.daysOff.push(key);
      await ctx.master.save();
    }
    // Уже существующие записи на этот день не отменяем — предупреждаем мастера
    const count = await Booking.countDocuments({
      masterId: ctx.master._id,
      status: { $in: Booking.ACTIVE_STATUSES },
      start: { $gte: atLocal(key).toDate(), $lt: atLocal(key).add(1, 'day').toDate() },
    });
    await ctx.reply(count ? ctx.t('off.addedWithBookings', { date: fmt(key), count }) : ctx.t('off.added', { date: fmt(key) }));
    return show(ctx, { fresh: true });
  },
  { master: true },
);

module.exports = { composer, show };
