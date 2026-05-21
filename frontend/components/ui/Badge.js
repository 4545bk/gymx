'use client';

/**
 * Badge — GymX Design System
 * Variants: success, warning, danger, info, neutral
 * Used for member status, payment status, etc.
 */
export default function Badge({ children, variant = 'neutral', style: customStyle }) {
  const colors = {
    success: { bg: 'var(--success-bg)', color: 'var(--success)' },
    warning: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
    danger:  { bg: 'var(--danger-bg)',  color: 'var(--danger)' },
    info:    { bg: 'var(--info-bg)',    color: 'var(--info)' },
    neutral: { bg: 'var(--bg-elevated)', color: 'var(--text-secondary)' },
  };

  const c = colors[variant] || colors.neutral;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--font-semibold)',
        fontFamily: 'var(--font-sans)',
        borderRadius: '9999px',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        background: c.bg,
        color: c.color,
        lineHeight: 1.6,
        ...customStyle,
      }}
    >
      {children}
    </span>
  );
}
