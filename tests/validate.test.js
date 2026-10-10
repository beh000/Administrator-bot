const test = require('node:test');
const assert = require('node:assert');
const v = require('../utils/validate');
const { now } = require('../utils/time');

test('parseTime', () => {
  assert.strictEqual(v.parseTime('9:00'), '09:00');
  assert.strictEqual(v.parseTime('09.30'), '09:30');
  assert.strictEqual(v.parseTime('23:59'), '23:59');
  assert.strictEqual(v.parseTime('24:00'), null);
  assert.strictEqual(v.parseTime('9:5'), null);
  assert.strictEqual(v.parseTime('abc'), null);
});

test('parseTimeRange', () => {
  assert.deepStrictEqual(v.parseTimeRange('09:00-19:00'), { start: '09:00', end: '19:00' });
  assert.deepStrictEqual(v.parseTimeRange('9:00 – 18:30'), { start: '09:00', end: '18:30' });
  assert.deepStrictEqual(v.parseTimeRange('10:00 14:00'), { start: '10:00', end: '14:00' });
  assert.strictEqual(v.parseTimeRange('19:00-09:00'), null);
  assert.strictEqual(v.parseTimeRange('10:00-10:00'), null);
  assert.strictEqual(v.parseTimeRange('10:00'), null);
});

test('parsePrice / parseDuration', () => {
  assert.strictEqual(v.parsePrice('50 000'), 50000);
  assert.strictEqual(v.parsePrice('0'), 0);
  assert.strictEqual(v.parsePrice('-5'), null);
  assert.strictEqual(v.parsePrice('12.5'), null);
  assert.strictEqual(v.parsePrice('сто'), null);
  assert.strictEqual(v.parseDuration('75'), 75);
  assert.strictEqual(v.parseDuration('3'), null);
  assert.strictEqual(v.parseDuration('1000'), null);
});

test('parseCard', () => {
  assert.strictEqual(v.parseCard('8600 1234 5678 9012'), '8600123456789012');
  assert.strictEqual(v.parseCard('8600-1234-5678-9012'), '8600123456789012');
  assert.strictEqual(v.parseCard('8600 1234 5678 901'), null);
  assert.strictEqual(v.parseCard('8600 1234 5678 90123'), null);
  assert.strictEqual(v.formatCard('8600123456789012'), '8600 1234 5678 9012');
});

test('parsePhone', () => {
  assert.strictEqual(v.parsePhone('+998 90 123-45-67'), '+998901234567');
  assert.strictEqual(v.parsePhone('998901234567'), '+998901234567');
  assert.strictEqual(v.parsePhone('901234567'), '+998901234567');
  assert.strictEqual(v.parsePhone('12345'), null);
});

test('parseFutureDate', () => {
  const tomorrow = now().add(1, 'day');
  assert.strictEqual(v.parseFutureDate(tomorrow.format('DD.MM.YYYY')), tomorrow.format('YYYY-MM-DD'));
  assert.strictEqual(v.parseFutureDate(now().format('DD.MM')), now().format('YYYY-MM-DD'));
  // без года и уже прошло → следующий год
  const yesterday = now().subtract(1, 'day');
  if (yesterday.year() === now().year()) {
    assert.strictEqual(v.parseFutureDate(yesterday.format('DD.MM')), yesterday.add(1, 'year').format('YYYY-MM-DD'));
  }
  assert.strictEqual(v.parseFutureDate(yesterday.format('DD.MM.YYYY')), null);
  assert.strictEqual(v.parseFutureDate('31.02.2030'), null);
  assert.strictEqual(v.parseFutureDate('abc'), null);
});
