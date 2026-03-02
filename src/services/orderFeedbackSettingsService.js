import api from './api';

export const getOrderFeedbackSettings = async () => {
  const res = await api.get('/order-feedbacks/settings');
  return res.data;
};

export const saveOrderFeedbackSettings = async (payload) => {
  const res = await api.post('/order-feedbacks/settings', payload);
  return res.data;
};
