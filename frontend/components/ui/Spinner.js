'use client';

/**
 * Spinner — GymX Design System
 * Small animated spinner in primary green.
 */
export default function Spinner({ size = 20, color, style: customStyle }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `2px solid var(--border)`,
        borderTopColor: color || 'var(--accent-primary)',
        borderRadius: '50%',
        animation: 'spin 600ms linear infinite',
        flexShrink: 0,
        ...customStyle,
      }}
    />
  );
}
