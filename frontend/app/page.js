'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      router.replace(isAuthenticated ? '/dashboard' : '/login');
    }
  }, [isAuthenticated, loading, router]);

  return (
    <div className="loading-page">
      <div className="spinner spinner-lg"></div>
      <p style={{ color: 'var(--text-muted)' }}>Loading GymX...</p>
    </div>
  );
}
