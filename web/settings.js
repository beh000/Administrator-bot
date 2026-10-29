// Настройки мастера в мини-приложении: те же правила, что и в боте.
const { Booking, Client } = require('../models');
const { WEEKDAYS, now: nowTz, atLocal, hhmmToMin } = require('../utils/time');
const { parseName, parseDuration, parsePrice, parseCard, parseTime } = require('../utils/validate');
const { randomId, masterLink } = require('../utils/ids');
const { SETTINGS } = require('../bot/master/settings');
const { LANGS } = require('../locales');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SERVICES = 30;
const MAX_BREAKS = 4;
const MAX_OFF_DAYS = 62;

// Подряд идущие даты → [{ from, to }]
function toRanges(sorted) {
  const out = [];
  sorted.forEach((d) => {
    const last = out[out.length - 1];
    if (last && atLocal(last.to).add(1, 'day').format('YYYY-MM-DD') === d) last.to = d;
    else out.push({ from: d, to: d });
  });
  return out;
}

function prepaymentReady(pp) {
  return pp.amount > 0 && Boolean(pp.cardNumber) && Boolean(pp.cardHolder);
}

function settingsDto(master, botUsername) {
  const today = nowTz().format('YYYY-MM-DD');
  const pp = master.prepayment || {};
  return {
    name: master.name,
    phone: master.phone,
    lang: master.language || 'ru',
    link: masterLink(botUsername, master.slug),
    bot: botUsername,
    services: master.services.map((s) => ({ id: s.id, title: s.title, durationMin: s.durationMin, price: s.price, active: s.active })),
    schedule: Object.fromEntries(
      WEEKDAYS.map((d) => {
        const day = master.schedule?.[d] || {};
        return [d, { working: Boolean(day.working), start: day.start || '09:00', end: day.end || '19:00', breaks: (day.breaks || []).map((b) => ({ start: b.start, end: b.end })) }];
      }),
    ),
    daysOff: toRanges([...new Set(master.daysOff || [])].filter((d) => d >= today).sort()),
    booking: Object.fromEntries(Object.entries(SETTINGS).map(([code, { field, values }]) => [code, { value: master[field], values }])),
    prepayment: { enabled: Boolean(pp.enabled), amount: pp.amount || 0, cardNumber: pp.cardNumber || '', cardHolder: pp.cardHolder || '', ready: prepaymentReady(pp) },
    about: master.about || '',
    photos: (master.photos || []).length,
    address: master.location?.address || '',
    hasGeo: Number.isFinite(master.location?.lat) && Number.isFinite(master.location?.lng),
    subscription: { status: master.subscription?.status, paidUntil: master.subscription?.paidUntil },
  };
}

module.exports = function registerSettings(route, fail) {
  const ok = (master, botUsername) => settingsDto(master, botUsername);

  route('GET', /^\/api\/settings$/, async ({ master, botUsername }) => ok(master, botUsername));

  // --- Услуги ---
  function readService(body) {
    const title = parseName(body.title, 48);
    if (!title) fail(400, 'bad_title');
    const durationMin = parseDuration(String(body.durationMin ?? ''));
    if (!durationMin) fail(400, 'bad_duration');
    const price = parsePrice(String(body.price ?? ''));
    if (price === null) fail(400, 'bad_price');
    return { title, durationMin, price };
  }

  route('POST', /^\/api\/settings\/services$/, async ({ master, body, botUsername }) => {
    if (master.services.length >= MAX_SERVICES) fail(400, 'too_many');
    master.services.push({ id: randomId(8), ...readService(body), active: true });
    await master.save();
    return ok(master, botUsername);
  });

  route('POST', /^\/api\/settings\/services\/([a-z0-9]{1,16})$/, async ({ master, body, params, botUsername }) => {
    const s = master.services.find((x) => x.id === params[0]);
    if (!s) fail(404, 'not_found');
    if (typeof body.active === 'boolean' && Object.keys(body).length === 1) {
      // нельзя выключить последнюю активную услугу — клиентам не на что будет записаться
      if (!body.active && master.activeServices().length === 1 && s.active) fail(400, 'last_service');
      s.active = body.active;
    } else {
      Object.assign(s, readService(body));
    }
    master.markModified('services');
    await master.save();
    return ok(master, botUsername);
  });

  // --- График: один день целиком ---
  route('POST', /^\/api\/settings\/schedule\/(mon|tue|wed|thu|fri|sat|sun)$/, async ({ master, body, params, botUsername }) => {
    const key = params[0];
    const day = master.schedule[key];
    if (!body.working) {
      day.working = false;
    } else {
      const start = parseTime(body.start);
      const end = parseTime(body.end);
      if (!start || !end || hhmmToMin(start) >= hhmmToMin(end)) fail(400, 'bad_range');
      const breaks = Array.isArray(body.breaks) ? body.breaks : [];
      if (breaks.length > MAX_BREAKS) fail(400, 'too_many');
      const parsed = breaks
        .map((b) => ({ start: parseTime(b?.start), end: parseTime(b?.end) }))
        .sort((a, b) => hhmmToMin(a.start || '00:00') - hhmmToMin(b.start || '00:00'));
      let prevEnd = hhmmToMin(start);
      for (const b of parsed) {
        // перерыв внутри рабочего времени и не пересекается с другими
        if (!b.start || !b.end || hhmmToMin(b.start) >= hhmmToMin(b.end)) fail(400, 'bad_break');
        if (hhmmToMin(b.start) < prevEnd || hhmmToMin(b.end) > hhmmToMin(end)) fail(400, 'bad_break');
        prevEnd = hhmmToMin(b.end);
      }
      Object.assign(day, { working: true, start, end, breaks: parsed });
    }
    master.markModified('schedule');
    await master.save();
    return ok(master, botUsername);
  });

  // --- Выходные даты ---
  function readRange(body) {
    const { from, to } = body;
    if (!DATE_RE.test(String(from)) || !DATE_RE.test(String(to))) fail(400, 'bad_date');
    if (atLocal(from).format('YYYY-MM-DD') !== from || atLocal(to).format('YYYY-MM-DD') !== to || to < from) fail(400, 'bad_date');
    return { from, to };
  }

  route('POST', /^\/api\/settings\/daysoff$/, async ({ master, body, botUsername }) => {
    const { from, to } = readRange(body);
    const today = nowTz().format('YYYY-MM-DD');
    if (from < today) fail(400, 'past');
    const keys = [];
    for (let d = atLocal(from); d.format('YYYY-MM-DD') <= to; d = d.add(1, 'day')) {
      keys.push(d.format('YYYY-MM-DD'));
      if (keys.length > MAX_OFF_DAYS) fail(400, 'too_long');
    }
    const fresh = keys.filter((k) => !master.daysOff.includes(k));
    if (fresh.length) {
      master.daysOff.push(...fresh);
      await master.save();
    }
    // записи на эти дни не отменяем — мастер решает сам
    const bookings = await Booking.countDocuments({
      masterId: master._id,
      kind: { $ne: 'block' },
      status: { $in: Booking.ACTIVE_STATUSES },
      start: { $gte: atLocal(from).toDate(), $lt: atLocal(to).add(1, 'day').toDate() },
    });
    return { ...ok(master, botUsername), warnBookings: bookings };
  });

  route('POST', /^\/api\/settings\/daysoff\/remove$/, async ({ master, body, botUsername }) => {
    const { from, to } = readRange(body);
    master.daysOff = master.daysOff.filter((d) => d < from || d > to);
    await master.save();
    return ok(master, botUsername);
  });

  // --- Правила записи ---
  route('POST', /^\/api\/settings\/booking$/, async ({ master, body, botUsername }) => {
    for (const [code, value] of Object.entries(body)) {
      const rule = SETTINGS[code];
      if (!rule || !rule.values.includes(value)) fail(400, 'bad_value');
      master[rule.field] = value;
    }
    await master.save();
    return ok(master, botUsername);
  });

  // --- Предоплата ---
  route('POST', /^\/api\/settings\/prepayment$/, async ({ master, body, botUsername }) => {
    const pp = master.prepayment;
    if (body.amount !== undefined) {
      const amount = parsePrice(String(body.amount));
      if (!amount) fail(400, 'bad_amount');
      pp.amount = amount;
    }
    if (body.cardNumber !== undefined) {
      const card = parseCard(body.cardNumber);
      if (!card) fail(400, 'bad_card');
      pp.cardNumber = card;
    }
    if (body.cardHolder !== undefined) {
      const holder = parseName(body.cardHolder, 64);
      if (!holder) fail(400, 'bad_holder');
      pp.cardHolder = holder;
    }
    if (typeof body.enabled === 'boolean') {
      if (body.enabled && !prepaymentReady(pp)) fail(400, 'prepay_incomplete');
      pp.enabled = body.enabled;
    }
    master.markModified('prepayment');
    await master.save();
    return ok(master, botUsername);
  });

  // --- Профиль: описание и адрес (фото и точка на карте — в боте) ---
  route('POST', /^\/api\/settings\/profile$/, async ({ master, body, botUsername }) => {
    if (body.about !== undefined) {
      const about = String(body.about || '').trim();
      if (about.length > 500) fail(400, 'too_long');
      master.about = about;
    }
    if (body.address !== undefined) {
      const address = String(body.address || '').trim().replace(/\s+/g, ' ');
      if (address.length > 200) fail(400, 'too_long');
      master.set('location.address', address);
    }
    await master.save();
    return ok(master, botUsername);
  });

  // --- Язык (общий с ботом) ---
  route('POST', /^\/api\/settings\/language$/, async ({ master, body, botUsername }) => {
    if (!LANGS.includes(body.lang)) fail(400, 'bad_value');
    master.language = body.lang;
    await master.save();
    await Client.updateOne({ telegramId: master.telegramId }, { $set: { language: body.lang } });
    return ok(master, botUsername);
  });
};
