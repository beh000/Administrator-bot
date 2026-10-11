// Статистика мастера за месяц: визиты, выручка, неявки, клиенты.
// Объёмы у частного мастера небольшие — считаем в JS по выборке месяца.
const { Booking } = require('../models');
const { atLocal } = require('../utils/time');

// Ключ клиента: id из бота или телефон/имя ручной записи
function clientKey(b) {
  if (b.clientId) return `c:${b.clientId}`;
  return `m:${b.manualPhone || (b.manualName || '').toLowerCase()}`;
}

function monthRange(year, month) {
  const from = atLocal(`${year}-${String(month).padStart(2, '0')}-01`);
  return [from.toDate(), from.add(1, 'month').toDate()];
}

async function monthStats(masterId, year, month, now = new Date()) {
  const [from, to] = monthRange(year, month);
  const bookings = await Booking.find(
    { masterId, kind: { $ne: 'block' }, start: { $gte: from, $lt: to } },
    { clientId: 1, manualName: 1, manualPhone: 1, status: 1, price: 1, start: 1 },
  ).lean();

  const s = {
    visits: 0,
    revenue: 0,
    upcoming: 0,
    upcomingRevenue: 0,
    noShows: 0,
    cancelled: 0,
    viaBot: 0,
    clients: 0,
    newClients: 0,
    returning: 0,
    avgCheck: 0,
    noShowRate: 0,
  };
  const visitedKeys = new Set();
  for (const b of bookings) {
    if (b.clientId) s.viaBot += 1;
    if (b.status === 'completed') {
      s.visits += 1;
      s.revenue += b.price || 0;
      visitedKeys.add(clientKey(b));
    } else if (b.status === 'confirmed' && b.start >= now) {
      s.upcoming += 1;
      s.upcomingRevenue += b.price || 0;
    } else if (b.status === 'no_show') {
      s.noShows += 1;
    } else if (b.status === 'cancelled_by_client' || b.status === 'cancelled_by_master') {
      s.cancelled += 1;
    }
  }
  s.clients = visitedKeys.size;
  s.avgCheck = s.visits ? Math.round(s.revenue / s.visits) : 0;
  s.noShowRate = s.visits + s.noShows ? Math.round((s.noShows / (s.visits + s.noShows)) * 100) : 0;

  // Новые — у кого до этого месяца не было ни одного состоявшегося визита
  if (visitedKeys.size) {
    const earlier = await Booking.find(
      { masterId, kind: { $ne: 'block' }, status: 'completed', start: { $lt: from } },
      { clientId: 1, manualName: 1, manualPhone: 1 },
    ).lean();
    const seen = new Set(earlier.map(clientKey));
    visitedKeys.forEach((k) => {
      if (seen.has(k)) s.returning += 1;
      else s.newClients += 1;
    });
  }
  return s;
}

// Изменение в процентах: +12 / -5 / null (не с чем сравнивать)
function delta(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

module.exports = { monthStats, monthRange, delta, clientKey };
