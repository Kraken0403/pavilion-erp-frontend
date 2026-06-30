import axios from 'axios';

const trimTrailingSlash = (value) => String(value || '').replace(/\/+$/, '');

const getServerOrigin = () => {
  const raw =
    process.env.REACT_APP_BACKEND_URL ||
    process.env.REACT_APP_API_BASE_URL ||
    'http://localhost:5000';

  const cleaned = trimTrailingSlash(raw);

  try {
    const url = new URL(cleaned);
    return url.origin;
  } catch (error) {
    const apiIndex = cleaned.toLowerCase().indexOf('/api');
    return apiIndex >= 0 ? cleaned.slice(0, apiIndex) : cleaned;
  }
};

export const SERVER_ORIGIN = trimTrailingSlash(getServerOrigin());

const getApiBaseUrl = () => {
  const configuredApiUrl = trimTrailingSlash(process.env.REACT_APP_API_BASE_URL);

  if (!configuredApiUrl) {
    return `${SERVER_ORIGIN}/api`;
  }

  return configuredApiUrl.endsWith('/api')
    ? configuredApiUrl
    : `${configuredApiUrl}/api`;
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
    // Several normal app calls can return 403, for example admin-only
    // notification/user-permission endpoints. Logging out here causes the
    // "login then immediately kicked out" issue.
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
          `${SERVER_ORIGIN}/auth/refresh`,
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
