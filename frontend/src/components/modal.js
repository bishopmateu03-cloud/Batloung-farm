/**
 * Modal dialogs.
 *  App.modal.form({ title, body, submitText, wide, onOpen(form), onSubmit(form) })
 *      – renders a <form>; if onSubmit throws an ApiError its message and
 *        reasons are shown inside the dialog and the dialog stays open.
 *  App.modal.info({ title, body, wide })
 *  App.modal.confirm({ title, message, confirmText, danger }) → Promise<boolean>
 */
(function () {
  const { escapeHtml } = App.utils;
  let current = null;

  function close() {
    if (current) {
      current.remove();
      current = null;
      document.removeEventListener('keydown', onKey);
    }
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
  }

  function mount(html) {
    close();
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = html;
    backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) close(); });
    backdrop.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
    document.body.appendChild(backdrop);
    document.addEventListener('keydown', onKey);
    current = backdrop;
    return backdrop;
  }

  function showErrors(container, err) {
    const list = err.errors && err.errors.length
      ? `<ul>${err.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul>` : '';
    container.innerHTML = `<div class="form-errors"><strong>${escapeHtml(err.message)}</strong>${list}</div>`;
    container.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function form({ title, body, submitText = 'Save', wide = false, onOpen, onSubmit }) {
    const el = mount(`
      <form class="modal ${wide ? 'wide' : ''}" novalidate>
        <div class="modal-header">
          <h2>${escapeHtml(title)}</h2>
          <button type="button" class="modal-close" data-close aria-label="Close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="modal-errors"></div>
          ${body}
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" data-close>Cancel</button>
          <button type="submit" class="btn btn-primary">${escapeHtml(submitText)}</button>
        </div>
      </form>`);
    const formEl = el.querySelector('form');
    const errorBox = el.querySelector('.modal-errors');
    const submitBtn = formEl.querySelector('button[type="submit"]');

    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorBox.innerHTML = '';
      submitBtn.disabled = true;
      const original = submitBtn.textContent;
      submitBtn.textContent = 'Saving…';
      try {
        await onSubmit(formEl);
        close();
      } catch (err) {
        if (err instanceof App.ApiError || err instanceof Error) showErrors(errorBox, err);
      } finally {
        if (submitBtn.isConnected) {
          submitBtn.disabled = false;
          submitBtn.textContent = original;
        }
      }
    });

    if (onOpen) onOpen(formEl);
    const first = formEl.querySelector('input:not([type=hidden]), select, textarea');
    if (first) first.focus();
    return formEl;
  }

  function info({ title, body, wide = false }) {
    mount(`
      <div class="modal ${wide ? 'wide' : ''}">
        <div class="modal-header">
          <h2>${escapeHtml(title)}</h2>
          <button type="button" class="modal-close" data-close aria-label="Close">&times;</button>
        </div>
        <div class="modal-body">${body}</div>
        <div class="modal-footer"><button type="button" class="btn btn-primary" data-close>Close</button></div>
      </div>`);
  }

  function confirm({ title = 'Please confirm', message, confirmText = 'Confirm', danger = false }) {
    return new Promise((resolve) => {
      const el = mount(`
        <div class="modal">
          <div class="modal-header"><h2>${escapeHtml(title)}</h2></div>
          <div class="modal-body"><p style="margin:0">${escapeHtml(message)}</p></div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" data-answer="no">Cancel</button>
            <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-answer="yes">${escapeHtml(confirmText)}</button>
          </div>
        </div>`);
      el.querySelectorAll('[data-answer]').forEach((b) => b.addEventListener('click', () => {
        const yes = b.dataset.answer === 'yes';
        close();
        resolve(yes);
      }));
    });
  }

  App.modal = { form, info, confirm, close, showErrors };
})();
