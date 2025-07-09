// User types
export interface User {
  id: number;
  name: string;
  email: string;
  created_at?: string;
}

// Match Night types
export interface MatchNight {
  id: number;
  date: string;
  location: string;
  num_courts: number;
  created_at?: string;
  participants_count?: number;
  participants?: User[];
  matches?: Match[];
}

// Participation types
export interface Participation {
  id: number;
  user_id: number;
  match_night_id: number;
  created_at?: string;
  user?: User;
}

// Match types
export interface Match {
  id: number;
  match_night_id: number;
  player1_id: number;
  player2_id: number;
  player3_id: number;
  player4_id: number;
  round: number;
  court: number;
  created_at?: string;
  result?: MatchResult;
}

// Match Result types
export interface MatchResult {
  id: number;
  match_id: number;
  score?: string;
  winner_ids: number[];
  created_at?: string;
}

// API Response types
export interface ApiResponse<T> {
  message?: string;
  error?: string;
  data?: T;
}

export interface AuthResponse {
  message: string;
  user: User;
}

export interface MatchNightResponse {
  message: string;
  match_night: MatchNight;
}

export interface MatchNightsResponse {
  match_nights: MatchNight[];
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
}

export interface CreateMatchNightForm {
  date: string;
  location: string;
  num_courts: number;
}

export interface SubmitResultForm {
  score?: string;
  winner_ids: number[];
} 