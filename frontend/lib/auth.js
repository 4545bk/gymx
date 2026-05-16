'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Restore session on mount + silent token refresh
  useEffect(() => {
    const restore = async () => {
      const stored = localStorage.getItem('staff');
      const token = localStorage.getItem('accessToken');
      if (stored && token) {
        setStaff(JSON.parse(stored));
        // Try silent token refresh to extend session
        try {
          const { data } = await api.post('/auth/refresh', {});
          if (data?.data?.accessToken) {
            localStorage.setItem('accessToken', data.data.accessToken);
          }
        } catch (e) {
          // Refresh failed — token may be truly expired, keep current state
          // User will be redirected to login on next API call that returns 401
        }
      }
      setLoading(false);
    };
    restore();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    const { accessToken, staff: staffData } = data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('staff', JSON.stringify(staffData));
    setStaff(staffData);
    router.push('/dashboard');
    return staffData;
  }, [router]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) { /* ignore */ }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('staff');
    setStaff(null);
    router.push('/login');
  }, [router]);

  const isOwner = staff?.role === 'owner';
  const isReceptionist = staff?.role === 'receptionist';
  const isTrainer = staff?.role === 'trainer';

  return (
    <AuthContext.Provider value={{
      staff, loading, login, logout,
      isOwner, isReceptionist, isTrainer,
      isAuthenticated: !!staff,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
