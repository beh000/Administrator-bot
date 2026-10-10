const test = require('node:test');
const assert = require('node:assert');
const { computeSlots, computeAvailableDates } = require('../services/slots');
const { atLocal, local } = require('../utils/time');

// «Сейчас» — понедельник 12.10.2026, 08:00 по Ташкенту
const NOW = atLocal('2026-10-12', 8 * 60).toDate();
const MON = '2026-10-12';
const TUE = '2026-10-13';
const SUN = '2026-10-18';

function day(working, start = '09:00', end = '19:00', breaks = []) {
  return { working, start, end, breaks };
}

function makeMaster(overrides = {}) {
  return {
    schedule: {
      mon: day(true, '09:00', '13:00'),
      tue: day(true, '09:00', '18:00', [{ start: '13:00', end: '14:00' }]),
      wed: day(true),
      thu: day(true),
      fri: day(true),
      sat: day(true),
      sun: day(false),
    },
    daysOff: [],
    slotStepMin: 60,
    bufferMin: 0,
    bookingHorizonDays: 14,
    minNoticeMin: 0,
    ...overrides,
  };
}

const svc = (durationMin) => ({ durationMin });
const times = (slots) => slots.map((s) => local(s.start).format('HH:mm'));
const at = (dateKey, hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return atLocal(dateKey, h * 60 + m).toDate();
};
const booking = (dateKey, from, to) => ({ start: at(dateKey, from), end: at(dateKey, to) });

test('обычный день: шаг 60 мин, услуга 60 мин', () => {
  const slots = computeSlots({ master: makeMaster(), service: svc(60), dateKey: MON, now: NOW });
  assert.deepStrictEqual(times(slots), ['09:00', '10:00', '11:00', '12:00']);
  // end = start + длительность услуги
  assert.strictEqual(slots[0].end.getTime() - slots[0].start.getTime(), 60 * 60_000);
});

test('услуга не влезает в конец дня', () => {
  // 09:00–13:00, услуга 90 мин, шаг 30: последний старт 11:30
  const master = makeMaster({ slotStepMin: 30 });
  const slots = computeSlots({ master, service: svc(90), dateKey: MON, now: NOW });
  assert.deepStrictEqual(times(slots), ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30']);
  // услуга длиннее рабочего дня — слотов нет
  assert.deepStrictEqual(computeSlots({ master, service: svc(300), dateKey: MON, now: NOW }), []);
});

test('перерывы: услуга не может пересекать перерыв', () => {
  // вт 09:00–18:00, перерыв 13:00–14:00, услуга 90 мин, шаг 60
  const slots = computeSlots({ master: makeMaster(), service: svc(90), dateKey: TUE, now: NOW });
  // 12:00 (до 13:30) и 13:00 пересекают перерыв; 16:00 (до 17:30) влезает, 17:00 — нет
  assert.deepStrictEqual(times(slots), ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']);
});

test('услуга заканчивается ровно к перерыву — слот подходит', () => {
  const slots = computeSlots({ master: makeMaster(), service: svc(60), dateKey: TUE, now: NOW });
  assert.ok(times(slots).includes('12:00'));
  assert.ok(!times(slots).includes('13:00'));
  assert.ok(times(slots).includes('14:00'));
});

test('пересечение с существующей записью', () => {
  const busy = [booking(MON, '10:00', '11:00')];
  const slots = computeSlots({ master: makeMaster({ slotStepMin: 30 }), service: svc(60), dateKey: MON, busy, now: NOW });
  // 09:30 (до 10:30) и 10:00, 10:30 пересекаются; 09:00 до 10:00 — впритык, можно
  assert.deepStrictEqual(times(slots), ['09:00', '11:00', '11:30', '12:00']);
});

test('буфер между клиентами', () => {
  // буфер 15 мин: после записи 10:00–11:00 следующий клиент не раньше 11:15,
  // и перед записью нужен зазор 15 мин; шаг 15
  const master = makeMaster({ slotStepMin: 15, bufferMin: 15 });
  const busy = [booking(MON, '10:00', '11:00')];
  const slots = times(computeSlots({ master, service: svc(30), dateKey: MON, busy, now: NOW }));
  assert.ok(slots.includes('09:15')); // 09:15–09:45 + буфер до 10:00 — впритык
  assert.ok(!slots.includes('09:30')); // 09:30–10:00 + буфер залезает в запись
  assert.ok(!slots.includes('11:00'));
  assert.ok(slots.includes('11:15'));
  // буфер учитывается и в конце дня: 30 + 15 мин должны влезть до 13:00
  assert.ok(slots.includes('12:15'));
  assert.ok(!slots.includes('12:30'));
});

test('минимальное время до записи', () => {
  // сейчас 08:00, минимум 2 часа → не раньше 10:00
  const master = makeMaster({ minNoticeMin: 120 });
  const slots = computeSlots({ master, service: svc(60), dateKey: MON, now: NOW });
  assert.deepStrictEqual(times(slots), ['10:00', '11:00', '12:00']);
  // посреди дня прошедшее время недоступно даже без minNotice
  const noon = atLocal(MON, 10 * 60 + 30).toDate();
  assert.deepStrictEqual(times(computeSlots({ master: makeMaster(), service: svc(60), dateKey: MON, now: noon })), ['11:00', '12:00']);
});

test('выходной: нерабочий день недели и дата из daysOff', () => {
  assert.deepStrictEqual(computeSlots({ master: makeMaster(), service: svc(60), dateKey: SUN, now: NOW }), []);
  const master = makeMaster({ daysOff: [TUE] });
  assert.deepStrictEqual(computeSlots({ master, service: svc(60), dateKey: TUE, now: NOW }), []);
});

test('горизонт записи и прошедшие даты', () => {
  const master = makeMaster({ bookingHorizonDays: 2 });
  assert.ok(computeSlots({ master, service: svc(60), dateKey: TUE, now: NOW }).length > 0);
  assert.deepStrictEqual(computeSlots({ master, service: svc(60), dateKey: '2026-10-14', now: NOW }), []);
  assert.deepStrictEqual(computeSlots({ master, service: svc(60), dateKey: '2026-10-11', now: NOW }), []);
});

test('полностью занятый день не попадает в список дат', () => {
  const master = makeMaster({ bookingHorizonDays: 7 });
  const busy = [booking(MON, '09:00', '13:00')];
  const dates = computeAvailableDates({ master, service: svc(60), busy, now: NOW });
  // пн занят, вс — выходной
  assert.deepStrictEqual(dates, ['2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17']);
});

test('записи хранятся в UTC, график — по Ташкенту', () => {
  // 09:00 в Ташкенте = 04:00 UTC
  const [first] = computeSlots({ master: makeMaster(), service: svc(60), dateKey: MON, now: NOW });
  assert.strictEqual(first.start.toISOString(), '2026-10-12T04:00:00.000Z');
});
