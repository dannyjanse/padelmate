export interface User {
  id: number;
  name: string;
  email?: string;
  created_at: string;
}

export interface MatchNight {
  id: number;
  date: string;
  location: string;
  num_courts: number;
  creator_id: number;
  creator?: User;
  game_status: string;
  created_at: string;
  participants_count: number;
  participants?: User[];
  matches?: Match[];
  player_stats?: PlayerStats[];
}

export interface PlayerStats {
  id: number;
  match_night_id: number;
  user_id: number;
  user_name?: string;
  total_points: number;
  created_at: string;
  updated_at: string;
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
  player1_name?: string;
  player2_id: number;
  player2_name?: string;
  player3_id: number;
  player3_name?: string;
  player4_id: number;
  player4_name?: string;
  round: number;
  court: number;
  is_naai_partij?: boolean;
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
  time?: string;
  location: string;
  num_courts?: number;
}

export interface SubmitMatchResultData {
  score?: string;
  winner_ids?: number[];
}

export interface LoginData {
  username: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email?: string;
  password: string;
}

export interface GameMode {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface GameSchema {
  id: number;
  match_night_id: number;
  game_mode: string;
  status: 'pending' | 'active' | 'completed';
  created_at: string;
  matches?: Match[];
} 