// Реферальная программа мастеров.
// Новый мастер по приглашению получает +14 дней пробного периода.
// Пригласивший получает +30 дней, когда приглашённый впервые оплатит подписку —
// так бонус нельзя «накрутить» фейковыми регистрациями.
const { Master } = require('../models');

const REFERRAL_TRIAL_BONUS_DAYS = 14;
const REFERRAL_REWARD_DAYS = 30;

// Вызывается после одобрения оплаты подписки. Возвращает пригласившего, если он
// получил бонус сейчас (один раз на каждого приглашённого).
async function rewardReferrer(master) {
  if (!master?.referredBy) return null;
  const claimed = await Master.updateOne(
    { _id: master._id, referralRewarded: { $ne: true } },
    { $set: { referralRewarded: true } },
  );
  if (claimed.modifiedCount !== 1) return null;
  const { extendSubscription } = require('./subscription');
  return extendSubscription(master.referredBy, REFERRAL_REWARD_DAYS);
}

async function referralStats(masterId) {
  const [joined, paid] = await Promise.all([
    Master.countDocuments({ referredBy: masterId, registered: true }),
    Master.countDocuments({ referredBy: masterId, referralRewarded: true }),
  ]);
  return { joined, paid };
}

module.exports = { REFERRAL_TRIAL_BONUS_DAYS, REFERRAL_REWARD_DAYS, rewardReferrer, referralStats };
