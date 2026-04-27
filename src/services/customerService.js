import api from "./api";

const API_BASE_URL = "/customers";

/**
 * Create a new customer
 */
export const createCustomer = async (customerData) => {
  try {
    const response = await api.post(API_BASE_URL, customerData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Get all customers
 */
export const getAllCustomers = async () => {
  try {
    const response = await api.get(API_BASE_URL);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Get customer by ID
 */
export const getCustomerById = async (customerId) => {
  try {
    const response = await api.get(`${API_BASE_URL}/${customerId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Update customer
 */
export const updateCustomer = async (customerId, customerData) => {
  try {
    const response = await api.put(`${API_BASE_URL}/${customerId}`, customerData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Delete customer
 */
export const deleteCustomer = async (customerId) => {
  try {
    const response = await api.delete(`${API_BASE_URL}/${customerId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};
