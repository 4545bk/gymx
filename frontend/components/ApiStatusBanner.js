'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { WifiOff, X } from 'lucide-react';

/**
 * ApiStatusBanner — Pings /api/v1/health every 30s.
 * Shows a warning banner after 2 consecutive failures.
 * Auto-hides when the server is reachable again.
 */
export default function ApiStatusBanner() {
  const [serverDown, setServerDown] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const failCountRef = useRef(0);
  const intervalRef = useRef(null);

  const checkHealth = useCallback(async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${apiBase}/health`, {
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeout);

      if (res.ok) {
        failCountRef.current = 0;
        setServerDown(false);
        setDismissed(false);
      } else {
        throw new Error('Not OK');
      }
    } catch (e) {
      failCountRef.current++;
      if (failCountRef.current >= 2) {
        setServerDown(true);
      }
    }
  }, []);

  useEffect(() => {
    // Initial check after a short delay
    const initialTimeout = setTimeout(checkHealth, 3000);
    intervalRef.current = setInterval(checkHealth, 30000);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkHealth]);

  if (!serverDown || dismissed) return null;

  return (
    <div style={{
      padding: '8px 16px',
      background: 'rgba(239,68,68,0.08)',
      borderBottom: '1px solid rgba(239,68,68,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      fontSize: 'var(--text-sm, 13px)',
      fontWeight: 500,
      color: '#EF4444',
      fontFamily: 'var(--font-sans, system-ui)',
    }}>
      <WifiOff size={14} />
      Server unreachable — some features may be unavailable.
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'none', border: 'none', color: 'rgba(239,68,68,0.6)',
          cursor: 'pointer', padding: 2, marginLeft: 8,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
