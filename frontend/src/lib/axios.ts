import axios from 'axios';

const getInitialBaseURL = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal && envUrl.includes('localhost')) {
      return envUrl.replace('localhost', window.location.hostname);
    }
  }
  return envUrl;
};

const api = axios.create({
  baseURL: getInitialBaseURL(),
  withCredentials: true, // Strictly relies on HTTP-only, secure, SameSite cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined' && config.baseURL && config.baseURL.includes('localhost')) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      config.baseURL = config.baseURL.replace('localhost', window.location.hostname);
    }
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });

  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    // Defense-in-depth: if logout endpoint is invoked, ensure any historical legacy localStorage keys are purged
    if (typeof window !== 'undefined' && response.config.url?.includes('/auth/logout')) {
      try {
        localStorage.removeItem('akwaaba_access_token');
        localStorage.removeItem('akwaaba_refresh_token');
      } catch {}
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle token refresh on 401 Unauthorized
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== '/auth/login' &&
      originalRequest.url !== '/auth/login/2fa' &&
      originalRequest.url !== '/auth/refresh'
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // withCredentials: true transmits the HTTP-only refreshToken cookie automatically
        await api.post('/auth/refresh');
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);

        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('akwaaba_access_token');
            localStorage.removeItem('akwaaba_refresh_token');
          } catch {}

          const currentPath = window.location.pathname;
          const isProtected = 
            currentPath.startsWith('/dashboard') || 
            (currentPath.startsWith('/admin') && currentPath !== '/admin/login') ||
            currentPath.startsWith('/account') || 
            currentPath.startsWith('/settings') || 
            currentPath.startsWith('/bookings') || 
            currentPath.startsWith('/onboarding') ||
            currentPath.startsWith('/lease-agreement');

          if (isProtected) {
            window.location.href = currentPath.startsWith('/admin') ? '/admin/login' : '/login';
          }
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (
      error.response?.status === 503 &&
      (error.response?.data?.code === 'MAINTENANCE_MODE' || error.response?.data?.maintenanceMode)
    ) {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (!path.startsWith('/admin') && path !== '/maintenance') {
          window.location.href = '/maintenance';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
