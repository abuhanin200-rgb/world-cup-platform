export type RankDirection = "up" | "down" | "-";

export type Member = {
  id: string;
  fullName: string;
  phone: string;
  favoriteTeam: string;
  teamEmoji: string;
  points: number;
  total: number;
  correct: number;
  wrong: number;
  currentRank: number;
  previousRank: number;
  rankChange: number;
  rankDirection: RankDirection;
  currentStreak: number;
  bestStreak: number;
  seenNotices: Record<string, boolean>;
  createdAt?: string;
  updatedAt?: string;
  lastUpdated?: string;
};

export type MemberAuthResponse = {
  user: Member;
  customToken: string;
};
