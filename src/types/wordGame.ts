export type WordGameTileStatus = "correct" | "present" | "absent" | "empty";

export type WordGameStatus = "playing" | "won" | "lost";

export type WordGameGuessLetter = {
  letter: string;
  status: WordGameTileStatus;
};

export type WordGameGuess = {
  word: string;
  letters: WordGameGuessLetter[];
};

export type WordGameDailyGame = {
  id: string;
  userId: string;
  dateKey: string;
  targetWord: string;
  guesses: WordGameGuess[];
  status: WordGameStatus;
  attemptsUsed: number;
  startedAt: number;
  firstGuessAt: number | null;
  finishedAt: number | null;
  durationMs: number | null;
  won: boolean;
};

export type WordGameDailyResult = {
  id: string;
  userId: string;
  userName: string;
  dateKey: string;
  won: boolean;
  attemptsUsed: number;
  durationMs: number | null;
  finishedAt: number;
  categoryLabel?: string;
};

export type WordGameUserStats = {
  userId: string;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  currentWinStreak: number;
  bestWinStreak: number;
  lastPlayedDateKey: string | null;
};

export type WordGameLeaderboardItem = {
  userId: string;
  userName: string;
  won: boolean;
  attemptsUsed: number;
  durationMs: number | null;
  finishedAt: number;
  rank: number;
  categoryLabel?: string;
};

export type WordGameAdminDailyStats = {
  dateKey: string;
  totalPlayers: number;
  totalWinners: number;
  fastestPlayer: WordGameLeaderboardItem | null;
  leaderboard: WordGameLeaderboardItem[];
};

export type WordGameWord = {
  word: string;
  category:
    | "sports"
    | "player"
    | "club"
    | "national"
    | "person"
    | "car"
    | "month"
    | "general";
};