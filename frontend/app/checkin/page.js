'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ScanLine, CheckCircle, XCircle, Clock, Wifi, Zap, Shield, AlertTriangle, UserX } from 'lucide-react';

// ─── Denial reason → human-readable label + icon mapping ──
const DENIAL_MAP = {
  'invalid-format': { label: 'Invalid QR Code', icon: '🚫', color: 'var(--danger)' },
  'unknown-id': { label: 'Unknown Member', icon: '❓', color: 'var(--danger)' },
  'expired': { label: 'Membership Expired', icon: '⏰', color: 'var(--danger)' },
  'suspended': { label: 'Account Suspended', icon: '🔒', color: 'var(--warning)' },
  'frozen': { label: 'Account Frozen', icon: '❄️', color: 'var(--info)' },
  'wrong-day': { label: 'Not Allowed Today', icon: '📅', color: 'var(--warning)' },
  'duplicate': { label: 'Already Checked In', icon: '🔄', color: 'var(--warning)' },
  'error': { label: 'System Error', icon: '⚠️', color: 'var(--danger)' },
};

export default function CheckinPage() {
  const [result, setResult] = useState(null);         // Current scan result
  const [inputValue, setInputValue] = useState('');
  const [scanning, setScanning] = useState(false);     // Loading state during API call
  const [connected, setConnected] = useState(false);
  const [feed, setFeed] = useState([]);
  const [stats, setStats] = useState({ granted: 0, denied: 0 }); // Session stats
  const [resultKey, setResultKey] = useState(0);       // Force re-animation
  const inputRef = useRef(null);
  const timeoutRef = useRef(null);

  // Auto-detect API URL: when accessed from LAN, use the same hostname
  const API_BASE = typeof window !== 'undefined'
    ? `http://${window.location.hostname}:5000/api/v1`
    : (process.env.NEXT_PUBLIC_API_URL || '/api/v1');
  const SCANNER_KEY = 'gymx-scanner-api-key-dev-only-change-in-prod';

  // ─── Auto-focus: aggressive on mount, gentle after ──────
  useEffect(() => {
    // Immediate focus
    inputRef.current?.focus();
    // Re-focus on any click outside the input (keeps scanner locked)
    const refocus = (e) => {
      if (e.target !== inputRef.current) {
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    document.addEventListener('click', refocus);
    return () => document.removeEventListener('click', refocus);
  }, []);

  // Re-focus after result clears
  useEffect(() => {
    if (!result && !scanning) {
      inputRef.current?.focus();
    }
  }, [result, scanning]);

  // ─── SSE Live Feed ──────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const eventSource = new EventSource(`${API_BASE}/checkin/stream`);
    eventSource.onopen = () => setConnected(true);
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'connected') return;
        setFeed(prev => [data, ...prev].slice(0, 30));
      } catch (e) { /* ignore */ }
    };
    eventSource.onerror = () => setConnected(false);
    return () => eventSource.close();
  }, [API_BASE]);

  // ─── Sound Effects (Web Audio API — no file needed) ─────
  const playSound = useCallback((type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.value = 0.08;

      if (type === 'granted') {
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else {
        osc.frequency.value = 220;
        osc.type = 'square';
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) { /* no audio context — skip */ }
  }, []);

  // ─── Process Scan ───────────────────────────────────────
  const handleScan = useCallback(async (memberId) => {
    const id = memberId.trim();
    if (!id || scanning) return;

    setScanning(true);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-scanner-key': SCANNER_KEY,
        },
        body: JSON.stringify({ memberId: id }),
      });

      const data = await res.json();
      const scanResult = data.data;
      setResult(scanResult);
      setResultKey(prev => prev + 1);

      // Update session stats
      setStats(prev => ({
        granted: prev.granted + (scanResult.result === 'granted' ? 1 : 0),
        denied: prev.denied + (scanResult.result === 'denied' ? 1 : 0),
      }));

      // Play sound
      playSound(scanResult.result);

      // Clear result after 5 seconds (longer for denied — receptionist needs to read)
      clearTimeout(timeoutRef.current);
      const timeout = scanResult.result === 'granted' ? 3000 : 5000;
      timeoutRef.current = setTimeout(() => setResult(null), timeout);
    } catch (err) {
      const errorResult = {
        result: 'denied',
        denyReason: 'error',
        message: 'System error — please try again',
      };
      setResult(errorResult);
      setResultKey(prev => prev + 1);
      playSound('denied');
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setResult(null), 5000);
    }

    setInputValue('');
    setScanning(false);

    // Re-focus immediately for next scan
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [API_BASE, SCANNER_KEY, scanning, playSound]);

  // ─── Enter Key Handler ──────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScan(inputValue);
    }
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  // ─── Denial info ────────────────────────────────────────
  const getDenialInfo = (reason) => DENIAL_MAP[reason] || { label: 'Access Denied', icon: '❌', color: 'var(--danger)' };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '600px', borderRadius: '50%',
        background: result?.result === 'granted'
          ? 'radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)'
          : result?.result === 'denied'
            ? 'radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(167,139,250,0.05) 0%, transparent 70%)',
        transition: 'background 500ms ease',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>
        <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>
          <span className="text-gradient">GymX Check-In</span>
        </h1>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '1rem', fontSize: '0.8rem',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: connected ? 'var(--success)' : 'var(--text-muted)' }}>
            <Wifi size={13} />
            {connected ? 'Live' : 'Connecting...'}
          </span>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--success)' }}>
            <CheckCircle size={13} /> {stats.granted}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--danger)' }}>
            <XCircle size={13} /> {stats.denied}
          </span>
          <span style={{ color: 'var(--border)' }}>|</span>
          <a href="/checkin/mobile" target="_blank" style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            color: 'var(--accent-primary)', textDecoration: 'none', fontSize: '0.8rem',
          }}>
            📱 Mobile Scanner
          </a>
        </div>
      </div>

      {/* ─── Scan Input (visible for manual testing) ─── */}
      <div style={{
        width: '100%', maxWidth: '480px', marginBottom: '2rem',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{
          display: 'flex', gap: '0.5rem',
          background: 'var(--bg-card)',
          border: `2px solid ${scanning ? 'var(--accent-primary)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '0.375rem',
          transition: 'border-color 200ms ease',
          boxShadow: scanning ? '0 0 20px rgba(59,130,246,0.15)' : 'none',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', paddingLeft: '0.75rem',
            color: 'var(--text-muted)',
          }}>
            <ScanLine size={18} style={{ animation: scanning ? 'spin 600ms linear infinite' : 'none' }} />
          </div>
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder="Scan QR or type Member ID..."
            autoFocus
            autoComplete="off"
            spellCheck={false}
            style={{
              flex: 1,
              padding: '0.875rem 0.5rem',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '1.1rem',
              fontFamily: 'monospace',
              letterSpacing: '0.05em',
            }}
          />
          <button
            onClick={() => handleScan(inputValue)}
            disabled={!inputValue.trim() || scanning}
            style={{
              padding: '0.75rem 1.25rem',
              background: inputValue.trim() ? 'var(--accent-gradient)' : 'var(--bg-elevated)',
              color: inputValue.trim() ? 'white' : 'var(--text-muted)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: inputValue.trim() ? 'pointer' : 'default',
              fontWeight: 600,
              fontSize: '0.85rem',
              transition: 'all 150ms ease',
            }}
          >
            {scanning ? <div className="spinner" style={{ borderTopColor: 'white' }}></div> : 'Scan'}
          </button>
        </div>
        <p style={{
          textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)',
          marginTop: '0.5rem',
        }}>
          Paste member ID or scan QR code • Press Enter to submit
        </p>
      </div>

      {/* ─── Result Display ─── */}
      <div style={{ width: '100%', maxWidth: '520px', minHeight: '240px', position: 'relative', zIndex: 1 }}>
        {scanning ? (
          /* Loading state */
          <div style={{
            textAlign: 'center', padding: '3rem',
            border: '2px solid var(--accent-primary)',
            borderRadius: 'var(--radius-xl)',
            background: 'var(--info-bg)',
            animation: 'pulseIn 600ms ease',
          }}>
            <div className="spinner spinner-lg" style={{ margin: '0 auto 1rem' }}></div>
            <h2 style={{ color: 'var(--text-secondary)' }}>Validating...</h2>
          </div>
        ) : result ? (
          /* Result card */
          <div key={resultKey} style={{
            textAlign: 'center',
            padding: '2.5rem 2rem',
            borderRadius: 'var(--radius-xl)',
            border: `3px solid ${result.result === 'granted' ? 'var(--success)' : 'var(--danger)'}`,
            background: result.result === 'granted'
              ? 'rgba(34, 197, 94, 0.08)'
              : 'rgba(239, 68, 68, 0.08)',
            boxShadow: result.result === 'granted'
              ? '0 0 60px rgba(34, 197, 94, 0.15)'
              : '0 0 60px rgba(239, 68, 68, 0.15)',
            animation: 'resultPop 400ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}>
            {/* Icon */}
            <div style={{
              fontSize: '4rem', marginBottom: '0.75rem',
              animation: result.result === 'granted' ? 'bounceIn 500ms ease' : 'shakeX 500ms ease',
            }}>
              {result.result === 'granted' ? '✅' : getDenialInfo(result.denyReason).icon}
            </div>

            {/* Member name */}
            <div style={{
              fontSize: '1.75rem', fontWeight: 800,
              color: 'var(--text-primary)',
              marginBottom: '0.5rem',
              letterSpacing: '-0.02em',
            }}>
              {result.member?.fullName || 'Unknown'}
            </div>

            {/* Status label */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.375rem 1.25rem',
              borderRadius: '9999px',
              fontSize: '1rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              background: result.result === 'granted' ? 'var(--success)' : 'var(--danger)',
              color: 'white',
            }}>
              {result.result === 'granted' ? (
                <><Zap size={16} /> ACCESS GRANTED</>
              ) : (
                <><Shield size={16} /> {getDenialInfo(result.denyReason).label}</>
              )}
            </div>

            {/* Plan info / message */}
            {result.result === 'granted' && result.member?.planType && (
              <div style={{
                marginTop: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}>
                Plan: <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{result.member.planType}</span>
                {result.member?.expiringSoon && (
                  <span style={{
                    background: 'var(--warning-bg)', color: 'var(--warning)',
                    padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600,
                  }}>
                    ⚠ Expiring Soon
                  </span>
                )}
              </div>
            )}

            {result.message && (
              <div style={{
                marginTop: '0.5rem', fontSize: '0.85rem',
                color: 'var(--text-muted)',
              }}>
                {result.message}
              </div>
            )}
          </div>
        ) : (
          /* Idle / Ready state */
          <div style={{
            textAlign: 'center', padding: '3rem',
            border: '2px dashed var(--border)',
            borderRadius: 'var(--radius-xl)',
            transition: 'all 300ms ease',
          }}>
            <ScanLine size={56} style={{
              color: 'var(--accent-primary)',
              marginBottom: '1rem',
              animation: 'scanPulse 2.5s ease-in-out infinite',
            }} />
            <h2 style={{ color: 'var(--text-secondary)', marginBottom: '0.375rem', fontSize: '1.25rem' }}>
              Ready to Scan
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Present QR code or type member ID above
            </p>
          </div>
        )}
      </div>

      {/* ─── Live Feed ─── */}
      {feed.length > 0 && (
        <div style={{
          marginTop: '2rem', width: '100%', maxWidth: '520px',
          position: 'relative', zIndex: 1,
        }}>
          <h3 style={{
            fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            marginBottom: '0.5rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            <Clock size={13} /> Live Feed
          </h3>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '0.25rem',
            maxHeight: '260px', overflowY: 'auto',
          }}>
            {feed.map((entry, i) => (
              <div key={`${entry.memberId}-${i}`} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.5rem 0.75rem',
                background: i === 0 ? (entry.result === 'granted' ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)') : 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${i === 0 ? (entry.result === 'granted' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)') : 'var(--border)'}`,
                fontSize: '0.8rem',
                animation: i === 0 ? 'slideUp 300ms ease' : 'none',
                transition: 'all 300ms ease',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {entry.result === 'granted'
                    ? <CheckCircle size={14} style={{ color: 'var(--success)' }} />
                    : <XCircle size={14} style={{ color: 'var(--danger)' }} />}
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{entry.fullName}</span>
                  {entry.denyReason && (
                    <span style={{
                      fontSize: '0.65rem', padding: '0.1rem 0.375rem',
                      borderRadius: '4px', background: 'var(--danger-bg)',
                      color: 'var(--danger)', fontWeight: 600,
                    }}>
                      {getDenialInfo(entry.denyReason).label}
                    </span>
                  )}
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontFamily: 'monospace' }}>
                  {entry.checkedInAt ? formatTime(entry.checkedInAt) : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Custom Animations ─── */}
      <style>{`
        @keyframes scanPulse {
          0%, 100% { opacity: 0.6; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-4px); }
        }
        @keyframes resultPop {
          0% { opacity: 0; transform: scale(0.85); }
          60% { transform: scale(1.03); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes bounceIn {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        @keyframes shakeX {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-12px); }
          40% { transform: translateX(12px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}
