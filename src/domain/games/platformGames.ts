export type PlatformGameId = "word-game" | "flag-memory" | "ten-seconds" | "vocabulary";

export type PlatformGameBreakdown = {
  played: number;
  wins: number;
  xp: number;
};

export type PlatformGameStats = {
  userId: string;
  userName: string;
  totalXp: number;
  level: number;
  gamesPlayed: number;
  wins: number;
  gameStats: Record<PlatformGameId, PlatformGameBreakdown>;
  updatedAt?: unknown;
};

export type GameXpAward = {
  gameId: PlatformGameId;
  sourceResultId: string;
  userId: string;
  userName: string;
  xp: number;
  won: boolean;
  dateKey: string;
  reason: string;
};

export const PLATFORM_GAMES: ReadonlyArray<{
  id: PlatformGameId;
  title: string;
  shortTitle: string;
}> = [
  { id: "word-game", title: "خمن كلمة اليوم", shortTitle: "الكلمة" },
  { id: "flag-memory", title: "تحدي الأعلام", shortTitle: "الأعلام" },
  { id: "ten-seconds", title: "تحدي العشر ثواني", shortTitle: "10 ثوانٍ" },
  { id: "vocabulary", title: "تحدي المفردات", shortTitle: "المفردات" },
];

export const EMPTY_GAME_BREAKDOWN: PlatformGameBreakdown = {
  played: 0,
  wins: 0,
  xp: 0,
};

export function getLevelStartXp(level: number) {
  const safeLevel = Math.max(1, Math.floor(level));
  return 50 * (safeLevel - 1) * safeLevel;
}

export function getPlatformLevel(totalXp: number) {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;

  while (level < 100 && xp >= getLevelStartXp(level + 1)) {
    level += 1;
  }

  return level;
}

export function getLevelProgress(totalXp: number) {
  const xp = Math.max(0, Math.floor(totalXp));
  const level = getPlatformLevel(xp);
  const startXp = getLevelStartXp(level);
  const nextXp = getLevelStartXp(level + 1);
  const range = Math.max(1, nextXp - startXp);
  const progress = Math.min(100, Math.max(0, ((xp - startXp) / range) * 100));

  return {
    level,
    startXp,
    nextXp,
    currentLevelXp: xp - startXp,
    xpToNextLevel: Math.max(0, nextXp - xp),
    progress,
  };
}

export function getLevelLabel(level: number) {
  if (level >= 20) return "أسطورة التحدي";
  if (level >= 15) return "نخبة التحدي";
  if (level >= 10) return "محترف";
  if (level >= 5) return "منافس";
  if (level >= 2) return "متقدم";
  return "مبتدئ";
}
