import api from './api';

export const getPaymentReminderSettings = async () => {
  const res = await api.get('/payment-reminders/settings');
  return res.data;
};

export const savePaymentReminderSettings = async (payload) => {
  const res = await api.post('/payment-reminders/settings', payload);
  return res.data;
};

export const getPendingPaymentReminders = async () => {
  const res = await api.get('/payment-reminders/pending');
  return res.data;
};

export const sendPaymentReminderEmail = async (invoiceId) => {
  const res = await api.post(`/payment-reminders/${invoiceId}/send-email`);
  return res.data;
};

export const sendPaymentReminderWhatsApp = async (invoiceId) => {
  const res = await api.post(`/payment-reminders/${invoiceId}/send-whatsapp`);
  return res.data;
};
