/**
 * API Client — Axios instance with auth interceptor and offline optimizations.
 * Automatically attaches Bearer token, handles 401 refresh flow, retries network failures,
 * queues offline mutating requests, and caches GET requests with stale-while-revalidate pattern.
 */
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // Send cookies (refresh token)
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000, // 15 seconds timeout
});

// Memory cache for GET responses
const getCache = new Map();

// Attach access token, branch header, and handle offline queuing/GET caching
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Multi-branch: send selected branch as header
    const branchId = localStorage.getItem('gymx_current_branch');
    if (branchId && branchId !== 'all') {
      config.headers['x-branch-id'] = branchId;
    }

    // Queue POST/PUT/PATCH/DELETE requests when offline
    if (!navigator.onLine && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
      const queue = JSON.parse(localStorage.getItem('gymx_request_queue') || '[]');
      queue.push({
        url: config.url,
        method: config.method,
        data: config.data,
        headers: { ...config.headers },
      });
      localStorage.setItem('gymx_request_queue', JSON.stringify(queue));

      // Return a simulated offline queued response
      config.adapter = () => Promise.resolve({
        data: { success: true, queued: true, message: 'Offline: Request queued for synchronization' },
        status: 202,
        statusText: 'Accepted',
        headers: {},
        config,
      });
      return config;
    }
  }

  // Stale-While-Revalidate Caching for GET requests
  if (config.method?.toLowerCase() === 'get' && !config.headers?.['x-skip-cache']) {
    const key = config.url + '?' + JSON.stringify(config.params || {});
    const cached = getCache.get(key);
    const now = Date.now();

    if (cached && (now - cached.timestamp < 30000)) {
      // Revalidate in background
      axios({
        ...config,
        baseURL: API_BASE,
        headers: { ...config.headers, 'x-skip-cache': 'true' },
        adapter: undefined, // use default browser/node adapter
      })
      .then((res) => {
        getCache.set(key, { data: res.data, timestamp: Date.now() });
      })
      .catch(() => {});

      // Return cached value immediately
      config.adapter = () => Promise.resolve({
        data: cached.data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      });
    }
  }

  // Attach request start time for latency tracking
  config.metadata = { startTime: Date.now() };

  return config;
});

// Handle 401 silent token refresh, retry network failures, and cache GET responses
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => {
    // Cache successful GET responses
    if (res.config.method?.toLowerCase() === 'get' && !res.config.headers?.['x-skip-cache']) {
      const key = res.config.url + '?' + JSON.stringify(res.config.params || {});
      getCache.set(key, { data: res.data, timestamp: Date.now() });
    }

    // Performance monitoring: log slow operations (> 3 seconds)
    if (res.config?.metadata?.startTime) {
      const duration = Date.now() - res.config.metadata.startTime;
      if (duration > 3000) {
        import('@/lib/performance').then(({ logSlowCall }) => {
          logSlowCall(res.config.url, duration);
        }).catch(() => {});
      }
    }

    return res;
  },
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Performance monitoring for slow failed/timeout requests
    if (originalRequest.metadata?.startTime) {
      const duration = Date.now() - originalRequest.metadata.startTime;
      if (duration > 3000) {
        import('@/lib/performance').then(({ logSlowCall }) => {
          logSlowCall(originalRequest.url, duration);
        }).catch(() => {});
      }
    }

    // Network / timeout retry logic (up to 2 times, except 4xx status codes)
    const isNetworkOrTimeout = error.code === 'ECONNABORTED' || !error.response;
    const is4xx = error.response && error.response.status >= 400 && error.response.status < 500;
    
    if (originalRequest._retryCount === undefined) {
      originalRequest._retryCount = 0;
    }

    if (isNetworkOrTimeout && !is4xx && originalRequest._retryCount < 2) {
      originalRequest._retryCount++;
      // Wait 1 second before retrying
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return api(originalRequest);
    }

    // 401 Unauthorized handling
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true });
        const newToken = data.data.accessToken;
        localStorage.setItem('accessToken', newToken);
        api.defaults.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('staff');
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Auto-replay offline queued requests when browser goes online
if (typeof window !== 'undefined') {
  const replayQueue = async () => {
    const queue = JSON.parse(localStorage.getItem('gymx_request_queue') || '[]');
    if (queue.length === 0) return;
    localStorage.removeItem('gymx_request_queue');

    for (const req of queue) {
      try {
        await api({
          url: req.url,
          method: req.method,
          data: req.data,
          headers: req.headers,
        });
      } catch (err) {
        console.error('Failed to replay queued offline request:', err);
      }
    }
  };

  window.addEventListener('online', replayQueue);
  if (navigator.onLine) {
    replayQueue();
  }
}

export default api;
