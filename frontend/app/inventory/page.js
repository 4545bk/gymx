'use client';

import { useState, useEffect, useCallback } from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import api from '@/lib/api';
import { Plus, Package, Wrench, Search, AlertTriangle, Dumbbell, Bike, X } from 'lucide-react';

const CATEGORIES = ['Cardio', 'Strength', 'Free weights', 'Accessories', 'Other'];
const CONDITIONS = ['good', 'fair', 'needs-repair', 'retired'];

const defaultForm = {
  name: '',
  category: 'Cardio',
  brand: '',
  serialNumber: '',
  quantity: 1,
  condition: 'good',
  purchaseDate: '',
  purchaseCost: '',
  purchaseVendor: '',
  maintenanceInterval: 6,
};

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');

  // Add equipment modal state
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/inventory'); setItems(data.data || []); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openModal = () => { setForm(defaultForm); setFormError(''); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setFormError(''); };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Equipment name is required'); return; }
    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        brand: form.brand.trim() || null,
        serialNumber: form.serialNumber.trim() || null,
        quantity: parseInt(form.quantity) || 1,
        condition: form.condition,
        purchaseInfo: {
          date: form.purchaseDate || null,
          cost: form.purchaseCost ? parseInt(form.purchaseCost) : 0,
          vendor: form.purchaseVendor.trim() || null,
        },
        maintenance: {
          intervalMonths: parseInt(form.maintenanceInterval) || 6,
        },
      };
      await api.post('/inventory', payload);
      closeModal();
      fetchItems();
    } catch (err) {
      setFormError(err.response?.data?.message || err.response?.data?.error || 'Failed to add equipment');
    } finally {
      setSubmitting(false);
    }
  };

  const conditionBadge = (c) => {
    const map = {
      good: { cls: 'badge-active', label: 'GOOD' },
      fair: { cls: 'badge-suspended', label: 'FAIR' },
      'needs-repair': { cls: 'badge-expired', label: 'NEEDS REPAIR' },
      retired: { cls: 'badge-frozen', label: 'RETIRED' },
    };
    return map[c] || { cls: '', label: c };
  };

  const getCategoryIcon = (cat) => {
    if (cat?.toLowerCase().includes('cardio')) return <Bike size={24} />;
    if (cat?.toLowerCase().includes('strength') || cat?.toLowerCase().includes('weight')) return <Dumbbell size={24} />;
    return <Package size={24} />;
  };

  const filtered = items.filter(item => {
    if (search && !item.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter && item.category !== categoryFilter) return false;
    if (conditionFilter && item.condition !== conditionFilter) return false;
    return true;
  });

  const categories = [...new Set(items.map(i => i.category).filter(Boolean))];
  const needsRepairCount = items.filter(i => i.condition === 'needs-repair').length;

  const inputStyle = {
    width: '100%', padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)', background: 'var(--bg-elevated)',
    color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none',
    transition: 'border-color 0.2s',
  };
  const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' };

  return (
    <ProtectedLayout title="Equipment Inventory" actions={
      <button className="btn btn-primary" style={{ borderRadius: 'var(--radius-lg)' }} onClick={openModal}>
        <Plus size={16} /> Add Equipment
      </button>
    }>
      {/* ─── Add Equipment Modal ─── */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        }} onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 'var(--radius-xl, 1rem)',
            border: '1px solid var(--border)', width: '100%', maxWidth: '540px',
            maxHeight: '85vh', overflowY: 'auto', padding: '1.75rem',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
            animation: 'fadeInUp 0.25s ease-out',
          }}>
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Add Equipment</h2>
              <button onClick={closeModal} style={{
                background: 'var(--bg-elevated)', border: 'none', borderRadius: 'var(--radius-md)',
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-muted)',
              }}><X size={16} /></button>
            </div>

            {formError && (
              <div style={{
                padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem',
                background: 'var(--danger-bg, rgba(239,68,68,0.1))', color: 'var(--danger)',
                fontSize: '0.85rem', fontWeight: 500,
              }}>{formError}</div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Name */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Equipment Name *</label>
                <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Treadmill Pro X200" style={inputStyle} required />
              </div>

              {/* Category + Condition row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Category *</label>
                  <select name="category" value={form.category} onChange={handleChange} className="form-select" style={{ ...inputStyle, cursor: 'pointer' }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Condition</label>
                  <select name="condition" value={form.condition} onChange={handleChange} className="form-select" style={{ ...inputStyle, cursor: 'pointer' }}>
                    {CONDITIONS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1).replace('-', ' ')}</option>)}
                  </select>
                </div>
              </div>

              {/* Brand + Serial */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Brand</label>
                  <input name="brand" value={form.brand} onChange={handleChange} placeholder="e.g. Life Fitness" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Serial Number</label>
                  <input name="serialNumber" value={form.serialNumber} onChange={handleChange} placeholder="e.g. SN-12345" style={inputStyle} />
                </div>
              </div>

              {/* Quantity + Maintenance Interval */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Quantity</label>
                  <input name="quantity" type="number" min="0" value={form.quantity} onChange={handleChange} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Service Interval (months)</label>
                  <input name="maintenanceInterval" type="number" min="1" value={form.maintenanceInterval} onChange={handleChange} style={inputStyle} />
                </div>
              </div>

              {/* Purchase Info section */}
              <div style={{
                padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                background: 'var(--bg-elevated)', marginBottom: '1.25rem',
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Purchase Info (optional)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={labelStyle}>Purchase Date</label>
                    <input name="purchaseDate" type="date" value={form.purchaseDate} onChange={handleChange} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Cost (in cents)</label>
                    <input name="purchaseCost" type="number" min="0" value={form.purchaseCost} onChange={handleChange} placeholder="0" style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Vendor</label>
                  <input name="purchaseVendor" value={form.purchaseVendor} onChange={handleChange} placeholder="Supplier name" style={inputStyle} />
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={submitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ minWidth: '120px' }}>
                  {submitting ? 'Adding...' : 'Add Equipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="topbar-search" style={{ flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input placeholder="Search equipment..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ width: '160px' }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="form-select" value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value)} style={{ width: '160px' }}>
          <option value="">All Conditions</option>
          <option value="good">Good</option>
          <option value="fair">Fair</option>
          <option value="needs-repair">Needs Repair</option>
          <option value="retired">Retired</option>
        </select>
        {needsRepairCount > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={() => setConditionFilter('needs-repair')} style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)' }}>
            <Wrench size={14} /> Maintenance Due ({needsRepairCount})
          </button>
        )}
      </div>

      {loading ? <div className="stats-grid">{[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: '180px', borderRadius: 'var(--radius-lg)' }} />)}</div> : (
        filtered.length > 0 ? (
          <div className="equipment-grid">
            {filtered.map((item) => {
              const cond = conditionBadge(item.condition);
              const needsRepair = item.condition === 'needs-repair';
              return (
                <div key={item.id || item._id} className={`equipment-card stagger-item ${needsRepair ? 'needs-repair' : ''}`}>
                  {/* Header with icon */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--accent-primary)',
                    }}>
                      {getCategoryIcon(item.category)}
                    </div>
                    <span className={`badge ${cond.cls}`}>{cond.label}</span>
                  </div>

                  {/* Name & brand */}
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>{item.name}</h4>
                  {item.brand && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{item.brand}</div>}
                  {item.serialNumber && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: '0.75rem' }}>SN: {item.serialNumber}</div>}

                  {/* Quantity */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                    padding: '0.25rem 0.625rem', borderRadius: '999px',
                    background: 'var(--bg-elevated)', fontSize: '0.75rem', fontWeight: 600,
                    color: 'var(--text-secondary)', marginBottom: '0.75rem',
                  }}>
                    Qty: {item.quantity}
                  </div>

                  {/* Service dates */}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {item.maintenance?.lastServiceDate && (
                      <div>Last: {new Date(item.maintenance.lastServiceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    )}
                    {item.maintenance?.nextServiceDate && (
                      <div style={{ color: item.maintenance.daysUntilService <= 7 ? 'var(--danger)' : 'var(--text-muted)' }}>
                        Next: {new Date(item.maintenance.nextServiceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {item.maintenance.daysUntilService <= 7 && ' ⚠'}
                      </div>
                    )}
                  </div>

                  {/* Needs repair warning */}
                  {needsRepair && (
                    <div style={{
                      marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)',
                      background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', gap: '0.5rem',
                      fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 500,
                    }}>
                      <AlertTriangle size={14} /> Action required
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state"><Package size={48} /><h3>No equipment found</h3><p>Try adjusting your search or filters</p></div>
        )
      )}
    </ProtectedLayout>
  );
}
