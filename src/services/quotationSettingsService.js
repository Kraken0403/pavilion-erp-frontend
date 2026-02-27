import api from './api';


export const getQuotationSettings = async () => {
  const res = await api.get(`/quotation-settings`);
  return res.data;
};

export const saveQuotationSettings = async (data) => {
  const res = await api.post(`/quotation-settings`, data);
  return res.data;
};
