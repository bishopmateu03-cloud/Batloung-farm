/** Sales management: record multi-item sales to vendors with payment, view history. */
(function () {
  const { $, escapeHtml, money, int, date, badge, today, options, lineTotal } = App.utils;

  async function load() {
    App.table.loading($('#table'));
    try {
      const res = await App.api.get(`/sales${App.api.query({
        vendor_id: $('#vendorFilter').value,
        payment_status: $('#statusFilter').value,
        start: $('#start').value,
        end: $('#end').value,
      })}`);
      const total = res.data.reduce((s, r) => s + Math.round(r.total_amount * 100), 0) / 100;
      const owing = res.data.reduce((s, r) => s + Math.round(r.outstanding_balance * 100), 0) / 100;
      $('#count').textContent = `${res.count} sale(s) · ${money(total)} billed · ${money(owing)} outstanding`;
      App.table.render($('#table'), {
        rows: res.data,
        empty: 'No sales found',
        columns: [
          { label: 'Sale', render: (r) => `<strong>#${r.sale_id}</strong>` },
          { label: 'Date', render: (r) => date(r.sale_date) },
          { label: 'Vendor', key: 'vendor_name' },
          { label: 'Boxes', num: true, render: (r) => int(r.total_boxes) },
          { label: 'Total', num: true, render: (r) => `<strong>${money(r.total_amount)}</strong>` },
          { label: 'Paid', num: true, render: (r) => money(r.amount_paid) },
          { label: 'Owing', num: true, render: (r) => (r.outstanding_balance > 0 ? `<span style="color:var(--red-600);font-weight:600">${money(r.outstanding_balance)}</span>` : money(0)) },
          { label: 'Status', render: (r) => badge(r.payment_status) },
          {
            label: '',
            render: (r) => `<div class="actions">
              <button class="btn btn-outline btn-sm" data-view="${r.sale_id}">View</button>
              ${r.payment_status !== 'PAID' ? `<a class="btn btn-primary btn-sm" href="payments.html?sale_id=${r.sale_id}">Pay</a>` : ''}</div>`,
          },
        ],
      });
    } catch (err) {
      App.table.error($('#table'), err);
    }
  }

  async function view(id) {
    try {
      const { data: s } = await App.api.get(`/sales/${id}`);
      App.modal.info({
        title: `Sale #${s.sale_id} – invoice`,
        wide: true,
        body: `
          <dl class="detail-list">
            <dt>Vendor</dt><dd>${escapeHtml(s.vendor_name)} · ${escapeHtml(s.phone_number)}</dd>
            <dt>Location</dt><dd>${escapeHtml(s.location)}</dd>
            <dt>Date</dt><dd>${date(s.sale_date)}</dd>
            <dt>Payment status</dt><dd>${badge(s.payment_status)}</dd>
          </dl>
          <div class="table-wrap"><table class="data">
            <thead><tr><th>Fruit</th><th>Packaging</th><th class="num">Boxes</th><th class="num">Price / box</th><th class="num">Line total</th></tr></thead>
            <tbody>${s.items.map((i) => `<tr><td>${escapeHtml(i.fruit_name)}</td><td>${badge(i.packaging_size)}</td>
              <td class="num">${int(i.quantity)}</td><td class="num">${money(i.unit_price)}</td><td class="num">${money(i.line_total)}</td></tr>`).join('')}</tbody>
          </table></div>
          <div class="total-bar"><span>Total payable</span><span class="amount">${money(s.total_amount)}</span></div>
          <h3 style="margin:18px 0 6px">Payments</h3>
          ${s.payments.length ? `<ul class="alert-list">${s.payments.map((p) => `<li><span>${date(p.payment_date)} ${badge(p.payment_method)} <span class="small muted">${escapeHtml(p.reference_no || '')}</span></span><strong>${money(p.amount)}</strong></li>`).join('')}</ul>`
    : '<p class="muted">No payments – sold on credit.</p>'}
          <div class="total-bar"><span>Outstanding balance</span><span class="amount" style="color:${s.outstanding_balance > 0 ? 'var(--red-600)' : 'var(--green-800)'}">${money(s.outstanding_balance)}</span></div>`,
      });
    } catch (err) {
      App.toastError(err);
    }
  }

  async function openCreate(presetVendorId) {
    let vendors; let fruits; let stock;
    try {
      [vendors, fruits, stock] = await Promise.all([
        App.api.get('/vendors').then((r) => r.data),
        App.api.get('/fruits?status=ACTIVE').then((r) => r.data),
        App.api.get('/stock').then((r) => r.data),
      ]);
    } catch (err) {
      App.toastError(err);
      return;
    }
    let items;
    let saleTotal = 0;

    App.modal.form({
      title: 'Record sale',
      submitText: 'Complete sale',
      wide: true,
      body: `
        <div class="form-grid">
          <div class="field"><label for="vendor_id">Registered vendor *</label>
            <select id="vendor_id" name="vendor_id" required>
              <option value="">Select vendor…</option>
              ${options(vendors, 'vendor_id', (v) => `${v.vendor_name} · ${v.phone_number}`, presetVendorId)}
            </select>
            <div class="hint">Not listed? <a href="vendors.html?new=1">Register the vendor first</a>.</div></div>
          <div class="field"><label for="sale_date">Sale date *</label>
            <input id="sale_date" name="sale_date" type="date" required value="${today()}" max="${today()}"></div>
        </div>
        <h3 style="margin:18px 0 4px">Fruits sold</h3>
        <p class="small muted" style="margin:0 0 4px">Prices come from stock for each packaging size. The sale is rejected if any line is short.</p>
        <div id="saleItems"></div>
        <div class="total-bar"><span>Total payable (calculated automatically)</span><span class="amount" id="saleTotal">${money(0)}</span></div>
        <div id="shortWarning" class="alert alert-danger hidden" style="margin:12px 0 0">Some items exceed the available stock – the server will reject this sale.</div>

        <h3 style="margin:20px 0 8px">Payment</h3>
        <div class="form-grid">
          <div class="field"><label for="payment_method">Payment method *</label>
            <select id="payment_method" name="payment_method">
              <option value="CASH">Cash</option>
              <option value="MOBILE_MONEY">Mobile money (M-Pesa / EcoCash)</option>
              <option value="CREDIT">Credit – pay later</option>
            </select></div>
          <div class="field pay-field"><label for="amount">Amount paid now (M) *</label>
            <input id="amount" name="amount" type="number" min="0.01" step="0.01">
            <div class="hint" id="payHint"></div></div>
          <div class="field pay-field full ref-field hidden"><label for="reference_no">Mobile money reference</label>
            <input id="reference_no" name="reference_no" maxlength="50" placeholder="e.g. MPESA-7781203"></div>
        </div>`,
      onOpen(form) {
        const amount = form.querySelector('#amount');
        let amountTouched = false;
        amount.addEventListener('input', () => { amountTouched = true; updatePayHint(); });

        function updatePayHint() {
          const paid = Number(amount.value || 0);
          const owing = Math.max(0, lineTotal(1, saleTotal) - paid);
          const status = form.payment_method.value === 'CREDIT' || paid <= 0 ? 'UNPAID' : (owing <= 0 ? 'PAID' : 'PARTIALLY_PAID');
          form.querySelector('#payHint').innerHTML = `Status will be ${badge(status)}${owing > 0 ? ` · ${money(owing)} on credit` : ''}`;
        }

        function syncMethod() {
          const m = form.payment_method.value;
          form.querySelectorAll('.pay-field').forEach((el) => el.classList.toggle('hidden', m === 'CREDIT'));
          form.querySelector('.ref-field').classList.toggle('hidden', m !== 'MOBILE_MONEY');
          updatePayHint();
        }
        form.payment_method.addEventListener('change', syncMethod);

        items = App.lineItems.mount(form.querySelector('#saleItems'), {
          mode: 'sale',
          fruits,
          stock,
          onChange: (total, shortage) => {
            saleTotal = total;
            form.querySelector('#saleTotal').textContent = money(total);
            form.querySelector('#shortWarning').classList.toggle('hidden', !shortage);
            if (!amountTouched) amount.value = total ? total.toFixed(2) : '';
            updatePayHint();
          },
        });
        syncMethod();
      },
      async onSubmit(form) {
        const method = form.payment_method.value;
        const body = {
          vendor_id: Number(form.vendor_id.value) || undefined,
          sale_date: form.sale_date.value || undefined,
          items: items.getItems(),
          payment: method === 'CREDIT'
            ? { payment_method: 'CREDIT' }
            : {
              payment_method: method,
              amount: Number(form.amount.value),
              reference_no: form.reference_no.value.trim() || undefined,
            },
        };
        const res = await App.api.post('/sales', body);
        App.toast(res.message);
        load();
      },
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const vendors = (await App.api.get('/vendors')).data;
      $('#vendorFilter').innerHTML = `<option value="">All vendors</option>${options(vendors, 'vendor_id', (v) => v.vendor_name)}`;
    } catch (err) { /* shown by table */ }
    const status = App.utils.param('status');
    if (status) $('#statusFilter').value = status;
    ['#vendorFilter', '#statusFilter', '#start', '#end'].forEach((s) => $(s).addEventListener('change', load));
    $('#btnAdd').addEventListener('click', () => openCreate());
    $('#table').addEventListener('click', (e) => {
      const b = e.target.closest('[data-view]');
      if (b) view(Number(b.dataset.view));
    });
    load();
    if (App.utils.param('new') === '1') openCreate(App.utils.param('vendor_id'));
  });
})();
