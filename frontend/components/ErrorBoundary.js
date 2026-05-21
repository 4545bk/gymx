'use client';

import React from 'react';

/**
 * ErrorBoundary — Catches render errors in any child component.
 * Shows a friendly fallback UI instead of a blank screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg-primary, #0B0F0E)',
          color: 'var(--text-primary, #E8F5EE)',
          fontFamily: 'var(--font-sans, system-ui, sans-serif)',
          padding: 32,
        }}>
          {/* Logo */}
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, #1A5C3A, #22c55e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 700, color: '#fff',
            marginBottom: 24, boxShadow: '0 8px 32px rgba(34,197,94,0.2)',
          }}>
            GX
          </div>

          <h1 style={{
            fontSize: 22, fontWeight: 600, marginBottom: 8,
            letterSpacing: '-0.02em',
          }}>
            Something went wrong
          </h1>

          <p style={{
            fontSize: 14, color: 'var(--text-muted, rgba(255,255,255,0.4))',
            marginBottom: 24, maxWidth: 400, textAlign: 'center',
            lineHeight: 1.6,
          }}>
            An unexpected error occurred. Please reload the page to continue.
          </p>

          <button
            onClick={this.handleReload}
            style={{
              padding: '10px 24px', borderRadius: 10,
              background: 'linear-gradient(135deg, #1A5C3A, #22c55e)',
              color: '#fff', border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 600,
              boxShadow: '0 4px 16px rgba(34,197,94,0.25)',
              transition: 'transform 150ms ease, box-shadow 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 6px 20px rgba(34,197,94,0.35)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 16px rgba(34,197,94,0.25)';
            }}
          >
            Reload page
          </button>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre style={{
              marginTop: 24, padding: 16, borderRadius: 8,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.15)',
              color: '#EF4444', fontSize: 11, maxWidth: '90vw',
              overflow: 'auto', whiteSpace: 'pre-wrap',
            }}>
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
