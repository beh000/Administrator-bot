const { Schema, model } = require('mongoose');
const { WEEKDAYS } = require('../utils/time');

const breakSchema = new Schema({ start: String, end: String }, { _id: false });

const daySchema = new Schema(
  {
    working: { type: Boolean, default: false },
    start: { type: String, default: '09:00' },
    end: { type: String, default: '19:00' },
    breaks: { type: [breakSchema], default: [] },
  },
  { _id: false },
);

// По умолчанию: пн–сб 09:00–19:00, воскресенье выходной
const scheduleSchema = new Schema(
  Object.fromEntries(
    WEEKDAYS.map((d) => [d, { type: daySchema, default: () => ({ working: d !== 'sun' }) }]),
  ),
  { _id: false },
);

const serviceSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    durationMin: { type: Number, required: true },
    price: { type: Number, required: true },
    active: { type: Boolean, default: true },
  },
  { _id: false },
);

const masterSchema = new Schema({
  telegramId: { type: Number, required: true, unique: true },
  name: String,
  phone: String,
  language: { type: String, enum: ['ru', 'uz'], default: 'ru' },
  slug: { type: String, required: true, unique: true },
  services: { type: [serviceSchema], default: [] },
  schedule: { type: scheduleSchema, default: () => ({}) },
  daysOff: { type: [String], default: [] }, // локальные даты Ташкента 'YYYY-MM-DD'
  // Где принимает мастер: текст адреса и/или точка на карте (всё необязательно)
  location: {
    address: { type: String, default: '' },
    lat: Number,
    lng: Number,
  },
  slotStepMin: { type: Number, default: 30 },
  bufferMin: { type: Number, default: 0 },
  bookingHorizonDays: { type: Number, default: 14 },
  minNoticeMin: { type: Number, default: 60 },
  prepayment: {
    enabled: { type: Boolean, default: false },
    amount: { type: Number, default: 0 },
    cardNumber: { type: String, default: '' },
    cardHolder: { type: String, default: '' },
    timeoutMin: { type: Number, default: 30 },
  },
  subscription: {
    status: { type: String, enum: ['trial', 'active', 'expired'], default: 'trial' },
    paidUntil: Date,
    // какое напоминание о конце подписки уже отправлено: 'YYYY-MM-DD:3' / 'YYYY-MM-DD:1'
    lastReminder: { type: String, default: '' },
  },
  // Регистрация идёт по шагам; клиенты видят мастера только после registered = true
  registered: { type: Boolean, default: false },
  regStep: { type: String, default: 'name' }, // name | phone | services | schedule | prepayment | done
  // Короткая блокировка на время создания записи (защита от двойного бронирования)
  bookingLockUntil: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

masterSchema.methods.activeServices = function activeServices() {
  return this.services.filter((s) => s.active);
};

module.exports = model('Master', masterSchema);
