'use client';

/**
 * Branch Context — Multi-location support for GymX frontend.
 *
 * Provides:
 *   - branches: list of gym branches
 *   - currentBranch: selected branch (null = all branches for owner)
 *   - setCurrentBranch: switch branch
 *   - isMultiBranch: whether gym has 2+ branches
 *   - branchParam: query string to append to API calls (?branchId=xxx or '')
 *
 * The selected branch is persisted to localStorage.
 * All API calls automatically include the branch header via the api.js interceptor.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

const BranchContext = createContext(null);
const STORAGE_KEY = 'gymx_current_branch';

export function BranchProvider({ children }) {
  const [branches, setBranches] = useState([]);
  const [currentBranch, setCurrentBranchState] = useState(null); // null = 'all'
  const [loading, setLoading] = useState(true);

  // Fetch branches on mount
  useEffect(() => {
    let mounted = true;
    api.get('/branches?active=true')
      .then(res => {
        if (!mounted) return;
        const data = res.data?.data || [];
        setBranches(data);
        
        // Restore saved branch
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved && saved !== 'all') {
            const found = data.find(b => b._id === saved);
            if (found) setCurrentBranchState(found);
          }
        } catch (e) { /* ignore */ }
      })
      .catch(() => {
        // Single-branch gym or branches not set up — that's fine
        if (mounted) setBranches([]);
      })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, []);

  const setCurrentBranch = useCallback((branch) => {
    setCurrentBranchState(branch);
    try {
      localStorage.setItem(STORAGE_KEY, branch?._id || 'all');
    } catch (e) { /* ignore */ }
  }, []);

  const isMultiBranch = branches.length >= 2;
  const branchParam = currentBranch?._id ? `branchId=${currentBranch._id}` : '';
  const branchId = currentBranch?._id || null;

  return (
    <BranchContext.Provider value={{
      branches,
      currentBranch,
      setCurrentBranch,
      isMultiBranch,
      branchParam,
      branchId,
      loading,
    }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) {
    // Fallback for components outside provider
    return {
      branches: [],
      currentBranch: null,
      setCurrentBranch: () => {},
      isMultiBranch: false,
      branchParam: '',
      branchId: null,
      loading: false,
    };
  }
  return ctx;
}
