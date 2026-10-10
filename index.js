const mongoose = require('mongoose');
const { config, assertConfig } = require('./config');
const { createBot, setCommands } = require('./bot');

// Бот не должен падать из-за случайной ошибки — логируем и работаем дальше
process.on('unhandledRejection', (err) => console.error('[process] unhandledRejection:', err));
process.on('uncaughtException', (err) => console.error('[process] uncaughtException:', err));

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
