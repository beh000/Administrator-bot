// Мини-приложение клиента: страница мастера (фото, рейтинг, адрес, услуги),
// запись в несколько касаний, предоплата со скриншотом, «Мои записи» с переносом
// и отменой, «Мои мастера». Правила записи — на сервере, как в боте.
window.ClientApp = (() => {
  let K = null; // общие помощники из app.js
  let C = null; // тексты клиента
  let me = null; // профиль клиента
  let page = null; // открытая страница мастера
  let flow = null; // { slug, service, date, start, reschedule }
  let current = null; // открытая запись

  const h = (s) => K.h(s);
  const err = (e) => C.errors[e?.code] || K.errText(e);
  // tel: в Telegram не работает — лист с номером: отправить контактом в чат / скопировать
  const callBtn = (phone, slug) => (phone && slug ? `<button class="btn sec" data-c="call" data-slug="${h(slug)}" data-phone="${h(phone)}">📞 ${h(C.call)}</button>` : '');
  const mapsUrl = (g) => `https://maps.google.com/?q=${g.lat},${g.lng}`;

  // --- Главная: мои записи и мои мастера ---
  async function home() {
    page = null;
    window.scrollTo(0, 0);
    const $s = K.$('#screen');
    $s.innerHTML = K.loading;
    let data;
    try {
      [me, data] = await Promise.all([K.api('/api/c/me'), K.api('/api/c/bookings')]);
    } catch (e) {
      $s.innerHTML = `<div class="note err">${h(err(e))}</div>`;
      return;
    }
    const cards = data.upcoming.map(card).join('');
    const masters = me.masters
      .map((m) => `<button class="row" data-c="master" data-slug="${h(m.slug)}"><span class="avatar">${h((m.name || '?').charAt(0).toUpperCase())}</span><span class="grow"><span class="ttl">${h(m.name)}</span>${m.about ? `<span class="hint small">${h(m.about)}</span>` : ''}</span><span class="btn sec" style="flex:none;height:36px;padding:0 12px">${h(C.bookAgain)}</span></button>`)
      .join('');
    $s.innerHTML = `<h1>${h(C.myTitle)}</h1>
      ${cards || `<div class="empty"><div class="big">🗓</div>${h(C.myEmpty)}</div>`}
      ${masters ? `<h3>${h(C.myMasters)}</h3><div class="list">${masters}</div>` : `<div class="note">${h(C.howTo)}</div>`}`;
  }

  function card(b) {
    const chip = `<span class="chip ${h(b.status)}">${h(K.state.L.status[b.status] || b.status)}</span>`;
    return `<button class="card" data-c="booking" data-id="${b.id}">
      <div class="time">${K.hhmm(b.start)}<span class="end">${h(K.dayLabel(K.keyOf(b.start)))}</span></div>
      <div class="body"><div class="name">${h(b.master?.name || '')}</div>
      <div class="sub">${h(b.service)} · ${K.money(b.price)} ${h(K.state.L.sum)}</div>
      <div class="chips">${chip}${b.awaitingPayment ? `<span class="chip pending_payment">💳 ${h(C.payNeeded)}</span>` : ''}</div></div></button>`;
  }

  // --- Страница мастера ---
  async function openMaster(slug) {
    window.scrollTo(0, 0);
    const $s = K.$('#screen');
    $s.innerHTML = K.loading;
    try {
      if (!me) me = await K.api('/api/c/me');
      page = await K.api(`/api/c/m/${encodeURIComponent(slug)}`);
    } catch (e) {
      $s.innerHTML = `<div class="empty"><div class="big">🔍</div>${h(err(e))}</div><button class="btn sec block" data-c="home">${h(C.toMy)}</button>`;
      return;
    }
    const p = page;
    const photos = p.photos
      ? `<div class="gallery">${Array.from({ length: p.photos }, (_, i) => `<img data-src="/api/c/m/${p.slug}/photos/${i}" alt="">`).join('')}</div>`
      : '';
    const services = p.services
      .map((s) => `<button class="svc" data-c="svc" data-id="${h(s.id)}"><span><b>${h(s.title)}</b><br><span class="hint small">${s.durationMin} ${h(K.state.L.min)}</span></span><span><b>${K.money(s.price)}</b> ${h(K.state.L.sum)}</span></button>`)
      .join('');
    $s.innerHTML = `
      ${me.masters.length || me.ready ? `<button class="back" data-c="home">‹ ${h(C.myTitle)}</button>` : ''}
      ${photos}
      <h1 style="margin-bottom:4px">${h(p.name)}</h1>
      ${p.rating ? `<div class="hint" style="margin:0 0 8px">⭐ ${p.rating.avg} · ${h(K.fill(C.reviews, { n: p.rating.count }))}</div>` : ''}
      ${p.about ? `<p class="about">${h(p.about)}</p>` : ''}
      ${p.address || p.geo ? `<div class="list" style="margin-bottom:12px"><div class="row"><span class="grow"><span class="ttl">📍 ${h(p.address || C.onMap)}</span></span>${p.geo ? `<button class="btn sec" style="flex:none;height:36px;padding:0 12px" data-c="map">🗺 ${h(C.map)}</button>` : ''}</div></div>` : ''}
      ${!p.available ? `<div class="note err">${h(K.fill(C.unavailable, { phone: p.phone }))}</div><div class="btnrow">${callBtn(p.phone, p.slug)}</div>` : `
        ${p.prepay ? `<div class="note">💳 ${h(K.fill(C.prepayNote, { amount: K.money(p.prepay.amount), minutes: p.prepay.minutes }))}</div>` : ''}
        <h3>${h(C.chooseService)}</h3>
        ${services || `<div class="note">${h(K.fill(C.noServices, { phone: p.phone }))}</div>`}`}`;
    K.loadImages($s);
  }

  // --- Выбор дня и времени ---
  async function pickTime() {
    const q = flow.reschedule ? `reschedule=${flow.reschedule}` : `serviceId=${encodeURIComponent(flow.service.id)}`;
    const title = flow.reschedule ? C.rescheduleTitle : flow.service.title;
    K.sheet.open(`${K.sheetTop(title)}${K.loading}`);
    let dates;
    try {
      dates = await K.api(`/api/c/m/${flow.slug}/dates?${q}`);
    } catch (e) {
      K.sheet.open(`${K.sheetTop(title)}<div class="note err">${h(err(e))}</div>`);
      return;
    }
    if (!dates.includes(flow.date)) flow.date = dates[0] || null;
    const chips = dates.map((d) => `<button class="opt${d === flow.date ? ' on' : ''}" data-c="date" data-id="${d}">${h(K.dayLabel(d))}</button>`).join('');
    K.sheet.open(`${K.sheetTop(title)}
      <div class="chosen"><span class="chip">${h(flow.service.title)} · ${flow.service.durationMin} ${h(K.state.L.min)}</span></div>
      ${dates.length ? `<h3>${h(K.state.L.chooseDate)}</h3><div class="hscroll" id="cdates">${chips}</div><div id="cslots"></div>` : `<div class="note">${h(K.fill(C.noDates, { phone: page?.phone || '' }))}</div>`}`);
    K.$('#cdates .on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
    if (flow.date) await loadSlots();
  }

  async function loadSlots() {
    const box = K.$('#cslots');
    if (!box) return;
    box.innerHTML = K.loading;
    const q = flow.reschedule ? `reschedule=${flow.reschedule}` : `serviceId=${encodeURIComponent(flow.service.id)}`;
    try {
      const slots = await K.api(`/api/c/m/${flow.slug}/slots?${q}&date=${flow.date}`);
      box.innerHTML = slots.length
        ? `<h3>${h(K.state.L.chooseTime)}</h3><div class="grid">${slots.map((s) => `<button class="opt" data-c="slot" data-id="${s}">${K.hhmm(s)}</button>`).join('')}</div>`
        : `<div class="note">${h(K.state.L.noTimes)}</div>`;
    } catch (e) {
      box.innerHTML = `<div class="note err">${h(err(e))}</div>`;
    }
  }

  // --- Подтверждение (и имя/телефон, если их ещё нет) ---
  function confirmStep() {
    const s = flow.service;
    const needName = !me.name;
    const needPhone = !me.phone;
    const tgName = K.tg?.initDataUnsafe?.user?.first_name || '';
    const prepay = !flow.reschedule && page?.prepay;
    K.sheet.open(`${K.sheetTop(flow.reschedule ? C.rescheduleTitle : C.confirmTitle)}
      <div class="kv">
        <div class="r"><span>${h(C.master)}</span><span>${h(page?.name || '')}</span></div>
        <div class="r"><span>${h(C.service)}</span><span>${h(s.title)}</span></div>
        <div class="r"><span>${h(C.when)}</span><span>${h(K.whenLabel(flow.start))}</span></div>
        <div class="r"><span>${h(C.price)}</span><span>${K.money(s.price)} ${h(K.state.L.sum)}</span></div>
      </div>
      ${prepay ? `<div class="note">💳 ${h(K.fill(C.prepayNote, { amount: K.money(prepay.amount), minutes: prepay.minutes }))}</div>` : ''}
      ${needName ? `<label class="field"><span>${h(C.yourName)}</span><input id="cn" maxlength="48" value="${h(tgName)}"></label>` : ''}
      ${needPhone ? `<div class="field"><span>${h(C.yourPhone)}</span>
          <button class="btn sec block" data-c="contact">📱 ${h(C.sharePhone)}</button>
          <input id="cp" type="tel" inputmode="tel" maxlength="20" placeholder="${h(C.orType)}" style="margin-top:8px"></div>` : ''}
      <div id="cerr"></div>
      <button class="btn block" data-c="book">${h(flow.reschedule ? C.rescheduleBtn : C.bookBtn)}</button>`);
  }

  async function shareContact() {
    const tg = K.tg;
    if (!tg?.requestContact) return;
    tg.requestContact(async (sent, result) => {
      if (!sent) return;
      try {
        if (result?.response) me = { ...me, ...(await K.api('/api/c/contact', { method: 'POST', body: { response: result.response } })) };
        else {
          // старый Telegram: номер придёт в чат с ботом, бот его сохранит
          for (let i = 0; i < 4 && !me.phone; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            await new Promise((r) => setTimeout(r, 1000));
            // eslint-disable-next-line no-await-in-loop
            me = await K.api('/api/c/me');
          }
        }
      } catch { /* введёт вручную */ }
      if (me.phone) {
        K.haptic('success');
        const cp = K.$('#cp');
        if (cp) cp.value = me.phone;
        const btn = K.$('[data-c="contact"]');
        if (btn) btn.textContent = `✅ ${me.phone}`;
      }
    });
  }

  async function book() {
    const box = K.$('#cerr');
    const btn = K.$('[data-c="book"]');
    btn.disabled = true;
    try {
      const body = {};
      if (K.$('#cn')) body.name = K.$('#cn').value;
      if (K.$('#cp') && K.$('#cp').value.trim() && !me.phone) body.phone = K.$('#cp').value;
      if (Object.keys(body).length) me = { ...me, ...(await K.api('/api/c/profile', { method: 'POST', body })) };
      if (!me.phone) throw Object.assign(new Error('phone'), { code: 'need_phone' });
      const r = await K.api('/api/c/bookings', {
        method: 'POST',
        body: { slug: flow.slug, serviceId: flow.service.id, start: flow.start, rescheduleFrom: flow.reschedule || undefined },
      });
      K.haptic('success');
      flow = null;
      if (r.booking.awaitingPayment) return showBooking(r.booking, C.payFirst);
      return showBooking(r.booking, r.rescheduled ? C.rescheduled : C.booked);
    } catch (e) {
      K.haptic('error');
      btn.disabled = false;
      box.innerHTML = `<div class="note err">${h(err(e))}</div>`;
      if (e.code === 'slot_taken') setTimeout(pickTime, 1300);
    }
    return undefined;
  }

  // --- Карточка записи ---
  async function openBooking(id) {
    K.sheet.open(`${K.sheetTop(C.booking)}${K.loading}`);
    try {
      showBooking(await K.api(`/api/c/bookings/${id}`));
    } catch (e) {
      K.sheet.open(`${K.sheetTop(C.booking)}<div class="note err">${h(err(e))}</div>`);
    }
  }

  function showBooking(b, note) {
    current = b;
    const m = b.master || {};
    const L = K.state.L;
    const pay = b.payment;
    const parts = [];
    if (note) parts.push(`<div class="note">${h(note)}</div>`);
    if (note) parts.push(`<div class="btnrow" style="margin:0 0 12px"><button class="btn sec" data-c="home">📋 ${h(C.myTitle)}</button></div>`);
    parts.push(`<div class="kv">
      <div class="r"><span>${h(C.master)}</span><span>${h(m.name || '')}</span></div>
      <div class="r"><span>${h(C.service)}</span><span>${h(b.service)}</span></div>
      <div class="r"><span>${h(C.when)}</span><span>${h(K.whenLabel(b.start))}</span></div>
      <div class="r"><span>${h(C.price)}</span><span>${K.money(b.price)} ${h(L.sum)}</span></div>
      <div class="r"><span>${h(C.status)}</span><span>${h(L.status[b.status] || b.status)}</span></div>
      ${b.prepaid ? `<div class="r"><span>💳</span><span>${h(K.fill(L.prepaid, { amount: K.money(b.prepaid) }))}</span></div>` : ''}
      ${b.active && (m.address || m.geo) ? `<div class="r"><span>📍</span><span>${h(m.address || C.onMap)}</span></div>` : ''}
    </div>`);
    if (pay) {
      const card = pay.card.replace(/(\d{4})(?=\d)/g, '$1 ');
      parts.push(`<h3>${h(C.payTitle)}</h3>
        <div class="note">${h(b.status === 'payment_review' ? C.payReview : K.fill(C.payHow, { amount: K.money(pay.amount), deadline: pay.deadline ? K.hhmm(pay.deadline) : '' }))}</div>
        <div class="code">${h(card)}<br><span class="hint">${h(pay.holder)}</span></div>
        <div class="btnrow"><button class="btn sec" data-c="copy" data-text="${h(pay.card)}">${h(C.copyCard)}</button></div>
        <div id="cerr"></div>
        <div class="btnrow"><button class="btn" data-c="paid">📎 ${h(b.status === 'payment_review' ? C.payAgain : C.paid)}</button></div>`);
    }
    const row = [];
    if (b.active && m.geo) row.push(`<button class="btn sec" data-c="map">🗺 ${h(C.map)}</button>`);
    if (m.phone) row.push(callBtn(m.phone, m.slug));
    if (row.length) parts.push(`<div class="btnrow">${row.join('')}</div>`);
    if (b.canReschedule) parts.push(`<div class="btnrow"><button class="btn sec" data-c="resched">🔄 ${h(C.reschedule)}</button></div>`);
    if (b.canCancel) parts.push(`<div class="btnrow"><button class="btn danger" data-c="cancel">❌ ${h(C.cancel)}</button></div>`);
    if (b.tooLate) parts.push(`<div class="hint small" style="margin-top:10px">${h(C.tooLateNote)}</div>`);
    K.sheet.open(`${K.sheetTop(C.booking)}${parts.join('')}`);
  }

  async function cancel() {
    const b = current;
    if (!(await K.confirmBox(K.fill(C.cancelAsk, { service: b.service, when: K.whenLabel(b.start) })))) return;
    try {
      const r = await K.api(`/api/c/bookings/${b.id}/cancel`, { method: 'POST' });
      K.haptic('success');
      K.sheet.close();
      K.toast(r.prepaid ? K.fill(C.cancelledPrepaid, { phone: r.masterPhone }) : C.cancelled, r.prepaid ? 5000 : 2200);
      home();
    } catch (e) {
      K.haptic('error');
      K.toast(e.code === 'too_late' ? C.tooLateNote : err(e), 4000);
    }
  }

  async function sendScreenshot() {
    const [file] = await K.pickFiles();
    if (!file) return;
    const btn = K.$('[data-c="paid"]');
    if (btn) btn.disabled = true;
    try {
      const b = await K.apiUpload(`/api/c/bookings/${current.id}/screenshot`, file);
      K.haptic('success');
      showBooking(b, C.screenshotSent);
    } catch (e) {
      K.haptic('error');
      if (btn) btn.disabled = false;
      const box = K.$('#cerr');
      if (box) box.innerHTML = `<div class="note err">${h(err(e))}</div>`;
    }
  }

  // --- События ---
  function onClick(t) {
    const d = t.dataset;
    switch (d.c) {
      case 'home':
        if (K.sheet.isOpen) K.sheet.close();
        return home();
      case 'master': return openMaster(d.slug);
      case 'svc': {
        const s = page.services.find((x) => x.id === d.id);
        flow = { slug: page.slug, service: s, date: null, start: null };
        return pickTime();
      }
      case 'date':
        flow.date = d.id;
        document.querySelectorAll('[data-c="date"]').forEach((b) => b.classList.toggle('on', b.dataset.id === d.id));
        return loadSlots();
      case 'slot':
        K.haptic('light');
        flow.start = d.id;
        return confirmStep();
      case 'contact': return shareContact();
      case 'call': {
        const name = (current && K.sheet.isOpen ? current.master?.name : null) || page?.name || '';
        return K.callSheet(d.phone, name, `/api/c/m/${d.slug}/contact`, {});
      }
      case 'book': return book();
      case 'booking': return openBooking(d.id);
      case 'cancel': return cancel();
      case 'paid': return sendScreenshot();
      case 'copy': return K.copyText(d.text);
      case 'map': {
        const g = (current && K.sheet.isOpen ? current.master?.geo : null) || page?.geo;
        return g ? K.openLink(mapsUrl(g)) : undefined;
      }
      case 'resched': {
        const b = current;
        // мастер и услуга записи; страница мастера нужна для подтверждения
        return K.api(`/api/c/m/${b.master.slug}`).then((p) => {
          page = p;
          const s = p.services.find((x) => x.title === b.service) || { id: '', title: b.service, durationMin: Math.round((new Date(b.end) - new Date(b.start)) / 60000), price: b.price };
          flow = { slug: b.master.slug, service: s, date: K.keyOf(b.start), start: null, reschedule: b.id };
          return pickTime();
        });
      }
      default:
        if (t.classList.contains('x') && t.dataset.act === 'close') return K.sheet.close();
        if (d.act === 'close') return K.sheet.close();
        return undefined;
    }
  }

  async function start(core, { slug }) {
    K = core;
    K.$('#tabs').hidden = true;
    try {
      me = await K.api('/api/c/me');
    } catch (e) {
      return K.fatal(e.status === 401 ? K.state.L.expired : K.errText(e));
    }
    K.state.L = window.I18N[me.lang] || window.I18N.ru;
    C = K.state.L.c;
    K.state.me = { today: me.today, lang: me.lang };
    document.documentElement.lang = me.lang;
    return slug ? openMaster(slug) : home();
  }

  return { start, onClick };
})();
