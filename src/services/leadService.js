// src/services/leadsService.js
import api from './api';

/* ---------------------------------------
   ERROR HANDLER
--------------------------------------- */
const handleError = (error, context = 'Lead error') => {
  console.error(
    `❌ ${context}:`,
    error.response?.data || error.message || error
  );
  throw error;
};

/* ---------------------------------------
   FETCH ALL LEADS
--------------------------------------- */
export const fetchLeads = async () => {
  try {
    const res = await api.get('/leads');

    // CASE 1 — expected structure { leads: [...] }
    if (res.data?.leads) {
      return res.data;
    }

    // CASE 2 — backend returns array
    if (Array.isArray(res.data)) {
      return { leads: res.data };
    }

    // CASE 3 — fallback
    return { leads: [] };
  } catch (error) {
    handleError(error, 'Failed to fetch leads');
  }
};

/* ---------------------------------------
   ADD LEAD
--------------------------------------- */
export const addLead = async (leadData) => {
  try {
    const res = await api.post('/leads', leadData);
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to add lead');
  }
};

/* ---------------------------------------
   UPDATE LEAD
--------------------------------------- */
export const updateLead = async (id, leadData) => {
  try {
    const res = await api.put(`/leads/${id}`, leadData);
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to update lead');
  }
};

/* ---------------------------------------
   DELETE LEAD
--------------------------------------- */
export const deleteLead = async (id) => {
  try {
    const res = await api.delete(`/leads/${id}`);
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to delete lead');
  }
};

/* ---------------------------------------
   FETCH FILTERED LEADS
--------------------------------------- */
export const fetchFilteredLeads = async (filters = {}) => {
  const { status, salesperson_id } = filters;

  try {
    const res = await api.get('/leads/filter', {
      params: { status, salesperson_id },
    });

    return res.data;
  } catch (error) {
    handleError(error, 'Failed to fetch filtered leads');
  }
};

/* ---------------------------------------
   EDIT LEAD (ALIAS OF UPDATE)
--------------------------------------- */
export const editLead = async (id, updatedData) => {
  try {
    const res = await api.put(`/leads/${id}`, updatedData);
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to edit lead');
  }
};

/* ---------------------------------------
   GET LEAD BY ID
--------------------------------------- */
export const getLeadById = async (id) => {
  try {
    const res = await api.get(`/leads/${id}`);
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to fetch lead by ID');
  }
};
