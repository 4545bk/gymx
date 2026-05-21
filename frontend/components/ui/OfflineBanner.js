'use client';

import { WifiOff, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';

/**
 * OfflineBanner — GymX Design System
 * Amber strip at top of page when user is offline.
 * Auto-hides when connection restores. Dismissible.
 */
export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    const update = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      if (online) setDismissed(false);
    };
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  if (isOnline || dismissed) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      padding: '8px 16px',
      background: 'var(--warning)', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)',
      fontFamily: 'var(--font-sans)',
      animation: 'slideDown 300ms ease',
    }}>
      <WifiOff size={14} />
      {t('common.offline')}
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
          cursor: 'pointer', padding: 2, marginLeft: 8,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
