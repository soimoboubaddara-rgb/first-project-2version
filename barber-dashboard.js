/* barber-dashboard.js — لوحة الحلاق: كرسيه وحالته، طابوره، مواعيده فقط */
(() => {
  'use strict';
  const session = APP.requireRole('barber');
  if (!session) return;

  const $ = id => document.getElementById(id);
  const E = APP.esc;
  const t = APP.t;
  let myBarberId = null;

  function render() {
    const db = APP.getDB();
    const barber = APP.getBarberByUser(db, session.userId);
    if (!barber) { APP.logout(); return; }
    myBarberId = barber.id;
    const ui = APP.ui;
    const today = APP.todayStr();

    // صارم: حجوزات هذا الحلاق فقط
    const mine = db.bookings.filter(b => b.barberId === barber.id && b.salonId === barber.salonId);
    const s = ui.stats(mine);
    $('who').textContent = barber.name;
    $('stats').innerHTML = [
      ui.statTile('fa-calendar-check', 'gold', t('statToday'), s.today),
      ui.statTile('fa-user-clock', 'blue', t('statWaiting'), s.waiting),
      ui.statTile('fa-circle-check', 'green', t('statDone'), s.doneToday),
      ui.statTile('fa-sack-dollar', 'purple', t('statRevToday'), APP.money(s.revToday))
    ].join('');

    $('chair').innerHTML = ui.chairCard(db, barber);
    $('queueList').innerHTML = ui.queueList(db, [barber]);

    const todays = mine.filter(b => b.date === today).sort((a, b) => a.time.localeCompare(b.time) || a.createdAt - b.createdAt);
    $('todayCount').textContent = todays.length;
    $('todayList').innerHTML = ui.bookingTable(db, todays, { phone: true, empty: 'todayEmpty' });

    const upcoming = mine.filter(b => b.date > today && b.status !== 'cancelled').sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    $('upcomingList').innerHTML = ui.bookingTable(db, upcoming, { phone: true, date: true, empty: 'upcomingEmpty' });
  }

  document.addEventListener('click', e => {
    if (e.target.closest('[data-act="walkin"]')) { APP.openWalkinModal({ barberId: myBarberId, onDone: render }); return; }
    if (APP.dispatch(e.target)) render();
  });

  APP.initPage();
  render();
  APP.live(() => { if (!document.querySelector('.modal-overlay')) render(); });
})();
