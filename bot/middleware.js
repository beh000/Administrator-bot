const { Client, Master } = require('../models');
const { t, LANGS, DEFAULT_LANG } = require('../locales');

// Загружает профиль пользователя (Client) и, если есть, мастера.
// Добавляет в ctx: user, master, lang, t(key, params).
async function loadUser(ctx, next) {
  if (!ctx.from || ctx.from.is_bot) return undefined;
  const telegramId = ctx.from.id;
  await Client.updateOne({ telegramId }, { $setOnInsert: { telegramId } }, { upsert: true });
  ctx.user = await Client.findOne({ telegramId });
  ctx.master = await Master.findOne({ telegramId });
  setLang(ctx, ctx.user.language || guessLang(ctx.from.language_code));
  return next();
}

function setLang(ctx, lang) {
  ctx.lang = LANGS.includes(lang) ? lang : DEFAULT_LANG;
  ctx.t = (key, params) => t(ctx.lang, key, params);
}

// До выбора языка показываем подсказки на языке Telegram-клиента
function guessLang(code) {
  return code === 'uz' ? 'uz' : DEFAULT_LANG;
}

// Только личные чаты: бот не работает в группах
async function privateOnly(ctx, next) {
  if (ctx.chat && ctx.chat.type !== 'private') return undefined;
  return next();
}

module.exports = { loadUser, setLang, privateOnly };
