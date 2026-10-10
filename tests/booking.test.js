const test = require('node:test');
const assert = require('node:assert');
const { needsPrepayment, canClientChange } = require('../services/booking');
const { canAcceptBookings } = require('../services/subscription');

const MASTER_ID = 'm1';
const prepay = (enabled) => ({ _id: MASTER_ID, prepayment: { enabled, amount: 30000, cardNumber: '8600123412341234' } });
const client = (noShows = 0) => ({ noShowCount: new Map(noShows ? [[MASTER_ID, noShows]] : []) });

test('предоплата: по настройке мастера', () => {
  assert.strictEqual(needsPrepayment(prepay(true), client()), true);
  assert.strictEqual(needsPrepayment(prepay(false), client()), false);
});

test('предоплата: обязательна после двух неявок, даже если мастер её выключил', () => {
  assert.strictEqual(needsPrepayment(prepay(false), client(1)), false);
  assert.strictEqual(needsPrepayment(prepay(false), client(2)), true);
});

test('предоплата: без реквизитов мастера не требуется', () => {
  const m = { _id: MASTER_ID, prepayment: { enabled: true, amount: 0, cardNumber: '' } };
  assert.strictEqual(needsPrepayment(m, client(5)), false);
});

test('отмена и перенос — не позже чем за 2 часа', () => {
  const now = new Date('2026-10-12T05:00:00Z');
  const at = (min) => ({ start: new Date(now.getTime() + min * 60_000) });
  assert.strictEqual(canClientChange(at(121), now), true);
  assert.strictEqual(canClientChange(at(120), now), true);
  assert.strictEqual(canClientChange(at(119), now), false);
});

test('подписка: истёкшая не принимает новые записи', () => {
  const now = new Date('2026-10-12T05:00:00Z');
  const future = new Date(now.getTime() + 864e5);
  const past = new Date(now.getTime() - 1000);
  assert.strictEqual(canAcceptBookings({ subscription: { status: 'trial', paidUntil: future } }, now), true);
  assert.strictEqual(canAcceptBookings({ subscription: { status: 'active', paidUntil: past } }, now), false);
  assert.strictEqual(canAcceptBookings({ subscription: { status: 'expired', paidUntil: future } }, now), false);
});

test('продление подписки: от даты окончания, если она в будущем, иначе от сегодня', () => {
  const { extendedUntil, daysLeft } = require('../services/subscription');
  const { local } = require('../utils/time');
  const now = new Date('2026-10-12T05:00:00Z'); // 12.10 10:00 по Ташкенту
  const fmt = (d) => local(d).format('YYYY-MM-DD HH:mm');
  // ещё 5 дней подписки → +30 от 17.10
  assert.strictEqual(fmt(extendedUntil(new Date('2026-10-17T18:59:59Z'), 30, now)), '2026-11-16 23:59');
  // уже истекла → +30 от сегодня
  assert.strictEqual(fmt(extendedUntil(new Date('2026-10-01T00:00:00Z'), 30, now)), '2026-11-11 23:59');
  // не было даты (не должно случаться) → от сегодня
  assert.strictEqual(fmt(extendedUntil(undefined, 7, now)), '2026-10-19 23:59');
  // дни до конца по календарю Ташкента
  assert.strictEqual(daysLeft(new Date('2026-10-15T18:59:59Z'), now), 3);
  assert.strictEqual(daysLeft(new Date('2026-10-12T18:59:59Z'), now), 0);
});
