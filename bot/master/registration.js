// Пошаговая регистрация мастера:
// имя → телефон → услуги → график → предоплата → ссылка.
// Мастер создаётся в БД сразу после выбора роли (registered = false), а
// экраны услуг/графика/предоплаты — те же, что в меню, только с кнопкой «Далее».
const { Composer, Keyboard } = require('grammy');
const { Master } = require('../../models');
const { config } = require('../../config');
const { now, WEEKDAYS } = require('../../utils/time');
const { randomId } = require('../../utils/ids');
const { parseName, parsePhone } = require('../../utils/validate');
const { defineStep, setStep, clearStep } = require('../steps');
const { show, alert, esc, BASE_OPTS } = require('../ui');

const composer = new Composer();

async function uniqueSlug() {
  for (let i = 0; i < 10; i += 1) {
    const slug = randomId(6);
    // eslint-disable-next-line no-await-in-loop
    if (!(await Master.exists({ slug }))) return slug;
  }
  throw new Error('Не удалось сгенерировать уникальный slug');
}

async function begin(ctx) {
  if (ctx.master?.registered) return require('./menu').show(ctx);
  if (!ctx.master) {
    try {
      ctx.master = await Master.create({
        telegramId: ctx.from.id,
        language: ctx.lang,
        slug: await uniqueSlug(),
      });
    } catch (err) {
      if (err.code !== 11000) throw err; // двойное нажатие — мастер уже создан
      ctx.master = await Master.findOne({ telegramId: ctx.from.id });
    }
  }
  return resume(ctx);
}

async function resume(ctx) {
  const m = ctx.master;
  switch (m.regStep) {
    case 'phone':
      return askPhone(ctx);
    case 'services':
      return require('./services').show(ctx);
    case 'schedule':
      return require('./schedule').show(ctx);
    case 'prepayment':
      return require('./prepayment').show(ctx);
    default:
      setStep(ctx, 'reg_name');
      return show(ctx, ctx.t('reg.askName'));
  }
}

defineStep(
  'reg_name',
  async (ctx) => {
    const name = parseName(ctx.message?.text, 48);
    if (!name) return ctx.reply(ctx.t('reg.badName'));
    ctx.master.name = name;
    ctx.master.regStep = 'phone';
    await ctx.master.save();
    return askPhone(ctx);
  },
  { master: true },
);

function askPhone(ctx) {
  setStep(ctx, 'reg_phone');
  const kb = new Keyboard().requestContact(ctx.t('reg.sharePhone')).resized().oneTime();
  return ctx.reply(ctx.t('reg.askPhone'), { ...BASE_OPTS, reply_markup: kb });
}

defineStep(
  'reg_phone',
  async (ctx) => {
    const contact = ctx.message?.contact;
    const phone = parsePhone(contact ? contact.phone_number : ctx.message?.text);
    if (!phone) return ctx.reply(ctx.t('reg.badPhone'));
    ctx.master.phone = phone;
    ctx.master.regStep = 'services';
    await ctx.master.save();
    if (!ctx.user.phone) {
      ctx.user.phone = phone;
      await ctx.user.save();
    }
    clearStep(ctx);
    await ctx.reply(ctx.t('reg.phoneSaved'), { reply_markup: { remove_keyboard: true } });
    return require('./services').show(ctx, { fresh: true });
  },
  { master: true },
);

// Кнопка «Далее» на экранах услуг, графика и предоплаты
composer.callbackQuery('reg:next', async (ctx) => {
  const m = ctx.master;
  if (m.registered) return require('./menu').show(ctx);
  clearStep(ctx);
  if (m.regStep === 'services') {
    if (!m.activeServices().length) return alert(ctx, ctx.t('reg.needService'));
    m.regStep = 'schedule';
    await m.save();
    return require('./schedule').show(ctx);
  }
  if (m.regStep === 'schedule') {
    if (!WEEKDAYS.some((d) => m.schedule[d].working)) return alert(ctx, ctx.t('reg.needWorkingDay'));
    m.regStep = 'prepayment';
    await m.save();
    return require('./prepayment').show(ctx);
  }
  if (m.regStep === 'prepayment') return finish(ctx);
  return resume(ctx);
});

async function finish(ctx) {
  const m = ctx.master;
  m.registered = true;
  m.regStep = 'done';
  m.subscription = {
    status: 'trial',
    paidUntil: now().add(config.TRIAL_DAYS, 'day').endOf('day').toDate(),
  };
  await m.save();
  clearStep(ctx);
  await show(ctx, ctx.t('reg.done', { name: esc(m.name), days: config.TRIAL_DAYS }));
  await require('./link').sendLink(ctx);
  return require('./menu').show(ctx, { fresh: true });
}

module.exports = { composer, begin, resume };
