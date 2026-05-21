'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ErrorState — GymX Design System
 * Shown when API calls fail. Includes retry button.
 * Designed for Ethiopian users on spotty connections.
 */
export default function ErrorState({ title, message, onRetry, retrying = false }) {
  return (
    <div style={{
      textAlign: 'center', padding: '48px 24px',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 'var(--radius-lg)',
        background: 'var(--warning-bg)', display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
      }}>
        <AlertTriangle size={28} style={{ color: 'var(--warning)' }} />
      </div>
      <h3 style={{
        fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)',
        color: 'var(--text-primary)', marginBottom: 4,
      }}>
        {title || 'Something went wrong'}
      </h3>
      <p style={{
        fontSize: 'var(--text-sm)', color: 'var(--text-muted)',
        maxWidth: 320, margin: '0 auto', lineHeight: 1.5, marginBottom: 20,
      }}>
        {message || 'Please check your internet connection and try again.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={retrying}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 20px', borderRadius: 'var(--radius-md)',
            background: 'var(--accent-primary)', color: '#fff',
            border: 'none', cursor: retrying ? 'not-allowed' : 'pointer',
            fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)',
            fontFamily: 'var(--font-sans)', opacity: retrying ? 0.7 : 1,
            transition: 'var(--transition-fast)',
          }}
        >
          <RefreshCw size={14} style={{ animation: retrying ? 'spin 600ms linear infinite' : 'none' }} />
          {retrying ? 'Retrying...' : 'Try Again'}
        </button>
      )}
    </div>
  );
}
