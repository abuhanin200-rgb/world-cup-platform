export type MajlisDifficulty = "easy" | "medium" | "hard";
export type MajlisQuestionType = "text" | "multiple_choice" | "audio" | "speech";

export type MajlisCategory = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
  accent: string;
  sortOrder: number;
  enabled: boolean;
  custom?: boolean;
  overridden?: boolean;
};

export type MajlisQuestion = {
  id: string;
  categoryId: string;
  groupKey: string;
  family?: string;
  prompt: string;
  answer: string;
  options?: string[];
  difficulty: MajlisDifficulty;
  points: number;
  hint?: string;
  explanation?: string;
  sourceLabel?: string;
  type: MajlisQuestionType;
  quoteText?: string;
  audioUrl?: string;
  audioFallbackUrl?: string;
  audioStartSeconds?: number;
  audioMaxSeconds?: number;
  audioSourceKey?: string;
  reciterName?: string;
  speechText?: string;
  speechLang?: string;
  enabled: boolean;
  custom?: boolean;
  overridden?: boolean;
};

export type MajlisClientQuestion = Omit<MajlisQuestion, "answer" | "explanation" | "sourceLabel" | "reciterName" | "enabled" | "custom" | "overridden">;

export type MajlisReveal = {
  questionId: string;
  answer: string;
  explanation: string;
  sourceLabel: string;
};

export type MajlisSettings = {
  categoriesPerGame: number;
  questionSeconds: number;
  stealSeconds: number;
  allowSteal: boolean;
  showExplanations: boolean;
  easyPoints: number;
  mediumPoints: number;
  hardPoints: number;
};

export const DEFAULT_MAJLIS_SETTINGS: MajlisSettings = {
  categoriesPerGame: 6,
  questionSeconds: 30,
  stealSeconds: 10,
  allowSteal: true,
  showExplanations: true,
  easyPoints: 100,
  mediumPoints: 200,
  hardPoints: 300,
};

export type MajlisGameStartResponse = {
  sessionId: string;
  createdAt: number;
  settings: MajlisSettings;
  categories: MajlisCategory[];
  board: Record<string, MajlisClientQuestion[]>;
};

export type MajlisPlayMode = "local" | "online";
export type MajlisVoiceMode = "off" | "team" | "all";
export type MajlisAssistKey = "hint" | "time" | "double" | "options";

export type MajlisOnlinePlayer = {
  userId: string;
  userName: string;
  teamId: string;
  micMode: MajlisVoiceMode;
  joinedAt: number;
  lastSeenAt: number;
};

export type MajlisOnlineTeamState = {
  id: string;
  name: string;
  score: number;
  accent: string;
  assists: { hint: boolean; time: boolean; double: boolean; options: boolean };
};

export type MajlisOnlinePublicState = {
  phase: "board" | "finished";
  teams: MajlisOnlineTeamState[];
  currentTeamIndex: number;
  usedQuestionIds: string[];
  activeQuestion: MajlisClientQuestion | null;
  questionOwnerIndex: number;
  answeringTeamIndex: number;
  secondsLeft: number;
  timerPaused: boolean;
  questionDeadlineAt: number | null;
  reveal: MajlisReveal | null;
  hintVisible: boolean;
  optionsVisible: boolean;
  doubleActive: boolean;
  timeBonusActive: boolean;
  stealMode: boolean;
  finishReason: "complete" | "manual";
  updatedAt: number;
};

export type MajlisOnlineRoom = {
  id: string;
  roomCode: string;
  hostId: string;
  hostName: string;
  status: "lobby" | "playing" | "finished" | "closed";
  teamCount: number;
  teamNames: string[];
  selectedCategoryIds: string[];
  players: Record<string, MajlisOnlinePlayer>;
  session: MajlisGameStartResponse | null;
  publicState: MajlisOnlinePublicState | null;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
};

export type MajlisVoiceSignal = {
  id: string;
  roomId: string;
  fromUserId: string;
  targetUserId: string;
  kind: "offer" | "answer" | "reset";
  sessionId: string;
  sdp?: string;
  createdAt: number;
};

export type MajlisVoiceIceConfig = {
  iceServers: RTCIceServer[];
  turnEnabled: boolean;
  provider: "cloudflare" | "stun-only";
};
