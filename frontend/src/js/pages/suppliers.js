/** Supplier management: list, filter, register, edit, delete. */
(function () {
  const { $, escapeHtml, options, formToObject } = App.utils;
  let suppliers = [];

  function formBody(s = {}) {
    return `
      <div class="form-grid">
        <div class="field full"><label for="business_name">Business name *</label>
          <input id="business_name" name="business_name" required maxlength="120" value="${escapeHtml(s.business_name || '')}"></div>
        <div class="field"><label for="contact_person">Contact person *</label>
          <input id="contact_person" name="contact_person" required maxlength="100" value="${escapeHtml(s.contact_person || '')}"></div>
        <div class="field"><label for="phone">Phone *</label>
          <input id="phone" name="phone" type="tel" required placeholder="+27 82 123 4567" value="${escapeHtml(s.phone || '')}"></div>
        <div class="field full"><label for="province">Province *</label>
          <select id="province" name="province" required>
            <option value="">Select a province…</option>
            ${options(App.config.PROVINCES, null, null, s.province)}
          </select></div>
        <div class="field full"><label for="address">Address *</label>
          <textarea id="address" name="address" required maxlength="255">${escapeHtml(s.address || '')}</textarea></div>
      </div>`;
  }

  function render() {
    App.table.render($('#table'), {
      rows: suppliers,
      empty: 'No suppliers found',
      columns: [
        { label: 'ID', render: (r) => `#${r.supplier_id}` },
        { label: 'Business', render: (r) => `<strong>${escapeHtml(r.business_name)}</strong>` },
        { label: 'Contact', key: 'contact_person' },
        { label: 'Phone', key: 'phone' },
        { label: 'Province', render: (r) => `<span class="badge badge-green">${escapeHtml(r.province)}</span>` },
        { label: 'Address', render: (r) => `<span class="small">${escapeHtml(r.address)}</span>` },
        { label: 'Purchases', num: true, key: 'number_of_purchases' },
        {
          label: '',
          render: (r) => `<div class="actions">
            <button class="btn btn-outline btn-sm" data-edit="${r.supplier_id}">Edit</button>
            <button class="btn btn-danger btn-sm" data-delete="${r.supplier_id}">Delete</button></div>`,
        },
      ],
    });
  }

  async function load() {
    App.table.loading($('#table'));
    try {
      const res = await App.api.get(`/suppliers${App.api.query({ province: $('#provinceFilter').value })}`);
      suppliers = res.data;
      $('#count').textContent = `${res.count} supplier(s)`;
      App.locationMap.render($('#supplierMap'), $('#supplierMapStatus'), suppliers, 'suppliers');
      render();
    } catch (err) {
      App.table.error($('#table'), err);
    }
  }

  function openCreate() {
    App.modal.form({
      title: 'Register supplier',
      submitText: 'Register supplier',
      body: formBody(),
      async onSubmit(form) {
        const res = await App.api.post('/suppliers', formToObject(form));
        App.toast(res.message);
        load();
      },
    });
  }

  function openEdit(id) {
    const s = suppliers.find((x) => x.supplier_id === id);
    App.modal.form({
      title: `Edit ${s.business_name}`,
      body: formBody(s),
      async onSubmit(form) {
        const res = await App.api.put(`/suppliers/${id}`, formToObject(form));
        App.toast(res.message);
        load();
      },
    });
  }

  async function remove(id) {
    const s = suppliers.find((x) => x.supplier_id === id);
    const ok = await App.modal.confirm({
      title: 'Delete supplier',
      message: `Delete "${s.business_name}"? Suppliers with recorded purchases cannot be deleted.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await App.api.del(`/suppliers/${id}`);
      App.toast(res.message);
      load();
    } catch (err) {
      App.toastError(err);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('#provinceFilter').innerHTML = `<option value="">All provinces</option>${options(App.config.PROVINCES)}`;
    $('#provinceFilter').addEventListener('change', load);
    $('#btnAdd').addEventListener('click', openCreate);
    $('#table').addEventListener('click', (e) => {
      const edit = e.target.closest('[data-edit]');
      const del = e.target.closest('[data-delete]');
      if (edit) openEdit(Number(edit.dataset.edit));
      if (del) remove(Number(del.dataset.delete));
    });
    App.locationMap.render($('#supplierMap'), $('#supplierMapStatus'), [], 'suppliers');
    load();
  });
})();
