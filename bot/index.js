const { Bot, session, GrammyError, HttpError, InlineKeyboard } = require('grammy');
const { autoRetry } = require('@grammyjs/auto-retry');
const { initAlerts, alertError } = require('./alerts');
const { fitText } = require('./ui');
const { mongoSessionStorage } = require('../models');
const { t, LANGS } = require('../locales');
const { loadUser, privateOnly } = require('./middleware');
const { stepRouter } = require('./steps');
const common = require('./common');
const master = require('./master');
const client = require('./client');
const reminders = require('./reminders');
const admin = require('./admin');
const reviews = require('./reviews');
const { config } = require('../config');

function createBot(token) {
  const bot = new Bot(token);
  initAlerts(bot.api);

  // 429 (слишком много запросов) и временные сетевые ошибки — повторяем сами
  bot.api.config.use(autoRetry({ maxRetryAttempts: 3, maxDelaySeconds: 30 }));

  // Все тексты в locales/ размечены HTML — включаем его по умолчанию
  // и убираем пустые ряды inline-клавиатуры, которые оставляет InlineKeyboard.row()
  bot.api.config.use((prev, method, payload, signal) => {
    const rows = payload?.reply_markup?.inline_keyboard;
    if (rows) {
      payload = { ...payload, reply_markup: { inline_keyboard: rows.filter((r) => r.length) } };
    }
    if (['sendMessage', 'editMessageText', 'sendPhoto', 'editMessageCaption'].includes(method)) {
      payload = { parse_mode: 'HTML', ...payload };
    }
    // Лимит Telegram: 4096 символов на сообщение, 1024 на подпись
    if (typeof payload.text === 'string') payload = { ...payload, text: fitText(payload.text, 4000) };
    if (typeof payload.caption === 'string') payload = { ...payload, caption: fitText(payload.caption, 1000) };
    return prev(method, payload, signal);
  });

  bot.use(privateOnly);
  bot.use(
    session({
      initial: () => ({ step: null, data: {} }),
      storage: mongoSessionStorage,
      getSessionKey: (ctx) => ctx.from?.id?.toString(),
    }),
  );
  bot.use(loadUser);

  // Отвечаем на каждое нажатие inline-кнопки, чтобы у кнопки не висели «часики»
  bot.on('callback_query', async (ctx, next) => {
    await next();
    await ctx.answerCallbackQuery().catch(() => {});
  });
  bot.callbackQuery('noop', () => {});

  bot.use(common.composer);
  bot.use(admin.composer);
  bot.use(master);
  bot.use(reminders.composer);
  bot.use(reviews.composer);
  bot.use(client.composer);

  // Текст/контакт/фото — обработчику текущего шага
  bot.on('message', stepRouter);

  // Ничего не подошло
  bot.on('callback_query', (ctx) => ctx.answerCallbackQuery({ text: ctx.t('common.staleButton') }).catch(() => {}));
  bot.on('message', (ctx) =>
    ctx.reply(ctx.t('common.useMenu'), {
      reply_markup: new InlineKeyboard().text(ctx.t('common.openMenu'), 'nav:home'),
    }),
  );

  bot.catch((err) => {
    const { ctx, error } = err;
    const where = `update ${ctx.update.update_id} от ${ctx.from?.id}`;
    if (error instanceof GrammyError) console.error(`[bot] Ошибка Telegram API (${where}):`, error.description);
    else if (error instanceof HttpError) console.error(`[bot] Сетевая ошибка (${where}):`, error.message);
    else console.error(`[bot] Ошибка обработки (${where}):`, error);
    // «message is not modified» и заблокировавшие бота пользователи — не сбой
    const benign = error instanceof GrammyError && /not modified|bot was blocked|chat not found|query is too old/i.test(error.description);
    if (!benign) alertError('bot', error);
    // Сообщаем пользователю, что что-то пошло не так, но не падаем
    const lang = ctx.lang || 'ru';
    ctx.reply(t(lang, 'common.error')).catch(() => {});
  });

  return bot;
}

// Меню команд Telegram на обоих языках
async function setCommands(bot) {
  const commands = (lang) => [
    { command: 'start', description: t(lang, 'commands.start') },
    { command: 'menu', description: t(lang, 'commands.menu') },
    { command: 'lang', description: t(lang, 'commands.lang') },
  ];
  await bot.api.setMyCommands(commands('ru'));
  await Promise.all(LANGS.map((lang) => bot.api.setMyCommands(commands(lang), { language_code: lang })));
  // Админу — дополнительные команды в его чате
  if (config.ADMIN_ID) {
    const adminCommands = [
      ...commands('ru'),
      { command: 'admin', description: t('ru', 'commands.admin') },
      { command: 'extend', description: t('ru', 'commands.extend') },
      { command: 'broadcast', description: t('ru', 'commands.broadcast') },
    ];
    await bot.api.setMyCommands(adminCommands, { scope: { type: 'chat', chat_id: config.ADMIN_ID } }).catch((err) => {
      // админ ещё не писал боту — чат не найден; команды всё равно работают
      console.warn('[bot] Не удалось задать команды админа:', err.description || err.message);
    });
  }
}

module.exports = { createBot, setCommands };
