'use client';

import { useState, useEffect, useCallback } from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import api from '@/lib/api';
import { CalendarCheck, Search, Download, Users, CheckCircle, XCircle } from 'lucide-react';

export default function AttendancePage() {
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState({ total: 0, granted: 0, denied: 0 });

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 25 });
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
      if (statusFilter) params.append('status', statusFilter);
      if (memberSearch) params.append('search', memberSearch);
      const { data } = await api.get(`/attendance?${params}`);
      const recs = data.data || [];
      setRecords(recs);
      setPagination(data.pagination || {});
      
      const granted = recs.filter(r => r.result === 'granted').length;
      const denied = recs.filter(r => r.result === 'denied').length;
      setStats({
        total: data.pagination?.total || recs.length,
        granted: data.pagination?.total ? Math.round((granted / recs.length) * data.pagination.total) : granted,
        denied: data.pagination?.total ? Math.round((denied / recs.length) * data.pagination.total) : denied,
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, fromDate, toDate, statusFilter, memberSearch]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  const handleSearch = () => { setPage(1); fetchAttendance(); };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <ProtectedLayout title="Attendance History">
      {/* Filter Bar */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>From</label>
            <input className="form-input" type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} style={{ width: '160px' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>To</label>
            <input className="form-input" type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} style={{ width: '160px' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>Result Filter</label>
            <select className="form-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ width: '130px' }}>
              <option value="">All</option>
              <option value="granted">Granted</option>
              <option value="denied">Denied</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>Member Search</label>
            <input className="form-input" placeholder="Name or ID..." value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={handleSearch} style={{ borderRadius: 'var(--radius-lg)' }}>
            <Search size={14} /> Search
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="stat-label">TOTAL RECORDS</div>
              <div className="stat-value">{stats.total.toLocaleString()}</div>
              <div className="stat-change positive">+12% from last month</div>
            </div>
            <Users size={28} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--success)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="stat-label">GRANTED</div>
              <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.granted.toLocaleString()}</div>
              <div style={{ width: '100%', height: 4, background: 'var(--bg-elevated)', borderRadius: 4, marginTop: '0.5rem' }}>
                <div style={{ width: `${stats.total ? (stats.granted / stats.total) * 100 : 0}%`, height: '100%', background: 'var(--success)', borderRadius: 4 }} />
              </div>
            </div>
            <CheckCircle size={28} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--danger)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="stat-label">DENIED</div>
              <div className="stat-value" style={{ color: 'var(--danger)' }}>{stats.denied}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {stats.denied} expired, wrong-day, duplicate
              </div>
            </div>
            <XCircle size={28} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
          </div>
        </div>
      </div>

      {/* Check-in Logs */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem' }}>Check-in Logs</h3>
          <button className="btn btn-secondary btn-sm"><Download size={14} /> Export CSV</button>
        </div>

        {loading ? (
          <div className="loading-page" style={{ minHeight: '30vh' }}><div className="spinner spinner-lg"></div></div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>TIME</th>
                  <th>MEMBER</th>
                  <th>PLAN</th>
                  <th>RESULT</th>
                  <th>DENY REASON</th>
                </tr>
              </thead>
              <tbody>
                {records.length > 0 ? records.map((r, i) => (
                  <tr key={i}>
                    <td>{formatDate(r.checkedInAt || r.date)}</td>
                    <td>{formatTime(r.checkedInAt)}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.fullName}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.memberId}</div>
                    </td>
                    <td><span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.65rem' }}>{r.planType || '—'}</span></td>
                    <td><span className={`badge badge-${r.result}`}>● {r.result?.toUpperCase()}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontStyle: r.denyReason ? 'italic' : 'normal' }}>{r.denyReason || '—'}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={6}><div className="empty-state"><CalendarCheck size={32} /><h3>No records found</h3></div></td></tr>
                )}
              </tbody>
            </table>

            {pagination.totalPages > 1 && (
              <div className="pagination">
                <div className="pagination-info">Showing {((page - 1) * 25) + 1} to {Math.min(page * 25, pagination.total)} of {pagination.total} entries</div>
                <div className="pagination-buttons">
                  <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                  {Array.from({ length: Math.min(3, pagination.totalPages) }, (_, i) => i + 1).map(p => (
                    <button key={p} className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPage(p)}>{p}</button>
                  ))}
                  <button className="btn btn-secondary btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedLayout>
  );
}
