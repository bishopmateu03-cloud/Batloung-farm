/** Fruit management: register (with a price per packaging size), edit, activate/deactivate, delete. */
(function () {
  const { $, escapeHtml, int, badge, formToObject } = App.utils;
  let fruits = [];

  function render() {
    App.table.render($('#table'), {
      rows: fruits,
      empty: 'No fruits found',
      columns: [
        { label: 'ID', render: (r) => `#${r.fruit_id}` },
        { label: 'Fruit', render: (r) => `<strong>${escapeHtml(r.fruit_name)}</strong><div class="small muted">${escapeHtml(r.description || '')}</div>` },
        { label: 'Status', render: (r) => badge(r.status) },
        { label: 'Small', num: true, render: (r) => int(r.small_boxes) },
        { label: 'Medium', num: true, render: (r) => int(r.medium_boxes) },
        { label: 'Large', num: true, render: (r) => int(r.large_boxes) },
        { label: 'Total boxes', num: true, render: (r) => `<strong>${int(r.total_boxes_in_stock)}</strong>` },
        {
          label: '',
          render: (r) => `<div class="actions">
            <button class="btn btn-outline btn-sm" data-edit="${r.fruit_id}">Edit</button>
            <button class="btn btn-outline btn-sm" data-toggle="${r.fruit_id}">${r.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button>
            <button class="btn btn-danger btn-sm" data-delete="${r.fruit_id}">Delete</button></div>`,
        },
      ],
    });
  }

  async function load() {
    App.table.loading($('#table'));
    try {
      const res = await App.api.get(`/fruits${App.api.query({ status: $('#statusFilter').value })}`);
      fruits = res.data;
      $('#count').textContent = `${res.count} fruit type(s)`;
      render();
    } catch (err) {
      App.table.error($('#table'), err);
    }
  }

  function openCreate() {
    App.modal.form({
      title: 'Register new fruit',
      submitText: 'Register fruit',
      body: `
        <div class="form-grid">
          <div class="field"><label for="fruit_name">Fruit name *</label>
            <input id="fruit_name" name="fruit_name" required maxlength="50" placeholder="e.g. Pears"></div>
          <div class="field"><label for="reorder_level">Reorder level (boxes)</label>
            <input id="reorder_level" name="reorder_level" type="number" min="0" step="1" value="10"></div>
          <div class="field full"><label for="description">Description</label>
            <input id="description" name="description" maxlength="255" placeholder="Variety, origin, notes"></div>
          <div class="field full"><label>Selling price per box (Maloti) *</label>
            <div class="form-grid" style="grid-template-columns:repeat(3,1fr)">
              <div class="field"><label for="p_small" class="small muted">Small</label><input id="p_small" name="SMALL" type="number" min="0.01" step="0.01" required></div>
              <div class="field"><label for="p_medium" class="small muted">Medium</label><input id="p_medium" name="MEDIUM" type="number" min="0.01" step="0.01" required></div>
              <div class="field"><label for="p_large" class="small muted">Large</label><input id="p_large" name="LARGE" type="number" min="0.01" step="0.01" required></div>
            </div>
            <div class="hint">Each packaging size has its own price: Small &lt; Medium &lt; Large. Stock starts at 0 and grows when you record purchases.</div>
          </div>
        </div>`,
      async onSubmit(form) {
        const v = formToObject(form);
        const body = {
          fruit_name: v.fruit_name,
          description: v.description,
          reorder_level: v.reorder_level !== undefined ? Number(v.reorder_level) : undefined,
          prices: { SMALL: Number(v.SMALL), MEDIUM: Number(v.MEDIUM), LARGE: Number(v.LARGE) },
        };
        const res = await App.api.post('/fruits', body);
        App.toast(res.message);
        load();
      },
    });
  }

  function openEdit(id) {
    const f = fruits.find((x) => x.fruit_id === id);
    App.modal.form({
      title: `Edit ${f.fruit_name}`,
      body: `
        <div class="form-grid">
          <div class="field"><label for="fruit_name">Fruit name *</label>
            <input id="fruit_name" name="fruit_name" required maxlength="50" value="${escapeHtml(f.fruit_name)}"></div>
          <div class="field"><label for="status">Status</label>
            <select id="status" name="status">
              <option value="ACTIVE" ${f.status === 'ACTIVE' ? 'selected' : ''}>Active</option>
              <option value="INACTIVE" ${f.status === 'INACTIVE' ? 'selected' : ''}>Inactive</option>
            </select></div>
          <div class="field full"><label for="description">Description</label>
            <input id="description" name="description" maxlength="255" value="${escapeHtml(f.description || '')}"></div>
          <p class="full small muted" style="margin:0">To change selling prices or reorder levels, use the <a href="stock.html">Stock levels</a> page.</p>
        </div>`,
      async onSubmit(form) {
        const res = await App.api.put(`/fruits/${id}`, formToObject(form));
        App.toast(res.message);
        load();
      },
    });
  }

  async function toggle(id) {
    const f = fruits.find((x) => x.fruit_id === id);
    try {
      await App.api.put(`/fruits/${id}`, { status: f.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
      App.toast(`${f.fruit_name} is now ${f.status === 'ACTIVE' ? 'inactive' : 'active'}`);
      load();
    } catch (err) {
      App.toastError(err);
    }
  }

  async function remove(id) {
    const f = fruits.find((x) => x.fruit_id === id);
    const ok = await App.modal.confirm({
      title: 'Delete fruit',
      message: `Delete "${f.fruit_name}"? Fruits that have been bought or sold cannot be deleted; deactivate them instead.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await App.api.del(`/fruits/${id}`);
      App.toast(res.message);
      load();
    } catch (err) {
      App.toastError(err);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('#statusFilter').addEventListener('change', load);
    $('#btnAdd').addEventListener('click', openCreate);
    $('#table').addEventListener('click', (e) => {
      const t = e.target.closest('button');
      if (!t) return;
      if (t.dataset.edit) openEdit(Number(t.dataset.edit));
      if (t.dataset.toggle) toggle(Number(t.dataset.toggle));
      if (t.dataset.delete) remove(Number(t.dataset.delete));
    });
    load();
  });
})();
