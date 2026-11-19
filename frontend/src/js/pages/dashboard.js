/** Admin dashboard: KPIs, stock matrix, low stock, recent sales, top fruits/vendor, credit. */
(function () {
  const { $, money, int, date, badge, escapeHtml, today, firstOfMonth } = App.utils;

  function setKpi(id, value, sub) {
    $(`#${id} .kpi-value`).textContent = value;
    if (sub !== undefined) $(`#${id} .kpi-sub`).textContent = sub;
  }

  function renderStockMatrix(rows) {
    const byFruit = new Map();
    rows.forEach((r) => {
      if (!byFruit.has(r.fruit_name)) byFruit.set(r.fruit_name, {});
      byFruit.get(r.fruit_name)[r.packaging_size] = r;
    });
    const sizes = App.config.PACKAGING_SIZES;
    const body = [...byFruit.entries()].map(([fruit, cells]) => `
      <tr>
        <td class="fruit">${escapeHtml(fruit)}</td>
        ${sizes.map((s) => {
    const c = cells[s];
    if (!c) return '<td class="stock-cell empty-stock"><div class="qty">—</div></td>';
    const cls = c.available_quantity === 0 ? 'empty-stock low' : (c.stock_status === 'LOW' ? 'low' : '');
    return `<td class="stock-cell ${cls}" title="Reorder level ${c.reorder_level}">
              <div class="qty">${int(c.available_quantity)}</div>
              <div class="price">${money(c.selling_price)}</div></td>`;
  }).join('')}
      </tr>`).join('');
    $('#stockMatrix').innerHTML = `
      <table class="stock-matrix">
        <thead><tr><th>Fruit</th>${sizes.map((s) => `<th>${s}</th>`).join('')}</tr></thead>
        <tbody>${body || '<tr><td class="empty" colspan="4">No fruits registered</td></tr>'}</tbody>
      </table>
      <div class="legend"><span class="ok">Healthy</span><span class="low">At or below reorder level</span><span>Boxes · selling price per box</span></div>`;
  }

  function renderLowStock(rows) {
    $('#lowStock').innerHTML = rows.length
      ? `<ul class="alert-list">${rows.map((r) => `
          <li>
            <div><strong>${escapeHtml(r.fruit_name)}</strong> ${badge(r.packaging_size)}
              <div class="small muted">Reorder level ${r.reorder_level}</div></div>
            <span class="badge badge-red">${int(r.available_quantity)} left</span>
          </li>`).join('')}</ul>
         <a class="btn btn-outline btn-sm" style="margin-top:12px" href="../pages/purchases.html?new=1">Record a purchase</a>`
      : '<p class="muted">All stock is above reorder levels. 🎉</p>';
  }

  function renderBars(container, rows, valueKey, labelKey, formatter, cls = '') {
    const max = Math.max(1, ...rows.map((r) => Number(r[valueKey])));
    container.innerHTML = rows.length
      ? `<div class="bars">${rows.map((r) => `
          <div class="bar-row">
            <div class="bar-label" title="${escapeHtml(r[labelKey])}">${escapeHtml(r[labelKey])}</div>
            <div class="bar-track"><div class="bar-fill ${cls}" style="width:${(Number(r[valueKey]) / max) * 100}%"></div></div>
            <div class="bar-value">${formatter(r[valueKey])}</div>
          </div>`).join('')}</div>`
      : '<p class="muted">No sales recorded yet.</p>';
  }

  async function load() {
    const monthStart = firstOfMonth();
    const results = await Promise.allSettled([
      App.api.get('/reports/stock-levels'),
      App.api.get('/stock/low'),
      App.api.get('/payments/balances?outstanding=true'),
      App.api.get(`/reports/revenue${App.api.query({ start: monthStart, end: today() })}`),
      App.api.get('/reports/top-fruits?limit=5'),
      App.api.get('/sales'),
      App.api.get('/reports/top-vendor'),
    ]);

    const failed = results.find((r) => r.status === 'rejected');
    if (failed) {
      $('#dashError').innerHTML = `<div class="alert alert-danger"><strong>Some data could not be loaded.</strong> ${escapeHtml(failed.reason.message)}</div>`;
    }
    const val = (i) => (results[i].status === 'fulfilled' ? results[i].value : null);

    const stock = val(0);
    if (stock) {
      const total = stock.data.reduce((s, r) => s + r.available_quantity, 0);
      const fruits = new Set(stock.data.map((r) => r.fruit_id)).size;
      setKpi('kpiStock', int(total), `boxes across ${fruits} fruits`);
      renderStockMatrix(stock.data);
    }

    const low = val(1);
    if (low) {
      setKpi('kpiLow', int(low.count), low.count ? 'fruit/size combinations need restocking' : 'nothing to restock');
      renderLowStock(low.data);
    }

    const balances = val(2);
    if (balances) {
      setKpi('kpiCredit', money(balances.total_outstanding), `owed by ${balances.count} vendor(s)`);
      $('#balances').innerHTML = balances.data.length
        ? `<ul class="alert-list">${balances.data.slice(0, 6).map((b) => `
            <li><div><strong>${escapeHtml(b.vendor_name)}</strong>
              <div class="small muted">${escapeHtml(b.phone_number)} · ${b.unpaid_sales} unpaid, ${b.partially_paid_sales} partial</div></div>
              <strong>${money(b.outstanding_balance)}</strong></li>`).join('')}</ul>`
        : '<p class="muted">No outstanding balances.</p>';
    }

    const revenue = val(3);
    if (revenue) {
      setKpi('kpiRevenue', money(revenue.data.total_revenue), `${revenue.data.number_of_sales} sale(s) since ${date(monthStart)}`);
      renderBars($('#sizeRevenue'), revenue.data.by_packaging_size, 'revenue', 'packaging_size', money, 'orange');
    }

    const top = val(4);
    if (top) renderBars($('#topFruits'), top.data, 'total_boxes_sold', 'fruit_name', (v) => `${int(v)} boxes`);

    const sales = val(5);
    if (sales) {
      App.table.render($('#recentSales'), {
        rows: sales.data.slice(0, 6),
        empty: 'No sales yet',
        columns: [
          { label: 'Sale', render: (r) => `#${r.sale_id}` },
          { label: 'Date', render: (r) => date(r.sale_date) },
          { label: 'Vendor', key: 'vendor_name' },
          { label: 'Boxes', num: true, render: (r) => int(r.total_boxes) },
          { label: 'Total', num: true, render: (r) => money(r.total_amount) },
          { label: 'Status', render: (r) => badge(r.payment_status) },
        ],
      });
    }

    const topVendor = val(6);
    if (topVendor) {
      const v = topVendor.data[0];
      $('#topVendor').innerHTML = v
        ? `<div class="muted small">🏆 Top vendor by boxes bought</div>
           <div class="big">${escapeHtml(v.vendor_name)}</div>
           <div class="muted">${int(v.total_boxes)} boxes · ${money(v.total_spent)} spent</div>`
        : '<div class="muted">No sales yet</div>';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    load().catch((err) => App.toastError(err));
  });
})();
