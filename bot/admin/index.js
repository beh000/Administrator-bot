// Админ (только ADMIN_ID): статистика, оплаты подписок, /extend, /broadcast
const { Composer, InlineKeyboard } = require('grammy');
const { Master, Booking, Client, SubscriptionPayment } = require('../../models');
const { config } = require('../../config');
const { t } = require('../../locales');
const { local } = require('../../utils/time');
const { extendSubscription, reviewSubscriptionPayment } = require('../../services/subscription');
const { defineStep, setStep, clearStep } = require('../steps');
const { show, prompt, alert, esc } = require('../ui');
const { sendTo } = require('../notify');

const composer = new Composer();
const admin = composer.filter((ctx) => !!config.ADMIN_ID && ctx.from?.id === config.ADMIN_ID);

const fmtDate = (d) => (d ? local(d).format('DD.MM.YYYY') : '—');

async function showMenu(ctx, opts = {}) {
  clearStep(ctx);
  const pending = await SubscriptionPayment.countDocuments({ status: 'pending' });
  const kb = new InlineKeyboard()
    .text(ctx.t('admin.statsBtn'), 'ad:stats')
    .text(ctx.t('admin.mastersBtn'), 'ad:masters')
    .row()
    .text(ctx.t('admin.pendingBtn', { n: pending }), 'ad:pend');
  return show(ctx, ctx.t('admin.menu'), kb, opts);
}

admin.command('admin', (ctx) => showMenu(ctx, { fresh: true }));
admin.callbackQuery('ad:menu', (ctx) => showMenu(ctx));

// --- Статистика ---
admin.callbackQuery('ad:stats', async (ctx) => {
  const now = Date.now();
  const since = (days) => new Date(now - days * 864e5);
  const count = (filter) => Master.countDocuments({ registered: true, ...filter });
  const [total, trial, active, expired, b7, b30, done7, done30, users, users7, bookers] = await Promise.all([
    count({}),
    count({ 'subscription.status': 'trial' }),
    count({ 'subscription.status': 'active' }),
    count({ 'subscription.status': 'expired' }),
    Booking.countDocuments({ kind: { $ne: 'block' }, createdAt: { $gte: since(7) } }),
    Booking.countDocuments({ kind: { $ne: 'block' }, createdAt: { $gte: since(30) } }),
    Booking.countDocuments({ kind: { $ne: 'block' }, createdAt: { $gte: since(7) }, status: { $in: ['confirmed', 'completed'] } }),
    Booking.countDocuments({ kind: { $ne: 'block' }, createdAt: { $gte: since(30) }, status: { $in: ['confirmed', 'completed'] } }),
    // пользователи бота: все, кто нажал /start (мастера и клиенты)
    Client.countDocuments({}),
    Client.countDocuments({ createdAt: { $gte: since(7) } }),
    Booking.distinct('clientId', { clientId: { $ne: null } }).then((ids) => ids.length),
  ]);
  const kb = new InlineKeyboard().text(ctx.t('common.back'), 'ad:menu');
  return show(ctx, ctx.t('admin.stats', { total, trial, active, expired, b7, b30, done7, done30, users, users7, bookers }), kb);
});

// --- Список мастеров: подписка и активность за 30 дней ---
admin.callbackQuery('ad:masters', async (ctx) => {
  const masters = await Master.find({ registered: true }).sort({ createdAt: -1 }).limit(40).lean();
  const since = new Date(Date.now() - 30 * 864e5);
  const counts = await Booking.aggregate([
    { $match: { kind: { $ne: 'block' }, createdAt: { $gte: since } } },
    { $group: { _id: '$masterId', n: { $sum: 1 } } },
  ]);
  const byMaster = new Map(counts.map((c) => [String(c._id), c.n]));
  const lines = [ctx.t('admin.mastersTitle', { count: masters.length }), ''];
  masters.forEach((m) => {
    lines.push(
      ctx.t('admin.masterLine', {
        name: esc(m.name),
        phone: esc(m.phone || ''),
        slug: m.slug,
        status: ctx.t(`sub.status.${m.subscription.status}`),
        until: fmtDate(m.subscription.paidUntil),
        bookings: byMaster.get(String(m._id)) || 0,
      }),
    );
  });
  return show(ctx, lines.join('\n'), new InlineKeyboard().text(ctx.t('common.back'), 'ad:menu'));
});

// --- Ожидающие оплаты подписок ---
admin.callbackQuery('ad:pend', async (ctx) => {
  const payments = await SubscriptionPayment.find({ status: 'pending' }).sort({ createdAt: 1 }).limit(10);
  if (!payments.length) return alert(ctx, ctx.t('admin.noPending'));
  const { sendToAdmin } = require('../master/subscription');
  for (const p of payments) {
    // eslint-disable-next-line no-await-in-loop
    const master = await Master.findById(p.masterId);
    // eslint-disable-next-line no-await-in-loop
    if (master) await sendToAdmin(ctx.api, master, p);
  }
  return undefined;
});

admin.callbackQuery(/^ad:(ok|no):([0-9a-f]{24})$/, async (ctx) => {
  const approved = ctx.match[1] === 'ok';
  const { payment, master, referrer } = await reviewSubscriptionPayment(ctx.match[2], approved);
  if (!payment) return alert(ctx, ctx.t('admin.notPending'));

  const mark = approved
    ? ctx.t('admin.approvedMark', { until: fmtDate(master?.subscription.paidUntil) })
    : ctx.t('admin.rejectedMark');
  const caption = ctx.callbackQuery.message?.caption;
  await ctx
    .editMessageCaption({ caption: caption ? `${esc(caption)}\n\n${mark}` : mark, reply_markup: { inline_keyboard: [] } })
    .catch(() => {});

  if (master) {
    await sendTo(ctx.api, master.telegramId, master.language, approved ? 'sub.approved' : 'sub.rejected', {
      until: fmtDate(master.subscription.paidUntil),
    });
  }
  // приглашённый впервые оплатил — бонус пригласившему
  if (referrer) {
    await sendTo(ctx.api, referrer.telegramId, referrer.language, 'ref.rewarded', {
      name: esc(master?.name),
      until: fmtDate(referrer.subscription.paidUntil),
    });
  }
  return undefined;
});

// --- /extend <мастер> <дни> — мастер по slug, Telegram ID или id в базе ---
async function findMaster(ref) {
  if (/^[0-9a-f]{24}$/.test(ref)) return Master.findById(ref);
  if (/^\d+$/.test(ref)) return Master.findOne({ telegramId: Number(ref) });
  return Master.findOne({ slug: ref.replace(/^m_/, '').toLowerCase() });
}

admin.command('extend', async (ctx) => {
  const [ref, daysRaw] = String(ctx.match || '').trim().split(/\s+/);
  const days = Number(daysRaw);
  if (!ref || !Number.isInteger(days) || days < 1 || days > 3650) return ctx.reply(ctx.t('admin.extendUsage'));
  const found = await findMaster(ref);
  if (!found) return ctx.reply(ctx.t('admin.extendNotFound'));
  const master = await extendSubscription(found._id, days);
  await ctx.reply(ctx.t('admin.extendDone', { name: esc(master.name), days, until: fmtDate(master.subscription.paidUntil) }));
  return sendTo(ctx.api, master.telegramId, master.language, 'sub.extendedByAdmin', {
    days,
    until: fmtDate(master.subscription.paidUntil),
  });
});

// --- /broadcast — рассылка всем мастерам, с предпросмотром ---
admin.command('broadcast', (ctx) => {
  setStep(ctx, 'ad_broadcast');
  return prompt(ctx, ctx.t('admin.bcAsk'), 'ad:bc:no');
});

defineStep('ad_broadcast', (ctx) => {
  if (ctx.from?.id !== config.ADMIN_ID) {
    clearStep(ctx);
    return undefined;
  }
  const text = String(ctx.message?.text || '').trim();
  if (!text) return ctx.reply(ctx.t('admin.bcEmpty'));
  setStep(ctx, 'ad_broadcast_confirm', { broadcast: text });
  const kb = new InlineKeyboard().text(ctx.t('admin.bcYes'), 'ad:bc:yes').text(ctx.t('admin.bcNo'), 'ad:bc:no');
  return ctx.reply(ctx.t('admin.bcPreview', { text: esc(text) }), { reply_markup: kb });
});

admin.callbackQuery('ad:bc:no', (ctx) => {
  clearStep(ctx);
  return show(ctx, ctx.t('admin.bcCancelled'));
});

admin.callbackQuery('ad:bc:yes', async (ctx) => {
  const text = ctx.session.data?.broadcast;
  clearStep(ctx);
  if (!text) return alert(ctx, ctx.t('admin.bcEmpty'));
  await show(ctx, ctx.t('admin.bcSending'));
  const masters = await Master.find({ registered: true }, { telegramId: 1 }).lean();
  let ok = 0;
  let fail = 0;
  for (const m of masters) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await ctx.api.sendMessage(m.telegramId, esc(text));
      ok += 1;
    } catch (err) {
      fail += 1;
    }
    // ~25 сообщений в секунду — с запасом ниже лимита Telegram
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 40));
  }
  console.log(`[admin] Рассылка: доставлено ${ok}, ошибок ${fail}`);
  return ctx.reply(ctx.t('admin.bcDone', { ok, fail }));
});

module.exports = { composer };
