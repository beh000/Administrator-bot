// Мастер управляет записями сам: карточка записи, отмена, перенос,
// ручная запись клиента (звонок, личка) и закрытие времени.
const { Composer, InlineKeyboard } = require('grammy');
const { Booking } = require('../../models');
const { t } = require('../../locales');
const { atLocal, local, now: nowTz, hhmmToMin } = require('../../utils/time');
const { parseName, parsePhone, parseTimeRange } = require('../../utils/validate');
const { availableDates, freeSlots } = require('../../services/slots');
const { createManualBooking, createBlock, cancelByMaster, moveByMaster } = require('../../services/booking');
const { defineStep, setStep, clearStep } = require('../steps');
const { show, prompt, alert, esc, fmtMoney, fmtDay, fmtTime } = require('../ui');
const { sendTo } = require('../notify');
const { clientOf, showList } = require('./bookings');

const composer = new Composer();

const backToList = (ctx) => `bk:${ctx.session.bkRange || 'today'}`;
const ymd = (key) => key.replace(/-/g, '');
const fromYmd = (s) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;

async function findOwn(ctx, id) {
  return Booking.findOne({ _id: id, masterId: ctx.master._id }).populate('clientId');
}

function dateLabel(ctx, dateKey) {
  if (dateKey === nowTz().format('YYYY-MM-DD')) return ctx.t('client.today');
  if (dateKey === nowTz().add(1, 'day').format('YYYY-MM-DD')) return ctx.t('client.tomorrow');
  return fmtDay(ctx.t, atLocal(dateKey));
}

// --- Карточка записи ---

async function showCard(ctx, id) {
  clearStep(ctx);
  const b = await findOwn(ctx, id);
  if (!b) return showList(ctx, ctx.session.bkRange || 'today');
  const active = Booking.ACTIVE_STATUSES.includes(b.status) && b.end > new Date();
  const kb = new InlineKeyboard();
  let text;
  if (b.kind === 'block') {
    text = ctx.t('mb.blockCard', { date: fmtDay(ctx.t, b.start), start: fmtTime(b.start), end: fmtTime(b.end) });
    if (active) kb.text(ctx.t('mb.unblockBtn'), `mb:cy:${b._id}`).row();
  } else {
    const client = clientOf(b);
    text = ctx.t('mb.card', {
      client: esc(client.name || '—'),
      phone: esc(client.phone || '—'),
      service: esc(b.serviceTitle),
      date: fmtDay(ctx.t, b.start),
      time: fmtTime(b.start),
      price: fmtMoney(b.price),
      status: ctx.t(`status.${b.status}`),
      source: ctx.t(b.clientId ? 'mb.sourceBot' : 'mb.sourceManual'),
    });
    if (b.prepaymentAmount > 0 && ['payment_review', 'confirmed'].includes(b.status)) {
      text += `\n${ctx.t('client.cardPrepaid', { amount: fmtMoney(b.prepaymentAmount) })}`;
    }
    if (active && b.status === 'confirmed') kb.text(ctx.t('client.rescheduleBtn'), `mb:mv:${b._id}`).row();
    if (active) kb.text(ctx.t('client.cancelBtn'), `mb:cx:${b._id}`).row();
  }
  kb.text(ctx.t('common.back'), backToList(ctx));
  return show(ctx, text, kb);
}

composer.callbackQuery(/^mb:v:([0-9a-f]{24})$/, (ctx) => showCard(ctx, ctx.match[1]));

// --- Отмена мастером ---

composer.callbackQuery(/^mb:cx:([0-9a-f]{24})$/, async (ctx) => {
  const b = await findOwn(ctx, ctx.match[1]);
  if (!b) return showList(ctx, ctx.session.bkRange || 'today');
  const kb = new InlineKeyboard()
    .text(ctx.t('client.cancelYes'), `mb:cy:${b._id}`)
    .row()
    .text(ctx.t('client.cancelNo'), `mb:v:${b._id}`);
  const key = b.clientId ? 'mb.cancelAskBot' : 'mb.cancelAsk';
  return show(ctx, ctx.t(key, { client: esc(clientOf(b).name || '—'), date: fmtDay(ctx.t, b.start), time: fmtTime(b.start) }), kb);
});

composer.callbackQuery(/^mb:cy:([0-9a-f]{24})$/, async (ctx) => {
  const b = await cancelByMaster(ctx.match[1], ctx.master._id);
  if (!b) return alert(ctx, ctx.t('rem.alreadyHandled'));
  await ctx.answerCallbackQuery({ text: ctx.t(b.kind === 'block' ? 'mb.unblocked' : 'mb.cancelled') }).catch(() => {});
  // клиенту из бота — сообщение на его языке
  if (b.clientId?.telegramId) {
    const lang = b.clientId.language;
    const paid = b.prepaymentAmount > 0 ? `\n\n${t(lang, 'mb.clientRefundNote')}` : '';
    await sendTo(
      ctx.api,
      b.clientId.telegramId,
      lang,
      'mb.clientCancelled',
      {
        master: esc(ctx.master.name),
        phone: esc(ctx.master.phone),
        service: esc(b.serviceTitle),
        date: fmtDay((k) => t(lang, k), b.start),
        time: fmtTime(b.start),
      },
      { append: paid },
    );
  }
  return showList(ctx, ctx.session.bkRange || 'today');
});

// --- Выбор дня и времени (общий для новой записи и переноса) ---
// ctx.session.mb = { mode: 'new' | 'move', service: {id,title,durationMin,price}, bookingId? }

async function showDates(ctx) {
  const { service, bookingId } = ctx.session.mb;
  const dates = await availableDates(ctx.master, service, { forMaster: true, excludeBookingId: bookingId });
  const kb = new InlineKeyboard();
  dates.forEach((d, i) => {
    kb.text(dateLabel(ctx, d), `mb:d:${ymd(d)}`);
    if (i % 3 === 2) kb.row();
  });
  kb.row().text(ctx.t('common.cancel'), backToList(ctx));
  const text = dates.length ? ctx.t('mb.chooseDate', { service: esc(service.title) }) : ctx.t('mb.noDates');
  return show(ctx, text, kb);
}

composer.callbackQuery(/^mb:d:(\d{8})$/, async (ctx) => {
  if (!ctx.session.mb) return showList(ctx, ctx.session.bkRange || 'today');
  const dateKey = fromYmd(ctx.match[1]);
  const { service, bookingId } = ctx.session.mb;
  const slots = await freeSlots(ctx.master, service, dateKey, { forMaster: true, excludeBookingId: bookingId });
  const kb = new InlineKeyboard();
  slots.forEach((s, i) => {
    kb.text(fmtTime(s.start), `mb:t:${Math.round(s.start.getTime() / 60_000)}`);
    if (i % 4 === 3) kb.row();
  });
  kb.row().text(ctx.t('common.back'), ctx.session.mb.mode === 'new' ? `mb:s:${service.id}` : `mb:mv:${bookingId}`);
  const text = slots.length ? ctx.t('client.chooseTime', { service: esc(service.title), date: dateLabel(ctx, dateKey) }) : ctx.t('client.noTimes');
  return show(ctx, text, kb);
});

composer.callbackQuery(/^mb:t:(\d+)$/, async (ctx) => {
  const mb = ctx.session.mb;
  if (!mb) return showList(ctx, ctx.session.bkRange || 'today');
  const start = new Date(Number(ctx.match[1]) * 60_000);
  mb.start = start.toISOString();
  if (mb.mode === 'new') {
    setStep(ctx, 'mb_name');
    return prompt(ctx, ctx.t('mb.askName', { date: fmtDay(ctx.t, start), time: fmtTime(start) }), backToList(ctx));
  }
  // перенос — подтверждение
  const kb = new InlineKeyboard()
    .text(ctx.t('mb.moveConfirmBtn'), `mb:mok:${ctx.match[1]}`)
    .row()
    .text(ctx.t('common.back'), `mb:d:${local(start).format('YYYYMMDD')}`);
  return show(ctx, ctx.t('mb.moveConfirm', { date: fmtDay(ctx.t, start), time: fmtTime(start) }), kb);
});

// --- Новая запись вручную: услуга → день → время → имя → телефон ---

composer.callbackQuery('mb:new', (ctx) => {
  clearStep(ctx);
  const services = ctx.master.activeServices();
  if (!services.length) return alert(ctx, ctx.t('reg.needService'));
  const kb = new InlineKeyboard();
  services.forEach((s) => kb.text(ctx.t('client.serviceBtn', { title: s.title, duration: s.durationMin, price: fmtMoney(s.price) }), `mb:s:${s.id}`).row());
  kb.text(ctx.t('common.cancel'), backToList(ctx));
  return show(ctx, ctx.t('mb.chooseService'), kb);
});

composer.callbackQuery(/^mb:s:(\w+)$/, (ctx) => {
  const s = ctx.master.activeServices().find((x) => x.id === ctx.match[1]);
  if (!s) return alert(ctx, ctx.t('common.staleButton'));
  ctx.session.mb = { mode: 'new', service: { id: s.id, title: s.title, durationMin: s.durationMin, price: s.price } };
  return showDates(ctx);
});

defineStep(
  'mb_name',
  (ctx) => {
    if (!ctx.session.mb) {
      clearStep(ctx);
      return showList(ctx, ctx.session.bkRange || 'today');
    }
    const name = parseName(ctx.message?.text, 48);
    if (!name) return ctx.reply(ctx.t('reg.badName'));
    ctx.session.mb.name = name;
    setStep(ctx, 'mb_phone');
    const kb = new InlineKeyboard().text(ctx.t('mb.skipPhone'), 'mb:nophone');
    return ctx.reply(ctx.t('mb.askPhone'), { reply_markup: kb });
  },
  { master: true },
);

async function finishManual(ctx, phone) {
  const mb = ctx.session.mb;
  clearStep(ctx);
  if (!mb?.start || !mb.name) return showList(ctx, ctx.session.bkRange || 'today');
  const service = ctx.master.services.find((s) => s.id === mb.service.id) || mb.service;
  const result = await createManualBooking({ master: ctx.master, service, start: new Date(mb.start), name: mb.name, phone });
  ctx.session.mb = null;
  if (!result.ok) return ctx.reply(ctx.t('client.slotTaken'));
  const b = result.booking;
  await ctx.reply(ctx.t('mb.created', { client: esc(b.manualName), service: esc(b.serviceTitle), date: fmtDay(ctx.t, b.start), time: fmtTime(b.start) }));
  ctx.session.bkRange = b.start < nowTz().startOf('day').add(1, 'day').toDate() ? 'today' : 'week';
  return showList(ctx, ctx.session.bkRange);
}

defineStep(
  'mb_phone',
  (ctx) => {
    const phone = parsePhone(ctx.message?.text);
    if (!phone) return ctx.reply(ctx.t('reg.badPhone'));
    return finishManual(ctx, phone);
  },
  { master: true },
);

composer.callbackQuery('mb:nophone', (ctx) => finishManual(ctx, null));

// --- Перенос мастером ---

composer.callbackQuery(/^mb:mv:([0-9a-f]{24})$/, async (ctx) => {
  const b = await findOwn(ctx, ctx.match[1]);
  if (!b || b.kind !== 'booking' || b.status !== 'confirmed') return showCard(ctx, ctx.match[1]);
  ctx.session.mb = {
    mode: 'move',
    bookingId: String(b._id),
    service: { id: b.serviceId, title: b.serviceTitle, durationMin: b.durationMin, price: b.price },
  };
  return showDates(ctx);
});

composer.callbackQuery(/^mb:mok:(\d+)$/, async (ctx) => {
  const mb = ctx.session.mb;
  if (!mb || mb.mode !== 'move') return showList(ctx, ctx.session.bkRange || 'today');
  const result = await moveByMaster({ master: ctx.master, bookingId: mb.bookingId, start: new Date(Number(ctx.match[1]) * 60_000) });
  ctx.session.mb = null;
  if (!result.ok) return alert(ctx, ctx.t(result.reason === 'slot_taken' ? 'client.slotTaken' : 'rem.alreadyHandled'));
  const { booking: b, oldStart } = result;
  await ctx.answerCallbackQuery({ text: ctx.t('mb.moved') }).catch(() => {});
  if (b.clientId?.telegramId) {
    const lang = b.clientId.language;
    await sendTo(ctx.api, b.clientId.telegramId, lang, 'mb.clientMoved', {
      master: esc(ctx.master.name),
      phone: esc(ctx.master.phone),
      service: esc(b.serviceTitle),
      oldDate: fmtDay((k) => t(lang, k), oldStart),
      oldTime: fmtTime(oldStart),
      date: fmtDay((k) => t(lang, k), b.start),
      time: fmtTime(b.start),
    });
  }
  return showCard(ctx, String(b._id));
});

// --- Закрыть время: день → интервал ---

composer.callbackQuery('mb:block', (ctx) => {
  clearStep(ctx);
  const kb = new InlineKeyboard();
  for (let i = 0; i < 14; i += 1) {
    const key = nowTz().add(i, 'day').format('YYYY-MM-DD');
    kb.text(dateLabel(ctx, key), `mb:bd:${ymd(key)}`);
    if (i % 3 === 2) kb.row();
  }
  kb.row().text(ctx.t('common.cancel'), backToList(ctx));
  return show(ctx, ctx.t('mb.blockChooseDate'), kb);
});

composer.callbackQuery(/^mb:bd:(\d{8})$/, (ctx) => {
  const dateKey = fromYmd(ctx.match[1]);
  setStep(ctx, 'mb_block_range', { blockDate: dateKey });
  return prompt(ctx, ctx.t('mb.blockAskRange', { date: dateLabel(ctx, dateKey) }), 'mb:block');
});

defineStep(
  'mb_block_range',
  async (ctx) => {
    const range = parseTimeRange(ctx.message?.text);
    if (!range) return ctx.reply(ctx.t('sch.badRange'));
    const { blockDate } = ctx.session.data;
    const start = atLocal(blockDate, hhmmToMin(range.start)).toDate();
    const end = atLocal(blockDate, hhmmToMin(range.end)).toDate();
    if (end <= new Date()) return ctx.reply(ctx.t('mb.blockPast'));
    const result = await createBlock({ master: ctx.master, start, end });
    if (!result.ok) {
      const list = result.conflicts
        .map((b) => (b.kind === 'block' ? ctx.t('bk.blockLine', { start: fmtTime(b.start), end: fmtTime(b.end) }) : `${fmtTime(b.start)}–${fmtTime(b.end)} · ${esc(clientOf(b).name || '—')}`))
        .join('\n');
      return ctx.reply(ctx.t('mb.blockConflict', { list }));
    }
    clearStep(ctx);
    await ctx.reply(ctx.t('mb.blocked', { date: dateLabel(ctx, blockDate), start: range.start, end: range.end }));
    ctx.session.bkRange = blockDate === nowTz().format('YYYY-MM-DD') ? 'today' : 'week';
    return showList(ctx, ctx.session.bkRange);
  },
  { master: true },
);

module.exports = { composer };
