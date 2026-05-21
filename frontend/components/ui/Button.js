'use client';

/**
 * Button — GymX Design System
 * Variants: primary (green filled), secondary (outlined), ghost (text only), danger (red)
 * Sizes: sm, md, lg
 * Supports: loading state, full width, disabled, icons
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled = false,
  type = 'button',
  onClick,
  style,
  ...props
}) {
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-2)',
    fontFamily: 'var(--font-sans)',
    fontWeight: 'var(--font-semibold)',
    fontSize: size === 'sm' ? 'var(--text-sm)' : size === 'lg' ? 'var(--text-md)' : 'var(--text-base)',
    padding: size === 'sm' ? '6px 12px' : size === 'lg' ? '12px 24px' : '8px 16px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid transparent',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'var(--transition-normal)',
    whiteSpace: 'nowrap',
    width: fullWidth ? '100%' : undefined,
    minHeight: size === 'sm' ? '32px' : size === 'lg' ? '44px' : '36px',
    position: 'relative',
    ...getVariantStyle(variant),
    ...style,
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={baseStyle}
      {...props}
    >
      {loading ? <Spinner size={size === 'sm' ? 14 : 16} /> : children}
    </button>
  );
}

function getVariantStyle(variant) {
  switch (variant) {
    case 'primary':
      return {
        background: 'var(--accent-primary)',
        color: '#FFFFFF',
        boxShadow: 'var(--shadow-xs)',
      };
    case 'secondary':
      return {
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
        borderColor: 'var(--border)',
      };
    case 'ghost':
      return {
        background: 'transparent',
        color: 'var(--text-secondary)',
        border: 'none',
      };
    case 'danger':
      return {
        background: 'var(--danger)',
        color: '#FFFFFF',
        boxShadow: 'var(--shadow-xs)',
      };
    default:
      return {};
  }
}

function Spinner({ size = 16 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: '#FFFFFF',
        borderRadius: '50%',
        animation: 'spin 600ms linear infinite',
      }}
    />
  );
}
