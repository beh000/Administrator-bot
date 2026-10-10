// Предоплата клиента мастеру. Деньги идут напрямую на карту мастера —
// бот только принимает скриншот и передаёт его мастеру на проверку.
const { Booking } = require('../models');

// Клиент прислал скриншот: pending_payment → payment_review.
// Повторный скриншот во время проверки просто заменяет предыдущий.
async function submitScreenshot(bookingId, clientId, fileId) {
  return Booking.findOneAndUpdate(
    {
      _id: bookingId,
      clientId,
      $or: [{ status: 'pending_payment', paymentDeadline: { $gt: new Date() } }, { status: 'payment_review' }],
    },
    { $set: { status: 'payment_review', paymentScreenshotFileId: fileId } },
    { returnDocument: 'after' },
  );
}

// Решение мастера по скриншоту: payment_review → confirmed | cancelled_by_master
async function reviewPayment(bookingId, masterId, approved) {
  return Booking.findOneAndUpdate(
    { _id: bookingId, masterId, status: 'payment_review' },
    { $set: { status: approved ? 'confirmed' : 'cancelled_by_master' } },
    { returnDocument: 'after' },
  );
}

// Записи, по которым скриншот не пришёл вовремя: pending_payment → expired.
// Возвращает просроченные записи (для уведомлений).
async function expireUnpaid(now = new Date()) {
  const due = await Booking.find({ status: 'pending_payment', paymentDeadline: { $lte: now } }, { _id: 1 }).lean();
  const expired = [];
  for (const { _id } of due) {
    // атомарно: клиент мог прислать скриншот в эту же секунду
    // eslint-disable-next-line no-await-in-loop
    const b = await Booking.findOneAndUpdate(
      { _id, status: 'pending_payment' },
      { $set: { status: 'expired' } },
      { returnDocument: 'after' },
    );
    if (b) expired.push(b);
  }
  return expired;
}

// Самая свежая запись клиента, ожидающая скриншот (для фото без нажатия «Я оплатил»)
async function latestAwaitingPayment(clientId) {
  return Booking.findOne({
    clientId,
    status: { $in: ['pending_payment', 'payment_review'] },
    $or: [{ status: 'payment_review' }, { paymentDeadline: { $gt: new Date() } }],
  }).sort({ createdAt: -1 });
}

module.exports = { submitScreenshot, reviewPayment, expireUnpaid, latestAwaitingPayment };
