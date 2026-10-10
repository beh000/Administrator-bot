const { Schema, model } = require('mongoose');

// Хранилище сессий grammY: состояние диалога переживает перезапуск бота
const sessionSchema = new Schema(
  {
    _id: String,
    value: Schema.Types.Mixed,
    updatedAt: { type: Date, default: Date.now },
  },
  { minimize: false },
);

const Session = model('Session', sessionSchema);

const mongoSessionStorage = {
  async read(key) {
    const doc = await Session.findById(key).lean();
    return doc ? doc.value : undefined;
  },
  async write(key, value) {
    await Session.updateOne({ _id: key }, { value, updatedAt: new Date() }, { upsert: true });
  },
  async delete(key) {
    await Session.deleteOne({ _id: key });
  },
};

module.exports = { Session, mongoSessionStorage };
