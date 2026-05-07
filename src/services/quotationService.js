// src/services/quotationService.js
import api from './api';
import { downloadPdfFromResponse } from '../utils/pdfHelpers';

/* ---------------------------------------
   ERROR HANDLER
--------------------------------------- */
const handleError = (error, context = 'Quotation error') => {
  console.error(
    `❌ ${context}:`,
    error.response?.data || error.message || error
  );
  throw error;
};


/**
 * Create a new quotation with items
 */
export const createQuotation = async (quotationData) => {
  try {
    const res = await api.post('/quotations', quotationData);
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to create quotation');
  }
};

/**
 * Update quotation status
 */
export const updateQuotationStatus = async (id, status) => {
  try {
    const res = await api.put(`/quotations/${id}/status`, { status });
    return res.data;
  } catch (error) {
    handleError(error, `Failed to update status for quotation ${id}`);
  }
};

/**
 * Get all quotations
 */
export const fetchQuotations = async () => {
  try {
    const res = await api.get('/quotations');
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to fetch quotations');
  }
};

/**
 * Get approved quotations only
 */
export const fetchApprovedQuotations = async () => {
  const data = await fetchQuotations();
  const list = Array.isArray(data) ? data : data?.data || [];
  return list.filter(
    (q) => String(q.status || '').trim().toLowerCase() === 'approved'
  );
};

/**
 * Get quotation by ID (includes items)
 */
export const fetchQuotationById = async (id) => {
  try {
    const res = await api.get(`/quotations/${id}`);
    return res.data;
  } catch (error) {
    handleError(error, `Failed to fetch quotation ${id}`);
  }
};

/**
 * Update quotation header
 */
export const updateQuotation = async (id, updatedData) => {
  try {
    const res = await api.put(`/quotations/${id}`, updatedData);
    return res.data;
  } catch (error) {
    handleError(error, `Failed to update quotation ${id}`);
  }
};

/**
 * Delete quotation
 */
export const deleteQuotation = async (id) => {
  try {
    const res = await api.delete(`/quotations/${id}`);
    return res.data;
  } catch (error) {
    handleError(error, `Failed to delete quotation ${id}`);
  }
};

/**
 * Update quotation items (replace all items)
 */
export const updateQuotationItems = async (id, items) => {
  try {
    const res = await api.put(`/quotations/${id}/items`, { items });
    return res.data;
  } catch (error) {
    handleError(error, `Failed to update items for quotation ${id}`);
  }
};

/* =======================
   QUOTATION PDF
======================= */

export const generateQuotationPdf = async (quotationId) => {
  if (!quotationId) {
    throw new Error('Quotation ID is required');
  }

  try {
    const res = await api.get(
      `/quotations/${quotationId}/pdf-puppet`,
      { responseType: 'blob' } // 👈 IMPORTANT
    );
     // Extract filename from Content-Disposition header
    const disposition = res.headers['content-disposition'];
    let filename = `quotation-${quotationId}.pdf`; // fallback
    if (disposition) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match) filename = match[1];
    }

    await downloadPdfFromResponse(
      res,
      filename,  // ✅ uses server filename
      'Failed to download quotation PDF'
    );

  } catch (error) {
    handleError(error, 'Failed to generate quotation PDF');
  }
};

export const sendQuotationEmailToCustomer = async (quotationId) => {
  if (!quotationId) {
    throw new Error('Quotation ID is required');
  }

  try {
    const res = await api.post(`/quotations/${quotationId}/send-email`);
    return res.data;
  } catch (error) {
    handleError(error, `Failed to send quotation email for ${quotationId}`);
  }
};

export const sendQuotationWhatsAppToCustomer = async (quotationId) => {
  if (!quotationId) {
    throw new Error('Quotation ID is required');
  }

  try {
    const res = await api.post(`/quotations/${quotationId}/send-whatsapp`);
    return res.data;
  } catch (error) {
    handleError(error, `Failed to send quotation WhatsApp for ${quotationId}`);
  }
};
