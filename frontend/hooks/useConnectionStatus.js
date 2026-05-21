'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';

/**
 * useConnectionStatus — GymX Hook
 * Returns { isOnline, isSlowConnection }
 * isSlowConnection = true if a request takes >3 seconds
 * Pings /auth/me every 30 seconds when online.
 */
export default function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const intervalRef = useRef(null);

  const ping = useCallback(async () => {
    if (!navigator.onLine) { setIsOnline(false); return; }
    const start = Date.now();
    try {
      await api.get('/auth/me');
      const elapsed = Date.now() - start;
      setIsOnline(true);
      setIsSlowConnection(elapsed > 3000);
    } catch {
      // If request fails but navigator says online, mark as slow
      setIsSlowConnection(true);
    }
  }, []);

  useEffect(() => {
    const goOnline = () => { setIsOnline(true); ping(); };
    const goOffline = () => { setIsOnline(false); setIsSlowConnection(false); };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Periodic ping every 30s
    intervalRef.current = setInterval(ping, 30000);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      clearInterval(intervalRef.current);
    };
  }, [ping]);

  return { isOnline, isSlowConnection };
}
