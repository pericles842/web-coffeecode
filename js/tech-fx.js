// Efectos "tech" de Coffee Code:
//  - decodificación de texto (hero, títulos de sección, menú)
//  - etiquetas de código sobre cada título (// 01 — about)
//  - glitch en títulos
//  - lluvia de código tenue en las franjas oscuras
// Todo se desactiva si el usuario pide reducir movimiento.
(function ($) {
  'use strict';

  var GLYPHS = '01<>/{}[]=+*#$%&_-;:';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

  function randomGlyph() {
    return GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));
  }

  /* -------------------------------------------------------------
   * Decodificación: cada letra pasa por símbolos y se resuelve
   * de izquierda a derecha. El ancho de cada letra se fija para
   * que el texto no salte; al terminar se restaura el texto plano.
   * ----------------------------------------------------------- */
  function scramble(el, opts) {
    opts = opts || {};
    var text = el.getAttribute('data-text');
    if (!text) {
      text = el.textContent.trim();
      el.setAttribute('data-text', text);
    }
    if (el._fxRaf) cancelAnimationFrame(el._fxRaf);
    el.classList.remove('fx-pending');
    if (reduceMotion) {
      el.textContent = text;
      if (opts.onDone) opts.onDone();
      return;
    }

    el.textContent = '';
    text.split(' ').forEach(function (word, i) {
      if (i > 0) el.appendChild(document.createTextNode(' '));
      var w = document.createElement('span');
      w.className = 'fx-w';
      Array.prototype.forEach.call(word, function (ch) {
        var c = document.createElement('span');
        c.className = 'fx-c';
        c.textContent = ch;
        c.setAttribute('data-c', ch);
        w.appendChild(c);
      });
      el.appendChild(w);
    });

    var chars = el.querySelectorAll('.fx-c');
    each(chars, function (c) {
      c.style.width = c.getBoundingClientRect().width + 'px';
      c.textContent = randomGlyph();
      c.classList.add('is-glitch', 'cc-mono');
    });

    var n = chars.length;
    var duration = opts.duration || Math.min(1700, 700 + n * 22);
    var resolveAt = Array.prototype.map.call(chars, function (c, i) {
      return (i / n) * duration * 0.8 + Math.random() * duration * 0.2;
    });
    var start = performance.now();

    function frame(now) {
      var t = now - start;
      var done = 0;
      each(chars, function (c, i) {
        if (t >= resolveAt[i]) {
          if (c.classList.contains('is-glitch')) {
            c.textContent = c.getAttribute('data-c');
            c.classList.remove('is-glitch', 'cc-mono');
          }
          done++;
        } else if (Math.random() < 0.3) {
          c.textContent = randomGlyph();
        }
      });
      if (done < n) {
        el._fxRaf = requestAnimationFrame(frame);
      } else {
        el._fxRaf = null;
        el.textContent = text;
        if (opts.onDone) opts.onDone();
      }
    }
    el._fxRaf = requestAnimationFrame(frame);
  }

  function glitchBurst(el) {
    if (reduceMotion) return;
    el.classList.remove('cc-glitch-burst');
    void el.offsetWidth; // reinicia la animación
    el.classList.add('cc-glitch-burst');
  }

  /* -------------------------------------------------------------
   * Hero: título decodificado en cada diapositiva
   * ----------------------------------------------------------- */
  var $carousel = $('#introCarousel');
  if ($carousel.length) {
    var titleOf = function (item) { return item && item.querySelector('.carousel-content h2'); };

    $carousel.on('slide.bs.carousel', function (e) {
      var h2 = titleOf(e.relatedTarget);
      if (!h2) return;
      h2.classList.add('fx-pending');
      requestAnimationFrame(function () {
        if (h2.offsetWidth > 0) scramble(h2);
      });
    });

    $carousel.on('slid.bs.carousel', function (e) {
      var h2 = titleOf(e.relatedTarget);
      if (h2 && h2.classList.contains('fx-pending')) scramble(h2);
    });

    var firstTitle = titleOf($carousel.find('.carousel-item.active')[0]);
    if (firstTitle) {
      firstTitle.classList.add('fx-pending');
      var runFirst = function () { scramble(firstTitle); };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(runFirst);
      else $(window).on('load', runFirst);
    }
  }

  /* -------------------------------------------------------------
   * Títulos de sección: etiqueta de código + decodificación al
   * entrar en pantalla + glitch
   * ----------------------------------------------------------- */
  var headers = document.querySelectorAll('main section[id] .section-header');
  each(headers, function (header, i) {
    var h3 = header.querySelector('h3');
    if (!h3) return;
    var id = header.closest('section').id;
    var label = '// ' + String(i + 1).padStart(2, '0') + ' — ' + id;

    var eyebrow = document.createElement('div');
    eyebrow.className = 'cc-eyebrow cc-mono';
    eyebrow.setAttribute('aria-hidden', 'true');
    eyebrow.style.setProperty('--n', label.length);
    eyebrow.innerHTML = '<span class="cc-eyebrow-text"></span>';
    eyebrow.firstChild.textContent = label;
    header.insertBefore(eyebrow, h3);

    h3.setAttribute('data-text', h3.textContent.trim());
    h3.classList.add('cc-glitch');
    if (!reduceMotion) h3.classList.add('fx-pending');
  });

  var revealHeader = function (header) {
    var h3 = header.querySelector('h3');
    var eyebrow = header.querySelector('.cc-eyebrow');
    if (eyebrow) eyebrow.classList.add('is-in');
    if (h3 && h3.classList.contains('fx-pending')) {
      scramble(h3, { onDone: function () { glitchBurst(h3); } });
    }
  };

  if ('IntersectionObserver' in window && !reduceMotion) {
    var headerObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        headerObserver.unobserve(entry.target);
        var go = function () { revealHeader(entry.target); };
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
      });
    }, { threshold: 0.35 });
    each(headers, function (h) { headerObserver.observe(h); });
  } else {
    each(headers, revealHeader);
  }

  // Glitch al pasar el mouse por un título
  $(document).on('mouseenter', '.section-header h3.cc-glitch', function () {
    if (!this._fxRaf) glitchBurst(this);
  });

  /* -------------------------------------------------------------
   * Menú: los enlaces se decodifican al pasar el mouse
   * ----------------------------------------------------------- */
  $(document).on('mouseenter', '.nav-menu > li > a, #mobile-nav ul li a', function () {
    if (this._fxRaf || reduceMotion) return;
    scramble(this, { duration: 380 });
  });

  /* -------------------------------------------------------------
   * Lluvia de código tenue en las franjas oscuras
   * ----------------------------------------------------------- */
  function codeRain(section) {
    var canvas = document.createElement('canvas');
    canvas.className = 'cc-rain';
    canvas.setAttribute('aria-hidden', 'true');
    section.insertBefore(canvas, section.firstChild);
    var ctx = canvas.getContext('2d');
    var size = 16;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var drops = [];
    var running = false;
    var last = 0;
    var rafId = null;

    function resize() {
      var w = section.clientWidth;
      var h = section.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = '500 ' + (size - 2) + 'px ui-monospace, "JetBrains Mono", Consolas, monospace';
      var cols = Math.ceil(w / size);
      drops = [];
      for (var i = 0; i < cols; i++) drops.push(Math.random() * -h / size);
    }

    function draw(now) {
      if (!running) return;
      rafId = requestAnimationFrame(draw);
      if (now - last < 60) return; // ~16 fps es suficiente y ahorra batería
      last = now;
      var h = canvas.height / dpr;
      ctx.fillStyle = 'rgba(11, 18, 32, 0.16)';
      ctx.fillRect(0, 0, canvas.width / dpr, h);
      for (var i = 0; i < drops.length; i++) {
        var y = drops[i] * size;
        if (y > 0) {
          ctx.fillStyle = Math.random() < 0.08 ? 'rgba(160, 185, 255, 0.95)' : 'rgba(107, 141, 255, 0.55)';
          ctx.fillText(randomGlyph(), i * size, y);
        }
        drops[i] += Math.random() < 0.9 ? 1 : 0;
        if (y > h && Math.random() > 0.96) drops[i] = Math.random() * -20;
      }
    }

    function start() {
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(draw);
    }

    function stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
    }

    resize();
    var t;
    $(window).on('resize', function () {
      clearTimeout(t);
      t = setTimeout(resize, 200);
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries[0].isIntersecting ? start() : stop();
      }).observe(section);
    } else {
      start();
    }
  }

  if (!reduceMotion && window.HTMLCanvasElement) {
    each(document.querySelectorAll('#featured-services, #facts'), codeRain);
  }
})(jQuery);
