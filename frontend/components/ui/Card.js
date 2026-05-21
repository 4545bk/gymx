'use client';

/**
 * Card — GymX Design System
 * Wrapper with subtle border, warm white background, border-radius lg, shadow-xs.
 * Sub-components: CardHeader, CardBody
 */
export function Card({ children, style: customStyle, hover = true, ...props }) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-xs)',
        transition: 'var(--transition-normal)',
        ...customStyle,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, title, actions, style: customStyle }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 'var(--space-5) var(--space-6)',
        borderBottom: '1px solid var(--border)',
        ...customStyle,
      }}
    >
      {title ? (
        <>
          <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
            {title}
          </h3>
          {actions && <div style={{ display: 'flex', gap: 'var(--space-2)' }}>{actions}</div>}
        </>
      ) : (
        children
      )}
    </div>
  );
}

export function CardBody({ children, style: customStyle }) {
  return (
    <div
      style={{
        padding: 'var(--space-6)',
        ...customStyle,
      }}
    >
      {children}
    </div>
  );
}
