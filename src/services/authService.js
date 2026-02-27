import authApi from './authApi';

/* ---------------------------------------
   AUTH SERVICES (PUBLIC ROUTES)
--------------------------------------- */

export const signup = async (userData) => {
  const res = await authApi.post('/auth/signup', userData);
  return res.data;
};

export const login = async (email, password) => {
  const res = await authApi.post('/auth/login', {
    email,
    password,
  });
  return res.data; // { accessToken, user }
};

export const logout = async () => {
  await authApi.post('/auth/logout');
};

export const forgotPassword = async (email) => {
  const res = await authApi.post('/auth/forgot-password', { email });
  return res.data;
};

export const resetPassword = async (token, newPassword) => {
  const res = await authApi.post('/auth/reset-password', {
    token,
    newPassword,
  });
  return res.data;
};

export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');

  return {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    },
  };
};
