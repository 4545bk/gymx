'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ProtectedLayout from '@/components/ProtectedLayout';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { BarChart3, Users, TrendingUp, CalendarCheck, AlertTriangle, UserCheck, Activity } from 'lucide-react';
import { SkeletonChartArea } from '@/components/ui/Skeleton';

const ReportCharts = dynamic(() => import('@/components/ReportCharts'), {
  ssr: false,
  loading: () => <SkeletonChartArea height={240} />
});

const TABS = ['Overview', 'Revenue', 'Retention', 'Staff'];

export default function ReportsPage() {
  const { staff } = useAuth();
  const [tab, setTab] = useState('Overview');
  const [membersReport, setMembersReport] = useState(null);
  const [attendanceReport, setAttendanceReport] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [retentionData, setRetentionData] = useState(null);
  const [staffData, setStaffData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const to = now.toISOString().split('T')[0];
        const promises = [
          api.get('/reports/members'),
          api.get(`/reports/attendance?from=${from}&to=${to}`),
        ];
        if (staff?.role === 'owner') {
          promises.push(api.get('/reports/revenue-breakdown'));
          promises.push(api.get('/reports/retention'));
          promises.push(api.get('/reports/staff-performance'));
        }
        const results = await Promise.all(promises);
        setMembersReport(results[0].data.data);
        setAttendanceReport(results[1].data.data);
        if (staff?.role === 'owner') {
          setRevenueData(results[2].data.data);
          setRetentionData(results[3].data.data);
          setStaffData(results[4].data.data);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchReports();
  }, [staff]);

  const formatCurrency = (cents) => `${(cents / 100).toLocaleString()} ETB`;
  const isOwner = staff?.role === 'owner';

  return (
    <ProtectedLayout title="Reports & Analytics">
      {/* Tab bar */}
      <div className="tab-filters" style={{ marginBottom: '1.5rem' }}>
        {TABS.filter(t => t === 'Overview' || isOwner).map(t => (
          <button key={t} className={`tab-filter ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {loading ? <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}><div className="skeleton" style={{ height: '48px', borderRadius: 'var(--radius-md)' }} /><div className="stats-grid">{[...Array(4)].map((_, i) => <div key={i} className="skeleton skeleton-card" />)}</div><div className="skeleton" style={{ height: '300px', borderRadius: 'var(--radius-lg)' }} /></div> : (
        <>
          {/* ─── OVERVIEW TAB ─── */}
          {tab === 'Overview' && (
            <>
              <div className="stats-grid">
                <div className="stat-card stagger-item blue"><div className="stat-label">Total Active</div><div className="stat-value">{membersReport?.totalActive || 0}</div></div>
                <div className="stat-card stagger-item green"><div className="stat-label">Check-ins This Month</div><div className="stat-value">{attendanceReport?.totalCheckins || 0}</div></div>
                <div className="stat-card stagger-item cyan"><div className="stat-label">Avg Per Day</div><div className="stat-value">{attendanceReport?.averagePerDay || 0}</div></div>
                <div className="stat-card stagger-item amber"><div className="stat-label">Expiring in 7 Days</div><div className="stat-value">{membersReport?.expiringIn7Days || 0}</div></div>
              </div>
              <div className="grid-2" style={{ marginTop: '1.5rem' }}>
                <div className="card">
                  <div className="card-header"><h3><Users size={18} style={{ color: 'var(--accent-primary)', marginRight: '0.5rem' }} />Members by Status</h3></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[{ l: 'Active', v: membersReport?.totalActive, c: 'var(--success)' }, { l: 'Expired', v: membersReport?.totalExpired, c: 'var(--danger)' }, { l: 'Suspended', v: membersReport?.totalSuspended, c: 'var(--warning)' }, { l: 'New This Month', v: membersReport?.newThisMonth, c: 'var(--info)' }, { l: 'Churned This Month', v: membersReport?.churnedThisMonth, c: 'var(--danger)' }].map(({ l, v, c }) => (
                      <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />{l}</span>
                        <span style={{ fontWeight: 700 }}>{v || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <div className="card-header"><h3><CalendarCheck size={18} style={{ color: 'var(--success)', marginRight: '0.5rem' }} />Attendance Trend</h3></div>
                  {attendanceReport?.series?.length > 0 ? (
                    <ReportCharts type="attendance" data={attendanceReport} />
                  ) : <div className="empty-state"><BarChart3 size={24} /><p>No attendance data</p></div>}
                </div>
              </div>
            </>
          )}

          {/* ─── REVENUE TAB ─── */}
          {tab === 'Revenue' && revenueData && (
            <>
              <div className="stats-grid">
                <div className="stat-card stagger-item blue"><div className="stat-label">Total Revenue</div><div className="stat-value" style={{ fontSize: '1.3rem' }}>{formatCurrency(revenueData.totalRevenue)}</div></div>
                <div className="stat-card stagger-item green"><div className="stat-label">Membership Revenue</div><div className="stat-value" style={{ fontSize: '1.3rem', color: 'var(--success)' }}>{formatCurrency(revenueData.totalMembership)}</div></div>
                <div className="stat-card stagger-item cyan"><div className="stat-label">Product Sales</div><div className="stat-value" style={{ fontSize: '1.3rem', color: 'var(--accent-secondary)' }}>{formatCurrency(revenueData.totalProduct)}</div></div>
              </div>
              <div className="grid-2" style={{ marginTop: '1.5rem' }}>
                <div className="card">
                  <div className="card-header"><h3><TrendingUp size={18} style={{ color: 'var(--accent-primary)', marginRight: '0.5rem' }} />Monthly Revenue</h3></div>
                  {revenueData.series.length > 0 ? (
                    <ReportCharts type="revenue" data={revenueData} formatCurrency={formatCurrency} />
                  ) : <div className="empty-state"><BarChart3 size={24} /><p>No revenue data yet</p></div>}
                </div>
                <div className="card">
                  <div className="card-header"><h3>Revenue Split</h3></div>
                  {revenueData.totalRevenue > 0 ? (
                    <ReportCharts type="split" data={revenueData} formatCurrency={formatCurrency} />
                  ) : <div className="empty-state"><BarChart3 size={24} /><p>No data</p></div>}
                </div>
              </div>
            </>
          )}

          {/* ─── RETENTION TAB ─── */}
          {tab === 'Retention' && retentionData && (
            <>
              <div className="stats-grid">
                <div className="stat-card stagger-item red"><div className="stat-label">Churn Rate</div><div className="stat-value">{retentionData.churnRate}%</div></div>
                <div className="stat-card stagger-item green"><div className="stat-label">Renewal Rate</div><div className="stat-value">{retentionData.renewalRate}%</div></div>
                <div className="stat-card stagger-item amber"><div className="stat-label">At Risk (14d inactive)</div><div className="stat-value">{retentionData.atRiskCount}</div></div>
                <div className="stat-card stagger-item blue"><div className="stat-label">Active Members</div><div className="stat-value">{retentionData.totalActive}</div></div>
              </div>
              <div className="card" style={{ marginTop: '1.5rem' }}>
                <div className="card-header"><h3><AlertTriangle size={18} style={{ color: 'var(--warning)', marginRight: '0.5rem' }} />At-Risk Members (no check-in 14+ days)</h3></div>
                {retentionData.atRisk.length > 0 ? (
                  <div className="table-wrapper">
                    <table>
                      <thead><tr><th>Name</th><th>Member ID</th><th>Phone</th><th>Expiry</th></tr></thead>
                      <tbody>
                        {retentionData.atRisk.map(m => (
                          <tr key={m.memberId}>
                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.fullName}</td>
                            <td style={{ fontFamily: 'monospace', color: 'var(--text-accent)' }}>{m.memberId}</td>
                            <td>{m.phone}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{m.expiryDate ? new Date(m.expiryDate).toLocaleDateString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <div className="empty-state"><UserCheck size={32} /><h3>All members are active!</h3><p>No at-risk members found</p></div>}
              </div>
            </>
          )}

          {/* ─── STAFF TAB ─── */}
          {tab === 'Staff' && staffData && (
            <>
              <div className="card">
                <div className="card-header"><h3><Activity size={18} style={{ color: 'var(--accent-primary)', marginRight: '0.5rem' }} />Staff Performance This Month</h3></div>
                {staffData.length > 0 ? (
                  <>
                    <ReportCharts type="staff" data={staffData} />
                    <div className="table-wrapper" style={{ marginTop: '1rem' }}>
                      <table>
                        <thead><tr><th>Staff</th><th>Role</th><th>Check-ins</th><th>Sales</th><th>Sales Revenue</th></tr></thead>
                        <tbody>
                          {staffData.map(s => (
                            <tr key={s.id}>
                              <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.fullName}</td>
                              <td><span className="badge badge-active" style={{ textTransform: 'capitalize' }}>{s.role}</span></td>
                              <td>{s.checkins}</td>
                              <td>{s.sales}</td>
                              <td style={{ fontWeight: 600 }}>{formatCurrency(s.salesRevenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : <div className="empty-state"><Activity size={32} /><h3>No staff data</h3></div>}
              </div>
            </>
          )}
        </>
      )}
    </ProtectedLayout>
  );
}
