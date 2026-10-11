// i18n: все тексты бота лежат в locales/<lang>.js.
// Значение ключа — строка с плейсхолдерами {name} или функция (params) => строка.
// Если ключа нет в выбранном языке — берётся русский, затем сам ключ (видно в логах).
const ru = require('./ru');
const uz = require('./uz');

const LOCALES = { ru, uz };
const LANGS = Object.keys(LOCALES);
const DEFAULT_LANG = 'ru';

function lookup(dict, key) {
  return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dict);
}

function t(lang, key, params = {}) {
  let value = lookup(LOCALES[lang] || LOCALES[DEFAULT_LANG], key);
  if (value === undefined && lang !== DEFAULT_LANG) value = lookup(LOCALES[DEFAULT_LANG], key);
  if (value === undefined) {
    console.warn(`[i18n] нет ключа "${key}" для языка "${lang}"`);
    return key;
  }
  if (typeof value === 'function') return value(params);
  return String(value)
    .replace(/\{(\w+)#([^}]+)\}/g, (m, name, forms) => (params[name] !== undefined ? plural(lang, Number(params[name]), forms.split('|')) : m))
    .replace(/\{(\w+)\}/g, (m, name) => (params[name] !== undefined ? params[name] : m));
}

// Форма слова для числа: {days#день|дня|дней} → «1 день», «3 дня», «44 дня», «25 дней».
// В узбекском форма одна (kun) — берётся первая.
function plural(lang, n, forms) {
  if (forms.length < 3) return forms[0];
  const n10 = Math.abs(n) % 10;
  const n100 = Math.abs(n) % 100;
  if (n10 === 1 && n100 !== 11) return forms[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return forms[1];
  return forms[2];
}

module.exports = { t, plural, LANGS, DEFAULT_LANG, LOCALES, lookup };
