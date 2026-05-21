/**
 * Performance Monitoring Utility — Tracks slow network operations and alerts the UI.
 */

/**
 * Logs a slow API call and dispatches a warning event.
 * @param {string} url - The endpoint URL.
 * @param {number} duration - The request duration in milliseconds.
 */
export function logSlowCall(url, duration) {
  console.warn(`[Performance Warning] Slow API call to "${url}" took ${(duration / 1000).toFixed(2)}s`);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('gymx-slow-connection', {
        detail: { url, duration },
      })
    );
  }
}
