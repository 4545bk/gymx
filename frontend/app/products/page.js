'use client';
import { useState, useEffect, useCallback } from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { Plus, Search, Tags, AlertTriangle, Package, Edit, Archive } from 'lucide-react';

export default function ProductsPage() {
  const { staff } = useAuth();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.append('search', search);
      if (categoryFilter) params.append('category', categoryFilter);
      if (lowStockOnly) params.append('lowStock', 'true');
      const { data } = await api.get(`/products?${params}`);
      setProducts(data.data || []);
      setPagination(data.pagination || {});
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, search, categoryFilter, lowStockOnly]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const formatPrice = (cents) => `${(cents / 100).toFixed(2)} ETB`;

  const categories = ['supplements', 'drinks', 'accessories', 'apparel', 'equipment', 'other'];

  const lowStockCount = products.filter(p => p.isLowStock).length;

  return (
    <ProtectedLayout title="Products" actions={
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {lowStockCount > 0 && (
          <span className="badge badge-expiring" style={{ fontSize: '0.75rem' }}>Low Stock ({lowStockCount})</span>
        )}
        {staff?.role === 'owner' && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ borderRadius: 'var(--radius-lg)' }}><Plus size={16} /> Add Product</button>
        )}
      </div>
    }>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="topbar-search" style={{ flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); fetchProducts(); } }} />
        </div>
        <select className="form-select" value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} style={{ width: '150px' }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <button className={`btn btn-sm ${lowStockOnly ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setLowStockOnly(!lowStockOnly); setPage(1); }} style={{ borderRadius: 'var(--radius-lg)' }}>
          <AlertTriangle size={14} /> Low Stock
        </button>
      </div>

      {/* Table */}
      {loading ? <div className="loading-page" style={{ minHeight: '40vh' }}><div className="spinner spinner-lg"></div></div> : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
            <tbody>
              {products.length > 0 ? products.map((p) => (
                <tr key={p._id}>
                  <td><div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>{p.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.description.slice(0, 50)}</div>}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.sku}</td>
                  <td><span style={{ textTransform: 'capitalize' }}>{p.category}</span></td>
                  <td style={{ fontWeight: 600 }}>{formatPrice(p.sellingPrice)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, color: p.isLowStock ? 'var(--danger)' : 'var(--text-primary)' }}>{p.stock}</span>
                      {p.isLowStock && <AlertTriangle size={14} style={{ color: 'var(--danger)' }} />}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setShowStockModal(p)} title="Adjust Stock" style={{ color: 'var(--accent-primary)' }}><Package size={15} /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6}><div className="empty-state"><Tags size={32} /><h3>No products found</h3></div></td></tr>
              )}
            </tbody>
          </table>
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <div className="pagination-info">Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</div>
              <div className="pagination-buttons">
                <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                <button className="btn btn-secondary btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Product Modal */}
      {showModal && <AddProductModal onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); fetchProducts(); }} />}

      {/* Stock Adjust Modal */}
      {showStockModal && <StockAdjustModal product={showStockModal} onClose={() => setShowStockModal(null)} onSuccess={() => { setShowStockModal(null); fetchProducts(); }} />}
    </ProtectedLayout>
  );
}

function AddProductModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', sku: '', category: 'other', description: '', sellingPrice: '', costPrice: '', stock: '0', minStockThreshold: '5' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      await api.post('/products', {
        ...form,
        sellingPrice: Math.round(parseFloat(form.sellingPrice) * 100),
        costPrice: form.costPrice ? Math.round(parseFloat(form.costPrice) * 100) : 0,
        stock: parseInt(form.stock),
        minStockThreshold: parseInt(form.minStockThreshold),
      });
      onSuccess();
    } catch (err) { setError(err.response?.data?.error?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h2>Add Product</h2><button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button></div>
        {error && <div style={{ padding: '0.75rem', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--danger)' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label className="form-label">Product Name</label><input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group"><label className="form-label">SKU / Code</label><input className="form-input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required placeholder="e.g. PROT-001" /></div>
            <div className="form-group"><label className="form-label">Category</label><select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {['supplements', 'drinks', 'accessories', 'apparel', 'equipment', 'other'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select></div>
          </div>
          <div className="form-group"><label className="form-label">Description (optional)</label><input className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group"><label className="form-label">Selling Price (ETB)</label><input className="form-input" type="number" step="0.01" min="0" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} required /></div>
            <div className="form-group"><label className="form-label">Cost Price (ETB)</label><input className="form-input" type="number" step="0.01" min="0" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group"><label className="form-label">Initial Stock</label><input className="form-input" type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Low Stock Threshold</label><input className="form-input" type="number" min="0" value={form.minStockThreshold} onChange={(e) => setForm({ ...form, minStockThreshold: e.target.value })} /></div>
          </div>
          <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <div className="spinner" style={{ borderTopColor: 'white' }}></div> : 'Create Product'}</button></div>
        </form>
      </div>
    </div>
  );
}

function StockAdjustModal({ product, onClose, onSuccess }) {
  const [type, setType] = useState('restock');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const q = parseInt(quantity);
      await api.patch(`/products/${product._id}/stock`, { type, quantity: type === 'damaged' ? -Math.abs(q) : Math.abs(q), reason });
      onSuccess();
    } catch (err) { setError(err.response?.data?.error?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
        <div className="modal-header"><h2>Adjust Stock: {product.name}</h2><button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button></div>
        <div style={{ padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>
          Current stock: <strong>{product.stock}</strong> | SKU: <strong>{product.sku}</strong>
        </div>
        {error && <div style={{ padding: '0.75rem', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--danger)' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label className="form-label">Adjustment Type</label><select className="form-select" value={type} onChange={(e) => setType(e.target.value)}><option value="restock">Restock (add)</option><option value="damaged">Damaged/Lost (remove)</option><option value="correction">Manual Correction</option></select></div>
          <div className="form-group"><label className="form-label">Quantity</label><input className="form-input" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required /></div>
          <div className="form-group"><label className="form-label">Reason (optional)</label><input className="form-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Weekly restock delivery" /></div>
          <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <div className="spinner" style={{ borderTopColor: 'white' }}></div> : 'Adjust Stock'}</button></div>
        </form>
      </div>
    </div>
  );
}
