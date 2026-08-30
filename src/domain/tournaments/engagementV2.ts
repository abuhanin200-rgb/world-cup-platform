export type TournamentStudioPostCategory = "news" | "analysis" | "alert" | "achievement";
export type TournamentRewardStatus = "draft" | "published" | "awarded" | "closed";

export type TournamentStudioPostV2 = {
  id: string;
  tournamentId: string;
  title: string;
  summary: string;
  body: string;
  category: TournamentStudioPostCategory;
  published: boolean;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
};

export type TournamentAchievementDefinitionV2 = {
  key: string;
  title: string;
  description: string;
  badge: string;
  rarity: "common" | "rare" | "epic" | "legendary";
};

export type TournamentUserAchievementV2 = TournamentAchievementDefinitionV2 & {
  id: string;
  tournamentId: string;
  userId: string;
  fullName: string;
  unlockedAt: number;
};

export type TournamentRewardV2 = {
  id: string;
  tournamentId: string;
  title: string;
  description: string;
  rankFrom: number;
  rankTo: number;
  status: TournamentRewardStatus;
  createdAt: number;
  updatedAt: number;
};

export const GULF_CUP_27_ACHIEVEMENTS: readonly TournamentAchievementDefinitionV2[] = [
  { key: "first_exact", title: "أول إصابة بالملي", description: "أصاب أول نتيجة دقيقة في خليجي 27.", badge: "🎯", rarity: "common" },
  { key: "three_exact", title: "قناص النتائج", description: "أصاب 3 نتائج بالملي في البطولة.", badge: "🏹", rarity: "rare" },
  { key: "five_streak", title: "سلسلة الخمسة", description: "حقق 5 توقعات صحيحة متتالية.", badge: "🔥", rarity: "epic" },
  { key: "top_three", title: "منصة الأبطال", description: "وصل إلى أحد المراكز الثلاثة الأولى.", badge: "🥉", rarity: "rare" },
  { key: "prediction_king", title: "ملك التوقعات", description: "جمع 5 إصابات بالملي أو أكثر.", badge: "👑", rarity: "epic" },
  { key: "champion", title: "بطل خليجي 27", description: "أنهى البطولة في المركز الأول.", badge: "🏆", rarity: "legendary" },
] as const;

export function getTournamentAchievementDefinitionV2(key: string) {
  return GULF_CUP_27_ACHIEVEMENTS.find((item) => item.key === key) ?? null;
}
