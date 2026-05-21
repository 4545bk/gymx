'use client';

/**
 * EmptyState — GymX Design System
 * Accepts icon, title, description, action props.
 * Used when tables/lists are empty.
 */
export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: 'var(--space-12) var(--space-8)',
      color: 'var(--text-muted)',
    }}>
      {Icon && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 56,
          height: 56,
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-elevated)',
          marginBottom: 'var(--space-4)',
        }}>
          <Icon size={28} style={{ opacity: 0.5, color: 'var(--text-muted)' }} />
        </div>
      )}
      {title && (
        <h3 style={{
          fontSize: 'var(--text-md)',
          fontWeight: 'var(--font-semibold)',
          color: 'var(--text-secondary)',
          marginBottom: 'var(--space-2)',
        }}>
          {title}
        </h3>
      )}
      {description && (
        <p style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--text-muted)',
          maxWidth: 320,
          margin: '0 auto',
          lineHeight: 1.5,
        }}>
          {description}
        </p>
      )}
      {action && (
        <div style={{ marginTop: 'var(--space-5)' }}>
          {action}
        </div>
      )}
    </div>
  );
}
