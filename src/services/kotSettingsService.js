import api from './api';

export const getKotSettings = async () => {
  const res = await api.get('/kot-settings');
  return res.data;
};

export const saveKotSettings = async (data) => {
  const res = await api.post('/kot-settings', data);
  return res.data;
};
