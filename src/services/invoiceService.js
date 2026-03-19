import api from './api';
import { downloadPdfFromResponse } from '../utils/pdfHelpers';

// CREATE PROFORMA INVOICE
export const createProformaInvoice = async (payload) => {
  try {
    const res = await api.post('/proforma-invoices', payload);
    return res.data;
  } catch (error) {
    console.error('Failed to create proforma invoice:', error.response?.data || error);
    throw error;
  }
};

/* ---------------------------------------
   CREATE MANUAL INVOICE
--------------------------------------- */
export const createInvoice = async (payload) => {
  try {
    const res = await api.post('/invoices', payload);
    return res.data;
  } catch (error) {
    console.error('Failed to create invoice:', error.response?.data || error);
    throw error;
  }
};

/* ---------------------------------------
   CREATE FROM WORK ORDER
--------------------------------------- */
export const createInvoiceFromWorkOrder = async (workOrderId) => {
  const res = await api.post(`/invoices/from-workorder/${workOrderId}`);
  return res.data;
};

export const createProformaFromQuotation = async (quotationId) => {
  const res = await api.post(`/proforma-invoices/from-quotation/${quotationId}`);
  return res.data;
};

export const createTaxInvoiceFromProforma = async (proformaInvoiceId) => {
  const res = await api.post(`/proforma-invoices/${proformaInvoiceId}/create-tax-invoice`);
  return res.data;
};

/* ---------------------------------------
   GET ALL INVOICES
--------------------------------------- */
export const getInvoices = async () => {
  const res = await api.get('/invoices');
  return res.data;
};

export const getProformaInvoices = async () => {
  const res = await api.get('/proforma-invoices');
  return res.data;
};

/* ---------------------------------------
   GET SINGLE INVOICE
--------------------------------------- */
export const getInvoiceById = async (id) => {
  const res = await api.get(`/invoices/${id}`);
  return res.data;
};

export const getProformaInvoiceById = async (id) => {
  const res = await api.get(`/proforma-invoices/${id}`);
  return res.data;
};

/* ---------------------------------------
   SEND PROFORMA CHANNELS
--------------------------------------- */
export const sendProformaEmail = async (id) => {
  const res = await api.post(`/proforma-invoices/${id}/send-email`);
  return res.data;
}

export const sendProformaWhatsApp = async (id) => {
  const res = await api.post(`/proforma-invoices/${id}/send-whatsapp`);
  return res.data;
}

/* ---------------------------------------
   UPDATE STATUS
--------------------------------------- */
export const updateInvoiceStatus = async (id, status) => {
  const res = await api.put(`/invoices/${id}/status`, { status });
  return res.data;
};


export const getInvoiceSettings = async () => {
  const res = await api.get('/invoice-settings')
  return res.data
}

export const saveInvoiceSettings = async (data) => {
  const res = await api.post('/invoice-settings', data)
  return res.data
}


/* ---------------------------------------
   DOWNLOAD INVOICE PDF
--------------------------------------- */
export const downloadInvoicePdf = async (id) => {
  const res = await api.get(`/invoices/${id}/pdf`, {
    responseType: 'blob', // IMPORTANT
  });

  await downloadPdfFromResponse(res, `invoice-${id}.pdf`, 'Failed to download invoice PDF');
}

/* ---------------------------------------
   DOWNLOAD PROFORMA PDF
--------------------------------------- */
export const downloadProformaPdf = async (id) => {
  const res = await api.get(`/proforma-invoices/${id}/pdf`, {
    responseType: 'blob',
  })

  await downloadPdfFromResponse(res, `proforma-${id}.pdf`, 'Failed to download proforma PDF')
}


/* ---------------------------------------
   ADD PAYMENT TO INVOICE
--------------------------------------- */

export const addPaymentToInvoice = async (invoiceId, paymentsData) => {
  const res = await api.post(`/invoices/${invoiceId}/add-payment`, paymentsData);
  return res.data;
};


/* ---------------------------------------
   DOWNLOAD RECEIPT PDF
--------------------------------------- */
export const downloadReceiptPdf = async (receiptId) => {
  const res = await api.get('/invoices/payments/pdf', {
    params: { receiptId },
    responseType: 'blob',
  });

  await downloadPdfFromResponse(
    res,
    `Receipt-${receiptId}.pdf`,
    'Failed to download receipt PDF'
  );
};

/* ---------------------------------------
   SEND INVOICE EMAIL
--------------------------------------- */
export const sendInvoiceEmail = async (id) => {
  const res = await api.post(`/invoices/${id}/send-email`);
  return res.data;
};

export const sendInvoiceWhatsApp = async (id) => {
  const res = await api.post(`/invoices/${id}/send-whatsapp`);
  return res.data;
};

/* ---------------------------------------
   SEND RECEIPT CHANNELS
--------------------------------------- */
export const sendReceiptEmail = async (receiptId) => {
  const res = await api.post(`/invoices/payments/${receiptId}/send-email`);
  return res.data;
};

export const sendReceiptWhatsApp = async (receiptId) => {
  const res = await api.post(`/invoices/payments/${receiptId}/send-whatsapp`);
  return res.data;
};
