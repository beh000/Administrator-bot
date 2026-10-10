const { Bot, session, GrammyError, HttpError, InlineKeyboard } = require('grammy');
const { mongoSessionStorage } = require('../models');
const { t, LANGS } = require('../locales');
const { loadUser, privateOnly } = require('./middleware');
const { stepRouter } = require('./steps');
const common = require('./common');
const master = require('./master');
const client = require('./client');

function createBot(token) {
  const bot = new Bot(token);

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
  bot.use(master);
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
}

module.exports = { createBot, setCommands };
