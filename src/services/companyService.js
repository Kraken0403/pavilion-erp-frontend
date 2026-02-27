import api from './api';

// 🔹 Get all companies
export const getCompanies = async () => {
  try {
    const res = await api.get(`/companies`);
    return res.data;
  } catch (error) {
    console.error('Failed to fetch companies:', error);
    throw error;
  }
};

// 🔹 Create a new company
export const createCompany = async (companyData) => {
  try {
    const res = await api.post(`/companies`, companyData);
    return res.data;
  } catch (error) {
    console.error('Failed to create company:', error);
    throw error;
  }
};
