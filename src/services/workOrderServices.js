// src/services/workOrderServices.js
import api from './api';
import { downloadPdfFromResponse } from '../utils/pdfHelpers';

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

// Create Work Order Manually
export const createManualWorkOrder = async (workOrderData) => {
  try {
    const res = await api.post('/work-orders/manual', workOrderData);
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to create manual work order');
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

    await downloadPdfFromResponse(
      res,
      `work-order-${workOrderId}.pdf`,
      'Failed to download work order PDF'
    );

  } catch (error) {
    handleError(error, 'Failed to generate work order PDF');
  }
};
