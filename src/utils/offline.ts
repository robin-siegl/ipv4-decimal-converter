export async function registerOffline(): Promise<boolean> {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return false;
  try {
    await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
      updateViaCache: 'none',
    });
    await navigator.serviceWorker.ready;
    return true;
  } catch {
    return false;
  }
}
