import api from './api';

const handleError = (error, context = 'Role error') => {
  console.error(`❌ ${context}:`, error.response?.data || error.message || error);
  throw error;
};

export const getAllRoles = async () => {
  try {
    const res = await api.get('/roles');
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to fetch roles');
  }
};

export const createRole = async (payload) => {
  try {
    const res = await api.post('/roles', payload);
    return res.data;
  } catch (error) {
    handleError(error, 'Failed to create role');
  }
};

export const updateRole = async (roleId, payload) => {
  try {
    const res = await api.put(`/roles/${roleId}`, payload);
    return res.data;
  } catch (error) {
    handleError(error, `Failed to update role ${roleId}`);
  }
};

export const deleteRole = async (roleId) => {
  try {
    const res = await api.delete(`/roles/${roleId}`);
    return res.data;
  } catch (error) {
    handleError(error, `Failed to delete role ${roleId}`);
  }
};

export const getRoleDeleteImpact = async (roleId) => {
  try {
    const res = await api.get(`/roles/${roleId}/delete-impact`);
    return res.data;
  } catch (error) {
    handleError(error, `Failed to fetch delete impact for role ${roleId}`);
  }
};

export const deleteRoleWithReassignment = async (roleId, reassignToRoleId) => {
  try {
    const res = await api.post(`/roles/${roleId}/delete-with-reassignment`, { reassignToRoleId });
    return res.data;
  } catch (error) {
    handleError(error, `Failed to delete role ${roleId} with reassignment`);
  }
};

export const getRoleVisibilityPermissions = async (roleId) => {
  try {
    const res = await api.get(`/roles/${roleId}/visibility-permissions`);
    return res.data;
  } catch (error) {
    handleError(error, `Failed to fetch role permissions for role ${roleId}`);
  }
};

export const saveRoleVisibilityPermissions = async (roleId, permissions) => {
  try {
    const res = await api.put(`/roles/${roleId}/visibility-permissions`, { permissions });
    return res.data;
  } catch (error) {
    handleError(error, `Failed to save role permissions for role ${roleId}`);
  }
};
