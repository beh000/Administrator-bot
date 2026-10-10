// Все даты в БД — UTC. Всё, что видит пользователь и что связано с графиком
// мастера, считается в Asia/Tashkent (UTC+5, без перехода на летнее время).
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Asia/Tashkent';
const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function now() {
  return dayjs().tz(TZ);
}

// Любое Date/строку/dayjs → dayjs в Ташкенте
function local(date) {
  return dayjs(date).tz(TZ);
}

// 'YYYY-MM-DD' (локальная дата Ташкента) + минуты от полуночи → dayjs в Ташкенте
function atLocal(dateKey, minutes = 0) {
  return dayjs.tz(dateKey, TZ).add(minutes, 'minute');
}

function dateKey(d) {
  return local(d).format('YYYY-MM-DD');
}

// dayjs.day(): 0 = воскресенье → ключ 'mon'..'sun'
function weekdayKey(d) {
  return WEEKDAYS[(local(d).day() + 6) % 7];
}

function hhmmToMin(s) {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
}

function minToHHMM(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

module.exports = { dayjs, TZ, WEEKDAYS, now, local, atLocal, dateKey, weekdayKey, hhmmToMin, minToHHMM };
