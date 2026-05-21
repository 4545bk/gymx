'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import api from '@/lib/api';
import Link from 'next/link';
import { Plus, Search, Eye, QrCode, UserX, CreditCard, RotateCw, Camera, MoreVertical, Edit3, Trash2, ShieldAlert, ShieldCheck, Ban, Snowflake, DollarSign, Banknote, Download, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { formatExpiry, formatBilingual } from '@/lib/ethiopianDate';
import { fmtETB } from '@/lib/currency';
import { useBranch } from '@/lib/branchContext';

const PAYMENT_VARIANT = { paid: 'success', partial: 'warning', unpaid: 'danger', overdue: 'danger' };
const STATUS_VARIANT = { active: 'success', expired: 'danger', suspended: 'warning', frozen: 'info' };

export default function MembersPage() {
  const { staff } = useAuth();
  const toast = useToast();
  const { t } = useI18n();
  const [members, setMembers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [showModal, setShowModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showQR, setShowQR] = useState(null);
  const [printingCard, setPrintingCard] = useState(null);
  const [showRenewModal, setShowRenewModal] = useState(null);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [openMenu, setOpenMenu] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [showEditModal, setShowEditModal] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(null);
  const menuRef = useRef(null);
  const sentinelRef = useRef(null);

  // Prefetch next page when sentinel is in view
  useEffect(() => {
    if (!sentinelRef.current || page >= pagination.totalPages) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        api.get('/members', {
          params: { page: page + 1, limit, search: debouncedSearch, status: statusFilter, plan: planFilter }
        }).catch(() => {});
      }
    }, { rootMargin: '200px' });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [page, limit, debouncedSearch, statusFilter, planFilter, pagination.totalPages]);

  // Debounce search (300ms)
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    };
    if (openMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenu]);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      if (debouncedSearch) params.append('search', debouncedSearch);
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
  }, [page, limit, debouncedSearch, statusFilter, planFilter]);

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

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??';

  function LazyMemberPhoto({ src, fullName }) {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      }, { rootMargin: '100px' });
      if (ref.current) observer.observe(ref.current);
      return () => observer.disconnect();
    }, []);
    return (
      <div ref={ref} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isVisible && src ? (
          <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          getInitials(fullName)
        )}
      </div>
    );
  }
  const startItem = ((pagination.page || 1) - 1) * limit + 1;
  const endItem = Math.min(startItem + limit - 1, pagination.total || 0);

  return (
    <ProtectedLayout>
      {/* ─── Page Header ──────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{t('members.title')}</h1>
          {pagination.total > 0 && (
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '2px 10px', borderRadius: 9999 }}>
              {pagination.total}
            </span>
          )}
        </div>
        {(staff?.role === 'owner' || staff?.role === 'receptionist') && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/members/import" style={{ textDecoration: 'none' }}>
              <button className="btn btn-secondary" style={{ borderRadius: 'var(--radius-md)' }}>
                <Upload size={16} /> Import
              </button>
            </Link>
            <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ borderRadius: 'var(--radius-md)' }}>
              <Plus size={16} /> {t('members.addMember')}
            </button>
          </div>
        )}
      </div>

      {/* ─── Search & Filter ──────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{
          flex: 1, minWidth: 240, display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
          padding: '0 12px', height: 36,
        }}>
          <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            placeholder={t('members.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-sans)', width: '100%' }}
          />
        </div>
        <select className="form-select" value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
          style={{ width: 140, height: 36, fontSize: 'var(--text-sm)', borderRadius: 'var(--radius-md)' }}>
          <option value="">{t('common.allPlans')}</option>
          {[...new Map(availablePlans.map(p => [p.type, p])).values()].map(p => (
            <option key={p.type} value={p.type}>{p.name || p.type}</option>
          ))}
        </select>
      </div>

      {/* ─── Status Filter Pills ──────────────────────── */}
      <div className="tab-filters">
        {[{ v: '', l: t('members.filterAll') }, { v: 'active', l: t('members.filterActive') }, { v: 'expired', l: t('members.filterExpired') }, { v: 'suspended', l: t('members.filterSuspended') }, { v: 'frozen', l: t('members.filterFrozen') }].map(f => (
          <button key={f.v} className={`tab-filter ${statusFilter === f.v ? 'active' : ''}`} onClick={() => { setStatusFilter(f.v); setPage(1); }}>{f.l}</button>
        ))}
      </div>

      {/* ─── Member List ──────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 64, borderRadius: 'var(--radius-md)' }} />
          ))}
        </div>
      ) : members.length > 0 ? (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xs)', overflow: 'hidden',
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 120px 100px',
            padding: '10px 20px', background: 'var(--bg-elevated)',
            borderBottom: '1px solid var(--border)',
            fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)',
            color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            <span>{t('common.member')}</span>
            <span className="hide-mobile">{t('members.plan')}</span>
            <span>{t('members.payment')}</span>
            <span style={{ textAlign: 'right' }}>{t('members.actions')}</span>
          </div>

          {/* Rows */}
          {members.map((m) => {
            const ps = m.paymentStatus || 'unpaid';
            const daysLeft = m.plan?.daysRemaining;
            const expiryWarning = daysLeft != null && daysLeft <= 7 && daysLeft >= 0;
            const isExpired = m.status === 'expired' || (daysLeft != null && daysLeft < 0);
            const outstanding = m.billing?.remainingBalance || 0;

            return (
              <div key={m.memberId} style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 120px 100px',
                padding: '12px 20px', borderBottom: '1px solid var(--border)',
                alignItems: 'center', transition: 'var(--transition-fast)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              onClick={() => viewMember(m.memberId)}
              >
                {/* Member info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: m.photoUrl ? 'transparent' : 'var(--accent-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: '#fff',
                    overflow: 'hidden',
                  }}>
                    <LazyMemberPhoto src={m.photoUrl} fullName={m.fullName} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.fullName}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{m.memberId}</div>
                  </div>
                  {/* Inline status badge on mobile */}
                  <span className={`badge ${getBadgeClass(m.status)}`} style={{ marginLeft: 'auto', flexShrink: 0 }}>{m.status}</span>
                </div>

                {/* Plan & expiry */}
                <div className="hide-mobile" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  <span style={{ textTransform: 'capitalize' }}>{m.plan?.type || '—'}</span>
                  {m.plan?.expiryDate && (() => {
                    const exp = formatExpiry(m.plan.expiryDate);
                    return (
                      <span style={{
                        marginLeft: 6,
                        color: exp.urgency === 'danger' ? 'var(--danger)' : exp.urgency === 'warning' ? 'var(--warning)' : 'var(--text-muted)',
                        fontSize: 'var(--text-xs)',
                      }}>
                        · {exp.text}
                      </span>
                    );
                  })()}
                </div>

                {/* Payment badge */}
                <div onClick={(e) => e.stopPropagation()}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 9999,
                    fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)',
                    textTransform: 'uppercase',
                    background: ps === 'paid' ? 'var(--success-bg)' : ps === 'partial' ? 'var(--warning-bg)' : 'var(--danger-bg)',
                    color: ps === 'paid' ? 'var(--success)' : ps === 'partial' ? 'var(--warning)' : 'var(--danger)',
                  }}>{ps}</span>
                  {outstanding > 0 && ps !== 'paid' && (
                    <div style={{ fontSize: 10, color: 'var(--danger)', marginTop: 2 }}>{fmtETB(outstanding, 'en')}</div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                  <button className="btn btn-ghost btn-sm" onClick={() => viewMember(m.memberId)} title="View">
                    <Eye size={15} />
                  </button>
                  {(staff?.role === 'owner' || staff?.role === 'receptionist') && (
                    <div className="action-dropdown" ref={openMenu === m.memberId ? menuRef : null}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setOpenMenu(openMenu === m.memberId ? null : m.memberId)} title="More">
                        <MoreVertical size={15} />
                      </button>
                      {openMenu === m.memberId && (
                        <div className="action-menu">
                          <button className="action-menu-item" onClick={() => { setOpenMenu(null); viewMember(m.memberId); }}>
                            <Eye size={14} /> View Details
                          </button>
                          <button className="action-menu-item" onClick={() => { setOpenMenu(null); setShowStatusModal(m); }}>
                            <ShieldAlert size={14} /> Change Status
                          </button>
                          <button className="action-menu-item" onClick={() => { setOpenMenu(null); setShowEditModal(m); }}>
                            <Edit3 size={14} /> Edit Member
                          </button>
                          {m.paymentStatus !== 'paid' && (
                            <button className="action-menu-item" onClick={() => { setOpenMenu(null); setShowPaymentModal(m); }}>
                              <DollarSign size={14} /> Record Payment
                            </button>
                          )}
                          {(m.status === 'expired' || m.plan?.daysRemaining <= 5) && (
                            <button className="action-menu-item" onClick={() => { setOpenMenu(null); setShowRenewModal(m); setSelectedMember(null); }}>
                              <RotateCw size={14} /> Renew Plan
                            </button>
                          )}
                          <button className="action-menu-item" onClick={() => { setOpenMenu(null); viewQR(m.memberId); }}>
                            <QrCode size={14} /> View QR Code
                          </button>
                          <button className="action-menu-item" onClick={() => { setOpenMenu(null); downloadCard(m.memberId); }}>
                            <CreditCard size={14} /> Download Card
                          </button>
                          {staff?.role === 'owner' && (
                            <>
                              <div className="action-menu-divider" />
                              <button className="action-menu-item danger" onClick={() => { setOpenMenu(null); setShowDeleteModal(m); }}>
                                <Trash2 size={14} /> Delete Member
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 20px', borderTop: '1px solid var(--border)',
            fontSize: 'var(--text-xs)', color: 'var(--text-muted)',
          }}>
            <span>Showing {startItem}–{endItem} of {pagination.total || 0} members</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '2px 6px', fontSize: 'var(--text-xs)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
                <option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
              </select>
              <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '4px 8px' }}>
                <ChevronLeft size={14} /> Prev
              </button>
              <button className="btn btn-secondary btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '4px 8px' }}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
          <div ref={sentinelRef} style={{ height: 1 }} />
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '48px 24px', textAlign: 'center',
        }}>
          <UserX size={32} style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: 12 }} />
          <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-secondary)', marginBottom: 4 }}>No members found</h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            {search || statusFilter ? 'Try adjusting your search or filters' : 'Add your first member to get started'}
          </p>
          {!search && !statusFilter && (staff?.role === 'owner' || staff?.role === 'receptionist') && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ marginTop: 16, borderRadius: 'var(--radius-md)' }}>
              <Plus size={16} /> Add Member
            </button>
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
                {selectedMember.plan?.expiryDate ? (() => {
                  const exp = formatExpiry(selectedMember.plan.expiryDate);
                  return (
                    <div>
                      <div>{formatBilingual(selectedMember.plan.expiryDate)}</div>
                      <div style={{
                        fontSize: 'var(--text-xs)', marginTop: 2,
                        color: exp.urgency === 'danger' ? 'var(--danger)' : exp.urgency === 'warning' ? 'var(--warning)' : 'var(--text-muted)',
                        fontWeight: 'var(--font-medium)',
                      }}>{exp.text}</div>
                    </div>
                  );
                })() : <div>—</div>}
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

      {/* Status Change Modal */}
      {showStatusModal && <StatusChangeModal member={showStatusModal} onClose={() => setShowStatusModal(null)} onSuccess={() => { setShowStatusModal(null); fetchMembers(); toast.success('Member status updated'); }} />}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && <DeleteConfirmModal member={showDeleteModal} onClose={() => setShowDeleteModal(null)} onSuccess={() => { setShowDeleteModal(null); fetchMembers(); toast.success('Member deleted successfully'); }} />}

      {/* Edit Member Modal */}
      {showEditModal && <EditMemberModal member={showEditModal} onClose={() => setShowEditModal(null)} onSuccess={() => { setShowEditModal(null); fetchMembers(); toast.success('Member updated successfully'); }} />}

      {/* Record Payment Modal */}
      {showPaymentModal && <RecordPaymentModal member={showPaymentModal} onClose={() => setShowPaymentModal(null)} onSuccess={() => { setShowPaymentModal(null); fetchMembers(); toast.success('Payment recorded successfully'); }} />}
    </ProtectedLayout>
  );
}

function AddMemberModal({ onClose, onSuccess }) {
  const { branches, currentBranch, isMultiBranch, branchId } = useBranch();
  const [form, setForm] = useState({
    fullName: '', phone: '', planType: '3-day', durationMonths: 1,
    allowedDays: [1, 3, 5], startDate: new Date().toISOString().split('T')[0],
    planPrice: 0, branchId: branchId || '',
  });
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [compressing, setCompressing] = useState(false);
  const [sizeInfo, setSizeInfo] = useState('');

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
        ...(form.branchId ? { branchId: form.branchId } : {}),
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

          {/* Branch selector — only if multi-branch */}
          {isMultiBranch && (
            <div className="form-group">
              <label className="form-label">Branch</label>
              <select className="form-select" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} required>
                <option value="">Select branch...</option>
                {branches.map(b => (
                  <option key={b._id} value={b._id}>{b.name}{b.isHeadquarters ? ' (HQ)' : ''}</option>
                ))}
              </select>
            </div>
          )}

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
                {compressing ? 'Optimizing...' : photoPreview ? 'Change' : 'Upload Photo'}
                <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} disabled={compressing} onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  
                  const originalSizeKb = (file.size / 1024).toFixed(1);
                  if (file.size < 50 * 1024) {
                    // Skip compression
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      setPhotoPreview(evt.target.result);
                      setSizeInfo(`${originalSizeKb} KB (Uncompressed)`);
                    };
                    reader.readAsDataURL(file);
                    return;
                  }

                  setCompressing(true);
                  setSizeInfo('Compressing...');
                  
                  import('@/lib/imageOptimization').then(({ compressImage }) => {
                    compressImage(file, 300, 75).then((compressedBlob) => {
                      const compressedSizeKb = (compressedBlob.size / 1024).toFixed(1);
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        setPhotoPreview(evt.target.result);
                        setSizeInfo(`${originalSizeKb} KB → ${compressedSizeKb} KB`);
                        setCompressing(false);
                      };
                      reader.readAsDataURL(compressedBlob);
                    }).catch(() => {
                      setCompressing(false);
                      setSizeInfo('Compression failed, using original');
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        setPhotoPreview(evt.target.result);
                      };
                      reader.readAsDataURL(file);
                    });
                  });
                }} />
              </label>
              {photoPreview && !compressing && (
                <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', color: 'var(--danger)' }}
                  onClick={() => { setPhotoPreview(null); setSizeInfo(''); }}>Remove</button>
              )}
            </div>
            {sizeInfo && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Size: {sizeInfo}
              </div>
            )}
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


/* ══════════════════════════════════════════════════════════════
   Status Change Modal
   ══════════════════════════════════════════════════════════════ */
function StatusChangeModal({ member, onClose, onSuccess }) {
  const [status, setStatus] = useState(member.status === 'expired' ? 'active' : member.status);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const statusOptions = [
    { value: 'active', label: 'Active', icon: ShieldCheck, color: 'var(--success)', desc: 'Member can check in normally' },
    { value: 'suspended', label: 'Suspended', icon: Ban, color: 'var(--warning)', desc: 'Temporarily blocked from check-in' },
    { value: 'frozen', label: 'Frozen', icon: Snowflake, color: 'var(--info)', desc: 'Membership paused (e.g. travel, injury)' },
  ];

  const needsReason = status === 'suspended' || status === 'frozen';

  const handleSubmit = async () => {
    if (needsReason && !reason.trim()) {
      setError('Please provide a reason');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.patch(`/members/${member.memberId}/status`, {
        status,
        ...(needsReason ? { reason: reason.trim() } : {}),
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h2>Change Status</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {/* Current status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.85rem', fontWeight: 700,
          }}>
            {member.fullName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{member.fullName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{member.memberId} · Currently <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{member.status}</span></div>
          </div>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--danger)' }}>
            {error}
          </div>
        )}

        {/* Status options */}
        <div className="form-group">
          <label className="form-label">New Status</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {statusOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = status === opt.value;
              const isCurrent = member.status === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`status-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => setStatus(opt.value)}
                  disabled={isCurrent}
                  style={{ opacity: isCurrent ? 0.5 : 1 }}
                >
                  <Icon size={18} style={{ color: opt.color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      {opt.label} {isCurrent && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>(current)</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{opt.desc}</div>
                  </div>
                  {isSelected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-primary)' }} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Reason (required for suspend/freeze) */}
        {needsReason && (
          <div className="form-group">
            <label className="form-label">Reason <span style={{ color: 'var(--danger)' }}>*</span></label>
            <textarea
              className="form-input"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={status === 'suspended' ? 'e.g. Unpaid dues, rule violation...' : 'e.g. Medical leave, traveling...'}
              style={{ resize: 'vertical' }}
            />
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading || status === member.status}
          >
            {loading ? <div className="spinner" style={{ borderTopColor: 'white' }}></div> : 'Update Status'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Delete Confirmation Modal
   ══════════════════════════════════════════════════════════════ */
function DeleteConfirmModal({ member, onClose, onSuccess }) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const nameMatch = confirmText.trim().toLowerCase() === member.fullName.toLowerCase();

  const handleDelete = async () => {
    if (!nameMatch) return;
    setLoading(true);
    setError('');
    try {
      await api.delete(`/members/${member.memberId}`);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to delete member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h2 style={{ color: 'var(--danger)' }}>Delete Member</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '1rem', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <AlertTriangle size={20} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            This will set <strong style={{ color: 'var(--text-primary)' }}>{member.fullName}</strong>&apos;s status to <strong style={{ color: 'var(--danger)' }}>expired</strong> and remove them from active member lists. This is a soft delete — their data and history will be preserved.
          </div>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--danger)' }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">
            Type <strong style={{ color: 'var(--text-primary)' }}>{member.fullName}</strong> to confirm
          </label>
          <input
            className="form-input"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={member.fullName}
            autoFocus
          />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={!nameMatch || loading}
          >
            {loading ? <div className="spinner" style={{ borderTopColor: 'white' }}></div> : <><Trash2 size={14} /> Delete Member</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Edit Member Modal
   ══════════════════════════════════════════════════════════════ */
function EditMemberModal({ member, onClose, onSuccess }) {
  const [form, setForm] = useState({
    fullName: member.fullName || '',
    phone: member.phone || '',
    emergencyName: member.emergencyContact?.name || '',
    emergencyPhone: member.emergencyContact?.phone || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        fullName: form.fullName,
        phone: form.phone,
      };
      if (form.emergencyName || form.emergencyPhone) {
        payload.emergencyContact = {
          name: form.emergencyName || null,
          phone: form.emergencyPhone || null,
        };
      }
      await api.put(`/members/${member.memberId}`, payload);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h2>Edit Member</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {/* Member ID badge */}
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem', fontFamily: 'monospace' }}>
          {member.memberId}
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
            <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          </div>

          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem', marginTop: '0.5rem' }}>
            Emergency Contact
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.emergencyName} onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} placeholder="Contact name" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} placeholder="+251..." />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <div className="spinner" style={{ borderTopColor: 'white' }}></div> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Record Payment Modal — Quick cash/bank payment from Members page
   ══════════════════════════════════════════════════════════════ */
function RecordPaymentModal({ member, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [payFull, setPayFull] = useState(true);

  const remainingBalance = member.billing?.remainingBalance || member.billing?.totalDue || 0;
  const totalDue = member.billing?.totalDue || 0;
  const amountPaid = member.billing?.amountPaid || 0;

  // Auto-fill amount when "Pay Full" is selected
  useEffect(() => {
    if (payFull && remainingBalance > 0) {
      setAmount(remainingBalance.toString());
    }
  }, [payFull, remainingBalance]);

  const formatPrice = (cents) => `${(cents / 100).toLocaleString()} ETB`;

  const handleSubmit = async () => {
    const parsedAmount = parseInt(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (parsedAmount > remainingBalance && remainingBalance > 0) {
      setError(`Amount exceeds remaining balance (${formatPrice(remainingBalance)})`);
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/dues/pay', {
        memberId: member.memberId,
        amount: parsedAmount,
        paymentMethod,
        description: description.trim() || `${paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'bank-transfer' ? 'Bank transfer' : 'Other'} payment`,
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    { value: 'cash', label: 'Cash', icon: Banknote, color: 'var(--success)' },
    { value: 'bank-transfer', label: 'Bank Transfer', icon: CreditCard, color: 'var(--info)' },
    { value: 'other', label: 'Other', icon: DollarSign, color: 'var(--warning)' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h2>Record Payment</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {/* Member info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: member.photoUrl ? 'transparent' : 'var(--accent-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '0.85rem', fontWeight: 700,
            overflow: 'hidden', flexShrink: 0,
          }}>
            {member.photoUrl
              ? <img src={member.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : member.fullName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
            }
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{member.fullName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{member.memberId}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Balance Due</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: remainingBalance > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {formatPrice(remainingBalance)}
            </div>
          </div>
        </div>

        {/* Billing summary */}
        {totalDue > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <div style={{ padding: '0.5rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Due</div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{formatPrice(totalDue)}</div>
            </div>
            <div style={{ padding: '0.5rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Paid</div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--success)' }}>{formatPrice(amountPaid)}</div>
            </div>
            <div style={{ padding: '0.5rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Remaining</div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--danger)' }}>{formatPrice(remainingBalance)}</div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding: '0.75rem', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--danger)' }}>
            {error}
          </div>
        )}

        {/* Payment method */}
        <div className="form-group">
          <label className="form-label">Payment Method</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {paymentMethods.map((pm) => {
              const Icon = pm.icon;
              const isSelected = paymentMethod === pm.value;
              return (
                <button
                  key={pm.value}
                  type="button"
                  onClick={() => setPaymentMethod(pm.value)}
                  style={{
                    flex: 1, padding: '0.6rem 0.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${isSelected ? pm.color : 'var(--border)'}`,
                    background: isSelected ? `${pm.color}15` : 'var(--bg-elevated)',
                    cursor: 'pointer', textAlign: 'center',
                    transition: 'all 150ms ease',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem',
                  }}
                >
                  <Icon size={18} style={{ color: isSelected ? pm.color : 'var(--text-muted)' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: isSelected ? 600 : 400, color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)' }}>{pm.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount */}
        <div className="form-group">
          <label className="form-label">Amount (in cents)</label>
          {remainingBalance > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <button
                type="button"
                onClick={() => { setPayFull(true); setAmount(remainingBalance.toString()); }}
                className={`btn btn-sm ${payFull ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.75rem' }}
              >
                Pay Full — {formatPrice(remainingBalance)}
              </button>
              <button
                type="button"
                onClick={() => { setPayFull(false); setAmount(''); }}
                className={`btn btn-sm ${!payFull ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.75rem' }}
              >
                Partial Payment
              </button>
            </div>
          )}
          <input
            className="form-input"
            type="number"
            min={1}
            max={remainingBalance || undefined}
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setPayFull(false); }}
            placeholder={remainingBalance > 0 ? `Max: ${remainingBalance}` : 'Enter amount in cents'}
            disabled={payFull && remainingBalance > 0}
          />
          {amount && parseInt(amount) > 0 && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              = {formatPrice(parseInt(amount))}
            </div>
          )}
        </div>

        {/* Description */}
        <div className="form-group">
          <label className="form-label">Note <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
          <input
            className="form-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Cash received at front desk"
          />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading || !amount || parseInt(amount) <= 0}
            style={{ background: 'var(--success)', borderColor: 'var(--success)' }}
          >
            {loading
              ? <div className="spinner" style={{ borderTopColor: 'white' }}></div>
              : <><DollarSign size={14} /> Record Payment</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
