/* customer.js — واجهة الزبائن: كل الخيارات ظاهرة، انتقال تلقائي للخطوة التالية،
   موعد محدد أو دخول فوري، وواتساب اقتراحي بعد اكتمال الحجز */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const L = () => APP.getLang();
  const E = APP.esc;
  const t = APP.t;
  const state = { barberId: null, serviceIds: [], kind: 'scheduled', date: APP.todayStr(), time: null };
  let prevDone = { s1: false, s2: false, s3: false };

  const specificBarber = () => state.barberId && state.barberId !== 'auto';

  /* ---------- الرسم ---------- */
  function renderBanner(db) {
    const today = APP.todayStr();
    $('waitCount').textContent = db.bookings.filter(b => b.type === 'walkin' && b.status === 'waiting' && b.date === today).length;
    const w = db.barbers.length ? Math.min(...db.barbers.map(b => APP.barberWait(db, b))) : 0;
    $('estWait').textContent = APP.ui.fmtWait(w);
  }

  function renderBarbers(db) {
    const walk = state.kind === 'walkin';
    const cards = [];
    if (walk && db.barbers.length) {
      const w = Math.min(...db.barbers.map(b => APP.barberWait(db, b)));
      const sel = state.barberId === 'auto';
      cards.push(`<button type="button" class="opt ${sel ? 'sel' : ''}" data-id="auto">
        <div class="row between"><i class="fa-solid fa-bolt xl gold"></i></div>
        <h4>${E(t('anyBarber'))}</h4><p class="muted xs">${E(t('anyBarberSub'))}</p>
        <span class="chip">${E(t('waitShort'))}: ${E(APP.ui.fmtWait(w))}</span></button>`);
    }
    db.barbers.forEach(b => {
      const act = APP.activeBooking(db, b.id);
      const sel = state.barberId === b.id;
      const sub = act ? `${t('withCust')}: ${APP.firstName(act.customerName)}` : (b.status === 'break' ? t('onBreakNote') : t('readyForYou'));
      cards.push(`<button type="button" class="opt ${sel ? 'sel' : ''}" data-id="${E(b.id)}">
        <div class="row between"><i class="fa-solid fa-chair xl ${sel ? 'gold' : 'muted'}"></i>${APP.ui.bbadge(b.status)}</div>
        <h4>${E(b.name)}</h4><p class="muted xs">${E(sub)}</p>
        ${walk ? `<span class="chip">${E(t('waitShort'))}: ${E(APP.ui.fmtWait(APP.barberWait(db, b)))}</span>` : ''}</button>`);
    });
    $('barbers').innerHTML = cards.join('') || `<p class="muted">${E(t('noData'))}</p>`;
  }

  function renderServices(db) {
    $('services').innerHTML = db.services.map(s => {
      const sel = state.serviceIds.includes(s.id);
      return `<button type="button" class="opt svc ${sel ? 'sel' : ''}" data-id="${E(s.id)}">
        <div class="row"><div class="svc-ico"><i class="fa-solid ${E(s.icon || 'fa-scissors')}"></i></div>
        <div><h4 style="font-size:.92rem">${E(s.name[L()])}</h4><span class="muted xs">${s.duration} ${E(t('min'))}</span></div></div>
        <b class="gold">${E(APP.money(s.price))}</b></button>`;
    }).join('') || `<p class="muted">${E(t('noData'))}</p>`;
  }

  function renderTotals(db) {
    const tot = APP.serviceTotals(db, state.serviceIds);
    $('totalPrice').textContent = APP.money(tot.price);
    $('totalTime').textContent = tot.duration + ' ' + t('min');
  }

  function renderKind(db) {
    const walk = state.kind === 'walkin';
    $('kindScheduled').classList.toggle('on', !walk);
    $('kindWalkin').classList.toggle('on', walk);
    $('scheduledBox').classList.toggle('hidden', walk);
    $('walkinBox').classList.toggle('hidden', !walk);
    $('submitBtn').innerHTML = `<span>${E(walk ? t('joinQueue') : t('confirmBook'))}</span> <i class="fa-solid fa-arrow-${L() === 'ar' ? 'left' : 'right'}"></i>`;
    if (walk) {
      const id = state.barberId === 'auto' ? APP.bestBarberId(db) : state.barberId;
      const b = db.barbers.find(x => x.id === id);
      $('walkinWait').textContent = b ? APP.ui.fmtWait(APP.barberWait(db, b)) : '—';
    }
  }

  // كل الأوقات ظاهرة؛ المحجوزة/المنتهية معطلة ولا يمكن الضغط عليها
  function renderSlots(db) {
    if (state.kind !== 'scheduled') return;
    const tot = APP.serviceTotals(db, state.serviceIds);
    const hint = $('pickHint');
    if (!specificBarber()) {
      hint.classList.remove('hidden');
      $('slots').innerHTML = APP.allTimes().map(tm => `<button type="button" class="slot" disabled>${tm}</button>`).join('');
      return;
    }
    hint.classList.add('hidden');
    const sl = APP.slotsFor(db, state.barberId, state.date, tot.duration || 30);
    const cur = sl.find(s => s.time === state.time);
    if (!cur || cur.state !== 'free') state.time = null;
    $('slots').innerHTML = sl.map(s =>
      `<button type="button" class="slot ${s.state === 'booked' ? 'booked' : ''} ${s.time === state.time ? 'sel' : ''}" data-time="${s.time}" ${s.state !== 'free' ? 'disabled' : ''}
        title="${E(s.state === 'booked' ? t('legendBooked') : s.state === 'free' ? t('legendFree') : t('legendPast'))}">${s.time}</button>`).join('');
  }

  function renderSide(db) {
    // لوحة الانتظار المباشرة (الاسم الأول فقط حفاظاً على الخصوصية)
    const items = [];
    db.barbers.forEach(b => APP.queueInfo(db, b.id).forEach(x => items.push({ ...x, barber: b })));
    items.sort((a, b) => a.booking.createdAt - b.booking.createdAt);
    $('queueBoard').innerHTML = items.length ? items.map((it, i) =>
      `<div class="qitem"><div class="row"><span class="qnum">${i + 1}</span>
        <div><b>${E(APP.firstName(it.booking.customerName))}</b><div class="muted xs">${E(t('barber'))}: ${E(it.barber.name)}</div></div></div>
        <span class="chip">~ ${E(APP.ui.fmtWait(it.waitMin))}</span></div>`).join('')
      : `<p class="muted center pad xs">${E(t('queueEmpty'))}</p>`;

    // حجوزاتي (من هذا الجهاز فقط)
    const mine = APP.getMyBookingIds().map(id => db.bookings.find(b => b.id === id)).filter(Boolean).reverse().slice(0, 4);
    $('myBookings').innerHTML = mine.length ? mine.map(b => {
      const barber = db.barbers.find(x => x.id === b.barberId);
      let line = b.type === 'scheduled' ? `${b.date} • ${b.time}` : '';
      if (b.type === 'walkin' && b.status === 'waiting') {
        const info = APP.queueInfo(db, b.barberId); const i = info.findIndex(x => x.booking.id === b.id);
        if (i >= 0) line = `${t('position')}: ${i + 1} • ~ ${APP.ui.fmtWait(info[i].waitMin)}`;
      }
      return `<div class="mybook"><div class="row between"><b>${E(APP.serviceLabel(b))}</b>${APP.ui.badge(b.status)}</div>
        <div class="muted xs">${E(t('barber'))}: ${E(barber ? barber.name : '—')}${line ? ' • ' + E(line) : ''}</div></div>`;
    }).join('') : `<p class="muted center pad xs">${E(t('myBookingsEmpty'))}</p>`;
  }

  // أرقام الخطوات + تمييز الخطوة التالية + انتقال تلقائي بعد ملء الخيار
  function renderSteps() {
    const name = $('custName').value.trim(), phone = $('custPhone').value.trim();
    const d = {
      s1: !!state.barberId,
      s2: state.serviceIds.length > 0,
      s3: name.length >= 2 && phone.length >= 8 && (state.kind === 'walkin' || !!state.time)
    };
    const next = !d.s1 ? 1 : !d.s2 ? 2 : !d.s3 ? 3 : 0;
    ['s1', 's2', 's3'].forEach((k, i) => {
      const el = $('step' + (i + 1)) || $('bookForm');
      el.classList.toggle('done', d[k]);
      el.classList.toggle('active-step', next === i + 1);
      el.querySelector('.step-num').innerHTML = d[k] ? '<i class="fa-solid fa-check"></i>' : String(i + 1);
    });
    if ((!prevDone.s1 && d.s1) || (!prevDone.s2 && d.s2)) {
      if (next > 0) (next === 3 ? $('bookForm') : $('step' + next)).scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    prevDone = d;
  }

  function render() {
    const db = APP.getDB();
    renderBanner(db); renderBarbers(db); renderServices(db); renderTotals(db);
    renderKind(db); renderSlots(db); renderSide(db); renderSteps();
  }

  /* ---------- الأحداث ---------- */
  $('barbers').addEventListener('click', e => {
    const el = e.target.closest('[data-id]'); if (!el) return;
    state.barberId = el.dataset.id; render();
  });
  $('services').addEventListener('click', e => {
    const el = e.target.closest('[data-id]'); if (!el) return;
    const id = el.dataset.id;
    state.serviceIds = state.serviceIds.includes(id) ? state.serviceIds.filter(x => x !== id) : [...state.serviceIds, id];
    render();
  });
  $('slots').addEventListener('click', e => {
    const el = e.target.closest('[data-time]'); if (!el || el.disabled) return;
    state.time = el.dataset.time; render();
  });
  $('kindScheduled').onclick = () => { state.kind = 'scheduled'; if (state.barberId === 'auto') state.barberId = null; render(); };
  $('kindWalkin').onclick = () => { state.kind = 'walkin'; render(); };
  ['custName', 'custPhone'].forEach(id => $(id).addEventListener('input', renderSteps));

  const d = $('date');
  d.min = APP.todayStr(); d.max = APP.maxDate(); d.value = state.date;
  d.addEventListener('change', () => {
    if (!d.value || d.value < d.min || d.value > d.max) { d.value = state.date; return; }
    state.date = d.value; state.time = null; render();
  });

  $('bookForm').addEventListener('submit', e => {
    e.preventDefault();
    const err = $('formErr'); err.textContent = '';
    const common = { barberId: state.barberId, serviceIds: state.serviceIds, customerName: $('custName').value, customerPhone: $('custPhone').value };
    const r = state.kind === 'walkin'
      ? APP.addWalkin({ ...common, source: 'customer' })
      : APP.createBooking({ ...common, date: state.date, time: state.time });
    if (!r.ok) {
      err.textContent = t(r.error); APP.toast(t(r.error), 'err');
      if (r.error === 'slotTaken') state.time = null;
      render(); return;
    }
    APP.rememberBooking(r.booking.id);
    showDone(r);
    render();
  });

  function showDone(r) {
    const b = r.booking, db = r.db;
    const barber = db.barbers.find(x => x.id === b.barberId);
    const salon = db.salons[0];
    const rows = [
      [t('barber'), barber ? barber.name : '—'],
      [t('services'), APP.serviceLabel(b)],
      [t('kind'), t('kind_' + b.type)]
    ];
    if (b.type === 'scheduled') rows.push([t('date'), b.date], [t('time'), b.time]);
    else rows.push([t('position'), String(r.position)], [t('walkinWait'), APP.ui.fmtWait(r.waitMin)]);
    rows.push([t('price'), APP.money(b.price)]);
    $('doneTitle').textContent = b.type === 'walkin' ? t('walkinDone') : t('bookingDone');
    $('doneSummary').innerHTML = rows.map(([k, v]) => `<div><span>${E(k)}</span><b>${E(v)}</b></div>`).join('');
    // الرابط جاهز لكن لا يُفتح إلا إذا ضغط الزبون عليه
    $('waBtn').href = APP.waLink(salon.phone, APP.buildBookingMessage(b, db));
    $('bookingFlow').classList.add('hidden');
    $('secDone').classList.remove('hidden');
    $('secDone').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  $('newBtn').onclick = () => {
    state.barberId = null; state.serviceIds = []; state.time = null;
    prevDone = { s1: false, s2: false, s3: false };
    $('secDone').classList.add('hidden');
    $('bookingFlow').classList.remove('hidden');
    render(); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  APP.initPage();
  render();
  APP.live(() => { if (!document.querySelector('.modal-overlay')) render(); });
})();
