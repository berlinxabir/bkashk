/* =========================================================================
   Send Money Receipt — live editor, formatter and PNG export
   ========================================================================= */
(function () {
  'use strict';

  var STAGE_W = 918;
  var STAGE_H = 1600;

  var DEFAULTS = {
    phone1: '01313727870',
    phone2: '01313727870',
    time: '01:58pm',
    date: '06/10/26',
    trx: 'DJ61HQWKV5',
    amount: '550',
    reference: 'shelby abir',
    title: 'সেন্ড মানি',
    manualTime: false
  };

  var $ = function (id) { return document.getElementById(id); };

  var form = $('receiptForm');
  var stage = $('stage');
  var stageWrap = $('stageWrap');
  var downloadBtn = $('downloadBtn');
  var quality = $('quality');
  var toastEl = $('toast');

  /* -------------------------------------------------------------- formatting */

  function formatPhone(raw) {
    var digits = String(raw).replace(/\D/g, '');
    if (digits.indexOf('880') === 0 && digits.length > 11) digits = '0' + digits.slice(3);
    return digits.slice(0, 11);
  }

  function cleanAmount(raw) {
    var s = String(raw).replace(/[^\d.]/g, '');
    var dot = s.indexOf('.');
    if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '');
    return s.slice(0, 13);
  }

  function formatAmount(raw) {
    var s = cleanAmount(raw);
    if (!s || s === '.') return '৳0.00';
    var parts = s.split('.');
    var whole = parts[0].replace(/^0+(?=\d)/, '') || '0';
    var grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    var dec = (parts[1] || '').slice(0, 2);
    while (dec.length < 2) dec += '0';
    return '৳' + grouped + '.' + dec;
  }

  function cleanAmountInput(raw) {
    var s = cleanAmount(raw);
    if (!s) return '';
    var parts = s.split('.');
    var whole = parts[0];
    var dec = parts.length > 1 ? parts[1] : null;
    return dec === null ? whole : whole + '.' + dec;
  }

  function normalizeTime(raw) {
    var s = String(raw).toLowerCase().replace(/[.\s]/g, '');
    var ap = '';
    if (/am$/.test(s)) { ap = 'am'; s = s.slice(0, -2); }
    else if (/pm$/.test(s)) { ap = 'pm'; s = s.slice(0, -2); }

    var digits = s.replace(/\D/g, '').slice(0, 4);
    if (!digits) return ap ? '' : '';

    var h, m;
    if (digits.length <= 2) { h = digits; m = '00'; }
    else { h = digits.slice(0, digits.length - 2); m = digits.slice(-2); }

    var hour = parseInt(h, 10);
    if (isNaN(hour)) return '';
    if (!ap && hour > 12) {
      ap = 'pm';
      hour = hour - 12;
      if (hour === 0) hour = 12;
    }
    if (ap && hour > 12) hour = hour - 12;
    if (ap && hour === 0) hour = 12;
    if (m.length === 1) m = '0' + m;
    if (parseInt(m, 10) > 59) m = '59';

    return String(hour).padStart(2, '0') + ':' + m + ap;
  }

  function pad2(value) {
    value = String(value || '');
    return value.length < 2 ? '0' + value : value;
  }

  /* Accepts 06/10/26, 6/10/26 or 061026 and keeps the typed separators usable. */
  function normalizeDate(raw) {
    var s = String(raw).replace(/[^\d/]/g, '').slice(0, 10);
    var parts = s.split('/');

    if (parts.length >= 3) {
      return pad2(parts[0]) + '/' + pad2(parts[1]) + '/' + parts[2].replace(/\D/g, '').slice(0, 2);
    }
    if (parts.length === 2) {
      var day = parts[0], month = parts[1];
      if (month.length >= 2) return pad2(day) + '/' + month.slice(0, 2);
      return s;
    }

    if (s.length === 6) return s.slice(0, 2) + '/' + s.slice(2, 4) + '/' + s.slice(4);
    return s.slice(0, 6);
  }

  /* Finishes a date typed without separators, e.g. 61026 -> 06/10/26 */
  function completeDate(raw) {
    var s = String(raw).replace(/[^\d/]/g, '');
    if (s.indexOf('/') === -1) {
      var digits = s.slice(0, 6);
      if (digits.length === 5) return '0' + digits[0] + '/' + digits.slice(1, 3) + '/' + digits.slice(3, 5);
      if (digits.length === 4) return digits.slice(0, 2) + '/' + digits.slice(2);
    }
    return normalizeDate(raw);
  }

  function normalizeTrx(raw) {
    return String(raw).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  }

  function normalizeReference(raw) {
    return String(raw).replace(/\s{2,}/g, ' ').slice(0, 26);
  }

  function normalizeTitle(raw) {
    return String(raw).replace(/\s{2,}/g, ' ').slice(0, 20);
  }

  /* ------------------------------------------------------------------ render */

  function isManualTime() {
    return !!($('manualTime') && $('manualTime').checked);
  }

  function currentValues() {
    return {
      phone1: formatPhone($('phone1').value),
      phone2: formatPhone($('phone2').value),
      time: isManualTime()
        ? String($('time').value).replace(/\s+/g, ' ').trim().slice(0, 14)
        : normalizeTime($('time').value),
      date: normalizeDate($('date').value),
      trx: normalizeTrx($('trx').value),
      amount: cleanAmount($('amount').value),
      reference: normalizeReference($('reference').value),
      title: normalizeTitle($('title').value)
    };
  }

  function render() {
    var v = currentValues();

    $('rTitle').textContent = v.title || 'সেন্ড মানি';
    $('rPhone1').textContent = v.phone1;
    $('rPhone2').textContent = v.phone2;
    $('rTime').textContent = (v.time + (v.date ? ' ' + v.date : '')).trim();
    $('rTrx').textContent = v.trx;
    $('rAmount').textContent = formatAmount(v.amount);
    $('rRef').textContent = v.reference.trim();
  }

  /* Keep the typed value tidy without moving the caret when nothing changed. */
  function tidyInput(input, value) {
    if (input.value !== value) input.value = value;
  }

  var NORMALIZERS = {
    phone1: formatPhone,
    phone2: formatPhone,
    time: normalizeTime,
    date: normalizeDate,
    trx: normalizeTrx,
    amount: cleanAmountInput,
    reference: normalizeReference,
    title: normalizeTitle
  };

  form.addEventListener('input', function (e) {
    var input = e.target;
    if (!input || !input.id) return;

    if (input.id === 'manualTime') { render(); return; }
    if (!NORMALIZERS[input.id]) return;

    /* manual mode: whatever is typed for the time is shown exactly as typed */
    if (input.id === 'time' && isManualTime()) { render(); return; }

    tidyInput(input, NORMALIZERS[input.id](input.value));
    render();
  });

  if ($('manualTime')) {
    $('manualTime').addEventListener('change', function () {
      if (!isManualTime()) {
        tidyInput($('time'), normalizeTime($('time').value));
      }
      render();
    });
  }

  $('swapBtn').addEventListener('click', function () {
    var main = $('phone1');
    var secondary = $('phone2');
    var tmp = main.value;
    main.value = secondary.value;
    secondary.value = tmp;
    render();
    toast('Main and secondary numbers swapped');
  });

  form.addEventListener('blur', function (e) {
    var input = e.target;
    if (!input || !input.id) return;

    if (input.id === 'amount' && input.value) {
      var clean = cleanAmount(input.value);
      if (clean) {
        var parts = clean.split('.');
        var dec = (parts[1] || '').slice(0, 2);
        while (dec.length < 2) dec += '0';
        tidyInput(input, parts[0] + '.' + dec);
      }
    }

    if (input.id === 'date') tidyInput(input, completeDate(input.value));
    if (input.id === 'reference') tidyInput(input, normalizeReference(input.value).trim());

    render();
  }, true);

  form.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); }
  });

  /* -------------------------------------------------------------------- fit */

  var lastScale = 0;

  function fitPreview() {
    var availW = stageWrap.clientWidth;
    if (!availW) return;
    var scale = Math.min(availW / STAGE_W, 1);
    if (Math.abs(scale - lastScale) < 0.001) return;
    lastScale = scale;

    stage.style.transform = 'scale(' + scale + ')';
    stage.style.left = Math.max(0, (availW - STAGE_W * scale) / 2) + 'px';
    stageWrap.style.height = Math.round(STAGE_H * scale) + 'px';
  }

  /* ?capture=1 renders the bare 918 x 1600 receipt (handy for exact-size checks) */
  var captureMode = /(?:^|[?&])capture=1(?:&|$)/.test(window.location.search);

  if (captureMode) {
    document.documentElement.classList.add('capture-mode');
  } else {
    stage.style.position = 'absolute';
    stage.style.top = '0';
    stage.style.left = '0';
    stage.style.transformOrigin = 'top left';

    if (window.ResizeObserver) {
      new ResizeObserver(fitPreview).observe(stageWrap);
    }
    window.addEventListener('resize', fitPreview);
    window.addEventListener('orientationchange', fitPreview);
  }

  /* ----------------------------------------------------------------- export */

  function buildCanvas(scale) {
    return document.fonts.ready.then(function () {
      var clone = stage.cloneNode(true);
      clone.removeAttribute('style');
      clone.removeAttribute('id');
      var holder = document.createElement('div');
      holder.className = 'export-holder';
      holder.appendChild(clone);
      document.body.appendChild(holder);

      return html2canvas(clone, {
        scale: scale || 1,
        width: STAGE_W,
        height: STAGE_H,
        windowWidth: STAGE_W,
        windowHeight: STAGE_H,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      }).then(function (canvas) {
        holder.remove();
        return canvas;
      }, function (err) {
        holder.remove();
        throw err;
      });
    });
  }

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
  }

  function fileStamp() {
    var v = currentValues();
    var d = new Date();
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return 'bkash-send-money-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) +
      '-' + pad(d.getHours()) + pad(d.getMinutes()) + (v.trx ? '-' + v.trx : '') + '.png';
  }

  function download() {
    var btnText = downloadBtn.querySelector('span');
    downloadBtn.disabled = true;
    if (btnText) btnText.textContent = 'Rendering…';

    buildCanvas(parseInt(quality.value, 10) || 1).then(function (canvas) {
      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          blob ? resolve(blob) : reject(new Error('Could not create the image.'));
        }, 'image/png');
      });
    }).then(function (blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = fileStamp();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      toast('Screenshot saved — ' + Math.round(blob.size / 1024) + ' KB');
    }).catch(function (err) {
      console.error(err);
      toast('Sorry, the screenshot could not be generated.');
    }).then(function () {
      downloadBtn.disabled = false;
      if (btnText) btnText.textContent = 'Download PNG';
    });
  }

  downloadBtn.addEventListener('click', download);

  /* ------------------------------------------------------------ reset / copy */

  $('resetBtn').addEventListener('click', function () {
    Object.keys(DEFAULTS).forEach(function (key) {
      var el = $(key);
      if (!el) return;
      if (el.type === 'checkbox') el.checked = DEFAULTS[key];
      else el.value = DEFAULTS[key];
    });
    render();
    toast('Restored the reference values');
  });

  $('copyBtn').addEventListener('click', function () {
    var v = currentValues();
    var text = [
      'Phone: ' + v.phone1,
      'Phone: ' + v.phone2,
      'Time: ' + v.time,
      'Date: ' + v.date,
      'Transaction ID: ' + v.trx,
      'Amount: ' + formatAmount(v.amount),
      'Reference: ' + v.reference
    ].join('\n');

    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
      .then(function () { toast('Values copied'); })
      .catch(function () { toast('Copy is not available in this browser'); });
  });

  /* --------------------------------------------------------------- start up */

  render();

  if (!captureMode) {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(fitPreview);
    }
    fitPreview();
  }

  /* exposed for debugging / automated checks */
  window.__receipt = {
    buildCanvas: buildCanvas,
    render: render,
    fitPreview: fitPreview,
    defaults: DEFAULTS
  };
})();
