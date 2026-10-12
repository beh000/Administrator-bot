const { Schema, model } = require('mongoose');

// Профиль любого пользователя бота. Здесь же хранится выбранный язык —
// он общий для роли клиента и мастера (у мастера копия в Master.language).
const clientSchema = new Schema({
  telegramId: { type: Number, required: true, unique: true },
  name: String,
  phone: String,
  // телефон пришёл кнопкой «Отправить номер» (контакт самого пользователя) —
  // только по такому номеру мастер может «узнать» клиента при ручной записи
  phoneVerified: { type: Boolean, default: false },
  language: { type: String, enum: ['ru', 'uz'] }, // не задан, пока пользователь не выбрал
  // masterId → сколько раз клиент не пришёл к этому мастеру
  noShowCount: { type: Map, of: Number, default: () => new Map() },
  createdAt: { type: Date, default: Date.now },
});

module.exports = model('Client', clientSchema);
