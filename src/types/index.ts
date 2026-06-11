export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  country: string;
  favoriteTeam: string;
  points: number;
  correctPredictionsCount: number;
}

export type MatchStatus = "open" | "closing_soon" | "closed" | "live" | "finished";

export interface Match {
  id: string;
  teamA: string;
  teamB: string;
  flagA: string;
  flagB: string;
  time: string;
  date: string;
  group: string;
  round: string;
  stadium: string;
  timestamp: number;
  status: MatchStatus;
  scoreA?: number;
  scoreB?: number;
  liveMinute?: string;
  liveData?: {
    goals: string[];
    cards: string[];
    subs: string[];
  };
}

export interface Prediction {
  id: string;
  userId: string;
  userName: string;
  favoriteTeam: string;
  matchId: string;
  scoreA: number;
  scoreB: number;
  timestamp: number;
  lastUpdated: number;
}

export interface GlobalStats {
  totalUsers: number;
  totalPredictions: number;
  mostPredictedMatch: string;
  liveMatchesCount: number;
  remainingMatchesCount: number;
  todayHero: string;
  mostActiveUser: string;
  highestSuccessRate: string;
  hardestMatch: string;
  mostSupportedTeam: string;
}