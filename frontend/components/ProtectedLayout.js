'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import { Menu, Search, Bell, HelpCircle, ScanLine } from 'lucide-react';

export default function ProtectedLayout({ children, title, actions }) {
  const { isAuthenticated, loading, staff } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const initials = staff?.fullName
    ? staff.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <div className="layout">
      {mobileMenuOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}
      <Sidebar mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <main className="main-content">
        <div className="topbar">
          <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              className="btn btn-ghost btn-sm mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
            {title && <h1 style={{ marginRight: '1rem' }}>{title}</h1>}
            <div className="topbar-search">
              <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input placeholder="Search members, analytics, tools..." />
            </div>
          </div>
          <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {actions}
            <Link href="/checkin" target="_blank" style={{ textDecoration: 'none' }}>
              <button className="btn btn-secondary" style={{
                borderColor: 'var(--accent-teal)', color: 'var(--accent-teal)',
                borderRadius: 'var(--radius-lg)', fontSize: '0.8rem',
              }}>
                <ScanLine size={14} />
                Check-in
              </button>
            </Link>
            <button className="btn btn-ghost btn-sm" style={{ position: 'relative' }}>
              <Bell size={18} />
            </button>
            <button className="btn btn-ghost btn-sm">
              <HelpCircle size={18} />
            </button>
            <div className="avatar" style={{ cursor: 'pointer' }}>
              {initials}
            </div>
          </div>
        </div>
        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
}
