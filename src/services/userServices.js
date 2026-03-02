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

export const getUserDeleteImpact = async (userId) => {
  try {
    const res = await api.get(`/users/${userId}/delete-impact`);
    return res.data;
  } catch (error) {
    handleError(error, `Failed to fetch delete impact for user ${userId}`);
  }
};

export const deleteUserWithReassignment = async (userId, reassignToUserId) => {
  try {
    const res = await api.post(`/users/${userId}/delete-with-reassignment`, { reassignToUserId });
    return res.data;
  } catch (error) {
    handleError(error, `Failed to delete user ${userId} with reassignment`);
  }
};

// Get visibility permissions by user ID
export const getUserVisibilityPermissions = async (userId) => {
  try {
    const res = await api.get(`/users/${userId}/visibility-permissions`);
    return res.data;
  } catch (error) {
    handleError(error, `Failed to fetch visibility permissions for user ${userId}`);
  }
};

// Save visibility permissions by user ID
export const saveUserVisibilityPermissions = async (userId, permissions) => {
  try {
    const res = await api.put(`/users/${userId}/visibility-permissions`, { permissions });
    return res.data;
  } catch (error) {
    handleError(error, `Failed to save visibility permissions for user ${userId}`);
  }
};

// Get effective visibility permissions by user ID
export const getEffectiveUserVisibilityPermissions = async (userId) => {
  try {
    const res = await api.get(`/users/${userId}/effective-visibility-permissions`);
    return res.data;
  } catch (error) {
    handleError(error, `Failed to fetch effective visibility permissions for user ${userId}`);
  }
};

export const getMyProfile = async () => {
  try {
    const res = await api.get('/users/me/profile');
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to fetch profile');
  }
};

export const updateMyProfile = async (payload) => {
  try {
    const res = await api.put('/users/me/profile', payload);
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to update profile');
  }
};
