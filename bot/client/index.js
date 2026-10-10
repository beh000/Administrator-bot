// Запись клиента: ссылка мастера → имя/телефон → услуга → дата → время → подтверждение.
// Контекст записи (к какому мастеру, что переносим) — в ctx.session.booking,
// в кнопках только id услуги, дата и время.
const { Composer, InlineKeyboard, Keyboard } = require('grammy');
const { Master } = require('../../models');
const { atLocal, local, now: nowTz } = require('../../utils/time');
const { t } = require('../../locales');
const { parseName, parsePhone } = require('../../utils/validate');
const { availableDates, freeSlots } = require('../../services/slots');
const { createBooking, needsPrepayment, MAX_UPCOMING_PER_MASTER } = require('../../services/booking');
const { canAcceptBookings } = require('../../services/subscription');
const { defineStep, setStep, clearStep } = require('../steps');
const { show, prompt, alert, esc, fmtMoney, fmtDay, fmtTime, BASE_OPTS } = require('../ui');
const { sendTo } = require('../notify');
const my = require('./my');

const composer = new Composer();

// --- Вход по ссылке мастера ---

async function openMaster(ctx, slug) {
  clearStep(ctx);
  const master = await Master.findOne({ slug, registered: true });
  if (!master) return show(ctx, ctx.t('client.masterNotFound'), undefined, { fresh: true });
  ctx.session.booking = { masterId: String(master._id) };
  return continueBooking(ctx, { fresh: true });
}

async function loadMaster(ctx) {
  const id = ctx.session.booking?.masterId;
  if (!id) return null;
  return Master.findOne({ _id: id, registered: true });
}

async function sessionLost(ctx) {
  return show(ctx, ctx.t('client.sessionLost'), new InlineKeyboard().text(ctx.t('client.myButton'), 'c:my'));
}

function unavailable(ctx, master, opts) {
  return show(ctx, ctx.t('client.unavailable', { name: esc(master.name), phone: esc(master.phone) }), undefined, opts);
}

// Следующий нужный шаг: профиль клиента → услуги (или даты при переносе)
async function continueBooking(ctx, opts = {}) {
  const master = await loadMaster(ctx);
  if (!master) return sessionLost(ctx);
  const { rescheduleFrom } = ctx.session.booking;
  if (!rescheduleFrom && !canAcceptBookings(master)) return unavailable(ctx, master, opts);
  if (!ctx.user.name) return askName(ctx);
  if (!ctx.user.phone) return askPhone(ctx);
  if (rescheduleFrom) {
    const service = master.services.find((s) => s.id === ctx.session.booking.serviceId);
    if (service) return showDates(ctx, master, service, opts);
  }
  return showServices(ctx, master, opts);
}

// --- Профиль: имя и телефон (один раз) ---

function askName(ctx) {
  setStep(ctx, 'cl_name');
  const kb = new InlineKeyboard();
  const tgName = parseName(ctx.from.first_name, 48);
  if (tgName) kb.text(ctx.t('client.useTgName', { name: tgName }), 'c:nm');
  return prompt(ctx, ctx.t('client.askName'), null, kb);
}

async function saveName(ctx, name) {
  ctx.user.name = name;
  await ctx.user.save();
  clearStep(ctx);
  return continueBooking(ctx, { fresh: !ctx.callbackQuery });
}

defineStep('cl_name', (ctx) => {
  const name = parseName(ctx.message?.text, 48);
  if (!name) return ctx.reply(ctx.t('reg.badName'));
  return saveName(ctx, name);
});

composer.callbackQuery('c:nm', (ctx) => {
  const name = parseName(ctx.from.first_name, 48);
  if (!name) return askName(ctx);
  return saveName(ctx, name);
});

function askPhone(ctx) {
  setStep(ctx, 'cl_phone');
  const kb = new Keyboard().requestContact(ctx.t('reg.sharePhone')).resized().oneTime();
  return ctx.reply(ctx.t('client.askPhone'), { ...BASE_OPTS, reply_markup: kb });
}

defineStep('cl_phone', async (ctx) => {
  const contact = ctx.message?.contact;
  const phone = parsePhone(contact ? contact.phone_number : ctx.message?.text);
  if (!phone) return ctx.reply(ctx.t('reg.badPhone'));
  ctx.user.phone = phone;
  await ctx.user.save();
  clearStep(ctx);
  await ctx.reply(ctx.t('client.profileSaved'), { reply_markup: { remove_keyboard: true } });
  return continueBooking(ctx, { fresh: true });
});

// --- Услуга → дата → время → подтверждение ---

function showServices(ctx, master, opts = {}) {
  const services = master.activeServices();
  if (!services.length) {
    return show(ctx, ctx.t('client.noServices', { name: esc(master.name), phone: esc(master.phone) }), undefined, opts);
  }
  const kb = new InlineKeyboard();
  services.forEach((s) => {
    kb.text(ctx.t('client.serviceBtn', { title: s.title, duration: s.durationMin, price: fmtMoney(s.price) }), `c:s:${s.id}`).row();
  });
  kb.text(ctx.t('client.myButton'), 'c:my');
  return show(ctx, ctx.t('client.chooseService', { name: esc(master.name) }), kb, opts);
}

function dateLabel(ctx, dateKey) {
  const today = nowTz().format('YYYY-MM-DD');
  const tomorrow = nowTz().add(1, 'day').format('YYYY-MM-DD');
  if (dateKey === today) return ctx.t('client.today');
  if (dateKey === tomorrow) return ctx.t('client.tomorrow');
  return fmtDay(ctx.t, atLocal(dateKey));
}

function backFromDates(ctx) {
  return ctx.session.booking?.rescheduleFrom ? `c:b:${ctx.session.booking.rescheduleFrom}` : 'c:svc';
}

async function showDates(ctx, master, service, opts = {}) {
  const dates = await availableDates(master, service, { excludeBookingId: ctx.session.booking?.rescheduleFrom });
  const kb = new InlineKeyboard();
  if (!dates.length) {
    kb.text(ctx.t('common.back'), backFromDates(ctx));
    return show(ctx, ctx.t('client.noDates', { service: esc(service.title), phone: esc(master.phone) }), kb, opts);
  }
  dates.forEach((d, i) => {
    kb.text(dateLabel(ctx, d), `c:d:${service.id}:${d.replace(/-/g, '')}`);
    if (i % 3 === 2) kb.row();
  });
  kb.row().text(ctx.t('common.back'), backFromDates(ctx));
  const key = ctx.session.booking?.rescheduleFrom ? 'client.chooseDateReschedule' : 'client.chooseDate';
  return show(ctx, ctx.t(key, { service: esc(service.title) }), kb, opts);
}

async function showTimes(ctx, master, service, dateKey) {
  const slots = await freeSlots(master, service, dateKey, { excludeBookingId: ctx.session.booking?.rescheduleFrom });
  const kb = new InlineKeyboard();
  if (!slots.length) {
    kb.text(ctx.t('common.back'), `c:s:${service.id}`);
    return show(ctx, ctx.t('client.noTimes'), kb);
  }
  slots.forEach((s, i) => {
    kb.text(fmtTime(s.start), `c:t:${service.id}:${Math.round(s.start.getTime() / 60_000)}`);
    if (i % 4 === 3) kb.row();
  });
  kb.row().text(ctx.t('common.back'), `c:s:${service.id}`);
  return show(ctx, ctx.t('client.chooseTime', { service: esc(service.title), date: dateLabel(ctx, dateKey) }), kb);
}

function showConfirm(ctx, master, service, start) {
  const params = {
    master: esc(master.name),
    service: esc(service.title),
    date: fmtDay(ctx.t, start),
    time: fmtTime(start),
    duration: service.durationMin,
    price: fmtMoney(service.price),
  };
  const epochMin = Math.round(start.getTime() / 60_000);
  const day = local(start).format('YYYYMMDD');
  const kb = new InlineKeyboard()
    .text(ctx.t('client.confirmBtn'), `c:ok:${service.id}:${epochMin}`)
    .row()
    .text(ctx.t('common.back'), `c:d:${service.id}:${day}`);
  const key = ctx.session.booking?.rescheduleFrom ? 'client.confirmReschedule' : 'client.confirm';
  return show(ctx, ctx.t(key, params), kb);
}

// Достаёт мастера и услугу для кнопок c:s / c:d / c:t / c:ok
async function resolve(ctx, serviceId) {
  const master = await loadMaster(ctx);
  if (!master) return {};
  // при переносе услуга могла быть отключена — её всё равно можно перенести
  const pool = ctx.session.booking.rescheduleFrom ? master.services : master.activeServices();
  const service = pool.find((s) => s.id === serviceId);
  return { master, service };
}

composer.callbackQuery('c:svc', async (ctx) => {
  const master = await loadMaster(ctx);
  if (!master) return sessionLost(ctx);
  ctx.session.booking.rescheduleFrom = undefined;
  return continueBooking(ctx);
});

composer.callbackQuery(/^c:s:(\w+)$/, async (ctx) => {
  const { master, service } = await resolve(ctx, ctx.match[1]);
  if (!master) return sessionLost(ctx);
  if (!service) return showServices(ctx, master);
  return showDates(ctx, master, service);
});

composer.callbackQuery(/^c:d:(\w+):(\d{4})(\d{2})(\d{2})$/, async (ctx) => {
  const { master, service } = await resolve(ctx, ctx.match[1]);
  if (!master) return sessionLost(ctx);
  if (!service) return showServices(ctx, master);
  return showTimes(ctx, master, service, `${ctx.match[2]}-${ctx.match[3]}-${ctx.match[4]}`);
});

composer.callbackQuery(/^c:t:(\w+):(\d+)$/, async (ctx) => {
  const { master, service } = await resolve(ctx, ctx.match[1]);
  if (!master) return sessionLost(ctx);
  if (!service) return showServices(ctx, master);
  return showConfirm(ctx, master, service, new Date(Number(ctx.match[2]) * 60_000));
});

composer.callbackQuery(/^c:ok:(\w+):(\d+)$/, async (ctx) => {
  const { master, service } = await resolve(ctx, ctx.match[1]);
  if (!master) return sessionLost(ctx);
  if (!service) return showServices(ctx, master);
  const start = new Date(Number(ctx.match[2]) * 60_000);
  const { rescheduleFrom } = ctx.session.booking;

  if (!rescheduleFrom) {
    if (!canAcceptBookings(master)) return unavailable(ctx, master);
    if (needsPrepayment(master, ctx.user)) return alert(ctx, ctx.t('client.prepaymentSoon'));
  }

  const result = await createBooking({ master, client: ctx.user, service, start, rescheduleFrom });
  if (!result.ok) {
    if (result.reason === 'slot_taken') {
      await alert(ctx, ctx.t('client.slotTaken'));
      return showTimes(ctx, master, service, local(start).format('YYYY-MM-DD'));
    }
    if (result.reason === 'too_many') return alert(ctx, ctx.t('client.tooMany', { n: MAX_UPCOMING_PER_MASTER }));
    return alert(ctx, ctx.t('client.cannotReschedule'));
  }

  const { booking, previous } = result;
  ctx.session.booking = { masterId: String(master._id) };
  const params = {
    master: esc(master.name),
    phone: esc(master.phone),
    service: esc(service.title),
    date: fmtDay(ctx.t, booking.start),
    time: fmtTime(booking.start),
    price: fmtMoney(booking.price),
  };
  const kb = new InlineKeyboard().text(ctx.t('client.myButton'), 'c:my');
  await show(ctx, ctx.t(previous ? 'client.rescheduled' : 'client.booked', params), kb);

  // Уведомление мастеру — на его языке
  const lang = master.language;
  const notifyParams = {
    client: esc(ctx.user.name),
    phone: esc(ctx.user.phone),
    service: esc(service.title),
    date: fmtDay((k) => t(lang, k), booking.start),
    time: fmtTime(booking.start),
    price: fmtMoney(booking.price),
  };
  if (previous) {
    notifyParams.oldDate = fmtDay((k) => t(lang, k), previous.start);
    notifyParams.oldTime = fmtTime(previous.start);
  }
  return sendTo(ctx.api, master.telegramId, lang, previous ? 'notify.rescheduled' : 'notify.newBooking', notifyParams);
});

function home(ctx) {
  clearStep(ctx);
  const kb = new InlineKeyboard().text(ctx.t('client.myButton'), 'c:my').row().text(ctx.t('menu.language'), 'nav:lang');
  if (ctx.master) kb.text(ctx.t('role.master'), 'role:master');
  return show(ctx, ctx.t('client.home'), kb);
}

composer.use(my.composer);

module.exports = { composer, openMaster, home, continueBooking };
