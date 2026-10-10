// Создание, отмена и перенос записей.
//
// Двойное бронирование. MongoDB на Railway работает без replica set, поэтому
// транзакций нет. Вместо них — короткая блокировка мастера (bookingLockUntil):
// пока она взята, никто другой не создаёт запись к этому мастеру. Под
// блокировкой слот проверяется заново и только потом создаётся запись.
const { Master, Booking } = require('../models');
const { isSlotAvailable } = require('./slots');

const LOCK_MS = 15_000;
const LOCK_WAIT_MS = 5_000;
const CANCEL_LIMIT_MIN = 120; // отмена и перенос — не позже чем за 2 часа
const MAX_UPCOMING_PER_MASTER = 3; // защита от записи «на всё подряд»

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withMasterLock(masterId, fn) {
  const deadline = Date.now() + LOCK_WAIT_MS;
  for (;;) {
    const now = new Date();
    // eslint-disable-next-line no-await-in-loop
    const res = await Master.updateOne(
      { _id: masterId, $or: [{ bookingLockUntil: null }, { bookingLockUntil: { $lt: now } }] },
      { $set: { bookingLockUntil: new Date(now.getTime() + LOCK_MS) } },
    );
    if (res.modifiedCount === 1) break;
    if (Date.now() > deadline) throw new Error('Не удалось взять блокировку мастера');
    // eslint-disable-next-line no-await-in-loop
    await sleep(50 + Math.random() * 100);
  }
  try {
    return await fn();
  } finally {
    await Master.updateOne({ _id: masterId }, { $set: { bookingLockUntil: null } });
  }
}

// Предоплата нужна, если мастер её включил или клиент дважды не пришёл (этап 5)
function needsPrepayment(master, client) {
  const pp = master.prepayment || {};
  if (!pp.cardNumber || !(pp.amount > 0)) return false;
  if (pp.enabled) return true;
  const noShows = client.noShowCount?.get?.(String(master._id)) || 0;
  return noShows >= 2;
}

function canClientChange(booking, now = new Date()) {
  return new Date(booking.start).getTime() - now.getTime() >= CANCEL_LIMIT_MIN * 60_000;
}

/**
 * Создать запись. Возвращает { ok: true, booking, previous } или { ok: false, reason }.
 * reason: 'slot_taken' | 'too_many' | 'not_changeable'
 * rescheduleFrom — id записи, которую переносим: она отменяется, а её
 * подтверждённая предоплата переходит на новую запись.
 */
async function createBooking({ master, client, service, start, rescheduleFrom = null }) {
  return withMasterLock(master._id, async () => {
    let previous = null;
    if (rescheduleFrom) {
      previous = await Booking.findOne({ _id: rescheduleFrom, masterId: master._id, clientId: client._id, status: 'confirmed' });
      if (!previous || !canClientChange(previous)) return { ok: false, reason: 'not_changeable' };
    } else {
      const upcoming = await Booking.countDocuments({
        masterId: master._id,
        clientId: client._id,
        status: { $in: Booking.ACTIVE_STATUSES },
        start: { $gt: new Date() },
      });
      if (upcoming >= MAX_UPCOMING_PER_MASTER) return { ok: false, reason: 'too_many' };
    }

    const free = await isSlotAvailable(master, service, start, { excludeBookingId: previous?._id });
    if (!free) return { ok: false, reason: 'slot_taken' };

    const startDate = new Date(start);
    const booking = await Booking.create({
      masterId: master._id,
      clientId: client._id,
      serviceId: service.id,
      serviceTitle: service.title,
      durationMin: service.durationMin,
      start: startDate,
      end: new Date(startDate.getTime() + service.durationMin * 60_000),
      price: service.price,
      // при переносе предоплата уже внесена — запись сразу подтверждена
      prepaymentAmount: previous ? previous.prepaymentAmount : 0,
      paymentScreenshotFileId: previous ? previous.paymentScreenshotFileId : undefined,
      rescheduledFrom: previous ? previous._id : undefined,
      status: 'confirmed',
    });
    if (previous) {
      previous.status = 'cancelled_by_client';
      await previous.save();
    }
    return { ok: true, booking, previous };
  });
}

// Отмена клиентом. { ok, booking } или { ok: false, reason: 'not_found' | 'too_late' }
async function cancelByClient(bookingId, client) {
  const booking = await Booking.findOne({
    _id: bookingId,
    clientId: client._id,
    status: { $in: Booking.ACTIVE_STATUSES },
  });
  if (!booking) return { ok: false, reason: 'not_found' };
  if (!canClientChange(booking)) return { ok: false, reason: 'too_late', booking };
  // атомарно: запись могла поменять статус, пока клиент думал
  const updated = await Booking.findOneAndUpdate(
    { _id: booking._id, status: booking.status },
    { $set: { status: 'cancelled_by_client' } },
    { returnDocument: 'after' },
  );
  if (!updated) return { ok: false, reason: 'not_found' };
  return { ok: true, booking: updated };
}

module.exports = {
  createBooking,
  cancelByClient,
  needsPrepayment,
  canClientChange,
  withMasterLock,
  CANCEL_LIMIT_MIN,
  MAX_UPCOMING_PER_MASTER,
};
