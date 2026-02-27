// src/services/meetingService.js
import axios from 'axios';

import { getAuthHeaders } from './authService';

const API_URL = 'http://localhost:5000/api/meetings';

// Add a new meeting
export const createMeeting = async (meetingData) => {
  try {
    const response = await axios.post(API_URL, meetingData, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error('Error adding meeting:', error.response || error.message);
    throw error;
  }
};

// Get all meetings for a specific lead
export const getMeetingsByLead = async (leadId) => {
  try {
    const response = await axios.get(`${API_URL}/${leadId}`, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error('Error fetching meetings:', error.response || error.message);
    throw error;
  }
};

// Delete a meeting
export const deleteMeeting = async (meetingId) => {
  try {
    const response = await axios.delete(`${API_URL}/${meetingId}`, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error('Error deleting meeting:', error.response || error.message);
    throw error;
  }
};
