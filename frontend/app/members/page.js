'use client';

import { useState, useEffect, useCallback } from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import api from '@/lib/api';
import { Plus, Search, Filter, Eye, QrCode, UserX, CreditCard, RotateCw, Camera } from 'lucide-react';

export default function MembersPage() {
  const { staff } = useAuth();
  const toast = useToast();
  const [members, setMembers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showQR, setShowQR] = useState(null);
  const [printingCard, setPrintingCard] = useState(null);
  const [showRenewModal, setShowRenewModal] = useState(null); // memberId being printed
  const [availablePlans, setAvailablePlans] = useState([]);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (planFilter) params.append('plan', planFilter);

      const { data } = await api.get(`/members?${params}`);
      setMembers(data.data || []);
      setPagination(data.pagination || {});
    } catch (err) {
      console.error('Fetch members error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, planFilter]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  // Fetch available plans for filter dropdown
  useEffect(() => {
    api.get('/settings/plans/active')
      .then(res => setAvailablePlans(res.data.data || []))
      .catch(() => setAvailablePlans([
        { type: '3-day', name: '3-Day' },
        { type: 'full-week', name: 'Full Week' },
      ]));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchMembers();
  };

  const viewMember = async (memberId) => {
    try {
      const { data } = await api.get(`/members/${memberId}`);
      setSelectedMember(data.data);
    } catch (err) {
      console.error('View member error:', err);
    }
  };

  const viewQR = async (memberId) => {
    try {
      const { data } = await api.get(`/members/${memberId}/qr`);
      // Find member name from the list
      const member = members.find(m => m.memberId === memberId);
      setShowQR({ ...data.data, fullName: member?.fullName || '' });
    } catch (err) {
      console.error('QR fetch error:', err);
    }
  };

  const downloadCard = async (memberId) => {
    setPrintingCard(memberId);
    try {
      const response = await api.get(`/members/${memberId}/card`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `GymX-Card-${memberId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Card downloaded successfully');
      fetchMembers();
    } catch (err) {
      console.error('Card download error:', err);
      toast.error('Failed to download card. Please try again.');
    } finally {
      setPrintingCard(null);
    }
  };

  const getBadgeClass = (status) => {
    const map = { active: 'badge-active', expired: 'badge-expired', suspended: 'badge-suspended', frozen: 'badge-frozen' };
    return map[status] || '';
  };

  return (
    <ProtectedLayout
      title="Members"
      actions={
        (staff?.role === 'owner' || staff?.role === 'receptionist') && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ borderRadius: 'var(--radius-lg)' }}>
            <Plus size={16} /> Add Member
          </button>
        )
      }
    >
      {/* Filters */}
      <div style={{
        display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <div className="topbar-search" style={{ flex: 1, minWidth: '250px' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            placeholder="Search by name, phone, or member ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(e); }}
          />
        </div>

        <select className="form-select" value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }} style={{ width: '150px' }}>
          <option value="">All Plans</option>
          {[...new Map(availablePlans.map(p => [p.type, p])).values()].map(p => (
            <option key={p.type} value={p.type}>{p.name || p.type}</option>
          ))}
        </select>
      </div>

      {/* Status Tabs */}
      <div className="tab-filters">
        {[{ v: '', l: 'All' }, { v: 'active', l: 'Active' }, { v: 'expired', l: 'Expired' }, { v: 'suspended', l: 'Suspended' }, { v: 'frozen', l: 'Frozen' }].map(t => (
          <button key={t.v} className={`tab-filter ${statusFilter === t.v ? 'active' : ''}`} onClick={() => { setStatusFilter(t.v); setPage(1); }}>{t.l}</button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-page" style={{ minHeight: '40vh' }}>
          <div className="spinner spinner-lg"></div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Phone</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Days Left</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.length > 0 ? members.map((m) => (
                <tr key={m.memberId}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: m.photoUrl ? 'transparent' : 'var(--accent-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 700, color: 'white',
                        overflow: 'hidden', flexShrink: 0,
                      }}>
                        {m.photoUrl
                          ? <img src={m.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : m.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                        }
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.fullName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.memberId}</div>
                      </div>
                    </div>
                  </td>
                  <td>{m.phone}</td>
                  <td>
                    <span style={{ textTransform: 'capitalize' }}>{m.plan?.type}</span>
                  </td>
                  <td>
                    <span className={`badge ${getBadgeClass(m.status)}`}>{m.status}</span>
                  </td>
                  <td>
                    {(() => {
                      const ps = m.paymentStatus || 'unpaid';
                      const colors = { paid: 'var(--success)', partial: 'var(--warning)', unpaid: 'var(--danger)', overdue: '#dc2626' };
                      const bgs = { paid: 'rgba(16,185,129,0.12)', partial: 'rgba(245,158,11,0.12)', unpaid: 'rgba(239,68,68,0.12)', overdue: 'rgba(220,38,38,0.15)' };
                      return <span style={{ padding: '0.2rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600, background: bgs[ps], color: colors[ps] }}>{ps.toUpperCase()}</span>;
                    })()}
                  </td>
                  <td>
                    <span style={{
                      color: m.plan?.daysRemaining <= 5 ? 'var(--danger)' :
                             m.plan?.daysRemaining <= 14 ? 'var(--warning)' : 'var(--text-secondary)',
                      fontWeight: m.plan?.daysRemaining <= 5 ? 700 : 400,
                    }}>
                      {m.plan?.daysRemaining != null ? `${m.plan.daysRemaining}d` : '—'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => viewMember(m.memberId)} title="View">
                        <Eye size={15} />
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => viewQR(m.memberId)} title="QR Code">
                        <QrCode size={15} />
                      </button>
                      {(staff?.role === 'owner' || staff?.role === 'receptionist') && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => downloadCard(m.memberId)}
                            title="Print Card"
                            disabled={printingCard === m.memberId}
                            style={{ color: 'var(--accent-primary)' }}
                          >
                            {printingCard === m.memberId
                              ? <div className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }}></div>
                              : <CreditCard size={15} />
                            }
                          </button>
                          {m.card?.issuedAt && (
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              Issued {new Date(m.card.issuedAt).toLocaleDateString('en-GB')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <UserX size={32} />
                      <h3>No members found</h3>
                      <p>Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <div className="pagination-info">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </div>
              <div className="pagination-buttons">
                <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  Previous
                </button>
                <button className="btn btn-secondary btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Member Detail Modal */}
      {selectedMember && (
        <div className="modal-overlay" onClick={() => setSelectedMember(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h2>{selectedMember.fullName}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedMember(null)}>✕</button>
            </div>

            {/* Photo Section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: selectedMember.photoUrl ? 'transparent' : 'var(--accent-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem', fontWeight: 700, color: 'white',
                overflow: 'hidden', flexShrink: 0,
                border: '3px solid var(--border)',
              }}>
                {selectedMember.photoUrl
                  ? <img src={selectedMember.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : selectedMember.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                }
              </div>
              {(staff?.role === 'owner' || staff?.role === 'receptionist') && (
                <div>
                  <label style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                    padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <Camera size={14} /> {selectedMember.photoUrl ? 'Change Photo' : 'Add Photo'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      // Compress and convert to base64
                      const canvas = document.createElement('canvas');
                      const ctx = canvas.getContext('2d');
                      const img = new Image();
                      img.onload = async () => {
                        const size = 200;
                        canvas.width = size;
                        canvas.height = size;
                        const scale = Math.max(size / img.width, size / img.height);
                        const x = (size - img.width * scale) / 2;
                        const y = (size - img.height * scale) / 2;
                        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                        const base64 = canvas.toDataURL('image/jpeg', 0.8);
                        try {
                          await api.put(`/members/${selectedMember.memberId}/photo`, { photoUrl: base64 });
                          setSelectedMember(prev => ({ ...prev, photoUrl: base64 }));
                          fetchMembers();
                          toast.success('Photo updated');
                        } catch (err) { toast.error('Failed to upload photo'); }
                      };
                      img.src = URL.createObjectURL(file);
                    }} />
                  </label>
                  {selectedMember.photoUrl && (
                    <button className="btn btn-ghost btn-sm" style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--danger)' }}
                      onClick={async () => {
                        try {
                          await api.put(`/members/${selectedMember.memberId}/photo`, { photoUrl: null });
                          setSelectedMember(prev => ({ ...prev, photoUrl: null }));
                          fetchMembers();
                          toast.success('Photo removed');
                        } catch (err) { toast.error('Failed to remove photo'); }
                      }}
                    >Remove</button>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Member ID</label>
                <div style={{ color: 'var(--text-accent)', fontFamily: 'monospace' }}>{selectedMember.memberId}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <span className={`badge ${getBadgeClass(selectedMember.status)}`}>{selectedMember.status}</span>
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <div>{selectedMember.phone}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Plan</label>
                <div style={{ textTransform: 'capitalize' }}>{selectedMember.plan?.type} ({selectedMember.plan?.durationMonths}mo)</div>
              </div>
              <div className="form-group">
                <label className="form-label">Expiry Date</label>
                <div>{selectedMember.plan?.expiryDate ? new Date(selectedMember.plan.expiryDate).toLocaleDateString() : '—'}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Days Remaining</label>
                <div style={{
                  fontWeight: 700,
                  color: selectedMember.plan?.daysRemaining <= 5 ? 'var(--danger)' : 'var(--text-primary)',
                }}>{selectedMember.plan?.daysRemaining ?? '—'}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Total Visits</label>
                <div>{selectedMember.stats?.totalVisits || 0}</div>
              </div>
              <div className="form-group">
                <label className="form-label">This Month</label>
                <div>{selectedMember.stats?.visitsThisMonth || 0}</div>
              </div>
              {selectedMember.assignedTrainer && (
                <div className="form-group">
                  <label className="form-label">Trainer</label>
                  <div>{selectedMember.assignedTrainer.fullName}</div>
                </div>
              )}
              {selectedMember.emergencyContact?.name && (
                <div className="form-group">
                  <label className="form-label">Emergency Contact</label>
                  <div>{selectedMember.emergencyContact.name} — {selectedMember.emergencyContact.phone}</div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => viewQR(selectedMember.memberId)}>
                <QrCode size={16} /> View QR
              </button>
              {(staff?.role === 'owner' || staff?.role === 'receptionist') && (selectedMember.status === 'expired' || selectedMember.plan?.daysRemaining <= 5) && (
                <button className="btn btn-primary" onClick={() => { setShowRenewModal(selectedMember); setSelectedMember(null); }}>
                  <RotateCw size={16} /> Renew Membership
                </button>
              )}
              <button className="btn btn-primary" onClick={() => downloadCard(selectedMember.memberId)}>
                <CreditCard size={16} /> Download Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQR && (
        <div className="modal-overlay" onClick={() => setShowQR(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: '380px' }}>
            <div className="modal-header">
              <h2>QR Code</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowQR(null)}>✕</button>
            </div>
            <div style={{ padding: '1.25rem', background: 'white', borderRadius: 'var(--radius-md)', display: 'inline-block' }}>
              {showQR.qrCodeBase64 && (
                <img id="qr-image" src={showQR.qrCodeBase64} alt="QR Code" style={{ width: '250px', height: '250px' }} />
              )}
            </div>
            <p style={{ marginTop: '0.75rem', fontFamily: 'monospace', color: 'var(--text-accent)', fontWeight: 700, fontSize: '1.1rem' }}>
              {showQR.memberId}
            </p>
            {showQR.fullName && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>{showQR.fullName}</p>
            )}
            <div className="modal-footer" style={{ justifyContent: 'center', gap: '0.5rem' }}>
              {/* Download QR as PNG */}
              <button className="btn btn-primary" onClick={() => {
                const canvas = document.createElement('canvas');
                const size = 400;
                canvas.width = size;
                canvas.height = size + 60;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                const img = document.getElementById('qr-image');
                if (img) {
                  ctx.drawImage(img, 50, 20, 300, 300);
                }
                ctx.fillStyle = '#1a1133';
                ctx.font = 'bold 18px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(showQR.memberId, size / 2, size + 10);
                if (showQR.fullName) {
                  ctx.font = '14px sans-serif';
                  ctx.fillStyle = '#6B7280';
                  ctx.fillText(showQR.fullName, size / 2, size + 35);
                }
                const link = document.createElement('a');
                link.download = `GymX-QR-${showQR.memberId}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
              }}>
                Download QR
              </button>
              {/* Print QR */}
              <button className="btn btn-secondary" onClick={() => {
                const printWindow = window.open('', '_blank');
                printWindow.document.write(`<html><body style="display:flex;align-items:center;justify-content:center;min-height:100vh"><div style="text-align:center"><img src="${showQR.qrCodeBase64}" width="300"/><p style="font-family:monospace;font-size:1.5rem;margin-top:1rem">${showQR.memberId}</p>${showQR.fullName ? `<p style="font-size:1.1rem;color:#6B7280">${showQR.fullName}</p>` : ''}</div></body></html>`);
                printWindow.document.close();
                printWindow.print();
              }}>
                Print QR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showModal && <AddMemberModal onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); fetchMembers(); toast.success('Member registered successfully'); }} />}

      {/* Renew Membership Modal */}
      {showRenewModal && <RenewModal member={showRenewModal} onClose={() => setShowRenewModal(null)} onSuccess={() => { setShowRenewModal(null); fetchMembers(); toast.success('Membership renewed successfully'); }} />}
    </ProtectedLayout>
  );
}

function AddMemberModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    fullName: '', phone: '', planType: '3-day', durationMonths: 1,
    allowedDays: [1, 3, 5], startDate: new Date().toISOString().split('T')[0],
    planPrice: 0,
  });
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);

  // Fetch dynamic plans on mount
  useEffect(() => {
    api.get('/settings/plans/active')
      .then(res => {
        const p = res.data.data || [];
        setPlans(p);
        if (p.length > 0) {
          setForm(prev => ({
            ...prev,
            planType: p[0].type,
            durationMonths: p[0].durationMonths,
            planPrice: p[0].price || 0,
          }));
        }
      })
      .catch(() => {
        // Fallback: hardcoded plans
        setPlans([
          { name: '3-Day Plan', type: '3-day', durationMonths: 1, price: 50000 },
          { name: 'Full Week', type: 'full-week', durationMonths: 1, price: 80000 },
        ]);
      });
  }, []);

  const selectPlan = (plan) => {
    setForm(prev => ({
      ...prev,
      planType: plan.type,
      durationMonths: plan.durationMonths,
      planPrice: plan.price || 0,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/members', {
        fullName: form.fullName,
        phone: form.phone,
        photoUrl: photoPreview || null,
        plan: {
          type: form.planType,
          durationMonths: parseInt(form.durationMonths),
          startDate: form.startDate,
          allowedDays: form.planType === '3-day' ? form.allowedDays : null,
        },
        planPrice: form.planPrice,
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create member');
    } finally {
      setLoading(false);
    }
  };

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const toggleDay = (day) => {
    setForm(prev => {
      const days = prev.allowedDays.includes(day)
        ? prev.allowedDays.filter(d => d !== day)
        : [...prev.allowedDays, day];
      return { ...prev, allowedDays: days.slice(0, 3) };
    });
  };

  const formatPrice = (cents) => `${(cents / 100).toLocaleString()} ETB`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Register New Member</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--danger)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" placeholder="+251..." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          </div>

          {/* Optional Photo */}
          <div className="form-group">
            <label className="form-label">Photo <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: photoPreview ? 'transparent' : 'var(--bg-elevated)',
                border: '2px dashed var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', flexShrink: 0,
              }}>
                {photoPreview
                  ? <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <Camera size={20} style={{ color: 'var(--text-muted)' }} />
                }
              </div>
              <label style={{
                padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)',
              }}>
                {photoPreview ? 'Change' : 'Upload Photo'}
                <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  // No file size limit — compression handles everything
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  const img = new Image();
                  img.onload = () => {
                    const size = 300; // Larger for better card print quality
                    canvas.width = size;
                    canvas.height = size;
                    ctx.fillStyle = '#1a1f35'; // Dark background fill
                    ctx.fillRect(0, 0, size, size);
                    const scale = Math.max(size / img.width, size / img.height);
                    const x = (size - img.width * scale) / 2;
                    const y = (size - img.height * scale) / 2;
                    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                    setPhotoPreview(canvas.toDataURL('image/jpeg', 0.75));
                    URL.revokeObjectURL(img.src);
                  };
                  img.onerror = () => {
                    setError('Could not load image. Try a different photo.');
                    URL.revokeObjectURL(img.src);
                  };
                  img.src = URL.createObjectURL(file);
                }} />
              </label>
              {photoPreview && (
                <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', color: 'var(--danger)' }}
                  onClick={() => setPhotoPreview(null)}>Remove</button>
              )}
            </div>
          </div>

          {/* Plan Selection */}
          <div className="form-group">
            <label className="form-label">Membership Plan</label>
            <div style={{ display: 'grid', gridTemplateColumns: plans.length > 2 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: '0.5rem' }}>
              {plans.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectPlan(p)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${form.planType === p.type && form.durationMonths === p.durationMonths ? 'var(--accent-primary)' : 'var(--border)'}`,
                    background: form.planType === p.type && form.durationMonths === p.durationMonths ? 'var(--info-bg)' : 'var(--bg-elevated)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 150ms ease',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{p.name || p.type}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.durationMonths}mo</div>
                  {p.price > 0 && <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '0.25rem' }}>{formatPrice(p.price)}</div>}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Duration (months)</label>
              <input className="form-input" type="number" min={1} max={24} value={form.durationMonths} onChange={(e) => setForm({ ...form, durationMonths: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input className="form-input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
          </div>

          {form.planType === '3-day' && (
            <div className="form-group">
              <label className="form-label">Allowed Days (pick 3)</label>
              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                {dayNames.map((name, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i + 1)}
                    className={`btn btn-sm ${form.allowedDays.includes(i + 1) ? 'btn-primary' : 'btn-secondary'}`}
                  >{name}</button>
                ))}
              </div>
            </div>
          )}

          {form.planPrice > 0 && (
            <div style={{ padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', textAlign: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Amount Due: </span>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent-primary)' }}>{formatPrice(form.planPrice)}</span>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <div className="spinner" style={{ borderTopColor: 'white' }}></div> : 'Register'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RenewModal({ member, onClose, onSuccess }) {
  const [form, setForm] = useState({
    type: member.plan?.type || 'full-week',
    durationMonths: 1,
    startDate: new Date().toISOString().split('T')[0],
    allowedDays: member.plan?.allowedDays || [1, 3, 5],
    planPrice: 0,
  });
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/settings/plans/active')
      .then(res => {
        const p = res.data.data || [];
        setPlans(p);
        const match = p.find(pl => pl.type === form.type);
        if (match) setForm(prev => ({ ...prev, planPrice: match.price || 0 }));
      })
      .catch(() => {});
  }, []);

  const selectPlan = (plan) => {
    setForm(prev => ({
      ...prev, type: plan.type, durationMonths: plan.durationMonths, planPrice: plan.price || 0,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.patch(`/members/${member.memberId}/plan`, {
        type: form.type,
        durationMonths: parseInt(form.durationMonths),
        startDate: form.startDate,
        allowedDays: form.type === '3-day' ? form.allowedDays : undefined,
        planPrice: form.planPrice,
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to renew');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (cents) => `${(cents / 100).toLocaleString()} ETB`;
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const toggleDay = (day) => {
    setForm(prev => {
      const days = prev.allowedDays.includes(day) ? prev.allowedDays.filter(d => d !== day) : [...prev.allowedDays, day];
      return { ...prev, allowedDays: days.slice(0, 3) };
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Renew — {member.fullName}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '0.75rem', background: 'var(--warning-bg)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--warning)' }}>
          Current plan expired {member.plan?.expiryDate ? new Date(member.plan.expiryDate).toLocaleDateString() : ''}. Select a new plan below.
        </div>

        {error && (
          <div style={{ padding: '0.75rem', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--danger)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {plans.length > 0 && (
            <div className="form-group">
              <label className="form-label">Select Plan</label>
              <div style={{ display: 'grid', gridTemplateColumns: plans.length > 2 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: '0.5rem' }}>
                {plans.map((p, i) => (
                  <button key={i} type="button" onClick={() => selectPlan(p)} style={{
                    padding: '0.75rem', borderRadius: 'var(--radius-md)',
                    border: `2px solid ${form.type === p.type && form.durationMonths === p.durationMonths ? 'var(--accent-primary)' : 'var(--border)'}`,
                    background: form.type === p.type && form.durationMonths === p.durationMonths ? 'var(--info-bg)' : 'var(--bg-elevated)',
                    cursor: 'pointer', textAlign: 'center',
                  }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{p.name || p.type}</div>
                    {p.price > 0 && <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '0.25rem' }}>{formatPrice(p.price)}</div>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Duration (months)</label>
              <input className="form-input" type="number" min={1} max={24} value={form.durationMonths} onChange={(e) => setForm({ ...form, durationMonths: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input className="form-input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
          </div>

          {form.type === '3-day' && (
            <div className="form-group">
              <label className="form-label">Allowed Days (pick 3)</label>
              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                {dayNames.map((name, i) => (
                  <button key={i} type="button" onClick={() => toggleDay(i + 1)}
                    className={`btn btn-sm ${form.allowedDays.includes(i + 1) ? 'btn-primary' : 'btn-secondary'}`}
                  >{name}</button>
                ))}
              </div>
            </div>
          )}

          {form.planPrice > 0 && (
            <div style={{ padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', textAlign: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Amount Due: </span>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent-primary)' }}>{formatPrice(form.planPrice)}</span>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <div className="spinner" style={{ borderTopColor: 'white' }}></div> : 'Renew Membership'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

