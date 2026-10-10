// Сообщения другим пользователям (мастеру, клиенту) — на их языке.
// Ошибки (пользователь заблокировал бота) логируем и не пробрасываем.
const { t } = require('../locales');

async function sendTo(api, telegramId, lang, key, params, extra = {}) {
  const { append = '', ...rest } = extra;
  try {
    return await api.sendMessage(telegramId, t(lang || 'ru', key, params) + append, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      ...rest,
    });
  } catch (err) {
    console.error(`[notify] Не удалось отправить "${key}" пользователю ${telegramId}:`, err.description || err.message);
    return null;
  }
}

module.exports = { sendTo };
