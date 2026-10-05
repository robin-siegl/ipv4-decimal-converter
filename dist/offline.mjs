async function prepareOffline() {
  try {
    await navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' });
    await navigator.serviceWorker.ready;
    const status = document.getElementById('offline-status');
    if (status) status.textContent = ' Available offline.';
  } catch {
    // Conversion still works online if registration or browser storage is unavailable.
  }
}

if ('serviceWorker' in navigator) {
  if (document.readyState === 'complete') {
    void prepareOffline();
  } else {
    window.addEventListener('load', prepareOffline, { once: true });
  }
}
