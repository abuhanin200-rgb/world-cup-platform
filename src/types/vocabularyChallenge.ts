export type VocabularyChallengeMode = "solo" | "duel";
export type VocabularyBotDifficulty = "easy" | "normal" | "hard";
export type VocabularyChallengeRoomStatus = "waiting" | "playing" | "finished" | "cancelled";
export type VocabularyChallengeFinishReason = "cards" | "time" | "forfeit" | "disconnect" | "cancelled" | null;
export type VocabularyLeaderboardPeriod = "daily" | "weekly" | "season";

export type VocabularyChallengePlayerSummary = {
  userId: string;
  userName: string;
  cardCount: number;
  moves: number;
  draws: number;
  isBot?: boolean;
  lastSeenAt?: number;
};

export type VocabularyChallengeMove = {
  actorId: string;
  actorName: string;
  beforeWord: string;
  afterWord: string;
  letter: string;
  position: number;
  at: number;
};

export type VocabularyChallengeLastMove = VocabularyChallengeMove | null;



export type VocabularyVoiceIceConfig = {
  iceServers: RTCIceServer[];
  turnEnabled: boolean;
  provider: "cloudflare" | "static" | "stun-only";
};

export type VocabularyVoiceDescription = {
  sessionId: string;
  fromUserId: string;
  sdp: string;
  at: number;
};

export type VocabularyChallengeRoom = {
  id: string;
  dictionaryVersion: string;
  mode: VocabularyChallengeMode;
  botDifficulty?: VocabularyBotDifficulty | null;
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
  recentMoves?: VocabularyChallengeMove[];
  resultIds: Record<string, string>;
  rematchRequestedBy?: string | null;
  rematchRoomId?: string | null;
  voiceSessionId?: string | null;
  voiceOffer?: VocabularyVoiceDescription | null;
  voiceAnswer?: VocabularyVoiceDescription | null;
  voiceUpdatedAt?: number | null;
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

export type VocabularyLeaderboardEntry = {
  rank: number;
  userId: string;
  userName: string;
  score: number;
  wins: number;
  duelWins: number;
  soloWins: number;
  games: number;
  words: number;
  streak: number;
  bestDurationMs: number | null;
};

export type VocabularyLeaderboard = {
  period: VocabularyLeaderboardPeriod;
  periodKey: string;
  timezone: "Asia/Riyadh";
  totalPlayers: number;
  entries: VocabularyLeaderboardEntry[];
  me: VocabularyLeaderboardEntry | null;
};

export type VocabularyDailyLeaderboardEntry = VocabularyLeaderboardEntry;
export type VocabularyDailyLeaderboard = VocabularyLeaderboard;

export type VocabularyAchievement = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number;
  target: number;
};

export type VocabularyProfile = {
  games: number;
  wins: number;
  losses: number;
  draws: number;
  duelWins: number;
  soloWins: number;
  words: number;
  cardsDrawn: number;
  winRate: number;
  bestDurationMs: number | null;
  todayWinStreak: number;
  bestWinStreak: number;
  achievements: VocabularyAchievement[];
};

export type VocabularyDictionaryClientOverrides = {
  enabledWords: string[];
  disabledWords: string[];
};

export type VocabularyChallengeAction =
  | { action: "create"; mode: VocabularyChallengeMode; botDifficulty?: VocabularyBotDifficulty }
  | { action: "join"; roomCode: string }
  | { action: "move"; roomId: string; cardId: string; position: number }
  | { action: "draw"; roomId: string }
  | { action: "timeout"; roomId: string }
  | { action: "forfeit"; roomId: string }
  | { action: "heartbeat"; roomId: string }
  | { action: "claimDisconnect"; roomId: string }
  | { action: "rematch"; roomId: string }
  | { action: "matchmake" }
  | { action: "cancelMatchmaking" }
  | { action: "botTurn"; roomId: string }
  | { action: "voiceSignal"; roomId: string; kind: "offer" | "answer" | "reset"; sessionId: string; sdp?: string }
  | { action: "reportWord"; roomId: string; word: string };
