// Modo claro / oscuro: botón del header y preferencia guardada en el navegador.
// El tema guardado se aplica antes de pintar con un script en el <head>.
(function () {
  'use strict';

  var root = document.documentElement;
  var btn = document.getElementById('theme-toggle');
  if (!btn) return;

  function isDark() {
    return root.getAttribute('data-theme') === 'dark';
  }

  function syncButton() {
    var label = isDark() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
    btn.setAttribute('aria-pressed', isDark() ? 'true' : 'false');
  }

  btn.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    root.classList.add('theme-switching');
    if (next === 'dark') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    try { localStorage.setItem('cc-theme', next); } catch (e) {}
    syncButton();
    setTimeout(function () { root.classList.remove('theme-switching'); }, 400);
  });

  syncButton();
})();
