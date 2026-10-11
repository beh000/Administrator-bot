// Разбор и проверка пользовательского ввода. Каждая функция возвращает
// нормализованное значение или null, если ввод некорректен.
const { now, atLocal, hhmmToMin } = require('./time');

// «9:00», «09.30» или просто час: «9»
const TIME_RE = /^([01]?\d|2[0-3])(?:[:.]([0-5]\d))?$/;

// "9:00", "09.00", "9" → "09:00"
function parseTime(input) {
  const m = String(input || '').trim().match(TIME_RE);
  if (!m) return null;
  return `${m[1].padStart(2, '0')}:${m[2] || '00'}`;
}

// "09:00-19:00", "9:00 – 19:00" → { start: "09:00", end: "19:00" }; start < end
function parseTimeRange(input) {
  const parts = String(input || '').split(/\s*[-–—]\s*|\s+/).filter(Boolean);
  if (parts.length !== 2) return null;
  const start = parseTime(parts[0]);
  const end = parseTime(parts[1]);
  if (!start || !end || hhmmToMin(start) >= hhmmToMin(end)) return null;
  return { start, end };
}

// "50 000", "50000" → 50000. Только целые числа в [min, max]
function parseInteger(input, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const s = String(input || '').replace(/[\s_']/g, '');
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  if (n < min || n > max) return null;
  return n;
}

function parsePrice(input) {
  return parseInteger(input, { min: 0, max: 100_000_000 });
}

function parseDuration(input) {
  return parseInteger(input, { min: 5, max: 720 });
}

// Номер карты: ровно 16 цифр, пробелы и дефисы допускаются
function parseCard(input) {
  const s = String(input || '').replace(/[\s-]/g, '');
  return /^\d{16}$/.test(s) ? s : null;
}

function formatCard(card) {
  return String(card || '').replace(/(\d{4})(?=\d)/g, '$1 ');
}

// Телефон: 9–15 цифр, допускается ведущий "+"
function parsePhone(input) {
  const s = String(input || '').replace(/[\s()-]/g, '');
  if (!/^\+?\d{9,15}$/.test(s)) return null;
  if (/^\d{9}$/.test(s)) return `+998${s}`; // локальный узбекский номер
  return s.startsWith('+') ? s : `+${s}`;
}

// Имя/название: 1–64 символа после обрезки
function parseName(input, max = 64) {
  const s = String(input || '').trim().replace(/\s+/g, ' ');
  if (!s || s.length > max) return null;
  return s;
}

// "25.12" или "25.12.2026" → 'YYYY-MM-DD'. Без года — ближайшая будущая дата.
// Прошедшие даты не принимаются.
function parseFutureDate(input) {
  const m = String(input || '').trim().match(/^(\d{1,2})[./](\d{1,2})(?:[./](\d{2}|\d{4}))?$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const today = now().startOf('day');
  let year = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : today.year();
  const build = (y) => `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const valid = (key) => {
    const d = atLocal(key);
    return d.isValid() && d.date() === day && d.month() + 1 === month;
  };
  let key = build(year);
  if (!valid(key)) return null;
  if (!m[3] && atLocal(key).isBefore(today)) {
    year += 1;
    key = build(year);
    if (!valid(key)) return null;
  }
  if (atLocal(key).isBefore(today)) return null;
  return key;
}

// Отпуск: «25.12» или диапазон «25.12-05.01» / «25.12.2026-05.01.2027».
// Возвращает список дат 'YYYY-MM-DD' (не больше 62 дней) или null.
const MAX_RANGE_DAYS = 62;
function parseFutureDateRange(input) {
  const parts = String(input || '').split(/\s*[-–—]\s*/).filter(Boolean);
  if (parts.length === 1) {
    const one = parseFutureDate(parts[0]);
    return one ? [one] : null;
  }
  if (parts.length !== 2) return null;
  const from = parseFutureDate(parts[0]);
  let to = parseFutureDate(parts[1]);
  if (!from || !to) return null;
  // «25.12-05.01» без года: конец раньше начала — значит следующий год
  if (to < from && !/\d{2,4}$/.test(parts[1].split(/[./]/)[2] || '')) {
    to = atLocal(to).add(1, 'year').format('YYYY-MM-DD');
  }
  if (to < from) return null;
  const days = [];
  for (let d = atLocal(from); !d.isAfter(atLocal(to)); d = d.add(1, 'day')) {
    days.push(d.format('YYYY-MM-DD'));
    if (days.length > MAX_RANGE_DAYS) return null;
  }
  return days;
}

module.exports = {
  parseFutureDateRange,
  parseTime,
  parseTimeRange,
  parseInteger,
  parsePrice,
  parseDuration,
  parseCard,
  formatCard,
  parsePhone,
  parseName,
  parseFutureDate,
};
