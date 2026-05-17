'use client';
import { useState, useEffect, useCallback } from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import api from '@/lib/api';
import { Bell, Check, AlertTriangle, Info, AlertCircle, X, Clock, CheckCircle, Wrench, DollarSign, Users } from 'lucide-react';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.append('isRead', filter);
      if (typeFilter) params.append('type', typeFilter);
      const { data } = await api.get(`/alerts?${params}`);
      const list = data.data || [];
      setAlerts(list);
      setUnreadCount(list.filter(a => !a.isRead).length);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filter, typeFilter]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const markRead = async (id) => {
    try { await api.patch(`/alerts/${id}/read`); fetchAlerts(); }
    catch (err) { console.error(err); }
  };

  const markAllRead = async () => {
    try {
      const unread = alerts.filter(a => !a.isRead);
      await Promise.all(unread.map(a => api.patch(`/alerts/${a.id}/read`)));
      fetchAlerts();
    } catch (err) { console.error(err); }
  };

  const getAlertStyle = (type, severity) => {
    if (type?.includes('expir')) return { borderColor: '#f59e0b', icon: <Clock size={18} style={{ color: '#f59e0b' }} />, colorClass: 'alert-warning' };
    if (type?.includes('maintenance')) return { borderColor: '#3b82f6', icon: <Wrench size={18} style={{ color: '#3b82f6' }} />, colorClass: 'alert-info' };
    if (type?.includes('payment') || type?.includes('due')) return { borderColor: '#f59e0b', icon: <DollarSign size={18} style={{ color: '#f59e0b' }} />, colorClass: 'alert-warning' };
    if (type?.includes('renew')) return { borderColor: '#22c55e', icon: <CheckCircle size={18} style={{ color: '#22c55e' }} />, colorClass: 'alert-success' };
    if (severity === 'critical') return { borderColor: '#ef4444', icon: <AlertCircle size={18} style={{ color: '#ef4444' }} />, colorClass: 'alert-danger' };
    if (severity === 'warning') return { borderColor: '#f59e0b', icon: <AlertTriangle size={18} style={{ color: '#f59e0b' }} />, colorClass: 'alert-warning' };
    return { borderColor: '#64748b', icon: <Info size={18} style={{ color: '#64748b' }} />, colorClass: 'alert-system' };
  };

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <ProtectedLayout title="Alerts" actions={
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {unreadCount > 0 && (
          <span className="badge badge-expiring" style={{ fontSize: '0.75rem' }}>{unreadCount} unread</span>
        )}
        <button className="btn btn-secondary btn-sm" onClick={markAllRead}>
          <Check size={14} /> Mark All Read
        </button>
      </div>
    }>
      {/* Filter Tabs */}
      <div className="tab-filters">
        {[
          { v: '', l: 'All' },
          { v: 'false', l: 'Unread' },
          { v: 'true', l: 'Read' },
        ].map(t => (
          <button key={t.v} className={`tab-filter ${filter === t.v ? 'active' : ''}`} onClick={() => setFilter(t.v)}>{t.l}</button>
        ))}
        <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 0.25rem' }} />
        {['', 'membership', 'maintenance', 'payment'].map(t => (
          <button key={t} className={`tab-filter ${typeFilter === t ? 'active' : ''}`} onClick={() => setTypeFilter(t)}>
            {t || 'All Types'}
          </button>
        ))}
      </div>

      {loading ? <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>{[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: '72px', borderRadius: 'var(--radius-md)' }} />)}</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {alerts.length > 0 ? alerts.map((a) => {
            const style = getAlertStyle(a.type, a.severity);
            return (
              <div key={a.id} className={`alert-item stagger-item ${style.colorClass}`} style={{ opacity: a.isRead ? 0.55 : 1 }}>
                {/* Icon circle */}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {style.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                    {a.message}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontSize: '0.65rem', textTransform: 'capitalize' }}>
                      {a.type}
                    </span>
                    <span>{formatTimeAgo(a.createdAt)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                  {!a.isRead && (
                    <button className="btn btn-ghost btn-sm" onClick={() => markRead(a.id)} title="Mark as read">
                      <Check size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          }) : (
            <div className="empty-state" style={{ padding: '4rem 2rem' }}>
              <Bell size={48} />
              <h3>No More Recent Alerts</h3>
              <p style={{ color: 'var(--text-muted)' }}>You&apos;re all caught up!</p>
            </div>
          )}
        </div>
      )}
    </ProtectedLayout>
  );
}
