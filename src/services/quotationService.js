// src/services/quotationService.js
import api from './api';

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
 * Get approved quotations for work orders/proforma creation.
 * Backend currently exposes /quotations, so filtering is kept on the frontend.
 */
export const fetchApprovedQuotations = async () => {
  const quotations = await fetchQuotations();

  return Array.isArray(quotations)
    ? quotations.filter((quotation) => String(quotation?.status || '').toLowerCase() === 'approved')
    : [];
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

const getFilenameFromDisposition = (contentDisposition, fallback) => {
  const header = String(contentDisposition || '');

  const encodedMatch = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1].replace(/["']/g, ''));
    } catch (_) {
      return encodedMatch[1].replace(/["']/g, '');
    }
  }

  const regularMatch = header.match(/filename="?([^";]+)"?/i);
  if (regularMatch?.[1]) {
    return regularMatch[1].trim();
  }

  return fallback;
};

export const generateQuotationPdf = async (quotationId) => {
  if (!quotationId) {
    throw new Error('Quotation ID is required');
  }

  try {
    const res = await api.get(
      `/quotations/${quotationId}/pdf`,
      { responseType: 'blob' }
    );

    const fallbackFilename = `Quotation-${quotationId}.pdf`;
    const filename = getFilenameFromDisposition(
      res.headers?.['content-disposition'],
      fallbackFilename
    );

    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || fallbackFilename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    handleError(error, 'Failed to generate quotation PDF');
  }
};
