'use client';
import { useState, useEffect, useCallback } from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { ShoppingCart, Plus, Minus, Trash2, Receipt, X, FileText } from 'lucide-react';
import { useToast } from '@/components/Toast';

export default function SalesPage() {
  const { staff } = useAuth();
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [sales, setSales] = useState([]);
  const [view, setView] = useState('pos'); // 'pos' | 'history'
  const [searchProduct, setSearchProduct] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successSale, setSuccessSale] = useState(null);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);

  // Fetch products for POS
  useEffect(() => {
    if (view === 'pos') {
      api.get('/products?limit=100&status=active').then(res => setProducts(res.data.data || [])).catch(console.error);
    }
  }, [view]);

  // Fetch sales history
  const fetchSales = useCallback(async () => {
    try {
      const { data } = await api.get(`/sales?page=${page}&limit=15`);
      setSales(data.data || []);
      setPagination(data.pagination || {});
    } catch (err) { console.error(err); }
  }, [page]);

  useEffect(() => { if (view === 'history') fetchSales(); }, [view, fetchSales]);

  const formatPrice = (cents) => `${(cents / 100).toFixed(2)} ETB`;

  const downloadSaleReceipt = async (saleId) => {
    try {
      const response = await api.get(`/sales/${saleId}/receipt`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `GymX_Sale_Receipt_${saleId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) { console.error(err); toast.error('Failed to download receipt.'); }
  };

  // ─── Cart Logic ────────────────────────────────────────
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product._id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(i => i.productId === product._id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      if (product.stock <= 0) return prev;
      return [...prev, { productId: product._id, name: product.name, sku: product.sku, unitPrice: product.sellingPrice, quantity: 1, maxStock: product.stock }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart(prev => prev.map(i => {
      if (i.productId !== productId) return i;
      const newQty = i.quantity + delta;
      if (newQty <= 0) return null;
      if (newQty > i.maxStock) return i;
      return { ...i, quantity: newQty };
    }).filter(Boolean));
  };

  const removeFromCart = (productId) => setCart(prev => prev.filter(i => i.productId !== productId));

  const subtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const total = subtotal - (discount * 100);

  // ─── Submit Sale ───────────────────────────────────────
  const handleSubmitSale = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const { data } = await api.post('/sales', {
        items: cart.map(i => ({ productId: i.productId, quantity: i.quantity })),
        discount: discount * 100,
        paymentMethod,
        notes,
      });
      setSuccessSale(data.data);
      setCart([]);
      setDiscount(0);
      setNotes('');
      // Refresh products to update stock
      api.get('/products?limit=100&status=active').then(res => setProducts(res.data.data || []));
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Sale failed');
    }
    finally { setSubmitting(false); }
  };

  const filteredProducts = searchProduct
    ? products.filter(p => p.name.toLowerCase().includes(searchProduct.toLowerCase()) || p.sku.toLowerCase().includes(searchProduct.toLowerCase()))
    : products;

  return (
    <ProtectedLayout title="Sales" actions={
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <div className="tab-filters" style={{ marginBottom: 0 }}>
          <button className={`tab-filter ${view === 'pos' ? 'active' : ''}`} onClick={() => setView('pos')}>POS</button>
          <button className={`tab-filter ${view === 'history' ? 'active' : ''}`} onClick={() => setView('history')}>History</button>
        </div>
      </div>
    }>
      {view === 'pos' ? (
        /* ─── POS View ──────────────────────────────────── */
        <div className="pos-grid">
          {/* Product Grid */}
          <div>
            <input className="form-input" placeholder="Search products..." value={searchProduct} onChange={(e) => setSearchProduct(e.target.value)} style={{ marginBottom: '1rem' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
              {filteredProducts.map(p => (
                <button key={p._id} onClick={() => addToCart(p)} disabled={p.stock <= 0} style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem',
                  cursor: p.stock > 0 ? 'pointer' : 'not-allowed', opacity: p.stock <= 0 ? 0.4 : 1,
                  textAlign: 'left', transition: 'all var(--transition-fast)', fontFamily: 'inherit', color: 'var(--text-primary)',
                }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>{p.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{p.sku}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{formatPrice(p.sellingPrice)}</span>
                    <span style={{ fontSize: '0.7rem', color: p.isLowStock ? 'var(--danger)' : 'var(--text-muted)' }}>Stock: {p.stock}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Cart Sidebar */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShoppingCart size={18} /> Cart ({cart.length})</h3>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {cart.length > 0 ? cart.map(item => (
                <div key={item.productId} style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.name}</span>
                    <button onClick={() => removeFromCart(item.productId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 0 }}><X size={14} /></button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => updateQuantity(item.productId, -1)} style={{ padding: '0.25rem' }}><Minus size={14} /></button>
                      <span style={{ fontWeight: 700, minWidth: '24px', textAlign: 'center' }}>{item.quantity}</span>
                      <button className="btn btn-ghost btn-sm" onClick={() => updateQuantity(item.productId, 1)} style={{ padding: '0.25rem' }}><Plus size={14} /></button>
                    </div>
                    <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{formatPrice(item.unitPrice * item.quantity)}</span>
                  </div>
                </div>
              )) : (
                <div className="empty-state" style={{ padding: '2rem 0' }}><ShoppingCart size={24} /><p>Cart is empty</p></div>
              )}
            </div>

            {/* Totals */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem', fontSize: '0.85rem' }}>
                <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span>Discount (ETB)</span>
                <input className="form-input" type="number" min="0" value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} style={{ width: '80px', textAlign: 'right', padding: '0.25rem 0.5rem' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                <span>Total</span><span style={{ color: 'var(--success)' }}>{formatPrice(Math.max(0, total))}</span>
              </div>
              <select className="form-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ marginBottom: '0.5rem' }}>
                <option value="cash">Cash</option><option value="bank-transfer">Bank Transfer</option><option value="other">Other</option>
              </select>
              <input className="form-input" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ marginBottom: '0.75rem' }} />
              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleSubmitSale} disabled={cart.length === 0 || submitting || total < 0}>
                {submitting ? <div className="spinner" style={{ borderTopColor: 'white' }}></div> : <><Receipt size={18} /> Complete Sale</>}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ─── Sales History ─────────────────────────────── */
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Sale #</th><th>Items</th><th>Total</th><th>Method</th><th>By</th><th>Date</th><th>Status</th><th>Receipt</th></tr></thead>
            <tbody>
              {sales.length > 0 ? sales.map(s => (
                <tr key={s._id} style={{ opacity: s.voided ? 0.5 : 1 }}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.saleNumber}</td>
                  <td>{s.items?.length || 0} items</td>
                  <td style={{ fontWeight: 700, color: s.voided ? 'var(--danger)' : 'var(--success)' }}>{formatPrice(s.total)}</td>
                  <td style={{ textTransform: 'capitalize' }}>{s.paymentMethod}</td>
                  <td>{s.soldByName}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{new Date(s.saleDate).toLocaleDateString()}</td>
                  <td>{s.voided ? <span className="badge badge-expired">Voided</span> : <span className="badge badge-active">Active</span>}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => downloadSaleReceipt(s._id)} title="Download Receipt" style={{ color: 'var(--accent-primary)' }}>
                      <FileText size={15} />
                    </button>
                  </td>
                </tr>
              )) : <tr><td colSpan={8}><div className="empty-state"><Receipt size={32} /><h3>No sales yet</h3></div></td></tr>}
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
        </div>
      )}

      {/* Success Modal */}
      {successSale && (
        <div className="modal-overlay" onClick={() => setSuccessSale(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
            <h2 style={{ marginBottom: '0.5rem' }}>Sale Complete!</h2>
            <p style={{ fontFamily: 'monospace', color: 'var(--accent-primary)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>{successSale.saleNumber}</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{formatPrice(successSale.total)}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>{successSale.items?.length} items • {successSale.paymentMethod}</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => downloadSaleReceipt(successSale._id)}><FileText size={16} /> Receipt</button>
              <button className="btn btn-primary" onClick={() => setSuccessSale(null)}>New Sale</button>
            </div>
          </div>
        </div>
      )}
    </ProtectedLayout>
  );
}
