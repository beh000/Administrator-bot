// Фоновые задачи по расписанию (node-cron). Время расписаний — Asia/Tashkent.
const cron = require('node-cron');
const { Client } = require('../models');
const { t } = require('../locales');
const { TZ } = require('../utils/time');
const { expireUnpaid } = require('../services/payments');
const { esc, fmtDay, fmtTime } = require('./ui');
const { sendTo } = require('./notify');
const { runReminders, sendMorningDigest } = require('./reminders');

// Задача не запускается повторно, пока не закончилась предыдущая,
// и никогда не роняет процесс
function guarded(name, fn) {
  let running = false;
  return async () => {
    if (running) return;
    running = true;
    try {
      await fn();
    } catch (err) {
      console.error(`[jobs] Ошибка в задаче "${name}":`, err);
    } finally {
      running = false;
    }
  };
}

// Неоплаченные вовремя записи → expired, слот освобождается, клиенту сообщение
async function expirePayments(api) {
  const expired = await expireUnpaid();
  for (const b of expired) {
    // eslint-disable-next-line no-await-in-loop
    const client = await Client.findById(b.clientId);
    if (!client) continue;
    const lang = client.language;
    // eslint-disable-next-line no-await-in-loop
    await sendTo(api, client.telegramId, lang, 'client.paymentExpired', {
      service: esc(b.serviceTitle),
      date: fmtDay((k) => t(lang, k), b.start),
      time: fmtTime(b.start),
    });
  }
  if (expired.length) console.log(`[jobs] Просрочено неоплаченных записей: ${expired.length}`);
}

function startJobs(bot) {
  const opts = { timezone: TZ };
  cron.schedule('* * * * *', guarded('expirePayments', () => expirePayments(bot.api)), opts);
  cron.schedule('*/5 * * * *', guarded('reminders', () => runReminders(bot.api)), opts);
  cron.schedule('0 8 * * *', guarded('morningDigest', () => sendMorningDigest(bot.api)), opts);
  console.log('[jobs] Задачи запущены');
}

module.exports = { startJobs, expirePayments };
