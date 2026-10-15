// Efecto "decodificación" en los títulos del hero: cada letra pasa por
// símbolos aleatorios y se resuelve de izquierda a derecha.
(function ($) {
  'use strict';

  var GLYPHS = '01<>/{}[]=+*#$%&_-;:';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $carousel = $('#introCarousel');
  if (!$carousel.length) return;

  function randomGlyph() {
    return GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));
  }

  function buildSpans(h2, text) {
    h2.textContent = '';
    text.split(' ').forEach(function (word, i) {
      if (i > 0) h2.appendChild(document.createTextNode(' '));
      var w = document.createElement('span');
      w.className = 'fx-w';
      Array.prototype.forEach.call(word, function (ch) {
        var c = document.createElement('span');
        c.className = 'fx-c';
        c.textContent = ch;
        c.setAttribute('data-c', ch);
        w.appendChild(c);
      });
      h2.appendChild(w);
    });
    return h2.querySelectorAll('.fx-c');
  }

  function decode(h2) {
    var text = h2.getAttribute('data-text');
    if (!text) {
      text = h2.textContent.trim();
      h2.setAttribute('data-text', text);
      h2.setAttribute('aria-label', text);
    }
    if (h2._fxRaf) cancelAnimationFrame(h2._fxRaf);
    h2.classList.remove('fx-pending');
    if (reduceMotion) { h2.textContent = text; return; }

    var chars = buildSpans(h2, text);
    // Fijar el ancho de cada letra para que los símbolos no muevan el texto
    Array.prototype.forEach.call(chars, function (c) {
      c.style.width = c.getBoundingClientRect().width + 'px';
      c.textContent = randomGlyph();
      c.classList.add('is-glitch');
    });

    var n = chars.length;
    var duration = Math.min(1700, 700 + n * 22);
    var resolveAt = Array.prototype.map.call(chars, function (c, i) {
      return (i / n) * duration * 0.8 + Math.random() * duration * 0.2;
    });
    var start = performance.now();

    function frame(now) {
      var t = now - start;
      var done = 0;
      Array.prototype.forEach.call(chars, function (c, i) {
        if (t >= resolveAt[i]) {
          if (c.classList.contains('is-glitch')) {
            c.textContent = c.getAttribute('data-c');
            c.classList.remove('is-glitch');
          }
          done++;
        } else if (Math.random() < 0.3) {
          c.textContent = randomGlyph();
        }
      });
      if (done < n) {
        h2._fxRaf = requestAnimationFrame(frame);
      } else {
        h2._fxRaf = null;
        h2.textContent = text;
      }
    }
    h2._fxRaf = requestAnimationFrame(frame);
  }

  function titleOf(item) {
    return item && item.querySelector('.carousel-content h2');
  }

  // Al cambiar de diapositiva: ocultar el título entrante y decodificarlo cuando sea visible
  $carousel.on('slide.bs.carousel', function (e) {
    var h2 = titleOf(e.relatedTarget);
    if (!h2) return;
    h2.classList.add('fx-pending');
    requestAnimationFrame(function () {
      if (h2.offsetWidth > 0) decode(h2);
    });
  });

  $carousel.on('slid.bs.carousel', function (e) {
    var h2 = titleOf(e.relatedTarget);
    if (h2 && h2.classList.contains('fx-pending')) decode(h2);
  });

  // Primera diapositiva: esperar a que cargue la fuente para medir bien
  var first = titleOf($carousel.find('.carousel-item.active')[0]);
  if (first) {
    first.classList.add('fx-pending');
    var run = function () { decode(first); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
    else $(window).on('load', run);
  }
})(jQuery);
