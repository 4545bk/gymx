'use client';

/**
 * Skeleton — GymX Design System
 * Base shimmer loading placeholder. Respects prefers-reduced-motion.
 */
export default function Skeleton({ width, height, borderRadius, style: customStyle, className = '' }) {
  return (
    <div
      className={`gymx-skeleton ${className}`}
      style={{
        width: width || '100%',
        height: height || 16,
        borderRadius: borderRadius || 'var(--radius-md)',
        background: 'linear-gradient(90deg, #f0f0ee 25%, #e8e8e6 50%, #f0f0ee 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
        ...customStyle,
      }}
    />
  );
}

/** Matches the 4 stat cards on the dashboard */
export function SkeletonStatCard() {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderLeft: '3px solid var(--border)', borderRadius: 'var(--radius-lg)',
      padding: '20px 24px',
    }}>
      <Skeleton height={32} width={80} borderRadius="var(--radius-sm)" style={{ marginBottom: 8 }} />
      <Skeleton height={14} width={120} borderRadius="var(--radius-sm)" />
    </div>
  );
}

/** Matches member list card-rows */
export function SkeletonMemberRow() {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr 120px 100px',
      padding: '12px 20px', borderBottom: '1px solid var(--border)', alignItems: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Skeleton width={36} height={36} borderRadius="50%" />
        <div>
          <Skeleton height={14} width={120} borderRadius="var(--radius-sm)" style={{ marginBottom: 4 }} />
          <Skeleton height={10} width={80} borderRadius="var(--radius-sm)" />
        </div>
      </div>
      <Skeleton height={12} width={100} borderRadius="var(--radius-sm)" />
      <Skeleton height={20} width={56} borderRadius={9999} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
        <Skeleton width={28} height={28} borderRadius="var(--radius-sm)" />
        <Skeleton width={28} height={28} borderRadius="var(--radius-sm)" />
      </div>
    </div>
  );
}

/** Rectangle placeholder for charts */
export function SkeletonChartArea({ height = 260 }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '20px 24px', boxShadow: 'var(--shadow-xs)',
    }}>
      <Skeleton height={16} width={140} borderRadius="var(--radius-sm)" style={{ marginBottom: 20 }} />
      <Skeleton height={height} borderRadius="var(--radius-md)" />
    </div>
  );
}

/** Matches check-in activity feed items */
export function SkeletonCheckinItem() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
      borderRadius: 8, background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.04)',
    }}>
      <Skeleton width={32} height={32} borderRadius="50%" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div style={{ flex: 1 }}>
        <Skeleton height={12} width={100} borderRadius="var(--radius-sm)" style={{ background: 'rgba(255,255,255,0.06)', marginBottom: 4 }} />
        <Skeleton height={9} width={60} borderRadius="var(--radius-sm)" style={{ background: 'rgba(255,255,255,0.04)' }} />
      </div>
      <Skeleton width={56} height={18} borderRadius={9999} style={{ background: 'rgba(255,255,255,0.06)' }} />
    </div>
  );
}

/** Generic table skeleton rows */
export function SkeletonTableRows({ rows = 5, cols = 4 }) {
  return (
    <>
      {[...Array(rows)].map((_, r) => (
        <tr key={r}>
          {[...Array(cols)].map((_, c) => (
            <td key={c} style={{ padding: '12px 16px' }}>
              <Skeleton height={14} width={c === 0 ? '70%' : '50%'} borderRadius="var(--radius-sm)" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
