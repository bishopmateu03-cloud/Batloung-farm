/**
 * Editable list of fruit line items used by the purchase and sale forms.
 *
 * const items = App.lineItems.mount(container, {
 *   mode: 'purchase' | 'sale',
 *   fruits: [{ fruit_id, fruit_name }],
 *   stock: [{ fruit_id, packaging_size, available_quantity, selling_price }],
 *   onChange(total, hasShortage)
 * });
 * items.getItems() → [{ fruit_id, packaging_size, quantity, unit_cost? }]
 *
 * In sale mode the unit price is read-only (it comes from stock per packaging size)
 * and each row shows how many boxes are available. The server re-checks everything.
 */
(function () {
  const { escapeHtml, money, int, lineTotal } = App.utils;

  function mount(container, { mode, fruits, stock = [], onChange = () => {} }) {
    const isSale = mode === 'sale';
    const stockMap = new Map(stock.map((s) => [`${s.fruit_id}|${s.packaging_size}`, s]));

    container.innerHTML = `
      <table class="items-table">
        <thead><tr>
          <th style="width:30%">Fruit</th><th style="width:18%">Packaging</th>
          <th style="width:14%">Boxes</th><th style="width:17%">${isSale ? 'Price / box' : 'Unit cost (M)'}</th>
          <th style="width:16%" class="right">Line total</th><th></th>
        </tr></thead>
        <tbody></tbody>
      </table>
      <button type="button" class="btn btn-outline btn-sm add-row" style="margin-top:8px">+ Add fruit</button>`;

    const tbody = container.querySelector('tbody');
    const fruitOptions = `<option value="">Select fruit…</option>${fruits.map((f) => `<option value="${f.fruit_id}">${escapeHtml(f.fruit_name)}</option>`).join('')}`;
    const sizeOptions = App.config.PACKAGING_SIZES.map((s) => `<option value="${s}">${s[0]}${s.slice(1).toLowerCase()}</option>`).join('');

    function rowInfo(tr) {
      const fruitId = tr.querySelector('.f-fruit').value;
      const size = tr.querySelector('.f-size').value;
      const qty = Number(tr.querySelector('.f-qty').value || 0);
      const s = stockMap.get(`${fruitId}|${size}`);
      const price = isSale ? (s ? Number(s.selling_price) : 0) : Number(tr.querySelector('.f-cost').value || 0);
      return { fruitId, size, qty, price, stockRow: s };
    }

    function recalc() {
      let totalCents = 0;
      let shortage = false;
      // Sum quantities per fruit+size across rows (duplicate lines share the same stock)
      const requested = new Map();
      tbody.querySelectorAll('tr').forEach((tr) => {
        const { fruitId, size, qty } = rowInfo(tr);
        if (fruitId) requested.set(`${fruitId}|${size}`, (requested.get(`${fruitId}|${size}`) || 0) + qty);
      });

      tbody.querySelectorAll('tr').forEach((tr) => {
        const { fruitId, size, qty, price, stockRow } = rowInfo(tr);
        const total = lineTotal(qty, price);
        totalCents += Math.round(total * 100);
        tr.querySelector('.line-total').textContent = money(total);

        if (isSale) {
          tr.querySelector('.f-price').textContent = fruitId ? money(price) : '—';
          const hint = tr.querySelector('.stock-hint');
          if (!fruitId) { hint.textContent = ''; hint.classList.remove('short'); return; }
          const available = stockRow ? stockRow.available_quantity : 0;
          const want = requested.get(`${fruitId}|${size}`) || 0;
          const short = want > available;
          shortage = shortage || short;
          hint.textContent = short ? `Only ${int(available)} available` : `${int(available)} available`;
          hint.classList.toggle('short', short);
        }
      });
      onChange(totalCents / 100, shortage);
    }

    function addRow(preset = {}) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><select class="f-fruit" required aria-label="Fruit">${fruitOptions}</select></td>
        <td><select class="f-size" aria-label="Packaging size">${sizeOptions}</select></td>
        <td><input class="f-qty" type="number" min="1" step="1" value="${preset.quantity || 1}" required aria-label="Boxes">
            ${isSale ? '<div class="stock-hint"></div>' : ''}</td>
        <td>${isSale ? '<div class="f-price" style="padding-top:9px">—</div>'
    : '<input class="f-cost" type="number" min="0.01" step="0.01" required aria-label="Unit cost" placeholder="0.00">'}</td>
        <td class="line-total right">${money(0)}</td>
        <td><button type="button" class="remove-row" title="Remove line" aria-label="Remove line">&times;</button></td>`;
      if (preset.fruit_id) tr.querySelector('.f-fruit').value = preset.fruit_id;
      if (preset.packaging_size) tr.querySelector('.f-size').value = preset.packaging_size;
      tbody.appendChild(tr);
      recalc();
    }

    container.addEventListener('input', recalc);
    container.addEventListener('change', recalc);
    container.addEventListener('click', (e) => {
      if (e.target.closest('.add-row')) addRow();
      if (e.target.closest('.remove-row')) {
        if (tbody.children.length > 1) e.target.closest('tr').remove();
        recalc();
      }
    });

    addRow();

    return {
      addRow,
      getItems() {
        return Array.from(tbody.querySelectorAll('tr')).map((tr) => {
          const { fruitId, size, qty } = rowInfo(tr);
          const item = { fruit_id: Number(fruitId), packaging_size: size, quantity: qty };
          if (!isSale) item.unit_cost = Number(tr.querySelector('.f-cost').value);
          return item;
        });
      },
    };
  }

  App.lineItems = { mount };
})();
