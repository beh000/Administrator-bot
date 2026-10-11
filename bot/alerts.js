// Сообщения владельцу сервиса (ADMIN_ID): новые мастера и сбои.
// Сбои одного типа шлём не чаще раза в 10 минут, чтобы не завалить чат.
const { config } = require('../config');
const { t } = require('../locales');
const { esc } = require('./ui');

let api = null;
const lastSent = new Map();
const COOLDOWN_MS = 10 * 60_000;

function initAlerts(botApi) {
  api = botApi;
}

async function adminLang() {
  try {
    const { Client } = require('../models');
    const admin = await Client.findOne({ telegramId: config.ADMIN_ID }, { language: 1 }).lean();
    return admin?.language || 'ru';
  } catch {
    return 'ru';
  }
}

async function sendAdmin(key, params) {
  if (!api || !config.ADMIN_ID) return;
  try {
    const lang = await adminLang();
    await api.sendMessage(config.ADMIN_ID, t(lang, key, params), { parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
  } catch (err) {
    console.error('[alerts] Не удалось написать админу:', err.description || err.message);
  }
}

// Сбой: где и что. Одинаковые «где» — не чаще раза в 10 минут.
function alertError(where, err) {
  const now = Date.now();
  if (now - (lastSent.get(where) || 0) < COOLDOWN_MS) return;
  lastSent.set(where, now);
  const message = String(err?.description || err?.message || err).slice(0, 500);
  sendAdmin('alert.error', { where: esc(where), message: esc(message) }).catch(() => {});
}

module.exports = { initAlerts, sendAdmin, alertError };
