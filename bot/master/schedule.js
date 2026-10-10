// Недельный график мастера: рабочие дни, часы, перерывы
const { Composer, InlineKeyboard } = require('grammy');
const { WEEKDAYS, hhmmToMin } = require('../../utils/time');
const { parseTimeRange } = require('../../utils/validate');
const { defineStep, setStep, clearStep } = require('../steps');
const { show: showScreen, prompt, footer } = require('../ui');

const composer = new Composer();
const WORKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];

function dayLine(ctx, key) {
  const d = ctx.master.schedule[key];
  const name = ctx.t(`days.short.${key}`);
  if (!d.working) return `${name}: ${ctx.t('sch.dayOff')}`;
  const breaks = d.breaks.length
    ? ctx.t('sch.breaksInline', { list: d.breaks.map((b) => `${b.start}–${b.end}`).join(', ') })
    : '';
  return `${name}: ${d.start}–${d.end}${breaks}`;
}

function show(ctx, opts = {}) {
  clearStep(ctx);
  const header = ctx.master.registered ? [] : [ctx.t('reg.scheduleStep')];
  const text = [...header, ctx.t('sch.title'), '', ...WEEKDAYS.map((k) => dayLine(ctx, k)), '', ctx.t('sch.hint')].join('\n');
  const kb = new InlineKeyboard();
  WEEKDAYS.forEach((k, i) => {
    kb.text(ctx.t(`days.short.${k}`), `sch:d:${k}`);
    if (i === 3) kb.row();
  });
  kb.row().text(ctx.t('sch.sameWeekdays'), 'sch:wk');
  if (ctx.master.registered) {
    kb.row().text(ctx.t('off.button'), 'off:list').text(ctx.t('set.button'), 'set:menu');
  }
  footer(ctx, kb);
  return showScreen(ctx, text, kb, opts);
}

function showDay(ctx, key, opts = {}) {
  clearStep(ctx);
  const d = ctx.master.schedule[key];
  const lines = [`<b>${ctx.t(`days.full.${key}`)}</b>`, ''];
  if (d.working) {
    lines.push(ctx.t('sch.hours', { start: d.start, end: d.end }));
    lines.push(
      d.breaks.length
        ? ctx.t('sch.breaks', { list: d.breaks.map((b) => `${b.start}–${b.end}`).join(', ') })
        : ctx.t('sch.noBreaks'),
    );
  } else {
    lines.push(ctx.t('sch.dayOff'));
  }
  const kb = new InlineKeyboard().text(ctx.t(d.working ? 'sch.makeOff' : 'sch.makeWorking'), `sch:tw:${key}`);
  if (d.working) {
    kb.row().text(ctx.t('sch.editHours'), `sch:h:${key}`);
    kb.row().text(ctx.t('sch.addBreak'), `sch:b:${key}`);
    if (d.breaks.length) kb.text(ctx.t('sch.clearBreaks'), `sch:bc:${key}`);
  }
  kb.row().text(ctx.t('common.back'), 'sch:list');
  return showScreen(ctx, lines.join('\n'), kb, opts);
}

// Перерыв должен лежать внутри рабочего времени и не пересекаться с другими
function breakFits(day, range) {
  const s = hhmmToMin(range.start);
  const e = hhmmToMin(range.end);
  if (s < hhmmToMin(day.start) || e > hhmmToMin(day.end)) return false;
  return day.breaks.every((b) => e <= hhmmToMin(b.start) || s >= hhmmToMin(b.end));
}

function sortBreaks(breaks) {
  return [...breaks].sort((a, b) => hhmmToMin(a.start) - hhmmToMin(b.start));
}

const DAY_RE = `(${WEEKDAYS.join('|')})`;

composer.callbackQuery('sch:list', (ctx) => show(ctx));
composer.callbackQuery(new RegExp(`^sch:d:${DAY_RE}$`), (ctx) => showDay(ctx, ctx.match[1]));

composer.callbackQuery(new RegExp(`^sch:tw:${DAY_RE}$`), async (ctx) => {
  const key = ctx.match[1];
  const d = ctx.master.schedule[key];
  d.working = !d.working;
  await ctx.master.save();
  return showDay(ctx, key);
});

composer.callbackQuery(new RegExp(`^sch:h:${DAY_RE}$`), (ctx) => {
  const key = ctx.match[1];
  setStep(ctx, 'sch_hours', { day: key });
  return prompt(ctx, ctx.t('sch.askHours', { day: ctx.t(`days.full.${key}`) }), `sch:d:${key}`);
});

defineStep(
  'sch_hours',
  async (ctx) => {
    const range = parseTimeRange(ctx.message?.text);
    if (!range) return ctx.reply(ctx.t('sch.badRange'));
    const { day: key } = ctx.session.data;
    const d = ctx.master.schedule[key];
    d.working = true;
    d.start = range.start;
    d.end = range.end;
    // перерывы, которые больше не влезают в новые часы, убираем
    d.breaks = d.breaks.filter((b) => hhmmToMin(b.start) >= hhmmToMin(range.start) && hhmmToMin(b.end) <= hhmmToMin(range.end));
    await ctx.master.save();
    await ctx.reply(ctx.t('common.saved'));
    return showDay(ctx, key, { fresh: true });
  },
  { master: true },
);

composer.callbackQuery(new RegExp(`^sch:b:${DAY_RE}$`), (ctx) => {
  const key = ctx.match[1];
  setStep(ctx, 'sch_break', { day: key });
  return prompt(ctx, ctx.t('sch.askBreak'), `sch:d:${key}`);
});

defineStep(
  'sch_break',
  async (ctx) => {
    const range = parseTimeRange(ctx.message?.text);
    if (!range) return ctx.reply(ctx.t('sch.badRange'));
    const { day: key } = ctx.session.data;
    const d = ctx.master.schedule[key];
    if (!breakFits(d, range)) return ctx.reply(ctx.t('sch.badBreak', { start: d.start, end: d.end }));
    d.breaks = sortBreaks([...d.breaks, range]);
    await ctx.master.save();
    await ctx.reply(ctx.t('common.saved'));
    return showDay(ctx, key, { fresh: true });
  },
  { master: true },
);

composer.callbackQuery(new RegExp(`^sch:bc:${DAY_RE}$`), async (ctx) => {
  const key = ctx.match[1];
  ctx.master.schedule[key].breaks = [];
  await ctx.master.save();
  return showDay(ctx, key);
});

// --- «Одинаково для всех будних»: часы, затем общий перерыв ---
composer.callbackQuery('sch:wk', (ctx) => {
  setStep(ctx, 'sch_weekdays');
  return prompt(ctx, ctx.t('sch.askWeekdays'), 'sch:list');
});

defineStep(
  'sch_weekdays',
  (ctx) => {
    const range = parseTimeRange(ctx.message?.text);
    if (!range) return ctx.reply(ctx.t('sch.badRange'));
    setStep(ctx, 'sch_weekdays_break', { range });
    const kb = new InlineKeyboard().text(ctx.t('sch.noBreakButton'), 'sch:wknb');
    return prompt(ctx, ctx.t('sch.askWeekdaysBreak'), null, kb);
  },
  { master: true },
);

async function applyWeekdays(ctx, breakRange) {
  const { range } = ctx.session.data;
  if (!range) return show(ctx);
  WORKDAYS.forEach((key) => {
    const d = ctx.master.schedule[key];
    d.working = true;
    d.start = range.start;
    d.end = range.end;
    d.breaks = breakRange ? [breakRange] : [];
  });
  await ctx.master.save();
  if (!ctx.callbackQuery) await ctx.reply(ctx.t('common.saved'));
  return show(ctx, { fresh: !ctx.callbackQuery });
}

composer.callbackQuery('sch:wknb', (ctx) => applyWeekdays(ctx, null));

defineStep(
  'sch_weekdays_break',
  (ctx) => {
    const breakRange = parseTimeRange(ctx.message?.text);
    if (!breakRange) return ctx.reply(ctx.t('sch.badRange'));
    const { range } = ctx.session.data;
    if (!breakFits({ ...range, breaks: [] }, breakRange)) {
      return ctx.reply(ctx.t('sch.badBreak', { start: range.start, end: range.end }));
    }
    return applyWeekdays(ctx, breakRange);
  },
  { master: true },
);

module.exports = { composer, show };
