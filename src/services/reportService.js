import api from './api';
import { downloadPdfFromResponse } from '../utils/pdfHelpers';
import { toInputDateValue } from '../utils/dateFormatter';

/**
 * Generate Sales Report
 */
export const generateSalesReport = async (startDate, endDate, reportType = 'combined') => {
  try {
    const response = await api.get('/reports/sales', {
      params: { startDate, endDate, reportType }
    });
    return response.data;
  } catch (error) {
    console.error('Error generating sales report:', error);
    throw error;
  }
};

/**
 * Generate Customer Report
 */
export const generateCustomerReport = async (startDate, endDate, sourceType = null) => {
  try {
    const params = { startDate, endDate };
    if (sourceType) params.sourceType = sourceType;

    const response = await api.get('/reports/customers', {
      params
    });
    return response.data;
  } catch (error) {
    console.error('Error generating customer report:', error);
    throw error;
  }
};


/**
 * Generate Product Report
 */
export const generateProductReport = async (startDate, endDate) => {
  try {
    const response = await api.get('/reports/products', {
      params: { startDate, endDate }
    });
    return response.data;
  } catch (error) {
    console.error('Error generating product report:', error);
    throw error;
  }
};

/**
 * Generate Lead Report
 */
export const generateLeadReport = async (startDate, endDate) => {
  try {
    const response = await api.get('/reports/leads', {
      params: { startDate, endDate }
    });
    return response.data;
  } catch (error) {
    console.error('Error generating lead report:', error);
    throw error;
  }
};

/**
 * Generate Work Order Report
 */
export const generateWorkOrderReport = async (startDate, endDate) => {
  try {
    const response = await api.get('/reports/work-orders', {
      params: { startDate, endDate }
    });
    return response.data;
  } catch (error) {
    console.error('Error generating work order report:', error);
    throw error;
  }
};

/**
 * Generate Dashboard / Monthly Aggregated Data
 */
export const generateDashboardReport = async (month, months = 6) => {
  try {
    const response = await api.get('/reports/dashboard', {
      params: { month, months }
    });
    return response.data;
  } catch (error) {
    console.error('Error generating dashboard report:', error);
    throw error;
  }
};

/**
 * Download Report PDF
 */
export const downloadReportPdf = async (reportType, startDate, endDate, salesType = 'combined') => {
  try {
    const params = { startDate, endDate };
    if (reportType === 'sales') {
      params.reportType = salesType;
    }

    const response = await api.get(`/reports/${reportType}/pdf`, {
      params,
      responseType: 'blob'
    });

    await downloadPdfFromResponse(
      response,
      `${reportType}-report-${toInputDateValue(new Date())}.pdf`,
      'Failed to download report PDF'
    );
  } catch (error) {
    console.error('Error downloading report PDF:', error);
    throw error;
  }
};
