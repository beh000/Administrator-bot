// Выгрузка всех текстов бота в docs/texts-review.md: русский и узбекский рядом.
// Нужна для вычитки носителем языка. Запуск: node scripts/export-texts.js
const fs = require('fs');
const path = require('path');
const { LOCALES } = require('../locales');

function flatten(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]],
  );
}

const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, '<br>');
const uz = new Map(flatten(LOCALES.uz));
const rows = flatten(LOCALES.ru).map(([key, ru]) => `| \`${key}\` | ${cell(ru)} | ${cell(uz.get(key))} |`);

const md = [
  '# Тексты бота: русский и узбекский',
  '',
  'Файл собирается автоматически (`node scripts/export-texts.js`), правки вносите в `locales/uz.js` и `locales/ru.js`.',
  '',
  'Как проверять: читайте колонку «Oʻzbekcha» — звучит ли естественно, как сказал бы человек. `{name}` и подобное —',
  'подстановки, их не трогать. `<b>…</b>` — жирный шрифт.',
  '',
  '| Ключ | Русский | Oʻzbekcha |',
  '|---|---|---|',
  ...rows,
  '',
].join('\n');

fs.writeFileSync(path.join(__dirname, '..', 'docs', 'texts-review.md'), md);
console.log(`docs/texts-review.md: ${rows.length} текстов`);
