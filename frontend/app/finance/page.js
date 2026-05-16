'use client';

import { useState, useEffect, useCallback } from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import api from '@/lib/api';
import { Plus, DollarSign, ArrowUpRight, ArrowDownRight, FileText, TrendingUp, Download, Filter } from 'lucide-react';

export default function FinancePage() {
  const { staff } = useAuth();
  const toast = useToast();
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [directionFilter, setDirectionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (directionFilter) params.append('direction', directionFilter);
      const [paymentsRes, summaryRes] = await Promise.all([
        api.get(`/payments?${params}`),
        staff?.role === 'owner' ? api.get('/payments/summary') : null,
      ]);
      setPayments(paymentsRes.data.data || []);
      setPagination(paymentsRes.data.pagination || {});
      if (summaryRes) setSummary(summaryRes.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, directionFilter, staff]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatCurrency = (cents) => `${(cents / 100).toLocaleString()} ETB`;

  const downloadReceipt = async (paymentId) => {
    try {
      const response = await api.get(`/payments/${paymentId}/receipt`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `GymX_Receipt_${paymentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Receipt downloaded');
    } catch (err) { console.error(err); toast.error('Failed to download receipt.'); }
  };

  const getMethodBadge = (method) => {
    const map = {
      cash: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', label: 'Cash' },
      'bank-transfer': { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', label: 'Bank' },
      telebirr: { bg: 'rgba(167,139,250,0.12)', color: '#a78bfa', label: 'Telebirr' },
      cbe: { bg: 'rgba(231,195,101,0.12)', color: '#e7c365', label: 'CBE' },
    };
    return map[method] || { bg: 'var(--bg-elevated)', color: 'var(--text-secondary)', label: method || 'Other' };
  };

  return (
    <ProtectedLayout title="Financial Ledger" actions={
      <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ borderRadius: 'var(--radius-lg)' }}>
        <Plus size={16} /> Record Payment
      </button>
    }>
      {/* Header subtitle */}
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', marginTop: '-0.5rem' }}>
        Comprehensive financial tracking and transaction management
      </p>

      {/* Summary Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="stat-card stagger-item" style={{ borderTop: '3px solid var(--success)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">TOTAL INCOME</div>
                <div className="stat-value" style={{ fontSize: '1.4rem', color: 'var(--success)' }}>{formatCurrency(summary.income?.total || 0)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--success)', fontSize: '0.75rem', fontWeight: 600 }}>
                <TrendingUp size={14} /> +12.5%
              </div>
            </div>
          </div>
          <div className="stat-card stagger-item" style={{ borderTop: '3px solid var(--danger)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">TOTAL EXPENSES</div>
                <div className="stat-value" style={{ fontSize: '1.4rem', color: 'var(--danger)' }}>{formatCurrency(summary.expenses?.total || 0)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600 }}>
                <TrendingUp size={14} style={{ transform: 'scaleY(-1)' }} /> +4.2%
              </div>
            </div>
          </div>
          <div className="stat-card stagger-item" style={{ borderTop: '3px solid var(--accent-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">NET PROFIT</div>
                <div className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(summary.netProfit || 0)}</div>
              </div>
              <span className="badge badge-new" style={{ fontSize: '0.6rem' }}>HIGH PERFORMANCE</span>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History Card */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1.2rem' }}>Transaction History</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select className="form-select" value={directionFilter} onChange={(e) => { setDirectionFilter(e.target.value); setPage(1); }} style={{ width: '130px', fontSize: '0.8rem' }}>
              <option value="">All Types</option>
              <option value="in">Income</option>
              <option value="out">Expenses</option>
            </select>
            <button className="btn btn-secondary btn-sm"><Download size={14} /> Export</button>
          </div>
        </div>

        {loading ? <div className="loading-page" style={{ minHeight: '30vh' }}><div className="spinner spinner-lg"></div></div> : (
          <>
            <table>
              <thead><tr>
                <th>DATE</th><th>DESCRIPTION</th><th>TYPE</th><th></th><th>AMOUNT</th><th>METHOD</th><th>ACTIONS</th>
              </tr></thead>
              <tbody>
                {payments.length > 0 ? payments.map((p) => {
                  const methodInfo = getMethodBadge(p.paymentMethod);
                  return (
                    <tr key={p.id || p._id} style={{ opacity: p.voided ? 0.5 : 1 }}>
                      <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(p.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{p.description}{p.voided ? ' (voided)' : ''}</div>
                        {p.invoiceId && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>INV-{p.invoiceId}</div>}
                      </td>
                      <td>
                        <span className="badge" style={{
                          background: p.direction === 'in' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                          color: p.direction === 'in' ? 'var(--success)' : 'var(--danger)', textTransform: 'capitalize',
                        }}>{p.type}</span>
                      </td>
                      <td>
                        {p.direction === 'in'
                          ? <ArrowDownRight size={16} style={{ color: 'var(--success)' }} />
                          : <ArrowUpRight size={16} style={{ color: 'var(--danger)' }} />}
                      </td>
                      <td style={{ fontWeight: 700, color: p.direction === 'in' ? 'var(--success)' : 'var(--danger)', whiteSpace: 'nowrap' }}>
                        {p.direction === 'in' ? '+' : '-'}{formatCurrency(p.amount)}
                      </td>
                      <td>
                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600, background: methodInfo.bg, color: methodInfo.color }}>
                          {methodInfo.label}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => downloadReceipt(p.id || p._id)} title="Download Receipt" style={{ color: 'var(--accent-primary)' }}>
                          <FileText size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={7}><div className="empty-state"><DollarSign size={32} /><h3>No transactions found</h3></div></td></tr>
                )}
              </tbody>
            </table>
            {pagination.totalPages > 1 && (
              <div className="pagination">
                <div className="pagination-info">Page {pagination.page} of {pagination.totalPages}</div>
                <div className="pagination-buttons">
                  <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                  <button className="btn btn-secondary btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>Record Payment</h2><button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button></div>
            <RecordPaymentForm onSuccess={() => { setShowModal(false); fetchData(); }} />
          </div>
        </div>
      )}
    </ProtectedLayout>
  );
}

function RecordPaymentForm({ onSuccess }) {
  const [form, setForm] = useState({ type: 'membership', direction: 'in', amount: '', paymentMethod: 'cash', description: '', period: { month: new Date().getMonth() + 1, year: new Date().getFullYear() } });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/payments', { ...form, amount: parseInt(form.amount) * 100 });
      onSuccess();
    } catch (err) { setError(err.response?.data?.error?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div style={{ padding: '0.75rem', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--danger)' }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div className="form-group"><label className="form-label">Type</label><select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="membership">Membership</option><option value="expense">Expense</option><option value="salary">Salary</option></select></div>
        <div className="form-group"><label className="form-label">Direction</label><select className="form-select" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}><option value="in">Income</option><option value="out">Expense</option></select></div>
      </div>
      <div className="form-group"><label className="form-label">Amount (ETB)</label><input className="form-input" type="number" min={1} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
      <div className="form-group"><label className="form-label">Description</label><input className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
      <div className="form-group"><label className="form-label">Payment Method</label><select className="form-select" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}><option value="cash">Cash</option><option value="bank-transfer">Bank Transfer</option><option value="telebirr">Telebirr</option><option value="cbe">CBE</option></select></div>
      <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => {}}>Cancel</button><button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <div className="spinner" style={{ borderTopColor: 'white' }}></div> : 'Record Payment'}</button></div>
    </form>
  );
}
