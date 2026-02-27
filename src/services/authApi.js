import axios from 'axios';

const authApi = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL, // http://localhost:5000
  withCredentials: true, // refresh token cookie
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export default authApi;
