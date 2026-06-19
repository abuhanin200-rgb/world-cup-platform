import type { Timestamp } from "firebase/firestore";

export type WordGameLetterStatus = "correct" | "present" | "absent";

export type WordGameLetterResult = {
  letter: string;
  status: WordGameLetterStatus;
};

export type WordGameDailyWord = {
  date: string;
  word: string;
  cycle: number;
  createdAt?: Timestamp;
};

export type WordGameMetaState = {
  usedWords: string[];
  lastWord: string | null;
  cycle: number;
  updatedAt?: Timestamp;
};

export type WordGameResult = {
  userId: string;
  fullName: string;
  date: string;
  won: boolean;
  attempts: number;
  durationSeconds: number;
  guesses: string[];
  createdAt?: Timestamp;
  completedAt?: Timestamp;
};

export type WordGameLeaderboardItem = WordGameResult & {
  rank: number;
};

export type WordGameStatus = "playing" | "won" | "lost" | "already_completed";