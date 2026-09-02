import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

export type ChallengeStudioCardType =
  | "main"
  | "quote"
  | "number"
  | "badge"
  | "funny"
  | "watch";

export type ChallengeStudioCard = {
  type: ChallengeStudioCardType;
  icon: string;
  title: string;
  content: string;
  priority: number;
};

export type ChallengeStudioBulletin = {
  id: string;
  date: string;
  summary: string;
  cards: ChallengeStudioCard[];
  mentionedMembers: string[];
  published: boolean;
  generatedByAI: boolean;
  createdAt: string;
  updatedAt?: string;
};

function mapBulletin(id: string, data: Record<string, unknown>) {
  return {
    id,
    date: String(data.date || ""),
    summary: String(data.summary || ""),
    cards: Array.isArray(data.cards) ? data.cards : [],
    mentionedMembers: Array.isArray(data.mentionedMembers)
      ? data.mentionedMembers.map(String)
      : [],
    published: Boolean(data.published),
    generatedByAI: Boolean(data.generatedByAI),
    createdAt: String(data.createdAt || ""),
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
  } as ChallengeStudioBulletin;
}

export async function getChallengeStudioBulletins(maxItems = 30) {
  const q = query(
    collection(db, "challengeStudio"),
    orderBy("createdAt", "desc"),
    limit(maxItems)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => mapBulletin(docSnap.id, docSnap.data()));
}

export async function getPublishedChallengeStudioBulletins(maxItems = 30) {
  const q = query(
    collection(db, "challengeStudio"),
    where("published", "==", true),
    orderBy("createdAt", "desc"),
    limit(maxItems)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => mapBulletin(docSnap.id, docSnap.data()));
}

export async function addChallengeStudioBulletin(input: {
  date: string;
  summary: string;
  cards: ChallengeStudioCard[];
  mentionedMembers?: string[];
  published?: boolean;
  generatedByAI?: boolean;
}) {
  const now = new Date().toISOString();

  const docRef = await addDoc(collection(db, "challengeStudio"), {
    date: input.date,
    summary: input.summary,
    cards: input.cards,
    mentionedMembers: input.mentionedMembers || [],
    published: Boolean(input.published),
    generatedByAI: Boolean(input.generatedByAI),
    createdAt: now,
    updatedAt: now,
  });

  return docRef.id;
}

export async function updateChallengeStudioBulletin(
  id: string,
  input: {
    summary: string;
    cards: ChallengeStudioCard[];
    mentionedMembers?: string[];
  }
) {
  if (!id) throw new Error("معرّف النشرة غير موجود");

  const updateData: {
    summary: string;
    cards: ChallengeStudioCard[];
    mentionedMembers?: string[];
    updatedAt: string;
  } = {
    summary: input.summary,
    cards: input.cards,
    updatedAt: new Date().toISOString(),
  };

  if (input.mentionedMembers) {
    updateData.mentionedMembers = input.mentionedMembers;
  }

  await updateDoc(doc(db, "challengeStudio", id), updateData);
}

export async function publishChallengeStudioBulletin(id: string) {
  if (!id) throw new Error("معرّف النشرة غير موجود");

  await updateDoc(doc(db, "challengeStudio", id), {
    published: true,
    updatedAt: new Date().toISOString(),
  });
}

export async function unpublishChallengeStudioBulletin(id: string) {
  if (!id) throw new Error("معرّف النشرة غير موجود");

  await updateDoc(doc(db, "challengeStudio", id), {
    published: false,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteChallengeStudioBulletin(id: string) {
  if (!id) throw new Error("معرّف النشرة غير موجود");

  await deleteDoc(doc(db, "challengeStudio", id));
}
