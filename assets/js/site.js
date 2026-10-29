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

    var forms = document.querySelectorAll('.bic-form');
    if (forms.length && CONFIG.formEndpoint && CONFIG.recaptchaSiteKey) {
      var s = document.createElement('script');
      s.src = 'https://www.google.com/recaptcha/api.js?render=' + encodeURIComponent(CONFIG.recaptchaSiteKey);
      s.async = true;
      document.head.appendChild(s);
    }
    forms.forEach(initForm);
  });

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

  function initForm(form) {
    var status = form.querySelector('.bic-form-status');
    var button = form.querySelector('[type=submit]');
    var buttonHtml = button.innerHTML;
    var sending = false;

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
        if (f.type !== 'hidden' && f.tagName !== 'SELECT') {
          f.classList.toggle('invalid', !ok);
          f.classList.toggle('valid', ok && f.value !== '');
        }
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
