/* British International College — site behaviour (no framework needed) */
(function () {
  'use strict';

  // Enquiry forms. Submissions are POSTed as JSON to `formEndpoint` (contact.php),
  // which emails them to the college from the web server. If `formEndpoint` is
  // emptied, forms fall back to opening the visitor's email app addressed to `formEmail`.
  // `recaptchaSiteKey` is the public reCAPTCHA v3 key; contact.php checks the token
  // with the matching secret key (kept in mail-config.php on the server).
  var CONFIG = {
    formEmail: 'info@bicollege.co.za',
    // resolved from this script's URL so forms work on pages in subfolders too
    formEndpoint: new URL('../../contact.php', document.currentScript.src).href,
    recaptchaSiteKey: '6LdlrqkrAAAAAGDZ3wLwBGtIAlNd1lU0ofqpmdgk'
  };

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', function () {
    initHeader();
    initMenus();
    initDrawer();
    initSliders();
    initTabs();
    initToc();
    initReveal();
    initBackToTop();

    var forms = document.querySelectorAll('.bic-form');
    if (forms.length && CONFIG.formEndpoint && CONFIG.recaptchaSiteKey) {
      var s = document.createElement('script');
      s.src = 'https://www.google.com/recaptcha/api.js?render=' + encodeURIComponent(CONFIG.recaptchaSiteKey);
      s.async = true;
      document.head.appendChild(s);
    }
    forms.forEach(initForm);
  });

  // Compact header: once the visitor scrolls down, the top bar slides away and the nav
  // gets shorter (sizes live in site.css as --hdr). The header is fixed, so nothing below it moves.
  function initHeader() {
    var root = document.documentElement;
    if (!document.querySelector('.bic-header')) { return; }
    var compact = false;
    function update() {
      var want = window.scrollY > (compact ? 40 : 120);
      if (want !== compact) {
        compact = want;
        root.classList.toggle('is-compact', compact);
      }
    }
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  // Desktop dropdowns: the section name is a link; the arrow button beside it opens the menu.
  // Mouse users also get the menu on hover (site.css), touch and keyboard users use the button.
  function initMenus() {
    var items = document.querySelectorAll('.bic-has-sub');
    if (!items.length) { return; }
    function setOpen(li, on) {
      li.classList.toggle('is-open', on);
      li.querySelector('.bic-sub-toggle').setAttribute('aria-expanded', on ? 'true' : 'false');
    }
    function closeAll(except) {
      items.forEach(function (li) { if (li !== except) { setOpen(li, false); } });
    }
    items.forEach(function (li) {
      li.querySelector('.bic-sub-toggle').addEventListener('click', function (e) {
        e.stopPropagation();
        closeAll(li);
        setOpen(li, !li.classList.contains('is-open'));
      });
      li.addEventListener('focusout', function (e) {
        if (!li.contains(e.relatedTarget)) { setOpen(li, false); }
      });
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.bic-has-sub')) { closeAll(); }
    });
    document.addEventListener('keydown', function (e) {
      var open = document.querySelector('.bic-has-sub.is-open');
      if (e.key === 'Escape' && open) {
        setOpen(open, false);
        open.querySelector('.bic-sub-toggle').focus();
      }
    });
  }

  // Mobile drawer with an accordion per section.
  function initDrawer() {
    var drawer = document.getElementById('mobile-nav');
    var openBtn = document.querySelector('.bic-menu-btn');
    if (!drawer || !openBtn) { return; }
    var panel = drawer.querySelector('.bic-drawer-panel');
    var lastFocus = null;

    function open() {
      lastFocus = document.activeElement;
      drawer.classList.add('is-open');
      openBtn.setAttribute('aria-expanded', 'true');
      document.documentElement.classList.add('bic-noscroll');
      setTimeout(function () { drawer.querySelector('.bic-drawer-close').focus(); }, 60);
    }
    function close() {
      if (!drawer.classList.contains('is-open')) { return; }
      drawer.classList.remove('is-open');
      openBtn.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('bic-noscroll');
      if (lastFocus) { lastFocus.focus({ preventScroll: true }); }
    }

    openBtn.addEventListener('click', open);
    drawer.querySelectorAll('[data-drawer-close]').forEach(function (el) { el.addEventListener('click', close); });
    drawer.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') { return; }
      // keep keyboard focus inside the open drawer
      var focusable = Array.prototype.filter.call(panel.querySelectorAll('a, button'), function (el) {
        return el.offsetParent !== null;
      });
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 992) { close(); } });

    drawer.querySelectorAll('.bic-side-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var sub = document.getElementById(btn.getAttribute('aria-controls'));
        var on = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', on ? 'true' : 'false');
        sub.hidden = !on;
      });
    });
  }

  // Photo sliders: cross-fade, arrows, dots, and auto-advance that pauses on hover or focus.
  // Only the current slide and its neighbours are displayed, so the other photos load later.
  function initSliders() {
    document.querySelectorAll('.bic-slider-wrap').forEach(function (wrap) {
      var slides = wrap.querySelectorAll('.slides > li');
      if (!slides.length) { return; }
      var index = 0;
      var timer = null;
      var dots = document.createElement('div');
      dots.className = 'bic-dots';
      slides.forEach(function (li, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'Show photo ' + (i + 1) + ' of ' + slides.length);
        b.addEventListener('click', function () { show(i); restart(); });
        dots.appendChild(b);
      });
      wrap.appendChild(dots);

      function show(i) {
        index = (i + slides.length) % slides.length;
        var prev = (index - 1 + slides.length) % slides.length;
        var next = (index + 1) % slides.length;
        slides.forEach(function (li, n) {
          li.classList.toggle('is-active', n === index);
          li.classList.toggle('is-near', n === prev || n === next);
          li.setAttribute('aria-hidden', n === index ? 'false' : 'true');
          dots.children[n].setAttribute('aria-current', n === index ? 'true' : 'false');
        });
      }
      function restart() {
        clearInterval(timer);
        if (!reduceMotion && slides.length > 1) { timer = setInterval(function () { show(index + 1); }, 5000); }
      }
      wrap.querySelector('.bic-prev').addEventListener('click', function () { show(index - 1); restart(); });
      wrap.querySelector('.bic-next').addEventListener('click', function () { show(index + 1); restart(); });
      wrap.addEventListener('mouseenter', function () { clearInterval(timer); });
      wrap.addEventListener('mouseleave', restart);
      wrap.addEventListener('focusin', function () { clearInterval(timer); });
      wrap.addEventListener('focusout', function (e) { if (!wrap.contains(e.relatedTarget)) { restart(); } });
      wrap.classList.add('is-ready');
      show(0);
      restart();
    });
  }

  // Section tabs: bring the current page's tab into view, and fade the edge that has more tabs beyond it.
  function initTabs() {
    document.querySelectorAll('.bic-tabs ul').forEach(function (list) {
      var bar = list.closest('.bic-tabs');
      var active = list.querySelector('a.active');
      if (active) { list.scrollLeft = active.offsetLeft - list.offsetLeft - 16; }
      function edges() {
        var max = list.scrollWidth - list.clientWidth;
        bar.classList.toggle('fade-l', list.scrollLeft > 4);
        bar.classList.toggle('fade-r', list.scrollLeft < max - 4);
      }
      list.addEventListener('scroll', edges, { passive: true });
      window.addEventListener('resize', edges);
      edges();
    });
  }

  function slug(text) {
    return text.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  // "On this page" jump links on long pages: built from the main section headings
  // when a page has five or more of them.
  function initToc() {
    var content = document.querySelector('.bic-content');
    if (!content || document.body.hasAttribute('data-no-toc')) { return; }
    var heads = Array.prototype.filter.call(content.querySelectorAll('h2.bic-h'), function (h) {
      return !h.closest('.bic-cta-band, form, .bic-quick-wrap');
    });
    if (heads.length < 5) { return; }
    // a div, not <nav>: Materialize styles every <nav> as the coloured top bar
    var nav = document.createElement('div');
    nav.className = 'bic-toc';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'On this page');
    nav.innerHTML = '<span class="bic-toc-label">On this page</span>';
    heads.forEach(function (h) {
      var host = h.closest('section') || h;
      if (!host.id) { host.id = slug(h.textContent); }
      var a = document.createElement('a');
      a.href = '#' + host.id;
      a.textContent = h.textContent;
      nav.appendChild(a);
    });
    var section = document.createElement('section');
    section.className = 'bic-section';
    section.innerHTML = '<div class="container"></div>';
    section.firstChild.appendChild(nav);
    content.insertBefore(section, content.firstChild);
  }

  // Sections below the fold fade in as they scroll into view. Jumping to an anchor
  // shows everything at once, so the target is never blank when the visitor lands on it.
  function initReveal() {
    if (reduceMotion || !('IntersectionObserver' in window) || location.hash) { return; }
    var root = document.documentElement;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.bic-content > .bic-section, .bic-content > .bic-band').forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight) {
        el.classList.add('bic-reveal');
        io.observe(el);
      }
    });
    function revealAll() {
      root.classList.add('bic-reveal-skip');
      document.querySelectorAll('.bic-reveal').forEach(function (el) { el.classList.add('is-in'); io.unobserve(el); });
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href*="#"]');
      if (a && a.hash && a.pathname === location.pathname) { revealAll(); }
    }, true);
    window.addEventListener('hashchange', revealAll);
  }

  // Round "back to top" button, shown once the visitor has scrolled down a screen.
  function initBackToTop() {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bic-top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '<i class="material-icons" aria-hidden="true">arrow_upward</i>';
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
    document.body.appendChild(btn);
    function toggle() { btn.classList.toggle('is-on', window.scrollY > window.innerHeight); }
    window.addEventListener('scroll', toggle, { passive: true });
    toggle();
  }

  // Resolve with a reCAPTCHA v3 token, or '' if reCAPTCHA isn't configured or didn't load
  // (contact.php then rejects the submission and the visitor sees the email fallback message).
  function recaptchaToken() {
    return new Promise(function (resolve) {
      if (!CONFIG.recaptchaSiteKey || !window.grecaptcha) { resolve(''); return; }
      grecaptcha.ready(function () {
        grecaptcha.execute(CONFIG.recaptchaSiteKey, { action: 'contact' })
          .then(resolve, function () { resolve(''); });
      });
    });
  }

  // "Level of Study" dropdown: list only the levels the chosen campus offers.
  // Each level <option> names its campuses in data-campuses (comma-separated).
  // Returns a function that re-applies the filter (used after the form is reset).
  function initLevels(form) {
    var level = form.querySelector('select[data-level-select]');
    var campus = form.querySelector('select[name="Select Campus"]');
    if (!level || !campus) { return function () {}; }
    var placeholder = level.options[0];
    var all = Array.prototype.slice.call(level.options, 1);

    function sync() {
      var chosen = level.value;
      while (level.options.length > 1) { level.remove(1); }
      all.forEach(function (opt) {
        if (opt.getAttribute('data-campuses').split(',').indexOf(campus.value) !== -1) {
          level.appendChild(opt);
        }
      });
      level.value = chosen;
      if (level.value !== chosen || !chosen) { placeholder.selected = true; }
    }

    campus.addEventListener('change', sync);
    sync();
    return sync;
  }

  function markField(f, ok) {
    f.classList.toggle('invalid', !ok);
    if (ok) { f.removeAttribute('aria-invalid'); } else { f.setAttribute('aria-invalid', 'true'); }
  }

  function initForm(form) {
    var status = form.querySelector('.bic-form-status');
    var button = form.querySelector('[type=submit]');
    var buttonHtml = button.innerHTML;
    var sending = false;
    var resetLevels = initLevels(form);

    // clear a field's error highlight as soon as it becomes valid
    form.querySelectorAll('input, select, textarea').forEach(function (f) {
      ['input', 'change'].forEach(function (type) {
        f.addEventListener(type, function () { if (f.classList.contains('invalid') && f.checkValidity()) { markField(f, true); } });
      });
    });

    function show(kind, text) {
      status.className = 'bic-form-status ' + kind;
      status.textContent = text;
    }

    // disable the Send button and show a circular progress spinner while the request is in flight
    function setSending(on) {
      sending = on;
      button.disabled = on;
      button.setAttribute('aria-busy', on ? 'true' : 'false');
      button.innerHTML = on
        ? '<svg class="bic-spinner" viewBox="22 22 44 44" aria-hidden="true"><circle cx="44" cy="44" r="20.2" fill="none" stroke-width="3.6"></circle></svg>Sending…'
        : buttonHtml;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) { return; }
      var fields = form.querySelectorAll('input[name], select[name], textarea[name]');
      var firstBad = null;
      var lines = [];
      var data = {};

      fields.forEach(function (f) {
        var ok = f.checkValidity();
        if (f.type !== 'hidden' && f.name !== '_hp') { markField(f, ok); }
        if (!ok && !firstBad) { firstBad = f; }
        if (f.value) {
          lines.push(f.name + ': ' + f.value);
          data[f.name] = f.value;
        }
      });

      if (firstBad) {
        show('err', 'Please complete the highlighted fields.');
        firstBad.focus();
        return;
      }

      var subject = form.getAttribute('data-subject') || 'Website enquiry';

      // contact.php builds the email subject from the selected campus;
      // data-subject is only used by the mailto fallback below.
      if (CONFIG.formEndpoint) {
        status.className = 'bic-form-status';
        setSending(true);
        recaptchaToken().then(function (token) {
          data._recaptcha = token;
          return fetch(CONFIG.formEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(data)
          });
        }).then(function (r) {
          if (!r.ok) { throw new Error(r.status); }
          form.reset();
          resetLevels();
          show('ok', 'Thank you. Your message has been sent.');
        }).catch(function () {
          show('err', 'Sorry, your message could not be sent. Please email ' + CONFIG.formEmail + '.');
        }).then(function () {
          setSending(false);
        });
        return;
      }

      window.location.href = 'mailto:' + CONFIG.formEmail +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(lines.join('\n'));
      show('ok', 'Your email app has been opened with your message. Press send there to complete your enquiry.');
    });
  }
})();
