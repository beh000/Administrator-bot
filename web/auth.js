// Проверка входа из Telegram Mini App: Telegram подписывает initData токеном бота.
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
const crypto = require('crypto');

const MAX_AGE_SEC = 24 * 3600; // открытое приложение живёт сутки, потом — переоткрыть

// Возвращает пользователя Telegram ({ id, first_name, ... }) или null
function verifyInitData(initData, botToken, nowSec = Math.floor(Date.now() / 1000)) {
  if (!initData || typeof initData !== 'string' || initData.length > 4096) return null;
  const params = new URLSearchParams(initData);
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
  try {
    const user = JSON.parse(params.get('user') || 'null');
    return user && Number.isInteger(user.id) ? user : null;
  } catch {
    return null;
  }
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

module.exports = { verifyInitData, signInitData, MAX_AGE_SEC };
