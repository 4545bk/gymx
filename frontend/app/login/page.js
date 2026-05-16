'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Dumbbell, Mail, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative blurs */}
      <div style={{
        position: 'absolute', top: '-10%', left: '-10%', width: '50%', height: '50%',
        borderRadius: '50%', background: 'rgba(167, 139, 250, 0.08)', filter: 'blur(120px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', right: '-10%', width: '50%', height: '50%',
        borderRadius: '50%', background: 'rgba(231, 195, 101, 0.06)', filter: 'blur(120px)', pointerEvents: 'none',
      }} />

      {/* Background gym image */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, opacity: 0.15,
        backgroundImage: 'url("https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80")',
        backgroundSize: 'cover', backgroundPosition: 'center', filter: 'grayscale(100%)',
      }} />

      <main style={{ width: '100%', maxWidth: '420px', padding: '0 1rem', zIndex: 10, animation: 'modalIn 400ms var(--ease-out, cubic-bezier(0.23,1,0.32,1))' }}>
        {/* Login Card */}
        <div className="glass-card" style={{ padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
          {/* Logo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 'var(--radius-lg)',
              background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1rem', boxShadow: '0 0 20px rgba(207,188,255,0.2)',
            }}>
              <Dumbbell size={32} color="white" style={{ transform: 'rotate(-45deg)' }} />
            </div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 0 }}>
              <span className="brand-gradient">GymX</span>
            </h1>
          </div>

          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Welcome back</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Elite Performance Management</p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1rem', background: 'var(--danger-bg)',
              border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-md)',
              marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--danger)',
            }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{
                display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem',
              }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  placeholder="admin@gymx.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  style={{ paddingLeft: '2.75rem' }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{
                  fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>Password</label>
                <a href="#" style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', textDecoration: 'none' }}>Forgot?</a>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="login-password"
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingLeft: '2.75rem' }}
                />
              </div>
            </div>

            {/* Remember me */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="checkbox" id="remember" checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)' }}
              />
              <label htmlFor="remember" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                Keep me logged in for 30 days
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '1rem', borderRadius: 'var(--radius-lg)',
                background: 'var(--accent-gradient)', color: '#1a1f35', fontWeight: 700,
                fontSize: '1.1rem', border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(207,188,255,0.2)',
                transition: 'transform 160ms cubic-bezier(0.23,1,0.32,1), box-shadow 200ms ease, opacity 200ms ease', opacity: loading ? 0.7 : 1,
                fontFamily: 'inherit',
              }}
            >
              {loading ? <div className="spinner" style={{ borderTopColor: 'white', margin: '0 auto' }}></div> : 'Sign In'}
            </button>
          </form>

          {/* Footer note */}
          <div style={{
            marginTop: '2rem', paddingTop: '1.5rem',
            borderTop: '1px solid rgba(73,69,81,0.2)', textAlign: 'center',
          }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', opacity: 0.6, lineHeight: 1.6 }}>
              Staff accounts are managed by the head office.
              Contact your administrator if you are unable to access your portal.
            </p>
          </div>
        </div>

        {/* External links */}
        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
          {['Privacy Policy', 'Terms of Service', 'Support'].map(link => (
            <a key={link} href="#" style={{
              fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'none',
              transition: 'color 200ms',
            }}
              onMouseEnter={(e) => e.target.style.color = 'var(--accent-primary)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
            >{link}</a>
          ))}
        </div>
      </main>

      {/* Version indicator */}
      <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 5 }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', opacity: 0.4 }}>GymX v2.4.0</span>
      </div>
    </div>
  );
}
