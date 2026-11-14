/* =====================================================
   app.js — صالون الفخامة (النسخة 2)
   قاعدة البيانات المحلية + الصلاحيات (RBAC) + الترجمة + الطابور + الأوقات + واتساب
   ملاحظة: النظام تجريبي يعمل بالكامل في المتصفح (localStorage)، فالبيانات لا تُشارك
   بين أجهزة مختلفة. للاستعمال الحقيقي يجب نقل البيانات والمصادقة إلى Backend آمن.
   ===================================================== */
const APP = (() => {
  'use strict';

  const DB_KEY = 'salon_fakhama_db_v2';
  const SESSION_KEY = 'salon_fakhama_session_v2';
  const LANG_KEY = 'salon_fakhama_lang';
  const MY_KEY = 'salon_fakhama_my_bookings';
  const SALON_ID = 's1';
  const OPEN = 9 * 60;        // 09:00
  const CLOSE = 21 * 60;      // 21:00
  const STEP = 30;            // دقيقة بين كل وقتين
  const MAX_DAYS = 30;        // أقصى مدة للحجز المسبق
  const IDLE_BUSY_MIN = 15;   // تقدير الانتظار إذا كان الحلاق مشغولاً/في استراحة دون زبون مسجل
  const STATUSES = ['confirmed', 'waiting', 'in_progress', 'done', 'cancelled'];
  const BARBER_STATUSES = ['available', 'busy', 'break'];

  /* ---------------- الترجمة ---------------- */
  const I18N = {
    ar: {
      appName: 'صالون الفخامة', tagline: 'نظام إدارة المواعيد والكراسي اللحظي', langBtn: 'Français', logout: 'تسجيل الخروج', staffLogin: 'دخول الفريق',
      all: 'الكل', dh: 'د.م', min: 'دقيقة', noData: 'لا توجد بيانات', del: 'حذف', cancel: 'إلغاء', close: 'إغلاق', back: 'رجوع للرئيسية',
      confirmDel: 'هل أنت متأكد من الحذف؟', confirmCancel: 'هل تريد إلغاء هذا الحجز؟', noWait: 'بدون انتظار', forbidden: 'غير مسموح بهذه العملية',
      /* الزبون */
      liveNow: 'الحجز المباشر متوفر الآن', heroTitle: 'احجز نوبتك بضغط زر ودون انتظار',
      heroSub: 'اختر الحلاق، حدد الخدمات والوقت المناسب، أو انضم لقائمة الانتظار المباشرة في الصالون.',
      inQueue: 'في الانتظار', expWait: 'أقل وقت انتظار متوقع',
      step1: 'اختر الحلاق / الكرسي المفضل', step2: 'اختر الخدمات المطلوبة (يمكنك اختيار أكثر من خدمة)', step3: 'بياناتك وتحديد التوقيت',
      anyBarber: 'أي حلاق (الأقل انتظاراً)', anyBarberSub: 'نختار لك الحلاق الأسرع',
      bs_available: 'متاح', bs_busy: 'مشغول', bs_break: 'في استراحة',
      withCust: 'مع', readyForYou: 'جاهز لاستقبالك', onBreakNote: 'في استراحة حالياً', waitShort: 'انتظار متوقع',
      fullName: 'اسمك الكريم', phone: 'رقم الهاتف', phonePh: '06xxxxxxxx', namePh: 'أدخل اسمك الكامل', phoneOptional: 'رقم الهاتف (اختياري)',
      bookingKind: 'نوع الحجز', kindScheduled: 'موعد محدد', kindWalkin: 'الدخول الفوري (انضمام للدور)',
      date: 'التاريخ', timesTitle: 'الأوقات (المحجوزة لا يمكن اختيارها)', pickBarberFirst: 'اختر حلاقاً محدداً لمعرفة الأوقات المتاحة له',
      legendFree: 'متاح', legendBooked: 'محجوز', legendPast: 'غير متاح',
      walkinInfo: 'سيتم إضافتك لقائمة انتظار الحلاق المختار حسب ترتيب الوصول.', walkinWait: 'وقت الانتظار المتوقع',
      total: 'الإجمالي الكلي', estDuration: 'المدة المقدرة', confirmBook: 'تأكيد الحجز', joinQueue: 'انضمام لقائمة الانتظار',
      queueBoard: 'قائمة الانتظار المباشرة', liveUpdate: 'تحديث لحظي', queueEmpty: 'لا يوجد زبائن حالياً في قائمة الانتظار',
      myBookings: 'حجوزاتي', myBookingsEmpty: 'لم تقم بأي حجز من هذا الجهاز بعد', position: 'ترتيبك في الدور',
      errBarber: 'اختر الحلاق أولاً', errService: 'اختر خدمة واحدة على الأقل', errName: 'المرجو إدخال الاسم',
      errPhone: 'رقم هاتف مغربي غير صحيح (مثال: 0612345678)', errDate: 'تاريخ غير صالح', errSlot: 'المرجو اختيار الوقت المناسب',
      slotTaken: 'عذراً، هذا الوقت غير متاح. اختر وقتاً آخر.', barberBreak: 'هذا الحلاق في استراحة حالياً، اختر حلاقاً آخر',
      closedNow: 'الصالون مغلق الآن، الدخول الفوري متاح من 09:00 إلى 21:00',
      bookingDone: 'تم تأكيد حجزك ✅', walkinDone: 'تمت إضافتك لقائمة الانتظار ✅', doneSub: 'حجزك مسجل في النظام ولا تحتاج إلى أي خطوة أخرى.',
      waSuggestTitle: 'هل تريد إرسال رسالة للصالون عبر واتساب؟', waSuggestSub: 'اختياري — حجزك مسجل بالفعل، والرسالة للتواصل فقط.',
      sendWhatsapp: 'إرسال عبر واتساب', newBooking: 'حجز جديد',
      salon: 'الصالون', barber: 'الحلاق', services: 'الخدمات', kind: 'النوع', time: 'الوقت', price: 'الثمن', status: 'الحالة',
      waHeader: 'حجز جديد ✂️', waName: 'الاسم', waPhone: 'الهاتف', waKindWalkin: 'دخول فوري (انتظار)', waKindScheduled: 'موعد محدد',
      waHello: 'مرحباً', waRemind: 'نذكرك بموعدك في', waCall: 'دورك في', waCall2: 'اقترب، المرجو الحضور.', actWa: 'واتساب',
      /* الدخول */
      loginTitle: 'تسجيل الدخول', loginSub: 'خاص بمول المحل والحلاقين', username: 'اسم المستخدم', password: 'كلمة المرور',
      loginBtn: 'دخول', badCreds: 'اسم المستخدم أو كلمة المرور غير صحيحة',
      /* اللوحات */
      ownerTitle: 'لوحة مول المحل', barberTitle: 'لوحة الحلاق',
      statToday: 'مواعيد اليوم', statWaiting: 'في الطابور', statInProgress: 'قيد العمل', statDone: 'منتهية اليوم',
      statRevToday: 'مداخيل اليوم', statRevenue: 'المداخيل الإجمالية', statBarbers: 'عدد الحلاقين',
      chairsTitle: 'إدارة الكراسي والحالة الفورية', chairsHint: 'تغيير حالة الكرسي يؤثر فوراً على حجوزات الزبائن',
      myChair: 'كرسيي وحالتي', currentCustomer: 'الزبون الحالي:', noCurrent: 'لا يوجد زبون حالي', updateStatus: 'تحديث حالة الكرسي:',
      finishNow: 'إنهاء الحلاقة وإتاحة الكرسي', callNext: 'استدعاء الزبون التالي', addWalkin: 'إضافة زبون مباشر',
      todayTitle: 'مواعيد اليوم', todayEmpty: 'لا توجد مواعيد اليوم', upcomingTitle: 'المواعيد القادمة', upcomingEmpty: 'لا توجد مواعيد قادمة',
      queueTitle: 'طابور الانتظار (Walk-In)', queueEmpty2: 'طابور الانتظار فارغ حالياً', arrived: 'وصل', callToChair: 'استدعاء للكرسي',
      startService: 'بدء الخدمة', finish: 'إنهاء', cancelAct: 'إلغاء',
      walkinModalTitle: 'إضافة زبون مباشر لطابور الانتظار', walkinAdded: 'تمت إضافة الزبون لطابور الانتظار',
      errActive: 'أنهِ الحلاقة الحالية أولاً', errBusyBarber: 'الحلاق مشغول بزبون آخر، أنهِ خدمته أولاً', errNotToday: 'يمكن بدء الخدمة في يوم الموعد فقط', errState: 'لا يمكن تنفيذ هذه العملية على هذا الحجز',
      st_confirmed: 'محجوز', st_waiting: 'في الانتظار', st_in_progress: 'قيد العمل', st_done: 'منتهي', st_cancelled: 'ملغى',
      kind_scheduled: 'موعد', kind_walkin: 'فوري',
      team: 'فريق العمل (الحلاقون)', addBarber: 'إضافة حلاق جديد', barberName: 'اسم الحلاق', barberUser: 'اسم المستخدم', barberPass: 'كلمة المرور',
      userExists: 'اسم المستخدم مستعمل من قبل', invalidUser: 'اسم المستخدم: 3-20 حرفاً لاتينياً أو أرقاماً', shortPass: 'كلمة المرور قصيرة جداً',
      servicesTitle: 'الخدمات والأسعار', addService: 'إضافة خدمة', svcNameAr: 'الاسم بالعربية', svcNameFr: 'الاسم بالفرنسية', duration: 'المدة (دقيقة)',
      revenueByBarber: 'المداخيل حسب الحلاق', allBookings: 'جميع الحجوزات', filterDate: 'التاريخ', filterBarber: 'الحلاق', filterStatus: 'الحالة',
      colName: 'الاسم', colUser: 'المستخدم', colCustomer: 'الزبون', colPhone: 'الهاتف', colBarber: 'الحلاق', colServices: 'الخدمات', colKind: 'النوع',
      colDate: 'التاريخ', colTime: 'الوقت', colPrice: 'الثمن', colStatus: 'الحالة', colActions: 'إجراءات', colRevenue: 'المداخيل', colDone: 'منجزة'
    },
    fr: {
      appName: 'Salon Prestige', tagline: 'Gestion en temps réel des rendez-vous et des fauteuils', langBtn: 'العربية', logout: 'Déconnexion', staffLogin: 'Espace équipe',
      all: 'Tous', dh: 'MAD', min: 'min', noData: 'Aucune donnée', del: 'Supprimer', cancel: 'Annuler', close: 'Fermer', back: "Retour à l'accueil",
      confirmDel: 'Confirmer la suppression ?', confirmCancel: 'Voulez-vous annuler cette réservation ?', noWait: "Pas d'attente", forbidden: 'Opération non autorisée',
      liveNow: 'Réservation en direct disponible', heroTitle: 'Réservez votre tour en un clic, sans attendre',
      heroSub: "Choisissez le coiffeur, les services et l'heure, ou rejoignez la file d'attente en direct du salon.",
      inQueue: "En attente", expWait: "Attente minimale estimée",
      step1: 'Choisissez votre coiffeur / fauteuil', step2: 'Choisissez les services (plusieurs possibles)', step3: 'Vos informations et le moment',
      anyBarber: "N'importe quel coiffeur (le plus rapide)", anyBarberSub: 'Nous choisissons le plus rapide',
      bs_available: 'Disponible', bs_busy: 'Occupé', bs_break: 'En pause',
      withCust: 'Avec', readyForYou: 'Prêt à vous accueillir', onBreakNote: 'En pause actuellement', waitShort: 'Attente estimée',
      fullName: 'Votre nom', phone: 'Téléphone', phonePh: '06xxxxxxxx', namePh: 'Entrez votre nom complet', phoneOptional: 'Téléphone (facultatif)',
      bookingKind: 'Type de réservation', kindScheduled: 'Rendez-vous', kindWalkin: 'Passage immédiat (rejoindre la file)',
      date: 'Date', timesTitle: 'Horaires (les créneaux réservés sont bloqués)', pickBarberFirst: 'Choisissez un coiffeur précis pour voir ses horaires',
      legendFree: 'Libre', legendBooked: 'Réservé', legendPast: 'Indisponible',
      walkinInfo: "Vous serez ajouté à la file du coiffeur choisi selon l'ordre d'arrivée.", walkinWait: "Temps d'attente estimé",
      total: 'Total', estDuration: 'Durée estimée', confirmBook: 'Confirmer la réservation', joinQueue: 'Rejoindre la file',
      queueBoard: "File d'attente en direct", liveUpdate: 'Temps réel', queueEmpty: "Aucun client dans la file pour le moment",
      myBookings: 'Mes réservations', myBookingsEmpty: "Aucune réservation faite depuis cet appareil", position: 'Votre rang',
      errBarber: "Choisissez d'abord un coiffeur", errService: 'Choisissez au moins un service', errName: 'Veuillez saisir votre nom',
      errPhone: 'Numéro marocain invalide (ex : 0612345678)', errDate: 'Date invalide', errSlot: "Veuillez choisir l'heure",
      slotTaken: "Désolé, ce créneau n'est pas disponible. Choisissez-en un autre.", barberBreak: 'Ce coiffeur est en pause, choisissez-en un autre',
      closedNow: "Le salon est fermé, le passage immédiat est possible de 09:00 à 21:00",
      bookingDone: 'Réservation confirmée ✅', walkinDone: "Vous êtes dans la file d'attente ✅", doneSub: "Votre réservation est enregistrée, aucune autre étape n'est nécessaire.",
      waSuggestTitle: 'Envoyer un message au salon sur WhatsApp ?', waSuggestSub: "Facultatif — votre réservation est déjà enregistrée.",
      sendWhatsapp: 'Envoyer via WhatsApp', newBooking: 'Nouvelle réservation',
      salon: 'Salon', barber: 'Coiffeur', services: 'Services', kind: 'Type', time: 'Heure', price: 'Prix', status: 'Statut',
      waHeader: 'Nouvelle réservation ✂️', waName: 'Nom', waPhone: 'Téléphone', waKindWalkin: 'Passage immédiat (file)', waKindScheduled: 'Rendez-vous',
      waHello: 'Bonjour', waRemind: 'nous vous rappelons votre rendez-vous chez', waCall: 'votre tour chez', waCall2: 'approche, merci de vous présenter.', actWa: 'WhatsApp',
      loginTitle: 'Connexion', loginSub: 'Réservé au propriétaire et aux coiffeurs', username: "Nom d'utilisateur", password: 'Mot de passe',
      loginBtn: 'Se connecter', badCreds: "Nom d'utilisateur ou mot de passe incorrect",
      ownerTitle: 'Tableau de bord propriétaire', barberTitle: 'Tableau de bord coiffeur',
      statToday: "RDV d'aujourd'hui", statWaiting: 'Dans la file', statInProgress: 'En cours', statDone: "Terminés aujourd'hui",
      statRevToday: "Revenus du jour", statRevenue: 'Revenus totaux', statBarbers: 'Coiffeurs',
      chairsTitle: 'Gestion des fauteuils et statut en direct', chairsHint: "Changer le statut d'un fauteuil impacte immédiatement les réservations",
      myChair: 'Mon fauteuil et mon statut', currentCustomer: 'Client actuel :', noCurrent: 'Aucun client actuellement', updateStatus: 'Mettre à jour le statut :',
      finishNow: 'Terminer et libérer le fauteuil', callNext: 'Appeler le client suivant', addWalkin: 'Ajouter un client sur place',
      todayTitle: "Rendez-vous d'aujourd'hui", todayEmpty: "Aucun rendez-vous aujourd'hui", upcomingTitle: 'Rendez-vous à venir', upcomingEmpty: 'Aucun rendez-vous à venir',
      queueTitle: "File d'attente (Walk-In)", queueEmpty2: "La file d'attente est vide", arrived: 'arrivé à', callToChair: 'Appeler au fauteuil',
      startService: 'Démarrer', finish: 'Terminer', cancelAct: 'Annuler',
      walkinModalTitle: "Ajouter un client sur place à la file", walkinAdded: 'Client ajouté à la file',
      errActive: "Terminez d'abord la coupe en cours", errBusyBarber: "Le coiffeur est occupé, terminez d'abord son service", errNotToday: 'Le service ne peut démarrer que le jour du rendez-vous', errState: 'Opération impossible sur cette réservation',
      st_confirmed: 'Réservé', st_waiting: 'En attente', st_in_progress: 'En cours', st_done: 'Terminé', st_cancelled: 'Annulé',
      kind_scheduled: 'RDV', kind_walkin: 'Sur place',
      team: 'Équipe (coiffeurs)', addBarber: 'Ajouter un coiffeur', barberName: 'Nom du coiffeur', barberUser: "Nom d'utilisateur", barberPass: 'Mot de passe',
      userExists: "Nom d'utilisateur déjà pris", invalidUser: "Nom d'utilisateur : 3-20 caractères latins ou chiffres", shortPass: 'Mot de passe trop court',
      servicesTitle: 'Services et tarifs', addService: 'Ajouter un service', svcNameAr: 'Nom en arabe', svcNameFr: 'Nom en français', duration: 'Durée (min)',
      revenueByBarber: 'Revenus par coiffeur', allBookings: 'Toutes les réservations', filterDate: 'Date', filterBarber: 'Coiffeur', filterStatus: 'Statut',
      colName: 'Nom', colUser: 'Utilisateur', colCustomer: 'Client', colPhone: 'Téléphone', colBarber: 'Coiffeur', colServices: 'Services', colKind: 'Type',
      colDate: 'Date', colTime: 'Heure', colPrice: 'Prix', colStatus: 'Statut', colActions: 'Actions', colRevenue: 'Revenus', colDone: 'Terminés'
    }
  };

  /* ---------------- البيانات الأولية (صالون الفخامة فقط) ---------------- */
  function seed() {
    return {
      salons: [
        { id: SALON_ID, name: { ar: 'صالون الفخامة', fr: 'Salon Prestige' }, city: { ar: 'فاس', fr: 'Fès' }, phone: '212600000001' }
      ],
      users: [
        { id: 'u1', username: 'owner1', password: '123', role: 'owner', salonId: SALON_ID, name: 'مول صالون الفخامة' },
        { id: 'u2', username: 'ahmed', password: '123', role: 'barber', salonId: SALON_ID, name: 'أحمد' },
        { id: 'u3', username: 'khalid', password: '123', role: 'barber', salonId: SALON_ID, name: 'خالد' }
      ],
      barbers: [
        { id: 'b1', salonId: SALON_ID, userId: 'u2', name: 'أحمد', status: 'available' },
        { id: 'b2', salonId: SALON_ID, userId: 'u3', name: 'خالد', status: 'available' }
      ],
      services: [
        { id: 'sv1', salonId: SALON_ID, name: { ar: 'قص الشعر', fr: 'Coupe de cheveux' }, price: 50, duration: 25, icon: 'fa-scissors' },
        { id: 'sv2', salonId: SALON_ID, name: { ar: 'تشذيب اللحية', fr: 'Taille de barbe' }, price: 30, duration: 15, icon: 'fa-user' },
        { id: 'sv3', salonId: SALON_ID, name: { ar: 'باقة قص + لحية', fr: 'Pack coupe + barbe' }, price: 70, duration: 40, icon: 'fa-star' },
        { id: 'sv4', salonId: SALON_ID, name: { ar: 'تنظيف وتغذية البشرة', fr: 'Soin du visage' }, price: 40, duration: 20, icon: 'fa-wand-magic-sparkles' }
      ],
      bookings: []
    };
  }

  /* ---------------- قاعدة البيانات ---------------- */
  let memDB = null; // احتياط إذا كان التخزين غير متاح (وضع التصفح الخاص)
  function saveDB(db) {
    memDB = JSON.parse(JSON.stringify(db));
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) { /* تجاهل */ }
  }
  function getDB() {
    let db = null;
    try { const raw = localStorage.getItem(DB_KEY); if (raw) db = JSON.parse(raw); } catch (e) { db = null; }
    if (!db && memDB) db = JSON.parse(JSON.stringify(memDB));
    if (!db || !Array.isArray(db.bookings) || !Array.isArray(db.barbers) || !Array.isArray(db.services) || !Array.isArray(db.users) || !Array.isArray(db.salons)) {
      db = seed(); saveDB(db); return db;
    }
    if (cleanup(db)) saveDB(db);
    return db;
  }
  // الزبائن الفوريون الذين لم يُخدموا في يوم سابق يُلغون تلقائياً
  function cleanup(db) {
    const today = todayStr(); let changed = false;
    db.bookings.forEach(b => { if (b.type === 'walkin' && b.status === 'waiting' && b.date < today) { b.status = 'cancelled'; changed = true; } });
    return changed;
  }
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const fail = error => ({ ok: false, error });

  /* ---------------- أدوات عامة ---------------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const todayStr = (d = new Date()) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const toTime = m => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const nowHHMM = () => toTime(nowMin());
  const isOpenNow = () => nowMin() >= OPEN && nowMin() < CLOSE;
  const firstName = n => String(n || '').trim().split(/\s+/)[0] || '';
  const maxDate = () => { const d = new Date(); d.setDate(d.getDate() + MAX_DAYS); return todayStr(d); };
  const validDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= todayStr() && d <= maxDate();

  function getLang() { let l = null; try { l = localStorage.getItem(LANG_KEY); } catch (e) { /* */ } return l === 'fr' ? 'fr' : 'ar'; }
  const t = key => (I18N[getLang()] || I18N.ar)[key] ?? key;
  function applyI18n() {
    const lang = getLang();
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  }
  function toggleLang() { try { localStorage.setItem(LANG_KEY, getLang() === 'ar' ? 'fr' : 'ar'); } catch (e) { /* */ } location.reload(); }
  function initPage() {
    applyI18n();
    const lb = document.getElementById('langBtn');
    if (lb) { lb.textContent = t('langBtn'); lb.onclick = toggleLang; }
    const out = document.getElementById('logoutBtn');
    if (out) out.onclick = logout;
    const bn = document.getElementById('brandName');
    if (bn) { const s = getDB().salons[0]; bn.innerHTML = ui.brandName(s ? s.name[getLang()] : t('appName')); }
  }
  function toast(msg, type = 'ok') {
    let box = document.getElementById('toast-container');
    if (!box) { box = document.createElement('div'); box.id = 'toast-container'; document.body.appendChild(box); }
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = `<i class="fa-solid ${type === 'ok' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i><span>${esc(msg)}</span>`;
    box.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 3500);
  }
  const money = n => Number(n || 0).toLocaleString('en-US') + ' ' + t('dh');
  function live(cb, ms = 20000) {
    window.addEventListener('storage', e => { if (!e.key || e.key === DB_KEY) cb(); });
    setInterval(cb, ms);
  }

  /* ---------------- واتساب (اقتراح فقط — لا يُفتح تلقائياً) ---------------- */
  function normalizePhone(p) {
    let d = String(p).replace(/[^\d+]/g, '').replace(/^\+/, '');
    if (d.startsWith('00')) d = d.slice(2);
    if (d.startsWith('0')) d = '212' + d.slice(1);
    return d;
  }
  const isValidMoroccanPhone = p => /^(\+212|00212|0)[5-7]\d{8}$/.test(String(p).replace(/[\s.-]/g, ''));
  const waLink = (phone, text) => 'https://wa.me/' + normalizePhone(phone) + '?text=' + encodeURIComponent(text);
  const serviceLabel = b => (b.serviceNames ? (b.serviceNames[getLang()] || b.serviceNames.ar) : '') || '—';

  function buildBookingMessage(b, db) {
    const L = getLang();
    const salon = db.salons.find(s => s.id === b.salonId);
    const barber = db.barbers.find(x => x.id === b.barberId);
    const lines = [
      t('waHeader'),
      t('salon') + ': ' + (salon ? salon.name[L] : ''),
      t('barber') + ': ' + (barber ? barber.name : ''),
      t('services') + ': ' + serviceLabel(b) + ' (' + b.price + ' ' + t('dh') + ')',
      t('kind') + ': ' + (b.type === 'walkin' ? t('waKindWalkin') : t('waKindScheduled'))
    ];
    if (b.type === 'scheduled') lines.push(t('date') + ': ' + b.date, t('time') + ': ' + b.time);
    lines.push(t('waName') + ': ' + b.customerName, t('waPhone') + ': ' + b.customerPhone);
    return lines.join('\n');
  }
  // رسالة من الحلاق/المالك إلى الزبون (تُرسل بنقرة منه)
  function buildCustomerMessage(b, db) {
    const salon = db.salons.find(s => s.id === b.salonId);
    const sn = salon ? salon.name[getLang()] : '';
    return b.type === 'walkin'
      ? `${t('waHello')} ${b.customerName}، ${t('waCall')} ${sn} ${t('waCall2')}`
      : `${t('waHello')} ${b.customerName}، ${t('waRemind')} ${sn} — ${b.date} ${b.time}`;
  }

  /* ---------------- الخدمات ---------------- */
  function serviceTotals(db, ids) {
    let price = 0, duration = 0; const list = [];
    [...new Set(ids || [])].forEach(id => {
      const s = db.services.find(x => x.id === id && x.salonId === SALON_ID);
      if (s) { price += s.price; duration += s.duration; list.push(s); }
    });
    return { price, duration, list };
  }

  /* ---------------- الطابور وتقدير الانتظار ---------------- */
  const activeBooking = (db, barberId) => db.bookings.find(b => b.barberId === barberId && b.status === 'in_progress');
  const waitingList = (db, barberId) => db.bookings
    .filter(b => b.barberId === barberId && b.type === 'walkin' && b.status === 'waiting' && b.date === todayStr())
    .sort((a, b) => a.createdAt - b.createdAt);

  function baseRemaining(db, barber) {
    const act = activeBooking(db, barber.id);
    if (act) {
      const elapsed = (Date.now() - (act.startedAt || Date.now())) / 60000;
      return Math.max(0, Math.ceil(act.duration - elapsed));
    }
    return barber.status === 'available' ? 0 : IDLE_BUSY_MIN;
  }
  // [{booking, waitMin}] — الدقائق المتوقعة قبل أن يبدأ كل زبون
  function queueInfo(db, barberId) {
    const barber = db.barbers.find(b => b.id === barberId);
    if (!barber) return [];
    let acc = baseRemaining(db, barber);
    return waitingList(db, barberId).map(b => { const o = { booking: b, waitMin: acc }; acc += b.duration; return o; });
  }
  function barberWait(db, barber) {
    let acc = baseRemaining(db, barber);
    waitingList(db, barber.id).forEach(b => { acc += b.duration; });
    return acc;
  }
  function bestBarberId(db) {
    const cands = db.barbers.filter(b => b.status !== 'break');
    if (!cands.length) return null;
    return cands.map(b => ({ id: b.id, w: barberWait(db, b) })).sort((a, b) => a.w - b.w)[0].id;
  }

  /* ---------------- أوقات كل حلاق ---------------- */
  const allTimes = () => { const out = []; for (let m = OPEN; m < CLOSE; m += STEP) out.push(toTime(m)); return out; };
  // كل الأوقات ظاهرة؛ state: free | booked | past | closed
  function slotsFor(db, barberId, date, duration) {
    const dur = Math.max(duration || STEP, 5);
    const isToday = date === todayStr();
    const nm = nowMin();
    const busy = db.bookings
      .filter(b => b.barberId === barberId && b.date === date && b.type === 'scheduled' && b.status !== 'cancelled')
      .map(b => [toMin(b.time), toMin(b.time) + b.duration]);
    return allTimes().map(time => {
      const m = toMin(time);
      let state = 'free';
      if (isToday && m <= nm) state = 'past';
      else if (m + dur > CLOSE) state = 'closed';
      else if (busy.some(([s, e]) => m < e && m + dur > s)) state = 'booked';
      return { time, state };
    });
  }

  /* ---------------- إنشاء الحجوزات ---------------- */
  function baseBooking(db, barber, tot, name, phone, type, date, time, status) {
    return {
      id: uid('bk'), salonId: SALON_ID, barberId: barber.id, type, date, time,
      customerName: name.slice(0, 60), customerPhone: phone.slice(0, 20),
      serviceIds: tot.list.map(s => s.id),
      serviceNames: { ar: tot.list.map(s => s.name.ar).join(' + '), fr: tot.list.map(s => s.name.fr).join(' + ') },
      price: tot.price, duration: tot.duration, status, createdAt: Date.now(), startedAt: null, finishedAt: null
    };
  }

  // موعد محدد (الزبون)
  function createBooking({ barberId, serviceIds, date, time, customerName, customerPhone }) {
    const db = getDB();
    const barber = db.barbers.find(b => b.id === barberId && b.salonId === SALON_ID);
    if (!barber) return fail('errBarber');
    const tot = serviceTotals(db, serviceIds);
    if (!tot.list.length) return fail('errService');
    const name = String(customerName || '').trim();
    if (name.length < 2) return fail('errName');
    const phone = String(customerPhone || '').trim();
    if (!isValidMoroccanPhone(phone)) return fail('errPhone');
    if (!validDate(date)) return fail('errDate');
    const slot = slotsFor(db, barber.id, date, tot.duration).find(s => s.time === time);
    if (!slot) return fail('errSlot');
    if (slot.state !== 'free') return fail('slotTaken');
    const booking = baseBooking(db, barber, tot, name, phone, 'scheduled', date, time, 'confirmed');
    db.bookings.push(booking); saveDB(db);
    return { ok: true, booking, db };
  }

  // دخول فوري: source = 'customer' (عمومي) أو 'staff' (حلاق/مالك مسجل)
  function addWalkin({ barberId, serviceIds, customerName, customerPhone, source }) {
    const db = getDB();
    if (barberId === 'auto' && source === 'customer') barberId = bestBarberId(db);
    const barber = db.barbers.find(b => b.id === barberId && b.salonId === SALON_ID);
    if (!barber) return fail(barberId === null ? 'barberBreak' : 'errBarber');
    const tot = serviceTotals(db, serviceIds);
    if (!tot.list.length) return fail('errService');
    const name = String(customerName || '').trim();
    if (name.length < 2) return fail('errName');
    const phone = String(customerPhone || '').trim();
    if (source === 'customer') {
      if (!isValidMoroccanPhone(phone)) return fail('errPhone');
      if (!isOpenNow()) return fail('closedNow');
      if (barber.status === 'break') return fail('barberBreak');
    } else {
      if (!canManage(db, getSession(), barber.id)) return fail('forbidden');
      if (phone && !isValidMoroccanPhone(phone)) return fail('errPhone');
    }
    const booking = baseBooking(db, barber, tot, name, phone, 'walkin', todayStr(), nowHHMM(), 'waiting');
    db.bookings.push(booking);
    const info = queueInfo(db, barber.id);
    const idx = info.findIndex(x => x.booking.id === booking.id);
    saveDB(db);
    return { ok: true, booking, db, position: idx + 1, waitMin: idx >= 0 ? info[idx].waitMin : 0 };
  }

  const getMyBookingIds = () => { try { return JSON.parse(localStorage.getItem(MY_KEY)) || []; } catch (e) { return []; } };
  function rememberBooking(id) {
    try { localStorage.setItem(MY_KEY, JSON.stringify([...getMyBookingIds(), id].slice(-20))); } catch (e) { /* */ }
  }

  /* ---------------- المصادقة والجلسة ---------------- */
  function getSession() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch (e) { return null; } }
  function login(username, password) {
    const db = getDB();
    const u = db.users.find(x => x.username.toLowerCase() === String(username).trim().toLowerCase() && x.password === password);
    if (!u) return null;
    const s = { userId: u.id, role: u.role, salonId: u.salonId, name: u.name, username: u.username };
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) { return null; }
    return s;
  }
  function logout() { try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* */ } location.href = 'login.html'; }
  const homeFor = role => (role === 'owner' ? 'owner-dashboard.html' : 'barber-dashboard.html');
  function requireRole(role) {
    const s = getSession(); const db = getDB();
    const valid = s && s.role === role && db.users.some(u => u.id === s.userId && u.salonId === s.salonId);
    if (!valid) { try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* */ } location.href = 'login.html'; return null; }
    return s;
  }
  const getBarberByUser = (db, userId) => db.barbers.find(b => b.userId === userId);

  /* ---------------- عمليات محمية بالصلاحيات (RBAC) ---------------- */
  // المالك: كل حلاقي صالونه — الحلاق: كرسيه فقط
  function canManage(db, s, barberId) {
    if (!s) return false;
    if (s.role === 'owner') return db.barbers.some(b => b.id === barberId && b.salonId === s.salonId);
    if (s.role === 'barber') { const br = getBarberByUser(db, s.userId); return !!br && br.id === barberId; }
    return false;
  }
  const ownerSession = () => { const s = getSession(); return s && s.role === 'owner' ? s : null; };

  function setBarberStatus(barberId, status) {
    const db = getDB();
    if (!BARBER_STATUSES.includes(status) || !canManage(db, getSession(), barberId)) return fail('forbidden');
    if (status !== 'busy' && activeBooking(db, barberId)) return fail('errActive');
    db.barbers.find(b => b.id === barberId).status = status;
    saveDB(db); return { ok: true };
  }

  function loadManaged(id) {
    const db = getDB();
    const b = db.bookings.find(x => x.id === id);
    if (!b || !canManage(db, getSession(), b.barberId)) return { err: fail('forbidden') };
    return { db, b, barber: db.barbers.find(x => x.id === b.barberId) };
  }
  function startBooking(id) {
    const r = loadManaged(id); if (r.err) return r.err;
    const { db, b, barber } = r;
    if (b.status !== 'confirmed' && b.status !== 'waiting') return fail('errState');
    if (b.date !== todayStr()) return fail('errNotToday');
    if (activeBooking(db, b.barberId)) return fail('errBusyBarber');
    b.status = 'in_progress'; b.startedAt = Date.now(); barber.status = 'busy';
    saveDB(db); return { ok: true };
  }
  function finishBooking(id) {
    const r = loadManaged(id); if (r.err) return r.err;
    const { db, b, barber } = r;
    if (b.status !== 'in_progress') return fail('errState');
    b.status = 'done'; b.finishedAt = Date.now(); barber.status = 'available';
    saveDB(db); return { ok: true };
  }
  function cancelBooking(id) {
    const r = loadManaged(id); if (r.err) return r.err;
    const { db, b, barber } = r;
    if (b.status === 'done' || b.status === 'cancelled') return fail('errState');
    if (b.status === 'in_progress') barber.status = 'available';
    b.status = 'cancelled';
    saveDB(db); return { ok: true };
  }

  function addBarber(name, username, password) {
    const s = ownerSession(); if (!s) return fail('forbidden');
    const db = getDB();
    if (!/^[a-z0-9_.-]{3,20}$/i.test(username)) return fail('invalidUser');
    if (String(password).length < 3) return fail('shortPass');
    if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) return fail('userExists');
    const userId = uid('u');
    db.users.push({ id: userId, username, password, role: 'barber', salonId: s.salonId, name: name.trim() });
    db.barbers.push({ id: uid('b'), salonId: s.salonId, userId, name: name.trim(), status: 'available' });
    saveDB(db); return { ok: true };
  }
  function removeBarber(barberId) {
    const s = ownerSession(); if (!s) return false;
    const db = getDB();
    const b = db.barbers.find(x => x.id === barberId && x.salonId === s.salonId);
    if (!b) return false;
    db.barbers = db.barbers.filter(x => x.id !== b.id);
    db.users = db.users.filter(u => u.id !== b.userId);
    db.bookings.forEach(k => { if (k.barberId === b.id && ['confirmed', 'waiting', 'in_progress'].includes(k.status)) k.status = 'cancelled'; });
    saveDB(db); return true;
  }
  function addService(nameAr, nameFr, price, duration) {
    const s = ownerSession(); if (!s) return false;
    price = Number(price); duration = Math.max(5, Math.round(Number(duration)));
    if (!nameAr.trim() || !nameFr.trim() || !(price >= 0) || !(duration >= 5)) return false;
    const db = getDB();
    db.services.push({ id: uid('sv'), salonId: s.salonId, name: { ar: nameAr.trim(), fr: nameFr.trim() }, price, duration, icon: 'fa-scissors' });
    saveDB(db); return true;
  }
  function removeService(id) {
    const s = ownerSession(); if (!s) return false;
    const db = getDB();
    if (!db.services.some(x => x.id === id && x.salonId === s.salonId)) return false;
    db.services = db.services.filter(x => x.id !== id);
    saveDB(db); return true;
  }

  // معالج موحّد لأزرار data-act في اللوحتين. يعيد true إذا عالج الإجراء (ثم يجب إعادة الرسم)
  function dispatch(target) {
    const btn = target.closest('[data-act]');
    if (!btn || btn.disabled) return false;
    const act = btn.dataset.act; let r = null;
    if (act === 'start') r = startBooking(btn.dataset.id);
    else if (act === 'finish') r = finishBooking(btn.dataset.id);
    else if (act === 'cancel') { if (!confirm(t('confirmCancel'))) return false; r = cancelBooking(btn.dataset.id); }
    else if (act === 'bstatus') r = setBarberStatus(btn.dataset.barber, btn.dataset.status);
    else return false;
    if (r && !r.ok) toast(t(r.error), 'err');
    return true;
  }

  /* ---------------- مكونات واجهة مشتركة ---------------- */
  const ui = {
    fmtWait: min => (min <= 0 ? t('noWait') : min + ' ' + t('min')),
    badge: s => `<span class="badge st-${esc(s)}${s === 'in_progress' ? ' pulse' : ''}">${esc(t('st_' + s))}</span>`,
    bbadge: s => `<span class="badge bs-${esc(s)}${s === 'busy' ? ' pulse' : ''}">${esc(t('bs_' + s))}</span>`,
    brandName(name) {
      const w = String(name).trim().split(/\s+/);
      const last = w.pop();
      return (w.length ? esc(w.join(' ')) + ' ' : '') + `<span>${esc(last)}</span>`;
    },
    statTile: (icon, color, label, value) =>
      `<div class="glass-card stat fade"><div class="stat-ico c-${color}"><i class="fa-solid ${icon}"></i></div><div><span class="muted xs">${esc(label)}</span><b class="stat-val">${esc(value)}</b></div></div>`,
    stats(bookings) {
      const today = todayStr();
      const done = bookings.filter(b => b.status === 'done');
      return {
        today: bookings.filter(b => b.date === today && b.status !== 'cancelled').length,
        waiting: bookings.filter(b => b.type === 'walkin' && b.status === 'waiting' && b.date === today).length,
        inProgress: bookings.filter(b => b.status === 'in_progress').length,
        doneToday: done.filter(b => b.date === today).length,
        revToday: done.filter(b => b.date === today).reduce((a, b) => a + b.price, 0),
        revTotal: done.reduce((a, b) => a + b.price, 0)
      };
    },
    chairCard(db, barber) {
      const act = activeBooking(db, barber.id);
      const q = queueInfo(db, barber.id);
      const wait = barberWait(db, barber);
      const u = db.users.find(x => x.id === barber.userId);
      const btns = BARBER_STATUSES.map(s =>
        `<button type="button" class="sbtn ${barber.status === s ? 'on-' + s : ''}" data-act="bstatus" data-barber="${esc(barber.id)}" data-status="${s}">${esc(t('bs_' + s))}</button>`).join('');
      let main = '';
      if (act) main = `<button type="button" class="btn ok block" data-act="finish" data-id="${esc(act.id)}"><i class="fa-solid fa-check"></i> ${esc(t('finishNow'))}</button>`;
      else if (q.length) main = `<button type="button" class="btn block" data-act="start" data-id="${esc(q[0].booking.id)}"><i class="fa-solid fa-bell"></i> ${esc(t('callNext'))}</button>`;
      return `<div class="glass-card chair cs-${esc(barber.status)} fade">
        <div class="row between"><div><h4>${esc(barber.name)}</h4><span class="muted xs">${u ? '@' + esc(u.username) : ''}</span></div>${ui.bbadge(barber.status)}</div>
        <div class="inset"><span class="muted xs">${esc(t('currentCustomer'))}</span>
          <b class="${act ? 'gold' : 'dim'}">${act ? esc(act.customerName) : esc(t('noCurrent'))}</b>
          ${act ? `<span class="muted xs">${esc(serviceLabel(act))}</span>` : ''}</div>
        <div class="mini-stats"><div><b>${q.length}</b><span>${esc(t('inQueue'))}</span></div><div><b>${esc(ui.fmtWait(wait))}</b><span>${esc(t('waitShort'))}</span></div></div>
        <div><label class="muted xs">${esc(t('updateStatus'))}</label><div class="sgrid">${btns}</div></div>
        ${main}
        <button type="button" class="btn ghost block sm" data-act="walkin" data-barber="${esc(barber.id)}"><i class="fa-solid fa-plus"></i> ${esc(t('addWalkin'))}</button>
      </div>`;
    },
    queueList(db, barbers) {
      const items = [];
      barbers.forEach(b => queueInfo(db, b.id).forEach(x => items.push({ ...x, barber: b })));
      items.sort((a, b) => a.booking.createdAt - b.booking.createdAt);
      if (!items.length) return `<p class="muted center pad">${esc(t('queueEmpty2'))}</p>`;
      return items.map((it, i) => {
        const b = it.booking; const busy = !!activeBooking(db, it.barber.id);
        const wa = b.customerPhone ? `<a class="btn wa sm" target="_blank" rel="noopener" href="${esc(waLink(b.customerPhone, buildCustomerMessage(b, db)))}"><i class="fa-brands fa-whatsapp"></i></a>` : '';
        return `<div class="qitem"><div class="row"><span class="qnum">${i + 1}</span>
          <div><b>${esc(b.customerName)}</b><div class="muted xs">${esc(it.barber.name)} • ${esc(serviceLabel(b))} • ${esc(t('arrived'))} ${esc(b.time)}</div></div></div>
          <div class="row wrap"><span class="chip">~ ${esc(ui.fmtWait(it.waitMin))}</span>
          <button type="button" class="btn sm" data-act="start" data-id="${esc(b.id)}" ${busy ? 'disabled title="' + esc(t('errBusyBarber')) + '"' : ''}>${esc(t('callToChair'))}</button>
          ${wa}<button type="button" class="icon-btn" data-act="cancel" data-id="${esc(b.id)}" aria-label="${esc(t('cancelAct'))}"><i class="fa-solid fa-trash"></i></button></div></div>`;
      }).join('');
    },
    bookingTable(db, list, o = {}) {
      const today = todayStr();
      if (!list.length) return `<p class="muted center pad">${esc(t(o.empty || 'noData'))}</p>`;
      const heads = [t('colCustomer'), o.phone && t('colPhone'), o.barber && t('colBarber'), t('colServices'), t('colKind'),
        o.date && t('colDate'), t('colTime'), t('colPrice'), t('colStatus'), t('colActions')].filter(Boolean);
      const rows = list.map(b => {
        const barber = db.barbers.find(x => x.id === b.barberId);
        const acts = [];
        if (b.status === 'confirmed' || b.status === 'waiting') {
          if (b.date === today) acts.push(`<button type="button" class="btn sm" data-act="start" data-id="${esc(b.id)}">${esc(t('startService'))}</button>`);
          acts.push(`<button type="button" class="btn danger sm" data-act="cancel" data-id="${esc(b.id)}">${esc(t('cancelAct'))}</button>`);
        } else if (b.status === 'in_progress') {
          acts.push(`<button type="button" class="btn ok sm" data-act="finish" data-id="${esc(b.id)}">${esc(t('finish'))}</button>`);
          acts.push(`<button type="button" class="btn danger sm" data-act="cancel" data-id="${esc(b.id)}">${esc(t('cancelAct'))}</button>`);
        }
        if (b.customerPhone && (b.status === 'confirmed' || b.status === 'waiting')) {
          acts.push(`<a class="btn wa sm" target="_blank" rel="noopener" href="${esc(waLink(b.customerPhone, buildCustomerMessage(b, db)))}" title="${esc(t('actWa'))}"><i class="fa-brands fa-whatsapp"></i></a>`);
        }
        return `<tr class="${b.status === 'cancelled' ? 'faded' : ''}">
          <td><b>${esc(b.customerName)}</b></td>
          ${o.phone ? `<td dir="ltr">${esc(b.customerPhone || '—')}</td>` : ''}
          ${o.barber ? `<td>${esc(barber ? barber.name : '—')}</td>` : ''}
          <td>${esc(serviceLabel(b))}</td><td><span class="chip">${esc(t('kind_' + b.type))}</span></td>
          ${o.date ? `<td>${esc(b.date)}</td>` : ''}
          <td class="gold"><b>${esc(b.time)}</b></td><td>${esc(money(b.price))}</td><td>${ui.badge(b.status)}</td>
          <td><div class="actions">${acts.join('') || '<span class="muted">—</span>'}</div></td></tr>`;
      }).join('');
      return `<div class="table-wrap"><table><thead><tr>${heads.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
    }
  };

  // نافذة إضافة زبون مباشر (للحلاق: كرسيه — للمالك: أي حلاق)
  function openWalkinModal({ barberId = null, onDone } = {}) {
    const db = getDB(); const s = getSession(); if (!s) return;
    const L = getLang();
    const barbers = db.barbers.filter(b => canManage(db, s, b.id));
    if (!barbers.length) return;
    const ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.innerHTML = `<div class="glass-gold modal fade" role="dialog" aria-modal="true">
      <div class="row between"><h3>${esc(t('walkinModalTitle'))}</h3><button type="button" class="icon-btn" data-x aria-label="${esc(t('close'))}"><i class="fa-solid fa-xmark"></i></button></div>
      <form novalidate>
        <div class="field"><label>${esc(t('fullName'))}</label><input name="name" maxlength="60" required></div>
        <div class="field"><label>${esc(t('phoneOptional'))}</label><input name="phone" type="tel" maxlength="20" placeholder="${esc(t('phonePh'))}"></div>
        <div class="field"><label>${esc(t('barber'))}</label><select name="barber">${barbers.map(b => `<option value="${esc(b.id)}" ${b.id === barberId ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></div>
        <div class="field"><label>${esc(t('services'))}</label><div class="checks">${db.services.filter(x => x.salonId === s.salonId).map(x =>
          `<label class="check"><input type="checkbox" name="svc" value="${esc(x.id)}"><span>${esc(x.name[L])} <small class="muted">(${esc(money(x.price))})</small></span></label>`).join('')}</div></div>
        <div class="err" data-err></div>
        <div class="row"><button class="btn grow" type="submit">${esc(t('addWalkin'))}</button><button class="btn ghost" type="button" data-x>${esc(t('cancel'))}</button></div>
      </form></div>`;
    const close = () => { document.removeEventListener('keydown', onKey); ov.remove(); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-x]')) close(); });
    ov.querySelector('form').addEventListener('submit', e => {
      e.preventDefault();
      const f = e.target;
      const r = addWalkin({
        barberId: f.barber.value, serviceIds: [...f.querySelectorAll('input[name=svc]:checked')].map(i => i.value),
        customerName: f.name.value, customerPhone: f.phone.value, source: 'staff'
      });
      if (!r.ok) { f.querySelector('[data-err]').textContent = t(r.error); return; }
      close(); toast(t('walkinAdded')); if (onDone) onDone();
    });
    document.body.appendChild(ov);
    ov.querySelector('input[name=name]').focus();
  }

  return {
    SALON_ID, STATUSES, BARBER_STATUSES, getDB, saveDB, esc, todayStr, maxDate, nowHHMM, getLang, t, applyI18n, toggleLang, initPage, toast, money, live, firstName,
    waLink, isValidMoroccanPhone, buildBookingMessage, buildCustomerMessage, serviceLabel, serviceTotals,
    activeBooking, waitingList, queueInfo, barberWait, bestBarberId, allTimes, slotsFor, isOpenNow,
    createBooking, addWalkin, getMyBookingIds, rememberBooking,
    getSession, login, logout, homeFor, requireRole, getBarberByUser,
    setBarberStatus, startBooking, finishBooking, cancelBooking, addBarber, removeBarber, addService, removeService,
    dispatch, ui, openWalkinModal
  };
})();
