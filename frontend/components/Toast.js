'use client';
import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
  };

  const dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const icons = { success: CheckCircle, error: AlertTriangle, info: Info };
  const colors = {
    success: { bg: 'rgba(34, 197, 94, 0.15)', border: 'var(--success)', color: 'var(--success)' },
    error: { bg: 'rgba(239, 68, 68, 0.15)', border: 'var(--danger)', color: 'var(--danger)' },
    info: { bg: 'rgba(59, 130, 246, 0.15)', border: 'var(--accent-primary)', color: 'var(--accent-primary)' },
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Container */}
      <div style={{
        position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
        pointerEvents: 'none', maxWidth: '380px', width: '100%',
      }}>
        {toasts.map(t => {
          const Icon = icons[t.type];
          const c = colors[t.type];
          return (
            <div key={t.id} style={{
              pointerEvents: 'auto',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.875rem 1rem',
              background: 'var(--bg-card)',
              border: `1px solid ${c.border}`,
              borderLeft: `4px solid ${c.border}`,
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              animation: 'slideInRight 300ms ease',
              backdropFilter: 'blur(12px)',
            }}>
              <Icon size={18} style={{ color: c.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{t.message}</span>
              <button onClick={() => dismiss(t.id)} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                color: 'var(--text-muted)', flexShrink: 0,
              }}><X size={14} /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
