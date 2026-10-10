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
