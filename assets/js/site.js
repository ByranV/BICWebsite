/* British International College — site behaviour (requires Materialize 1.0) */
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

  document.addEventListener('DOMContentLoaded', function () {
    M.Sidenav.init(document.querySelectorAll('.sidenav'));
    M.Collapsible.init(document.querySelectorAll('.collapsible'));
    M.FormSelect.init(document.querySelectorAll('select'));
    M.Materialbox.init(document.querySelectorAll('.materialboxed'));

    document.querySelectorAll('.bic-slider-wrap').forEach(function (wrap) {
      var slider = M.Slider.init(wrap.querySelector('.slider'), { indicators: true, interval: 5000, height: 400 });
      wrap.querySelector('.bic-prev').addEventListener('click', function () { slider.prev(); });
      wrap.querySelector('.bic-next').addEventListener('click', function () { slider.next(); });
    });

    // keep the current page visible in the horizontally scrolling section tabs
    var activeTab = document.querySelector('.bic-tabs a.active');
    if (activeTab) {
      var list = activeTab.closest('ul');
      list.scrollLeft = activeTab.offsetLeft - list.offsetLeft - 16;
    }

    initHeaderOffset();
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

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Expose the sticky header's height as --hdr so the section tabs, sticky asides
  // and anchor jumps sit just below it at every screen size.
  function initHeaderOffset() {
    var header = document.querySelector('.bic-header');
    if (!header) { return; }
    function set() { document.documentElement.style.setProperty('--hdr', header.offsetHeight + 'px'); }
    set();
    window.addEventListener('resize', set);
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

  // Sections below the fold fade in as they scroll into view.
  function initReveal() {
    if (reduceMotion || !('IntersectionObserver' in window)) { return; }
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

  // The visible Materialize dropdown that stands in for a native <select>.
  function selectInput(select) {
    var wrap = select.closest('.select-wrapper');
    return wrap ? wrap.querySelector('input.select-dropdown') : null;
  }

  // Rebuild a select's Materialize dropdown after its options or value change in code.
  function refreshSelect(select) {
    var inst = M.FormSelect.getInstance(select);
    if (inst) { inst.destroy(); }
    M.FormSelect.init(select);
  }

  // "Level of Study" dropdown: list only the levels the chosen campus offers.
  // Each level <option> names its campuses in data-campuses (comma-separated).
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
      refreshSelect(level);
    }

    campus.addEventListener('change', sync);
    sync();
    return function () { refreshSelect(campus); sync(); };
  }

  function initForm(form) {
    var status = form.querySelector('.bic-form-status');
    var button = form.querySelector('[type=submit]');
    var buttonHtml = button.innerHTML;
    var sending = false;
    var resetSelects = initLevels(form);

    // clear a dropdown's error highlight once the visitor picks a value
    form.querySelectorAll('select').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var input = selectInput(sel);
        if (input && sel.checkValidity()) { input.classList.remove('invalid'); }
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
        if (f.tagName === 'SELECT') {
          var shown = selectInput(f);
          if (shown) { shown.classList.toggle('invalid', !ok); }
        } else if (f.type !== 'hidden') {
          f.classList.toggle('invalid', !ok);
          f.classList.toggle('valid', ok && f.value !== '');
        }
        if (!ok && !firstBad) { firstBad = f.tagName === 'SELECT' ? (selectInput(f) || f) : f; }
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
          resetSelects();
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
