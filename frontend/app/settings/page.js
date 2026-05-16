'use client';
import { useState, useEffect, useCallback } from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import api from '@/lib/api';
import { Save, Plus, Trash2, Download, Upload, Shield, AlertTriangle } from 'lucide-react';

export default function SettingsPage() {
  const [tab, setTab] = useState('general'); // general | plans | backup

  const tabs = [
    { key: 'general', label: 'General' },
    { key: 'plans', label: 'Membership Plans' },
    { key: 'backup', label: 'Backup & Restore' },
  ];

  return (
    <ProtectedLayout title="Settings">
      {/* Tab Bar */}
      <div className="tab-filters" style={{ marginBottom: '1.5rem' }}>
        {tabs.map(t => (
          <button key={t.key} className={`tab-filter ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {tab === 'general' && <GeneralSettings />}
      {tab === 'plans' && <PlansSettings />}
      {tab === 'backup' && <BackupSettings />}
    </ProtectedLayout>
  );
}

// ═══════════════════════════════════════════════════════════
// GENERAL SETTINGS TAB
// ═══════════════════════════════════════════════════════════
function GeneralSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/settings').then(res => { setSettings(res.data.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try {
      const { _id, __v, id, createdAt, updatedAt, gymId, lastBackupAt, lastBackupBy, ...data } = settings;
      await api.put('/settings', data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { alert('Failed to save settings'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="loading-page"><div className="spinner spinner-lg"></div></div>;
  if (!settings) return <div className="empty-state"><p>Failed to load settings</p></div>;

  const update = (field, value) => setSettings(prev => ({ ...prev, [field]: value }));

  return (
    <div style={{ maxWidth: '700px' }}>
      <h3 style={{ marginBottom: '1.25rem' }}>Gym Identity</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div className="form-group"><label className="form-label">Gym Name</label><input className="form-input" value={settings.gymName || ''} onChange={(e) => update('gymName', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Tagline</label><input className="form-input" value={settings.tagline || ''} onChange={(e) => update('tagline', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={settings.phone || ''} onChange={(e) => update('phone', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={settings.email || ''} onChange={(e) => update('email', e.target.value)} /></div>
      </div>
      <div className="form-group"><label className="form-label">Address</label><input className="form-input" value={settings.address || ''} onChange={(e) => update('address', e.target.value)} /></div>

      <h3 style={{ marginTop: '1.5rem', marginBottom: '1.25rem' }}>Regional</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div className="form-group"><label className="form-label">Currency</label><input className="form-input" value={settings.currency || ''} onChange={(e) => update('currency', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Timezone</label><input className="form-input" value={settings.timezone || ''} onChange={(e) => update('timezone', e.target.value)} /></div>
      </div>

      <h3 style={{ marginTop: '1.5rem', marginBottom: '1.25rem' }}>Receipts & Cards</h3>
      <div className="form-group"><label className="form-label">Receipt Footer Message</label><input className="form-input" value={settings.receiptFooter || ''} onChange={(e) => update('receiptFooter', e.target.value)} /></div>
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={settings.receiptShowQR} onChange={(e) => update('receiptShowQR', e.target.checked)} /> Show QR on receipts
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={settings.cardShowLogo} onChange={(e) => update('cardShowLogo', e.target.checked)} /> Show logo on cards
        </label>
      </div>

      <h3 style={{ marginTop: '1.5rem', marginBottom: '1.25rem' }}>Defaults</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div className="form-group"><label className="form-label">Low Stock Threshold</label><input className="form-input" type="number" min="0" value={settings.defaultLowStockThreshold || 5} onChange={(e) => update('defaultLowStockThreshold', parseInt(e.target.value))} /></div>
        <div className="form-group"><label className="form-label">Dashboard Refresh (sec)</label><input className="form-input" type="number" min="5" max="300" value={settings.dashboardRefreshSeconds || 30} onChange={(e) => update('dashboardRefreshSeconds', parseInt(e.target.value))} /></div>
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <div className="spinner" style={{ borderTopColor: 'white' }}></div> : <><Save size={16} /> Save Settings</>}
        </button>
        {saved && <span style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>✓ Settings saved</span>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MEMBERSHIP PLANS TAB
// ═══════════════════════════════════════════════════════════
function PlansSettings() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  const fetchPlans = useCallback(async () => {
    try {
      const { data } = await api.get('/settings/plans');
      setPlans(data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const formatPrice = (cents) => `${(cents / 100).toLocaleString()} ETB`;
  const dayNames = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const toggleStatus = async (e, plan) => {
    e.stopPropagation();
    try {
      await api.put(`/settings/plans/${plan._id}`, { status: plan.status === 'active' ? 'inactive' : 'active' });
      fetchPlans();
    } catch (err) { alert('Failed to update plan'); }
  };

  if (loading) return <div className="loading-page"><div className="spinner spinner-lg"></div></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Configure membership plans and pricing available during registration</p>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}><Plus size={14} /> Add Plan</button>
      </div>

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {plans.map(plan => (
          <div key={plan._id} onClick={() => setEditingPlan(plan)} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
            padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            opacity: plan.status === 'inactive' ? 0.5 : 1,
            cursor: 'pointer', transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
          >
            <div>
              <div style={{ fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {plan.name}
                <span className={`badge ${plan.status === 'active' ? 'badge-active' : 'badge-expired'}`}>{plan.status}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem' }}>
                <span>Type: {plan.type}</span>
                <span>Duration: {plan.durationMonths}mo</span>
                {plan.allowedDays && <span>Days: {plan.allowedDays.map(d => dayNames[d]).join(', ')}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent-primary)' }}>{formatPrice(plan.price)}</span>
              <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setEditingPlan(plan); }} title="Edit Plan"
                style={{ color: 'var(--text-muted)' }}>✏️</button>
              <button className="btn btn-ghost btn-sm" onClick={(e) => toggleStatus(e, plan)} title={plan.status === 'active' ? 'Deactivate' : 'Activate'}>
                {plan.status === 'active' ? '🔴' : '🟢'}
              </button>
            </div>
          </div>
        ))}
        {plans.length === 0 && <div className="empty-state"><p>No plans configured</p></div>}
      </div>

      {showAddModal && <PlanModal onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); fetchPlans(); }} />}
      {editingPlan && <PlanModal plan={editingPlan} onClose={() => setEditingPlan(null)} onSuccess={() => { setEditingPlan(null); fetchPlans(); }} />}
    </div>
  );
}

function PlanModal({ plan, onClose, onSuccess }) {
  const isEdit = !!plan;
  const [form, setForm] = useState({
    name: plan?.name || '',
    slug: plan?.slug || '',
    type: plan?.type || 'full-week',
    durationMonths: plan?.durationMonths || 1,
    price: plan ? (plan.price / 100).toFixed(2) : '',
    allowedDays: plan?.allowedDays || [],
    sortOrder: plan?.sortOrder || 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const payload = {
        name: form.name,
        type: form.type,
        durationMonths: parseInt(form.durationMonths),
        price: Math.round(parseFloat(form.price) * 100),
        allowedDays: form.type === 'full-week' ? null : form.allowedDays,
        sortOrder: parseInt(form.sortOrder) || 0,
      };

      if (isEdit) {
        await api.put(`/settings/plans/${plan._id}`, payload);
      } else {
        await api.post('/settings/plans', { ...payload, slug: form.slug });
      }
      onSuccess();
    } catch (err) { setError(err.response?.data?.error?.message || 'Failed to save plan'); }
    finally { setLoading(false); }
  };

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const toggleDay = (day) => {
    setForm(prev => {
      const days = prev.allowedDays.includes(day) ? prev.allowedDays.filter(d => d !== day) : [...prev.allowedDays, day];
      return { ...prev, allowedDays: days };
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Plan' : 'Add Membership Plan'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        {error && <div style={{ padding: '0.75rem', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--danger)' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Plan Name</label>
              <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. VIP Plan" />
            </div>
            {!isEdit && (
              <div className="form-group">
                <label className="form-label">Slug (URL-safe)</label>
                <input className="form-input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} required placeholder="e.g. vip-plan" />
              </div>
            )}
            {isEdit && (
              <div className="form-group">
                <label className="form-label">Slug</label>
                <input className="form-input" value={plan.slug} disabled style={{ opacity: 0.6 }} />
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="full-week">Full Week</option><option value="3-day">3-Day</option><option value="weekend">Weekend</option><option value="custom">Custom</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Duration (months)</label>
              <input className="form-input" type="number" min="1" max="24" value={form.durationMonths} onChange={(e) => setForm({ ...form, durationMonths: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Price (ETB)</label>
              <input className="form-input" type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required
                style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '1rem' }} />
            </div>
          </div>
          {form.type !== 'full-week' && (
            <div className="form-group"><label className="form-label">Allowed Days</label>
              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                {dayLabels.map((name, i) => (
                  <button key={i} type="button" onClick={() => toggleDay(i + 1)} className={`btn btn-sm ${form.allowedDays.includes(i + 1) ? 'btn-primary' : 'btn-secondary'}`}>{name}</button>
                ))}
              </div>
            </div>
          )}

          {/* Price preview */}
          {form.price > 0 && (
            <div style={{
              padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
              marginBottom: '1rem', textAlign: 'center', border: '1px dashed var(--border)',
            }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Members will pay: </span>
              <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--accent-primary)' }}>
                {(parseFloat(form.price) || 0).toLocaleString()} ETB
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}> / {form.durationMonths}mo</span>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <div className="spinner" style={{ borderTopColor: 'white' }}></div> : isEdit ? 'Save Changes' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// BACKUP & RESTORE TAB
// ═══════════════════════════════════════════════════════════
function BackupSettings() {
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restorePreview, setRestorePreview] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState(null);
  const [confirmRestore, setConfirmRestore] = useState(false);

  const handleBackup = async () => {
    setCreatingBackup(true);
    try {
      const response = await api.post('/settings/backup', {}, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `GymX_Backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) { alert('Backup failed'); }
    finally { setCreatingBackup(false); }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setRestoreFile(file);
    setRestorePreview(null);
    setRestoreResult(null);
    setConfirmRestore(false);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        const { data: result } = await api.post('/settings/restore/validate', data);
        setRestorePreview(result.data);
      } catch (err) {
        setRestorePreview({ valid: false, error: 'Invalid backup file' });
      }
    };
    reader.readAsText(file);
  };

  const handleRestore = async () => {
    if (!restoreFile) return;
    setRestoring(true);
    try {
      const text = await restoreFile.text();
      const data = JSON.parse(text);
      const { data: result } = await api.post('/settings/restore', data);
      setRestoreResult(result.data);
      setConfirmRestore(false);
    } catch (err) { alert('Restore failed: ' + (err.response?.data?.error?.message || err.message)); }
    finally { setRestoring(false); }
  };

  return (
    <div style={{ maxWidth: '700px' }}>
      {/* Backup Section */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Download size={18} /> Create Backup</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>Download a complete backup of all gym data as a JSON file. Includes members, payments, sales, products, and settings.</p>
        <button className="btn btn-primary" onClick={handleBackup} disabled={creatingBackup}>
          {creatingBackup ? <div className="spinner" style={{ borderTopColor: 'white' }}></div> : <><Download size={16} /> Download Backup</>}
        </button>
      </div>

      {/* Restore Section */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Upload size={18} /> Restore from Backup</h3>
        <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={16} /> <strong>Warning:</strong> Restoring will replace ALL current data. This action cannot be undone.
        </div>

        <div className="form-group">
          <label className="form-label">Select Backup File (.json)</label>
          <input type="file" accept=".json" onChange={handleFileSelect} className="form-input" />
        </div>

        {/* Preview */}
        {restorePreview && (
          <div style={{ marginTop: '1rem' }}>
            {restorePreview.valid ? (
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--success)' }}>✓ Backup file is valid</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                  <span>Created: {restorePreview.summary?.createdAt ? new Date(restorePreview.summary.createdAt).toLocaleString() : '—'}</span>
                  <span>By: {restorePreview.summary?.createdBy || '—'}</span>
                  <span>Collections: {restorePreview.summary?.collections}</span>
                  <span>Documents: {restorePreview.summary?.totalDocuments?.toLocaleString()}</span>
                </div>
                {!confirmRestore ? (
                  <button className="btn btn-primary" style={{ marginTop: '1rem', background: 'var(--danger)' }} onClick={() => setConfirmRestore(true)}>
                    <Shield size={16} /> Start Restore
                  </button>
                ) : (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)' }}>
                    <p style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: '0.75rem' }}>⚠️ Are you absolutely sure? This will erase all current data.</p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary" onClick={() => setConfirmRestore(false)}>Cancel</button>
                      <button className="btn btn-primary" style={{ background: 'var(--danger)' }} onClick={handleRestore} disabled={restoring}>
                        {restoring ? <div className="spinner" style={{ borderTopColor: 'white' }}></div> : 'Yes, Restore Now'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>❌ {restorePreview.error}</div>
            )}
          </div>
        )}

        {/* Restore Result */}
        {restoreResult && (
          <div style={{ marginTop: '1rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: '0.5rem' }}>✅ Restore Complete</div>
            <div style={{ fontSize: '0.8rem', display: 'grid', gap: '0.25rem' }}>
              {Object.entries(restoreResult).map(([name, info]) => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{name}</span>
                  <span style={{ fontWeight: 600, color: info.error ? 'var(--danger)' : 'var(--success)' }}>
                    {info.error ? `Error: ${info.error}` : `${info.restored} docs`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
