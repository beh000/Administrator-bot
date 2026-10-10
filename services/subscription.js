// Подписка мастера. Оплата и продление — этап 6.

// Принимает ли мастер новые записи. Проверяем и статус, и дату: крон,
// переводящий в expired, работает раз в день.
function canAcceptBookings(master, now = new Date()) {
  const { status, paidUntil } = master.subscription || {};
  if (status === 'expired') return false;
  return !paidUntil || new Date(paidUntil) > now;
}

module.exports = { canAcceptBookings };
