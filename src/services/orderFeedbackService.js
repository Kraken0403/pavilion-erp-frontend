import api from './api';

export const fetchOrderFeedbacks = async (params = {}) => {
  const res = await api.get('/order-feedbacks', { params });
  return res.data;
};

export const fetchOrderFeedbackById = async (id) => {
  const res = await api.get(`/order-feedbacks/${id}`);
  return res.data;
};
