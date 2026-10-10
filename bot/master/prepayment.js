// Настройка предоплаты. Деньги клиентов идут ТОЛЬКО на карту мастера —
// бот лишь показывает реквизиты и пересылает скриншот мастеру.
const { Composer, InlineKeyboard } = require('grammy');
const { parsePrice, parseCard, formatCard, parseName } = require('../../utils/validate');
const { defineStep, setStep, clearStep } = require('../steps');
const { show: showScreen, prompt, footer, esc, fmtMoney } = require('../ui');

const composer = new Composer();

function isComplete(pp) {
  return pp.amount > 0 && !!pp.cardNumber && !!pp.cardHolder;
}

function show(ctx, opts = {}) {
  clearStep(ctx);
  const m = ctx.master;
  const pp = m.prepayment;
  const inReg = !m.registered;
  const kb = new InlineKeyboard();
  let text;

  if (pp.enabled) {
    text = ctx.t('pp.on', {
      amount: fmtMoney(pp.amount),
      card: formatCard(pp.cardNumber),
      holder: esc(pp.cardHolder),
      timeout: pp.timeoutMin,
    });
    kb.text(ctx.t('pp.editAmount'), 'pp:e:amount').row();
    kb.text(ctx.t('pp.editCard'), 'pp:e:card').text(ctx.t('pp.editHolder'), 'pp:e:holder').row();
    kb.text(ctx.t('pp.disable'), 'pp:off');
    if (inReg) kb.row().text(ctx.t('reg.finish'), 'reg:next');
    else footer(ctx, kb);
  } else if (inReg) {
    text = ctx.t('pp.askNeed');
    kb.text(ctx.t('pp.yes'), 'pp:on').row().text(ctx.t('pp.no'), 'reg:next');
  } else {
    text = ctx.t('pp.off');
    kb.text(ctx.t('pp.enable'), 'pp:on');
    footer(ctx, kb);
  }
  return showScreen(ctx, text, kb, opts);
}

composer.callbackQuery('pp:show', (ctx) => show(ctx));

composer.callbackQuery('pp:on', async (ctx) => {
  const pp = ctx.master.prepayment;
  if (isComplete(pp)) {
    pp.enabled = true;
    await ctx.master.save();
    return show(ctx);
  }
  // не хватает реквизитов — проводим мастера по шагам: сумма → карта → имя
  setStep(ctx, 'pp_amount', { wizard: true });
  return prompt(ctx, ctx.t('pp.askAmount'), 'pp:show');
});

composer.callbackQuery('pp:off', async (ctx) => {
  ctx.master.prepayment.enabled = false;
  await ctx.master.save();
  return show(ctx);
});

const EDIT_PROMPTS = { amount: 'pp.askAmount', card: 'pp.askCard', holder: 'pp.askHolder' };

composer.callbackQuery(/^pp:e:(amount|card|holder)$/, (ctx) => {
  const field = ctx.match[1];
  setStep(ctx, `pp_${field}`, { wizard: false });
  return prompt(ctx, ctx.t(EDIT_PROMPTS[field]), 'pp:show');
});

// Сохранить поле; в режиме мастера-подсказки перейти к следующему шагу
async function saveAndContinue(ctx, nextStep) {
  const { wizard } = ctx.session.data;
  if (wizard && nextStep) {
    await ctx.master.save();
    setStep(ctx, `pp_${nextStep}`);
    return prompt(ctx, ctx.t(EDIT_PROMPTS[nextStep]), 'pp:show');
  }
  if (wizard) ctx.master.prepayment.enabled = true;
  await ctx.master.save();
  await ctx.reply(ctx.t('common.saved'));
  return show(ctx, { fresh: true });
}

defineStep(
  'pp_amount',
  (ctx) => {
    const amount = parsePrice(ctx.message?.text);
    if (!amount) return ctx.reply(ctx.t('pp.badAmount'));
    ctx.master.prepayment.amount = amount;
    return saveAndContinue(ctx, 'card');
  },
  { master: true },
);

defineStep(
  'pp_card',
  (ctx) => {
    const card = parseCard(ctx.message?.text);
    if (!card) return ctx.reply(ctx.t('pp.badCard'));
    ctx.master.prepayment.cardNumber = card;
    return saveAndContinue(ctx, 'holder');
  },
  { master: true },
);

defineStep(
  'pp_holder',
  (ctx) => {
    const holder = parseName(ctx.message?.text, 64);
    if (!holder) return ctx.reply(ctx.t('pp.badHolder'));
    ctx.master.prepayment.cardHolder = holder;
    return saveAndContinue(ctx, null);
  },
  { master: true },
);

module.exports = { composer, show };
