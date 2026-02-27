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

      try {
        const refreshResponse = await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data.accessToken;

        if (!newAccessToken) {
          throw new Error('No access token returned');
        }

        // 🔐 Store new token
        localStorage.setItem('token', newAccessToken);

        // 🔁 Retry original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // ❌ Refresh failed → hard logout
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshError);
      }
    }

    // ❌ Any other 401/403 → logout
    if (status === 401 || status === 403) {
      window.dispatchEvent(new Event('auth:logout'));
    }

    return Promise.reject(error);
  }
);

export default api;
