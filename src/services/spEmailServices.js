import axios from "axios";
import { getAuthHeaders } from "./authService";

// Define the API base URL
const API_URL = "http://localhost:5000/api/send-email";
const WHATSAPP_API_URL = "http://localhost:5000/api/send-whatsapp";

export const sendEmail = async (leadData) => {
    try {
        const response = await axios.post(`${API_URL}`, leadData, getAuthHeaders());
        console.log(leadData)
        return response.data;
    }
    catch (error) {
        console.error("Error Sending the mail:", error);
        throw error.response?.data || error.message;
    }
}

export const sendWhatsApp = async (leadData) => {
    try {
        const response = await axios.post(`${WHATSAPP_API_URL}`, leadData, getAuthHeaders());
        return response.data;
    }
    catch (error) {
        console.error("Error Sending WhatsApp notification:", error);
        throw error.response?.data || error.message;
    }
}