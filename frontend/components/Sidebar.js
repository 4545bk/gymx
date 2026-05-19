'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  LayoutDashboard, Users, ScanLine, CalendarCheck,
  UserCog, DollarSign, Package, Bell, BarChart3,
  LogOut, Dumbbell, ShoppingCart, Tags, Settings, Wallet, X,
  UserPlus, User, Sun, Moon,
} from 'lucide-react';

const navItems = [
  { section: 'Overview' },
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, roles: ['owner', 'receptionist', 'trainer'] },
  
  { section: 'Management' },
  { href: '/members', label: 'Members', icon: Users, roles: ['owner', 'receptionist', 'trainer'] },
  { href: '/attendance', label: 'Attendance', icon: CalendarCheck, roles: ['owner', 'receptionist', 'trainer'] },
  { href: '/staff', label: 'Staff', icon: UserCog, roles: ['owner'] },
  { href: '/dues', label: 'Dues', icon: Wallet, roles: ['owner', 'receptionist'] },
  
  { section: 'Operations' },
  { href: '/checkin', label: 'Check-In', icon: ScanLine, roles: ['owner', 'receptionist'], standalone: true },
  { href: '/finance', label: 'Finance', icon: DollarSign, roles: ['owner', 'receptionist'] },
  { href: '/inventory', label: 'Inventory', icon: Package, roles: ['owner', 'receptionist'] },
  { href: '/alerts', label: 'Alerts', icon: Bell, roles: ['owner', 'receptionist'] },
  { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['owner', 'receptionist'] },
  
  { section: 'Commerce' },
  { href: '/products', label: 'Products', icon: Tags, roles: ['owner', 'receptionist'] },
  { href: '/sales', label: 'Sales', icon: ShoppingCart, roles: ['owner', 'receptionist'] },
  
  { section: 'Admin' },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['owner'] },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const pathname = usePathname();
  const { staff, logout } = useAuth();
  const [theme, setTheme] = useState('dark');

  // Read theme from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('gymx-theme') || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('gymx-theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  if (!staff) return null;

  const initials = staff.fullName
    ? staff.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <aside className={`sidebar ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>
      <div className="sidebar-header">
        <Dumbbell size={28} style={{ color: 'var(--accent-primary)' }} />
        <div>
          <span className="sidebar-logo brand-gradient">GymX</span>
          <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '-2px' }}>
            Elite Performance
          </div>
        </div>
        <button className="btn btn-ghost btn-sm sidebar-close-btn" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item, i) => {
          if (item.section) {
            return <div key={i} className="nav-section-label">{item.section}</div>;
          }
          if (!item.roles.includes(staff.role)) return null;
          
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive ? 'active' : ''}`}
              target={item.standalone ? '_blank' : undefined}
              onClick={onClose}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* New Member CTA */}
      {(staff.role === 'owner' || staff.role === 'receptionist') && (
        <div style={{ padding: '0 1rem', marginBottom: '0.75rem' }}>
          <Link href="/members" onClick={onClose} style={{ textDecoration: 'none' }}>
            <button className="btn btn-teal" style={{ width: '100%', borderRadius: 'var(--radius-lg)' }}>
              <UserPlus size={16} />
              New Member
            </button>
          </Link>
        </div>
      )}

      <div className="sidebar-footer">
        {/* Theme Toggle */}
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div className="avatar-sm" style={{
            width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--accent-gradient)', color: 'white', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {staff.fullName}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {staff.role}
            </div>
          </div>
        </div>
        <button onClick={logout} className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }}>
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
