'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { useBranch } from '@/lib/branchContext';
import LanguageToggle from '@/components/LanguageToggle';
import {
  LayoutDashboard, Users, ScanLine, CalendarCheck,
  UserCog, DollarSign, Package, Bell, BarChart3,
  LogOut, ShoppingCart, Tags, Settings, Wallet, X,
  Sun, Moon, MapPin, ChevronDown,
} from 'lucide-react';

/* ─── Navigation structure grouped by section ────────────── */
const navGroups = [
  {
    labelKey: 'sidebar.operations',
    items: [
      { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, roles: ['owner', 'receptionist', 'trainer'] },
      { href: '/members', labelKey: 'nav.members', icon: Users, roles: ['owner', 'receptionist', 'trainer'] },
      { href: '/checkin', labelKey: 'nav.checkin', icon: ScanLine, roles: ['owner', 'receptionist'], standalone: true },
      { href: '/attendance', labelKey: 'nav.attendance', icon: CalendarCheck, roles: ['owner', 'receptionist', 'trainer'] },
    ],
  },
  {
    labelKey: 'sidebar.financeMgmt',
    items: [
      { href: '/finance', labelKey: 'nav.payments', icon: DollarSign, roles: ['owner', 'receptionist'] },
      { href: '/dues', labelKey: 'nav.dues', icon: Wallet, roles: ['owner', 'receptionist'] },
    ],
  },
  {
    labelKey: 'sidebar.management',
    items: [
      { href: '/staff', labelKey: 'nav.staff', icon: UserCog, roles: ['owner'] },
      { href: '/inventory', labelKey: 'nav.inventory', icon: Package, roles: ['owner', 'receptionist'] },
      { href: '/products', labelKey: 'nav.products', icon: Tags, roles: ['owner', 'receptionist'] },
      { href: '/sales', labelKey: 'nav.sales', icon: ShoppingCart, roles: ['owner', 'receptionist'] },
    ],
  },
  {
    labelKey: 'sidebar.insights',
    items: [
      { href: '/reports', labelKey: 'nav.reports', icon: BarChart3, roles: ['owner', 'receptionist'] },
      { href: '/alerts', labelKey: 'nav.alerts', icon: Bell, roles: ['owner', 'receptionist'] },
    ],
  },
  {
    labelKey: 'sidebar.system',
    items: [
      { href: '/settings', labelKey: 'nav.settings', icon: Settings, roles: ['owner'] },
    ],
  },
];

/* ─── Styles ─────────────────────────────────────────────── */
const S = {
  sidebar: {
    width: 220,
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 50,
    transition: 'transform 200ms ease',
  },
  brand: {
    padding: '20px 16px 16px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  brandName: {
    fontSize: 'var(--text-md)',
    fontWeight: 'var(--font-semibold)',
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: '#22c55e',
    boxShadow: '0 0 6px rgba(34,197,94,0.5)',
    flexShrink: 0,
  },
  nav: {
    flex: 1,
    padding: '8px 8px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 'var(--font-semibold)',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    padding: '16px 12px 6px',
    lineHeight: 1,
  },
  navLink: (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    height: 36,
    padding: '0 12px',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--text-sm)',
    fontWeight: isActive ? 'var(--font-medium)' : 'var(--font-regular)',
    fontFamily: 'var(--font-sans)',
    color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
    background: isActive ? 'var(--accent-primary-light, #E8F5EE)' : 'transparent',
    textDecoration: 'none',
    transition: 'var(--transition-fast)',
    position: 'relative',
    cursor: 'pointer',
    border: 'none',
    width: '100%',
    textAlign: 'left',
  }),
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 3,
    borderRadius: 2,
    background: 'var(--accent-primary)',
  },
  footer: {
    padding: '12px 12px 16px',
    borderTop: '1px solid var(--border)',
    marginTop: 'auto',
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'var(--accent-primary)',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--font-semibold)',
    flexShrink: 0,
  },
  userName: {
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--font-medium)',
    color: 'var(--text-primary)',
    lineHeight: 1.3,
  },
  userRole: {
    fontSize: 10,
    color: 'var(--text-muted)',
    textTransform: 'capitalize',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '6px 8px',
    background: 'none',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-sans)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  themeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '6px 8px',
    marginBottom: 8,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-sans)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  closeBtn: {
    display: 'none',
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: 4,
    borderRadius: 'var(--radius-sm)',
  },
  overlay: {
    display: 'none',
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    zIndex: 49,
    animation: 'fadeIn 200ms ease',
  },
};

export default function Sidebar({ mobileOpen, onClose }) {
  const pathname = usePathname();
  const { staff, logout } = useAuth();
  const { t } = useI18n();
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const saved = localStorage.getItem('gymx-theme') || 'light';
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
    <>
      {/* Mobile overlay */}
      {mobileOpen && <div style={{ ...S.overlay, display: 'block' }} onClick={onClose} />}

      <aside
        className={mobileOpen ? 'sidebar-mobile-open' : ''}
        style={{
          ...S.sidebar,
          ...(typeof window !== 'undefined' && window.innerWidth <= 768 && !mobileOpen
            ? { transform: 'translateX(-100%)' }
            : {}),
        }}
      >
        {/* ─── Brand header ──────────────────────────────── */}
        <div style={S.brand}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <span style={S.brandName}>GymX</span>
            <div style={S.onlineDot} title="System online" />
          </div>
          <button
            style={{ ...S.closeBtn, ...(mobileOpen ? { display: 'inline-flex' } : {}) }}
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* ─── Branch Switcher ────────────────────────────── */}
        <BranchSwitcher />

        {/* ─── Navigation ────────────────────────────────── */}
        <nav style={S.nav}>
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(item => item.roles.includes(staff.role));
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.labelKey}>
                <div style={S.sectionLabel}>{t(group.labelKey)}</div>
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      target={item.standalone ? '_blank' : undefined}
                      onClick={onClose}
                      style={S.navLink(isActive)}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'var(--accent-primary-light, #E8F5EE)';
                          e.currentTarget.style.color = 'var(--accent-primary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }
                      }}
                    >
                      {isActive && <div style={S.activeBar} />}
                      <Icon size={16} style={{ flexShrink: 0 }} />
                      <span>{t(item.labelKey)}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* ─── Footer ────────────────────────────────────── */}
        <div style={S.footer}>
          {/* Language + Theme row */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <LanguageToggle compact />
            <button
              style={{ ...S.themeBtn, marginBottom: 0, flex: 1 }}
              onClick={toggleTheme}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>

          {/* User info */}
          <div style={S.userRow}>
            <div style={S.avatar}>{initials}</div>
            <div style={{ minWidth: 0 }}>
              <div style={S.userName}>{staff.fullName}</div>
              <div style={S.userRole}>{staff.role}</div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            style={S.logoutBtn}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--danger)';
              e.currentTarget.style.background = 'var(--danger-bg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.background = 'none';
            }}
          >
            <LogOut size={14} />
            <span>{t('sidebar.logout')}</span>
          </button>
        </div>
      </aside>
    </>
  );
}

/* ─── Branch Switcher (shown only for multi-branch gyms) ──── */
function BranchSwitcher() {
  const { branches, currentBranch, setCurrentBranch, isMultiBranch } = useBranch();
  const { staff } = useAuth();
  const [open, setOpen] = useState(false);

  if (!isMultiBranch) return null;

  const isOwner = staff?.role === 'owner';
  const label = currentBranch?.name || 'All Branches';

  return (
    <div style={{
      padding: '8px 12px',
      borderBottom: '1px solid var(--border)',
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '8px 10px',
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', cursor: 'pointer',
          fontSize: 'var(--text-sm)', fontFamily: 'var(--font-sans)',
          color: 'var(--text-primary)', transition: 'var(--transition-fast)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
      >
        <MapPin size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
        <ChevronDown size={14} style={{
          color: 'var(--text-muted)', flexShrink: 0,
          transform: open ? 'rotate(180deg)' : 'rotate(0)',
          transition: 'transform 150ms ease',
        }} />
      </button>

      {open && (
        <div style={{
          marginTop: 4, background: 'var(--bg-card)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
          overflow: 'hidden', boxShadow: 'var(--shadow-md)',
        }}>
          {/* Owner: All Branches option */}
          {isOwner && (
            <button
              onClick={() => { setCurrentBranch(null); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '8px 12px', border: 'none',
                background: !currentBranch ? 'var(--accent-primary-light, #E8F5EE)' : 'transparent',
                color: !currentBranch ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontSize: 'var(--text-sm)', fontFamily: 'var(--font-sans)',
                cursor: 'pointer', textAlign: 'left',
                fontWeight: !currentBranch ? 600 : 400,
              }}
            >
              All Branches
            </button>
          )}

          {/* Individual branches */}
          {branches.map(b => (
            <button
              key={b._id}
              onClick={() => { setCurrentBranch(b); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '8px 12px', border: 'none',
                background: currentBranch?._id === b._id ? 'var(--accent-primary-light, #E8F5EE)' : 'transparent',
                color: currentBranch?._id === b._id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontSize: 'var(--text-sm)', fontFamily: 'var(--font-sans)',
                cursor: 'pointer', textAlign: 'left',
                fontWeight: currentBranch?._id === b._id ? 600 : 400,
                borderTop: '1px solid var(--border)',
              }}
            >
              <MapPin size={12} />
              <span style={{ flex: 1 }}>{b.name}</span>
              {b.isHeadquarters && (
                <span style={{
                  fontSize: 9, padding: '1px 6px', borderRadius: 99,
                  background: 'var(--accent-primary)', color: '#fff', fontWeight: 600,
                }}>HQ</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
