/**
 * Builds the sidebar navigation on every page and highlights the current page
 * (from <body data-page="...">). Also shows the live database status.
 * All pages live one folder below src/ (pages/ or dashboards/), so links use ../
 */
(function () {
  const NAV = [
    { section: 'Overview' },
    { id: 'dashboard', label: 'Dashboard', icon: '📊', href: '../dashboards/admin-dashboard.html' },
    { section: 'Inventory' },
    { id: 'fruits', label: 'Fruits', icon: '🍎', href: '../pages/fruits.html' },
    { id: 'stock', label: 'Stock levels', icon: '📦', href: '../pages/stock.html' },
    { id: 'purchases', label: 'Purchases', icon: '🚚', href: '../pages/purchases.html' },
    { id: 'suppliers', label: 'Suppliers', icon: '🏭', href: '../pages/suppliers.html' },
    { section: 'Sales' },
    { id: 'sales', label: 'Sales', icon: '🧾', href: '../pages/sales.html' },
    { id: 'vendors', label: 'Vendors', icon: '🧺', href: '../pages/vendors.html' },
    { id: 'payments', label: 'Payments & credit', icon: '💳', href: '../pages/payments.html' },
    { section: 'Insights' },
    { id: 'reports', label: 'Reports', icon: '📈', href: '../pages/reports.html' },
  ];

  function renderSidebar() {
    const el = document.getElementById('sidebar');
    if (!el) return;
    const active = document.body.dataset.page;

    el.innerHTML = `
      <div class="brand">
        <img src="../assets/images/logo.svg" alt="">
        <div>
          <div class="brand-name">Batloung Farm</div>
          <div class="brand-sub">Distribution system</div>
        </div>
      </div>
      <nav class="nav" aria-label="Main navigation">
        ${NAV.map((item) => (item.section
    ? `<div class="nav-section">${item.section}</div>`
    : `<a href="${item.href}" class="${item.id === active ? 'active' : ''}" ${item.id === active ? 'aria-current="page"' : ''}>
                 <span class="icon" aria-hidden="true">${item.icon}</span>${item.label}</a>`)).join('')}
      </nav>
      <div class="sidebar-footer">
        <div class="db-status"><span class="db-dot" id="dbDot"></span><span id="dbText">Checking database…</span></div>
        <div style="margin-top:6px">Maseru, Lesotho</div>
      </div>`;

    // Mobile menu toggle
    const main = document.querySelector('.main');
    if (main && !document.querySelector('.menu-toggle')) {
      const btn = document.createElement('button');
      btn.className = 'menu-toggle';
      btn.setAttribute('aria-label', 'Open menu');
      btn.textContent = '☰ Menu';
      btn.addEventListener('click', () => el.classList.toggle('open'));
      main.prepend(btn);
    }
  }

  async function checkHealth() {
    const dot = document.getElementById('dbDot');
    const text = document.getElementById('dbText');
    if (!dot) return;
    try {
      const res = await fetch(App.config.HEALTH_URL);
      const data = await res.json();
      const ok = res.ok && data.database === 'connected';
      dot.className = `db-dot ${ok ? 'ok' : 'down'}`;
      text.textContent = ok ? 'Database connected' : 'Database unavailable';
      if (!ok) App.toast(data.message || 'The database is unavailable', 'warning', 8000);
    } catch (e) {
      dot.className = 'db-dot down';
      text.textContent = 'Server offline';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderSidebar();
    checkHealth();
  });
})();
