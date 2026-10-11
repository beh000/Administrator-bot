// Какие напоминания пора отправить. Каждое отправляется один раз: перед
// отправкой флаг в booking.reminders ставится атомарно (claim), поэтому даже
// при пересекающихся запусках крона дубля не будет.
const { Booking, Client } = require('../models');
const { local } = require('../utils/time');

const H = 3600_000;
const DAY_BEFORE_MS = 24 * H;
const TWO_HOURS_MS = 2 * H;
const UNCONFIRMED_MS = 3 * H;
const ATTENDANCE_AFTER_MS = 1 * H;
const ATTENDANCE_MAX_AGE_MS = 7 * 24 * H; // старые записи не дёргаем

// Поставить флаг, если он ещё не стоит. true — этот вызов «забрал» напоминание.
async function claim(bookingId, flags) {
  const filter = { _id: bookingId, status: 'confirmed' };
  const set = {};
  flags.forEach((f, i) => {
    if (i === 0) filter[`reminders.${f}`] = { $ne: true };
    set[`reminders.${f}`] = true;
  });
  const res = await Booking.updateOne(filter, { $set: set });
  return res.modifiedCount === 1;
}

const populate = (q) => q.populate('clientId').populate('masterId');

// Напоминания клиентам: за 24 часа и за 2 часа.
// Если до записи уже меньше 2 часов — только второе (первое помечается отправленным).
async function dueClientReminders(now = new Date()) {
  const t = now.getTime();
  const dayBefore = await populate(
    Booking.find({
      status: 'confirmed',
      start: { $gt: new Date(t + TWO_HOURS_MS), $lte: new Date(t + DAY_BEFORE_MS) },
      'reminders.dayBefore': { $ne: true },
      clientId: { $ne: null },
    }),
  );
  const twoHours = await populate(
    Booking.find({
      status: 'confirmed',
      start: { $gt: now, $lte: new Date(t + TWO_HOURS_MS) },
      'reminders.twoHours': { $ne: true },
      clientId: { $ne: null },
    }),
  );
  return { dayBefore, twoHours };
}

// Предупреждение мастеру: за 3 часа клиент так и не нажал «Приду».
// Только если запись существовала до этой отметки — иначе клиент не успел бы ответить.
async function dueUnconfirmedWarnings(now = new Date()) {
  const t = now.getTime();
  // Записи до 11:00 утра: за 3 часа — это ночь, поэтому вечером (с 20:00)
  // предупреждаем заранее по всем утренним записям на завтра
  const localNow = local(now);
  const morningEdge = localNow.add(1, 'day').startOf('day').add(11, 'hour');
  const windowEnd = localNow.hour() >= 20 ? Math.max(t + UNCONFIRMED_MS, morningEdge.valueOf()) : t + UNCONFIRMED_MS;
  const list = await populate(
    Booking.find({
      status: 'confirmed',
      clientConfirmed: { $ne: true },
      clientId: { $ne: null },
      start: { $gt: now, $lte: new Date(windowEnd) },
      'reminders.unconfirmedWarning': { $ne: true },
    }),
  );
  return list.filter((b) => b.createdAt.getTime() <= b.start.getTime() - UNCONFIRMED_MS);
}

// Вопрос мастеру «Клиент пришёл?» через час после окончания записи
async function dueAttendanceQuestions(now = new Date()) {
  const t = now.getTime();
  return populate(
    Booking.find({
      status: 'confirmed',
      end: { $lte: new Date(t - ATTENDANCE_AFTER_MS), $gt: new Date(t - ATTENDANCE_MAX_AGE_MS) },
      'reminders.attendanceAsked': { $ne: true },
      kind: { $ne: 'block' },
    }),
  );
}

// Клиент нажал «Приду»
async function confirmAttendanceByClient(bookingId, clientId) {
  const res = await Booking.updateOne(
    { _id: bookingId, clientId, status: 'confirmed' },
    { $set: { clientConfirmed: true } },
  );
  return res.matchedCount === 1;
}

// Мастер ответил «пришёл» / «не пришёл». Возвращает запись и новое число неявок.
async function markAttendance(bookingId, masterId, came) {
  const booking = await Booking.findOneAndUpdate(
    { _id: bookingId, masterId, status: 'confirmed' },
    { $set: { status: came ? 'completed' : 'no_show' } },
    { returnDocument: 'after' },
  );
  // у ручной записи клиента в боте нет — неявку не к кому привязать
  if (!booking || came || !booking.clientId) return { booking, noShows: null };
  const key = `noShowCount.${String(masterId)}`;
  const client = await Client.findOneAndUpdate({ _id: booking.clientId }, { $inc: { [key]: 1 } }, { returnDocument: 'after' });
  return { booking, noShows: client?.noShowCount?.get(String(masterId)) || 0, client };
}

// «Пора снова?»: визит состоялся rebookDays дней назад (окно — неделя, чтобы не
// слать по очень старым), клиент из бота, после этого визита к мастеру не
// записывался и не приходил. Флаг ставится атомарно.
async function dueRebookReminders(now = new Date()) {
  const { Master } = require('../models');
  const masters = await Master.find({ registered: true, rebookDays: { $gt: 0 }, 'subscription.status': { $ne: 'expired' } });
  const result = [];
  for (const master of masters) {
    const cutoff = now.getTime() - master.rebookDays * 864e5;
    // eslint-disable-next-line no-await-in-loop
    const visits = await Booking.find({
      masterId: master._id,
      kind: { $ne: 'block' },
      status: 'completed',
      clientId: { $ne: null },
      end: { $lte: new Date(cutoff), $gt: new Date(cutoff - 7 * 864e5) },
      'reminders.rebook': { $ne: true },
    }).populate('clientId');
    for (const visit of visits) {
      // eslint-disable-next-line no-await-in-loop
      const later = await Booking.exists({
        masterId: master._id,
        clientId: visit.clientId._id,
        _id: { $ne: visit._id },
        start: { $gt: visit.start },
        status: { $in: [...Booking.ACTIVE_STATUSES, 'completed'] },
      });
      // eslint-disable-next-line no-await-in-loop
      const res = await Booking.updateOne({ _id: visit._id, 'reminders.rebook': { $ne: true } }, { $set: { 'reminders.rebook': true } });
      if (!later && res.modifiedCount === 1) result.push({ master, visit });
    }
  }
  return result;
}

module.exports = {
  dueRebookReminders,
  claim,
  dueClientReminders,
  dueUnconfirmedWarnings,
  dueAttendanceQuestions,
  confirmAttendanceByClient,
  markAttendance,
};
