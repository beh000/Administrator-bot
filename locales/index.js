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
  return String(value).replace(/\{(\w+)\}/g, (m, name) => (params[name] !== undefined ? params[name] : m));
}

module.exports = { t, LANGS, DEFAULT_LANG, LOCALES, lookup };
