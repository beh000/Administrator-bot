// API мини-приложения клиента (/api/c/*): страница мастера, запись, перенос,
// отмена, предоплата со скриншотом, «Мои записи», «Мои мастера».
// Правила те же, что в боте: createBooking / cancelByClient / submitScreenshot.
const { Master, Booking, Client } = require('../models');
const { LANGS } = require('../locales');
const { now: nowTz, atLocal } = require('../utils/time');
const { parseName, parsePhone } = require('../utils/validate');
const { availableDates, freeSlots } = require('../services/slots');
const { createBooking, cancelByClient, canClientChange, needsPrepayment } = require('../services/booking');
const { canAcceptBookings } = require('../services/subscription');
const { submitScreenshot } = require('../services/payments');
const { notifyMasterBooked, notifyMasterCancelled, sendScreenshotToMaster } = require('../bot/client/masterNotify');
const { sendMasterLocation } = require('../bot/location');
const { verifyContact } = require('./auth');
const { uploadImage, downloadImage } = require('./extras');

const SLUG_RE = /^[a-z0-9]{3,32}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[0-9a-f]{24}$/;
const MIN_REVIEWS_TO_SHOW = 3;

// Профиль клиента: создаём при первом входе (если человек ещё не нажимал /start)
async function ensureClient(tgUser) {
  let client = await Client.findOne({ telegramId: tgUser.id });
  if (!client) {
    const lang = String(tgUser.language_code || '').startsWith('uz') ? 'uz' : 'ru';
    try {
      client = await Client.create({ telegramId: tgUser.id, language: lang });
    } catch (err) {
      if (err.code !== 11000) throw err; // одновременно создали в боте
      client = await Client.findOne({ telegramId: tgUser.id });
    }
  } else if (!client.language) {
    // язык ещё не выбран в боте — берём язык Telegram, чтобы бот потом не спрашивал
    client.language = String(tgUser.language_code || '').startsWith('uz') ? 'uz' : 'ru';
    await client.save();
  }
  return client;
}

const geoOf = (m) => (Number.isFinite(m.location?.lat) && Number.isFinite(m.location?.lng) ? { lat: m.location.lat, lng: m.location.lng } : null);

function masterCard(m) {
  return { slug: m.slug, name: m.name, phone: m.phone, address: m.location?.address || '', geo: geoOf(m) };
}

function profileDto(client) {
  return { name: client.name || '', phone: client.phone || '', lang: client.language || 'ru', ready: Boolean(client.name && client.phone) };
}

function bookingDto(b, master) {
  const active = Booking.ACTIVE_STATUSES.includes(b.status) && new Date(b.end) > new Date();
  const changeable = active && canClientChange(b);
  const awaitingPayment = b.status === 'pending_payment' && b.paymentDeadline > new Date();
  return {
    id: String(b._id),
    master: master ? masterCard(master) : null,
    service: b.serviceTitle,
    start: b.start,
    end: b.end,
    price: b.price,
    status: b.status,
    prepaid: b.prepaymentAmount > 0 && ['payment_review', 'confirmed'].includes(b.status) ? b.prepaymentAmount : 0,
    active,
    canCancel: changeable,
    canReschedule: changeable && b.status === 'confirmed',
    tooLate: active && !changeable,
    awaitingPayment,
    canSendScreenshot: awaitingPayment || b.status === 'payment_review',
    payment:
      (awaitingPayment || b.status === 'payment_review') && master
        ? { amount: b.prepaymentAmount, card: master.prepayment?.cardNumber || '', holder: master.prepayment?.cardHolder || '', deadline: b.paymentDeadline }
        : null,
  };
}

function registerClient(route, fail) {
  async function masterBySlug(slug) {
    if (!SLUG_RE.test(String(slug))) fail(404, 'master_not_found');
    const m = await Master.findOne({ slug, registered: true });
    if (!m) fail(404, 'master_not_found');
    return m;
  }

  async function ownBooking(client, id) {
    if (!ID_RE.test(String(id))) fail(404, 'not_found');
    const b = await Booking.findOne({ _id: id, clientId: client._id });
    if (!b) fail(404, 'not_found');
    return b;
  }

  // Услуга для выбора времени: новая запись — активная услуга, перенос — услуга записи
  async function serviceFor(client, master, query) {
    if (query.reschedule) {
      const b = await ownBooking(client, query.reschedule);
      if (String(b.masterId) !== String(master._id)) fail(404, 'not_found');
      const s = master.services.find((x) => x.id === b.serviceId) || { id: b.serviceId, title: b.serviceTitle, durationMin: b.durationMin, price: b.price };
      return { service: s, exclude: b._id };
    }
    const s = master.activeServices().find((x) => x.id === query.serviceId);
    if (!s) fail(400, 'bad_service');
    return { service: s, exclude: undefined };
  }

  // Мастер ли это (без ошибки 403 — приложение выбирает режим при запуске)
  route('GET', /^\/api\/c\/role$/, async ({ tgUser }) => ({
    master: Boolean(await Master.exists({ telegramId: tgUser.id, registered: true })),
  }));

  // --- Профиль клиента ---
  route('GET', /^\/api\/c\/me$/, async ({ client }) => {
    const ids = await Booking.distinct('masterId', { clientId: client._id, kind: { $ne: 'block' } });
    const masters = ids.length ? await Master.find({ _id: { $in: ids }, registered: true }).limit(20) : [];
    return {
      ...profileDto(client),
      today: nowTz().format('YYYY-MM-DD'),
      masters: masters.map((m) => ({ slug: m.slug, name: m.name, photos: (m.photos || []).length, about: m.about || '' })),
    };
  });

  route('POST', /^\/api\/c\/profile$/, async ({ client, body }) => {
    if (body.name !== undefined) {
      const name = parseName(body.name, 48);
      if (!name) fail(400, 'bad_name');
      client.name = name;
    }
    if (body.phone !== undefined) {
      const phone = parsePhone(body.phone);
      if (!phone) fail(400, 'bad_phone');
      // набранный вручную номер не подтверждён
      if (phone !== client.phone) client.phoneVerified = false;
      client.phone = phone;
    }
    if (body.lang !== undefined) {
      if (!LANGS.includes(body.lang)) fail(400, 'bad_value');
      client.language = body.lang;
    }
    await client.save();
    return profileDto(client);
  });

  // Номер из WebApp.requestContact: подпись Telegram — значит, номер свой
  route('POST', /^\/api\/c\/contact$/, async ({ client, body, tgUser, api }) => {
    const contact = verifyContact(String(body.response || ''), api.token, tgUser.id);
    const phone = contact && parsePhone(contact.phone_number);
    if (!phone) fail(400, 'bad_phone');
    client.phone = phone;
    client.phoneVerified = true;
    if (!client.name && contact.first_name) client.name = parseName(contact.first_name, 48) || client.name;
    await client.save();
    return profileDto(client);
  });

  // --- Страница мастера ---
  route('GET', /^\/api\/c\/m\/([a-z0-9]+)$/, async ({ client, params }) => {
    const m = await masterBySlug(params[0]);
    const { sum = 0, count = 0 } = m.rating || {};
    const prepay = needsPrepayment(m, client);
    return {
      ...masterCard(m),
      about: m.about || '',
      photos: (m.photos || []).length,
      rating: count >= MIN_REVIEWS_TO_SHOW ? { avg: Math.round((sum / count) * 10) / 10, count } : null,
      available: canAcceptBookings(m),
      services: m.activeServices().map((s) => ({ id: s.id, title: s.title, durationMin: s.durationMin, price: s.price })),
      prepay: prepay ? { amount: m.prepayment.amount, minutes: m.prepayment.timeoutMin || 30 } : null,
    };
  });

  // «Позвонить мастеру»: номер мастера контактом в чат с ботом
  route('POST', /^\/api\/c\/m\/([a-z0-9]+)\/contact$/, async ({ client, params, api }) => {
    const m = await masterBySlug(params[0]);
    if (!m.phone) fail(404, 'not_found');
    await api.sendContact(client.telegramId, m.phone, m.name || m.phone);
    return { ok: true };
  });

  route('GET', /^\/api\/c\/m\/([a-z0-9]+)\/photos\/([0-5])$/, async ({ params, api }) => {
    const m = await masterBySlug(params[0]);
    const fileId = m.photos[Number(params[1])];
    if (!fileId) fail(404, 'not_found');
    return downloadImage(api, fileId);
  });

  route('GET', /^\/api\/c\/m\/([a-z0-9]+)\/dates$/, async ({ client, params, query }) => {
    const m = await masterBySlug(params[0]);
    const { service, exclude } = await serviceFor(client, m, query);
    return availableDates(m, service, { excludeBookingId: exclude });
  });

  route('GET', /^\/api\/c\/m\/([a-z0-9]+)\/slots$/, async ({ client, params, query }) => {
    const m = await masterBySlug(params[0]);
    const date = String(query.date || '');
    if (!DATE_RE.test(date) || atLocal(date).format('YYYY-MM-DD') !== date) fail(400, 'bad_date');
    const { service, exclude } = await serviceFor(client, m, query);
    const slots = await freeSlots(m, service, date, { excludeBookingId: exclude });
    return slots.map((s) => s.start);
  });

  // --- Запись и перенос ---
  route('POST', /^\/api\/c\/bookings$/, async ({ client, body, api }) => {
    if (!client.name || !client.phone) fail(400, 'need_profile');
    const m = await masterBySlug(body.slug);
    const reschedule = body.rescheduleFrom ? String(body.rescheduleFrom) : null;
    if (reschedule && !ID_RE.test(reschedule)) fail(404, 'not_found');
    if (!reschedule && !canAcceptBookings(m)) fail(409, 'unavailable');
    const { service } = await serviceFor(client, m, reschedule ? { reschedule } : { serviceId: body.serviceId });
    const start = new Date(body.start);
    if (Number.isNaN(start.getTime())) fail(400, 'bad_time');
    const result = await createBooking({ master: m, client, service, start, rescheduleFrom: reschedule });
    if (!result.ok) fail(409, result.reason); // slot_taken | too_many | not_changeable
    const { booking, previous } = result;
    // с предоплатой мастер узнает о записи вместе со скриншотом
    if (booking.status !== 'pending_payment') {
      await notifyMasterBooked(api, m, client, booking, previous);
      await sendMasterLocation(api, client.telegramId, m);
    }
    return { booking: bookingDto(booking, m), rescheduled: Boolean(previous) };
  });

  route('GET', /^\/api\/c\/bookings$/, async ({ client }) => {
    const list = await Booking.find({ clientId: client._id, status: { $in: Booking.ACTIVE_STATUSES }, end: { $gt: new Date() } })
      .sort({ start: 1 })
      .limit(30)
      .populate('masterId');
    const past = await Booking.find({ clientId: client._id, status: 'completed' }).sort({ start: -1 }).limit(10).populate('masterId');
    return {
      upcoming: list.map((b) => bookingDto(b, b.masterId)),
      past: past.map((b) => ({ id: String(b._id), service: b.serviceTitle, start: b.start, master: b.masterId ? { slug: b.masterId.slug, name: b.masterId.name } : null })),
    };
  });

  route('GET', /^\/api\/c\/bookings\/([0-9a-f]{24})$/, async ({ client, params }) => {
    const b = await ownBooking(client, params[0]);
    const m = await Master.findById(b.masterId);
    return bookingDto(b, m);
  });

  route('POST', /^\/api\/c\/bookings\/([0-9a-f]{24})\/cancel$/, async ({ client, params, api }) => {
    const result = await cancelByClient(params[0], client);
    if (!result.ok) fail(409, result.reason === 'too_late' ? 'too_late' : 'already_handled');
    const b = result.booking;
    const m = await Master.findById(b.masterId);
    // о неоплаченной записи мастер ещё не знал — не беспокоим
    if (m && result.previousStatus !== 'pending_payment') await notifyMasterCancelled(api, m, client, b);
    const paid = b.prepaymentAmount > 0 && result.previousStatus !== 'pending_payment';
    return { ok: true, prepaid: paid, masterPhone: m?.phone || '' };
  });

  // Скриншот предоплаты: картинка с телефона → мастеру на проверку
  route('POST', /^\/api\/c\/bookings\/([0-9a-f]{24})\/screenshot$/, async ({ client, params, body, api }) => {
    if (!body.file?.buffer?.length) fail(400, 'need_image');
    const b = await ownBooking(client, params[0]);
    const awaiting = b.status === 'payment_review' || (b.status === 'pending_payment' && b.paymentDeadline > new Date());
    if (!awaiting) fail(409, 'not_pending');
    let fileId;
    try {
      fileId = await uploadImage(api, client.telegramId, body.file);
    } catch (err) {
      console.error('[web] Не удалось загрузить скриншот клиента:', err.description || err.message);
      fail(502, 'upload_failed');
    }
    const booking = await submitScreenshot(b._id, client._id, fileId);
    if (!booking) fail(409, 'not_pending');
    const m = await Master.findById(booking.masterId);
    if (m) await sendScreenshotToMaster(api, m, client, booking, fileId);
    return bookingDto(booking, m);
  });
}

module.exports = registerClient;
module.exports.ensureClient = ensureClient;
