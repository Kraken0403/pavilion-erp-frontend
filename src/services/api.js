import axios from 'axios';

/* ---------------------------------------
   AXIOS INSTANCE
--------------------------------------- */
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  withCredentials: true, // 🔥 REQUIRED for refresh token cookies
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

    // Debug logging (enabled in non-production or via REACT_APP_DEBUG_AXIOS=true)
    if (process.env.NODE_ENV !== 'production' || process.env.REACT_APP_DEBUG_AXIOS === 'true') {
      try {
        const masked = token ? `${String(token).substring(0, 6)}...` : 'no-token';
        console.debug('[AXIOS DEBUG] Request ->', (config.method || '').toUpperCase(), config.url, 'Auth:', masked);
      } catch (e) {
        /* ignore logging errors */
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* ---------------------------------------
   RESPONSE INTERCEPTOR (REFRESH LOGIC)
--------------------------------------- */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // 🚫 If no response (network error, server down)
    if (!error.response) {
      if (process.env.NODE_ENV !== 'production' || process.env.REACT_APP_DEBUG_AXIOS === 'true') {
        console.debug('[AXIOS DEBUG] No response for request ->', originalRequest?.method?.toUpperCase(), originalRequest?.url);
      }
      return Promise.reject(error);
    }

    // 🔁 Handle expired access token
    if (
      status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;

      if (process.env.NODE_ENV !== 'production' || process.env.REACT_APP_DEBUG_AXIOS === 'true') {
        console.debug('[AXIOS DEBUG] 401 received for', originalRequest?.method?.toUpperCase(), originalRequest?.url, 'attempting refresh');
        console.debug('[AXIOS DEBUG] Response data:', error.response?.data);
      }
      try {
        const refreshResponse = await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data.accessToken;

        if (!newAccessToken) {
          if (process.env.NODE_ENV !== 'production' || process.env.REACT_APP_DEBUG_AXIOS === 'true') {
            console.debug('[AXIOS DEBUG] Refresh response did not include accessToken', refreshResponse.data);
          }
          throw new Error('No access token returned');
        }

        // 🔐 Store new token
        localStorage.setItem('token', newAccessToken);

        if (process.env.NODE_ENV !== 'production' || process.env.REACT_APP_DEBUG_AXIOS === 'true') {
          console.debug('[AXIOS DEBUG] Obtained new access token (masked):', `${String(newAccessToken).substring(0,6)}...`);
        }

        // 🔁 Retry original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // ❌ Refresh failed → hard logout
        if (process.env.NODE_ENV !== 'production' || process.env.REACT_APP_DEBUG_AXIOS === 'true') {
          console.debug('[AXIOS DEBUG] Token refresh failed', refreshError);
        }
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshError);
      }
    }

    // ❌ Logout on 401. For 403 only logout for non-notification routes
    if (
      status === 401 ||
      (status === 403 && !String(originalRequest?.url || '').includes('/notifications'))
    ) {
      if (process.env.NODE_ENV !== 'production' || process.env.REACT_APP_DEBUG_AXIOS === 'true') {
        console.debug('[AXIOS DEBUG] Received', status, 'for', originalRequest?.url, 'dispatching logout');
      }
      window.dispatchEvent(new Event('auth:logout'));
    }

    return Promise.reject(error);
  }
);

export default api;
