'use client';
import { useState, useEffect, useCallback } from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { Wallet, DollarSign, AlertTriangle, CheckCircle, Clock, X, CreditCard, History } from 'lucide-react';

export default function DuesPage() {
  const { staff } = useAuth();
  const [overview, setOverview] = useState(null);
  const [members, setMembers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filter, setFilter] = useState(''); // '' = all non-paid, or specific status
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState(null); // member to pay
  const [historyModal, setHistoryModal] = useState(null); // member to view history

  const fetchOverview = useCallback(async () => {
    try {
      const { data } = await api.get('/dues/overview');
      setOverview(data.data);
    } catch (err) { console.error(err); }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (filter) params.append('paymentStatus', filter);
      const { data } = await api.get(`/dues/members?${params}`);
      setMembers(data.data || []);
      setPagination(data.pagination || {});
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, filter]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);
  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const formatPrice = (cents) => `${(cents / 100).toLocaleString()} ETB`;

  const statusColors = {
    paid: { bg: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)', label: 'Paid' },
    partial: { bg: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning)', label: 'Partial' },
    unpaid: { bg: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger)', label: 'Unpaid' },
    overdue: { bg: 'rgba(220, 38, 38, 0.15)', color: '#dc2626', label: 'Overdue' },
  };

  const handlePaymentSuccess = () => {
    setPayModal(null);
    fetchOverview();
    fetchMembers();
  };

  return (
    <ProtectedLayout title="Membership Dues">
      {/* Overview Cards */}
      {overview && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="stat-card stagger-item" style={{ borderTop: '3px solid var(--success)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <CheckCircle size={20} style={{ color: 'var(--success)' }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 600 }}>+12% vs last month</span>
            </div>
            <div className="stat-label">PAID MEMBERS</div>
            <div className="stat-value">{overview.counts?.paid || 0}</div>
          </div>
          <div className="stat-card stagger-item" style={{ borderTop: '3px solid var(--warning)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <Clock size={20} style={{ color: 'var(--warning)' }} />
            </div>
            <div className="stat-label">PARTIAL PAYMENTS</div>
            <div className="stat-value">{overview.counts?.partial || 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '0.25rem' }}>{formatPrice(overview.outstandingRevenue?.partial || 0)} Outstanding</div>
          </div>
          <div className="stat-card stagger-item" style={{ borderTop: '3px solid var(--danger)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />
            </div>
            <div className="stat-label">UNPAID MEMBERS</div>
            <div className="stat-value">{overview.counts?.unpaid || 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem' }}>{formatPrice(overview.outstandingRevenue?.unpaid || 0)} Outstanding</div>
          </div>
          <div className="stat-card stagger-item" style={{ borderTop: '3px solid #dc2626' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <DollarSign size={20} style={{ color: '#dc2626' }} />
            </div>
            <div className="stat-label">OVERDUE</div>
            <div className="stat-value">{overview.counts?.overdue || 0}</div>
            <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem' }}>{formatPrice(overview.outstandingRevenue?.overdue || 0)} Outstanding</div>
          </div>
        </div>
      )}

      {/* Tab Filters + Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="tab-filters" style={{ marginBottom: 0 }}>
          {[{ v: '', l: 'All' }, { v: 'paid', l: 'Paid' }, { v: 'partial', l: 'Partial' }, { v: 'unpaid', l: 'Unpaid' }, { v: 'overdue', l: 'Overdue' }].map(t => (
            <button key={t.v} className={`tab-filter ${filter === t.v ? 'active' : ''}`} onClick={() => { setFilter(t.v); setPage(1); }}>{t.l}</button>
          ))}
        </div>
        <div className="topbar-search" style={{ minWidth: '220px' }}>
          <input placeholder="Filter by member name..." />
        </div>
      </div>

      {/* Members Table */}
      {loading ? (
        <div className="loading-page"><div className="spinner spinner-lg"></div></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Total Due</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Payment Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.length > 0 ? members.map(m => {
                const ps = statusColors[m.paymentStatus] || statusColors.unpaid;
                return (
                  <tr key={m.memberId}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{m.fullName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.memberId}</div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{m.plan?.type || '—'}</td>
                    <td><span className={`badge badge-${m.status}`}>{m.status}</span></td>
                    <td style={{ fontWeight: 600 }}>{formatPrice(m.billing?.totalDue || 0)}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>{formatPrice(m.billing?.amountPaid || 0)}</td>
                    <td style={{ fontWeight: 700, color: (m.billing?.remainingBalance || 0) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {formatPrice(m.billing?.remainingBalance || 0)}
                    </td>
                    <td>
                      <span style={{
                        padding: '0.25rem 0.625rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                        background: ps.bg, color: ps.color,
                      }}>{ps.label}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        {m.paymentStatus !== 'paid' && (
                          <button className="btn btn-primary btn-sm" onClick={() => setPayModal(m)} title="Record Payment" style={{ padding: '0.25rem 0.5rem' }}>
                            <CreditCard size={14} />
                          </button>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={() => setHistoryModal(m)} title="Payment History" style={{ padding: '0.25rem 0.5rem' }}>
                          <History size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={8}>
                  <div className="empty-state"><Wallet size={32} /><h3>No members found</h3><p>{filter ? `No ${filter} members` : 'All members are paid up!'}</p></div>
                </td></tr>
              )}
            </tbody>
          </table>
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <div className="pagination-info">Page {pagination.page} of {pagination.totalPages} ({pagination.total} members)</div>
              <div className="pagination-buttons">
                <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                <button className="btn btn-secondary btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {payModal && <PaymentModal member={payModal} onClose={() => setPayModal(null)} onSuccess={handlePaymentSuccess} />}

      {/* History Modal */}
      {historyModal && <HistoryModal member={historyModal} onClose={() => setHistoryModal(null)} />}
    </ProtectedLayout>
  );
}

// ═══════════════════════════════════════════════════════════
// PAYMENT MODAL — Record partial or full payment
// ═══════════════════════════════════════════════════════════
function PaymentModal({ member, onClose, onSuccess }) {
  const remaining = member.billing?.remainingBalance || 0;
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatPrice = (cents) => `${(cents / 100).toLocaleString()} ETB`;

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const amountCents = Math.round(parseFloat(amount) * 100);
      if (amountCents <= 0 || isNaN(amountCents)) { setError('Enter a valid amount'); setLoading(false); return; }
      if (amountCents > remaining) { setError(`Amount exceeds remaining balance (${formatPrice(remaining)})`); setLoading(false); return; }

      await api.post('/dues/pay', {
        memberId: member.memberId,
        amount: amountCents,
        paymentMethod,
        description,
      });
      onSuccess();
    } catch (err) { setError(err.response?.data?.error?.message || 'Payment failed'); }
    finally { setLoading(false); }
  };

  const payFull = () => setAmount((remaining / 100).toFixed(2));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <h2>Record Payment</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{member.fullName}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{member.memberId} • {member.plan?.type} plan</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Due:</span> <strong>{formatPrice(member.billing?.totalDue || 0)}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Paid:</span> <strong style={{ color: 'var(--success)' }}>{formatPrice(member.billing?.amountPaid || 0)}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Balance:</span> <strong style={{ color: 'var(--danger)' }}>{formatPrice(remaining)}</strong></div>
          </div>
        </div>

        {error && <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--danger)' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Amount (ETB)</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input className="form-input" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="0.00" style={{ flex: 1 }} />
              <button type="button" className="btn btn-secondary btn-sm" onClick={payFull}>Pay Full</button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <select className="form-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="bank-transfer">Bank Transfer</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <input className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Partial payment" />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <div className="spinner" style={{ borderTopColor: 'white' }}></div> : <><CreditCard size={16} /> Record Payment</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// HISTORY MODAL — View payment history
// ═══════════════════════════════════════════════════════════
function HistoryModal({ member, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const formatPrice = (cents) => `${(cents / 100).toLocaleString()} ETB`;

  useEffect(() => {
    api.get(`/dues/${member.memberId}/history`)
      .then(res => setData(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [member.memberId]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
        <div className="modal-header">
          <h2>Payment History</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner spinner-lg"></div></div>
        ) : data ? (
          <>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700 }}>{data.member?.fullName}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Balance: <strong style={{ color: (data.member?.billing?.remainingBalance || 0) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  {formatPrice(data.member?.billing?.remainingBalance || 0)}
                </strong> remaining of {formatPrice(data.member?.billing?.totalDue || 0)}
              </div>
            </div>

            {data.payments?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto' }}>
                {data.payments.map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--success)' }}>{formatPrice(p.amount)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {p.paymentMethod} • {p.recordedBy}
                      </div>
                      {p.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{p.description}</div>}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                      {new Date(p.recordedAt).toLocaleDateString()}
                      <br />
                      <span style={{ fontSize: '0.7rem' }}>{new Date(p.recordedAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <History size={24} /><p>No payments recorded yet</p>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state"><p>Failed to load history</p></div>
        )}

        <div className="modal-footer" style={{ marginTop: '1rem' }}>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
