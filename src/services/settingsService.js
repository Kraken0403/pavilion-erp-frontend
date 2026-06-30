// src/services/settingsService.js
import api from './api';

/* ---------------------------------------
   ERROR HANDLER
--------------------------------------- */
const handleError = (error, context = 'Settings error') => {
  console.error(
    `❌ ${context}:`,
    error.response?.data || error.message || error
  );
  throw error;
};

/* ---------------------------------------
   SETTINGS
--------------------------------------- */

export const getSettings = async () => {
  try {
    const res = await api.get('/settings');
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to fetch settings');
  }
};

export const getPublicSettings = async () => {
  try {
    const res = await api.get('/public/settings');
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to fetch public settings');
  }
};

export const getNotificationChannelFlags = async () => {
  try {
    const res = await api.get('/settings/notification-channels');
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to fetch notification channel flags');
  }
};

export const updateSettings = async (formData) => {
  try {
    const res = await api.put(
      '/settings',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return res.data;
  } catch (error) {
    handleError(error, 'Failed to update settings');
  }
};
