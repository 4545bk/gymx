'use client';

import { useId } from 'react';

/**
 * Input — GymX Design System
 * With label, error, hint props, prefix/suffix icon slots.
 * Consistent focus ring using primary forest green.
 */
export default function Input({
  label,
  error,
  hint,
  prefix,
  suffix,
  type = 'text',
  id: customId,
  style: customStyle,
  inputStyle,
  ...props
}) {
  const generatedId = useId();
  const id = customId || generatedId;

  return (
    <div style={{ marginBottom: 'var(--space-5)', ...customStyle }}>
      {label && (
        <label
          htmlFor={id}
          style={{
            display: 'block',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-medium)',
            color: 'var(--text-secondary)',
            marginBottom: 'var(--space-1)',
          }}
        >
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {prefix && (
          <div style={{
            position: 'absolute', left: '12px', display: 'flex', alignItems: 'center',
            color: 'var(--text-muted)', pointerEvents: 'none',
          }}>
            {prefix}
          </div>
        )}
        <input
          id={id}
          type={type}
          style={{
            width: '100%',
            padding: '8px 12px',
            paddingLeft: prefix ? '36px' : '12px',
            paddingRight: suffix ? '36px' : '12px',
            fontSize: 'var(--text-base)',
            fontFamily: 'var(--font-sans)',
            color: 'var(--text-primary)',
            background: 'var(--bg-input)',
            border: `1px solid ${error ? 'var(--danger)' : 'var(--border-hover)'}`,
            borderRadius: 'var(--radius-md)',
            outline: 'none',
            transition: 'var(--transition-fast)',
            minHeight: '36px',
            ...inputStyle,
          }}
          onFocus={(e) => {
            e.target.style.borderColor = error ? 'var(--danger)' : 'var(--accent-primary)';
            e.target.style.boxShadow = `0 0 0 3px ${error ? 'rgba(192,57,43,0.12)' : 'rgba(26,92,58,0.12)'}`;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border-hover)';
            e.target.style.boxShadow = 'none';
          }}
          {...props}
        />
        {suffix && (
          <div style={{
            position: 'absolute', right: '12px', display: 'flex', alignItems: 'center',
            color: 'var(--text-muted)', pointerEvents: 'none',
          }}>
            {suffix}
          </div>
        )}
      </div>
      {error && (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)', marginTop: 'var(--space-1)' }}>
          {error}
        </div>
      )}
      {hint && !error && (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
          {hint}
        </div>
      )}
    </div>
  );
}
