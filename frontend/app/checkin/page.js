'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle, XCircle, Wifi, WifiOff, RefreshCw, ScanLine, ArrowLeft, Volume2, VolumeX, Smartphone, CloudOff, Loader2 } from 'lucide-react';
import { offlineCheckin, syncPendingCheckins, getPendingCount, syncMembersToOffline, getLastSyncInfo, clearTodayCheckins } from '@/lib/offlineDB';
import { registerSyncFallback, unregisterSyncFallback, manualSync } from '@/lib/checkinQueue';
import { createResilientSSE } from '@/lib/resilientSSE';
import api from '@/lib/api';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { formatRelative, toEthiopian, formatWithWeekday } from '@/lib/ethiopianDate';

const DENIAL_KEYS = {
  'invalid-format': 'checkin.denialInvalid',
  'unknown-id': 'checkin.denialUnknown',
  'expired': 'checkin.denialExpired',
  'suspended': 'checkin.denialSuspended',
  'frozen': 'checkin.denialFrozen',
  'wrong-day': 'checkin.denialWrongDay',
  'duplicate': 'checkin.denialDuplicate',
  'error': 'checkin.denialError',
};

const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??';

function VirtualFeed({ items, getDenialLabel, getInitials, formatRelative, t }) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateHeight = () => {
      setContainerHeight(containerRef.current.clientHeight);
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop);
  };

  const itemHeight = 54; // height + gap
  const totalHeight = items.length * itemHeight;

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 1);
  const endIndex = Math.min(items.length - 1, Math.floor((scrollTop + containerHeight) / itemHeight) + 1);

  const visibleItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    visibleItems.push({ item: items[i], index: i });
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        flex: 1,
        overflowY: 'auto',
        position: 'relative',
        height: '100%',
      }}
    >
      <div style={{ height: totalHeight, width: '100%', position: 'relative' }}>
        {visibleItems.map(({ item, index }) => (
          <div
            key={`${item.memberId}-${item.checkedInAt}-${index}`}
            style={{
              position: 'absolute',
              top: index * itemHeight,
              left: 0,
              right: 0,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 8,
              background: index === 0 ? (item.result === 'granted' ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)') : 'rgba(255,255,255,0.02)',
              border: `1px solid ${index === 0 ? (item.result === 'granted' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)') : 'rgba(255,255,255,0.04)'}`,
              animation: index === 0 ? 'slideDown 300ms ease' : 'none',
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: item.result === 'granted' ? '#1A5C3A' : '#7f1d1d',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600, color: '#fff',
            }}>
              {getInitials(item.fullName)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#E8F5EE', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.fullName}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                {formatRelative(item.checkedInAt)}
              </div>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 9999,
              background: item.result === 'granted' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
              color: item.result === 'granted' ? '#22c55e' : '#EF4444',
              textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0,
            }}>
              {item.result === 'granted' ? 'Granted' : getDenialLabel(item.denyReason)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CheckinPage() {
  const { t } = useI18n();
  const [result, setResult] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [scanning, setScanning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [sseStatus, setSseStatus] = useState('disconnected');
  const [isOnline, setIsOnline] = useState(true);
  const [feed, setFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState(null);
  const [stats, setStats] = useState({ granted: 0, denied: 0 });
  const [resultKey, setResultKey] = useState(0);
  const [pendingSync, setPendingSync] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [offlineSyncCount, setOfflineSyncCount] = useState(0);
  const [lastFeedFetch, setLastFeedFetch] = useState(null);
  const [muted, setMuted] = useState(false);
  const [clock, setClock] = useState(null);
  const inputRef = useRef(null);
  const timeoutRef = useRef(null);
  const sseRef = useRef(null);
  const pollRef = useRef(null);
  const audioUnlocked = useRef(false);

  const API_BASE = typeof window !== 'undefined'
    ? `http://${window.location.hostname}:5000/api/v1`
    : (process.env.NEXT_PUBLIC_API_URL || '/api/v1');
  const SCANNER_KEY = 'gymx-scanner-api-key-2026-c9f5e1d7b3a8f4c0e6d2b9a5c1f7e3d8';

  // ─── Live clock ──────────────────────────────────────────
  useEffect(() => {
    setClock(new Date());
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ─── Unlock audio on first user interaction ──────────────
  useEffect(() => {
    const unlock = () => { audioUnlocked.current = true; };
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => { document.removeEventListener('click', unlock); document.removeEventListener('keydown', unlock); };
  }, []);

  // ─── Online/Offline detection ────────────────────────────
  useEffect(() => {
    const goOnline = async () => {
      setIsOnline(true);
      const count = await getPendingCount();
      if (count > 0) {
        setSyncing(true);
        await syncPendingCheckins(SCANNER_KEY, API_BASE);
        setPendingSync(await getPendingCount());
        setSyncing(false);
      }
      syncMembersToOffline(api);
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, [API_BASE, SCANNER_KEY]);

  // ─── Initial sync ────────────────────────────────────────
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const init = async () => {
      if (navigator.onLine) await syncMembersToOffline(api);
      const info = await getLastSyncInfo();
      setLastSync(info);
      setPendingSync(await getPendingCount());
      const now = new Date();
      const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;
      setTimeout(() => clearTodayCheckins(), msUntilMidnight);
    };
    init();
  }, []);

  // ─── Load today's feed ───────────────────────────────────
  const fetchToday = useCallback(async () => {
    try {
      setFeedError(null);
      const { data } = await api.get('/checkin/today?limit=50');
      const items = data.data || [];
      setFeed(items);
      const g = items.filter(i => i.result === 'granted').length;
      setStats({ granted: g, denied: items.length - g });
      setLastFeedFetch(Date.now());
    } catch (e) {
      setFeedError(e.message || 'Failed to load check-ins');
    } finally {
      setFeedLoading(false);
    }
  }, []);

  // Fetch offline sync count
  const fetchOfflineSyncCount = useCallback(async () => {
    try {
      const { data } = await api.get('/checkin/pending-count');
      setOfflineSyncCount(data?.data?.count || 0);
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => {
    if (isOnline) {
      fetchToday();
      fetchOfflineSyncCount();
    }
  }, [fetchToday, fetchOfflineSyncCount, isOnline]);

  // ─── SSE with resilient reconnect ────────────────────────
  useEffect(() => {
    if (!isOnline) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
    const url = `${API_BASE}/checkin/stream?token=${token}`;

    sseRef.current = createResilientSSE(
      url,
      (d) => {
        if (d.type === 'connected') return;
        setFeed(prev => [d, ...prev].slice(0, 50));
        setStats(prev => ({
          granted: prev.granted + (d.result === 'granted' ? 1 : 0),
          denied: prev.denied + (d.result === 'denied' ? 1 : 0),
        }));
      },
      (status) => {
        setSseStatus(status);
        setConnected(status === 'connected');
        // On reconnect, fetch missed check-ins
        if (status === 'reconnected') {
          fetchToday();
          fetchOfflineSyncCount();
        }
        // On polling fallback, start polling
        if (status === 'polling') {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = setInterval(fetchToday, 10000);
        }
        // Stop polling when connected
        if (status === 'connected' && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    );

    return () => {
      sseRef.current?.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [API_BASE, isOnline, fetchToday, fetchOfflineSyncCount]);

  // ─── Fallback sync polling (no Background Sync) ──────────
  useEffect(() => {
    registerSyncFallback(SCANNER_KEY, API_BASE, (remaining) => {
      setPendingSync(remaining);
    });
    return () => unregisterSyncFallback();
  }, [SCANNER_KEY, API_BASE]);

  // ─── Listen for SW sync-complete messages ─────────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        getPendingCount().then(setPendingSync);
        fetchToday();
        fetchOfflineSyncCount();
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [fetchToday, fetchOfflineSyncCount]);

  // Manual sync handler
  const handleManualSync = useCallback(async () => {
    setSyncing(true);
    await manualSync(SCANNER_KEY, API_BASE);
    setPendingSync(await getPendingCount());
    await fetchToday();
    await fetchOfflineSyncCount();
    setSyncing(false);
  }, [SCANNER_KEY, API_BASE, fetchToday, fetchOfflineSyncCount]);

  // ─── Auto-focus ──────────────────────────────────────────
  useEffect(() => {
    inputRef.current?.focus();
    const refocus = (e) => { if (e.target !== inputRef.current) setTimeout(() => inputRef.current?.focus(), 50); };
    document.addEventListener('click', refocus);
    return () => document.removeEventListener('click', refocus);
  }, []);
  useEffect(() => { if (!result && !scanning) inputRef.current?.focus(); }, [result, scanning]);

  // ─── Sound ───────────────────────────────────────────────
  const playSound = useCallback((type) => {
    if (muted || !audioUnlocked.current) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      if (type === 'granted') {
        osc.frequency.value = 800; osc.type = 'sine';
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start(); osc.stop(ctx.currentTime + 0.2);
      } else {
        osc.frequency.value = 400; osc.type = 'square';
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(); osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) { /* no audio */ }
  }, [muted]);

  // ─── Scan handler (online + offline) ─────────────────────
  const handleScan = useCallback(async (memberId) => {
    const id = memberId.trim();
    if (!id || scanning) return;
    setScanning(true); setResult(null);
    try {
      let scanResult;
      if (isOnline) {
        try {
          const res = await fetch(`${API_BASE}/checkin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-scanner-key': SCANNER_KEY },
            body: JSON.stringify({ memberId: id }),
          });
          const data = await res.json();
          scanResult = data.data;
        } catch (networkErr) {
          setIsOnline(false);
          scanResult = await offlineCheckin(id);
          setPendingSync(await getPendingCount());
        }
      } else {
        scanResult = await offlineCheckin(id);
        setPendingSync(await getPendingCount());
      }
      setResult(scanResult);
      setResultKey(prev => prev + 1);
      if (scanResult.offline) {
        setFeed(prev => [{
          result: scanResult.result, fullName: scanResult.member?.fullName || 'Unknown',
          memberId: id, denyReason: scanResult.denyReason, checkedInAt: new Date().toISOString(),
        }, ...prev].slice(0, 50));
      }
      setStats(prev => ({
        granted: prev.granted + (scanResult.result === 'granted' ? 1 : 0),
        denied: prev.denied + (scanResult.result === 'denied' ? 1 : 0),
      }));
      playSound(scanResult.result);
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setResult(null), 8000);
    } catch (err) {
      setResult({ result: 'denied', denyReason: 'error', message: 'System error' });
      setResultKey(prev => prev + 1);
      playSound('denied');
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setResult(null), 8000);
    }
    setInputValue(''); setScanning(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [API_BASE, SCANNER_KEY, scanning, playSound, isOnline]);

  const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); handleScan(inputValue); } };



  const getDenialLabel = (r) => t(DENIAL_KEYS[r] || 'checkin.accessDenied');
  const totalToday = stats.granted + stats.denied;

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */
  return (
    <div style={{
      minHeight: '100vh', background: '#0F1A14', color: '#E8F5EE',
      display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sans)',
    }}>

      {/* ─── Top Bar ──────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
            <ArrowLeft size={14} /> {t('checkin.backToDashboard')}
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
          <Link href="/checkin/mobile" style={{
            color: '#34D399', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
            background: 'rgba(52,211,153,0.08)', padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(52,211,153,0.15)',
            fontWeight: 500
          }}>
            <Smartphone size={13} /> {t('nav.mobileScanner')}
          </Link>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#E8F5EE', marginLeft: 8 }}>GymX</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Connection status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: !isOnline ? '#EF4444' : connected ? '#22c55e' : '#FBBF24',
              boxShadow: connected && isOnline ? '0 0 8px rgba(34,197,94,0.5)' : 'none',
            }} />
            <span style={{ color: !isOnline ? '#EF4444' : connected ? '#22c55e' : '#FBBF24' }}>
              {!isOnline ? t('checkin.offline') : connected ? t('checkin.live') : sseStatus === 'polling' ? 'Polling' : t('checkin.reconnecting')}
            </span>
          </div>
          {/* Offline sync count */}
          {offlineSyncCount > 0 && (
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 9999,
              background: 'rgba(99,102,241,0.12)', color: '#818CF8',
            }}>
              <CloudOff size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              {offlineSyncCount} synced offline
            </span>
          )}
          {/* Mute toggle */}
          <button onClick={() => setMuted(!muted)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: muted ? 'rgba(255,255,255,0.3)' : '#22c55e', padding: 4,
          }}>
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          {/* Pending sync with manual sync button */}
          {pendingSync > 0 && (
            <button
              onClick={handleManualSync}
              disabled={syncing}
              style={{
                fontSize: 11, padding: '2px 10px', borderRadius: 9999,
                background: 'rgba(251,191,36,0.15)', color: '#FBBF24',
                border: '1px solid rgba(251,191,36,0.25)', cursor: syncing ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              {syncing ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={10} />}
              ⚠ {pendingSync} queued — {syncing ? 'Syncing...' : 'Sync now'}
            </button>
          )}
        </div>
      </div>

      {/* ─── Offline Banner ───────────────────────────── */}
      {!isOnline && (
        <div style={{
          padding: '8px 24px', background: 'rgba(251,191,36,0.1)',
          borderBottom: '1px solid rgba(251,191,36,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontSize: 13, color: '#FBBF24',
        }}>
          <WifiOff size={14} /> No internet connection — check-ins are being saved locally and will sync automatically.
        </div>
      )}
      {/* ─── SSE Reconnecting Banner ───────────────────── */}
      {isOnline && !connected && sseStatus !== 'disconnected' && (
        <div style={{
          padding: '6px 24px', background: 'rgba(156,163,175,0.08)',
          borderBottom: '1px solid rgba(156,163,175,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontSize: 12, color: '#9CA3AF',
        }}>
          <RefreshCw size={12} style={{ animation: 'spin 2s linear infinite' }} />
          {sseStatus === 'polling' ? 'Live feed unavailable — polling for updates every 10s' : 'Live feed paused — reconnecting...'}
        </div>
      )}

      {/* ─── Main Content (two columns) ───────────────── */}
      <div style={{
        flex: 1, display: 'grid', gridTemplateColumns: '35% 1fr',
        gap: 0, overflow: 'hidden',
      }} className="checkin-grid">

        {/* ═══ LEFT: Status Display ═══════════════════ */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '40px 32px',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          position: 'relative',
        }}>
          {/* Hidden scan input */}
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            autoFocus autoComplete="off" spellCheck={false}
            style={{
              position: 'absolute', opacity: 0, width: 1, height: 1,
              pointerEvents: 'auto',
            }}
          />

          {scanning ? (
            /* Scanning... */
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                border: '3px solid rgba(34,197,94,0.3)',
                borderTopColor: '#22c55e',
                animation: 'spin 600ms linear infinite',
                margin: '0 auto 24px',
              }} />
              <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)' }}>{t('checkin.validating')}</div>
            </div>
          ) : result ? (
            /* ─── Result Card ─── */
            <div key={resultKey} style={{ textAlign: 'center', animation: 'resultPop 400ms cubic-bezier(0.175,0.885,0.32,1.275)' }}>
              {/* Status circle */}
              <div style={{
                width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
                background: result.result === 'granted' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                border: `3px solid ${result.result === 'granted' ? '#22c55e' : '#EF4444'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 40px ${result.result === 'granted' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
              }}>
                {result.result === 'granted'
                  ? <CheckCircle size={36} style={{ color: '#22c55e' }} />
                  : <XCircle size={36} style={{ color: '#EF4444' }} />}
              </div>

              {/* Member photo/initials */}
              {result.member?.fullName && (
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', margin: '0 auto 12px',
                  background: '#1A5C3A', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 600, color: '#fff',
                }}>
                  {getInitials(result.member.fullName)}
                </div>
              )}

              {/* Name */}
              <div style={{ fontSize: 28, fontWeight: 600, color: '#fff', marginBottom: 4, letterSpacing: '-0.02em' }}>
                {result.member?.fullName || 'Unknown'}
              </div>

              {/* Plan */}
              {result.result === 'granted' && result.member?.planType && (
                <div style={{ fontSize: 15, color: '#34D399', marginBottom: 12, textTransform: 'capitalize' }}>
                  {result.member.planType}
                </div>
              )}

              {/* Status label */}
              <div style={{
                fontSize: 20, fontWeight: 600, letterSpacing: '0.02em',
                color: result.result === 'granted' ? '#22c55e' : '#EF4444',
              }}>
                {result.result === 'granted' ? t('checkin.accessGranted') : getDenialLabel(result.denyReason)}
              </div>

              {/* Offline badge */}
              {result.offline && (
                <div style={{
                  marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '2px 10px', borderRadius: 9999,
                  background: 'rgba(251,191,36,0.1)', color: '#FBBF24', fontSize: 11,
                }}>
                  <WifiOff size={10} /> {t('checkin.offline')} — will sync
                </div>
              )}

              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 16 }}>
                {t('checkin.justNow')}
              </div>
            </div>
          ) : (
            /* ─── Idle State ─── */
            <div style={{ textAlign: 'center' }}>
              {/* Pulse ring */}
              <div style={{
                width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px',
                border: '2px solid rgba(26,92,58,0.4)',
                animation: 'idlePulse 2.5s ease-in-out infinite',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ScanLine size={32} style={{ color: 'rgba(34,197,94,0.5)' }} />
              </div>
              <div style={{ fontSize: 20, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                {t('checkin.readyToScan')}
              </div>
              {/* Live clock */}
              <div style={{ fontSize: 36, fontWeight: 600, color: 'rgba(255,255,255,0.15)', letterSpacing: '-0.02em', marginBottom: 8, fontVariantNumeric: 'tabular-nums' }}>
                {clock ? clock.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '--:--:--'}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>
                {clock ? formatWithWeekday(clock) : '...'}
              </div>
              <div style={{
                marginTop: 20, fontSize: 14, color: '#34D399',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}>
                <CheckCircle size={14} /> {totalToday} {t('checkin.checkinsToday')}
              </div>
            </div>
          )}
        </div>

        {/* ═══ RIGHT: Activity Feed ═══════════════════ */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          padding: '20px 24px', overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#E8F5EE' }}>{t('checkin.todayActivity')}</h2>
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 9999,
                background: 'rgba(34,197,94,0.1)', color: '#34D399', fontWeight: 600,
              }}>{totalToday}</span>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
              <span style={{ color: '#22c55e' }}>✓ {stats.granted}</span>
              <span style={{ color: '#EF4444' }}>✕ {stats.denied}</span>
            </div>
          </div>

          {feedLoading ? (
            /* Skeleton loader */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{
                  height: 48, borderRadius: 8,
                  background: 'rgba(255,255,255,0.03)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                  animationDelay: `${i * 100}ms`,
                }} />
              ))}
            </div>
          ) : feedError ? (
            /* Error state with retry */
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
              <XCircle size={32} style={{ marginBottom: 12, opacity: 0.4, color: '#EF4444' }} />
              <div style={{ fontSize: 14, marginBottom: 8 }}>{feedError}</div>
              <button onClick={fetchToday} style={{
                padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                background: 'rgba(34,197,94,0.1)', color: '#22c55e',
                border: '1px solid rgba(34,197,94,0.2)', cursor: 'pointer',
              }}>
                <RefreshCw size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Retry
              </button>
            </div>
          ) : feed.length > 0 ? (
            <>
              {/* Stale data indicator */}
              {lastFeedFetch && Date.now() - lastFeedFetch > 60000 && (
                <div style={{
                  padding: '4px 12px', marginBottom: 8, borderRadius: 6,
                  background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.1)',
                  fontSize: 11, color: '#FBBF24', display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  ⏳ Data may be stale — last updated {Math.round((Date.now() - lastFeedFetch) / 1000)}s ago
                  <button onClick={fetchToday} style={{
                    background: 'none', border: 'none', color: '#FBBF24',
                    cursor: 'pointer', textDecoration: 'underline', fontSize: 11,
                  }}>Refresh</button>
                </div>
              )}
              <VirtualFeed
                items={feed}
                getDenialLabel={getDenialLabel}
                getInitials={getInitials}
                formatRelative={formatRelative}
                t={t}
              />
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.2)' }}>
              <ScanLine size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
              <div style={{ fontSize: 14 }}>{t('checkin.noCheckinsYet')}</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>{t('checkin.scanToStart')}</div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Animations ───────────────────────────────── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes idlePulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @keyframes resultPop {
          0% { opacity: 0; transform: scale(0.85); }
          60% { transform: scale(1.03); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.15; }
        }
        .checkin-grid {
          grid-template-columns: 35% 1fr !important;
        }
        @media (max-width: 768px) {
          .checkin-grid {
            grid-template-columns: 1fr !important;
            grid-template-rows: auto 1fr !important;
          }
          .checkin-grid > div:first-child {
            padding: 24px 16px !important;
            border-right: none !important;
            border-bottom: 1px solid rgba(255,255,255,0.06);
            min-height: auto !important;
          }
          .checkin-grid > div:last-child {
            max-height: 300px;
            padding: 16px !important;
          }
        }
      ` }} />
    </div>
  );
}
