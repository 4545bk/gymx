'use client';

import { useState, useEffect } from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import Link from 'next/link';
import {
  Users, CalendarCheck, AlertTriangle, TrendingUp,
  Clock, Wallet, Bell, FileText, Mail,
} from 'lucide-react';

export default function DashboardPage() {
  const { staff } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentCheckins, setRecentCheckins] = useState([]);
  const [alerts, setAlerts] = useState({ unread: 0 });
  const [dues, setDues] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const promises = [
          api.get('/reports/members'),
          api.get('/checkin/today?limit=8'),
          api.get('/alerts/count'),
        ];

        if (staff?.role === 'owner') {
          const now = new Date();
          promises.push(api.get(`/payments/summary?month=${now.getMonth() + 1}&year=${now.getFullYear()}`));
        }

        const results = await Promise.allSettled(promises);

        if (results[0].status === 'fulfilled') setStats(results[0].value.data.data);
        if (results[1].status === 'fulfilled') setRecentCheckins(results[1].value.data.data || []);
        if (results[2].status === 'fulfilled') setAlerts(results[2].value.data.data);
        if (results[3]?.status === 'fulfilled') {
          setStats(prev => ({ ...prev, revenue: results[3].value.data.data }));
        }

        try {
          const duesRes = await api.get('/dues/overview');
          setDues(duesRes.data.data);
        } catch (e) { /* dues endpoint may fail for trainers */ }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [staff]);

  const formatCurrency = (cents) => `${(cents / 100).toLocaleString()} ETB`;
  const formatTime = (dateStr) => {
    if (!dateStr) return '--:--';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const avatarColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#22c55e', '#06b6d4', '#8b5cf6'];
  const getColor = (i) => avatarColors[i % avatarColors.length];

  return (
    <ProtectedLayout>
      {loading ? (
        <div style={{ padding: '0' }}>
          {/* Skeleton: Welcome Banner */}
          <div className="skeleton" style={{ height: '110px', borderRadius: 'var(--radius-xl)', marginBottom: '1.5rem' }} />
          {/* Skeleton: Stat Cards */}
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton skeleton-card" />
            ))}
          </div>
          {/* Skeleton: Content Grid */}
          <div className="grid-2" style={{ gridTemplateColumns: '1.8fr 1fr' }}>
            <div className="skeleton" style={{ height: '320px', borderRadius: 'var(--radius-lg)' }} />
            <div className="skeleton" style={{ height: '320px', borderRadius: 'var(--radius-lg)' }} />
          </div>
        </div>
      ) : (
        <>
          {/* Welcome Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #059669, #10b981, #34d399)',
            borderRadius: 'var(--radius-xl)', padding: '2rem 2.5rem',
            marginBottom: '1.5rem', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 style={{ color: '#0f172a', fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Welcome back, {staff?.fullName?.split(' ')[0]}
              </h2>
              <p style={{ color: 'rgba(15,23,42,0.7)', fontSize: '0.95rem' }}>
                Your facility is performing at 94% capacity today. You have {stats?.expiringIn7Days || 0} membership renewals pending attention.
              </p>
            </div>
            <div style={{
              position: 'absolute', right: '20px', top: '-20px', width: '180px', height: '180px',
              borderRadius: '50%', background: 'rgba(255,255,255,0.15)',
            }} />
            <div style={{
              position: 'absolute', right: '80px', bottom: '-40px', width: '120px', height: '120px',
              borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
            }} />
          </div>

          {/* Stats Grid — 6 cards */}
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            <StatCard icon={<Users size={20} />} label="ACTIVE MEMBERS" value={stats?.totalActive || 0}
              badge={`+${stats?.newThisMonth || 0}%`} badgeColor="var(--success)" />
            <StatCard icon={<CalendarCheck size={20} />} label="CHECK-INS TODAY" value={recentCheckins.length || 0}
              badge="Peak" badgeColor="var(--danger)" />
            <StatCard icon={<AlertTriangle size={20} />} label="EXPIRING SOON" value={stats?.expiringIn7Days || 0}
              badge="High" badgeColor="var(--warning)" />
            {staff?.role === 'owner' && stats?.revenue && (
              <StatCard icon={<TrendingUp size={20} />} label="NET PROFIT (ETB)" value={formatCurrency(stats.revenue.netProfit)}
                badge="Monthly" badgeColor="var(--accent-primary)" />
            )}
            <StatCard icon={<Mail size={20} />} label="UNREAD ALERTS" value={alerts?.unread || 0}
              badge="NEW" badgeColor="var(--success)" badgeStyle="badge-new" />
            {dues && (
              <StatCard icon={<Wallet size={20} />} label="OUTSTANDING DUES" value={formatCurrency(dues.outstandingRevenue?.total || 0)}
                badge="Arrears" badgeColor="var(--danger)" />
            )}
          </div>

          {/* Content Grid */}
          <div className="grid-2" style={{ gridTemplateColumns: '1.8fr 1fr' }}>
            {/* Recent Check-ins */}
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontSize: '1.25rem' }}>Recent Check-ins</h3>
                <Link href="/attendance" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'none' }}>View All</Link>
              </div>

              <div className="table-wrapper" style={{ border: 'none', background: 'transparent' }}>
                <table>
                  <thead>
                    <tr>
                      <th>MEMBER</th>
                      <th>PLAN</th>
                      <th>TIME</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCheckins.length > 0 ? recentCheckins.slice(0, 5).map((c, i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%', background: getColor(i),
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.7rem', fontWeight: 700, color: 'white', flexShrink: 0,
                            }}>
                              {getInitials(c.fullName)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{c.fullName}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>#{c.memberId || 'GX-0000'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>{c.planType || 'Standard'}</td>
                        <td>{formatTime(c.timestamp)}</td>
                        <td><span className={`badge badge-${c.result}`}>{c.result?.toUpperCase()}</span></td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4}>
                          <div className="empty-state">
                            <CalendarCheck size={32} />
                            <h3>No check-ins yet today</h3>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Member Overview */}
            <div className="card">
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Member Overview</h3>

              {/* Donut Chart Placeholder */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <div style={{ position: 'relative', width: 160, height: 160 }}>
                  <svg viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="80" cy="80" r="60" fill="none" stroke="var(--bg-elevated)" strokeWidth="18" />
                    <circle cx="80" cy="80" r="60" fill="none" stroke="var(--accent-primary)" strokeWidth="18"
                      strokeDasharray={`${(stats?.totalActive || 0) / Math.max((stats?.totalActive || 1) + (stats?.totalExpired || 0), 1) * 377} 377`}
                      strokeLinecap="round" />
                  </svg>
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: '1.75rem', fontWeight: 800 }}>
                      {stats?.totalActive && stats?.totalExpired
                        ? Math.round((stats.totalActive / (stats.totalActive + stats.totalExpired)) * 100)
                        : 0}%
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Retention</span>
                  </div>
                </div>
              </div>

              {/* Stats List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { label: 'Active', value: stats?.totalActive || 0, color: 'var(--text-muted)' },
                  { label: 'Expired', value: stats?.totalExpired || 0, color: 'var(--danger)' },
                  { label: 'Pending Renewal', value: stats?.expiringIn7Days || 0, color: 'var(--warning)' },
                ].map((item) => (
                  <div key={item.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{item.label}</span>
                    </div>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>{item.value}</span>
                  </div>
                ))}
              </div>

              <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1.5rem' }}>
                <FileText size={14} /> Download Report
              </button>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)',
            fontSize: '0.75rem', color: 'var(--text-muted)',
          }}>
            <span>© 2024 GymX Management v2.4.0</span>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>Privacy Policy</a>
              <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>Terms of Service</a>
              <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>Support</a>
            </div>
          </div>
        </>
      )}
    </ProtectedLayout>
  );
}

function StatCard({ icon, label, value, badge, badgeColor, badgeStyle }) {
  return (
    <div className="stat-card stagger-item" style={{ borderTop: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ color: 'var(--text-muted)', opacity: 0.7 }}>{icon}</div>
        {badge && (
          <span className={badgeStyle || ''} style={{
            fontSize: '0.65rem', fontWeight: 600, color: badgeColor,
            ...(badgeStyle ? {} : {}),
          }}>{badge}</span>
        )}
      </div>
      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  );
}
