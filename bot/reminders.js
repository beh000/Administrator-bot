// Напоминания и учёт явки: отправка (вызывается кроном) и кнопки
// «✅ Приду» (клиент) и «Пришёл / Не пришёл» (мастер).
const { Composer, InlineKeyboard } = require('grammy');
const { Master, Booking } = require('../models');
const { t } = require('../locales');
const { now: nowTz, local } = require('../utils/time');
const r = require('../services/reminders');
const { alert, esc, fmtDay, fmtTime } = require('./ui');
const { sendTo } = require('./notify');
const { listText } = require('./master/bookings');

const composer = new Composer();

const tr = (lang) => (key, params) => t(lang, key, params);

// «сегодня» / «завтра» / «Пн, 12.10» — на языке получателя
function when(lang, date) {
  const key = local(date).format('YYYY-MM-DD');
  if (key === nowTz().format('YYYY-MM-DD')) return t(lang, 'rem.today');
  if (key === nowTz().add(1, 'day').format('YYYY-MM-DD')) return t(lang, 'rem.tomorrow');
  return fmtDay(tr(lang), date);
}

// --- Клиенту: за 24 часа и за 2 часа ---

async function sendClientReminder(api, b, kind) {
  const client = b.clientId;
  const master = b.masterId;
  if (!client || !master) return;
  const lang = client.language;
  const params = {
    when: when(lang, b.start),
    time: fmtTime(b.start),
    service: esc(b.serviceTitle),
    master: esc(master.name),
    phone: esc(master.phone),
  };
  const kb = new InlineKeyboard();
  if (!b.clientConfirmed) kb.text(t(lang, 'rem.comeBtn'), `rm:ok:${b._id}`);
  // перенос и отмена — только пока до записи больше 2 часов
  if (kind === 'dayBefore') {
    kb.row().text(t(lang, 'client.rescheduleBtn'), `c:rs:${b._id}`).text(t(lang, 'client.cancelBtn'), `c:cx:${b._id}`);
  }
  await sendTo(api, client.telegramId, lang, kind === 'dayBefore' ? 'rem.dayBefore' : 'rem.twoHours', params, {
    reply_markup: kb,
  });
}

// --- Мастеру: клиент не подтвердил; клиент пришёл? ---

async function sendUnconfirmedWarning(api, b) {
  const master = b.masterId;
  const client = b.clientId;
  if (!master || !client) return;
  const lang = master.language;
  await sendTo(api, master.telegramId, lang, 'rem.unconfirmed', {
    client: esc(client.name),
    phone: esc(client.phone),
    service: esc(b.serviceTitle),
    when: when(lang, b.start),
    time: fmtTime(b.start),
  });
}

async function sendAttendanceQuestion(api, b) {
  const master = b.masterId;
  const client = b.clientId;
  if (!master || !client) return;
  const lang = master.language;
  const kb = new InlineKeyboard().text(t(lang, 'att.yes'), `att:yes:${b._id}`).text(t(lang, 'att.no'), `att:no:${b._id}`);
  await sendTo(
    api,
    master.telegramId,
    lang,
    'att.ask',
    {
      client: esc(client.name),
      phone: esc(client.phone),
      service: esc(b.serviceTitle),
      date: fmtDay(tr(lang), b.start),
      time: fmtTime(b.start),
    },
    { reply_markup: kb },
  );
}

// Один проход крона (каждые 5 минут)
async function runReminders(api, now = new Date()) {
  let sent = 0;
  const { dayBefore, twoHours } = await r.dueClientReminders(now);
  for (const b of twoHours) {
    // первое напоминание уже не нужно — помечаем оба
    // eslint-disable-next-line no-await-in-loop
    if (await r.claim(b._id, ['twoHours', 'dayBefore'])) {
      // eslint-disable-next-line no-await-in-loop
      await sendClientReminder(api, b, 'twoHours');
      sent += 1;
    }
  }
  for (const b of dayBefore) {
    // eslint-disable-next-line no-await-in-loop
    if (await r.claim(b._id, ['dayBefore'])) {
      // eslint-disable-next-line no-await-in-loop
      await sendClientReminder(api, b, 'dayBefore');
      sent += 1;
    }
  }
  for (const b of await r.dueUnconfirmedWarnings(now)) {
    // eslint-disable-next-line no-await-in-loop
    if (await r.claim(b._id, ['unconfirmedWarning'])) {
      // eslint-disable-next-line no-await-in-loop
      await sendUnconfirmedWarning(api, b);
      sent += 1;
    }
  }
  for (const b of await r.dueAttendanceQuestions(now)) {
    // eslint-disable-next-line no-await-in-loop
    if (await r.claim(b._id, ['attendanceAsked'])) {
      // eslint-disable-next-line no-await-in-loop
      await sendAttendanceQuestion(api, b);
      sent += 1;
    }
  }
  if (sent) console.log(`[reminders] Отправлено сообщений: ${sent}`);
  return sent;
}

// Утреннее расписание мастерам (08:00 по Ташкенту) — только тем, у кого сегодня есть записи
async function sendMorningDigest(api) {
  const from = nowTz().startOf('day').toDate();
  const to = nowTz().startOf('day').add(1, 'day').toDate();
  const masterIds = await Booking.distinct('masterId', {
    status: { $in: Booking.ACTIVE_STATUSES },
    start: { $gte: from, $lt: to },
  });
  for (const id of masterIds) {
    // eslint-disable-next-line no-await-in-loop
    const master = await Master.findOne({ _id: id, registered: true });
    if (!master) continue;
    const lang = master.language;
    // eslint-disable-next-line no-await-in-loop
    const list = await listText({ t: tr(lang) }, master._id, 'today');
    // eslint-disable-next-line no-await-in-loop
    await sendTo(api, master.telegramId, lang, 'rem.morning', { list });
  }
  if (masterIds.length) console.log(`[reminders] Утреннее расписание: ${masterIds.length} мастер(ов)`);
}

// --- Кнопки ---

// Клиент: «✅ Приду»
composer.callbackQuery(/^rm:ok:([0-9a-f]{24})$/, async (ctx) => {
  const ok = await r.confirmAttendanceByClient(ctx.match[1], ctx.user._id);
  if (!ok) return alert(ctx, ctx.t('rem.alreadyHandled'));
  await ctx.answerCallbackQuery({ text: ctx.t('rem.thanks') }).catch(() => {});
  // убираем «Приду» из сообщения, остальные кнопки оставляем
  const rows = (ctx.callbackQuery.message?.reply_markup?.inline_keyboard || [])
    .map((row) => row.filter((b) => !String(b.callback_data).startsWith('rm:ok:')))
    .filter((row) => row.length);
  const text = ctx.callbackQuery.message?.text;
  if (text) {
    await ctx
      .editMessageText(`${esc(text)}\n\n${ctx.t('rem.confirmedMark')}`, { reply_markup: { inline_keyboard: rows } })
      .catch(() => {});
  }
  return undefined;
});

// Мастер: «Пришёл» / «Не пришёл»
composer.callbackQuery(/^att:(yes|no):([0-9a-f]{24})$/, async (ctx) => {
  if (!ctx.master) return alert(ctx, ctx.t('common.staleButton'));
  const came = ctx.match[1] === 'yes';
  const { booking, noShows, client } = await r.markAttendance(ctx.match[2], ctx.master._id, came);
  if (!booking) return alert(ctx, ctx.t('rem.alreadyHandled'));

  const lines = [ctx.callbackQuery.message?.text ? esc(ctx.callbackQuery.message.text) : '', ctx.t(came ? 'att.markCompleted' : 'att.markNoShow')];
  // после второй неявки — предоплата для этого клиента обязательна (если у мастера заданы реквизиты)
  const pp = ctx.master.prepayment;
  if (!came && noShows >= 2 && !pp.enabled && pp.cardNumber && pp.amount > 0) {
    lines.push('', ctx.t('att.prepayNow', { client: esc(client?.name), count: noShows }));
  }
  await ctx.editMessageText(lines.filter(Boolean).join('\n\n'), { reply_markup: { inline_keyboard: [] } }).catch(() => {});
  return undefined;
});

module.exports = { composer, runReminders, sendMorningDigest };
