const test = require('node:test');
const assert = require('node:assert');
const { verifyInitData, signInitData } = require('../web/auth');

const TOKEN = '123456:ABC';
const now = 1_800_000_000;
const user = JSON.stringify({ id: 501, first_name: 'Малика' });
const fresh = () => signInitData({ auth_date: String(now - 60), query_id: 'AAE', user }, TOKEN);

test('initData: верная подпись → пользователь', () => {
  assert.strictEqual(verifyInitData(fresh(), TOKEN, now).id, 501);
});

test('initData: подпись другим ботом не проходит', () => {
  assert.strictEqual(verifyInitData(fresh(), '999:OTHER', now), null);
});

test('initData: подмена пользователя не проходит', () => {
  const forged = fresh().replace(encodeURIComponent('"id":501'), encodeURIComponent('"id":502'));
  assert.notStrictEqual(forged, fresh());
  assert.strictEqual(verifyInitData(forged, TOKEN, now), null);
});

test('initData: старше суток не проходит', () => {
  const old = signInitData({ auth_date: String(now - 2 * 86400), user }, TOKEN);
  assert.strictEqual(verifyInitData(old, TOKEN, now), null);
});

test('initData: мусор и пустое значение', () => {
  for (const bad of ['', 'abc', 'hash=zz', null, undefined, 'x'.repeat(5000)]) {
    assert.strictEqual(verifyInitData(bad, TOKEN, now), null);
  }
});

test('мини-приложение: тексты ru и uz с одинаковыми ключами', () => {
  global.window = {};
  require('../webapp/i18n');
  const { ru, uz } = global.window.I18N;
  const keys = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${p}${k}.`) : [`${p}${k}`])).sort();
  assert.deepStrictEqual(keys(uz), keys(ru));
  // все state.L.<ключ> из app.js существуют
  const src = require('fs').readFileSync(require('path').join(__dirname, '../webapp/app.js'), 'utf8');
  const used = new Set([...src.matchAll(/\bL\.([a-zA-Z]+)/g)].map((m) => m[1]));
  // L — либо весь словарь, либо раздел настроек (L = SL())
  for (const k of used) assert.ok(k in ru || k in ru.set, `нет ключа ${k}`);
});
