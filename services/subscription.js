// Подписка мастера: проверка, продление, истечение, напоминания, оплата.
// Оплата подписки идёт на карту владельца сервиса (SUB_CARD) — это
// единственные деньги, которые проходят через сервис.
const { Master, SubscriptionPayment } = require('../models');
const { now: nowTz, local } = require('../utils/time');

const PERIOD_DAYS = 30;
const REMIND_DAYS = [3, 1];

// Принимает ли мастер новые записи. Проверяем и статус, и дату: крон,
// переводящий в expired, работает раз в день.
function canAcceptBookings(master, now = new Date()) {
  const { status, paidUntil } = master.subscription || {};
  if (status === 'expired') return false;
  return !paidUntil || new Date(paidUntil) > now;
}

// Новая дата окончания: +days от текущей даты окончания, если она в будущем,
// иначе от сегодня. Конец дня по Ташкенту.
function extendedUntil(paidUntil, days, now = new Date()) {
  const base = paidUntil && new Date(paidUntil) > now ? local(paidUntil) : local(now);
  return base.add(days, 'day').endOf('day').toDate();
}

async function extendSubscription(masterId, days = PERIOD_DAYS) {
  const master = await Master.findById(masterId);
  if (!master) return null;
  master.subscription.paidUntil = extendedUntil(master.subscription.paidUntil, days);
  master.subscription.status = 'active';
  master.subscription.lastReminder = '';
  await master.save();
  return master;
}

// Дней до конца подписки по календарю Ташкента (0 — сегодня последний день)
function daysLeft(paidUntil, now = new Date()) {
  if (!paidUntil) return 0;
  return local(paidUntil).startOf('day').diff(local(now).startOf('day'), 'day');
}

// Раз в день: у кого paidUntil прошёл — expired. Возвращает таких мастеров.
async function expireDue(now = new Date()) {
  const due = await Master.find({
    registered: true,
    'subscription.status': { $ne: 'expired' },
    'subscription.paidUntil': { $lt: now },
  });
  const expired = [];
  for (const m of due) {
    // eslint-disable-next-line no-await-in-loop
    const res = await Master.updateOne(
      { _id: m._id, 'subscription.status': { $ne: 'expired' }, 'subscription.paidUntil': { $lt: now } },
      { $set: { 'subscription.status': 'expired' } },
    );
    if (res.modifiedCount === 1) expired.push(m);
  }
  return expired;
}

// Мастера, которым пора напомнить: до конца 3 или 1 день. Флаг ставится атомарно.
async function dueSubscriptionReminders(now = new Date()) {
  const from = nowTz().startOf('day').toDate();
  const to = nowTz().startOf('day').add(Math.max(...REMIND_DAYS) + 1, 'day').toDate();
  const candidates = await Master.find({
    registered: true,
    'subscription.status': { $ne: 'expired' },
    'subscription.paidUntil': { $gte: from, $lt: to },
  });
  const result = [];
  for (const m of candidates) {
    const left = daysLeft(m.subscription.paidUntil, now);
    if (!REMIND_DAYS.includes(left)) continue;
    const key = `${local(m.subscription.paidUntil).format('YYYY-MM-DD')}:${left}`;
    // eslint-disable-next-line no-await-in-loop
    const res = await Master.updateOne(
      { _id: m._id, 'subscription.lastReminder': { $ne: key } },
      { $set: { 'subscription.lastReminder': key } },
    );
    if (res.modifiedCount === 1) result.push({ master: m, daysLeft: left });
  }
  return result;
}

// Мастер прислал скриншот. Если уже есть ожидающая оплата — обновляем её,
// чтобы у админа не копились дубли.
async function submitSubscriptionPayment(masterId, amount, fileId) {
  const existing = await SubscriptionPayment.findOneAndUpdate(
    { masterId, status: 'pending' },
    { $set: { screenshotFileId: fileId, amount, createdAt: new Date() } },
    { returnDocument: 'after' },
  );
  if (existing) return existing;
  return SubscriptionPayment.create({ masterId, amount, screenshotFileId: fileId });
}

// Решение админа: pending → approved (+30 дней) | rejected
async function reviewSubscriptionPayment(paymentId, approved) {
  const payment = await SubscriptionPayment.findOneAndUpdate(
    { _id: paymentId, status: 'pending' },
    { $set: { status: approved ? 'approved' : 'rejected' } },
    { returnDocument: 'after' },
  );
  if (!payment) return { payment: null, master: null };
  const master = approved ? await extendSubscription(payment.masterId) : await Master.findById(payment.masterId);
  const referrer = approved ? await require('./referral').rewardReferrer(master) : null;
  return { payment, master, referrer };
}

module.exports = {
  PERIOD_DAYS,
  canAcceptBookings,
  extendedUntil,
  extendSubscription,
  daysLeft,
  expireDue,
  dueSubscriptionReminders,
  submitSubscriptionPayment,
  reviewSubscriptionPayment,
};
