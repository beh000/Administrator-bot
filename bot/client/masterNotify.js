// Сообщения мастеру о действиях клиента. Общие для бота и мини-приложения:
// откуда бы клиент ни записался, мастер узнает одинаково.
const { InlineKeyboard } = require('grammy');
const { t } = require('../../locales');
const { esc, fmtMoney, fmtDay, fmtTime } = require('../ui');
const { sendTo } = require('../notify');

const trOf = (lang) => (k, p) => t(lang, k, p);

// Новая запись или перенос (previous — старая запись)
async function notifyMasterBooked(api, master, client, booking, previous) {
  const lang = master.language;
  const tr = trOf(lang);
  const params = {
    client: esc(client.name),
    phone: esc(client.phone),
    service: esc(booking.serviceTitle),
    date: fmtDay(tr, booking.start),
    time: fmtTime(booking.start),
    price: fmtMoney(booking.price),
  };
  if (previous) {
    params.oldDate = fmtDay(tr, previous.start);
    params.oldTime = fmtTime(previous.start);
  }
  const kb = new InlineKeyboard()
    .text(t(lang, 'notify.openBtn'), `mb:v:${booking._id}`)
    .url(t(lang, 'notify.writeBtn'), `tg://user?id=${client.telegramId}`);
  return sendTo(api, master.telegramId, lang, previous ? 'notify.rescheduled' : 'notify.newBooking', params, { reply_markup: kb });
}

// Клиент отменил запись
async function notifyMasterCancelled(api, master, client, booking) {
  const lang = master.language;
  return sendTo(
    api,
    master.telegramId,
    lang,
    'notify.cancelled',
    {
      client: esc(client.name),
      phone: esc(client.phone),
      service: esc(booking.serviceTitle),
      date: fmtDay(trOf(lang), booking.start),
      time: fmtTime(booking.start),
    },
    { reply_markup: new InlineKeyboard().url(t(lang, 'notify.writeBtn'), `tg://user?id=${client.telegramId}`) },
  );
}

// Скриншот предоплаты мастеру с кнопками «Оплата получена / Оплаты нет»
async function sendScreenshotToMaster(api, master, client, booking, fileId) {
  const lang = master.language;
  const caption = t(lang, 'pm.review', {
    client: esc(client.name),
    phone: esc(client.phone),
    service: esc(booking.serviceTitle),
    date: fmtDay(trOf(lang), booking.start),
    time: fmtTime(booking.start),
    amount: fmtMoney(booking.prepaymentAmount),
  });
  const kb = new InlineKeyboard().text(t(lang, 'pm.okBtn'), `pm:ok:${booking._id}`).text(t(lang, 'pm.noBtn'), `pm:no:${booking._id}`);
  try {
    // тем же ботом, по file_id — файл не скачивается
    await api.sendPhoto(master.telegramId, fileId, { caption, parse_mode: 'HTML', reply_markup: kb });
  } catch (err) {
    console.error(`[payment] Не удалось отправить скриншот мастеру ${master.telegramId}:`, err.description || err.message);
  }
}

module.exports = { notifyMasterBooked, notifyMasterCancelled, sendScreenshotToMaster };
