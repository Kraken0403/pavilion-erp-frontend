import api from './api';

// 🔹 Create a new contact
export const createContact = async (data) => {
  try {
    const res = await api.post(`/contacts`, data);
    return res.data;
  } catch (error) {
    console.error('Failed to create contact:', error);
    throw error;
  }
};

// 🔹 Get all contacts
export const getContacts = async () => {
  try {
    const res = await api.get(`/contacts`);
    return res.data;
  } catch (error) {
    console.error('Failed to fetch contacts:', error);
    throw error;
  }
};
export const getContactById = async (id) => {
  try {
    const res = await api.get(`/contacts/${id}`);
    return res.data;
  } catch (error) {
    console.error(`Failed to fetch contact ${id}:`, error);
    throw error;
  }
};

// export const createContact = async (contactData) => {
//   try {
//     const res = await axios.post(`/contacts`, contactData, getAuthHeaders());
//     return res.data;
//   } catch (error) {
//     console.error('Failed to create contact:', error);
//     throw error;
//   }
// };

export const updateContact = async (id, updatedData) => {
  try {
    const res = await api.put(`/contacts/${id}`, updatedData);
    return res.data;
  } catch (error) {
    console.error(`Failed to update contact ${id}:`, error);
    throw error;
  }
};

export const deleteContact = async (id) => {
  try {
    const res = await api.delete(`/contacts/${id}`);
    return res.data;
  } catch (error) {
    console.error(`Failed to delete contact ${id}:`, error);
    throw error;
  }
};
