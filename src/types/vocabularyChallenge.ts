export type VocabularyChallengeMode = "solo" | "duel";
export type VocabularyChallengeRoomStatus = "waiting" | "playing" | "finished" | "cancelled";
export type VocabularyChallengeFinishReason = "cards" | "time" | "forfeit" | "cancelled" | null;

export type VocabularyChallengePlayerSummary = {
  userId: string;
  userName: string;
  cardCount: number;
  moves: number;
  draws: number;
};

export type VocabularyChallengeLastMove = {
  actorId: string;
  actorName: string;
  beforeWord: string;
  afterWord: string;
  letter: string;
  position: number;
  at: number;
} | null;

export type VocabularyChallengeRoom = {
  id: string;
  dictionaryVersion: string;
  mode: VocabularyChallengeMode;
  status: VocabularyChallengeRoomStatus;
  roomCode: string | null;
  hostId: string;
  hostName: string;
  guestId: string | null;
  guestName: string | null;
  playerOrder: string[];
  players: Record<string, VocabularyChallengePlayerSummary>;
  startingWord: string;
  currentWord: string;
  turnPlayerId: string | null;
  turnStartedAt: number | null;
  turnEndsAt: number | null;
  turnDurationMs: number;
  matchStartedAt: number | null;
  matchEndsAt: number | null;
  matchDurationMs: number;
  winnerId: string | null;
  finishReason: VocabularyChallengeFinishReason;
  lastMove: VocabularyChallengeLastMove;
  resultIds: Record<string, string>;
  createdAt: number;
  updatedAt: number;
};

export type VocabularyChallengeCard = {
  id: string;
  letter: string;
};

export type VocabularyChallengeHand = {
  userId: string;
  cards: VocabularyChallengeCard[];
  updatedAt: number;
};


export type VocabularyDailyLeaderboardEntry = {
  rank: number;
  userId: string;
  userName: string;
  score: number;
  wins: number;
  duelWins: number;
  soloWins: number;
  games: number;
  words: number;
  bestDurationMs: number | null;
};

export type VocabularyDailyLeaderboard = {
  dateKey: string;
  timezone: "Asia/Riyadh";
  totalPlayers: number;
  entries: VocabularyDailyLeaderboardEntry[];
  me: VocabularyDailyLeaderboardEntry | null;
};

export type VocabularyChallengeAction =
  | { action: "create"; mode: VocabularyChallengeMode }
  | { action: "join"; roomCode: string }
  | { action: "move"; roomId: string; cardId: string; position: number }
  | { action: "draw"; roomId: string }
  | { action: "timeout"; roomId: string }
  | { action: "forfeit"; roomId: string };
