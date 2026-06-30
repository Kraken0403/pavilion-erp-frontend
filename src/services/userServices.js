// src/services/userServices.js
import api from './api';

/* ---------------------------------------
   ERROR HANDLER
--------------------------------------- */
const handleError = (error, context = 'User error') => {
  console.error(
    `❌ ${context}:`,
    error.response?.data || error.message || error
  );
  throw error;
};

/* ---------------------------------------
   USERS
--------------------------------------- */

// Fetch all users
export const getAllUsers = async () => {
  try {
    const res = await api.get('/users');
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to fetch users');
  }
};

// Get user by ID
export const getUserById = async (userId) => {
  try {
    const res = await api.get(`/users/${userId}`);
    return res.data;
  } catch (error) {
    handleError(error, `Failed to fetch user ${userId}`);
  }
};

export const getUserVisibilityPermissions = async (userId) => {
  try {
    const res = await api.get(`/users/${userId}/visibility-permissions`);
    return res.data;
  } catch (error) {
    handleError(error, `Failed to fetch visibility permissions for user ${userId}`);
  }
};

export const updateUserVisibilityPermissions = async (userId, permissions) => {
  try {
    const res = await api.put(`/users/${userId}/visibility-permissions`, { permissions });
    return res.data;
  } catch (error) {
    handleError(error, `Failed to update visibility permissions for user ${userId}`);
  }
};

// Update a user
export const updateUser = async (userId, updatedData) => {
  try {
    const res = await api.put(
      `/users/${userId}`,
      updatedData
    );
    return res.data;
  } catch (error) {
    handleError(error, `Failed to update user ${userId}`);
  }
};

// Delete a user
export const deleteUser = async (userId) => {
  try {
    const res = await api.delete(`/users/${userId}`);
    return res.data;
  } catch (error) {
    handleError(error, `Failed to delete user ${userId}`);
  }
};
