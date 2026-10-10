// Все обработчики мастера. Срабатывают только для пользователей,
// у которых есть запись Master (в т.ч. на этапе регистрации).
const { Composer } = require('grammy');

const composer = new Composer();
const masterOnly = composer.filter((ctx) => !!ctx.master);

[
  require('./registration'),
  require('./menu'),
  require('./services'),
  require('./schedule'),
  require('./daysOff'),
  require('./settings'),
  require('./prepayment'),
  require('./link'),
  require('./bookings'),
  require('./subscription'),
  require('./payments'),
].forEach((mod) => masterOnly.use(mod.composer));

module.exports = composer;
