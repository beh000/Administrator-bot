// Услуги мастера: список, добавление, редактирование, отключение
const { Composer, InlineKeyboard } = require('grammy');
const { randomId } = require('../../utils/ids');
const { parseName, parseDuration, parsePrice } = require('../../utils/validate');
const { defineStep, setStep, clearStep, currentStep } = require('../steps');
const { show: showScreen, prompt, footer, esc, fmtMoney } = require('../ui');

const composer = new Composer();
const DURATIONS = [30, 45, 60, 90, 120];

function serviceLine(ctx, s) {
  return ctx.t('svc.line', {
    title: esc(s.title),
    duration: s.durationMin,
    price: fmtMoney(s.price),
    off: s.active ? '' : ctx.t('svc.offMark'),
  });
}

function show(ctx, opts = {}) {
  clearStep(ctx);
  const { services } = ctx.master;
  const lines = services.map((s, i) => `${i + 1}. ${serviceLine(ctx, s)}`);
  const text = [ctx.t('svc.title'), '', lines.length ? lines.join('\n') : ctx.t('svc.empty')].join('\n');
  const kb = new InlineKeyboard();
  services.forEach((s) => kb.text(`${s.active ? '' : '⏸ '}${s.title}`, `svc:v:${s.id}`).row());
  kb.text(ctx.t('svc.add'), 'svc:add');
  footer(ctx, kb);
  return showScreen(ctx, text, kb, opts);
}

function findService(ctx, id) {
  return ctx.master.services.find((s) => s.id === id);
}

function showService(ctx, id, opts = {}) {
  clearStep(ctx);
  const s = findService(ctx, id);
  if (!s) return show(ctx, opts);
  const text = ctx.t('svc.view', {
    title: esc(s.title),
    duration: s.durationMin,
    price: fmtMoney(s.price),
    status: ctx.t(s.active ? 'svc.statusOn' : 'svc.statusOff'),
  });
  const kb = new InlineKeyboard()
    .text(ctx.t('svc.editTitle'), `svc:e:title:${id}`)
    .row()
    .text(ctx.t('svc.editDuration'), `svc:e:duration:${id}`)
    .text(ctx.t('svc.editPrice'), `svc:e:price:${id}`)
    .row()
    .text(ctx.t(s.active ? 'svc.disable' : 'svc.enable'), `svc:t:${id}`)
    .row()
    .text(ctx.t('common.back'), 'svc:list');
  return showScreen(ctx, text, kb, opts);
}

function durationKeyboard() {
  const kb = new InlineKeyboard();
  DURATIONS.forEach((d) => kb.text(String(d), `dur:${d}`));
  return kb;
}

composer.callbackQuery('svc:list', (ctx) => show(ctx));
composer.callbackQuery(/^svc:v:(\w+)$/, (ctx) => showService(ctx, ctx.match[1]));

// --- Добавление: название → длительность → цена ---
composer.callbackQuery('svc:add', (ctx) => {
  setStep(ctx, 'svc_title', { svc: {} });
  return prompt(ctx, ctx.t('svc.askTitle'), 'svc:list');
});

defineStep(
  'svc_title',
  (ctx) => {
    const title = parseName(ctx.message?.text, 48);
    if (!title) return ctx.reply(ctx.t('svc.badTitle'));
    setStep(ctx, 'svc_duration', { svc: { title } });
    return prompt(ctx, ctx.t('svc.askDuration'), 'svc:list', durationKeyboard());
  },
  { master: true },
);

async function onDuration(ctx, minutes) {
  if (currentStep(ctx) === 'svc_duration') {
    setStep(ctx, 'svc_price', { svc: { ...ctx.session.data.svc, durationMin: minutes } });
    return prompt(ctx, ctx.t('svc.askPrice'), 'svc:list');
  }
  if (currentStep(ctx) === 'svc_edit' && ctx.session.data.field === 'duration') {
    return applyEdit(ctx, minutes);
  }
  return show(ctx);
}

composer.callbackQuery(/^dur:(\d+)$/, (ctx) => onDuration(ctx, Number(ctx.match[1])));

defineStep(
  'svc_duration',
  (ctx) => {
    const minutes = parseDuration(ctx.message?.text);
    if (!minutes) return ctx.reply(ctx.t('svc.badDuration'));
    return onDuration(ctx, minutes);
  },
  { master: true },
);

defineStep(
  'svc_price',
  async (ctx) => {
    const price = parsePrice(ctx.message?.text);
    if (price === null) return ctx.reply(ctx.t('svc.badPrice'));
    const { svc } = ctx.session.data;
    ctx.master.services.push({ id: randomId(8), title: svc.title, durationMin: svc.durationMin, price, active: true });
    await ctx.master.save();
    await ctx.reply(ctx.t('svc.added', { title: esc(svc.title) }), { parse_mode: 'HTML' });
    return show(ctx, { fresh: true });
  },
  { master: true },
);

// --- Редактирование одного поля ---
composer.callbackQuery(/^svc:e:(title|duration|price):(\w+)$/, (ctx) => {
  const [, field, id] = ctx.match;
  if (!findService(ctx, id)) return show(ctx);
  setStep(ctx, 'svc_edit', { id, field });
  const back = `svc:v:${id}`;
  if (field === 'duration') return prompt(ctx, ctx.t('svc.askDuration'), back, durationKeyboard());
  return prompt(ctx, ctx.t(field === 'title' ? 'svc.askTitle' : 'svc.askPrice'), back);
});

async function applyEdit(ctx, value) {
  const { id, field } = ctx.session.data;
  const s = findService(ctx, id);
  if (!s) return show(ctx, { fresh: true });
  if (field === 'title') s.title = value;
  if (field === 'duration') s.durationMin = value;
  if (field === 'price') s.price = value;
  await ctx.master.save();
  if (!ctx.callbackQuery) await ctx.reply(ctx.t('common.saved'));
  return showService(ctx, id, { fresh: !ctx.callbackQuery });
}

defineStep(
  'svc_edit',
  (ctx) => {
    const { field } = ctx.session.data;
    const text = ctx.message?.text;
    if (field === 'title') {
      const v = parseName(text, 48);
      return v ? applyEdit(ctx, v) : ctx.reply(ctx.t('svc.badTitle'));
    }
    if (field === 'duration') {
      const v = parseDuration(text);
      return v ? applyEdit(ctx, v) : ctx.reply(ctx.t('svc.badDuration'));
    }
    const v = parsePrice(text);
    return v !== null ? applyEdit(ctx, v) : ctx.reply(ctx.t('svc.badPrice'));
  },
  { master: true },
);

composer.callbackQuery(/^svc:t:(\w+)$/, async (ctx) => {
  const s = findService(ctx, ctx.match[1]);
  if (!s) return show(ctx);
  s.active = !s.active;
  await ctx.master.save();
  return showService(ctx, s.id);
});

module.exports = { composer, show };
