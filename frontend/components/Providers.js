'use client';

import { AuthProvider } from '@/lib/auth';
import { I18nProvider } from '@/lib/i18n';
import { BranchProvider } from '@/lib/branchContext';
import { ToastProvider } from '@/components/Toast';
import OfflineBanner from '@/components/ui/OfflineBanner';

/**
 * Client-side providers wrapper.
 * Single client boundary for all context providers — avoids webpack RSC
 * module resolution race conditions that occur when a Server Component
 * imports multiple Client Components individually.
 */
export default function Providers({ children }) {
  return (
    <AuthProvider>
      <I18nProvider>
        <BranchProvider>
          <ToastProvider>
            <OfflineBanner />
            {children}
          </ToastProvider>
        </BranchProvider>
      </I18nProvider>
    </AuthProvider>
  );
}
