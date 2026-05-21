'use client';

import { useState, useRef, useCallback } from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import { useToast } from '@/components/Toast';
import api from '@/lib/api';
import Link from 'next/link';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, ArrowLeft, Download, Users, ChevronRight, Loader2 } from 'lucide-react';

const GYMX_FIELDS = [
  { value: '', label: '— Skip —' },
  { value: 'fullName', label: 'Full Name' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'planType', label: 'Plan Type' },
  { value: 'startDate', label: 'Start Date' },
  { value: 'expiryDate', label: 'Expiry Date' },
  { value: 'emergencyContact', label: 'Emergency Contact' },
];

export default function ImportMembersPage() {
  const toast = useToast();
  const fileRef = useRef(null);

  // Wizard state
  const [step, setStep] = useState(1); // 1=upload, 2=preview, 3=result
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Data
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [result, setResult] = useState(null);

  // ─── Upload handler ──────────────────────────────────────
  const handleFile = useCallback(async (f) => {
    if (!f) return;
    const ext = f.name.toLowerCase();
    if (!ext.endsWith('.xlsx') && !ext.endsWith('.xls') && !ext.endsWith('.csv')) {
      toast.error('Please upload an .xlsx, .xls, or .csv file');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB.');
      return;
    }

    setFile(f);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', f);

      const { data } = await api.post('/members/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setPreviewData(data.data);
      setColumnMapping(data.data.columnMapping || {});
      setStep(2);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to parse file';
      toast.error(msg);
      setFile(null);
    } finally {
      setUploading(false);
    }
  }, [toast]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  // ─── Confirm import ──────────────────────────────────────
  const handleImport = async () => {
    if (!previewData) return;
    setImporting(true);

    try {
      const { data } = await api.post('/members/import/confirm', {
        columnMapping,
        rows: previewData._validatedRows,
      });

      setResult(data.data);
      setStep(3);
      toast.success(`${data.data.imported} members imported successfully`);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Import failed';
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  };

  // ─── Download error report CSV ───────────────────────────
  const downloadErrors = () => {
    if (!result) return;
    const lines = ['Row,Issue'];
    (result.skippedRows || []).forEach(s => lines.push(`${s.row},"${s.reason}: ${s.name || ''} ${s.phone || ''}"`));
    (result.errors || []).forEach(e => lines.push(`${e.row},"${e.message}"`));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'import-errors.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ─── Mapping change ──────────────────────────────────────
  const updateMapping = (header, field) => {
    setColumnMapping(prev => {
      const next = { ...prev };
      if (field) next[header] = field;
      else delete next[header];
      return next;
    });
  };

  // ─── Styles ──────────────────────────────────────────────
  const S = {
    page: { maxWidth: 860, margin: '0 auto' },
    breadcrumb: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' },
    stepBar: { display: 'flex', gap: 0, marginBottom: 32, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' },
    stepItem: (active, done) => ({
      flex: 1, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--text-sm)', fontWeight: active ? 600 : 400,
      color: active ? 'var(--accent-primary)' : done ? 'var(--text-secondary)' : 'var(--text-muted)',
      background: active ? 'var(--accent-primary-light)' : 'transparent',
      borderRight: '1px solid var(--border)',
    }),
    stepNum: (active, done) => ({
      width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0,
      background: active ? 'var(--accent-primary)' : done ? 'var(--success)' : 'var(--bg-elevated)',
      color: (active || done) ? '#fff' : 'var(--text-muted)',
    }),
    dropZone: (over) => ({
      border: `2px dashed ${over ? 'var(--accent-primary)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-xl)', padding: '48px 32px', textAlign: 'center',
      background: over ? 'var(--accent-primary-light)' : 'var(--bg-card)',
      transition: 'all 200ms ease', cursor: 'pointer',
    }),
    card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 16 },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' },
    th: { textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' },
    td: { padding: '8px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    resultCard: (type) => ({
      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderRadius: 'var(--radius-md)', marginBottom: 8,
      background: type === 'success' ? 'var(--success-bg)' : type === 'warning' ? 'var(--warning-bg)' : 'var(--danger-bg)',
      color: type === 'success' ? 'var(--success)' : type === 'warning' ? 'var(--warning)' : 'var(--danger)',
      fontWeight: 500, fontSize: 'var(--text-sm)',
    }),
  };

  const stepLabels = ['Upload File', 'Map & Preview', 'Results'];

  return (
    <ProtectedLayout>
      <div style={S.page}>
        {/* Breadcrumb */}
        <div style={S.breadcrumb}>
          <Link href="/members" style={{ color: 'var(--accent-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowLeft size={14} /> Members
          </Link>
          <ChevronRight size={12} />
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Import Members</span>
        </div>

        {/* Step Indicator */}
        <div style={S.stepBar}>
          {stepLabels.map((label, i) => (
            <div key={i} style={S.stepItem(step === i + 1, step > i + 1)}>
              <div style={S.stepNum(step === i + 1, step > i + 1)}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              {label}
            </div>
          ))}
        </div>

        {/* ═══ STEP 1: Upload ═══ */}
        {step === 1 && (
          <>
            <div
              style={S.dropZone(dragOver)}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files?.[0])} />

              {uploading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <Loader2 size={40} style={{ color: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />
                  <div style={{ fontSize: 'var(--text-md)', fontWeight: 500, color: 'var(--text-primary)' }}>Parsing file...</div>
                </div>
              ) : (
                <>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Upload size={28} style={{ color: 'var(--accent-primary)' }} />
                  </div>
                  <div style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    Drop your spreadsheet here or click to browse
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 16 }}>
                    Supports .xlsx, .xls, .csv — Max 5MB
                  </div>
                  {file && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                      <FileSpreadsheet size={14} /> {file.name}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Template download */}
            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <a href="/member-import-template.csv" download style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-sm)', color: 'var(--accent-primary)', textDecoration: 'none' }}>
                <Download size={14} /> Download import template
              </a>
            </div>
          </>
        )}

        {/* ═══ STEP 2: Mapping & Preview ═══ */}
        {step === 2 && previewData && (
          <>
            {/* Summary bar */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{ ...S.card, flex: 1, minWidth: 160, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                <FileSpreadsheet size={20} style={{ color: 'var(--accent-primary)' }} />
                <div>
                  <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>{previewData.totalRows}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Rows</div>
                </div>
              </div>
              <div style={{ ...S.card, flex: 1, minWidth: 160, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                <CheckCircle2 size={20} style={{ color: 'var(--success)' }} />
                <div>
                  <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--success)' }}>{previewData.validRows}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ready</div>
                </div>
              </div>
              <div style={{ ...S.card, flex: 1, minWidth: 160, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                <AlertTriangle size={20} style={{ color: 'var(--warning)' }} />
                <div>
                  <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: previewData.errorCount > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>{previewData.errorCount}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Issues</div>
                </div>
              </div>
            </div>

            {/* Column Mapping */}
            <div style={S.card}>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Column Mapping</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {(previewData.headers || []).map(header => {
                  const mapped = columnMapping[header];
                  const isUnmapped = !mapped;
                  return (
                    <div key={header} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 'var(--radius-md)', background: isUnmapped ? 'var(--warning-bg)' : 'var(--bg-elevated)', border: `1px solid ${isUnmapped ? 'var(--warning)' : 'var(--border)'}` }}>
                      <span style={{ flex: 1, fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{header}</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginRight: 4 }}>→</span>
                      <select
                        value={mapped || ''}
                        onChange={(e) => updateMapping(header, e.target.value)}
                        style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'inherit', minWidth: 120 }}
                      >
                        {GYMX_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Data Preview Table */}
            <div style={S.card}>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Data Preview (first 5 rows)</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>#</th>
                      {(previewData.headers || []).map(h => <th key={h} style={S.th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {(previewData.preview || []).map((row, i) => (
                      <tr key={i}>
                        <td style={{ ...S.td, color: 'var(--text-muted)', width: 40 }}>{i + 2}</td>
                        {(previewData.headers || []).map(h => <td key={h} style={S.td}>{row[h] ?? ''}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Errors */}
            {previewData.errors?.length > 0 && (
              <div style={S.card}>
                <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--danger)', marginBottom: 12 }}>Validation Issues</h3>
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {previewData.errors.slice(0, 20).map((err, i) => (
                    <div key={i} style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-muted)', marginRight: 8 }}>Row {err.row}:</span> {err.message}
                    </div>
                  ))}
                  {previewData.errors.length > 20 && (
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', padding: '8px 0' }}>
                      ...and {previewData.errors.length - 20} more issues
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => { setStep(1); setFile(null); setPreviewData(null); }}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleImport}
                disabled={importing || previewData.validRows === 0}
                style={{ minWidth: 180 }}
              >
                {importing ? (
                  <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Importing...</>
                ) : (
                  <><Users size={16} /> Import {previewData.validRows} Members</>
                )}
              </button>
            </div>
          </>
        )}

        {/* ═══ STEP 3: Results ═══ */}
        {step === 3 && result && (
          <div style={{ ...S.card, padding: 32, textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle2 size={36} style={{ color: 'var(--success)' }} />
            </div>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24 }}>Import Complete</h2>

            <div style={{ maxWidth: 400, margin: '0 auto', textAlign: 'left' }}>
              {result.imported > 0 && (
                <div style={S.resultCard('success')}>
                  <CheckCircle2 size={18} /> {result.imported} members imported successfully
                </div>
              )}
              {result.skipped > 0 && (
                <div style={S.resultCard('warning')}>
                  <AlertTriangle size={18} /> {result.skipped} rows skipped (duplicate phone numbers)
                </div>
              )}
              {result.errorCount > 0 && (
                <div style={S.resultCard('error')}>
                  <XCircle size={18} /> {result.errorCount} rows had errors
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 28 }}>
              {(result.skipped > 0 || result.errorCount > 0) && (
                <button className="btn btn-secondary" onClick={downloadErrors}>
                  <Download size={14} /> Download Error Report
                </button>
              )}
              <Link href="/members">
                <button className="btn btn-primary"><Users size={14} /> View Members</button>
              </Link>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </ProtectedLayout>
  );
}
