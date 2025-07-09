import axios from 'axios';

const API_BASE_URL = 'https://padelmate-backend.onrender.com';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for session cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth headers if needed
api.interceptors.request.use(
  (config) => {
    // You can add auth headers here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear any stored auth data and redirect to login
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/api/auth/register', data),
  
  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data),
  
  logout: () => api.post('/api/auth/logout'),
  
  getCurrentUser: () => api.get('/api/auth/me'),
  
  initDatabase: () => api.post('/api/auth/init-db'),
};

// Match Nights API calls
export const matchNightsAPI = {
  getAll: () => api.get('/api/match-nights/'),
  
  create: (data: { date: string; location: string; num_courts?: number }) =>
    api.post('/api/match-nights/', data),
  
  getById: (id: number) => api.get(`/api/match-nights/${id}`),
  
  join: (id: number) => api.post(`/api/match-nights/${id}/join`),
  
  leave: (id: number) => api.post(`/api/match-nights/${id}/leave`),
  
  generateSchedule: (id: number, scheduleType?: string) =>
    api.post(`/api/match-nights/${id}/generate-schedule`, { schedule_type: scheduleType }),
};

// Matches API calls
export const matchesAPI = {
  submitResult: (id: number, data: { score?: string; winner_ids?: number[] }) =>
    api.post(`/api/matches/${id}/result`, data),
  
  getResult: (id: number) => api.get(`/api/matches/${id}/result`),
};

// Health check
export const healthCheck = () => api.get('/api/health');

export default api; 