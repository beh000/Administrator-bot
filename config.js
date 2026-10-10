require('dotenv').config({ quiet: true });

function num(name, def) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return def;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`Переменная ${name} должна быть числом, сейчас: "${raw}"`);
  return n;
}

const config = {
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  MONGODB_URI: process.env.MONGODB_URI || '',
  ADMIN_ID: num('ADMIN_ID', 0),
  SUB_PRICE: num('SUB_PRICE', 50000),
  SUB_CARD: process.env.SUB_CARD || '',
  SUB_CARD_NAME: process.env.SUB_CARD_NAME || '',
  TRIAL_DAYS: num('TRIAL_DAYS', 30),
};

function assertConfig() {
  const missing = ['BOT_TOKEN', 'MONGODB_URI'].filter((k) => !config[k]);
  if (missing.length) throw new Error(`Не заданы переменные окружения: ${missing.join(', ')}`);
  if (!config.ADMIN_ID) console.warn('[config] ADMIN_ID не задан — админ-функции недоступны');
}

module.exports = { config, assertConfig };
