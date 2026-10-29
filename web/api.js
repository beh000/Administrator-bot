// API мини-приложения мастера. Каждый запрос — от имени мастера, которого
// Telegram подтвердил подписью initData; все выборки ограничены его masterId.
const { Master, Booking } = require('../models');
const { t } = require('../locales');
const { now: nowTz, local, atLocal, weekdayKey, hhmmToMin } = require('../utils/time');
const { parseName, parsePhone, parseTime } = require('../utils/validate');
const { masterLink } = require('../utils/ids');
const { availableDates, freeSlots } = require('../services/slots');
const {
  createManualBooking,
  createBlock,
  cancelByMaster,
  moveByMaster,
  ensureClaimToken,
} = require('../services/booking');
const { markAttendance } = require('../services/reminders');
const { masterClients } = require('../services/clients');
const { monthStats, delta } = require('../services/stats');
const { notifyBooked, notifyCancelled, notifyMoved } = require('../bot/master/clientNotify');
const { fmtDay, fmtTime } = require('../bot/ui');

class ApiError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}
const fail = (status, code) => {
  throw new ApiError(status, code);
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[0-9a-f]{24}$/;
const HIDDEN = ['cancelled_by_client', 'cancelled_by_master', 'expired'];

// 'YYYY-MM-DD' и такая дата существует (dayjs молча превращает 30.02 в 02.03)
function checkDate(s) {
  if (!DATE_RE.test(String(s || '')) || atLocal(s).format('YYYY-MM-DD') !== s) fail(400, 'bad_date');
  return s;
}

function clientOf(b) {
  const c = b.clientId && typeof b.clientId === 'object' && b.clientId.telegramId ? b.clientId : null;
  return {
    name: c?.name || b.manualName || '',
    phone: c?.phone || b.manualPhone || '',
    telegramId: c?.telegramId || null,
    inBot: Boolean(b.clientId),
  };
}

function bookingDto(b, now = new Date()) {
  const active = Booking.ACTIVE_STATUSES.includes(b.status);
  const future = new Date(b.end) > now;
  const isBooking = b.kind !== 'block';
  return {
    id: String(b._id),
    kind: b.kind || 'booking',
    start: b.start,
    end: b.end,
    service: b.serviceTitle || '',
    price: b.price || 0,
    prepaid: b.prepaymentAmount > 0 && ['payment_review', 'confirmed'].includes(b.status) ? b.prepaymentAmount : 0,
    status: b.status,
    client: isBooking ? clientOf(b) : null,
    canMove: isBooking && b.status === 'confirmed' && future,
    canCancel: active && future,
    canMark: isBooking && b.status === 'confirmed' && new Date(b.start) <= now,
    canInvite: isBooking && !b.clientId && active && future,
    canReviewPayment: b.status === 'payment_review' && Boolean(b.paymentScreenshotFileId),
  };
}

async function ownBooking(master, id) {
  if (!ID_RE.test(String(id))) fail(404, 'not_found');
  const b = await Booking.findOne({ _id: id, masterId: master._id }).populate('clientId', 'name phone telegramId language');
  if (!b) fail(404, 'not_found');
  return b;
}

// Услуга для выбора времени: новая запись — по serviceId, перенос — из самой записи
async function serviceFor(master, query) {
  if (query.bookingId) {
    const b = await ownBooking(master, query.bookingId);
    return { service: { id: b.serviceId, title: b.serviceTitle, durationMin: b.durationMin, price: b.price }, exclude: b._id };
  }
  const s = master.activeServices().find((x) => x.id === query.serviceId);
  if (!s) fail(400, 'bad_service');
  return { service: s, exclude: undefined };
}

function isWorking(master, dateKey) {
  if ((master.daysOff || []).includes(dateKey)) return false;
  const day = master.schedule?.[weekdayKey(atLocal(dateKey))];
  return Boolean(day?.working);
}

async function inviteFor(master, b, botUsername) {
  const token = await ensureClaimToken(b);
  const link = `https://t.me/${botUsername}?start=b_${token}`;
  const lang = master.language || 'ru';
  const text = t(lang, 'mb.inviteText', {
    master: master.name,
    service: b.serviceTitle,
    date: fmtDay((k, p) => t(lang, k, p), b.start),
    time: fmtTime(b.start),
    link,
  });
  return { link, text, shareUrl: `https://t.me/share/url?url=${encodeURIComponent(text)}` };
}

// --- Обработчики. ctx: { master, query, body, params, api, botUsername } ---

const routes = [];
const route = (method, pattern, handler) => routes.push({ method, pattern, handler });

route('GET', /^\/api\/me$/, async ({ master, botUsername }) => ({
  name: master.name,
  lang: master.language || 'ru',
  link: masterLink(botUsername, master.slug),
  services: master.activeServices().map((s) => ({ id: s.id, title: s.title, durationMin: s.durationMin, price: s.price })),
  subscription: { status: master.subscription?.status, paidUntil: master.subscription?.paidUntil },
  rating: master.rating?.count ? { avg: Math.round((master.rating.sum / master.rating.count) * 10) / 10, count: master.rating.count } : null,
  today: nowTz().format('YYYY-MM-DD'),
}));

// Календарь: дни с числом записей и рабочий ли день
route('GET', /^\/api\/calendar$/, async ({ master, query }) => {
  const from = checkDate(query.from || nowTz().format('YYYY-MM-DD'));
  const days = Math.min(Math.max(Number(query.days) || 14, 1), 62);
  const start = atLocal(from);
  const bookings = await Booking.find(
    { masterId: master._id, kind: { $ne: 'block' }, status: { $nin: HIDDEN }, start: { $gte: start.toDate(), $lt: start.add(days, 'day').toDate() } },
    { start: 1 },
  ).lean();
  const counts = {};
  bookings.forEach((b) => {
    const k = local(b.start).format('YYYY-MM-DD');
    counts[k] = (counts[k] || 0) + 1;
  });
  return Array.from({ length: days }, (_, i) => {
    const date = start.add(i, 'day').format('YYYY-MM-DD');
    return { date, working: isWorking(master, date), count: counts[date] || 0 };
  });
});

// Записи и закрытое время за день
route('GET', /^\/api\/day$/, async ({ master, query }) => {
  const date = checkDate(query.date);
  const from = atLocal(date);
  const list = await Booking.find({
    masterId: master._id,
    status: { $nin: HIDDEN },
    start: { $gte: from.toDate(), $lt: from.add(1, 'day').toDate() },
  })
    .sort({ start: 1 })
    .populate('clientId', 'name phone telegramId');
  const day = master.schedule?.[weekdayKey(from)];
  return {
    date,
    working: isWorking(master, date),
    hours: day?.working ? { start: day.start, end: day.end } : null,
    items: list.map((b) => bookingDto(b)),
  };
});

route('GET', /^\/api\/dates$/, async ({ master, query }) => {
  const { service, exclude } = await serviceFor(master, query);
  return availableDates(master, service, { forMaster: true, excludeBookingId: exclude });
});

route('GET', /^\/api\/slots$/, async ({ master, query }) => {
  const date = checkDate(query.date);
  const { service, exclude } = await serviceFor(master, query);
  const slots = await freeSlots(master, service, date, { forMaster: true, excludeBookingId: exclude });
  return slots.map((s) => s.start);
});

// Новая запись: клиент из базы (clientKey c<id>), по телефону или новый
route('POST', /^\/api\/bookings$/, async ({ master, body, api, botUsername }) => {
  const service = master.activeServices().find((s) => s.id === body.serviceId);
  if (!service) fail(400, 'bad_service');
  const start = new Date(body.start);
  if (Number.isNaN(start.getTime())) fail(400, 'bad_time');
  const name = parseName(body.name, 48);
  if (!name) fail(400, 'bad_name');
  let phone = null;
  if (body.phone) {
    phone = parsePhone(body.phone);
    if (!phone) fail(400, 'bad_phone');
  }
  let clientId = null;
  if (typeof body.clientKey === 'string' && /^c[0-9a-f]{24}$/.test(body.clientKey)) {
    // только клиент, который уже записывался к этому мастеру
    const id = body.clientKey.slice(1);
    if (await Booking.exists({ masterId: master._id, clientId: id })) clientId = id;
  }
  const result = await createManualBooking({ master, service, start, name, phone, clientId });
  if (!result.ok) fail(409, 'slot_taken');
  const b = result.booking;
  if (result.client) {
    await notifyBooked(api, master, result.client, b);
    return { booking: bookingDto(b), linked: true };
  }
  return { booking: bookingDto(b), linked: false, invite: await inviteFor(master, b, botUsername) };
});

route('POST', /^\/api\/bookings\/([0-9a-f]{24})\/cancel$/, async ({ master, params, api }) => {
  const b = await cancelByMaster(params[0], master._id);
  if (!b) fail(409, 'already_handled');
  await notifyCancelled(api, master, b);
  return { ok: true };
});

route('POST', /^\/api\/bookings\/([0-9a-f]{24})\/move$/, async ({ master, params, body, api }) => {
  const start = new Date(body.start);
  if (Number.isNaN(start.getTime())) fail(400, 'bad_time');
  const result = await moveByMaster({ master, bookingId: params[0], start });
  if (!result.ok) fail(409, result.reason === 'slot_taken' ? 'slot_taken' : 'already_handled');
  await notifyMoved(api, master, result.booking, result.oldStart);
  return { booking: bookingDto(result.booking) };
});

// «Пришёл / не пришёл» — то же, что кнопки в боте
route('POST', /^\/api\/bookings\/([0-9a-f]{24})\/attendance$/, async ({ master, params, body, api }) => {
  const came = body.came === true;
  const { booking, noShows } = await markAttendance(params[0], master._id, came);
  if (!booking) fail(409, 'already_handled');
  if (came && booking.clientId) {
    await booking.populate('clientId');
    await require('../bot/reviews').askForReview(api, booking, master);
  }
  const pp = master.prepayment || {};
  const suggestPrepay = !came && noShows >= 2 && !pp.enabled && Boolean(pp.cardNumber) && pp.amount > 0;
  return { ok: true, noShows, suggestPrepay };
});

route('GET', /^\/api\/bookings\/([0-9a-f]{24})\/invite$/, async ({ master, params, botUsername }) => {
  const b = await ownBooking(master, params[0]);
  if (b.kind === 'block' || b.clientId) fail(409, 'already_linked');
  return inviteFor(master, b, botUsername);
});

// Закрыть время: { date, from: 'HH:MM', to: 'HH:MM' }
route('POST', /^\/api\/blocks$/, async ({ master, body }) => {
  const date = checkDate(body.date);
  const from = parseTime(body.from);
  const to = parseTime(body.to);
  if (!from || !to || hhmmToMin(from) >= hhmmToMin(to)) fail(400, 'bad_range');
  const start = atLocal(date, hhmmToMin(from)).toDate();
  const end = atLocal(date, hhmmToMin(to)).toDate();
  if (end <= new Date()) fail(400, 'past');
  const result = await createBlock({ master, start, end });
  if (!result.ok) {
    return { ok: false, conflicts: result.conflicts.map((b) => bookingDto(b)) };
  }
  return { ok: true, booking: bookingDto(result.booking) };
});

route('GET', /^\/api\/clients$/, async ({ master }) => {
  const list = await masterClients(master._id);
  return list.map((c) => ({
    key: c.key,
    name: c.name,
    phone: c.phone,
    telegramId: c.telegramId,
    visits: c.visits,
    spent: c.spent,
    noShows: c.noShows,
    lastVisit: c.lastVisit,
    nextVisit: c.nextVisit,
  }));
});

route('GET', /^\/api\/clients\/([cm][0-9a-f]+)$/, async ({ master, params }) => {
  const c = (await masterClients(master._id)).find((x) => x.key === params[0]);
  if (!c) fail(404, 'not_found');
  return {
    key: c.key,
    name: c.name,
    phone: c.phone,
    telegramId: c.telegramId,
    visits: c.visits,
    spent: c.spent,
    noShows: c.noShows,
    lastVisit: c.lastVisit,
    nextVisit: c.nextVisit,
    history: c.history
      .slice(-30)
      .reverse()
      .map((b) => ({ id: String(b._id), start: b.start, service: b.serviceTitle, price: b.price, status: b.status })),
  };
});

// Статистика за месяц: ?month=YYYY-MM (по умолчанию текущий)
route('GET', /^\/api\/stats$/, async ({ master, query }) => {
  const m = /^(\d{4})-(\d{2})$/.exec(query.month || '') || [null, nowTz().year(), nowTz().month() + 1];
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) fail(400, 'bad_month');
  const prevMonth = atLocal(`${year}-${String(month).padStart(2, '0')}-01`).subtract(1, 'month');
  const [cur, prev] = await Promise.all([
    monthStats(master._id, year, month),
    monthStats(master._id, prevMonth.year(), prevMonth.month() + 1),
  ]);
  return {
    year,
    month,
    cur,
    prev,
    delta: { revenue: delta(cur.revenue, prev.revenue), visits: delta(cur.visits, prev.visits) },
  };
});

require('./settings')(route, fail);
require('./extras')(route, fail);

// Найти мастера по пользователю Telegram и выполнить маршрут
async function handle({ method, path, query, body, tgUser, api, botUsername }) {
  const r = routes.find((x) => x.method === method && x.pattern.test(path));
  if (!r) fail(404, 'not_found');
  const master = await Master.findOne({ telegramId: tgUser.id, registered: true });
  if (!master) fail(403, 'not_master');
  const params = r.pattern.exec(path).slice(1);
  return r.handler({ master, query, body: body || {}, params, api, botUsername });
}

module.exports = { handle, ApiError, bookingDto };
