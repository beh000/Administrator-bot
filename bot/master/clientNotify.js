// Сообщения клиенту из бота, когда мастер сам меняет его запись. Общие для
// бота и мини-приложения: кто бы ни изменил запись, клиент узнает одинаково.
const { InlineKeyboard } = require('grammy');
const { t } = require('../../locales');
const { esc, fmtDay, fmtTime } = require('../ui');
const { sendTo } = require('../notify');
const { addressLine } = require('../location');

const trOf = (lang) => (k, p) => t(lang, k, p);

// Мастер записал клиента из бота
async function notifyBooked(api, master, client, b) {
  if (!client?.telegramId) return;
  const lang = client.language || 'ru';
  const tr = trOf(lang);
  await sendTo(
    api,
    client.telegramId,
    lang,
    'mb.clientBooked',
    {
      master: esc(master.name),
      phone: esc(master.phone),
      service: esc(b.serviceTitle),
      date: fmtDay(tr, b.start),
      time: fmtTime(b.start),
      address: addressLine(tr, master),
    },
    { reply_markup: new InlineKeyboard().text(t(lang, 'client.myButton'), 'c:my') },
  );
}

// Мастер отменил запись. b.clientId — заполненный клиент, b.previousStatus — из cancelByMaster
async function notifyCancelled(api, master, b) {
  const client = b.clientId;
  if (!client?.telegramId) return;
  const lang = client.language;
  // о возврате — только если предоплата действительно была внесена
  const wasPaid = b.prepaymentAmount > 0 && ['payment_review', 'confirmed'].includes(b.previousStatus);
  await sendTo(
    api,
    client.telegramId,
    lang,
    'mb.clientCancelled',
    {
      master: esc(master.name),
      phone: esc(master.phone),
      service: esc(b.serviceTitle),
      date: fmtDay(trOf(lang), b.start),
      time: fmtTime(b.start),
    },
    { append: wasPaid ? `\n\n${t(lang, 'mb.clientRefundNote')}` : '' },
  );
}

// Мастер перенёс запись
async function notifyMoved(api, master, b, oldStart) {
  const client = b.clientId;
  if (!client?.telegramId) return;
  const lang = client.language;
  const tr = trOf(lang);
  await sendTo(api, client.telegramId, lang, 'mb.clientMoved', {
    master: esc(master.name),
    phone: esc(master.phone),
    service: esc(b.serviceTitle),
    oldDate: fmtDay(tr, oldStart),
    oldTime: fmtTime(oldStart),
    date: fmtDay(tr, b.start),
    time: fmtTime(b.start),
  });
}

module.exports = { notifyBooked, notifyCancelled, notifyMoved };
