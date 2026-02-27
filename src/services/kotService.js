import api from './api';

const handleError = (error, context = 'KOT error') => {
  console.error(`❌ ${context}:`, error.response?.data || error.message || error);
  throw error;
};

export const fetchKots = async (range = 'today') => {
  try {
    const res = await api.get('/kots', { params: { range } });
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to fetch KOTs');
  }
};

export const checkKotExists = async (workOrderId) => {
  try {
    const res = await api.get(`/kots/check/${workOrderId}`);
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to check KOT existence');
  }
};

export const generateKotFromWorkOrder = async (workOrderId) => {
  try {
    const res = await api.post(`/kots/generate/${workOrderId}`, {});
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to generate KOT');
  }
};

export const updateKotStatus = async (id, status) => {
  try {
    const res = await api.patch(`/kots/${id}/status`, { status });
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to update KOT status');
  }
};
