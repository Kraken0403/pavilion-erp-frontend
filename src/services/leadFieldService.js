// src/services/leadFieldsService.js
import api from './api';

/* ---------------------------------------
   ERROR HANDLER
--------------------------------------- */
const handleError = (error, context = 'Lead Fields error') => {
  console.error(
    `❌ ${context}:`,
    error.response?.data || error.message || error
  );
  throw error;
};

/* ---------------------------------------
   GET ALL LEAD FIELDS
--------------------------------------- */
export const getLeadFields = async () => {
  try {
    const res = await api.get('/lead-fields');
    return res.data.fields; // backend returns { fields: [...] }
  } catch (error) {
    handleError(error, 'Failed to fetch lead fields');
  }
};

/* ---------------------------------------
   SAVE SELECTED FIELD ORDER
--------------------------------------- */
export const saveSelectedFieldsOrder = async (updatedFields) => {
  try {
    const res = await api.post(
      '/lead-fields/save',
      { fields: updatedFields }
    );
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to save lead field order');
  }
};

/* ---------------------------------------
   GET FIELD ORDER
--------------------------------------- */
export const getFieldOrder = async () => {
  try {
    const res = await api.get('/lead-fields/order');
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to fetch lead field order');
  }
};
