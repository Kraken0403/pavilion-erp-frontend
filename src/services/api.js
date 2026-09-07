import axios from 'axios';

const trimTrailingSlash = (value) => String(value || '').replace(/\/+$/, '');

const stripApiSuffix = (value) => {
  const cleaned = trimTrailingSlash(value);
  return cleaned.replace(/\/api$/i, '');
};

const isLocalBrowser = () => {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1'].includes(window.location.hostname);
};

const getBackendBaseUrl = () => {
  // Never let a localhost frontend accidentally call the live ERP backend.
  // This also avoids production CORS/cookie behaviour while developing locally.
  if (process.env.NODE_ENV !== 'production' && isLocalBrowser()) {
    return 'http://localhost:5000';
  }

  const backendUrl = trimTrailingSlash(process.env.REACT_APP_BACKEND_URL);
  const apiBaseUrl = trimTrailingSlash(process.env.REACT_APP_API_BASE_URL);

  if (backendUrl) {
    return backendUrl;
  }

  if (apiBaseUrl) {
    return stripApiSuffix(apiBaseUrl);
  }

  // Dev fallback only
  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:5000';
  }

  // Production same-domain fallback for CloudPanel /backend proxy
  return `${window.location.origin}/backend`;
};

export const BACKEND_BASE_URL = trimTrailingSlash(getBackendBaseUrl());

// Backward-compatible export name, but now it preserves /backend.
export const SERVER_ORIGIN = BACKEND_BASE_URL;

export const resolveBackendAssetUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^(?:data:|blob:|https?:\/\/)/i.test(raw)) return raw;

  const normalized = raw.startsWith('/') ? raw : `/${raw}`;
  if (normalized === '/backend' || normalized.startsWith('/backend/')) {
    return `${window.location.origin}${normalized}`;
  }

  return `${BACKEND_BASE_URL}${normalized}`;
};

const getApiBaseUrl = () => {
  if (process.env.NODE_ENV !== 'production' && isLocalBrowser()) {
    return 'http://localhost:5000/api';
  }

  const configuredApiUrl = trimTrailingSlash(process.env.REACT_APP_API_BASE_URL);

  if (configuredApiUrl) {
    return configuredApiUrl.endsWith('/api')
      ? configuredApiUrl
      : `${configuredApiUrl}/api`;
  }

  return `${BACKEND_BASE_URL}/api`;
};

/* ---------------------------------------
   AXIOS INSTANCE
--------------------------------------- */
const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

/* ---------------------------------------
   REQUEST INTERCEPTOR
--------------------------------------- */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

const isAuthPublicRequest = (url = '') => {
  const value = String(url || '');
  return (
    value.includes('/auth/login') ||
    value.includes('/auth/signup') ||
    value.includes('/auth/forgot-password') ||
    value.includes('/auth/reset-password') ||
    value.includes('/auth/refresh') ||
    value.includes('/auth/logout')
  );
};

/* ---------------------------------------
   RESPONSE INTERCEPTOR (REFRESH LOGIC)
--------------------------------------- */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;

    // Network/server-down errors should not destroy the local session.
    if (!error.response) {
      return Promise.reject(error);
    }

    // 403 means forbidden/no permission. Do NOT logout.
    if (status === 403) {
      return Promise.reject(error);
    }

    // Try refreshing only for protected API calls with an expired access token.
    if (
      status === 401 &&
      !originalRequest._retry &&
      !isAuthPublicRequest(originalRequest.url)
    ) {
      originalRequest._retry = true;

      try {
        const refreshResponse = await axios.post(
          `${BACKEND_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken =
          refreshResponse.data?.accessToken ||
          refreshResponse.data?.token;

        if (!newAccessToken) {
          throw new Error('No access token returned');
        }

        localStorage.setItem('token', newAccessToken);

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshError);
      }
    }

    // Only a real unrefreshable 401 should logout.
    if (status === 401 && !isAuthPublicRequest(originalRequest.url)) {
      window.dispatchEvent(new Event('auth:logout'));
    }

    return Promise.reject(error);
  }
);

export default api;