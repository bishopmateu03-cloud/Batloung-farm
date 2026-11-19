/** Payments & credit: vendor balances, record cash / mobile money payments, payment history. */
(function () {
  const { $, escapeHtml, money, date, badge, today } = App.utils;

  async function loadBalances() {
    App.table.loading($('#balances'));
    try {
      const res = await App.api.get(`/payments/balances${App.api.query({ outstanding: $('#owingOnly').checked ? 'true' : '' })}`);
      $('#kpiOutstanding').textContent = money(res.total_outstanding);
      $('#kpiVendors').textContent = res.data.filter((b) => b.outstanding_balance > 0).length;
      App.table.render($('#balances'), {
        rows: res.data,
        empty: 'No vendors owe money 🎉',
        columns: [
          { label: 'Vendor', render: (r) => `<strong>${escapeHtml(r.vendor_name)}</strong><div class="small muted">${escapeHtml(r.phone_number)}</div>` },
          { label: 'Sales', num: true, key: 'number_of_sales' },
          { label: 'Unpaid / partial', num: true, render: (r) => `${r.unpaid_sales} / ${r.partially_paid_sales}` },
          { label: 'Billed', num: true, render: (r) => money(r.total_billed) },
          { label: 'Paid', num: true, render: (r) => money(r.total_paid) },
          { label: 'Outstanding', num: true, render: (r) => `<strong style="color:${r.outstanding_balance > 0 ? 'var(--red-600)' : 'inherit'}">${money(r.outstanding_balance)}</strong>` },
          { label: '', render: (r) => (r.outstanding_balance > 0 ? `<div class="actions"><button class="btn btn-primary btn-sm" data-pay-vendor="${r.vendor_id}">Record payment</button></div>` : '') },
        ],
      });
    } catch (err) {
      App.table.error($('#balances'), err);
    }
  }

  async function loadHistory() {
    App.table.loading($('#history'));
    try {
      const res = await App.api.get(`/payments${App.api.query({ method: $('#methodFilter').value })}`);
      const total = res.data.reduce((s, p) => s + Math.round(p.amount * 100), 0) / 100;
      $('#kpiCollected').textContent = money(total);
      App.table.render($('#history'), {
        rows: res.data,
        empty: 'No payments recorded',
        columns: [
          { label: 'Date', render: (r) => date(r.payment_date) },
          { label: 'Vendor', key: 'vendor_name' },
          { label: 'Sale', render: (r) => `#${r.sale_id}` },
          { label: 'Method', render: (r) => badge(r.payment_method) },
          { label: 'Reference', render: (r) => `<span class="small">${escapeHtml(r.reference_no || '—')}</span>` },
          { label: 'Amount', num: true, render: (r) => `<strong>${money(r.amount)}</strong>` },
        ],
      });
    } catch (err) {
      App.table.error($('#history'), err);
    }
  }

  function reload() {
    loadBalances();
    loadHistory();
  }

  async function openPayment({ saleId, vendorId } = {}) {
    let openSales;
    try {
      const [unpaid, partial] = await Promise.all([
        App.api.get(`/sales${App.api.query({ payment_status: 'UNPAID', vendor_id: vendorId })}`),
        App.api.get(`/sales${App.api.query({ payment_status: 'PARTIALLY_PAID', vendor_id: vendorId })}`),
      ]);
      openSales = [...unpaid.data, ...partial.data].sort((a, b) => a.sale_id - b.sale_id);
    } catch (err) {
      App.toastError(err);
      return;
    }
    if (!openSales.length) {
      App.toast('There are no unpaid or partially paid sales.', 'warning');
      return;
    }

    App.modal.form({
      title: 'Record payment',
      submitText: 'Record payment',
      body: `
        <div class="form-grid">
          <div class="field full"><label for="sale_id">Sale *</label>
            <select id="sale_id" name="sale_id" required>
              <option value="">Select an open sale…</option>
              ${openSales.map((s) => `<option value="${s.sale_id}" data-owing="${s.outstanding_balance}" ${String(s.sale_id) === String(saleId) ? 'selected' : ''}>
                #${s.sale_id} · ${escapeHtml(s.vendor_name)} · ${date(s.sale_date)} · owes ${money(s.outstanding_balance)}</option>`).join('')}
            </select>
            <div class="hint" id="owingHint"></div></div>
          <div class="field"><label for="payment_method">Method *</label>
            <select id="payment_method" name="payment_method">
              <option value="CASH">Cash</option>
              <option value="MOBILE_MONEY">Mobile money</option>
            </select></div>
          <div class="field"><label for="amount">Amount (M) *</label>
            <input id="amount" name="amount" type="number" min="0.01" step="0.01" required></div>
          <div class="field"><label for="payment_date">Payment date</label>
            <input id="payment_date" name="payment_date" type="date" value="${today()}" max="${today()}"></div>
          <div class="field"><label for="reference_no">Reference</label>
            <input id="reference_no" name="reference_no" maxlength="50" placeholder="Mobile money ref."></div>
        </div>`,
      onOpen(form) {
        const sync = () => {
          const opt = form.sale_id.selectedOptions[0];
          const owing = opt && opt.dataset.owing ? Number(opt.dataset.owing) : 0;
          form.querySelector('#owingHint').textContent = owing ? `Outstanding on this sale: ${money(owing)}` : '';
          if (owing) { form.amount.value = owing.toFixed(2); form.amount.max = owing; }
        };
        form.sale_id.addEventListener('change', sync);
        sync();
      },
      async onSubmit(form) {
        const res = await App.api.post('/payments', {
          sale_id: Number(form.sale_id.value) || undefined,
          amount: form.amount.value ? Number(form.amount.value) : undefined,
          payment_method: form.payment_method.value,
          payment_date: form.payment_date.value || undefined,
          reference_no: form.reference_no.value.trim() || undefined,
        });
        App.toast(res.message);
        reload();
      },
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('#owingOnly').addEventListener('change', loadBalances);
    $('#methodFilter').addEventListener('change', loadHistory);
    $('#btnAdd').addEventListener('click', () => openPayment());
    $('#balances').addEventListener('click', (e) => {
      const b = e.target.closest('[data-pay-vendor]');
      if (b) openPayment({ vendorId: b.dataset.payVendor });
    });
    reload();
    const saleId = App.utils.param('sale_id');
    if (saleId) openPayment({ saleId });
  });
})();
