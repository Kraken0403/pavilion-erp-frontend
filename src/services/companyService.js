import api from './api';

// 🔹 Get all companies
export const getCompanies = async (scope) => {
  try {
    const res = await api.get(`/companies`, { params: scope ? { scope } : undefined });
    return res.data;
  } catch (error) {
    console.error('Failed to fetch companies:', error);
    throw error;
  }
};


export const getCompanyById = async (id) => {
  const res = await api.get(`/companies/${id}`);
  return res.data;
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

export const updateCompany = async (id, companyData) => {
  const res = await api.put(`/companies/${id}`, companyData);
  return res.data;
};

export const deleteCompany = async (id) => {
  const res = await api.delete(`/companies/${id}`);
  return res.data;
};
