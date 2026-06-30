// src/services/workOrderServices.js
import api from './api';

/* ---------------------------------------
   ERROR HANDLER
--------------------------------------- */
const handleError = (error, context = 'Work order error') => {
  console.error(
    `❌ ${context}:`,
    error.response?.data || error.message || error
  );
  throw error;
};

/* ---------------------------------------
   WORK ORDERS
--------------------------------------- */

// Create Work Order from Quotation
export const createWorkOrderFromQuotation = async (quotationId) => {
  try {
    const res = await api.post(
      `/work-orders/from-quotation/${quotationId}`,
      {}
    );
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to create work order from quotation');
  }
};


export const createWorkOrder = async (payload) => {
  try {
    const res = await api.post('/work-orders/manual', payload);
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to create work order');
  }
};

// Fetch all Work Orders
export const fetchWorkOrders = async () => {
  try {
    const res = await api.get('/work-orders');
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to fetch work orders');
  }
};

// Fetch Work Order by ID
export const fetchWorkOrderById = async (id) => {
  try {
    const res = await api.get(`/work-orders/${id}`);
    return res.data;
  } catch (error) {
    handleError(error, `Failed to fetch work order ${id}`);
  }
};

// Update Work Order Status
export const updateWorkOrderStatus = async (id, status) => {
  try {
    const res = await api.put(
      `/work-orders/${id}/status`,
      { status }
    );
    return res.data;
  } catch (error) {
    handleError(error, `Failed to update status for work order ${id}`);
  }
};

// Generate / Download Work Order PDF
export const generateWorkOrderPdf = async (workOrderId) => {
  if (!workOrderId) {
    throw new Error('Work Order ID is required');
  }

  try {
    const res = await api.get(
      `/work-orders/${workOrderId}/pdf`,
      {
        responseType: 'blob', // 🔥 REQUIRED
      }
    );

    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);

    window.open(url, '_blank');

    // cleanup
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);

  } catch (error) {
    handleError(error, 'Failed to generate work order PDF');
  }
};
