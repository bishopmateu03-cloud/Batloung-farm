/** Vendor management: register, list, search by name/phone, edit, view balance. */
(function () {
  const { $, escapeHtml, date, money, badge, formToObject, today } = App.utils;
  let vendors = [];

  function formBody(v = {}) {
    return `
      <div class="form-grid">
        <div class="field full"><label for="vendor_name">Vendor name *</label>
          <input id="vendor_name" name="vendor_name" required maxlength="100" value="${escapeHtml(v.vendor_name || '')}"></div>
        <div class="field"><label for="phone_number">Phone number *</label>
          <input id="phone_number" name="phone_number" type="tel" required placeholder="+266 5812 3456" value="${escapeHtml(v.phone_number || '')}"></div>
        <div class="field"><label for="registration_date">Registration date</label>
          <input id="registration_date" name="registration_date" type="date" value="${escapeHtml(v.registration_date || today())}"></div>
        <div class="field full"><label for="location">Location *</label>
          <input id="location" name="location" required maxlength="150" placeholder="e.g. Maseru Bus Stop" value="${escapeHtml(v.location || '')}"></div>
      </div>`;
  }

  function render() {
    App.table.render($('#table'), {
      rows: vendors,
      empty: 'No vendors found',
      columns: [
        { label: 'ID', render: (r) => `#${r.vendor_id}` },
        { label: 'Vendor', render: (r) => `<strong>${escapeHtml(r.vendor_name)}</strong>` },
        { label: 'Phone', key: 'phone_number' },
        { label: 'Location', key: 'location' },
        { label: 'Registered', render: (r) => date(r.registration_date) },
        {
          label: '',
          render: (r) => `<div class="actions">
            <button class="btn btn-outline btn-sm" data-balance="${r.vendor_id}">Balance</button>
            <a class="btn btn-outline btn-sm" href="sales.html?new=1&vendor_id=${r.vendor_id}">New sale</a>
            <button class="btn btn-outline btn-sm" data-edit="${r.vendor_id}">Edit</button></div>`,
        },
      ],
    });
  }

  async function load() {
    const term = $('#search').value.trim();
    App.table.loading($('#table'));
    try {
      if (term.length >= 2) {
        try {
          const res = await App.api.get(`/vendors/search${App.api.query({ q: term })}`);
          vendors = res.data;
        } catch (err) {
          if (err.status !== 404) throw err;
          vendors = []; // no match
        }
        $('#count').textContent = `${vendors.length} match(es) for "${term}"`;
      } else {
        const res = await App.api.get('/vendors');
        vendors = res.data;
        $('#count').textContent = `${res.count} registered vendor(s)`;
      }
      App.locationMap.render($('#vendorMap'), $('#vendorMapStatus'), vendors, 'vendors');
      render();
    } catch (err) {
      App.table.error($('#table'), err);
    }
  }

  function openCreate() {
    App.modal.form({
      title: 'Register vendor',
      submitText: 'Register vendor',
      body: formBody(),
      async onSubmit(form) {
        const res = await App.api.post('/vendors', formToObject(form));
        App.toast(res.message);
        load();
      },
    });
  }

  function openEdit(id) {
    const v = vendors.find((x) => x.vendor_id === id);
    App.modal.form({
      title: `Edit ${v.vendor_name}`,
      body: formBody(v),
      async onSubmit(form) {
        const res = await App.api.put(`/vendors/${id}`, formToObject(form));
        App.toast(res.message);
        load();
      },
    });
  }

  async function showBalance(id) {
    try {
      const { data: b } = await App.api.get(`/vendors/${id}/balance`);
      const sales = b.open_sales.length
        ? `<div class="table-wrap"><table class="data"><thead><tr><th>Sale</th><th>Date</th><th>Status</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Owing</th><th></th></tr></thead><tbody>
          ${b.open_sales.map((s) => `<tr><td>#${s.sale_id}</td><td>${date(s.sale_date)}</td><td>${badge(s.payment_status)}</td>
            <td class="num">${money(s.total_amount)}</td><td class="num">${money(s.amount_paid)}</td><td class="num"><strong>${money(s.outstanding_balance)}</strong></td>
            <td><a class="btn btn-primary btn-sm" href="payments.html?sale_id=${s.sale_id}">Pay</a></td></tr>`).join('')}
          </tbody></table></div>`
        : '<p class="muted">No open sales – this vendor owes nothing.</p>';
      App.modal.info({
        title: `${b.vendor_name} – account`,
        wide: true,
        body: `
          <dl class="detail-list">
            <dt>Phone</dt><dd>${escapeHtml(b.phone_number)}</dd>
            <dt>Total billed</dt><dd>${money(b.total_billed)}</dd>
            <dt>Total paid</dt><dd>${money(b.total_paid)}</dd>
            <dt>Outstanding</dt><dd><strong style="font-size:1.2rem;color:${b.outstanding_balance > 0 ? 'var(--red-600)' : 'var(--green-700)'}">${money(b.outstanding_balance)}</strong></dd>
          </dl>
          <h3 style="margin-bottom:8px">Open sales</h3>${sales}`,
      });
    } catch (err) {
      App.toastError(err);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('#search').addEventListener('input', App.utils.debounce(load, 350));
    $('#btnAdd').addEventListener('click', openCreate);
    $('#table').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.edit) openEdit(Number(b.dataset.edit));
      if (b.dataset.balance) showBalance(Number(b.dataset.balance));
    });
    App.locationMap.render($('#vendorMap'), $('#vendorMapStatus'), [], 'vendors');
    if (App.utils.param('new') === '1') openCreate();
    load();
  });
})();
