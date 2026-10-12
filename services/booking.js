// Создание, отмена и перенос записей.
//
// Двойное бронирование. MongoDB на Railway работает без replica set, поэтому
// транзакций нет. Вместо них — короткая блокировка мастера (bookingLockUntil):
// пока она взята, никто другой не создаёт запись к этому мастеру. Под
// блокировкой слот проверяется заново и только потом создаётся запись.
const { Master, Booking, Client } = require('../models');
const { isSlotAvailable } = require('./slots');
const { randomId } = require('../utils/ids');

const LOCK_MS = 15_000;
const LOCK_WAIT_MS = 5_000;
const CANCEL_LIMIT_MIN = 120; // отмена и перенос — не позже чем за 2 часа
const MAX_UPCOMING_PER_MASTER = 3; // защита от записи «на всё подряд»

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withMasterLock(masterId, fn) {
  const deadline = Date.now() + LOCK_WAIT_MS;
  let token;
  for (;;) {
    const now = new Date();
    // метка блокировки уникальна (время + случайные мс) — снимаем только свою
    token = new Date(now.getTime() + LOCK_MS + Math.floor(Math.random() * 1000));
    // eslint-disable-next-line no-await-in-loop
    const res = await Master.updateOne(
      { _id: masterId, $or: [{ bookingLockUntil: null }, { bookingLockUntil: { $lt: now } }] },
      { $set: { bookingLockUntil: token } },
    );
    if (res.modifiedCount === 1) break;
    if (Date.now() > deadline) throw new Error('Не удалось взять блокировку мастера');
    // eslint-disable-next-line no-await-in-loop
    await sleep(50 + Math.random() * 100);
  }
  try {
    return await fn();
  } finally {
    // если мы работали дольше LOCK_MS и блокировку уже взял другой — не трогаем её
    await Master.updateOne({ _id: masterId, bookingLockUntil: token }, { $set: { bookingLockUntil: null } });
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
  // Предоплата: при переносе уже внесена, иначе — по настройке мастера / неявкам
  const prepay = !rescheduleFrom && needsPrepayment(master, client);
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
      prepaymentAmount: previous ? previous.prepaymentAmount : prepay ? master.prepayment.amount : 0,
      paymentScreenshotFileId: previous ? previous.paymentScreenshotFileId : undefined,
      rescheduledFrom: previous ? previous._id : undefined,
      status: prepay ? 'pending_payment' : 'confirmed',
      paymentDeadline: prepay ? new Date(Date.now() + (master.prepayment.timeoutMin || 30) * 60_000) : undefined,
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
  return { ok: true, booking: updated, previousStatus: booking.status };
}

// --- Действия мастера ---

// Мастер записал клиента сам (звонок, личка). Сразу confirmed, клиента в боте нет.
// Клиент бота для ручной записи: явно выбранный мастером (из его базы) или
// найденный по телефону — только по подтверждённому номеру (кнопка «Отправить
// номер»), чтобы чужой человек, вписавший этот номер, не получил запись.
async function findBotClient(master, { clientId, phone }) {
  let client = null;
  if (clientId) client = await Client.findById(clientId);
  else if (phone) client = await Client.findOne({ phone, phoneVerified: true });
  if (!client || client.telegramId === master.telegramId) return null;
  return client;
}

// Мастер записал клиента сам. Если клиент есть в боте — запись сразу его
// (уведомление и напоминания), иначе — со ссылкой-подтверждением для клиента.
async function createManualBooking({ master, service, start, name, phone, clientId }) {
  const client = await findBotClient(master, { clientId, phone });
  return withMasterLock(master._id, async () => {
    if (!(await isSlotAvailable(master, service, start, { forMaster: true }))) return { ok: false, reason: 'slot_taken' };
    const startDate = new Date(start);
    const booking = await Booking.create({
      masterId: master._id,
      kind: 'booking',
      clientId: client?._id,
      manualName: name,
      manualPhone: phone || undefined,
      claimToken: client ? undefined : randomId(10),
      serviceId: service.id,
      serviceTitle: service.title,
      durationMin: service.durationMin,
      start: startDate,
      end: new Date(startDate.getTime() + service.durationMin * 60_000),
      price: service.price,
      status: 'confirmed',
    });
    return { ok: true, booking, client };
  });
}

// Ссылка-подтверждение для старой ручной записи, у которой её ещё нет
async function ensureClaimToken(booking) {
  if (booking.claimToken || booking.clientId) return booking.claimToken;
  const res = await Booking.findOneAndUpdate(
    { _id: booking._id, claimToken: null, clientId: null },
    { $set: { claimToken: randomId(10) } },
    { returnDocument: 'after' },
  );
  booking.claimToken = res?.claimToken || (await Booking.findById(booking._id, { claimToken: 1 }))?.claimToken;
  return booking.claimToken;
}

// Клиент открыл ссылку-подтверждение: запись становится его (атомарно, один раз).
// reason: not_found | inactive | taken | own (уже его)
async function claimBooking(token, client) {
  const booking = await Booking.findOneAndUpdate(
    { claimToken: token, clientId: null, status: 'confirmed', end: { $gt: new Date() } },
    { $set: { clientId: client._id } },
    { returnDocument: 'after' },
  );
  if (booking) return { ok: true, booking };
  const b = await Booking.findOne({ claimToken: token });
  if (!b) return { ok: false, reason: 'not_found' };
  if (b.clientId && String(b.clientId) === String(client._id)) return { ok: false, reason: 'own', booking: b };
  if (b.clientId) return { ok: false, reason: 'taken' };
  return { ok: false, reason: 'inactive' };
}

// Активные записи мастера, пересекающие [start, end)
function overlapping(masterId, start, end) {
  return Booking.find({
    masterId,
    status: { $in: Booking.ACTIVE_STATUSES },
    start: { $lt: end },
    end: { $gt: start },
  })
    .sort({ start: 1 })
    .populate('clientId', 'name phone');
}

// Мастер закрыл время. Если там уже есть записи — не закрываем, возвращаем их.
async function createBlock({ master, start, end }) {
  return withMasterLock(master._id, async () => {
    const conflicts = await overlapping(master._id, start, end);
    if (conflicts.length) return { ok: false, reason: 'conflict', conflicts };
    const booking = await Booking.create({
      masterId: master._id,
      kind: 'block',
      serviceId: 'block',
      start,
      end,
      durationMin: Math.round((end - start) / 60_000),
      status: 'confirmed',
    });
    return { ok: true, booking };
  });
}

// Мастер отменяет запись (или снимает закрытое время).
// Возвращает запись (уже отменённую) и её прежний статус — чтобы понять,
// была ли предоплата внесена.
async function cancelByMaster(bookingId, masterId) {
  const before = await Booking.findOneAndUpdate(
    { _id: bookingId, masterId, status: { $in: Booking.ACTIVE_STATUSES } },
    { $set: { status: 'cancelled_by_master' } },
    { returnDocument: 'before' },
  ).populate('clientId');
  if (!before) return null;
  const previousStatus = before.status;
  before.status = 'cancelled_by_master';
  before.previousStatus = previousStatus;
  return before;
}

// Мастер переносит запись на другое время. Та же запись, новое время;
// напоминания отправятся заново.
async function moveByMaster({ master, bookingId, start }) {
  return withMasterLock(master._id, async () => {
    const booking = await Booking.findOne({ _id: bookingId, masterId: master._id, kind: 'booking', status: 'confirmed' });
    if (!booking) return { ok: false, reason: 'not_found' };
    const service = { id: booking.serviceId, title: booking.serviceTitle, durationMin: booking.durationMin };
    const free = await isSlotAvailable(master, service, start, { excludeBookingId: booking._id, forMaster: true });
    if (!free) return { ok: false, reason: 'slot_taken' };
    const oldStart = booking.start;
    const startDate = new Date(start);
    booking.start = startDate;
    booking.end = new Date(startDate.getTime() + booking.durationMin * 60_000);
    booking.reminders = { dayBefore: false, twoHours: false, unconfirmedWarning: false, attendanceAsked: false };
    booking.clientConfirmed = false;
    await booking.save();
    await booking.populate('clientId');
    return { ok: true, booking, oldStart };
  });
}

module.exports = {
  createManualBooking,
  ensureClaimToken,
  claimBooking,
  createBlock,
  cancelByMaster,
  moveByMaster,
  createBooking,
  cancelByClient,
  needsPrepayment,
  canClientChange,
  withMasterLock,
  CANCEL_LIMIT_MIN,
  MAX_UPCOMING_PER_MASTER,
};
