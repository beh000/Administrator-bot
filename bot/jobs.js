// Фоновые задачи по расписанию (node-cron). Время расписаний — Asia/Tashkent.
const cron = require('node-cron');
const { Client } = require('../models');
const { t } = require('../locales');
const { TZ } = require('../utils/time');
const { expireUnpaid } = require('../services/payments');
const { esc, fmtDay, fmtTime } = require('./ui');
const { sendTo } = require('./notify');
const { runReminders, sendMorningDigest, sendRebookReminders } = require('./reminders');
const { expireDue, dueSubscriptionReminders } = require('../services/subscription');
const { local } = require('../utils/time');
const { config } = require('../config');
const { fmtMoney } = require('./ui');
const { InlineKeyboard } = require('grammy');
const { alertError } = require('./alerts');
const { Booking } = require('../models');

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
      alertError(`jobs:${name}`, err);
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

// Раз в день: истёкшие подписки → expired, мастеру сообщение
async function expireSubscriptions(api) {
  const expired = await expireDue();
  for (const m of expired) {
    // eslint-disable-next-line no-await-in-loop
    await sendTo(api, m.telegramId, m.language, 'sub.expiredNotice', { price: fmtMoney(config.SUB_PRICE) }, {
      reply_markup: new InlineKeyboard().text(t(m.language, 'sub.payBtn'), 'sub:pay'),
    });
  }
  if (expired.length) console.log(`[jobs] Подписка истекла: ${expired.length} мастер(ов)`);
}

// Раз в день: напоминание за 3 и за 1 день до конца подписки
async function remindSubscriptions(api) {
  const due = await dueSubscriptionReminders();
  for (const { master: m, daysLeft } of due) {
    // eslint-disable-next-line no-await-in-loop
    await sendTo(
      api,
      m.telegramId,
      m.language,
      'sub.reminder',
      { days: daysLeft, until: local(m.subscription.paidUntil).format('DD.MM.YYYY'), price: fmtMoney(config.SUB_PRICE) },
      { reply_markup: new InlineKeyboard().text(t(m.language, 'sub.payBtn'), 'sub:pay') },
    );
  }
  if (due.length) console.log(`[jobs] Напоминаний о подписке: ${due.length}`);
}

// Раз в день: записи, по которым мастер так и не ответил «пришёл / не пришёл»
// за 2 суток, считаем состоявшимися — чтобы статистика не висела
async function autoCompleteStale(now = new Date()) {
  const res = await Booking.updateMany(
    { kind: { $ne: 'block' }, status: 'confirmed', end: { $lt: new Date(now.getTime() - 48 * 3600_000) } },
    { $set: { status: 'completed' } },
  );
  if (res.modifiedCount) console.log(`[jobs] Автоматически завершено записей: ${res.modifiedCount}`);
  return res.modifiedCount;
}

function startJobs(bot) {
  const opts = { timezone: TZ };
  cron.schedule('* * * * *', guarded('expirePayments', () => expirePayments(bot.api)), opts);
  cron.schedule('*/5 * * * *', guarded('reminders', () => runReminders(bot.api)), opts);
  cron.schedule('0 8 * * *', guarded('morningDigest', () => sendMorningDigest(bot.api)), opts);
  cron.schedule('5 0 * * *', guarded('expireSubscriptions', () => expireSubscriptions(bot.api)), opts);
  cron.schedule('0 10 * * *', guarded('remindSubscriptions', () => remindSubscriptions(bot.api)), opts);
  cron.schedule('30 3 * * *', guarded('autoCompleteStale', () => autoCompleteStale()), opts);
  cron.schedule('0 12 * * *', guarded('rebook', () => sendRebookReminders(bot.api)), opts);
  console.log('[jobs] Задачи запущены');
}

module.exports = { startJobs, expirePayments, expireSubscriptions, remindSubscriptions, autoCompleteStale };
