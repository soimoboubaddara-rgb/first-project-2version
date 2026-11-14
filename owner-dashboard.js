/* owner-dashboard.js — لوحة مول المحل: كل الكراسي، الطابور، مواعيد اليوم، الفريق والمداخيل */
(() => {
  'use strict';
  const session = APP.requireRole('owner');
  if (!session) return;

  const $ = id => document.getElementById(id);
  const L = () => APP.getLang();
  const E = APP.esc;
  const t = APP.t;
  const salonId = session.salonId;

  const miniTable = (heads, rows, emptyKey) => rows.length
    ? `<div class="table-wrap"><table><thead><tr>${heads.map(h => `<th>${E(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`
    : `<p class="muted center pad">${E(t(emptyKey || 'noData'))}</p>`;

  function fillFilters(db) {
    const curB = $('fBarber').value, curS = $('fStatus').value;
    $('fBarber').innerHTML = `<option value="">${E(t('all'))}</option>` +
      db.barbers.filter(b => b.salonId === salonId).map(b => `<option value="${E(b.id)}">${E(b.name)}</option>`).join('');
    $('fStatus').innerHTML = `<option value="">${E(t('all'))}</option>` +
      APP.STATUSES.map(s => `<option value="${s}">${E(t('st_' + s))}</option>`).join('');
    $('fBarber').value = curB; $('fStatus').value = curS;
  }

  function render() {
    const db = APP.getDB();
    const barbers = db.barbers.filter(b => b.salonId === salonId);
    const services = db.services.filter(s => s.salonId === salonId);
    const bookings = db.bookings.filter(b => b.salonId === salonId);
    const today = APP.todayStr();
    const ui = APP.ui;
    $('who').textContent = session.name;

    // الإحصائيات
    const s = ui.stats(bookings);
    $('stats').innerHTML = [
      ui.statTile('fa-calendar-check', 'gold', t('statToday'), s.today),
      ui.statTile('fa-user-clock', 'blue', t('statWaiting'), s.waiting),
      ui.statTile('fa-scissors', 'amber', t('statInProgress'), s.inProgress),
      ui.statTile('fa-circle-check', 'green', t('statDone'), s.doneToday),
      ui.statTile('fa-sack-dollar', 'purple', t('statRevToday'), APP.money(s.revToday)),
      ui.statTile('fa-coins', 'gold', t('statRevenue'), APP.money(s.revTotal))
    ].join('');

    // الكراسي وحالة كل حلاق
    $('chairs').innerHTML = barbers.map(b => ui.chairCard(db, b)).join('') || `<p class="muted">${E(t('noData'))}</p>`;

    // مواعيد اليوم كاملة (منتهية / قيد العمل / محجوزة / في الانتظار)
    const todays = bookings.filter(b => b.date === today).sort((a, b) => a.time.localeCompare(b.time) || a.createdAt - b.createdAt);
    $('todayCount').textContent = todays.length;
    $('todayList').innerHTML = ui.bookingTable(db, todays, { barber: true, phone: true, empty: 'todayEmpty' });

    // طابور الانتظار
    $('queueList').innerHTML = ui.queueList(db, barbers);

    // الفريق
    $('teamTable').innerHTML = miniTable([t('colName'), t('colUser'), t('colStatus'), t('colActions')], barbers.map(b => {
      const u = db.users.find(x => x.id === b.userId);
      return `<tr><td><b>${E(b.name)}</b></td><td dir="ltr">${E(u ? u.username : '')}</td><td>${ui.bbadge(b.status)}</td>
        <td><button type="button" class="btn danger sm" data-del-barber="${E(b.id)}">${E(t('del'))}</button></td></tr>`;
    }));

    // المداخيل حسب الحلاق
    $('revenueTable').innerHTML = miniTable([t('colBarber'), t('colDone'), t('colRevenue')], barbers.map(b => {
      const done = bookings.filter(k => k.barberId === b.id && k.status === 'done');
      return `<tr><td><b>${E(b.name)}</b></td><td>${done.length}</td><td class="gold">${E(APP.money(done.reduce((a, k) => a + k.price, 0)))}</td></tr>`;
    }));

    // الخدمات
    $('servicesTable').innerHTML = miniTable([t('services'), t('colPrice'), t('duration'), t('colActions')], services.map(sv =>
      `<tr><td><b>${E(sv.name[L()])}</b></td><td>${E(APP.money(sv.price))}</td><td>${sv.duration} ${E(t('min'))}</td>
        <td><button type="button" class="btn danger sm" data-del-service="${E(sv.id)}">${E(t('del'))}</button></td></tr>`));

    // كل الحجوزات مع الفلاتر
    fillFilters(db);
    const fd = $('fDate').value, fb = $('fBarber').value, fs = $('fStatus').value;
    const all = bookings.filter(b => (!fd || b.date === fd) && (!fb || b.barberId === fb) && (!fs || b.status === fs))
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    $('allList').innerHTML = ui.bookingTable(db, all, { barber: true, phone: true, date: true });
  }

  /* ---------- الأحداث ---------- */
  document.addEventListener('click', e => {
    const w = e.target.closest('[data-act="walkin"]');
    if (w) { APP.openWalkinModal({ barberId: w.dataset.barber || null, onDone: render }); return; }
    const bb = e.target.closest('[data-del-barber]');
    if (bb) { if (confirm(t('confirmDel'))) { APP.removeBarber(bb.dataset.delBarber); render(); } return; }
    const sb = e.target.closest('[data-del-service]');
    if (sb) { if (confirm(t('confirmDel'))) { APP.removeService(sb.dataset.delService); render(); } return; }
    if (APP.dispatch(e.target)) render();
  });

  ['fDate', 'fBarber', 'fStatus'].forEach(id => $(id).addEventListener('change', render));

  $('barberForm').addEventListener('submit', e => {
    e.preventDefault();
    const err = $('barberErr'); err.textContent = '';
    if (!$('bName').value.trim()) { err.textContent = t('errName'); return; }
    const r = APP.addBarber($('bName').value, $('bUser').value.trim(), $('bPass').value);
    if (!r.ok) { err.textContent = t(r.error); return; }
    e.target.reset(); render();
  });

  $('serviceForm').addEventListener('submit', e => {
    e.preventDefault();
    if (APP.addService($('sAr').value, $('sFr').value, $('sPrice').value, $('sDur').value)) { e.target.reset(); $('sDur').value = 30; render(); }
    else APP.toast(t('noData'), 'err');
  });

  APP.initPage();
  render();
  APP.live(() => { if (!document.querySelector('.modal-overlay')) render(); });
})();
