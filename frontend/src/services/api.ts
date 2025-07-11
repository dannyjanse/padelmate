import axios from 'axios';
import type { 
  User, 
  MatchNight, 
  Match, 
  MatchResult,
  CreateMatchNightData,
  SubmitMatchResultData,
  LoginData,
  RegisterData 
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Alleen redirecten als het geen auth check is
    if (error.response?.status === 401 && !error.config.url?.includes('/api/auth/me')) {
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: RegisterData) =>
    api.post<{ message: string; user: User }>('/api/auth/register', data),
  
  login: (data: LoginData) =>
    api.post<{ message: string; user: User }>('/api/auth/login', data),
  
  logout: () => api.post('/api/auth/logout'),
  
  getCurrentUser: () => api.get<{ user: User }>('/api/auth/me'),
  
  initDatabase: () => api.post('/api/auth/init-db'),
  
  getAllUsers: () => api.get<{ users: User[] }>('/api/auth/users'),
};

// Match Nights API
export const matchNightsAPI = {
  getAll: () => api.get<{ match_nights: MatchNight[] }>('/api/match-nights/'),
  
  create: (data: CreateMatchNightData) =>
    api.post<{ message: string; match_night: MatchNight }>('/api/match-nights/', data),
  
  getById: (id: number) => api.get<MatchNight>(`/api/match-nights/${id}`),
  
  update: (id: number, data: CreateMatchNightData) =>
    api.put<{ message: string; match_night: MatchNight }>(`/api/match-nights/${id}`, data),
  
  delete: (id: number) => api.delete(`/api/match-nights/${id}`),
  
  join: (id: number) => api.post(`/api/match-nights/${id}/join`),
  
  leave: (id: number) => api.post(`/api/match-nights/${id}/leave`),
  
  generateSchedule: (id: number, scheduleType?: string) =>
    api.post(`/api/match-nights/${id}/generate-schedule`, { schedule_type: scheduleType }),
  
  addParticipant: (matchNightId: number, userId: number) =>
    api.post(`/api/match-nights/${matchNightId}/add-participant`, { user_id: userId }),
  
  removeParticipant: (matchNightId: number, userId: number) =>
    api.post(`/api/match-nights/${matchNightId}/remove-participant`, { user_id: userId }),
};

// Matches API
export const matchesAPI = {
  submitResult: (id: number, data: SubmitMatchResultData) =>
    api.post(`/api/matches/${id}/result`, data),
  
  getResult: (id: number) => api.get<MatchResult>(`/api/matches/${id}/result`),
};

// Health check
export const healthCheck = () => api.get('/api/health');

export default api; 