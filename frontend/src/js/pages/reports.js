/** Reports: top fruits, revenue for a date range, top vendor, current stock levels. */
(function () {
  const { $, escapeHtml, money, int, badge, date, today } = App.utils;

  async function loadTopFruits() {
    try {
      const res = await App.api.get(`/reports/top-fruits?limit=${$('#topLimit').value}`);
      const max = Math.max(1, ...res.data.map((r) => r.total_boxes_sold));
      $('#topFruits').innerHTML = res.data.length ? `
        <div class="bars" style="margin-bottom:16px">${res.data.map((r, i) => `
          <div class="bar-row"><div class="bar-label">${i + 1}. ${escapeHtml(r.fruit_name)}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${(r.total_boxes_sold / max) * 100}%"></div></div>
            <div class="bar-value">${int(r.total_boxes_sold)}</div></div>`).join('')}</div>` : '';
      const tableBox = document.createElement('div');
      $('#topFruits').appendChild(tableBox);
      App.table.render(tableBox, {
        rows: res.data,
        empty: 'No sales recorded',
        columns: [
          { label: 'Rank', render: (r) => `${res.data.indexOf(r) + 1}` },
          { label: 'Fruit', key: 'fruit_name' },
          { label: 'Boxes sold', num: true, render: (r) => int(r.total_boxes_sold) },
          { label: 'Sales', num: true, key: 'number_of_sales' },
          { label: 'Revenue', num: true, render: (r) => money(r.revenue) },
        ],
      });
    } catch (err) {
      App.table.error($('#topFruits'), err);
    }
  }

  async function loadRevenue(e) {
    if (e) e.preventDefault();
    const start = $('#revStart').value;
    const end = $('#revEnd').value;
    try {
      const { data } = await App.api.get(`/reports/revenue${App.api.query({ start, end })}`);
      $('#revenueResult').innerHTML = `
        <div class="grid grid-4" style="margin-bottom:16px">
          <div><div class="kpi-label">Revenue</div><div class="kpi-value">${money(data.total_revenue)}</div></div>
          <div><div class="kpi-label">Sales</div><div class="kpi-value">${int(data.number_of_sales)}</div></div>
          <div><div class="kpi-label">Collected</div><div class="kpi-value">${money(data.total_collected)}</div></div>
          <div><div class="kpi-label">Outstanding</div><div class="kpi-value" style="color:var(--red-600)">${money(data.total_outstanding)}</div></div>
        </div>
        <p class="small muted">${date(data.start_date)} – ${date(data.end_date)} · by packaging size:</p>
        <div id="revBySize"></div>`;
      App.table.render($('#revBySize'), {
        rows: data.by_packaging_size,
        empty: 'No sales in this period',
        columns: [
          { label: 'Packaging', render: (r) => badge(r.packaging_size) },
          { label: 'Boxes sold', num: true, render: (r) => int(r.boxes_sold) },
          { label: 'Revenue', num: true, render: (r) => money(r.revenue) },
        ],
      });
    } catch (err) {
      $('#revenueResult').innerHTML = '';
      App.modal.showErrors($('#revenueResult'), err);
    }
  }

  async function loadTopVendor() {
    try {
      const { data } = await App.api.get('/reports/top-vendor');
      $('#topVendor').innerHTML = data.length
        ? data.map((v) => `
            <div class="muted small">🏆 Highest number of boxes purchased${data.length > 1 ? ' (tie)' : ''}</div>
            <div class="big">${escapeHtml(v.vendor_name)}</div>
            <div class="muted">${escapeHtml(v.phone_number)}</div>
            <div style="margin-top:12px;display:flex;gap:24px">
              <div><div class="muted small">Boxes</div><strong style="font-size:1.3rem">${int(v.total_boxes)}</strong></div>
              <div><div class="muted small">Spent</div><strong style="font-size:1.3rem">${money(v.total_spent)}</strong></div>
            </div>`).join('<hr style="border-color:rgba(255,255,255,.2)">')
        : '<div class="muted">No sales yet</div>';
    } catch (err) {
      $('#topVendor').textContent = err.message;
    }
  }

  async function loadStockLevels() {
    try {
      const res = await App.api.get('/reports/stock-levels');
      App.table.render($('#stockLevels'), {
        rows: res.data,
        columns: [
          { label: 'Fruit', render: (r) => `<strong>${escapeHtml(r.fruit_name)}</strong>` },
          { label: 'Packaging', render: (r) => badge(r.packaging_size) },
          { label: 'Available boxes', num: true, render: (r) => int(r.available_quantity) },
          { label: 'Selling price', num: true, render: (r) => money(r.selling_price) },
          { label: 'Reorder level', num: true, render: (r) => int(r.reorder_level) },
          { label: 'Status', render: (r) => badge(r.stock_status) },
        ],
      });
    } catch (err) {
      App.table.error($('#stockLevels'), err);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const t = today();
    $('#revStart').value = `${t.slice(0, 4)}-01-01`;
    $('#revEnd').value = t;
    $('#revenueForm').addEventListener('submit', loadRevenue);
    $('#topLimit').addEventListener('change', loadTopFruits);
    $('#btnPrint').addEventListener('click', () => window.print());
    $('#generated').textContent = `Generated ${date(t)}`;
    loadTopFruits();
    loadRevenue();
    loadTopVendor();
    loadStockLevels();
  });
})();
