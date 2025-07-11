export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface MatchNight {
  id: number;
  date: string;
  location: string;
  num_courts: number;
  created_at: string;
  participants_count: number;
  participants?: User[];
  matches?: Match[];
}

export interface Participation {
  id: number;
  user_id: number;
  match_night_id: number;
  created_at: string;
  user?: User;
}

export interface Match {
  id: number;
  match_night_id: number;
  player1_id: number;
  player2_id: number;
  player3_id: number;
  player4_id: number;
  round: number;
  court: number;
  created_at: string;
  result?: MatchResult;
  player1?: User;
  player2?: User;
  player3?: User;
  player4?: User;
}

export interface MatchResult {
  id: number;
  match_id: number;
  score?: string;
  winner_ids: number[];
  created_at: string;
}

export interface CreateMatchNightData {
  date: string;
  location: string;
  num_courts?: number;
}

export interface SubmitMatchResultData {
  score?: string;
  winner_ids?: number[];
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
} 