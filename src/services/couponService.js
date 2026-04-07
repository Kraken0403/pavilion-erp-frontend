import api from './api';

export const validateCoupon = async (code, total_amount, user_id = null) => {
  const res = await api.post('/coupons/validate', { code, total_amount, user_id });
  return res.data;
};

export const fetchPublicCoupons = async () => {
  const res = await api.get('/coupons');
  return res.data;
};

// Admin endpoints
export const fetchCouponsAdmin = async () => {
  const res = await api.get('/admin/coupons');
  return res.data;
};

export const createCouponAdmin = async (payload) => {
  const res = await api.post('/admin/coupons', payload);
  return res.data;
};

export const updateCouponAdmin = async (id, payload) => {
  const res = await api.put(`/admin/coupons/${id}`, payload);
  return res.data;
};

export const deleteCouponAdmin = async (id) => {
  const res = await api.delete(`/admin/coupons/${id}`);
  return res.data;
};
