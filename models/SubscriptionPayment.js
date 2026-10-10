const { Schema, model, Types } = require('mongoose');

const subscriptionPaymentSchema = new Schema({
  masterId: { type: Types.ObjectId, ref: 'Master', required: true },
  amount: { type: Number, required: true },
  screenshotFileId: String,
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

subscriptionPaymentSchema.index({ status: 1, createdAt: 1 });

module.exports = model('SubscriptionPayment', subscriptionPaymentSchema);
