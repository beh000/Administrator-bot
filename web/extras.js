// Остальное, что мастер умеет в боте: фото работ, проверка предоплаты клиента,
// подписка (оплата со скриншотом), QR-код, приглашение мастеров, отзывы.
// Картинки хранятся в Telegram (file_id), как и в боте.
const { InputFile } = require('grammy');
const QRCode = require('qrcode');
const { Master, Booking, Client, SubscriptionPayment } = require('../models');
const { config } = require('../config');
const { t } = require('../locales');
const { masterLink } = require('../utils/ids');
const { reviewPayment } = require('../services/payments');
const { daysLeft, submitSubscriptionPayment, PERIOD_DAYS } = require('../services/subscription');
const { REFERRAL_TRIAL_BONUS_DAYS, REFERRAL_REWARD_DAYS, referralStats } = require('../services/referral');
const { notifyPayment } = require('../bot/master/clientNotify');
const { sendToAdmin } = require('../bot/master/subscription');
const { esc, fmtDay } = require('../bot/ui');

const MAX_PHOTOS = 6;

// --- Файлы Telegram ---

// Загрузить картинку в Telegram и получить file_id: отправляем мастеру без звука
// и сразу удаляем сообщение — file_id остаётся рабочим
async function uploadImage(api, chatId, file) {
  const msg = await api.sendPhoto(chatId, new InputFile(file.buffer, 'photo.jpg'), { disable_notification: true });
  const fileId = msg.photo[msg.photo.length - 1].file_id;
  await api.deleteMessage(chatId, msg.message_id).catch(() => {});
  return fileId;
}

// Скачать файл из Telegram (с небольшим кэшем в памяти)
const cache = new Map();
const CACHE_MAX = 60;
const CACHE_TTL = 3600_000;
async function downloadImage(api, fileId) {
  const hit = cache.get(fileId);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit;
  const file = await api.getFile(fileId);
  let buffer;
  if (typeof api.downloadFileBuffer === 'function') {
    buffer = await api.downloadFileBuffer(file.file_path); // для тестов
  } else {
    const res = await fetch(`https://api.telegram.org/file/bot${api.token}/${file.file_path}`);
    if (!res.ok) throw new Error(`Telegram file ${res.status}`);
    buffer = Buffer.from(await res.arrayBuffer());
  }
  const type = /\.png$/i.test(file.file_path) ? 'image/png' : 'image/jpeg';
  const entry = { binary: buffer, type, at: Date.now() };
  cache.set(fileId, entry);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  return entry;
}

module.exports = function registerExtras(route, fail) {
  const needImage = (body) => {
    if (!body.file?.buffer?.length) fail(400, 'need_image');
    return body.file;
  };
  const uploadOrFail = async (api, master, file) => {
    try {
      return await uploadImage(api, master.telegramId, file);
    } catch (err) {
      console.error('[web] Не удалось загрузить фото в Telegram:', err.description || err.message);
      return fail(502, 'upload_failed');
    }
  };

  // --- Фото работ ---
  route('GET', /^\/api\/photos\/([0-5])$/, async ({ master, params, api }) => {
    const fileId = master.photos[Number(params[0])];
    if (!fileId) fail(404, 'not_found');
    return downloadImage(api, fileId);
  });

  route('POST', /^\/api\/photos$/, async ({ master, body, api }) => {
    const file = needImage(body);
    if (master.photos.length >= MAX_PHOTOS) fail(400, 'photo_limit');
    const fileId = await uploadOrFail(api, master, file);
    // атомарно и не больше MAX_PHOTOS — несколько фото могут прийти одновременно
    const res = await Master.updateOne(
      { _id: master._id, [`photos.${MAX_PHOTOS - 1}`]: { $exists: false } },
      { $push: { photos: fileId } },
    );
    if (!res.modifiedCount) fail(400, 'photo_limit');
    const fresh = await Master.findById(master._id, { photos: 1 });
    return { photos: fresh.photos.length };
  });

  route('POST', /^\/api\/photos\/([0-5])\/delete$/, async ({ master, params }) => {
    const fileId = master.photos[Number(params[0])];
    if (!fileId) fail(404, 'not_found');
    await Master.updateOne({ _id: master._id }, { $pull: { photos: fileId } });
    return { photos: master.photos.length - 1 };
  });

  // --- Предоплата клиента: скриншот и решение мастера ---
  route('GET', /^\/api\/bookings\/([0-9a-f]{24})\/screenshot$/, async ({ master, params, api }) => {
    const b = await Booking.findOne({ _id: params[0], masterId: master._id }, { paymentScreenshotFileId: 1 });
    if (!b?.paymentScreenshotFileId) fail(404, 'not_found');
    return downloadImage(api, b.paymentScreenshotFileId);
  });

  route('POST', /^\/api\/bookings\/([0-9a-f]{24})\/payment$/, async ({ master, params, body, api }) => {
    const approved = body.approved === true;
    const booking = await reviewPayment(params[0], master._id, approved);
    if (!booking) fail(409, 'already_handled');
    const client = await Client.findById(booking.clientId);
    await notifyPayment(api, master, client, booking, approved);
    return { ok: true, status: booking.status };
  });

  // --- Подписка ---
  route('GET', /^\/api\/subscription$/, async ({ master }) => {
    const { status, paidUntil } = master.subscription || {};
    const pending = await SubscriptionPayment.exists({ masterId: master._id, status: 'pending' });
    return {
      status,
      paidUntil,
      daysLeft: Math.max(0, daysLeft(paidUntil)),
      price: config.SUB_PRICE,
      periodDays: PERIOD_DAYS,
      card: config.SUB_CARD || '',
      cardHolder: config.SUB_CARD_NAME || '',
      pending: Boolean(pending),
    };
  });

  route('POST', /^\/api\/subscription\/pay$/, async ({ master, body, api }) => {
    const file = needImage(body);
    if (!config.SUB_CARD) fail(400, 'no_card');
    const fileId = await uploadOrFail(api, master, file);
    const payment = await submitSubscriptionPayment(master._id, config.SUB_PRICE, fileId);
    await sendToAdmin(api, master, payment);
    return { ok: true, pending: true };
  });

  // --- Ссылка, QR, текст для Instagram ---
  route('GET', /^\/api\/qr$/, async ({ master, botUsername }) => {
    const png = await QRCode.toBuffer(masterLink(botUsername, master.slug), { width: 800, margin: 2, errorCorrectionLevel: 'M' });
    return { binary: png, type: 'image/png' };
  });

  // QR отдельным сообщением в чат с ботом — чтобы сохранить, переслать, распечатать
  route('POST', /^\/api\/qr\/send$/, async ({ master, botUsername, api }) => {
    const link = masterLink(botUsername, master.slug);
    const png = await QRCode.toBuffer(link, { width: 800, margin: 2, errorCorrectionLevel: 'M' });
    const lang = master.language || 'ru';
    await api.sendPhoto(master.telegramId, new InputFile(png, 'qr.png'), {
      caption: t(lang, 'link.qrCaption', { name: esc(master.name), link }),
      parse_mode: 'HTML',
    });
    return { ok: true };
  });

  route('GET', /^\/api\/promo$/, async ({ master, botUsername }) => {
    const link = masterLink(botUsername, master.slug);
    const lang = master.language || 'ru';
    return { link, promo: t(lang, 'link.promo', { name: master.name, link }) };
  });

  // --- Пригласить мастера ---
  route('GET', /^\/api\/referral$/, async ({ master, botUsername }) => {
    const link = `https://t.me/${botUsername}?start=r_${master.slug}`;
    const { joined, paid } = await referralStats(master._id);
    const lang = master.language || 'ru';
    const shareText = t(lang, 'ref.shareText', { days: config.TRIAL_DAYS + REFERRAL_TRIAL_BONUS_DAYS });
    return {
      link,
      joined,
      paid,
      bonus: REFERRAL_TRIAL_BONUS_DAYS,
      reward: REFERRAL_REWARD_DAYS,
      trialDays: config.TRIAL_DAYS + REFERRAL_TRIAL_BONUS_DAYS,
      shareUrl: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`,
    };
  });

  // --- Отзывы ---
  route('GET', /^\/api\/reviews$/, async ({ master }) => {
    const list = await Booking.find({ masterId: master._id, 'review.rating': { $exists: true } })
      .sort({ 'review.at': -1 })
      .limit(50)
      .populate('clientId', 'name');
    const { sum = 0, count = 0 } = master.rating || {};
    const lang = master.language || 'ru';
    return {
      avg: count ? Math.round((sum / count) * 10) / 10 : null,
      count,
      items: list.map((b) => ({
        rating: b.review.rating,
        comment: b.review.comment || '',
        client: b.clientId?.name || '—',
        date: fmtDay((k, p) => t(lang, k, p), b.review.at || b.start),
      })),
    };
  });
};

module.exports.uploadImage = uploadImage;
module.exports.downloadImage = downloadImage;
