'use client';

/**
 * Table — GymX Design System
 * Sub-components: TableHead, TableRow, TableCell
 * Features: hover striping, sticky header option
 */
export function Table({ children, style: customStyle }) {
  return (
    <div style={{
      overflowX: 'auto',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--bg-card)',
      boxShadow: 'var(--shadow-xs)',
      ...customStyle,
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children, sticky = false, style: customStyle }) {
  return (
    <thead>
      <tr>
        {children}
      </tr>
    </thead>
  );
}

export function TableHeadCell({ children, style: customStyle }) {
  return (
    <th style={{
      textAlign: 'left',
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--font-semibold)',
      color: 'var(--text-muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      padding: '12px 20px',
      background: 'var(--bg-elevated)',
      borderBottom: '1px solid var(--border)',
      whiteSpace: 'nowrap',
      ...customStyle,
    }}>
      {children}
    </th>
  );
}

export function TableRow({ children, onClick, style: customStyle }) {
  return (
    <tr
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : undefined,
        transition: 'var(--transition-fast)',
        ...customStyle,
      }}
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, style: customStyle }) {
  return (
    <td style={{
      padding: '12px 20px',
      fontSize: 'var(--text-base)',
      color: 'var(--text-secondary)',
      borderBottom: '1px solid var(--border)',
      ...customStyle,
    }}>
      {children}
    </td>
  );
}
