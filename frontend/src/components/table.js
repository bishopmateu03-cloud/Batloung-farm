/**
 * Data table renderer.
 * App.table.render(container, {
 *   columns: [{ key, label, num?, render?(row) }],
 *   rows: [...],
 *   empty: 'No records'
 * })
 * render() must return safe HTML; plain values are escaped automatically.
 */
(function () {
  const { escapeHtml } = App.utils;

  function render(container, { columns, rows, empty = 'No records found' }) {
    const head = columns.map((c) => `<th class="${c.num ? 'num' : ''}">${escapeHtml(c.label)}</th>`).join('');
    const body = rows.length
      ? rows.map((row) => `<tr>${columns.map((c) => {
        const value = c.render ? c.render(row) : escapeHtml(row[c.key] ?? '—');
        return `<td class="${c.num ? 'num' : ''}">${value}</td>`;
      }).join('')}</tr>`).join('')
      : `<tr><td class="empty" colspan="${columns.length}">${escapeHtml(empty)}</td></tr>`;

    container.innerHTML = `<div class="table-wrap"><table class="data"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function loading(container, text = 'Loading…') {
    container.innerHTML = `<div class="loading">${escapeHtml(text)}</div>`;
  }

  function error(container, err) {
    container.innerHTML = `<div class="alert alert-danger"><strong>Could not load data.</strong> ${escapeHtml(err.message)}</div>`;
  }

  App.table = { render, loading, error };
})();
