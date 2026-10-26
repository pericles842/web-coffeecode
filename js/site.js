// Coffee Code — interacciones del sitio (sin dependencias).
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  var WHATSAPP = '584124971066';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* WhatsApp y videoconferencia
  --------------------------------*/

  function openWhatsApp(text) {
    window.open('https://api.whatsapp.com/send?phone=' + WHATSAPP + '&text=' + encodeURIComponent(text), '_blank', 'noopener');
  }

  $$('.js-meet').forEach(function (btn) {
    btn.addEventListener('click', function () {
      openWhatsApp('Hola, me gustaría realizar una videoconferencia para hablar acerca de mi proyecto. ¿Cuándo podemos agendar?');
    });
  });

  $$('.js-wa').forEach(function (btn) {
    btn.addEventListener('click', function () {
      openWhatsApp('Hola estoy interesado en ' + btn.getAttribute('data-msg'));
    });
  });

  /* Tema claro / oscuro
  --------------------------------*/

  var themeBtn = $('#theme-toggle');

  function syncThemeButton() {
    var dark = root.getAttribute('data-theme') === 'dark';
    var label = dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
    themeBtn.setAttribute('aria-label', label);
    themeBtn.setAttribute('title', label);
  }

  themeBtn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.classList.add('theme-switching');
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('cc-theme', next); } catch (e) {}
    syncThemeButton();
    setTimeout(function () { root.classList.remove('theme-switching'); }, 400);
  });

  syncThemeButton();

  /* Menú móvil
  --------------------------------*/

  var menuBtn = $('#menu-toggle');
  var menu = $('#mobile-menu');

  function setMenu(open) {
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    document.body.style.overflow = open ? 'hidden' : '';
  }

  menuBtn.addEventListener('click', function () { setMenu(menu.hidden); });
  $$('a, button', menu).forEach(function (el) {
    el.addEventListener('click', function () { setMenu(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !menu.hidden) setMenu(false);
  });

  /* Reloj de Caracas y año
  --------------------------------*/

  var clock = $('.js-clock');
  var clockFmt = new Intl.DateTimeFormat('es-VE', {
    timeZone: 'America/Caracas', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  function tick() { clock.textContent = clockFmt.format(new Date()); }
  tick();
  setInterval(tick, 1000);

  $('.js-year').textContent = new Date().getFullYear();

  /* Scroll: hero y servicios
  --------------------------------*/

  var hero = $('.hero');
  var srvTrack = $('.services-track');
  var srvTabs = $$('.srv-tab');
  var srvPanels = $$('.srv-panel');
  var desktopServices = window.matchMedia('(min-width: 992px)');
  var activeService = 0;

  function progress(el) {
    var r = el.getBoundingClientRect();
    var total = r.height - window.innerHeight;
    if (total <= 0) return 0;
    return Math.min(1, Math.max(0, -r.top / total));
  }

  function setService(i) {
    activeService = i;
    srvTabs.forEach(function (tab, j) {
      var d = j - i;
      tab.classList.toggle('is-active', d === 0);
      tab.setAttribute('aria-selected', String(d === 0));
      tab.tabIndex = d === 0 ? 0 : -1;
      tab.style.setProperty('--d', Math.max(-3, Math.min(3, d)));
      tab.style.setProperty('--ad', Math.min(3, Math.abs(d)));
    });
    srvPanels.forEach(function (p, j) { p.classList.toggle('is-active', j === i); });
  }

  srvTabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () {
      if (desktopServices.matches && !reduceMotion) {
        // En escritorio la lista sigue al scroll: llevamos el scroll al servicio elegido
        var top = srvTrack.getBoundingClientRect().top + window.scrollY;
        var total = srvTrack.offsetHeight - window.innerHeight;
        window.scrollTo({ top: top + total * ((i + 0.5) / srvTabs.length), behavior: 'smooth' });
      }
      setService(i);
    });
    tab.addEventListener('keydown', function (e) {
      var dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      var next = (i + dir + srvTabs.length) % srvTabs.length;
      setService(next);
      srvTabs[next].focus();
    });
  });

  setService(0);

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      if (!reduceMotion) {
        var heroP = progress(hero);
        hero.style.setProperty('--p', heroP.toFixed(4));
        hero.classList.toggle('is-covered', heroP > 0.85);
        if (desktopServices.matches) {
          var i = Math.min(srvTabs.length - 1, Math.floor(progress(srvTrack) * srvTabs.length));
          if (i !== activeService) setService(i);
        }
      }
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* Navegación activa
  --------------------------------*/

  var navLinks = $$('.site-nav a');
  if ('IntersectionObserver' in window) {
    var navIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle('is-current', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    // Se observan todas las secciones: las que no están en el menú lo dejan sin marcar
    $$('main > section, .site-footer').forEach(function (s) { navIO.observe(s); });
  }

  /* Aparición al hacer scroll y contadores
  --------------------------------*/

  // Odómetro: cada dígito es una tira 0-9 repetida dos veces que gira una vuelta
  // completa antes de detenerse en su valor, así el número sube de menos a más.
  var DIGITS = '<span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span>';

  $$('.js-count').forEach(function (el, statIndex) {
    var text = el.getAttribute('data-to') + (el.getAttribute('data-suffix') || '');
    el.setAttribute('aria-label', text);
    if (reduceMotion) return;
    var cols = text.split('');
    el.innerHTML = '<span class="odo" aria-hidden="true">' + cols.map(function (ch, i) {
      if (!/\d/.test(ch)) return '<span class="odo-char">' + esc(ch) + '</span>';
      var style = '--odo-dur:' + (1.8 + i * 0.35) + 's;--odo-delay:' + (statIndex * 0.12) + 's';
      return '<span class="odo-col"><span class="odo-strip" data-digit="' + ch + '" style="' + style + '">' +
        DIGITS + DIGITS + '</span></span>';
    }).join('') + '</span>';
  });

  function countUp(el) {
    $$('.odo-strip', el).forEach(function (strip) {
      strip.style.transform = 'translateY(' + -(10 + Number(strip.getAttribute('data-digit'))) + 'em)';
    });
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        var counter = $('.js-count', entry.target);
        if (counter) countUp(counter);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15 });
    $$('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    $$('.reveal').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* Acordeón de trabajo
  --------------------------------*/

  var accItems = $$('.acc-item');
  function activateAcc(item) {
    accItems.forEach(function (el) { el.classList.toggle('is-active', el === item); });
  }
  accItems.forEach(function (item) {
    item.addEventListener('mouseenter', function () { if (finePointer) activateAcc(item); });
    item.addEventListener('focus', function () { activateAcc(item); });
    item.addEventListener('click', function (e) {
      // En pantallas táctiles el primer toque abre la tarjeta, el segundo visita el sitio
      if (!item.classList.contains('is-active')) {
        e.preventDefault();
        activateAcc(item);
      }
    });
  });

  /* Archivo: filtros
  --------------------------------*/

  var grid = $('.archive-grid');
  var empty = $('.archive-empty');
  var currentFilter = '*';

  function applyFilter() {
    var visible = 0;
    $$('.tile', grid).forEach(function (tile) {
      var show = currentFilter === '*' || tile.getAttribute('data-cat') === currentFilter;
      tile.hidden = !show;
      if (show) visible++;
    });
    empty.hidden = visible > 0;
  }

  $$('.filter').forEach(function (btn) {
    btn.addEventListener('click', function () {
      $$('.filter').forEach(function (b) {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      currentFilter = btn.getAttribute('data-filter');
      applyFilter();
    });
  });

  function updateWorkCount() {
    $('.js-work-count').textContent = $$('.tile', grid).length;
  }
  updateWorkCount();

  /* Visor de imágenes
  --------------------------------*/

  var lb = $('.lightbox');
  var lbImg = $('img', lb);
  var lbCap = $('figcaption', lb);
  var gallery = [];
  var galleryIndex = 0;

  function showLightbox(i) {
    galleryIndex = (i + gallery.length) % gallery.length;
    var item = gallery[galleryIndex];
    lbImg.removeAttribute('data-retried');
    lbImg.src = item.src;
    lbImg.alt = item.title;
    lbCap.textContent = item.title + (gallery.length > 1 ? '  (' + (galleryIndex + 1) + '/' + gallery.length + ')' : '');
  }

  function openLightbox(items, i) {
    gallery = items;
    lb.classList.toggle('is-single', items.length < 2);
    showLightbox(i || 0);
    if (typeof lb.showModal === 'function') lb.showModal();
    else window.open(items[i || 0].src, '_blank');
  }

  grid.addEventListener('click', function (e) {
    var link = e.target.closest('[data-lightbox]');
    if (!link) return;
    e.preventDefault();
    var extra = link.getAttribute('data-gallery');
    var items = extra ? JSON.parse(extra) : [{ src: link.getAttribute('href'), title: link.getAttribute('data-lightbox') }];
    openLightbox(items, 0);
  });

  $('.lb-close', lb).addEventListener('click', function () { lb.close(); });
  $('.lb-prev', lb).addEventListener('click', function () { showLightbox(galleryIndex - 1); });
  $('.lb-next', lb).addEventListener('click', function () { showLightbox(galleryIndex + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
  lb.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') showLightbox(galleryIndex - 1);
    if (e.key === 'ArrowRight') showLightbox(galleryIndex + 1);
  });

  /* Proyectos de Google Drive (/api/proyectos)
  --------------------------------*/

  // Si una imagen del proxy falla (error puntual de Google), se reintenta una vez
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (img.tagName !== 'IMG' || img.src.indexOf('/api/imagen') === -1 || img.dataset.retried) return;
    img.dataset.retried = '1';
    setTimeout(function () { img.src = img.src + '&r=' + Date.now(); }, 800);
  }, true);

  // Reintenta: la primera llamada puede fallar mientras la función arranca en frío
  function loadProjects(attempt) {
    return fetch('/api/proyectos')
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .catch(function (err) {
        if (attempt >= 2) throw err;
        return new Promise(function (res) { setTimeout(res, 1500 * (attempt + 1)); })
          .then(function () { return loadProjects(attempt + 1); });
      });
  }

  loadProjects(0)
    .then(function (proyectos) {
      grid.insertAdjacentHTML('beforeend', proyectos.map(function (p) {
        var items = p.images.map(function (img) { return { src: img.full, title: p.name }; });
        var cover = p.images[0];
        return '<a class="tile" data-cat="proyecto" href="' + esc(cover.full) + '" data-lightbox="' + esc(p.name) +
          '" data-gallery="' + esc(JSON.stringify(items)) + '" data-cursor="Ver">' +
          '<span class="tile-img"><img src="' + esc(cover.thumb) + '" alt="' + esc(p.name) + '" loading="lazy" referrerpolicy="no-referrer"></span>' +
          '<span class="tile-info"><span class="tile-name">' + esc(p.name) + '</span><span class="mono">' + p.images.length + ' fotos</span></span></a>';
      }).join(''));
      updateWorkCount();
      applyFilter();
    })
    .catch(function () { /* sin Drive, el filtro Proyectos queda vacío */ });

  /* Rastro de imágenes que sigue al cursor
  --------------------------------*/

  var trail = $('.trail');
  var trailImgs = $$('.trail-imgs img');
  if (finePointer && !reduceMotion && trail) {
    var lastX = 0, lastY = 0, trailIndex = 0, z = 1;
    trail.addEventListener('mousemove', function (e) {
      var r = trail.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      if (Math.hypot(x - lastX, y - lastY) < 110) return;
      lastX = x; lastY = y;
      var img = trailImgs[trailIndex++ % trailImgs.length];
      var w = img.offsetWidth, h = img.offsetHeight;
      var rot = (Math.random() * 16 - 8).toFixed(1);
      img.style.zIndex = z++;
      img.getAnimations().forEach(function (a) { a.cancel(); });
      img.animate([
        { opacity: 0, transform: 'translate(' + (x - w / 2) + 'px,' + (y - h / 2) + 'px) rotate(' + rot + 'deg) scale(0.6)' },
        { opacity: 1, transform: 'translate(' + (x - w / 2) + 'px,' + (y - h / 2) + 'px) rotate(' + rot + 'deg) scale(1)', offset: 0.2 },
        { opacity: 1, transform: 'translate(' + (x - w / 2) + 'px,' + (y - h / 2 + 30) + 'px) rotate(' + rot + 'deg) scale(1)', offset: 0.75 },
        { opacity: 0, transform: 'translate(' + (x - w / 2) + 'px,' + (y - h / 2 + 60) + 'px) rotate(' + rot + 'deg) scale(0.9)' }
      ], { duration: 1600, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', fill: 'forwards' });
    });
  }

  /* Cursor personalizado
  --------------------------------*/

  var cursor = $('.cursor');
  if (finePointer && !reduceMotion) {
    root.classList.add('has-cursor');
    var label = $('.cursor-label', cursor);
    var cx = -100, cy = -100, tx = -100, ty = -100;

    document.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
      var target = e.target.closest('[data-cursor]');
      cursor.classList.toggle('is-label', !!target);
      if (target) label.textContent = target.getAttribute('data-cursor');
    });
    document.addEventListener('mouseleave', function () { cursor.classList.add('is-hidden'); });
    document.addEventListener('mouseenter', function () { cursor.classList.remove('is-hidden'); });

    (function loop() {
      cx += (tx - cx) * 0.2;
      cy += (ty - cy) * 0.2;
      cursor.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
      requestAnimationFrame(loop);
    })();
  }

  /* Correo grande: las letras se revuelven y se resuelven de izquierda a derecha
  --------------------------------*/

  var mail = $('.next-mail');
  if (mail && !reduceMotion) {
    var original = mail.textContent;
    var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*<>?=+/';
    var scrambling = false;
    mail.setAttribute('aria-label', original); // los lectores de pantalla no leen el texto revuelto

    function scramble() {
      if (scrambling) return;
      scrambling = true;
      mail.style.width = mail.getBoundingClientRect().width + 'px'; // evita que el enlace "baile"
      var start = performance.now();
      var DURATION = 900;
      (function frame(now) {
        var k = Math.min(1, (now - start) / DURATION);
        var done = Math.floor(k * original.length);
        var out = '';
        for (var i = 0; i < original.length; i++) {
          out += i < done ? original[i] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
        mail.textContent = out;
        if (k < 1) { setTimeout(function () { requestAnimationFrame(frame); }, 35); return; }
        mail.textContent = original;
        mail.style.width = '';
        scrambling = false;
      })(start);
    }

    mail.addEventListener('mouseenter', scramble);
    mail.addEventListener('focus', scramble);
  }

  /* Nombre gigante del footer ajustado al ancho
  --------------------------------*/

  var giant = $('.footer-giant');
  function fitGiant() {
    giant.style.fontSize = '100px';
    var styles = getComputedStyle(giant);
    var avail = giant.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
    var range = document.createRange();
    range.selectNodeContents(giant);
    var textWidth = range.getBoundingClientRect().width;
    giant.style.fontSize = Math.floor(100 * avail / textWidth) + 'px';
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitGiant);
  fitGiant();
  window.addEventListener('resize', fitGiant);
})();
