/**
 * Fallback sync polling for browsers without Background Sync API.
 * Polls every 15 seconds when online to drain any pending offline check-ins.
 */
import { syncPendingCheckins, getPendingCount } from './offlineDB';

let intervalId = null;
let onSyncUpdate = null;

/**
 * Register the fallback sync polling loop.
 * @param {string} scannerKey - Scanner API key
 * @param {string} apiBase - API base URL
 * @param {function} onUpdate - Callback with updated pending count
 */
export function registerSyncFallback(scannerKey, apiBase, onUpdate) {
  onSyncUpdate = onUpdate;

  // Don't register if Background Sync is available
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    return;
  }

  // Clear any existing interval
  if (intervalId) clearInterval(intervalId);

  intervalId = setInterval(async () => {
    if (!navigator.onLine) return;

    const count = await getPendingCount();
    if (count === 0) return;

    await syncPendingCheckins(scannerKey, apiBase);
    const remaining = await getPendingCount();
    if (onSyncUpdate) onSyncUpdate(remaining);
  }, 15000);
}

/**
 * Unregister the fallback sync polling loop.
 */
export function unregisterSyncFallback() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  onSyncUpdate = null;
}

/**
 * Manually trigger a sync attempt (for the "Sync now" button).
 * @param {string} scannerKey
 * @param {string} apiBase
 * @returns {Promise<{synced: number, failed: number, skipped: number}>}
 */
export async function manualSync(scannerKey, apiBase) {
  const result = await syncPendingCheckins(scannerKey, apiBase);
  const remaining = await getPendingCount();
  if (onSyncUpdate) onSyncUpdate(remaining);
  return result;
}
