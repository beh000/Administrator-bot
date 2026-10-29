// Мини-приложение мастера: записи по дням, новая запись, закрытие времени,
// перенос, отмена, отметка визита, база клиентов, статистика.
(() => {
  const tg = window.Telegram?.WebApp;
  const TZ_OFFSET_MS = 5 * 3600 * 1000; // Ташкент: UTC+5 круглый год

  const state = {
    me: null,
    L: window.I18N.ru,
    tab: 'calendar',
    days: [],
    selected: null,
    clients: null,
    statsMonth: null,
  };

  // --- Утилиты ---
  const $ = (sel, root = document) => root.querySelector(sel);
  const h = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fill = (str, params = {}) => String(str).replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? params[k] : m));
  const money = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const tz = (iso) => new Date(new Date(iso).getTime() + TZ_OFFSET_MS); // читать через getUTC*
  const pad = (n) => String(n).padStart(2, '0');
  const hhmm = (iso) => {
    const d = tz(iso);
    return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  };
  const keyOf = (iso) => {
    const d = tz(iso);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  };
  const keyDate = (key) => new Date(`${key}T00:00:00Z`); // день как UTC-дата, только для календарных полей
  const wd = (key) => state.L.weekdays[(keyDate(key).getUTCDay() + 6) % 7];
  const addDays = (key, n) => {
    const d = keyDate(key);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  function dayLabel(key, { long = false } = {}) {
    const today = state.me.today;
    if (key === today) return state.L.today;
    if (key === addDays(today, 1)) return state.L.tomorrow;
    const d = keyDate(key);
    return long ? `${wd(key)}, ${d.getUTCDate()} ${state.L.months[d.getUTCMonth()]}` : `${wd(key)}, ${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}`;
  }
  const whenLabel = (iso) => `${dayLabel(keyOf(iso))}, ${hhmm(iso)}`;
  const haptic = (type = 'light') => {
    try {
      if (['success', 'error', 'warning'].includes(type)) tg?.HapticFeedback?.notificationOccurred(type);
      else tg?.HapticFeedback?.impactOccurred(type);
    } catch { /* старый клиент Telegram */ }
  };

  function toast(text, ms = 2200) {
    const el = $('#toast');
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { el.hidden = true; }, ms);
  }

  function confirmBox(text) {
    return new Promise((resolve) => {
      if (tg?.showConfirm && tg.isVersionAtLeast?.('6.2')) tg.showConfirm(text, (ok) => resolve(Boolean(ok)));
      else resolve(window.confirm(text));
    });
  }

  function errText(err) {
    return state.L.errors[err?.code] || state.L.errors.server_error;
  }

  async function api(path, { method = 'GET', body } = {}) {
    let res;
    try {
      res = await fetch(path, {
        method,
        headers: { Authorization: `tma ${tg?.initData || ''}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw Object.assign(new Error('network'), { code: 'network' });
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || 'server_error'), { code: data.error || 'server_error', status: res.status });
    return data;
  }

  // --- Нижний лист (детали, формы) ---
  const sheet = {
    open(html) {
      $('#sheet').innerHTML = `<div class="grip"></div>${html}`;
      $('#sheet-wrap').hidden = false;
      $('#sheet').scrollTop = 0;
      tg?.BackButton?.show();
    },
    close() {
      $('#sheet-wrap').hidden = true;
      $('#sheet').innerHTML = '';
      tg?.BackButton?.hide();
      sheet.onBack = null;
    },
    onBack: null,
    get isOpen() { return !$('#sheet-wrap').hidden; },
  };
  const sheetTop = (title) => `<div class="top"><h2>${h(title)}</h2><button class="x" data-act="close" aria-label="${h(state.L.close)}">✕</button></div>`;
  const loading = '<div class="loading"><div class="spinner"></div></div>';

  // --- Карточка записи ---
  function bookingCard(b) {
    const now = Date.now();
    const past = new Date(b.end).getTime() < now;
    if (b.kind === 'block') {
      return `<button class="card block" data-open="${b.id}">
        <div class="time">${hhmm(b.start)}<span class="end">${hhmm(b.end)}</span></div>
        <div class="body"><div class="name">🚫 ${h(state.L.blocked)}</div></div></button>`;
    }
    const name = b.client?.name || '—';
    const chips = [`<span class="chip ${h(b.status)}">${h(state.L.status[b.status] || b.status)}</span>`];
    chips.push(b.client?.inBot ? `<span class="chip bot">🤖 ${h(state.L.inBot)}</span>` : `<span class="chip">✍️ ${h(state.L.manual)}</span>`);
    return `<button class="card${past && b.status !== 'confirmed' ? ' past' : ''}" data-open="${b.id}">
      <div class="time">${hhmm(b.start)}<span class="end">${hhmm(b.end)}</span></div>
      <div class="body">
        <div class="name">${h(name)}</div>
        <div class="sub">${h(b.service)} · ${money(b.price)} ${h(state.L.sum)}</div>
        <div class="chips">${chips.join('')}</div>
      </div></button>`;
  }

  // --- Вкладка «Записи» ---
  async function loadDays() {
    const from = addDays(state.me.today, -3);
    state.days = await api(`/api/calendar?from=${from}&days=33`);
  }

  function renderDaysStrip() {
    return `<div class="days" id="days">${state.days
      .map((d) => {
        const cls = ['day', d.working ? '' : 'off', d.date === state.me.today ? 'today' : '', d.date === state.selected ? 'sel' : ''].join(' ');
        return `<button class="${cls}" data-day="${d.date}"><span class="wd">${h(wd(d.date))}</span><span class="dn">${keyDate(d.date).getUTCDate()}</span>${d.count ? `<span class="cnt">${d.count}</span>` : ''}</button>`;
      })
      .join('')}</div>`;
  }

  async function renderCalendar({ reloadDays = false } = {}) {
    const L = state.L;
    if (reloadDays || !state.days.length) await loadDays();
    if (!state.selected) state.selected = state.me.today;
    const screen = $('#screen');
    screen.innerHTML = `${renderDaysStrip()}<div id="daybox">${loading}</div>`;
    const sel = $(`[data-day="${state.selected}"]`);
    if (sel) sel.scrollIntoView({ inline: 'center', block: 'nearest' });
    let day;
    try {
      day = await api(`/api/day?date=${state.selected}`);
    } catch (err) {
      $('#daybox').innerHTML = `<div class="note err">${h(errText(err))}</div>`;
      return;
    }
    if (day.date !== state.selected) return; // пока грузили, выбрали другой день
    const hours = day.hours ? `${day.hours.start}–${day.hours.end}` : L.dayOff;
    const items = day.items.map(bookingCard).join('');
    $('#daybox').innerHTML = `
      <div class="dayhead"><span class="t">${h(dayLabel(day.date, { long: true }))}</span><span class="hint small">${h(hours)}</span></div>
      <div class="actions">
        <button class="btn" data-act="new">${h(L.newBooking)}</button>
        <button class="btn sec" data-act="block">🚫 ${h(L.blockTime)}</button>
      </div>
      ${items || `<div class="empty"><div class="big">🗓</div><div>${h(L.noBookings)}</div><div class="small" style="margin-top:6px">${h(L.noBookingsHint)}</div></div>`}`;
    state.dayItems = day.items;
  }

  async function refreshCalendar() {
    await loadDays();
    if (state.tab === 'calendar') await renderCalendar();
  }

  // --- Детали записи ---
  function openBooking(id) {
    const b = (state.dayItems || []).find((x) => x.id === id);
    if (!b) return;
    const L = state.L;
    if (b.kind === 'block') {
      sheet.open(`${sheetTop(L.blocked)}
        <div class="kv"><div class="r"><span>${h(dayLabel(keyOf(b.start), { long: true }))}</span><span>${hhmm(b.start)}–${hhmm(b.end)}</span></div></div>
        ${b.canCancel ? `<button class="btn sec block" data-act="cancel" data-id="${b.id}">🔓 ${h(L.unblock)}</button>` : ''}`);
      return;
    }
    const c = b.client || {};
    const rows = [
      [L.client, c.name || '—'],
      c.phone ? [L.phone, c.phone] : null,
      [L.chooseService, b.service],
      [L.chooseDate, `${dayLabel(keyOf(b.start), { long: true })}, ${hhmm(b.start)}–${hhmm(b.end)}`],
      [L.price, `${money(b.price)} ${L.sum}`],
      b.prepaid ? ['💳', fill(L.prepaid, { amount: money(b.prepaid) })] : null,
      [L.statusLabel, `${L.status[b.status] || b.status} · ${c.inBot ? `🤖 ${L.inBot}` : `✍️ ${L.manual}`}`],
    ].filter(Boolean);
    const btns = [];
    if (b.canMark) {
      btns.push(`<div class="btnrow"><button class="btn ok" data-act="came" data-id="${b.id}">✅ ${h(L.came)}</button><button class="btn danger" data-act="noshow" data-id="${b.id}">🚫 ${h(L.noShow)}</button></div>`);
    }
    const line = [];
    if (c.phone) line.push(`<a class="btn sec" href="tel:${h(c.phone)}">📞 ${h(L.call)}</a>`);
    if (b.canMove) line.push(`<button class="btn sec" data-act="move" data-id="${b.id}">🔄 ${h(L.move)}</button>`);
    if (line.length) btns.push(`<div class="btnrow">${line.join('')}</div>`);
    if (b.canInvite) btns.push(`<div class="btnrow"><button class="btn sec" data-act="invite" data-id="${b.id}">📤 ${h(L.invite)}</button></div>`);
    if (b.canCancel) btns.push(`<div class="btnrow"><button class="btn danger" data-act="cancel" data-id="${b.id}">❌ ${h(L.cancel)}</button></div>`);
    sheet.open(`${sheetTop(c.name || L.client)}
      <div class="kv">${rows.map(([k, v]) => `<div class="r"><span>${h(k)}</span><span>${h(v)}</span></div>`).join('')}</div>
      ${btns.join('')}`);
  }

  async function cancelBooking(id) {
    const b = state.dayItems.find((x) => x.id === id);
    const L = state.L;
    const text = b.kind === 'block' ? L.confirmUnblock : fill(b.client?.inBot ? L.confirmCancelBot : L.confirmCancel, { client: b.client?.name || '—', when: whenLabel(b.start) });
    if (!(await confirmBox(text))) return;
    try {
      await api(`/api/bookings/${id}/cancel`, { method: 'POST' });
      haptic('success');
      toast(b.kind === 'block' ? L.unblocked : L.cancelled);
    } catch (err) {
      haptic('error');
      toast(errText(err));
    }
    sheet.close();
    await refreshCalendar();
  }

  async function markVisit(id, came) {
    try {
      const r = await api(`/api/bookings/${id}/attendance`, { method: 'POST', body: { came } });
      haptic('success');
      toast(came ? state.L.markedCame : state.L.markedNoShow);
      if (r.suggestPrepay) setTimeout(() => toast(fill(state.L.suggestPrepay, { count: r.noShows }), 5000), 2300);
    } catch (err) {
      haptic('error');
      toast(errText(err));
    }
    sheet.close();
    state.clients = null;
    await refreshCalendar();
  }

  function inviteBlock(inv) {
    const L = state.L;
    state.invite = inv;
    return `<div class="note"><b>📤 ${h(L.inviteTitle)}</b><br>${h(L.inviteText)}</div>
      <div class="code">${h(inv.text)}</div>
      <button class="btn block" data-act="share">${h(L.send)}</button>
      <div class="btnrow"><button class="btn sec" data-act="copy">${h(L.copy)}</button></div>`;
  }

  async function showInvite(id) {
    sheet.open(`${sheetTop(state.L.invite)}${loading}`);
    try {
      const inv = await api(`/api/bookings/${id}/invite`);
      sheet.open(`${sheetTop(state.L.invite)}${inviteBlock(inv)}`);
    } catch (err) {
      sheet.open(`${sheetTop(state.L.invite)}<div class="note err">${h(errText(err))}</div>`);
    }
  }

  function share() {
    const inv = state.invite;
    if (!inv) return;
    if (tg?.openTelegramLink) tg.openTelegramLink(inv.shareUrl);
    else window.open(inv.shareUrl, '_blank');
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(state.invite.text);
      toast(state.L.copied);
    } catch {
      const range = document.createRange();
      range.selectNodeContents($('.code'));
      const s = window.getSelection();
      s.removeAllRanges();
      s.addRange(range);
    }
  }

  // --- Выбор дня и времени (новая запись и перенос) ---
  // flow: { mode: 'new'|'move', service, date, start, bookingId, client }
  let flow = null;

  function datesGrid(dates) {
    if (!dates.length) return `<div class="note">${h(state.L.noDates)}</div>`;
    return `<div class="hscroll" id="dates">${dates
      .slice(0, 30)
      .map((d) => `<button class="opt${d === flow.date ? ' on' : ''}" data-date="${d}">${h(dayLabel(d))}</button>`)
      .join('')}</div>`;
  }

  async function slotsBox() {
    const q = flow.mode === 'move' ? `bookingId=${flow.bookingId}` : `serviceId=${encodeURIComponent(flow.service.id)}`;
    const box = $('#slots');
    if (!box) return;
    box.innerHTML = loading;
    try {
      const slots = await api(`/api/slots?${q}&date=${flow.date}`);
      if (!$('#slots')) return;
      box.innerHTML = slots.length
        ? `<h3>${h(state.L.chooseTime)}</h3><div class="grid">${slots.map((s) => `<button class="opt${s === flow.start ? ' on' : ''}" data-slot="${s}">${hhmm(s)}</button>`).join('')}</div>`
        : `<div class="note">${h(state.L.noTimes)}</div>`;
    } catch (err) {
      box.innerHTML = `<div class="note err">${h(errText(err))}</div>`;
    }
  }

  async function pickDateStep(title) {
    const q = flow.mode === 'move' ? `bookingId=${flow.bookingId}` : `serviceId=${encodeURIComponent(flow.service.id)}`;
    sheet.open(`${sheetTop(title)}${loading}`);
    let dates;
    try {
      dates = await api(`/api/dates?${q}`);
    } catch (err) {
      sheet.open(`${sheetTop(title)}<div class="note err">${h(errText(err))}</div>`);
      return;
    }
    if (!dates.includes(flow.date)) flow.date = dates[0] || null;
    const chosen = flow.service ? `<div class="chosen"><span class="chip">${h(flow.service.title)}</span>${flow.client?.name ? `<span class="chip">👤 ${h(flow.client.name)}</span>` : ''}</div>` : '';
    sheet.open(`${sheetTop(title)}${chosen}<h3>${h(state.L.chooseDate)}</h3>${datesGrid(dates)}<div id="slots"></div><div id="next"></div>`);
    $('#dates .on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
    if (flow.date) await slotsBox();
  }

  // Новая запись: услуга → день → время → клиент
  function startNew(prefill = {}) {
    const services = state.me.services;
    flow = { mode: 'new', service: null, date: state.selected && state.selected >= state.me.today ? state.selected : state.me.today, start: null, client: prefill.client || null };
    if (services.length === 1) {
      flow.service = services[0];
      pickDateStep(state.L.newTitle);
      return;
    }
    sheet.open(`${sheetTop(state.L.chooseService)}
      ${services.map((s) => `<button class="svc" data-svc="${h(s.id)}"><span><b>${h(s.title)}</b><br><span class="hint small">${s.durationMin} ${h(state.L.min)}</span></span><span>${money(s.price)} ${h(state.L.sum)}</span></button>`).join('')}`);
  }

  function clientStep() {
    const L = state.L;
    const c = flow.client || {};
    sheet.open(`${sheetTop(L.client)}
      <div class="chosen"><span class="chip">${h(flow.service.title)}</span><span class="chip">🗓 ${h(whenLabel(flow.start))}</span></div>
      <label class="field"><span>${h(L.clientName)}</span><input id="cname" autocomplete="off" maxlength="48" value="${h(c.name || '')}" placeholder="${h(L.findClient)}"></label>
      <div class="sug" id="sug"></div>
      <label class="field"><span>${h(L.clientPhone)}</span><input id="cphone" type="tel" inputmode="tel" maxlength="20" value="${h(c.phone || '')}" placeholder="+998 90 123 45 67"></label>
      <div id="cerr"></div>
      <button class="btn block" data-act="save">${h(L.save)}</button>`);
    if (!c.key) $('#cname').focus();
    ensureClients();
  }

  async function ensureClients() {
    if (!state.clients) {
      try {
        state.clients = await api('/api/clients');
      } catch {
        state.clients = [];
      }
    }
    return state.clients;
  }

  function suggest(q) {
    const box = $('#sug');
    if (!box) return;
    const s = q.trim().toLowerCase();
    if (!s || !state.clients?.length) {
      box.innerHTML = '';
      return;
    }
    const found = state.clients.filter((c) => c.name.toLowerCase().includes(s) || (c.phone || '').replace(/\D/g, '').includes(s.replace(/\D/g, '') || '§')).slice(0, 5);
    box.innerHTML = found.length
      ? `<div class="list">${found.map((c) => `<button class="row" data-pick="${h(c.key)}"><span class="grow"><span class="ttl">${h(c.name)}</span><span class="hint small">${h(c.phone || '')}${c.telegramId ? ' · 🤖' : ''}</span></span><span class="hint small">${h(state.L.fromBase)}</span></button>`).join('')}</div>`
      : '';
  }

  async function saveBooking() {
    const name = $('#cname').value.trim();
    const phone = $('#cphone').value.trim();
    const err = $('#cerr');
    if (!name) {
      err.innerHTML = `<div class="note err">${h(state.L.errors.bad_name)}</div>`;
      return;
    }
    const btn = $('[data-act="save"]');
    btn.disabled = true;
    const picked = flow.client && flow.client.name === name ? flow.client : null;
    try {
      const r = await api('/api/bookings', {
        method: 'POST',
        body: { serviceId: flow.service.id, start: flow.start, name, phone: phone || undefined, clientKey: picked?.key },
      });
      haptic('success');
      state.selected = keyOf(flow.start);
      state.clients = null;
      const L = state.L;
      const head = `<div class="note"><b>✅ ${h(L.created)}:</b> ${h(name)} — ${h(flow.service.title)}, ${h(whenLabel(flow.start))}</div>`;
      sheet.open(`${sheetTop(L.created)}${head}${r.linked ? `<div class="note">🤖 ${h(L.createdLinked)}</div><button class="btn block" data-act="close">OK</button>` : inviteBlock(r.invite)}`);
      flow = null;
      refreshCalendar();
    } catch (e) {
      haptic('error');
      btn.disabled = false;
      err.innerHTML = `<div class="note err">${h(errText(e))}</div>`;
      if (e.code === 'slot_taken') {
        flow.start = null;
        setTimeout(() => pickDateStep(state.L.chooseTime), 1200);
      }
    }
  }

  // Перенос: день → время → подтверждение
  function startMove(id) {
    const b = state.dayItems.find((x) => x.id === id);
    flow = { mode: 'move', bookingId: id, date: keyOf(b.start), start: null, service: { title: b.service }, client: b.client };
    pickDateStep(state.L.moveTitle);
  }

  async function confirmMove() {
    if (!(await confirmBox(fill(state.L.moveConfirm, { when: whenLabel(flow.start) })))) return;
    try {
      await api(`/api/bookings/${flow.bookingId}/move`, { method: 'POST', body: { start: flow.start } });
      haptic('success');
      toast(state.L.moved);
      state.selected = keyOf(flow.start);
      flow = null;
      sheet.close();
      await refreshCalendar();
    } catch (err) {
      haptic('error');
      toast(errText(err));
      if (err.code === 'slot_taken') slotsBox();
    }
  }

  // Время шагом 15 минут: свой список вместо <input type=time> — без AM/PM на любом телефоне
  function timeOptions(selected) {
    const out = [];
    for (let m = 6 * 60; m < 24 * 60; m += 15) {
      const v = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
      out.push(`<option value="${v}"${v === selected ? ' selected' : ''}>${v}</option>`);
    }
    return out.join('');
  }

  // Закрыть время на выбранный день
  function startBlock() {
    const L = state.L;
    const date = state.selected < state.me.today ? state.me.today : state.selected;
    flow = { mode: 'block', date };
    sheet.open(`${sheetTop(L.blockTitle)}
      <div class="chosen"><span class="chip">🗓 ${h(dayLabel(date, { long: true }))}</span></div>
      <div class="two">
        <label class="field"><span>${h(L.blockFrom)}</span><select id="bfrom">${timeOptions('13:00')}</select></label>
        <label class="field"><span>${h(L.blockTo)}</span><select id="bto">${timeOptions('14:00')}</select></label>
      </div>
      <div id="berr"></div>
      <button class="btn block" data-act="blocksave">🚫 ${h(L.blockTime)}</button>`);
  }

  async function saveBlock() {
    const L = state.L;
    const from = $('#bfrom').value;
    const to = $('#bto').value;
    const err = $('#berr');
    try {
      const r = await api('/api/blocks', { method: 'POST', body: { date: flow.date, from, to } });
      if (!r.ok) {
        const list = r.conflicts.map((b) => `${hhmm(b.start)}–${hhmm(b.end)} · ${h(b.kind === 'block' ? L.blocked : b.client?.name || '—')}`).join('<br>');
        err.innerHTML = `<div class="note err">${h(L.blockConflict)}<br>${list}</div>`;
        haptic('warning');
        return;
      }
      haptic('success');
      toast(L.blockDone);
      state.selected = flow.date;
      flow = null;
      sheet.close();
      await refreshCalendar();
    } catch (e) {
      haptic('error');
      err.innerHTML = `<div class="note err">${h(errText(e))}</div>`;
    }
  }

  // --- Вкладка «Клиенты» ---
  async function renderClients() {
    const L = state.L;
    const screen = $('#screen');
    screen.innerHTML = `<h1>${h(L.tabs.clients)}</h1><input class="search" id="csearch" type="search" placeholder="${h(L.clientsSearch)}"><div id="clist">${loading}</div>`;
    state.clients = null;
    await ensureClients();
    drawClients('');
  }

  function drawClients(q) {
    const L = state.L;
    const box = $('#clist');
    if (!box) return;
    const s = q.trim().toLowerCase();
    const digits = s.replace(/\D/g, '');
    const list = state.clients.filter((c) => !s || c.name.toLowerCase().includes(s) || (digits && (c.phone || '').replace(/\D/g, '').includes(digits)));
    if (!state.clients.length) {
      box.innerHTML = `<div class="empty"><div class="big">👥</div>${h(L.clientsEmpty)}</div>`;
      return;
    }
    box.innerHTML = `<div class="list">${list
      .map((c) => `<button class="row" data-client="${h(c.key)}">
        <span class="avatar">${h((c.name || '?').trim().charAt(0).toUpperCase())}</span>
        <span class="grow"><span class="ttl">${h(c.name)}${c.telegramId ? ' 🤖' : ''}${c.noShows ? ' 🚫' : ''}</span>
        <span class="hint small">${h(fill(L.visitsN, { n: c.visits }))}${c.lastVisit ? ` · ${h(dayLabel(keyOf(c.lastVisit)))}` : ''}</span></span>
        <span class="hint">›</span></button>`)
      .join('')}</div>`;
  }

  async function openClient(key) {
    const L = state.L;
    sheet.open(`${sheetTop(L.client)}${loading}`);
    let c;
    try {
      c = await api(`/api/clients/${encodeURIComponent(key)}`);
    } catch (err) {
      sheet.open(`${sheetTop(L.client)}<div class="note err">${h(errText(err))}</div>`);
      return;
    }
    const rows = [
      c.phone ? [L.phone, c.phone] : null,
      [L.visits, c.visits],
      [L.spent, `${money(c.spent)} ${L.sum}`],
      [L.noShows, c.noShows],
      [L.lastVisit, c.lastVisit ? dayLabel(keyOf(c.lastVisit), { long: true }) : '—'],
      [L.nextVisit, c.nextVisit ? whenLabel(c.nextVisit) : '—'],
    ].filter(Boolean);
    const hist = c.history
      .map((b) => `<div class="row"><span class="grow"><span class="ttl">${h(b.service)}</span><span class="hint small">${h(dayLabel(keyOf(b.start)))} ${hhmm(b.start)}</span></span><span class="chip ${h(b.status)}">${h(L.status[b.status] || b.status)}</span></div>`)
      .join('');
    state.openClient = c;
    sheet.open(`${sheetTop(`${c.name}${c.telegramId ? ' 🤖' : ''}`)}
      <div class="kv">${rows.map(([k, v]) => `<div class="r"><span>${h(k)}</span><span>${h(v)}</span></div>`).join('')}</div>
      <button class="btn block" data-act="again">＋ ${h(L.bookAgain)}</button>
      ${c.phone ? `<div class="btnrow"><a class="btn sec" href="tel:${h(c.phone)}">📞 ${h(L.call)}</a></div>` : ''}
      ${hist ? `<h3>${h(L.history)}</h3><div class="list">${hist}</div>` : ''}`);
  }

  // --- Вкладка «Статистика» ---
  async function renderStats() {
    const L = state.L;
    if (!state.statsMonth) state.statsMonth = state.me.today.slice(0, 7);
    const [y, m] = state.statsMonth.split('-').map(Number);
    const screen = $('#screen');
    const maxMonth = (() => {
      const d = keyDate(`${state.me.today.slice(0, 7)}-01`);
      d.setUTCMonth(d.getUTCMonth() + 1);
      return d.toISOString().slice(0, 7);
    })();
    screen.innerHTML = `<div class="month"><button data-month="-1">‹</button><span class="t">${h(L.monthsNom[m - 1])} ${y}</span><button data-month="1"${state.statsMonth >= maxMonth ? ' disabled' : ''}>›</button></div><div id="sbox">${loading}</div>`;
    let s;
    try {
      s = await api(`/api/stats?month=${state.statsMonth}`);
    } catch (err) {
      $('#sbox').innerHTML = `<div class="note err">${h(errText(err))}</div>`;
      return;
    }
    const d = (v) => (v === null || v === undefined ? '' : `<div class="delta ${v >= 0 ? 'up' : 'down'}">${v >= 0 ? '▲' : '▼'} ${Math.abs(v)}% <span class="hint">${h(L.vsPrev)}</span></div>`);
    const c = s.cur;
    const r = state.me.rating;
    $('#sbox').innerHTML = `
      <div class="tiles">
        <div class="tile"><div class="lbl">${h(L.revenue)}</div><div class="num">${money(c.revenue)} <small>${h(L.sum)}</small></div>${d(s.delta.revenue)}</div>
        <div class="tile"><div class="lbl">${h(L.visits)}</div><div class="num">${c.visits}</div>${d(s.delta.visits)}</div>
        <div class="tile"><div class="lbl">${h(L.avgCheck)}</div><div class="num">${money(c.avgCheck)} <small>${h(L.sum)}</small></div></div>
        <div class="tile"><div class="lbl">${h(L.upcoming)}</div><div class="num">${c.upcoming}</div><div class="hint small">${money(c.upcomingRevenue)} ${h(L.sum)}</div></div>
      </div>
      <h3></h3>
      <div class="list">
        <div class="row"><span class="grow"><span class="ttl">${h(L.clientsStat)}</span><span class="hint small">${h(fill(L.newReturning, { fresh: c.newClients, returning: c.returning }))}</span></span><span class="val">${c.clients}</span></div>
        <div class="row"><span class="grow ttl">${h(L.noShowsStat)}</span><span class="val">${c.noShows}${c.noShowRate ? ` <span class="hint small">(${c.noShowRate}%)</span>` : ''}</span></div>
        <div class="row"><span class="grow ttl">${h(L.cancelledStat)}</span><span class="val">${c.cancelled}</span></div>
        <div class="row"><span class="grow ttl">${h(L.viaBot)}</span><span class="val">${c.viaBot}</span></div>
        ${r ? `<div class="row"><span class="grow"><span class="ttl">${h(L.rating)}</span><span class="hint small">${h(fill(L.reviews, { n: r.count }))}</span></span><span class="val">⭐ ${r.avg}</span></div>` : ''}
      </div>
      ${!c.visits && !c.upcoming && !c.noShows ? `<div class="empty">${h(L.statsEmpty)}</div>` : ''}`;
  }

  function shiftMonth(n) {
    const d = keyDate(`${state.statsMonth}-01`);
    d.setUTCMonth(d.getUTCMonth() + n);
    state.statsMonth = d.toISOString().slice(0, 7);
    renderStats();
  }

  // --- Вкладки ---
  function setTab(tab) {
    state.tab = tab;
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    window.scrollTo(0, 0);
    if (tab === 'calendar') renderCalendar();
    if (tab === 'clients') renderClients();
    if (tab === 'stats') renderStats();
  }

  // --- События (делегирование) ---
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, [data-act]');
    if (!t) {
      if (e.target.classList.contains('sheet-backdrop')) sheet.close();
      return;
    }
    const d = t.dataset;
    if (d.tab) return setTab(d.tab);
    if (d.day) {
      haptic('light');
      state.selected = d.day;
      return renderCalendar();
    }
    if (d.open) return openBooking(d.open);
    if (d.client) return openClient(d.client);
    if (d.month) return shiftMonth(Number(d.month));
    if (d.svc) {
      flow.service = state.me.services.find((s) => s.id === d.svc);
      return pickDateStep(state.L.newTitle);
    }
    if (d.date) {
      flow.date = d.date;
      flow.start = null;
      document.querySelectorAll('[data-date]').forEach((b) => b.classList.toggle('on', b.dataset.date === d.date));
      $('#next').innerHTML = '';
      return slotsBox();
    }
    if (d.slot) {
      haptic('light');
      flow.start = d.slot;
      if (flow.mode === 'move') return confirmMove();
      return clientStep();
    }
    if (d.pick) {
      const c = state.clients.find((x) => x.key === d.pick);
      flow.client = c;
      $('#cname').value = c.name;
      $('#cphone').value = c.phone || '';
      $('#sug').innerHTML = '';
      return undefined;
    }
    switch (d.act) {
      case 'close': return sheet.close();
      case 'new': return startNew();
      case 'block': return startBlock();
      case 'blocksave': return saveBlock();
      case 'save': return saveBooking();
      case 'cancel': return cancelBooking(d.id);
      case 'move': return startMove(d.id);
      case 'came': return markVisit(d.id, true);
      case 'noshow': return markVisit(d.id, false);
      case 'invite': return showInvite(d.id);
      case 'share': return share();
      case 'copy': return copyInvite();
      case 'again': {
        const c = state.openClient;
        return startNew({ client: { key: c.key, name: c.name, phone: c.phone } });
      }
      default: return undefined;
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'csearch') drawClients(e.target.value);
    if (e.target.id === 'cname') {
      if (flow?.client && flow.client.name !== e.target.value) flow.client = null;
      suggest(e.target.value);
    }
  });

  // --- Запуск ---
  function fatal(text) {
    $('#tabs').hidden = true;
    $('#screen').innerHTML = `<div class="empty"><div class="big">📱</div>${h(text)}</div>`;
  }

  async function init() {
    if (tg) {
      tg.ready();
      tg.expand();
      try {
        tg.setHeaderColor?.('secondary_bg_color');
        tg.setBackgroundColor?.('secondary_bg_color');
      } catch { /* старый клиент */ }
      tg.BackButton?.onClick(() => sheet.close());
    }
    const guess = (tg?.initDataUnsafe?.user?.language_code || '').startsWith('uz') ? 'uz' : 'ru';
    state.L = window.I18N[guess];
    $('#screen').innerHTML = loading;
    if (!tg?.initData) return fatal(state.L.openInTelegram);
    try {
      state.me = await api('/api/me');
    } catch (err) {
      if (err.status === 403) return fatal(state.L.notMaster);
      if (err.status === 401) return fatal(state.L.expired);
      return fatal(errText(err));
    }
    state.L = window.I18N[state.me.lang] || window.I18N.ru;
    document.documentElement.lang = state.me.lang;
    document.querySelectorAll('#tabs button').forEach((b) => { $('.lbl', b).textContent = state.L.tabs[b.dataset.tab]; });
    $('#tabs').hidden = false;
    setTab('calendar');
  }

  init();
})();
