import axios from "axios";
import { getAuthHeaders } from "./authService";

// Define the API base URL
const API_URL = "http://localhost:5000/api/send-email";

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