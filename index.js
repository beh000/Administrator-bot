const mongoose = require('mongoose');
const { config, assertConfig } = require('./config');
const { createBot, setCommands } = require('./bot');

// Бот не должен падать из-за случайной ошибки — логируем и работаем дальше
process.on('unhandledRejection', (err) => console.error('[process] unhandledRejection:', err));
process.on('uncaughtException', (err) => console.error('[process] uncaughtException:', err));

async function main() {
  assertConfig();

  await mongoose.connect(config.MONGODB_URI);
  console.log('[db] MongoDB подключена');
  await mongoose.syncIndexes();

  const bot = createBot(config.BOT_TOKEN);
  await bot.init();
  await setCommands(bot).catch((err) => console.error('[bot] Не удалось установить команды:', err.message));

  const stop = async () => {
    await bot.stop();
    await mongoose.disconnect();
    process.exit(0);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  await bot.start({
    allowed_updates: ['message', 'callback_query'],
    onStart: (me) => console.log(`[bot] Запущен как @${me.username}`),
  });
}

main().catch((err) => {
  // Ошибка при старте (нет токена, нет БД) — выходим, Railway перезапустит
  console.error('[startup] Ошибка запуска:', err);
  process.exit(1);
});
