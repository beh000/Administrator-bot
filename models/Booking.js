const { Schema, model, Types } = require('mongoose');

const STATUSES = [
  'pending_payment',
  'payment_review',
  'confirmed',
  'cancelled_by_client',
  'cancelled_by_master',
  'expired',
  'completed',
  'no_show',
];

// Статусы, в которых запись занимает время мастера
const ACTIVE_STATUSES = ['pending_payment', 'payment_review', 'confirmed'];

const bookingSchema = new Schema({
  masterId: { type: Types.ObjectId, ref: 'Master', required: true },
  // kind: booking — запись клиента; block — мастер закрыл время (клиента нет)
  kind: { type: String, enum: ['booking', 'block'], default: 'booking' },
  // Клиент из бота. У ручной записи мастера и у блока — пусто
  clientId: { type: Types.ObjectId, ref: 'Client' },
  // Ручная запись: мастер записал клиента сам (по телефону, в личке)
  manualName: String,
  manualPhone: String,
  serviceId: { type: String, required: true },
  // Снимок услуги на момент записи: мастер может потом её переименовать
  serviceTitle: String,
  durationMin: Number,
  start: { type: Date, required: true }, // UTC
  end: { type: Date, required: true }, // UTC, без учёта буфера
  price: { type: Number, default: 0 },
  prepaymentAmount: { type: Number, default: 0 },
  status: { type: String, enum: STATUSES, required: true },
  paymentDeadline: Date, // до какого момента ждём скриншот (pending_payment)
  paymentScreenshotFileId: String,
  // Перенос: из какой записи пришла уже подтверждённая предоплата
  rescheduledFrom: { type: Types.ObjectId, ref: 'Booking' },
  reminders: {
    dayBefore: { type: Boolean, default: false },
    twoHours: { type: Boolean, default: false },
    unconfirmedWarning: { type: Boolean, default: false },
    attendanceAsked: { type: Boolean, default: false },
  },
  clientConfirmed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

bookingSchema.index({ masterId: 1, start: 1 });
bookingSchema.index({ status: 1, start: 1 });
bookingSchema.index({ clientId: 1, start: 1 });

const Booking = model('Booking', bookingSchema);
Booking.STATUSES = STATUSES;
Booking.ACTIVE_STATUSES = ACTIVE_STATUSES;

module.exports = Booking;
