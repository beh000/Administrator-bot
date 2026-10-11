// База клиентов мастера: собирается из его записей (клиенты бота и ручные).
const crypto = require('crypto');
const { Booking } = require('../models');

// Короткий ключ клиента для кнопок: c<id> — клиент бота, m<хеш> — ручной
function keyOf(b) {
  if (b.clientId) return `c${b.clientId._id || b.clientId}`;
  const raw = (b.manualPhone || (b.manualName || '').toLowerCase()).trim();
  return `m${crypto.createHash('sha1').update(raw).digest('hex').slice(0, 10)}`;
}

async function masterClients(masterId) {
  const bookings = await Booking.find(
    { masterId, kind: { $ne: 'block' } },
    { clientId: 1, manualName: 1, manualPhone: 1, status: 1, price: 1, start: 1, serviceTitle: 1 },
  )
    .sort({ start: 1 })
    .populate('clientId', 'name phone telegramId')
    .lean();

  const now = Date.now();
  const map = new Map();
  for (const b of bookings) {
    const key = keyOf(b);
    if (!map.has(key)) {
      map.set(key, {
        key,
        name: b.clientId?.name || b.manualName || '—',
        phone: b.clientId?.phone || b.manualPhone || '',
        telegramId: b.clientId?.telegramId || null,
        visits: 0,
        spent: 0,
        noShows: 0,
        lastVisit: null,
        nextVisit: null,
        history: [],
      });
    }
    const c = map.get(key);
    c.history.push(b);
    if (b.status === 'completed') {
      c.visits += 1;
      c.spent += b.price || 0;
      c.lastVisit = b.start;
    } else if (b.status === 'no_show') {
      c.noShows += 1;
    } else if (b.status === 'confirmed' && new Date(b.start).getTime() > now && !c.nextVisit) {
      c.nextVisit = b.start;
    }
  }
  // сначала те, кто был недавно; без визитов — в конце
  return [...map.values()].sort((a, b) => (b.lastVisit || 0) - (a.lastVisit || 0) || b.history.length - a.history.length);
}

module.exports = { masterClients, keyOf };
