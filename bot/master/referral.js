// «🎁 Пригласить мастера»: ссылка-приглашение, кнопка «Поделиться», статистика
const { Composer, InlineKeyboard } = require('grammy');
const { Master } = require('../../models');
const { config } = require('../../config');
const { REFERRAL_TRIAL_BONUS_DAYS, REFERRAL_REWARD_DAYS, referralStats } = require('../../services/referral');
const { show, esc } = require('../ui');

const composer = new Composer();

const inviteLink = (ctx, slug) => `https://t.me/${ctx.me.username}?start=r_${slug}`;

async function showInvite(ctx) {
  const link = inviteLink(ctx, ctx.master.slug);
  const { joined, paid } = await referralStats(ctx.master._id);
  const shareText = ctx.t('ref.shareText', { days: config.TRIAL_DAYS + REFERRAL_TRIAL_BONUS_DAYS });
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`;
  const kb = new InlineKeyboard().url(ctx.t('ref.shareBtn'), shareUrl).row().text(ctx.t('common.back'), 'nav:home');
  return show(
    ctx,
    ctx.t('ref.screen', { link, bonus: REFERRAL_TRIAL_BONUS_DAYS, reward: REFERRAL_REWARD_DAYS, joined, paid }),
    kb,
  );
}

composer.callbackQuery('ref:show', (ctx) => showInvite(ctx));

// Человек пришёл по приглашению (ещё не мастер)
async function showInvited(ctx) {
  const referrer = await Master.findOne({ slug: ctx.session.ref, registered: true }, { name: 1 });
  const kb = new InlineKeyboard().text(ctx.t('role.master'), 'role:master').row().text(ctx.t('role.client'), 'role:client');
  const text = referrer
    ? ctx.t('ref.invited', { name: esc(referrer.name), days: config.TRIAL_DAYS + REFERRAL_TRIAL_BONUS_DAYS })
    : ctx.t('role.choose');
  return show(ctx, text, kb, { fresh: true });
}

module.exports = { composer, showInvited };
