/* auth.js — تسجيل الدخول الموحد + التوجيه التلقائي حسب الدور (مول المحل / حلاق) */
(() => {
  'use strict';
  APP.initPage();

  // مستخدم مسجل مسبقاً ← توجيه مباشر إلى لوحته
  const existing = APP.getSession();
  if (existing && APP.getDB().users.some(u => u.id === existing.userId)) {
    location.replace(APP.homeFor(existing.role));
    return;
  }

  document.getElementById('loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const s = APP.login(document.getElementById('username').value, document.getElementById('password').value);
    if (!s) { document.getElementById('loginErr').textContent = APP.t('badCreds'); return; }
    location.href = APP.homeFor(s.role);
  });
})();
