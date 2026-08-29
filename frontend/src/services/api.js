import axios from 'axios';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // When running on Vercel or cloud, connect to the hosted backend
    if (host.includes('vercel.app') || host.includes('onrender.com')) {
      return 'https://tournament-var-system.onrender.com/api';
    }
    // When running locally, connect to local backend
    return `http://${host}:8000/api`;
  }
  return import.meta.env.VITE_API_URL || 'https://tournament-var-system.onrender.com/api';
};

const API_BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export default api;
