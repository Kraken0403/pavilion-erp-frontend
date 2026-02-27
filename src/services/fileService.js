// src/services/fileService.js
import api from './api';

/* ---------------------------------------
   ERROR HANDLER
--------------------------------------- */
const handleError = (error, context = 'File error') => {
  console.error(
    `❌ ${context}:`,
    error.response?.data || error.message || error
  );
  throw error;
};

/* ---------------------------------------
   GET FILES BY LEAD
--------------------------------------- */
export const getFilesByLead = async (leadId) => {
  try {
    const res = await api.get(`/leads/${leadId}/files`);
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to fetch files');
  }
};

/* ---------------------------------------
   UPLOAD FILE
--------------------------------------- */
export const uploadFile = async (leadId, file) => {
  try {
    const form = new FormData();
    form.append('file', file);

    const res = await api.post(
      `/leads/${leadId}/files`,
      form,
      {
        headers: {
          // ❗ Let browser set boundary automatically
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return res.data;
  } catch (error) {
    handleError(error, 'Failed to upload file');
  }
};

/* ---------------------------------------
   DELETE FILE
--------------------------------------- */
export const deleteFile = async (fileId) => {
  try {
    const res = await api.delete(`/files/${fileId}`);
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to delete file');
  }
};
