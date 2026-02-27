// src/services/customFieldService.js
import api from './api';

/* ---------------------------------------
   ERROR HANDLER
--------------------------------------- */
const handleError = (error, context = 'Custom field error') => {
  console.error(
    `❌ ${context}:`,
    error.response?.data || error.message || error
  );
  throw error;
};

/* ---------------------------------------
   CREATE CUSTOM FIELD
--------------------------------------- */
export const createCustomField = async (field) => {
  try {
    const response = await api.post('/custom-fields', field);
    return response.data;
  } catch (error) {
    handleError(error, 'Error creating custom field');
  }
};

/* ---------------------------------------
   GET ALL CUSTOM FIELDS
--------------------------------------- */
export const getAllCustomFields = async () => {
  try {
    const response = await api.get('/custom-fields');
    return response.data;
  } catch (error) {
    handleError(error, 'Error fetching custom fields');
  }
};

/* ---------------------------------------
   UPDATE CUSTOM FIELD
--------------------------------------- */
export const updateCustomField = async (fieldId, updatedData) => {
  try {
    const response = await api.put(
      `/custom-fields/${fieldId}`,
      updatedData
    );
    return response.data;
  } catch (error) {
    handleError(error, 'Error updating custom field');
  }
};

/* ---------------------------------------
   DELETE CUSTOM FIELD
--------------------------------------- */
export const deleteCustomField = async (fieldId) => {
  try {
    const response = await api.delete(
      `/custom-fields/${fieldId}`
    );
    return response.data;
  } catch (error) {
    handleError(error, 'Error deleting custom field');
  }
};
