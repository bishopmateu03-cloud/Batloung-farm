/** Toast notifications: App.toast('Saved', 'success' | 'error' | 'warning'). */
(function () {
  function root() {
    let el = document.getElementById('toast-root');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast-root';
      document.body.appendChild(el);
    }
    return el;
  }

  App.toast = function toast(message, type = 'success', ms = 4000) {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.textContent = message;
    root().appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .3s';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }, ms);
  };

  /** Shows an ApiError (message + list of reasons) as an error toast. */
  App.toastError = function toastError(err) {
    const extra = err.errors && err.errors.length ? ` – ${err.errors.join('; ')}` : '';
    App.toast(`${err.message}${extra}`, 'error', 7000);
  };
})();
