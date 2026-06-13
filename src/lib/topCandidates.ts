import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export type TopCandidateTeam = {
  teamName: string;
  teamEmoji: string;
  votes: number;
  rank: number;
};

async function getTeamsEmojiMap() {
  const teamsRef = collection(db, "teams");
  const snapshot = await getDocs(teamsRef);

  const emojiMap: Record<string, string> = {};

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    const nameAr = String(data.nameAr || "").trim();
    const emoji = String(data.emoji || "").trim();

    if (nameAr && emoji) {
      emojiMap[nameAr] = emoji;
    }
  });

  return emojiMap;
}

export async function getTopCandidateTeams(): Promise<TopCandidateTeam[]> {
  const [teamsEmojiMap, usersSnapshot] = await Promise.all([
    getTeamsEmojiMap(),
    getDocs(collection(db, "users")),
  ]);

  const counts: Record<string, TopCandidateTeam> = {};

  usersSnapshot.forEach((docSnap) => {
    const data = docSnap.data();

    const favoriteTeam = String(data.favoriteTeam || "").trim();
    const savedEmoji = String(data.teamEmoji || "").trim();

    if (!favoriteTeam) return;

    const correctEmoji = savedEmoji || teamsEmojiMap[favoriteTeam] || "🏳️";

    if (!counts[favoriteTeam]) {
      counts[favoriteTeam] = {
        teamName: favoriteTeam,
        teamEmoji: correctEmoji,
        votes: 0,
        rank: 0,
      };
    }

    counts[favoriteTeam].votes += 1;

    if (
      (!counts[favoriteTeam].teamEmoji ||
        counts[favoriteTeam].teamEmoji === "🏳️") &&
      correctEmoji
    ) {
      counts[favoriteTeam].teamEmoji = correctEmoji;
    }
  });

  return Object.values(counts)
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 3)
    .map((team, index) => ({
      ...team,
      rank: index + 1,
    }));
}