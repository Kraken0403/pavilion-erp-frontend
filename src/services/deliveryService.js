import api from './api';

export const createDeliveryFromWorkOrder = async (workOrderId, deliveryData) => {
  const res = await api.post(`/deliveries/create/${workOrderId}`, deliveryData);
  return res.data;
};

export const fetchDeliveries = async (date = null, status = null) => {
  let query = '/deliveries?';
  if (date) query += `date=${date}&`;
  if (status) query += `status=${status}`;
  
  const res = await api.get(query);
  return res.data;
};

export const fetchDeliveryById = async (id) => {
  const res = await api.get(`/deliveries/${id}`);
  return res.data;
};

export const updateDeliveryStatus = async (id, payload) => {
  // payload can be a string status or an object { status, delivery_man_name, delivery_man_phone, delivery_man_vehicle }
  const body = typeof payload === 'string' ? { status: payload } : (payload || {});
  const res = await api.patch(`/deliveries/${id}/status`, body);
  return res.data;
};

export const updateDeliveryNotes = async (id, delivery_notes) => {
  const res = await api.patch(`/deliveries/${id}/notes`, { delivery_notes });
  return res.data;
};

export const deleteDelivery = async (id) => {
  const res = await api.delete(`/deliveries/${id}`);
  return res.data;
};
