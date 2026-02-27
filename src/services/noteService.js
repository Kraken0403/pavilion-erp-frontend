// src/services/notesService.js
import api from './api';

/* ---------------------------------------
   ERROR HANDLER
--------------------------------------- */
const handleError = (error, context = 'Note error') => {
  console.error(
    `❌ ${context}:`,
    error.response?.data || error.message || error
  );
  throw error;
};

/* ---------------------------------------
   GET NOTES BY LEAD
--------------------------------------- */
export const getNotesByLead = async (leadId) => {
  try {
    const res = await api.get(`/leads/${leadId}/notes`);
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to fetch notes');
  }
};

/* ---------------------------------------
   CREATE NOTE
--------------------------------------- */
export const createNote = async (leadId, noteText) => {
  try {
    const res = await api.post(`/leads/${leadId}/notes`, {
      note_text: noteText,
    });
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to create note');
  }
};

/* ---------------------------------------
   UPDATE NOTE
--------------------------------------- */
export const updateNote = async (noteId, noteText) => {
  try {
    const res = await api.put(`/notes/${noteId}`, {
      note_text: noteText,
    });
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to update note');
  }
};

/* ---------------------------------------
   DELETE NOTE
--------------------------------------- */
export const deleteNote = async (noteId) => {
  try {
    const res = await api.delete(`/notes/${noteId}`);
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to delete note');
  }
};
