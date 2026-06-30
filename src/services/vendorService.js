import api from './api';

export const getVendors = async (params = {}) => {
  const res = await api.get('/vendors', { params });
  return res.data?.data || [];
};

export const getVendorById = async (id) => {
  const res = await api.get(`/vendors/${id}`);
  return res.data?.data;
};

export const createVendor = async (payload) => {
  const res = await api.post('/vendors', payload);
  return res.data?.data || res.data;
};

export const updateVendor = async (id, payload) => {
  const res = await api.put(`/vendors/${id}`, payload);
  return res.data?.data || res.data;
};

export const deleteVendor = async (id) => {
  const res = await api.delete(`/vendors/${id}`);
  return res.data;
};

export const getVendorPayables = async (params = {}) => {
  const res = await api.get('/vendor-payables', { params });
  return res.data;
};

export const recordVendorPayment = async (payableId, amount) => {
  const res = await api.post(`/vendor-payables/${payableId}/payments`, { amount });
  return res.data;
};
