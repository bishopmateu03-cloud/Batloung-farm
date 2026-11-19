/** Purchase management: record multi-item purchases from suppliers, view history. */
(function () {
  const { $, escapeHtml, money, int, date, badge, today, options, formToObject } = App.utils;
  let suppliers = [];

  async function load() {
    App.table.loading($('#table'));
    try {
      const res = await App.api.get(`/purchases${App.api.query({
        supplier_id: $('#supplierFilter').value, start: $('#start').value, end: $('#end').value,
      })}`);
      const total = res.data.reduce((s, p) => s + Math.round(p.total_amount * 100), 0) / 100;
      $('#count').textContent = `${res.count} purchase(s) · ${money(total)}`;
      App.table.render($('#table'), {
        rows: res.data,
        empty: 'No purchases found',
        columns: [
          { label: 'Purchase', render: (r) => `<strong>#${r.purchase_id}</strong>` },
          { label: 'Date', render: (r) => date(r.purchase_date) },
          { label: 'Supplier', render: (r) => `${escapeHtml(r.business_name)}<div class="small muted">${escapeHtml(r.province)}</div>` },
          { label: 'Lines', num: true, key: 'number_of_items' },
          { label: 'Boxes', num: true, render: (r) => int(r.total_boxes) },
          { label: 'Total', num: true, render: (r) => `<strong>${money(r.total_amount)}</strong>` },
          { label: '', render: (r) => `<div class="actions"><button class="btn btn-outline btn-sm" data-view="${r.purchase_id}">View</button></div>` },
        ],
      });
    } catch (err) {
      App.table.error($('#table'), err);
    }
  }

  async function view(id) {
    try {
      const { data: p } = await App.api.get(`/purchases/${id}`);
      App.modal.info({
        title: `Purchase #${p.purchase_id}`,
        wide: true,
        body: `
          <dl class="detail-list">
            <dt>Supplier</dt><dd>${escapeHtml(p.business_name)} (${escapeHtml(p.province)})</dd>
            <dt>Contact</dt><dd>${escapeHtml(p.contact_person)}</dd>
            <dt>Date</dt><dd>${date(p.purchase_date)}</dd>
          </dl>
          <div class="table-wrap"><table class="data">
            <thead><tr><th>Fruit</th><th>Packaging</th><th class="num">Boxes</th><th class="num">Unit cost</th><th class="num">Line total</th></tr></thead>
            <tbody>${p.items.map((i) => `<tr><td>${escapeHtml(i.fruit_name)}</td><td>${badge(i.packaging_size)}</td>
              <td class="num">${int(i.quantity)}</td><td class="num">${money(i.unit_cost)}</td><td class="num">${money(i.line_total)}</td></tr>`).join('')}</tbody>
          </table></div>
          <div class="total-bar"><span>Total purchase amount</span><span class="amount">${money(p.total_amount)}</span></div>`,
      });
    } catch (err) {
      App.toastError(err);
    }
  }

  async function openCreate() {
    let fruits;
    try {
      fruits = (await App.api.get('/fruits?status=ACTIVE')).data;
      suppliers = (await App.api.get('/suppliers')).data;
    } catch (err) {
      App.toastError(err);
      return;
    }
    let items;

    App.modal.form({
      title: 'Record purchase',
      submitText: 'Save purchase & update stock',
      wide: true,
      body: `
        <div class="form-grid">
          <div class="field"><label for="supplier_id">Supplier *</label>
            <select id="supplier_id" name="supplier_id">
              <option value="">Select supplier…</option>
              ${options(suppliers, 'supplier_id', (s) => `${s.business_name} (${s.province})`)}
              <option value="__new">+ New supplier…</option>
            </select></div>
          <div class="field"><label for="purchase_date">Purchase date *</label>
            <input id="purchase_date" name="purchase_date" type="date" required value="${today()}" max="${today()}"></div>
        </div>
        <fieldset id="newSupplier" class="hidden" style="border:1px dashed var(--border);border-radius:8px;padding:12px 14px;margin:14px 0 0">
          <legend class="small muted" style="padding:0 6px">New supplier – registered together with this purchase</legend>
          <div class="form-grid">
            <div class="field"><label for="ns_business_name">Business name *</label><input id="ns_business_name" name="business_name"></div>
            <div class="field"><label for="ns_contact_person">Contact person *</label><input id="ns_contact_person" name="contact_person"></div>
            <div class="field"><label for="ns_phone">Phone *</label><input id="ns_phone" name="phone" type="tel" placeholder="+27…"></div>
            <div class="field"><label for="ns_province">Province *</label><select id="ns_province" name="province"><option value="">Select…</option>${options(App.config.PROVINCES)}</select></div>
            <div class="field full"><label for="ns_address">Address *</label><input id="ns_address" name="address"></div>
          </div>
        </fieldset>
        <h3 style="margin:18px 0 4px">Fruits received</h3>
        <div id="purchaseItems"></div>
        <div class="total-bar"><span>Total (calculated automatically)</span><span class="amount" id="purchaseTotal">${money(0)}</span></div>`,
      onOpen(form) {
        items = App.lineItems.mount(form.querySelector('#purchaseItems'), {
          mode: 'purchase',
          fruits,
          onChange: (total) => { form.querySelector('#purchaseTotal').textContent = money(total); },
        });
        form.supplier_id.addEventListener('change', () => {
          form.querySelector('#newSupplier').classList.toggle('hidden', form.supplier_id.value !== '__new');
        });
      },
      async onSubmit(form) {
        const v = formToObject(form);
        const body = { purchase_date: v.purchase_date, items: items.getItems() };
        if (v.supplier_id === '__new') {
          body.supplier = {
            business_name: v.business_name, contact_person: v.contact_person,
            phone: v.phone, province: v.province, address: v.address,
          };
        } else if (v.supplier_id) {
          body.supplier_id = Number(v.supplier_id);
        }
        const res = await App.api.post('/purchases', body);
        App.toast(res.message);
        load();
      },
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      suppliers = (await App.api.get('/suppliers')).data;
      $('#supplierFilter').innerHTML = `<option value="">All suppliers</option>${options(suppliers, 'supplier_id', (s) => s.business_name)}`;
    } catch (err) { /* table load will show the error */ }
    ['#supplierFilter', '#start', '#end'].forEach((s) => $(s).addEventListener('change', load));
    $('#btnAdd').addEventListener('click', openCreate);
    $('#table').addEventListener('click', (e) => {
      const b = e.target.closest('[data-view]');
      if (b) view(Number(b.dataset.view));
    });
    load();
    if (App.utils.param('new') === '1') openCreate();
  });
})();
