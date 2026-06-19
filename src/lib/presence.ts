import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export async function updateMemberLastSeen(userId: string) {
  if (!userId) return;

  await updateDoc(doc(db, "users", userId), {
    lastSeen: serverTimestamp(),
  });
}

export function subscribeOnlineMembersCount(
  onCountChange: (count: number) => void
) {
  const fiveMinutesAgo = Timestamp.fromMillis(Date.now() - ONLINE_WINDOW_MS);

  const usersRef = collection(db, "users");
  const onlineQuery = query(usersRef, where("lastSeen", ">=", fiveMinutesAgo));

  return onSnapshot(onlineQuery, (snapshot) => {
    onCountChange(snapshot.size);
  });
}