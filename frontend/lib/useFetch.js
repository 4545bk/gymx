/**
 * useFetch — Reusable data fetching hook with loading, error, stale, and retry states.
 *
 * Usage:
 *   const { data, loading, error, isStale, lastFetched, retry } = useFetch('/api/v1/some-endpoint');
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import api from './api';

const STALE_THRESHOLD_MS = 60000; // 60 seconds

/**
 * @param {string} url - API endpoint (relative to api baseURL)
 * @param {object} options
 * @param {boolean} options.enabled - Whether to fetch (default: true)
 * @param {number} options.pollInterval - If set, refetch every N ms
 * @param {object} options.params - Query params
 */
export function useFetch(url, { enabled = true, pollInterval = null, params = null } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const intervalRef = useRef(null);
  const staleCheckRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !url) return;

    try {
      setLoading((prev) => data === null ? true : prev); // Only show loading on initial fetch
      setError(null);
      const config = params ? { params } : {};
      const response = await api.get(url, config);
      setData(response.data);
      setLastFetched(Date.now());
      setIsStale(false);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to fetch');
      // Don't clear existing data on error — keep showing stale data
    } finally {
      setLoading(false);
    }
  }, [url, enabled, params, data]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [url, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling
  useEffect(() => {
    if (!pollInterval || !enabled) return;

    intervalRef.current = setInterval(fetchData, pollInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pollInterval, enabled, fetchData]);

  // Stale check
  useEffect(() => {
    staleCheckRef.current = setInterval(() => {
      if (lastFetched && Date.now() - lastFetched > STALE_THRESHOLD_MS) {
        setIsStale(true);
      }
    }, 10000); // Check every 10s

    return () => {
      if (staleCheckRef.current) clearInterval(staleCheckRef.current);
    };
  }, [lastFetched]);

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    fetchData();
  }, [fetchData]);

  return { data, loading, error, lastFetched, isStale, retry };
}

export default useFetch;
