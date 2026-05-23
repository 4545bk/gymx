'use client';

import { useState, useEffect, useCallback } from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { toEthiopian, formatRelative, WEEKDAYS_EN, WEEKDAYS_AM } from '@/lib/ethiopianDate';
import { fmtETB } from '@/lib/currency';
import {
  Users, CalendarCheck, TrendingUp, TrendingDown,
  Wallet, AlertTriangle, ChevronRight, CheckCircle2,
  XCircle, Clock, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const DashboardCharts = dynamic(() => import('@/components/DashboardCharts'), {
  ssr: false,
  loading: () => <div className="gymx-skeleton" style={{ height: 220, borderRadius: 'var(--radius-lg)' }} />
});

/* ═══════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════ */
function getGreetingKey() {
  const h = new Date().getHours();
  if (h < 12) return 'dashboard.greeting_morning';
  if (h < 17) return 'dashboard.greeting_afternoon';
  return 'dashboard.greeting_evening';
}

const getInitials = (name) => {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

/* ═══════════════════════════════════════════════════════════
   Main Dashboard Page
   ═══════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { staff } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState(null);
  const [recentCheckins, setRecentCheckins] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [dues, setDues] = useState(null);
  const [revenueSeries, setRevenueSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [secondsAgo, setSecondsAgo] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const promises = [
        api.get('/reports/members'),
        api.get('/checkin/today?limit=8'),
        api.get('/alerts?limit=3&unread=true').catch(() => ({ data: { data: [] } })),
      ];
      if (staff?.role === 'owner' || staff?.role === 'receptionist') {
        promises.push(api.get('/dues/overview').catch(() => ({ data: { data: null } })));
      }
      if (staff?.role === 'owner') {
        const now = new Date();
        promises.push(
          api.get(`/payments/summary?month=${now.getMonth() + 1}&year=${now.getFullYear()}`).catch(() => ({ data: { data: null } }))
        );
        const from30 = new Date(); from30.setDate(from30.getDate() - 30);
        promises.push(
          api.get(`/reports/revenue?from=${from30.toISOString().split('T')[0]}&to=${now.toISOString().split('T')[0]}&groupBy=day`).catch(() => ({ data: { data: { series: [] } } }))
        );
      }

      const results = await Promise.allSettled(promises);
      if (results[0].status === 'fulfilled') setStats(results[0].value.data.data);
      if (results[1].status === 'fulfilled') setRecentCheckins(results[1].value.data.data || []);
      if (results[2].status === 'fulfilled') {
        const alertData = results[2].value.data.data;
        setAlerts(Array.isArray(alertData) ? alertData.slice(0, 3) : []);
      }
      if (results[3]?.status === 'fulfilled') setDues(results[3].value.data.data);
      if (results[4]?.status === 'fulfilled') {
        setStats(prev => ({ ...prev, revenue: results[4].value.data.data }));
      }
      if (results[5]?.status === 'fulfilled') {
        const rev = results[5].value.data.data;
        setRevenueSeries(rev?.series || []);
      }

      setLastUpdated(new Date());
      setSecondsAgo(0);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [staff]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // "seconds ago" ticker
  useEffect(() => {
    const t = setInterval(() => {
      if (lastUpdated) setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [lastUpdated]);

  const now = new Date();
  const eth = toEthiopian(now);
  const lang = typeof window !== 'undefined' ? (localStorage.getItem('gymx_language') || 'en') : 'en';
  const isAm = lang === 'am';
  const firstName = staff?.fullName?.split(' ')[0] || 'there';

  /* Member status data for donut */
  const donutData = stats ? [
    { name: 'Active', value: stats.totalActive || 0, color: '#1A5C3A' },
    { name: 'Expired', value: stats.totalExpired || 0, color: '#C0392B' },
    { name: 'Suspended', value: stats.totalSuspended || 0, color: '#D97706' },
    { name: 'Frozen', value: stats.totalFrozen || 0, color: '#1E40AF' },
  ].filter(d => d.value > 0) : [];
  const totalMembers = donutData.reduce((s, d) => s + d.value, 0);

  /* Revenue chart data — normalize to daily series */
  const chartData = revenueSeries.map(item => ({
    date: item.month || item.date || '',
    income: (item.income || 0) / 100,
  }));

  return (
    <ProtectedLayout>
      {loading ? <DashboardSkeleton /> : (
        <div style={{ width: '100%' }}>

          {/* ─── Page Header ──────────────────────────────── */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{
              fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-semibold)',
              color: 'var(--text-primary)', marginBottom: 4, letterSpacing: '-0.02em',
            }}>
              {t(getGreetingKey())}, {firstName}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                {(isAm ? WEEKDAYS_AM : WEEKDAYS_EN)[now.getDay()]}, {eth.day} {isAm ? eth.monthNameAm : eth.monthNameEn} {eth.year}
                <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                  ({now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
                </span>
              </span>
              <span style={{
                fontSize: 'var(--text-xs)', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <Clock size={11} />
                {t('dashboard.lastUpdated', { seconds: secondsAgo })}
              </span>
            </div>
          </div>

          {/* ─── Stat Cards ───────────────────────────────── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
            marginBottom: 24,
          }}>
            <StatCard
              label={t('dashboard.activeMembers')}
              value={stats?.totalActive || 0}
              trend={stats?.newThisMonth > 0 ? `+${stats.newThisMonth}` : null}
              trendUp={true}
              accent="#1A5C3A"
            />
            <StatCard
              label={t('dashboard.todayCheckins')}
              value={recentCheckins.length}
              trend={null}
              accent="#1E40AF"
            />
            <StatCard
              label={t('dashboard.monthRevenue')}
              value={fmtETB(stats?.revenue?.totalIncome || 0, lang)}
              trend={null}
              accent="#1A5C3A"
            />
            <StatCard
              label={t('dashboard.outstandingDues')}
              value={fmtETB(dues?.outstandingRevenue?.total || 0, lang)}
              subtext={dues?.outstandingRevenue?.count ? `${dues.outstandingRevenue.count} ${t('common.member')}` : null}
              accent={(dues?.outstandingRevenue?.total || 0) > 0 ? '#C0392B' : '#1A5C3A'}
            />
          </div>

          {/* ─── Quick Alerts Strip ───────────────────────── */}
          {alerts.length > 0 && (
            <div style={{
              display: 'flex', gap: 12, marginBottom: 24,
              overflowX: 'auto', paddingBottom: 4,
            }}>
              {alerts.map((a, i) => (
                <div key={i} style={{
                  flex: '0 0 auto', minWidth: 280,
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderLeft: `3px solid ${a.severity === 'critical' || a.type === 'overdue' ? 'var(--danger)' : 'var(--warning)'}`,
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)', color: 'var(--text-secondary)',
                }}>
                  <AlertTriangle size={16} style={{
                    color: a.severity === 'critical' ? 'var(--danger)' : 'var(--warning)',
                    flexShrink: 0,
                  }} />
                  <span style={{ flex: 1, lineHeight: 1.4 }}>{a.message || a.title || 'Alert'}</span>
                  <Link href="/alerts" style={{
                    fontSize: 'var(--text-xs)', color: 'var(--accent-primary)',
                    textDecoration: 'none', whiteSpace: 'nowrap',
                  }}>View</Link>
                </div>
              ))}
            </div>
          )}

          {/* ─── Charts Section ───────────────────────────── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr',
            gap: 16,
            marginBottom: 24,
          }}>
            {/* Revenue Trend */}
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xs)',
              padding: '20px 24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                  {t('dashboard.revenueChart')}
                </h3>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Last 30 days</span>
              </div>
              {chartData.length > 0 ? (
                <DashboardCharts type="income" data={chartData} />
              ) : (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                  <TrendingUp size={28} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                    Start recording payments to see trends
                  </span>
                </div>
              )}
            </div>

            {/* Member Status Donut */}
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xs)',
              padding: '20px 24px',
            }}>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 16 }}>
                {t('dashboard.memberStatus')}
              </h3>
              {donutData.length > 0 ? (
                <>
                  <DashboardCharts type="status" data={donutData} totalMembers={totalMembers} t={t} />
                  {/* Legend */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginTop: 16 }}>
                    {donutData.map((d) => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', flex: 1 }}>{d.name}</span>
                        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{t('dashboard.noMemberData')}</span>
                </div>
              )}
            </div>
          </div>

          {/* ─── Recent Check-ins ─────────────────────────── */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xs)',
            padding: '20px 24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                {t('dashboard.recentCheckins')}
              </h3>
              <Link href="/checkin" style={{
                fontSize: 'var(--text-xs)', color: 'var(--accent-primary)', textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: 2,
              }}>
                {t('dashboard.viewAll')} <ChevronRight size={12} />
              </Link>
            </div>

            {recentCheckins.length > 0 ? (
              <div style={{
                display: 'flex', gap: 12, overflowX: 'auto',
                paddingBottom: 4,
              }}>
                {recentCheckins.slice(0, 8).map((c, i) => {
                  const denied = c.result === 'denied';
                  return (
                    <div key={i} style={{
                      flex: '0 0 auto', width: 130,
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: 8, padding: '16px 12px',
                      background: denied ? 'var(--danger-bg)' : 'var(--bg-elevated)',
                      border: `1px solid ${denied ? 'rgba(192,57,43,0.2)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-md)',
                    }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: denied ? '#C0392B' : '#1A5C3A',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)',
                        position: 'relative',
                      }}>
                        {getInitials(c.fullName)}
                        <div style={{
                          position: 'absolute', bottom: -2, right: -2,
                          background: 'var(--bg-card)', borderRadius: '50%', padding: 1,
                        }}>
                          {denied
                            ? <XCircle size={14} style={{ color: '#C0392B' }} />
                            : <CheckCircle2 size={14} style={{ color: '#1A5C3A' }} />}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{
                          fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)',
                          color: 'var(--text-primary)', lineHeight: 1.3,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          maxWidth: 110,
                        }}>
                          {c.fullName}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                          {formatRelative(c.timestamp, lang)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                textAlign: 'center', padding: '32px 16px',
                color: 'var(--text-muted)',
              }}>
                <CalendarCheck size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
                <div style={{ fontSize: 'var(--text-sm)' }}>No check-ins yet today</div>
                <div style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                  Members will appear here once they scan in
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </ProtectedLayout>
  );
}

/* ═══════════════════════════════════════════════════════════
   Stat Card Component
   ═══════════════════════════════════════════════════════════ */
function StatCard({ label, value, trend, trendUp, subtext, accent = '#1A5C3A' }) {
  return (
    <div className="stagger-item" style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderLeft: `3px solid ${accent}`,
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-xs)',
      padding: '20px 24px',
    }}>
      <div style={{
        fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-semibold)',
        color: 'var(--text-primary)', letterSpacing: '-0.02em',
        lineHeight: 1.1, marginBottom: 4,
      }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div style={{
        fontSize: 'var(--text-sm)', color: 'var(--text-secondary)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {label}
        {trend && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 2,
            fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)',
            padding: '1px 6px', borderRadius: 9999,
            background: trendUp ? 'var(--success-bg)' : 'var(--danger-bg)',
            color: trendUp ? 'var(--success)' : 'var(--danger)',
          }}>
            {trendUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {trend}
          </span>
        )}
      </div>
      {subtext && (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
          {subtext}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Skeleton Loader
   ═══════════════════════════════════════════════════════════ */
function DashboardSkeleton() {
  return (
    <div style={{ width: '100%' }}>
      {/* Header skeleton */}
      <div style={{ marginBottom: 28 }}>
        <div className="skeleton" style={{ height: 36, width: 320, borderRadius: 'var(--radius-md)', marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 16, width: 260, borderRadius: 'var(--radius-sm)' }} />
      </div>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-lg)' }} />
        ))}
      </div>
      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="skeleton" style={{ height: 300, borderRadius: 'var(--radius-lg)' }} />
        <div className="skeleton" style={{ height: 300, borderRadius: 'var(--radius-lg)' }} />
      </div>
      {/* Recent check-ins */}
      <div className="skeleton" style={{ height: 160, borderRadius: 'var(--radius-lg)' }} />
    </div>
  );
}
