export type PresencePage =
  | "home"
  | "tournaments"
  | "tournament"
  | "matches"
  | "results"
  | "games"
  | "challengeStudio"
  | "account"
  | "profile"
  | "memberProfile"
  | "wordGame"
  | "vocabularyChallenge"
  | "flagMemory"
  | "tenSecondsChallenge"
  | "majlis"
  | "admin"
  | "login"
  | "register"
  | "rules"
  | "unknown";

export type PresenceActivity = string;

export type PresenceDeviceType =
  | "iphone"
  | "ipad"
  | "android"
  | "computer"
  | "other";

export type PresenceDeviceInfo = {
  deviceType: PresenceDeviceType;
  deviceLabel: string;
  browserName: string;
  osName: string;
};

export type OnlinePresence = {
  userId: string;
  fullName: string;
  currentPage: PresencePage;
  activity: PresenceActivity;
  path: string;
  lastSeen: number;
  sessionStartedAt?: number;
  deviceType?: PresenceDeviceType;
  deviceLabel?: string;
  browserName?: string;
  osName?: string;
  lastChallengeStudioVisit?: number;
};
