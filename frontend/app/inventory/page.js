'use client';

import { useState, useEffect, useCallback } from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import api from '@/lib/api';
import { Plus, Package, Wrench, Search, AlertTriangle, Dumbbell, Bike, Heart } from 'lucide-react';

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/inventory'); setItems(data.data || []); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

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

  return (
    <ProtectedLayout title="Equipment Inventory" actions={
      <button className="btn btn-primary" style={{ borderRadius: 'var(--radius-lg)' }}>
        <Plus size={16} /> Add Equipment
      </button>
    }>
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
