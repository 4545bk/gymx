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

  // Auto-detect API URL: when accessed from phone over LAN, use the same hostname
  // Use HTTPS if the page is loaded over HTTPS
  const API_BASE = typeof window !== 'undefined'
    ? `http://${window.location.hostname}:5000/api/v1`
    : (process.env.NEXT_PUBLIC_API_URL || '/api/v1');
  const SCANNER_KEY = 'gymx-scanner-api-key-dev-only-change-in-prod';

  // Load jsQR library from CDN — try multiple CDNs for reliability
  useEffect(() => {
    const cdnUrls = [
      'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js',
      'https://unpkg.com/jsqr@1.4.0/dist/jsQR.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js',
    ];

    let loaded = false;

    const tryLoad = (index) => {
      if (index >= cdnUrls.length || loaded) {
        if (!loaded) {
          setLoadingLib(false);
          setError('Could not load QR scanner library. Check your internet connection and refresh the page.');
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
          console.log('✅ QR scanner library loaded from:', cdnUrls[index]);
        } else {
          tryLoad(index + 1);
        }
      };
      script.onerror = () => {
        console.warn('Failed CDN:', cdnUrls[index]);
        tryLoad(index + 1);
      };
      document.head.appendChild(script);
    };

    // Check if BarcodeDetector is available (Chrome Android) — use it as primary
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      console.log('✅ Using native BarcodeDetector');
      jsQRRef.current = 'native';
      setLibLoaded(true);
      setLoadingLib(false);
    } else {
      tryLoad(0);
    }
  }, []);

  // Sound effect
  const playSound = useCallback((type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      gain.gain.value = 0.1;
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

  // Vibrate on scan
  const vibrate = useCallback((type) => {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(type === 'granted' ? [100] : [100, 50, 100]);
      }
    } catch (e) {}
  }, []);

  // Process check-in
  const processCheckin = useCallback(async (memberId) => {
    const id = memberId.trim();
    if (!id || scanning || cooldownRef.current) return;
    setScanning(true);
    cooldownRef.current = true;

    try {
      const res = await fetch(`${API_BASE}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-scanner-key': SCANNER_KEY },
        body: JSON.stringify({ memberId: id }),
      });
      const data = await res.json();
      setResult(data.data);
      setStats(prev => ({
        granted: prev.granted + (data.data.result === 'granted' ? 1 : 0),
        denied: prev.denied + (data.data.result === 'denied' ? 1 : 0),
      }));
      playSound(data.data.result);
      vibrate(data.data.result);
    } catch (err) {
      setResult({ result: 'denied', denyReason: 'error', message: 'Network error — check WiFi connection' });
      playSound('denied');
    }

    setScanning(false);
    setManualId('');
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => { setResult(null); cooldownRef.current = false; }, 3500);
  }, [API_BASE, SCANNER_KEY, scanning, playSound, vibrate]);

  // Check if camera/HTTPS is available
  const isCameraAvailable = () => {
    if (typeof window === 'undefined') return false;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;
    return true;
  };

  // Start camera
  const startCamera = useCallback(async () => {
    setError('');

    // Check HTTPS requirement
    if (!isCameraAvailable()) {
      const isHTTP = typeof window !== 'undefined' && window.location.protocol === 'http:';
      if (isHTTP && window.location.hostname !== 'localhost') {
        setError(
          '🔒 Camera requires HTTPS! Restart frontend with: npm run dev (HTTPS is now enabled). ' +
          'Then open: https://' + window.location.host + '/checkin/mobile — Accept the security warning and try again.'
        );
      } else {
        setError('Camera not available on this device or browser.');
      }
      return;
    }

    if (!libLoaded) {
      setError('QR scanner library is still loading. Please wait and try again...');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);

      // Wait for video to stabilize
      await new Promise(r => setTimeout(r, 500));

      // Start scanning loop
      if (jsQRRef.current === 'native') {
        // Use native BarcodeDetector (Chrome Android)
        const detector = new BarcodeDetector({ formats: ['qr_code'] });
        const scanFrame = async () => {
          if (!videoRef.current || !streamRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0 && !cooldownRef.current) {
              const value = barcodes[0].rawValue;
              if (value) processCheckin(value);
            }
          } catch (e) {}
          scanLoopRef.current = requestAnimationFrame(scanFrame);
        };
        scanLoopRef.current = requestAnimationFrame(scanFrame);
      } else {
        // Use jsQR library (all other browsers)
        const scanFrame = () => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (!video || !canvas || !streamRef.current || video.readyState !== video.HAVE_ENOUGH_DATA) {
            scanLoopRef.current = requestAnimationFrame(scanFrame);
            return;
          }

          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          if (jsQRRef.current && !cooldownRef.current) {
            const code = jsQRRef.current(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });
            if (code && code.data) {
              console.log('📱 QR Scanned:', code.data);
              processCheckin(code.data);
            }
          }

          scanLoopRef.current = requestAnimationFrame(scanFrame);
        };
        scanLoopRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Check browser settings and allow camera access.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera is in use by another app. Close other apps using the camera and try again.');
      } else {
        setError(`Camera error: ${err.message}`);
      }
    }
  }, [processCheckin, cameraFacing, libLoaded]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  // Flip camera
  const flipCamera = useCallback(() => {
    stopCamera();
    setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment');
  }, [stopCamera]);

  // Re-start camera after flip
  useEffect(() => {
    if (!cameraActive && streamRef.current === null && cameraFacing) {
      // Don't auto-start on mount — only after explicit flip
    }
  }, [cameraFacing]);

  const handleFlipAndRestart = () => {
    flipCamera();
    setTimeout(() => startCamera(), 300);
  };

  useEffect(() => () => stopCamera(), [stopCamera]);

  const getDenial = (r) => DENIAL_MAP[r] || { label: 'Denied', icon: '❌' };

  const [clientInfo, setClientInfo] = useState({ isHTTPS: false, isLocalhost: true, canUseCamera: false, host: '' });
  useEffect(() => {
    setClientInfo({
      isHTTPS: window.location.protocol === 'https:',
      isLocalhost: window.location.hostname === 'localhost',
      canUseCamera: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      host: window.location.host,
    });
  }, []);
  const { isHTTPS, isLocalhost, canUseCamera } = clientInfo;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: 'var(--bg-primary)', color: 'var(--text-primary)',
    }}>
      {/* Hidden canvas for QR processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Header */}
      <div style={{
        padding: '1rem', textAlign: 'center',
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

        {/* HTTPS Warning Banner */}
        {!isHTTPS && !isLocalhost && (
          <div style={{
            width: '100%', maxWidth: '400px', padding: '0.75rem',
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--warning)',
          }}>
            <strong>⚠️ Camera needs HTTPS</strong>
            <br />
            <span style={{ fontSize: '0.75rem' }}>
              To use camera scanning, open the standalone HTTPS scanner.<br />
              Run in terminal: <code style={{ background: 'rgba(0,0,0,0.2)', padding: '0.125rem 0.375rem', borderRadius: '4px', fontSize: '0.7rem' }}>npm run scanner</code>
              <br /><br />
              <strong>Or use manual input below</strong> — type the member ID and tap Scan.
            </span>
          </div>
        )}

        {/* Library loading indicator */}
        {loadingLib && (
          <div style={{
            width: '100%', maxWidth: '400px', padding: '0.75rem',
            background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
            fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center',
          }}>
            <div className="spinner" style={{ margin: '0 auto 0.5rem', width: '20px', height: '20px' }}></div>
            Loading scanner library...
          </div>
        )}

        {/* Result overlay */}
        {result && (
          <div style={{
            width: '100%', maxWidth: '400px', textAlign: 'center',
            padding: '1.5rem', borderRadius: 'var(--radius-xl)',
            border: `3px solid ${result.result === 'granted' ? 'var(--success)' : 'var(--danger)'}`,
            background: result.result === 'granted' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            animation: 'resultPop 350ms cubic-bezier(0.175,0.885,0.32,1.275)',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
              {result.result === 'granted' ? '✅' : getDenial(result.denyReason).icon}
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.375rem' }}>
              {result.member?.fullName || 'Unknown'}
            </div>
            <div style={{
              display: 'inline-block', padding: '0.25rem 1rem', borderRadius: '9999px',
              fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase',
              background: result.result === 'granted' ? 'var(--success)' : 'var(--danger)',
              color: 'white',
            }}>
              {result.result === 'granted' ? '✓ ACCESS GRANTED' : getDenial(result.denyReason).label}
            </div>
            {result.member?.planType && result.result === 'granted' && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Plan: <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{result.member.planType}</span>
              </div>
            )}
            {result.message && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{result.message}</div>
            )}
          </div>
        )}

        {/* Camera */}
        {!result && canUseCamera && (
          <>
            {cameraActive ? (
              <div style={{ position: 'relative', width: '100%', maxWidth: '400px', borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '2px solid var(--accent-primary)' }}>
                <video ref={videoRef} style={{ width: '100%', display: 'block' }} playsInline muted />
                {/* Scan overlay */}
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none',
                }}>
                  <div style={{
                    width: '200px', height: '200px', position: 'relative',
                  }}>
                    {/* Animated scanning line */}
                    <div style={{
                      position: 'absolute', left: '5%', right: '5%',
                      height: '3px', background: 'var(--accent-primary)',
                      boxShadow: '0 0 12px var(--accent-primary)',
                      animation: 'scanLine 2s ease-in-out infinite',
                    }} />
                    {/* Corner brackets */}
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

                {/* Camera controls */}
                <div style={{
                  position: 'absolute', bottom: '0.75rem', left: 0, right: 0,
                  display: 'flex', justifyContent: 'center', gap: '0.5rem',
                }}>
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
                transition: 'all 200ms ease',
              }}>
                <div style={{
                  width: '70px', height: '70px', borderRadius: '50%',
                  background: 'rgba(167,139,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
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
            lineHeight: 1.5,
          }}>{error}</div>
        )}

        {/* Divider */}
        <div style={{
          width: '100%', maxWidth: '400px', display: 'flex', alignItems: 'center', gap: '0.75rem',
          marginTop: '0.5rem',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {canUseCamera ? 'or enter manually' : 'enter member ID'}
          </span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        {/* Manual Input (always visible — this is the fallback) */}
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
                outline: 'none', letterSpacing: '0.03em',
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

        {/* Info card */}
        <div style={{
          width: '100%', maxWidth: '400px', padding: '0.75rem',
          background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)',
          lineHeight: 1.6,
        }}>
          <strong style={{ color: 'var(--text-secondary)' }}>📋 How to test:</strong>
          <ol style={{ margin: '0.375rem 0 0', paddingLeft: '1.25rem' }}>
            <li>Go to Members page on your computer</li>
            <li>Click the QR icon on any member</li>
            <li>Note the member ID (e.g. MBR-5F9E0005)</li>
            <li>Type it above and tap Scan</li>
          </ol>
        </div>
      </div>

      <style>{`
        @keyframes resultPop {
          0% { opacity: 0; transform: scale(0.85); }
          60% { transform: scale(1.03); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes scanLine {
          0% { top: 5%; opacity: 0.5; }
          50% { top: 90%; opacity: 1; }
          100% { top: 5%; opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
