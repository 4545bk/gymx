'use client';

import { useI18n } from '@/lib/i18n';

/**
 * LanguageToggle — EN | አማ toggle button
 * Switches between English and Amharic.
 */
export default function LanguageToggle({ compact = false }) {
  const { lang, setLanguage } = useI18n();

  return (
    <div style={{
      display: 'inline-flex', borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border)', overflow: 'hidden',
      fontSize: compact ? 11 : 12,
    }}>
      <button
        onClick={() => setLanguage('en')}
        style={{
          padding: compact ? '3px 8px' : '4px 10px',
          background: lang === 'en' ? 'var(--accent-primary)' : 'transparent',
          color: lang === 'en' ? '#fff' : 'var(--text-muted)',
          border: 'none', cursor: 'pointer',
          fontWeight: lang === 'en' ? 600 : 400,
          fontFamily: 'var(--font-sans)',
          transition: 'var(--transition-fast)',
        }}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('am')}
        style={{
          padding: compact ? '3px 8px' : '4px 10px',
          background: lang === 'am' ? 'var(--accent-primary)' : 'transparent',
          color: lang === 'am' ? '#fff' : 'var(--text-muted)',
          border: 'none', cursor: 'pointer',
          fontWeight: lang === 'am' ? 600 : 400,
          fontFamily: "'Noto Sans Ethiopic', var(--font-sans)",
          transition: 'var(--transition-fast)',
        }}
      >
        አማ
      </button>
    </div>
  );
}
