/** Stock levels per fruit and packaging size, low-stock filter, price / reorder settings. */
(function () {
  const { $, escapeHtml, int, money, badge, date } = App.utils;
  let rows = [];

  function renderSummary(all) {
    const totals = { SMALL: 0, MEDIUM: 0, LARGE: 0 };
    all.forEach((r) => { totals[r.packaging_size] += r.available_quantity; });
    $('#sizeSummary').innerHTML = App.config.PACKAGING_SIZES.map((s) => `
      <div class="size-box"><div class="qty">${int(totals[s])}</div><div class="label">${s} boxes</div></div>`).join('');
  }

  function render() {
    App.table.render($('#table'), {
      rows,
      empty: $('#lowOnly').checked ? 'No low stock – everything is above the threshold' : 'No stock records',
      columns: [
        { label: 'Fruit', render: (r) => `<strong>${escapeHtml(r.fruit_name)}</strong>${r.fruit_status === 'INACTIVE' ? ' <span class="badge badge-grey">INACTIVE</span>' : ''}` },
        { label: 'Packaging', render: (r) => badge(r.packaging_size) },
        { label: 'Available boxes', num: true, render: (r) => `<strong>${int(r.available_quantity)}</strong>` },
        { label: 'Selling price', num: true, render: (r) => money(r.selling_price) },
        { label: 'Stock value', num: true, render: (r) => money(r.available_quantity * r.selling_price) },
        { label: 'Reorder level', num: true, render: (r) => int(r.reorder_level) },
        { label: 'Status', render: (r) => badge(r.stock_status) },
        { label: 'Last updated', render: (r) => `<span class="small muted nowrap">${date(r.last_updated)}</span>` },
        { label: '', render: (r) => `<div class="actions"><button class="btn btn-outline btn-sm" data-edit="${r.stock_id}">Edit</button></div>` },
      ],
    });
  }

  async function load() {
    App.table.loading($('#table'));
    try {
      const lowOnly = $('#lowOnly').checked;
      const size = $('#sizeFilter').value;
      let res;
      if (lowOnly) {
        const threshold = $('#threshold').value;
        res = await App.api.get(`/stock/low${App.api.query({ threshold })}`);
        rows = size ? res.data.filter((r) => r.packaging_size === size) : res.data;
        $('#count').textContent = `${rows.length} low-stock item(s) · ${res.criteria}`;
      } else {
        res = await App.api.get(`/stock${App.api.query({ packaging_size: size })}`);
        rows = res.data;
        $('#count').textContent = `${rows.length} stock record(s)`;
      }
      render();
      const all = await App.api.get('/stock');
      renderSummary(all.data);
    } catch (err) {
      App.table.error($('#table'), err);
    }
  }

  function openEdit(stockId) {
    const r = rows.find((x) => x.stock_id === stockId);
    App.modal.form({
      title: `${r.fruit_name} – ${r.packaging_size} boxes`,
      body: `
        <p class="muted" style="margin-top:0">Currently <strong>${int(r.available_quantity)}</strong> boxes in stock. Quantities change only through purchases and sales.</p>
        <div class="form-grid">
          <div class="field"><label for="selling_price">Selling price per box (M) *</label>
            <input id="selling_price" name="selling_price" type="number" min="0.01" step="0.01" required value="${r.selling_price}"></div>
          <div class="field"><label for="reorder_level">Reorder level *</label>
            <input id="reorder_level" name="reorder_level" type="number" min="0" step="1" required value="${r.reorder_level}"></div>
        </div>
        <p class="hint small muted">Prices must stay Small &lt; Medium &lt; Large.</p>`,
      async onSubmit(form) {
        const res = await App.api.put(`/stock/${r.fruit_id}/${r.packaging_size}`, {
          selling_price: Number(form.selling_price.value),
          reorder_level: Number(form.reorder_level.value),
        });
        App.toast(res.message);
        load();
      },
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (App.utils.param('low') === '1') $('#lowOnly').checked = true;
    const syncThreshold = () => { $('#thresholdWrap').classList.toggle('hidden', !$('#lowOnly').checked); };
    syncThreshold();
    $('#lowOnly').addEventListener('change', () => { syncThreshold(); load(); });
    $('#sizeFilter').addEventListener('change', load);
    $('#threshold').addEventListener('input', App.utils.debounce(load, 400));
    $('#table').addEventListener('click', (e) => {
      const b = e.target.closest('[data-edit]');
      if (b) openEdit(Number(b.dataset.edit));
    });
    load();
  });
})();
