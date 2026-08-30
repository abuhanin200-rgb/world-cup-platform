import { auth } from "@/lib/firebase";
import type { PlatformGameId } from "@/domain/games/platformGames";

export async function syncPlatformGameXp(params: {
  gameId: PlatformGameId;
  sourceResultId: string;
}) {
  const firebaseUser = auth.currentUser;

  if (!firebaseUser) {
    return null;
  }

  const token = await firebaseUser.getIdToken();
  const response = await fetch("/api/games/xp/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "تعذر مزامنة XP اللعبة");
  }

  return response.json() as Promise<{
    awarded: boolean;
    xp: number;
    totalXp: number;
    level: number;
  }>;
}

export async function rebuildPlatformGameXpFromAdmin() {
  const firebaseUser = auth.currentUser;

  if (!firebaseUser) {
    throw new Error("سجّل دخول الأدمن أولًا");
  }

  const token = await firebaseUser.getIdToken();
  const response = await fetch("/api/admin/games/rebuild-xp", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    events?: number;
    users?: number;
  };

  if (!response.ok) {
    throw new Error(data.error || "تعذر إعادة بناء ترتيب الألعاب");
  }

  return data;
}
