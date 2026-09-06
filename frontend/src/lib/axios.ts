import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true, // Strict HTTP-only cookie authentication
  headers: {
    'Content-Type': 'application/json',
  },
});

// Purge any legacy tokens from localStorage to enforce pure httpOnly security
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('akwaaba_access_token');
    localStorage.removeItem('akwaaba_refresh_token');
  } catch (e) {
    // Non-blocking in sandboxed environments
  }
}

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/login' && originalRequest.url !== '/auth/refresh') {
      
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Rely exclusively on browser-sent httpOnly refreshToken cookie
        await api.post('/auth/refresh', {});
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (typeof window !== 'undefined') {
          const publicPaths = ['/login', '/register', '/admin/login', '/forgot-password', '/reset-password'];
          if (!publicPaths.includes(window.location.pathname) && window.location.pathname !== '/') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
