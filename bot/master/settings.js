// Настройки записи: шаг слотов, буфер между клиентами, горизонт, минимум до записи
const { Composer, InlineKeyboard } = require('grammy');
const { show: showScreen } = require('../ui');
const { clearStep } = require('../steps');

const composer = new Composer();

// code → поле мастера и допустимые значения (в минутах или днях)
const SETTINGS = {
  step: { field: 'slotStepMin', values: [15, 30, 60] },
  buf: { field: 'bufferMin', values: [0, 10, 15, 30] },
  hor: { field: 'bookingHorizonDays', values: [7, 14, 30, 60] },
  ntc: { field: 'minNoticeMin', values: [0, 60, 120, 180, 1440] },
  rbk: { field: 'rebookDays', values: [0, 14, 21, 28, 42] },
};

function label(ctx, code, value) {
  if (code === 'rbk') return value ? ctx.t('set.days', { n: value }) : ctx.t('set.off');
  if (code === 'hor') return ctx.t('set.days', { n: value });
  if (code === 'ntc' && value >= 60) return ctx.t('set.hours', { n: value / 60 });
  return ctx.t('set.minutes', { n: value });
}

function show(ctx) {
  clearStep(ctx);
  const m = ctx.master;
  const text = ctx.t('set.title', {
    step: label(ctx, 'step', m.slotStepMin),
    buf: label(ctx, 'buf', m.bufferMin),
    hor: label(ctx, 'hor', m.bookingHorizonDays),
    ntc: label(ctx, 'ntc', m.minNoticeMin),
    rbk: label(ctx, 'rbk', m.rebookDays),
  });
  const kb = new InlineKeyboard();
  Object.entries(SETTINGS).forEach(([code, { field, values }]) => {
    kb.row().text(ctx.t(`set.label.${code}`), 'noop');
    kb.row();
    values.forEach((v) => kb.text(`${m[field] === v ? '✅ ' : ''}${label(ctx, code, v)}`, `set:${code}:${v}`));
  });
  kb.row().text(ctx.t('common.back'), 'sch:list');
  return showScreen(ctx, text, kb);
}

composer.callbackQuery('set:menu', (ctx) => show(ctx));

composer.callbackQuery(/^set:(step|buf|hor|ntc|rbk):(\d+)$/, async (ctx) => {
  const { field, values } = SETTINGS[ctx.match[1]];
  const value = Number(ctx.match[2]);
  if (!values.includes(value)) return show(ctx);
  ctx.master[field] = value;
  await ctx.master.save();
  return show(ctx);
});

module.exports = { composer, show, SETTINGS };
