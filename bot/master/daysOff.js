// Отдельные выходные даты (отпуск, праздники)
const { Composer, InlineKeyboard } = require('grammy');
const { Booking } = require('../../models');
const { now, atLocal } = require('../../utils/time');
const { parseFutureDateRange } = require('../../utils/validate');
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
  const ranges = toRanges(upcoming);
  const label = ([from, to]) => (from === to ? fmt(from) : `${fmt(from)} – ${fmt(to)}`);
  const text = [ctx.t('off.title'), '', ranges.length ? ranges.map(label).join('\n') : ctx.t('off.empty')].join('\n');
  const kb = new InlineKeyboard();
  ranges.slice(0, 30).forEach((r) => kb.text(`❌ ${label(r)}`, `off:rm:${r[0]}:${r[1]}`).row());
  kb.text(ctx.t('off.add'), 'off:add');
  kb.row().text(ctx.t('common.back'), 'sch:list');
  return showScreen(ctx, text, kb, opts);
}

// Подряд идущие даты → диапазоны [from, to]
function toRanges(sorted) {
  const ranges = [];
  sorted.forEach((d) => {
    const last = ranges[ranges.length - 1];
    if (last && atLocal(last[1]).add(1, 'day').format('YYYY-MM-DD') === d) last[1] = d;
    else ranges.push([d, d]);
  });
  return ranges;
}

composer.callbackQuery('off:list', (ctx) => show(ctx));

composer.callbackQuery(/^off:rm:(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
  const [, from, to] = ctx.match;
  ctx.master.daysOff = ctx.master.daysOff.filter((d) => d < from || d > to);
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
    const keys = parseFutureDateRange(ctx.message?.text);
    if (!keys) return ctx.reply(ctx.t('off.badDate'));
    const fresh = keys.filter((k) => !ctx.master.daysOff.includes(k));
    if (fresh.length) {
      ctx.master.daysOff.push(...fresh);
      await ctx.master.save();
    }
    // Уже существующие записи на эти дни не отменяем — предупреждаем мастера
    const first = keys[0];
    const last = keys[keys.length - 1];
    const count = await Booking.countDocuments({
      masterId: ctx.master._id,
      kind: { $ne: 'block' },
      status: { $in: Booking.ACTIVE_STATUSES },
      start: { $gte: atLocal(first).toDate(), $lt: atLocal(last).add(1, 'day').toDate() },
    });
    const date = keys.length > 1 ? `${fmt(first)} – ${fmt(last)}` : fmt(first);
    await ctx.reply(count ? ctx.t('off.addedWithBookings', { date, count }) : ctx.t('off.added', { date }));
    return show(ctx, { fresh: true });
  },
  { master: true },
);

module.exports = { composer, show };
