import axios from 'axios';
import type { 
  User, 
  MatchNight, 
  MatchResult,
  CreateMatchNightData,
  SubmitMatchResultData,
  LoginData,
  RegisterData 
} from '../types';

const API_BASE_URL = 'https://padelmate-backend.onrender.com'; // Production API URL

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Herstel cookies voor Flask-Login
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
    // Alleen redirecten als het geen auth check is en geen login call
    if (error.response?.status === 401 && 
        !error.config.url?.includes('/api/auth/me') &&
        !error.config.url?.includes('/api/auth/quick-login') &&
        !error.config.url?.includes('/api/auth/login')) {
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
  
  quickLogin: (data: LoginData) =>
    api.post<{ message: string; user: User }>('/api/auth/quick-login', data),
  
  logout: () => api.post('/api/auth/logout'),
  
  getCurrentUser: () => api.get<{ user: User }>('/api/auth/me'),
  
  initDatabase: () => api.post('/api/auth/init-db'),
  
  createTables: () => api.post('/api/auth/create-tables'),
  
  fixMatchNights: () => api.post('/api/auth/fix-match-nights'),
  
  testDatabase: () => api.get('/api/auth/test-db'),
  
  testUser: () => api.get('/api/auth/test-user'),
  
  checkDatabase: () => api.get('/api/auth/check-db'),
  
  getAllUsers: () => api.get<{ users: User[] }>('/api/auth/users'),
  
  addUsers: () => api.post('/api/auth/add-users'),
  
  reinitializeDatabase: () => api.post('/api/auth/reinit-db'),
  
  debugDatabase: () => api.get('/api/auth/debug-db'),
  
  fixSchema: () => api.post('/api/auth/fix-schema'),
  
  recalculateStats: (matchNightId: number) =>
    api.post(`/api/auth/recalculate-stats/${matchNightId}`),
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
  
  leave: (id: number, newCreatorId?: number) => 
    api.post(`/api/match-nights/${id}/leave`, newCreatorId ? { new_creator_id: newCreatorId } : {}),
  
  generateSchedule: (id: number, scheduleType?: string) =>
    api.post(`/api/match-nights/${id}/generate-schedule`, { schedule_type: scheduleType }),
  
  addParticipant: (matchNightId: number, userId: number) =>
    api.post(`/api/match-nights/${matchNightId}/add-participant`, { user_id: userId }),
  
  removeParticipant: (matchNightId: number, userId: number) =>
    api.post(`/api/match-nights/${matchNightId}/remove-participant`, { user_id: userId }),
  
  debugMatches: (matchNightId: number) =>
    api.get(`/api/match-nights/${matchNightId}/debug-matches`),
  
  clearMatches: (matchNightId: number) =>
    api.post(`/api/match-nights/${matchNightId}/clear-matches`),
  
  transferCreator: (matchNightId: number, newCreatorId: number) =>
    api.post(`/api/match-nights/${matchNightId}/transfer-creator`, { new_creator_id: newCreatorId }),
  
  deleteForAll: (matchNightId: number) =>
    api.delete(`/api/match-nights/${matchNightId}/delete`),
};

// Matches API
export const matchesAPI = {
  submitResult: (id: number, data: SubmitMatchResultData) =>
    api.post(`/api/matches/${id}/result`, data),
  
  getResult: (id: number) => api.get<MatchResult>(`/api/matches/${id}/result`),
};

// Game Schemas API
export const gameSchemasAPI = {
  startGame: (matchNightId: number, gameMode: string) =>
    api.post(`/api/game-schemas/${matchNightId}/start`, { game_mode: gameMode }),
  
  getGameStatus: (matchNightId: number) =>
    api.get(`/api/game-schemas/${matchNightId}/status`),
  
  stopGame: (matchNightId: number) =>
    api.post(`/api/game-schemas/${matchNightId}/stop`),
  
  completeGame: (matchNightId: number) =>
    api.post(`/api/game-schemas/${matchNightId}/complete`),
};

// Health check
export const healthCheck = () => api.get('/api/health');

export default api; 