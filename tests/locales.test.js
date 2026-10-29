const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { LOCALES, lookup, t } = require('../locales');

function flatten(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]],
  );
}

function placeholders(s) {
  return [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

const ru = new Map(flatten(LOCALES.ru));

for (const [lang, dict] of Object.entries(LOCALES)) {
  if (lang === 'ru') continue;
  const other = new Map(flatten(dict));

  test(`${lang}: тот же набор ключей, что в ru`, () => {
    assert.deepStrictEqual([...other.keys()].sort(), [...ru.keys()].sort());
  });

  test(`${lang}: те же плейсхолдеры, что в ru`, () => {
    for (const [key, value] of ru) {
      assert.deepStrictEqual(placeholders(other.get(key)), placeholders(value), `ключ ${key}`);
    }
  });
}

// Все ключи вида ctx.t('a.b') / t(lang, 'a.b') из кода должны существовать
function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : sourceFiles(p);
    return p.endsWith('.js') ? [p] : [];
  });
}

test('все ключи из кода есть в ru', () => {
  const root = path.join(__dirname, '..');
  const files = ['bot', 'services', 'utils', 'web', 'index.js']
    .map((p) => path.join(root, p))
    .filter(fs.existsSync)
    .flatMap((p) => (fs.statSync(p).isDirectory() ? sourceFiles(p) : [p]));
  const missing = [];
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    // только литеральные ключи; ключи с `${...}` проверяются отдельными тестами
    for (const m of src.matchAll(/\bt\((?:(?:\w+|'\w+'),\s*)?'([\w.]+)'/g)) {
      if (lookup(LOCALES.ru, m[1]) === undefined) missing.push(`${path.relative(root, file)}: ${m[1]}`);
    }
  }
  assert.deepStrictEqual(missing, []);
});

test('t(): подстановка, фолбэк на ru и на ключ', () => {
  assert.strictEqual(t('ru', 'off.added', { date: '25.12.2026' }), '✅ 25.12.2026 — выходной.');
  assert.strictEqual(t('xx', 'common.saved'), '✅ Сохранено');
  assert.strictEqual(t('ru', 'no.such.key'), 'no.such.key');
});

test('динамические ключи: дни, статусы, подписка', () => {
  const { WEEKDAYS } = require('../utils/time');
  const Booking = require('../models/Booking');
  for (const d of WEEKDAYS) {
    assert.ok(lookup(LOCALES.ru, `days.short.${d}`));
    assert.ok(lookup(LOCALES.ru, `days.full.${d}`));
  }
  for (const s of Booking.STATUSES) assert.ok(lookup(LOCALES.ru, `status.${s}`), s);
  for (const s of ['trial', 'active', 'expired']) {
    assert.ok(lookup(LOCALES.ru, `sub.line.${s}`));
    assert.ok(lookup(LOCALES.ru, `sub.status.${s}`));
  }
  for (const s of ['step', 'buf', 'hor', 'ntc']) assert.ok(lookup(LOCALES.ru, `set.label.${s}`));
  for (const s of ['today', 'tomorrow', 'week']) assert.ok(lookup(LOCALES.ru, `bk.title.${s}`));
});

test('множественное число в русском и узбекском', () => {
  const { plural } = require('../locales');
  const f = ['день', 'дня', 'дней'];
  assert.deepStrictEqual([1, 2, 5, 11, 14, 21, 22, 25, 44, 101, 111].map((n) => plural('ru', n, f)),
    ['день', 'дня', 'дней', 'дней', 'дней', 'день', 'дня', 'дней', 'дня', 'день', 'дней']);
  assert.strictEqual(t('ru', 'reg.done', { name: 'А', days: 44 }).includes('44 дня бесплатно'), true);
  assert.strictEqual(t('ru', 'reg.done', { name: 'А', days: 30 }).includes('30 дней бесплатно'), true);
});
