const mongoose = require('mongoose');
const { config, assertConfig } = require('./config');
const { createBot, setCommands } = require('./bot');
const { startJobs } = require('./bot/jobs');
const { createServer } = require('./web/server');

// Бот не должен падать из-за случайной ошибки — логируем и работаем дальше
const { alertError } = require('./bot/alerts');

process.on('unhandledRejection', (err) => {
  console.error('[process] unhandledRejection:', err);
  alertError('process', err);
});
process.on('uncaughtException', (err) => {
  console.error('[process] uncaughtException:', err);
  alertError('process', err);
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// При деплое Railway несколько секунд держит старую и новую копию бота —
// Telegram отвечает 409 Conflict. Не падаем, а ждём, пока старая остановится.
async function startPolling(bot) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await bot.start({
        allowed_updates: ['message', 'callback_query'],
        onStart: (me) => console.log(`[bot] Запущен как @${me.username}`),
      });
      return;
    } catch (err) {
      if (err?.error_code !== 409 || attempt >= 24) throw err;
      console.warn(`[bot] 409 Conflict — другая копия ещё работает, повтор через 5 с (попытка ${attempt})`);
      await sleep(5000);
    }
  }
}

// MongoDB по умолчанию не строит индексы, если на диске меньше 500 МБ свободно.
// На маленьком томе (бесплатный Railway — 500 МБ всего) это условие невыполнимо,
// поэтому при такой ошибке снижаем порог и пробуем ещё раз.
async function syncIndexes() {
  try {
    await mongoose.syncIndexes();
  } catch (err) {
    const outOfDisk = Object.values(err.errors || {}).some((e) => e.code === 14031) || err.code === 14031;
    if (!outOfDisk) throw err;
    console.warn('[db] Мало места для индексов, снижаю indexBuildMinAvailableDiskSpaceMB до 50 МБ');
    await mongoose.connection.db.admin().command({ setParameter: 1, indexBuildMinAvailableDiskSpaceMB: 50 });
    await mongoose.syncIndexes();
  }
}

async function main() {
  assertConfig();

  await mongoose.connect(config.MONGODB_URI);
  console.log('[db] MongoDB подключена');
  await syncIndexes();

  const bot = createBot(config.BOT_TOKEN);
  await bot.init();
  await setCommands(bot).catch((err) => console.error('[bot] Не удалось установить команды:', err.message));
  startJobs(bot);

  // Мини-приложение мастера: сайт и API в том же процессе
  const server = createServer({
    botToken: config.BOT_TOKEN,
    api: bot.api,
    getBotUsername: () => bot.botInfo.username,
    onError: (err) => alertError('webapp', err),
  });
  // Кнопка «Приложение» у поля ввода для всех (клиентам — «Мои записи» и запись);
  // мастерам она ставится в их чате отдельно, в меню мастера
  if (config.WEBAPP_URL) {
    bot.api
      .setChatMenuButton({ menu_button: { type: 'web_app', text: 'Navbatchi', web_app: { url: config.WEBAPP_URL } } })
      .catch((err) => console.error('[bot] Не удалось поставить кнопку приложения:', err.description || err.message));
  }
  server.listen(config.PORT, () => {
    console.log(`[web] Мини-приложение на порту ${config.PORT}${config.WEBAPP_URL ? ` — ${config.WEBAPP_URL}` : ' (адрес не задан: кнопка в боте скрыта)'}`);
  });

  const stop = async () => {
    server.close();
    await bot.stop();
    await mongoose.disconnect();
    process.exit(0);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  await startPolling(bot);
}

main().catch((err) => {
  // Ошибка при старте (нет токена, нет БД) — выходим, Railway перезапустит
  console.error('[startup] Ошибка запуска:', err);
  process.exit(1);
});
