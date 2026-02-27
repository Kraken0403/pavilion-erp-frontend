// src/services/workOrderItemServices.js
import api from './api';

/* ---------------------------------------
   ERROR HANDLER
--------------------------------------- */
const handleError = (error, context = 'Work order item error') => {
  console.error(
    `❌ ${context}:`,
    error.response?.data || error.message || error
  );
  throw error;
};

/* ---------------------------------------
   WORK ORDER ITEMS
--------------------------------------- */

// Save a new WorkOrderItem
export const saveWorkOrderItem = async (workOrderItemData) => {
  try {
    const res = await api.post(
      '/workOrderItem',
      workOrderItemData
    );
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to save work order item');
  }
};

// Update a WorkOrderItem
export const updateWorkOrderItem = async (id, updatedData) => {
  try {
    const res = await api.put(
      `/workOrderItem/${id}`,
      updatedData
    );
    return res.data;
  } catch (error) {
    handleError(error, `Failed to update work order item ${id}`);
  }
};
