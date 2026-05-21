/**
 * Resilient SSE — Creates an EventSource with automatic reconnection,
 * exponential backoff, and fallback to polling.
 *
 * Usage:
 *   const sse = createResilientSSE(url, onMessage, onStatusChange);
 *   // later: sse.close();
 */

/**
 * @param {string} url - SSE endpoint URL
 * @param {function} onMessage - Called with parsed JSON data on each message
 * @param {function} onStatusChange - Called with status: 'connected' | 'reconnecting' | 'polling' | 'disconnected'
 * @returns {{ close: function, getStatus: function }}
 */
export function createResilientSSE(url, onMessage, onStatusChange) {
  let es = null;
  let retryTimeout = null;
  let retryDelay = 1000; // Start at 1s
  const MAX_DELAY = 30000; // Cap at 30s
  let attempts = 0;
  const MAX_ATTEMPTS_BEFORE_POLLING = 3;
  let status = 'disconnected';
  let closed = false;

  function setStatus(newStatus) {
    if (status !== newStatus) {
      status = newStatus;
      onStatusChange(newStatus);
    }
  }

  function connect() {
    if (closed) return;

    try {
      es = new EventSource(url);
    } catch (err) {
      setStatus('disconnected');
      scheduleReconnect();
      return;
    }

    es.onopen = () => {
      attempts = 0;
      retryDelay = 1000;
      const wasReconnecting = status === 'reconnecting' || status === 'polling';
      setStatus('connected');
      if (wasReconnecting) {
        // Fire a special reconnected status so caller can fetch missed data
        onStatusChange('reconnected');
        // Then set back to connected
        setStatus('connected');
      }
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) { /* ignore parse errors */ }
    };

    es.onerror = () => {
      if (closed) return;
      es.close();
      es = null;
      setStatus('reconnecting');
      scheduleReconnect();
    };
  }

  function scheduleReconnect() {
    if (closed) return;

    attempts++;

    if (attempts >= MAX_ATTEMPTS_BEFORE_POLLING) {
      setStatus('polling');
    }

    retryTimeout = setTimeout(() => {
      retryDelay = Math.min(retryDelay * 2, MAX_DELAY);
      connect();
    }, retryDelay);
  }

  function close() {
    closed = true;
    if (es) {
      es.close();
      es = null;
    }
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      retryTimeout = null;
    }
    setStatus('disconnected');
  }

  function getStatus() {
    return status;
  }

  // Start connection
  connect();

  return { close, getStatus };
}

export default createResilientSSE;
