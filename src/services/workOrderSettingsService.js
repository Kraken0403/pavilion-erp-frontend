import api from './api';
export const getWorkOrderSettings = async () => (await api.get('/work-order-settings')).data;
export const saveWorkOrderSettings = async (settings) => (await api.put('/work-order-settings', settings)).data;
