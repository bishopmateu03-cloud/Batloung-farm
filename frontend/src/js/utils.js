/** Formatting and DOM helpers shared by every page. */
(function () {
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const moneyFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const intFormatter = new Intl.NumberFormat('en-US');

  /** Today's date in local time as YYYY-MM-DD. */
  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function firstOfMonth() {
    return `${today().slice(0, 8)}01`;
  }

  /** Cents-based maths so totals shown in forms match the server exactly. */
  function lineTotal(qty, price) {
    return Math.round(Number(qty || 0) * Math.round(Number(price || 0) * 100)) / 100;
  }

  const STATUS_BADGES = {
    PAID: 'badge-green',
    PARTIALLY_PAID: 'badge-amber',
    UNPAID: 'badge-red',
    ACTIVE: 'badge-green',
    INACTIVE: 'badge-grey',
    LOW: 'badge-red',
    OK: 'badge-green',
    CASH: 'badge-blue',
    MOBILE_MONEY: 'badge-orange',
    SMALL: 'badge-grey',
    MEDIUM: 'badge-blue',
    LARGE: 'badge-orange',
  };

  App.utils = {
    escapeHtml,
    today,
    firstOfMonth,
    lineTotal,
    $: (sel, root = document) => root.querySelector(sel),
    $$: (sel, root = document) => Array.from(root.querySelectorAll(sel)),
    money: (n) => `${App.config.CURRENCY} ${moneyFormatter.format(Number(n || 0))}`,
    int: (n) => intFormatter.format(Number(n || 0)),
    date: (d) => {
      if (!d) return '—';
      const [y, m, day] = String(d).slice(0, 10).split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${Number(day)} ${months[Number(m) - 1]} ${y}`;
    },
    label: (s) => String(s || '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()),
    badge: (status) => `<span class="badge ${STATUS_BADGES[status] || 'badge-grey'}">${escapeHtml(String(status || '').replace(/_/g, ' '))}</span>`,
    options: (items, valueKey, labelFn, selected) => items.map((it) => {
      const value = typeof it === 'object' ? it[valueKey] : it;
      const text = typeof labelFn === 'function' ? labelFn(it) : it;
      return `<option value="${escapeHtml(value)}" ${String(value) === String(selected ?? '') ? 'selected' : ''}>${escapeHtml(text)}</option>`;
    }).join(''),
    debounce(fn, ms = 300) {
      let t;
      return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    },
    /** Reads named form fields into an object, dropping empty strings. */
    formToObject(form) {
      const obj = {};
      new FormData(form).forEach((value, key) => {
        if (typeof value === 'string' && value.trim() !== '') obj[key] = value.trim();
      });
      return obj;
    },
    param: (name) => new URLSearchParams(location.search).get(name),
  };
})();
