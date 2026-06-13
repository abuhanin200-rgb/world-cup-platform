import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "./firebase";

export type Team = {
  code: string;
  nameAr: string;
  nameEn: string;
  emoji: string;
  group: string;
  isActive: boolean;
};

export async function getTeams(): Promise<Team[]> {
  const teamsRef = collection(db, "teams");
  const q = query(teamsRef, orderBy("group", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    ...(doc.data() as Team),
  }));
}