// import api from "api";
import api from './api';

const handleError = (error, context = "Activity error") => {
  console.error(`❌ ${context}:`, error.response?.data || error.message || error);
  throw error;
};

// GET ALL ACTIVITIES FOR LEAD
export const getActivitiesByLead = async (leadId) => {
  try {
    const res = await api.get(`/leads/${leadId}/activities`);
    return res.data;
  } catch (error) {
    handleError(error, "Failed to fetch activities");
  }
};

// CREATE ACTIVITY
export const createActivity = async (leadId, data) => {
  try {
    const res = await api.post(
      `/leads/${leadId}/activities`,
      data
    );
    return res.data;
  } catch (error) {
    handleError(error, "Failed to create activity");
  }
};

// UPDATE ACTIVITY
export const updateActivity = async (activityId, data) => {
  try {
    const res = await api.put(
      `/activities/${activityId}`, data);
    return res.data;
  } catch (error) {
    handleError(error, "Failed to update activity");
  }
};

// DELETE ACTIVITY
export const deleteActivity = async (activityId) => {
  try {
    const res = await api.delete(`/activities/${activityId}`);
    return res.data;
  } catch (error) {
    handleError(error, "Failed to delete activity");
  }
};
