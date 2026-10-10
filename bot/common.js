// /start, выбор языка, выбор роли, главное меню
const { Composer, InlineKeyboard } = require('grammy');
const { t, LANGS } = require('../locales');
const { setLang } = require('./middleware');
const { clearStep } = require('./steps');
const { show } = require('./ui');

const composer = new Composer();

function languageKeyboard() {
  const kb = new InlineKeyboard();
  LANGS.forEach((lang) => kb.text(t(lang, 'lang.name'), `lang:${lang}`));
  return kb;
}

// Текст выбора языка — сразу на всех языках, пользователь ещё не выбрал свой
function showLanguagePicker(ctx) {
  const text = LANGS.map((lang) => t(lang, 'lang.choose')).join('\n');
  return show(ctx, text, languageKeyboard());
}

async function showHome(ctx, opts = {}) {
  clearStep(ctx);
  if (ctx.master?.registered) {
    return require('./master/menu').show(ctx, opts);
  }
  const kb = new InlineKeyboard()
    .text(ctx.t('role.master'), 'role:master')
    .text(ctx.t('role.client'), 'role:client')
    .row()
    .text(ctx.t('menu.language'), 'nav:lang');
  return show(ctx, ctx.t('role.choose'), kb, opts);
}

// Обработка параметра /start (deep link). m_<slug> — ссылка мастера.
async function handleStartPayload(ctx, payload) {
  const match = /^m_([a-z0-9]+)$/i.exec(payload || '');
  if (match) return require('./client').openMaster(ctx, match[1].toLowerCase());
  return showHome(ctx, { fresh: true });
}

// Пока язык не выбран — сначала выбор языка. Параметр /start запоминаем,
// чтобы после выбора языка клиент сразу попал к своему мастеру.
composer.use(async (ctx, next) => {
  if (ctx.user.language) return next();
  if (ctx.callbackQuery?.data?.startsWith('lang:')) return next();
  if (ctx.message?.text?.startsWith('/start')) {
    ctx.session.afterLang = ctx.message.text.split(' ')[1] || null;
  }
  return showLanguagePicker(ctx);
});

composer.command('start', async (ctx) => {
  clearStep(ctx);
  return handleStartPayload(ctx, ctx.match);
});

composer.command('menu', (ctx) => showHome(ctx, { fresh: true }));
composer.command('lang', (ctx) => showLanguagePicker(ctx));

composer.callbackQuery('nav:home', (ctx) => showHome(ctx));
composer.callbackQuery('nav:lang', (ctx) => showLanguagePicker(ctx));

composer.callbackQuery(/^lang:(\w+)$/, async (ctx) => {
  const lang = ctx.match[1];
  if (!LANGS.includes(lang)) return undefined;
  const firstTime = !ctx.user.language;
  ctx.user.language = lang;
  await ctx.user.save();
  if (ctx.master) {
    ctx.master.language = lang;
    await ctx.master.save();
  }
  setLang(ctx, lang);
  await ctx.answerCallbackQuery(ctx.t('lang.saved')).catch(() => {});

  const payload = ctx.session.afterLang;
  ctx.session.afterLang = null;
  if (firstTime && payload) {
    await ctx.deleteMessage().catch(() => {});
    return handleStartPayload(ctx, payload);
  }
  return showHome(ctx);
});

composer.callbackQuery('role:master', (ctx) => require('./master/registration').begin(ctx));
composer.callbackQuery('role:client', (ctx) => require('./client').home(ctx));

module.exports = { composer, showHome, showLanguagePicker, handleStartPayload };
