// Small, non-blocking update notice for the hosted/PWA game.
(() => {
  const current = String(window.BUILD_VER || '');
  if (!current) return;

  const style = document.createElement('style');
  style.textContent = `
    #gameUpdateToast[hidden] { display: none !important; }
    #gameUpdateToast { position: fixed; right: max(12px, env(safe-area-inset-right)); bottom: max(12px, env(safe-area-inset-bottom)); z-index: 10050; box-sizing: border-box; width: min(350px, calc(100vw - 24px)); padding: 10px 12px; color: #fff; background: #172025; border: 1px solid #e5b83c; border-left: 4px solid #e5b83c; box-shadow: 0 5px 18px #0009; font: 600 14px/1.25 system-ui, sans-serif; }
    #gameUpdateToast .updateActions { display: flex; gap: 8px; margin-top: 8px; }
    #gameUpdateToast button { min-height: 38px; padding: 6px 12px; border: 0; font: inherit; cursor: pointer; }
    #gameUpdateToast .updateNow { color: #171b1e; background: #f6c641; }
    #gameUpdateToast .updateLater { color: #fff; background: #374148; }
  `;
  document.head.append(style);
  const toast = document.createElement('aside');
  toast.id = 'gameUpdateToast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.hidden = true;
  const message = document.createElement('span');
  message.textContent = 'New update available — please update now.';
  const actions = document.createElement('div');
  actions.className = 'updateActions';
  const update = document.createElement('button');
  update.type = 'button';
  update.className = 'updateNow';
  update.textContent = 'Update now';
  const later = document.createElement('button');
  later.type = 'button';
  later.className = 'updateLater';
  later.textContent = 'Later';
  actions.append(update, later);
  toast.append(message, actions);
  document.body.append(toast);

  let available = '';
  let dismissed = '';
  let checking = false;
  function offer(version) {
    if (!version || version === current || version === dismissed) return;
    available = version;
    toast.hidden = false;
  }
  later.addEventListener('click', () => { dismissed = available; toast.hidden = true; });
  update.addEventListener('click', () => window.location.reload());

  async function check() {
    if (checking || document.hidden || navigator.onLine === false) return;
    checking = true;
    try {
      // A fresh query avoids the old worker's cache-first index and version cache.
      const response = await fetch(`./version.json?check=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      if (typeof data.version === 'string') offer(data.version);
    } catch (_) { /* Offline players can keep playing their installed build. */ }
    finally { checking = false; }
  }

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
    navigator.serviceWorker.addEventListener('controllerchange', check);
  }
  window.addEventListener('focus', check);
  window.addEventListener('online', check);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  setInterval(check, 3 * 60 * 1000);
  setTimeout(check, 1200);
})();
