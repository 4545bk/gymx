'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, CheckCircle, XCircle, Zap, Shield, ScanLine, FlipHorizontal } from 'lucide-react';

const DENIAL_MAP = {
  'invalid-format': { label: 'Invalid QR', icon: '🚫' },
  'unknown-id': { label: 'Unknown Member', icon: '❓' },
  'expired': { label: 'Expired', icon: '⏰' },
  'suspended': { label: 'Suspended', icon: '🔒' },
  'frozen': { label: 'Frozen', icon: '❄️' },
  'wrong-day': { label: 'Not Today', icon: '📅' },
  'duplicate': { label: 'Already In', icon: '🔄' },
  'error': { label: 'Error', icon: '⚠️' },
};

export default function MobileScannerPage() {
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState('');
  const [manualId, setManualId] = useState('');
  const [stats, setStats] = useState({ granted: 0, denied: 0 });
  const [libLoaded, setLibLoaded] = useState(false);
  const [loadingLib, setLoadingLib] = useState(true);
  const [cameraFacing, setCameraFacing] = useState('environment');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanLoopRef = useRef(null);
  const cooldownRef = useRef(false);
  const timeoutRef = useRef(null);
  const jsQRRef = useRef(null);
  const nativeDetectorRef = useRef(null);
  const nativeFailCountRef = useRef(0);
  const useNativeRef = useRef(false);

  // ─── API URL: auto-detect for both local dev and production ──
  const API_BASE = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL
      || (window.location.hostname === 'localhost' || window.location.hostname.match(/^192\.168/) || window.location.hostname.match(/^10\./)
        ? `http://${window.location.hostname}:5000/api/v1`
        : '/api/v1'))
    : '/api/v1';
  const SCANNER_KEY = 'gymx-scanner-api-key-dev-only-change-in-prod';

  // Load jsQR library from CDN — ALWAYS load as primary/fallback scanner engine
  useEffect(() => {
    const cdnUrls = [
      'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js',
      'https://unpkg.com/jsqr@1.4.0/dist/jsQR.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js',
    ];

    // Check if BarcodeDetector is available (but don't rely on it solely)
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        nativeDetectorRef.current = new BarcodeDetector({ formats: ['qr_code'] });
        useNativeRef.current = true;
        console.log('[Scanner] BarcodeDetector available — will verify it works');
      } catch (e) {
        console.log('[Scanner] BarcodeDetector constructor failed, using jsQR only');
      }
    }

    let loaded = false;

    const tryLoad = (index) => {
      if (index >= cdnUrls.length || loaded) {
        if (!loaded) {
          // jsQR failed to load — if we have native detector, still allow scanning
          if (useNativeRef.current) {
            console.log('[Scanner] jsQR CDN failed but BarcodeDetector available');
            setLibLoaded(true);
            setLoadingLib(false);
          } else {
            setLoadingLib(false);
            setError('Could not load QR scanner library. Check internet and refresh.');
          }
        }
        return;
      }

      const script = document.createElement('script');
      script.src = cdnUrls[index];
      script.async = true;
      script.onload = () => {
        if (window.jsQR) {
          loaded = true;
          jsQRRef.current = window.jsQR;
          setLibLoaded(true);
          setLoadingLib(false);
          console.log('[Scanner] jsQR loaded from', cdnUrls[index]);
        } else {
          tryLoad(index + 1);
        }
      };
      script.onerror = () => tryLoad(index + 1);
      document.head.appendChild(script);
    };

    // Always try to load jsQR — it's the most reliable cross-platform scanner
    tryLoad(0);
  }, []);

  // Sound
  const playSound = useCallback((type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      gain.gain.value = 0.12;
      if (type === 'granted') {
        osc.frequency.value = 880; osc.type = 'sine';
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(); osc.stop(ctx.currentTime + 0.3);
      } else {
        osc.frequency.value = 220; osc.type = 'square';
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(); osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {}
  }, []);

  // Vibrate
  const vibrate = useCallback((type) => {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(type === 'granted' ? [100, 50, 100] : [200, 100, 200]);
      }
    } catch (e) {}
  }, []);

  // Process check-in
  const processCheckin = useCallback(async (memberId) => {
    const id = memberId.trim();
    if (!id || scanning || cooldownRef.current) return;
    setScanning(true);
    cooldownRef.current = true;

    let scanResult = null;

    try {
      const res = await fetch(`${API_BASE}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-scanner-key': SCANNER_KEY },
        body: JSON.stringify({ memberId: id }),
      });

      // Guard against non-JSON responses (Vercel 404/500 returns HTML)
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Server returned ${res.status} (not JSON)`);
      }

      const data = await res.json();

      if (data.data) {
        // Success response: { success: true, data: { result, member, ... } }
        scanResult = data.data;
      } else if (data.error) {
        // Error response: { success: false, error: { code, message } }
        scanResult = { result: 'denied', denyReason: 'error', message: data.error.message || 'Server error' };
      } else {
        scanResult = { result: 'denied', denyReason: 'error', message: 'Unexpected server response' };
      }
    } catch (err) {
      console.error('[Scanner] Check-in error:', err.message);
      scanResult = { result: 'denied', denyReason: 'error', message: 'Network error — check WiFi' };
    }

    setResult(scanResult);
    setStats(prev => ({
      granted: prev.granted + (scanResult.result === 'granted' ? 1 : 0),
      denied: prev.denied + (scanResult.result === 'denied' ? 1 : 0),
    }));
    playSound(scanResult.result);
    vibrate(scanResult.result);

    setScanning(false);
    setManualId('');
    clearTimeout(timeoutRef.current);
    const timeout = scanResult.result === 'granted' ? 3500 : 5000;
    timeoutRef.current = setTimeout(() => { setResult(null); cooldownRef.current = false; }, timeout);
  }, [API_BASE, SCANNER_KEY, scanning, playSound, vibrate]);

  // Camera
  const isCameraAvailable = () => {
    if (typeof window === 'undefined') return false;
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  };

  const startCamera = useCallback(async () => {
    setError('');
    if (!isCameraAvailable()) {
      const isHTTP = typeof window !== 'undefined' && window.location.protocol === 'http:';
      if (isHTTP && window.location.hostname !== 'localhost') {
        setError('🔒 Camera requires HTTPS! Use the deployed Vercel URL or run: npm run dev');
      } else {
        setError('Camera not available on this device/browser.');
      }
      return;
    }
    if (!libLoaded) { setError('Scanner library still loading...'); return; }

    try {
      // Use simple constraints for maximum mobile compatibility
      const constraints = {
        video: {
          facingMode: { ideal: cameraFacing },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // IMPORTANT: Set cameraActive FIRST so React renders the <video> element
      setCameraActive(true);

      // Wait for React to render the video element into the DOM
      await new Promise(r => setTimeout(r, 100));

      // Now videoRef.current exists — attach the stream
      if (videoRef.current) {
        const video = videoRef.current;
        video.setAttribute('autoplay', '');
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.muted = true;
        video.srcObject = stream;

        // Wait for video to be ready
        await new Promise((resolve) => {
          video.onloadedmetadata = () => {
            video.play().then(resolve).catch(resolve);
          };
          setTimeout(resolve, 2000); // Timeout fallback
        });
      }
      await new Promise(r => setTimeout(r, 200));

      // Reset native fail counter
      nativeFailCountRef.current = 0;

      // Unified scan loop: tries BarcodeDetector first, falls back to jsQR
      const scanFrame = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !streamRef.current) return;
        if (video.readyState !== video.HAVE_ENOUGH_DATA) {
          scanLoopRef.current = requestAnimationFrame(scanFrame);
          return;
        }

        if (cooldownRef.current) {
          scanLoopRef.current = requestAnimationFrame(scanFrame);
          return;
        }

        let detected = false;

        // Strategy 1: Try native BarcodeDetector (if available and not failed too many times)
        if (useNativeRef.current && nativeDetectorRef.current && nativeFailCountRef.current < 150) {
          try {
            const barcodes = await nativeDetectorRef.current.detect(video);
            if (barcodes.length > 0 && barcodes[0].rawValue) {
              detected = true;
              nativeFailCountRef.current = 0; // Reset on success
              processCheckin(barcodes[0].rawValue);
            } else {
              nativeFailCountRef.current++;
              // After ~2.5 seconds of no detections, log fallback
              if (nativeFailCountRef.current === 150) {
                console.log('[Scanner] BarcodeDetector not detecting — falling back to jsQR');
              }
            }
          } catch (e) {
            // BarcodeDetector threw error — disable it
            useNativeRef.current = false;
            console.log('[Scanner] BarcodeDetector error, switching to jsQR:', e.message);
          }
        }

        // Strategy 2: Use jsQR (always available as fallback, primary on most devices)
        if (!detected && jsQRRef.current && canvas) {
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQRRef.current(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
          if (code && code.data) {
            processCheckin(code.data);
          }
        }

        scanLoopRef.current = requestAnimationFrame(scanFrame);
      };
      scanLoopRef.current = requestAnimationFrame(scanFrame);
    } catch (err) {
      if (err.name === 'NotAllowedError') setError('Camera permission denied. Check browser settings.');
      else if (err.name === 'NotFoundError') setError('No camera found.');
      else if (err.name === 'NotReadableError') setError('Camera in use by another app.');
      else setError(`Camera error: ${err.message}`);
    }
  }, [processCheckin, cameraFacing, libLoaded]);

  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const handleFlipAndRestart = () => {
    stopCamera();
    setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment');
    setTimeout(() => startCamera(), 300);
  };

  useEffect(() => () => stopCamera(), [stopCamera]);

  const getDenial = (r) => DENIAL_MAP[r] || { label: 'Denied', icon: '❌' };

  const [clientInfo, setClientInfo] = useState({ isHTTPS: false, isLocalhost: true, canUseCamera: false });
  useEffect(() => {
    setClientInfo({
      isHTTPS: window.location.protocol === 'https:',
      isLocalhost: window.location.hostname === 'localhost',
      canUseCamera: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    });
  }, []);
  const { isHTTPS, isLocalhost, canUseCamera } = clientInfo;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: 'var(--bg-primary)', color: 'var(--text-primary)',
    }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Header */}
      <div style={{
        padding: '0.75rem 1rem', textAlign: 'center',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-card)',
      }}>
        <h1 style={{ fontSize: '1.25rem', margin: 0 }}>
          <span className="text-gradient">📱 GymX Scanner</span>
        </h1>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
          <span style={{ color: 'var(--success)' }}>✓ {stats.granted}</span>
          <span style={{ color: 'var(--danger)' }}>✗ {stats.denied}</span>
          {isHTTPS && <span style={{ color: 'var(--success)', fontSize: '0.65rem' }}>🔒 HTTPS</span>}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem', gap: '1rem' }}>

        {/* HTTPS Warning */}
        {!isHTTPS && !isLocalhost && (
          <div style={{
            width: '100%', maxWidth: '400px', padding: '0.75rem',
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--warning)',
          }}>
            <strong>⚠️ Camera needs HTTPS</strong><br />
            <span style={{ fontSize: '0.75rem' }}>
              Use the deployed Vercel URL for camera scanning.<br />
              <strong>Or use manual input below</strong> — type the member ID and tap Scan.
            </span>
          </div>
        )}

        {loadingLib && (
          <div style={{
            width: '100%', maxWidth: '400px', padding: '0.75rem',
            background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
            fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center',
          }}>
            <div className="spinner" style={{ margin: '0 auto 0.5rem', width: '20px', height: '20px' }}></div>
            Loading scanner...
          </div>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* FULL-SCREEN RESULT OVERLAY */}
        {/* ═══════════════════════════════════════════════════ */}
        {result && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 999,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: result.result === 'granted'
              ? 'linear-gradient(135deg, rgba(16,185,129,0.95), rgba(5,150,105,0.98))'
              : 'linear-gradient(135deg, rgba(239,68,68,0.95), rgba(185,28,28,0.98))',
            animation: 'resultFadeIn 300ms ease',
            padding: '2rem',
          }}>
            {/* Big Icon */}
            <div style={{
              fontSize: '5rem', marginBottom: '1rem',
              animation: result.result === 'granted' ? 'bounceIn 500ms ease' : 'shakeX 500ms ease',
              filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.3))',
            }}>
              {result.result === 'granted' ? '✅' : getDenial(result.denyReason).icon}
            </div>

            {/* Member Name */}
            <div style={{
              fontSize: '2rem', fontWeight: 900, color: 'white',
              textAlign: 'center', marginBottom: '0.5rem',
              textShadow: '0 2px 8px rgba(0,0,0,0.3)',
              animation: 'slideUp 400ms ease',
            }}>
              {result.member?.fullName || 'Unknown'}
            </div>

            {/* Result Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1.5rem', borderRadius: '9999px',
              fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: '0.1em',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '2px solid rgba(255,255,255,0.4)',
              animation: 'pulseGlow 1.5s ease infinite',
            }}>
              {result.result === 'granted' ? '✓ ACCESS GRANTED' : getDenial(result.denyReason).label}
            </div>

            {/* Plan info (granted only) */}
            {result.result === 'granted' && result.member?.planType && (
              <div style={{
                marginTop: '1rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)',
                textTransform: 'capitalize', animation: 'slideUp 500ms ease',
              }}>
                Plan: <strong style={{ color: 'white' }}>{result.member.planType}</strong>
              </div>
            )}

            {/* Denied message */}
            {result.result === 'denied' && result.message && (
              <div style={{
                marginTop: '1rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)',
                textAlign: 'center', maxWidth: '300px', animation: 'slideUp 500ms ease',
              }}>
                {result.message}
              </div>
            )}

            {/* Tap to dismiss */}
            <div style={{
              position: 'absolute', bottom: '2rem',
              fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)',
            }}>
              Auto-dismissing...
            </div>
          </div>
        )}

        {/* Camera */}
        {!result && canUseCamera && (
          <>
            {cameraActive ? (
              <div style={{ position: 'relative', width: '100%', maxWidth: '400px', borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '2px solid var(--accent-primary)', background: '#000', minHeight: '280px' }}>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', minHeight: '280px', display: 'block', objectFit: 'cover' }} />
                {/* Scan overlay */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div style={{ width: '200px', height: '200px', position: 'relative' }}>
                    <div style={{
                      position: 'absolute', left: '5%', right: '5%',
                      height: '3px', background: 'var(--accent-primary)',
                      boxShadow: '0 0 12px var(--accent-primary)',
                      animation: 'scanLine 2s ease-in-out infinite',
                    }} />
                    {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(corner => {
                      const isTop = corner.includes('top');
                      const isLeft = corner.includes('left');
                      return (
                        <div key={corner} style={{
                          position: 'absolute',
                          [isTop ? 'top' : 'bottom']: 0,
                          [isLeft ? 'left' : 'right']: 0,
                          width: '30px', height: '30px',
                          borderColor: 'var(--accent-primary)',
                          borderStyle: 'solid', borderWidth: 0,
                          ...(isTop ? { borderTopWidth: '4px' } : { borderBottomWidth: '4px' }),
                          ...(isLeft ? { borderLeftWidth: '4px' } : { borderRightWidth: '4px' }),
                        }} />
                      );
                    })}
                  </div>
                </div>
                {/* Controls */}
                <div style={{ position: 'absolute', bottom: '0.75rem', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                  <button onClick={handleFlipAndRestart} style={{
                    padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.6)',
                    color: 'white', border: 'none', borderRadius: 'var(--radius-md)',
                    fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem',
                  }}><FlipHorizontal size={14} /> Flip</button>
                  <button onClick={stopCamera} style={{
                    padding: '0.5rem 0.75rem', background: 'rgba(220,38,38,0.7)',
                    color: 'white', border: 'none', borderRadius: 'var(--radius-md)',
                    fontSize: '0.75rem', cursor: 'pointer',
                  }}>Stop</button>
                </div>
              </div>
            ) : (
              <button onClick={startCamera} disabled={!libLoaded} style={{
                width: '100%', maxWidth: '400px', padding: '2rem',
                background: 'var(--bg-card)', border: '2px dashed var(--border)',
                borderRadius: 'var(--radius-xl)',
                cursor: libLoaded ? 'pointer' : 'not-allowed',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
                color: 'var(--text-secondary)', opacity: libLoaded ? 1 : 0.5,
              }}>
                <div style={{
                  width: '70px', height: '70px', borderRadius: '50%',
                  background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Camera size={36} style={{ color: 'var(--accent-primary)' }} />
                </div>
                <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                  {libLoaded ? 'Tap to Start Scanner' : 'Loading Scanner...'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Point camera at member QR code
                </span>
              </button>
            )}
          </>
        )}

        {error && (
          <div style={{
            width: '100%', maxWidth: '400px', padding: '0.75rem',
            background: 'var(--warning-bg)', borderRadius: 'var(--radius-md)',
            fontSize: '0.8rem', color: 'var(--warning)', textAlign: 'center',
          }}>{error}</div>
        )}

        {/* Divider */}
        <div style={{ width: '100%', maxWidth: '400px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {canUseCamera ? 'or enter manually' : 'enter member ID'}
          </span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        {/* Manual Input */}
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            <input
              value={manualId}
              onChange={(e) => setManualId(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && processCheckin(manualId)}
              placeholder="MBR-XXXXXXXX"
              autoComplete="off"
              style={{
                flex: 1, padding: '0.875rem', background: 'var(--bg-card)',
                border: '2px solid var(--border)', borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '1.05rem',
                outline: 'none',
              }}
            />
            <button
              onClick={() => processCheckin(manualId)}
              disabled={!manualId.trim() || scanning}
              style={{
                padding: '0.875rem 1.5rem',
                background: manualId.trim() ? 'var(--accent-gradient)' : 'var(--bg-elevated)',
                color: manualId.trim() ? 'white' : 'var(--text-muted)',
                border: 'none', borderRadius: 'var(--radius-md)',
                fontWeight: 700, fontSize: '0.95rem',
                cursor: manualId.trim() ? 'pointer' : 'default',
              }}
            >{scanning ? '...' : 'Scan'}</button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes resultFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.1); }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes shakeX {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
          20%, 40%, 60%, 80% { transform: translateX(8px); }
        }
        @keyframes slideUp {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.3); }
          50% { box-shadow: 0 0 0 12px rgba(255,255,255,0); }
        }
        @keyframes scanLine {
          0% { top: 5%; opacity: 0.5; }
          50% { top: 90%; opacity: 1; }
          100% { top: 5%; opacity: 0.5; }
        }
        @keyframes resultPop {
          0% { opacity: 0; transform: scale(0.85); }
          60% { transform: scale(1.03); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
