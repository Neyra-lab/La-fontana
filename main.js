'use strict';

// Opening hours by weekday (0 = Sunday ... 6 = Saturday). null = closed. Hours are 24h.
const OPENING = {
  0: { open: 12, close: 23 },
  1: null,
  2: { open: 12, close: 22 },
  3: { open: 12, close: 22 },
  4: { open: 12, close: 22 },
  5: { open: 12, close: 23 },
  6: { open: 12, close: 23 }
};

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const pad = n => String(n).padStart(2, '0');
const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseDate = v => { const [y, m, d] = v.split('-').map(Number); return new Date(y, m - 1, d); };

// Footer year
const yearEl = $('#year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Hamburger menu
(function () {
  const toggle = $('.nav-toggle');
  const nav = $('#site-nav');
  if (!toggle || !nav) return;
  const setOpen = open => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
  });
  document.addEventListener('click', e => {
    if (!nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
  });
  window.matchMedia('(min-width: 861px)').addEventListener('change', e => { if (e.matches) setOpen(false); });
})();

// Validation
const labelText = el => (el.labels && el.labels[0] ? el.labels[0].firstChild.textContent : el.name).trim();

function check(el) {
  const v = el.value.trim();
  if (el.required && !v) {
    return `Please ${el.tagName === 'SELECT' ? 'choose' : 'enter'} ${el.dataset.label || labelText(el).toLowerCase()}.`;
  }
  if (!v) return '';
  if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
    return 'Please enter a valid email address, like name@example.com.';
  }
  if (el.type === 'tel') {
    const digits = v.replace(/\D/g, '');
    if (!/^\+?[\d\s().-]+$/.test(v) || digits.length < 7 || digits.length > 15) {
      return 'Please enter a valid phone number, like +000 000 000 000.';
    }
  }
  if (el.type === 'date') {
    const d = parseDate(v);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (isNaN(d)) return 'Please choose a valid date.';
    if (d < today) return 'Please choose today or a later date.';
    if (!OPENING[d.getDay()]) return "We're closed on Mondays. Please choose another day.";
  }
  return '';
}

function setupForm(form, titleTemplate, intro) {
  const fields = [...form.querySelectorAll('input, select, textarea')];

  const validate = el => {
    const msg = check(el);
    $('#' + el.id + '-error').textContent = msg;
    if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
    return !msg;
  };

  fields.forEach(el => {
    el.addEventListener('input', () => { if (el.hasAttribute('aria-invalid')) validate(el); });
    el.addEventListener('change', () => validate(el));
    el.addEventListener('blur', () => { if (el.value.trim() || el.hasAttribute('aria-invalid')) validate(el); });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const invalid = fields.filter(f => !f.disabled && !validate(f));
    if (invalid.length) { invalid[0].focus(); return; }

    // TODO: send the form data to your server or form service here
    // (for example fetch('https://your-form-service.example/endpoint', { method: 'POST', body: new FormData(form) })).
    // Until this is connected, nothing is sent anywhere.

    const box = $('#confirmation');
    const list = $('#confirm-list');
    list.replaceChildren();
    fields.forEach(f => {
      let value = f.tagName === 'SELECT' ? f.options[f.selectedIndex].text : f.value.trim();
      if (!value) return;
      if (f.type === 'date') {
        value = parseDate(value).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      }
      const dt = document.createElement('dt');
      dt.textContent = labelText(f);
      const dd = document.createElement('dd');
      dd.textContent = value;
      list.append(dt, dd);
    });
    const nameField = $('#name');
    const firstName = nameField ? nameField.value.trim().split(/\s+/)[0] : '';
    $('#confirm-title').textContent = titleTemplate.replace('{name}', firstName);
    $('#confirm-intro').textContent = intro;
    form.hidden = true;
    box.hidden = false;
    box.focus();
  });
}

// Booking: date min and time slots
(function () {
  const dateEl = $('#date');
  const timeEl = $('#time');
  const hint = $('#time-hint');
  if (!dateEl || !timeEl) return;

  dateEl.min = isoDate(new Date());

  const addOption = (value, text) => {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = text;
    timeEl.appendChild(o);
  };

  const fillTimes = () => {
    timeEl.replaceChildren();
    timeEl.removeAttribute('aria-invalid');
    $('#time-error').textContent = '';
    const v = dateEl.value;
    if (!v || isNaN(parseDate(v))) {
      addOption('', 'Choose a date first');
      timeEl.disabled = true;
      hint.textContent = '';
      return;
    }
    const hours = OPENING[parseDate(v).getDay()];
    if (!hours) {
      addOption('', "We're closed on Mondays");
      timeEl.disabled = true;
      hint.textContent = "We're closed on Mondays.";
      return;
    }
    timeEl.disabled = false;
    hint.textContent = '';
    addOption('', 'Choose a time');
    // Last slot is one hour before closing
    for (let m = hours.open * 60; m <= (hours.close - 1) * 60; m += 30) {
      const t = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
      addOption(t, t);
    }
  };

  dateEl.addEventListener('change', fillTimes);
  fillTimes();
})();

const bookingForm = $('#booking-form');
if (bookingForm) {
  setupForm(bookingForm, 'Thank you, {name}. Your request is in.',
    'Here are the details you sent us. We will confirm your table by email.');
}
const contactForm = $('#contact-form');
if (contactForm) {
  setupForm(contactForm, 'Thank you, {name}. Message received.',
    'Here is what you sent us. We will reply as soon as we can.');
}
