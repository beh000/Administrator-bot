// Проверка входа из Telegram Mini App: Telegram подписывает initData токеном бота.
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
const crypto = require('crypto');

const MAX_AGE_SEC = 24 * 3600; // открытое приложение живёт сутки, потом — переоткрыть

// Проверить подпись Telegram у строки вида initData. Возвращает URLSearchParams или null
function checkSigned(raw, botToken, nowSec = Math.floor(Date.now() / 1000)) {
  if (!raw || typeof raw !== 'string' || raw.length > 4096) return null;
  const params = new URLSearchParams(raw);
  const hash = params.get('hash');
  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) return null;
  params.delete('hash');
  const dataCheck = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = crypto.createHmac('sha256', secret).update(dataCheck).digest();
  if (!crypto.timingSafeEqual(expected, Buffer.from(hash, 'hex'))) return null;
  const authDate = Number(params.get('auth_date'));
  if (!authDate || nowSec - authDate > MAX_AGE_SEC) return null;
  return params;
}

function parseJson(s) {
  try {
    return JSON.parse(s || 'null');
  } catch {
    return null;
  }
}

// Возвращает пользователя Telegram ({ id, first_name, ... }) или null
function verifyInitData(initData, botToken, nowSec) {
  const params = checkSigned(initData, botToken, nowSec);
  const user = params && parseJson(params.get('user'));
  return user && Number.isInteger(user.id) ? user : null;
}

// Ответ WebApp.requestContact: подписан так же, как initData. Номер — только свой
function verifyContact(response, botToken, userId, nowSec) {
  const params = checkSigned(response, botToken, nowSec);
  const contact = params && parseJson(params.get('contact'));
  if (!contact?.phone_number || contact.user_id !== userId) return null;
  return contact;
}

// Подписать initData (для тестов)
function signInitData(fields, botToken) {
  const params = new URLSearchParams(fields);
  const dataCheck = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  params.set('hash', crypto.createHmac('sha256', secret).update(dataCheck).digest('hex'));
  return params.toString();
}

module.exports = { verifyInitData, verifyContact, signInitData, MAX_AGE_SEC };
