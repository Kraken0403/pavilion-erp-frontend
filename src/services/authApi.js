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

const BACKEND_BASE_URL = trimTrailingSlash(getServerOrigin());

const authApi = axios.create({
  baseURL: BACKEND_BASE_URL,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export default authApi;
