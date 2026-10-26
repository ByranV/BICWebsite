/* British International College — site behaviour (requires Materialize 1.0) */
(function () {
  'use strict';

  // Enquiry forms. Submissions are POSTed as JSON to `formEndpoint` (contact.php),
  // which emails them to the college from the web server. If `formEndpoint` is
  // emptied, forms fall back to opening the visitor's email app addressed to `formEmail`.
  var CONFIG = {
    formEmail: 'info@bicollege.co.za',
    formEndpoint: 'contact.php'
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

    document.querySelectorAll('.bic-form').forEach(initForm);
  });

  function initForm(form) {
    var status = form.querySelector('.bic-form-status');

    function show(kind, text) {
      status.className = 'bic-form-status ' + kind;
      status.textContent = text;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
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
        fetch(CONFIG.formEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(data)
        }).then(function (r) {
          if (!r.ok) { throw new Error(r.status); }
          form.reset();
          show('ok', 'Thank you. Your message has been sent.');
        }).catch(function () {
          show('err', 'Sorry, your message could not be sent. Please email ' + CONFIG.formEmail + '.');
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
