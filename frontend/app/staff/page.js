'use client';

import { useState, useEffect, useCallback } from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import api from '@/lib/api';
import { Plus, UserCog, Shield, Mail, Phone, Clock } from 'lucide-react';

const ROLE_STYLES = {
  owner: { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa', label: 'Owner', icon: Shield },
  receptionist: { bg: 'rgba(45,212,191,0.15)', color: '#2dd4bf', label: 'Receptionist', icon: UserCog },
  trainer: { bg: 'rgba(231,195,101,0.15)', color: '#e7c365', label: 'Trainer', icon: UserCog },
};

const AVATAR_COLORS = ['#a78bfa', '#2dd4bf', '#e7c365', '#f59e0b', '#22c55e', '#ef4444'];

export default function StaffPage() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/staff');
      setStaffList(data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??';

  return (
    <ProtectedLayout title="Staff Management" actions={
      <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ borderRadius: 'var(--radius-lg)' }}>
        <Plus size={16} /> Add Staff
      </button>
    }>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', marginTop: '-0.5rem' }}>
        Manage team members, roles, and access permissions
      </p>

      {loading ? (
        <div className="loading-page" style={{ minHeight: '40vh' }}><div className="spinner spinner-lg"></div></div>
      ) : (
        staffList.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
            {staffList.map((s, i) => {
              const roleStyle = ROLE_STYLES[s.role] || ROLE_STYLES.receptionist;
              return (
                <div key={s.id} className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                    {/* Avatar */}
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                      background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 700, fontSize: '0.9rem',
                    }}>
                      {getInitials(s.fullName)}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>{s.fullName}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          padding: '0.2rem 0.625rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600,
                          background: roleStyle.bg, color: roleStyle.color, textTransform: 'capitalize',
                        }}>
                          {roleStyle.label}
                        </span>
                        <span className={`badge ${s.status === 'active' ? 'badge-active' : 'badge-expired'}`}>
                          {s.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.825rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                      <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                      {s.email}
                    </div>
                    {s.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                        <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                        {s.phone}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      <Clock size={14} />
                      Last login: {s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '4rem 2rem' }}>
            <UserCog size={48} />
            <h3>No Staff Members</h3>
            <p style={{ color: 'var(--text-muted)' }}>Add your first team member to get started</p>
          </div>
        )
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>Add Staff Member</h2><button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button></div>
            <AddStaffForm onSuccess={() => { setShowModal(false); fetchStaff(); }} />
          </div>
        </div>
      )}
    </ProtectedLayout>
  );
}

function AddStaffForm({ onSuccess }) {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', role: 'receptionist', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/staff', form);
      onSuccess();
    } catch (err) { setError(err.response?.data?.error?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div style={{ padding: '0.75rem', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--danger)' }}>{error}</div>}
      <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
        <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div className="form-group"><label className="form-label">Role</label><select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="receptionist">Receptionist</option><option value="trainer">Trainer</option><option value="owner">Owner</option></select></div>
        <div className="form-group"><label className="form-label">Password</label><input className="form-input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} /></div>
      </div>
      <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => {}}>Cancel</button><button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <div className="spinner" style={{ borderTopColor: 'white' }}></div> : 'Create Staff'}</button></div>
    </form>
  );
}
