import api from './api';

export const getPassbookAccounts = async () => {
  const res = await api.get('/passbook/accounts');
  return res.data?.data || [];
};

export const createPassbookAccount = async (payload) => {
  const res = await api.post('/passbook/accounts', payload);
  return res.data?.data || res.data;
};

export const getPassbookEntries = async (params = {}) => {
  const res = await api.get('/passbook/entries', { params });
  return res.data?.data || [];
};

export const createPassbookEntry = async (payload) => {
  const res = await api.post('/passbook/entries', payload);
  return res.data?.data || res.data;
};

export const getPassbookSummary = async (params = {}) => {
  const res = await api.get('/passbook/summary', { params });
  return res.data?.data || {};
};
