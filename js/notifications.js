/**
 * notifications.js — Toast notifications.
 */
const Notify = (() => {
  let stack;
  function ensureStack() {
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
  }

  const ICONS = { success: '✓', error: '✕', info: 'ℹ' };

  function show(message, type = 'success', duration = 3000) {
    ensureStack();
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<strong>${ICONS[type] || ''}</strong><span>${Utils.escapeHtml(message)}</span>`;
    stack.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .25s ease, transform .25s ease';
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      setTimeout(() => el.remove(), 260);
    }, duration);
  }

  return {
    success: (msg, d) => show(msg, 'success', d),
    error: (msg, d) => show(msg, 'error', d),
    info: (msg, d) => show(msg, 'info', d),
  };
})();
