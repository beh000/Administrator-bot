// Расчёт свободных слотов мастера.
//
// Ядро — чистые функции computeSlots / computeAvailableDates: всё нужное
// (мастер, услуга, занятые интервалы, текущее время) передаётся параметрами,
// поэтому они покрыты unit-тестами без БД. Обёртки ниже берут занятость из MongoDB.
//
// Правила:
// 1. Нерабочий день недели или дата из daysOff — слотов нет.
// 2. Рабочий интервал [start, end] минус перерывы.
// 3. Кандидаты — с шагом slotStepMin от начала рабочего дня.
// 4. Услуга вместе с буфером (durationMin + bufferMin) целиком внутри рабочего
//    интервала и не пересекается ни с одним перерывом.
// 5. Не пересекается с записями pending_payment / payment_review / confirmed.
//    Каждая запись занимает [start, end + bufferMin).
// 6. Не раньше, чем сейчас + minNoticeMin.
// 7. Дата — в пределах bookingHorizonDays, начиная с сегодня.
const { Booking } = require('../models');
const { now: nowTz, local, atLocal, weekdayKey, hhmmToMin } = require('../utils/time');

// Дата в пределах горизонта записи: сегодня .. сегодня + horizon - 1
function inHorizon(master, dateKey, now) {
  const today = local(now).startOf('day');
  const day = atLocal(dateKey);
  return !day.isBefore(today) && day.isBefore(today.add(master.bookingHorizonDays, 'day'));
}

/**
 * Свободные слоты на одну дату.
 * @param {object} p
 * @param {object} p.master   — графики и настройки мастера
 * @param {object} p.service  — { durationMin }
 * @param {string} p.dateKey  — локальная дата Ташкента 'YYYY-MM-DD'
 * @param {Array<{start: Date, end: Date}>} p.busy — активные записи мастера
 * @param {Date}   p.now
 * @returns {Array<{start: Date, end: Date}>} start/end услуги (без буфера), UTC
 */
function computeSlots({ master, service, dateKey, busy = [], now = new Date() }) {
  if (!inHorizon(master, dateKey, now)) return [];
  if ((master.daysOff || []).includes(dateKey)) return [];
  const day = master.schedule[weekdayKey(atLocal(dateKey))];
  if (!day || !day.working) return [];

  const workStart = hhmmToMin(day.start);
  const workEnd = hhmmToMin(day.end);
  const breaks = (day.breaks || []).map((b) => [hhmmToMin(b.start), hhmmToMin(b.end)]);
  const step = master.slotStepMin > 0 ? master.slotStepMin : 30;
  const buffer = master.bufferMin || 0;
  const need = service.durationMin + buffer;

  const earliest = now.getTime() + (master.minNoticeMin || 0) * 60_000;
  const busyMs = busy.map((b) => [new Date(b.start).getTime(), new Date(b.end).getTime() + buffer * 60_000]);

  const slots = [];
  for (let m = workStart; m + need <= workEnd; m += step) {
    const end = m + need;
    if (breaks.some(([bs, be]) => m < be && bs < end)) continue;

    const startMs = atLocal(dateKey, m).valueOf();
    if (startMs < earliest) continue;
    const endMs = startMs + need * 60_000;
    if (busyMs.some(([bs, be]) => startMs < be && bs < endMs)) continue;

    slots.push({ start: new Date(startMs), end: new Date(startMs + service.durationMin * 60_000) });
  }
  return slots;
}

// Все даты горизонта, где есть хотя бы один свободный слот
function computeAvailableDates({ master, service, busy = [], now = new Date() }) {
  const today = local(now).startOf('day');
  const dates = [];
  for (let i = 0; i < master.bookingHorizonDays; i += 1) {
    const dateKey = today.add(i, 'day').format('YYYY-MM-DD');
    if (computeSlots({ master, service, dateKey, busy, now }).length) dates.push(dateKey);
  }
  return dates;
}

// --- Обёртки над БД ---

// Активные записи мастера, пересекающие [from, to). excludeBookingId — чтобы
// при переносе не считать занятым время самой переносимой записи.
async function loadBusy(masterId, from, to, excludeBookingId) {
  const query = {
    masterId,
    status: { $in: Booking.ACTIVE_STATUSES },
    // запись могла начаться до from (длинная услуга) — берём с запасом в сутки,
    // лишние computeSlots просто не заметит
    start: { $gte: new Date(from.getTime() - 24 * 3600_000), $lt: to },
  };
  if (excludeBookingId) query._id = { $ne: excludeBookingId };
  return Booking.find(query, { start: 1, end: 1 }).lean();
}

async function freeSlots(master, service, dateKey, { excludeBookingId } = {}) {
  const from = atLocal(dateKey).toDate();
  const to = atLocal(dateKey).add(1, 'day').toDate();
  const busy = await loadBusy(master._id, from, to, excludeBookingId);
  return computeSlots({ master, service, dateKey, busy, now: new Date() });
}

async function availableDates(master, service, { excludeBookingId } = {}) {
  const now = new Date();
  const from = nowTz().startOf('day').toDate();
  const to = nowTz().startOf('day').add(master.bookingHorizonDays, 'day').toDate();
  const busy = await loadBusy(master._id, from, to, excludeBookingId);
  return computeAvailableDates({ master, service, busy, now });
}

// Повторная проверка перед созданием записи: свободен ли ещё именно этот старт
async function isSlotAvailable(master, service, start, { excludeBookingId } = {}) {
  const dateKey = local(start).format('YYYY-MM-DD');
  const slots = await freeSlots(master, service, dateKey, { excludeBookingId });
  const t = new Date(start).getTime();
  return slots.some((s) => s.start.getTime() === t);
}

module.exports = { computeSlots, computeAvailableDates, freeSlots, availableDates, isSlotAvailable, loadBusy };
