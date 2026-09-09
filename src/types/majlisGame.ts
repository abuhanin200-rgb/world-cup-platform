export type MajlisDifficulty = "easy" | "medium" | "hard";
export type MajlisQuestionType = "text" | "multiple_choice" | "audio" | "speech" | "image";
export type MajlisVerifiedStatus = "unverified" | "structural" | "source_checked" | "verified" | "rejected";
export type MajlisAudioPlaybackState = "idle" | "loading" | "playing" | "buffering" | "paused" | "error" | "ended";

export type MajlisQualityScore = {
  clarity: number;
  difficulty: number;
  ambiguityRisk: number;
  answerLeakRisk: number;
  duplicateRisk: number;
  factQuality: number;
  gameValue: number;
  method?: "rules" | "ai" | "human";
  reviewedAt?: number;
};

export type MajlisCategory = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
  accent: string;
  imageUrl?: string;
  imageSourceName?: string;
  imageSourceUrl?: string;
  imageLicense?: string;
  sortOrder: number;
  enabled: boolean;
  custom?: boolean;
  overridden?: boolean;
};

export type MajlisQuestion = {
  id: string;
  categoryId: string;
  groupKey: string;
  /** Canonical identity of the underlying fact. Defaults to groupKey for legacy rows. */
  factKey: string;
  /** Canonical diversity family used by the V17 selection agent. */
  questionFamily: string;
  /** Backward-compatible alias for V15/V16/admin overrides. */
  family?: string;
  prompt: string;
  answer: string;
  options?: string[];
  difficulty: MajlisDifficulty;
  points: number;
  hint?: string;
  explanation?: string;
  sourceLabel?: string;
  sourceName?: string;
  sourceUrl?: string;
  license?: string;
  type: MajlisQuestionType;
  quoteText?: string;
  imageUrl?: string;
  imageAlt?: string;
  imageSourceName?: string;
  imageSourceUrl?: string;
  imageLicense?: string;
  imageSource?: string;
  audioUrl?: string;
  audioFallbackUrl?: string;
  audioFallbacks?: string[];
  audioId?: string;
  audioStartSeconds?: number;
  audioStart?: number;
  audioMaxSeconds?: number;
  audioMinSeconds?: number;
  audioSourceKey?: string;
  audioDuration?: number;
  reciterName?: string;
  reciter?: string;
  speakerCountry?: string;
  dialect?: string;
  speechLanguage?: string;
  speechText?: string;
  speechLang?: string;
  quranSurah?: string;
  quranAyah?: number;
  quranText?: string;
  quranPage?: number;
  quranImageUrl?: string;
  qualityScore?: MajlisQualityScore;
  verifiedStatus?: MajlisVerifiedStatus;
  enabled: boolean;
  custom?: boolean;
  overridden?: boolean;
};

type MajlisHiddenBeforeReveal =
  | "groupKey"
  | "factKey"
  | "answer"
  | "options"
  | "hint"
  | "explanation"
  | "sourceLabel"
  | "sourceName"
  | "sourceUrl"
  | "license"
  | "imageSource"
  | "imageUrl"
  | "imageAlt"
  | "imageSourceName"
  | "imageSourceUrl"
  | "imageLicense"
  | "audioId"
  | "audioUrl"
  | "audioFallbackUrl"
  | "audioFallbacks"
  | "audioSourceKey"
  | "audioStart"
  | "reciterName"
  | "reciter"
  | "speakerCountry"
  | "dialect"
  | "speechLanguage"
  | "quranSurah"
  | "quranAyah"
  | "quranText"
  | "quranPage"
  | "quranImageUrl"
  | "qualityScore"
  | "verifiedStatus"
  | "enabled"
  | "custom"
  | "overridden";

export type MajlisClientQuestion = Omit<MajlisQuestion, MajlisHiddenBeforeReveal> & {
  hasHint: boolean;
  optionsCount: number;
  /** Opaque, session-scoped identifier; the source filename and URL stay server-side. */
  imageId?: string;
  imageUrl?: string;
  imageAlt?: string;
  /** Opaque, session-scoped identifier. It never contains language, dialect or reciter metadata. */
  audioId?: string;
  audioUrl?: string;
  audioFallbackUrl?: string;
};

export type MajlisAssistPayload = {
  questionId: string;
  kind: "hint" | "options";
  hint?: string;
  options?: string[];
};

export type MajlisReveal = {
  questionId: string;
  answer: string;
  explanation: string;
  sourceLabel: string;
  sourceName?: string;
  sourceUrl?: string;
  license?: string;
  quranSurah?: string;
  quranAyah?: number;
  quranText?: string;
  quranPage?: number;
  quranImageUrl?: string;
  imageSourceName?: string;
  imageSourceUrl?: string;
  imageLicense?: string;
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
  /** Host-only capability. It is never persisted in an online room's public session. */
  controlToken?: string;
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
  /** The host advances this explicitly so reveal and scoring are never conflated. */
  resolutionStage: "question" | "reveal" | "award";
  hintVisible: boolean;
  optionsVisible: boolean;
  visibleHint: string | null;
  visibleOptions: string[];
  audioPlaybackState: MajlisAudioPlaybackState;
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
