import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  GULF_CUP_27_ACHIEVEMENTS,
  type TournamentRewardStatus,
  type TournamentRewardV2,
  type TournamentStudioPostCategory,
  type TournamentStudioPostV2,
  type TournamentUserAchievementV2,
} from "@/domain/tournaments";

export const TOURNAMENT_ENGAGEMENT_COLLECTIONS = {
  studio: "tournamentStudioNews",
  achievements: "tournamentAchievements",
  rewards: "tournamentRewards",
} as const;

function clean(value: unknown) { return String(value ?? "").trim(); }
function num(value: unknown, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function makeId(prefix: string) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

export async function getTournamentStudioPostsV2(tournamentId: string, includeDrafts = false): Promise<TournamentStudioPostV2[]> {
  const base = collection(db, TOURNAMENT_ENGAGEMENT_COLLECTIONS.studio);
  const q = includeDrafts
    ? query(base, where("tournamentId", "==", tournamentId))
    : query(base, where("tournamentId", "==", tournamentId), where("published", "==", true));
  const snap = await getDocs(q);
  return snap.docs.map((item) => {
    const data = item.data();
    return {
      id: item.id, tournamentId: clean(data.tournamentId), title: clean(data.title), summary: clean(data.summary), body: clean(data.body),
      category: (["news","analysis","alert","achievement"].includes(data.category) ? data.category : "news") as TournamentStudioPostCategory,
      published: Boolean(data.published), pinned: Boolean(data.pinned), createdAt: num(data.createdAt), updatedAt: num(data.updatedAt),
    };
  }).filter((item) => includeDrafts || item.published).sort((a,b) => Number(b.pinned)-Number(a.pinned) || b.createdAt-a.createdAt);
}

export async function saveTournamentStudioPostV2(input: Partial<TournamentStudioPostV2> & { tournamentId: string; title: string; summary: string; body: string }) {
  const id = clean(input.id) || makeId(`${input.tournamentId}_studio`); const now = Date.now();
  await setDoc(doc(db, TOURNAMENT_ENGAGEMENT_COLLECTIONS.studio, id), {
    tournamentId: clean(input.tournamentId), title: clean(input.title).slice(0,120), summary: clean(input.summary).slice(0,260), body: clean(input.body).slice(0,5000),
    category: input.category ?? "news", published: Boolean(input.published), pinned: Boolean(input.pinned), createdAt: input.createdAt || now, updatedAt: now, updatedAtServer: serverTimestamp(), schemaVersion: 2,
  }, { merge: true });
  return id;
}

export async function deleteTournamentStudioPostV2(id: string) { await deleteDoc(doc(db, TOURNAMENT_ENGAGEMENT_COLLECTIONS.studio, id)); }

export async function getTournamentRewardsV2(tournamentId: string, includeDrafts = false): Promise<TournamentRewardV2[]> {
  const base = collection(db, TOURNAMENT_ENGAGEMENT_COLLECTIONS.rewards);
  const q = includeDrafts
    ? query(base, where("tournamentId", "==", tournamentId))
    : query(base, where("tournamentId", "==", tournamentId), where("published", "==", true));
  const snap = await getDocs(q);
  return snap.docs.map((item) => { const d=item.data(); return { id:item.id,tournamentId:clean(d.tournamentId),title:clean(d.title),description:clean(d.description),rankFrom:num(d.rankFrom,1),rankTo:num(d.rankTo,1),status:(["draft","published","awarded","closed"].includes(d.status)?d.status:"draft") as TournamentRewardStatus,createdAt:num(d.createdAt),updatedAt:num(d.updatedAt) }; }).filter((item)=>includeDrafts || item.status !== "draft").sort((a,b)=>a.rankFrom-b.rankFrom);
}

export async function saveTournamentRewardV2(input: Partial<TournamentRewardV2> & { tournamentId:string; title:string; description:string; rankFrom:number; rankTo:number }) {
  const id=clean(input.id)||makeId(`${input.tournamentId}_reward`); const now=Date.now();
  await setDoc(doc(db,TOURNAMENT_ENGAGEMENT_COLLECTIONS.rewards,id),{ tournamentId:clean(input.tournamentId),title:clean(input.title).slice(0,120),description:clean(input.description).slice(0,500),rankFrom:Math.max(1,Math.floor(input.rankFrom)),rankTo:Math.max(Math.floor(input.rankFrom),Math.floor(input.rankTo)),status:input.status??"draft",published:(input.status??"draft")!=="draft",createdAt:input.createdAt||now,updatedAt:now,updatedAtServer:serverTimestamp(),schemaVersion:2},{merge:true}); return id;
}
export async function deleteTournamentRewardV2(id:string){ await deleteDoc(doc(db,TOURNAMENT_ENGAGEMENT_COLLECTIONS.rewards,id)); }

export async function getTournamentAchievementsV2(tournamentId:string):Promise<TournamentUserAchievementV2[]> {
  const snap=await getDocs(query(collection(db,TOURNAMENT_ENGAGEMENT_COLLECTIONS.achievements),where("tournamentId","==",tournamentId)));
  return snap.docs.map((item)=>{const d=item.data();return {id:item.id,tournamentId:clean(d.tournamentId),userId:clean(d.userId),fullName:clean(d.fullName),key:clean(d.key),title:clean(d.title),description:clean(d.description),badge:clean(d.badge),rarity:(["common","rare","epic","legendary"].includes(d.rarity)?d.rarity:"common") as TournamentUserAchievementV2["rarity"],unlockedAt:num(d.unlockedAt)};}).sort((a,b)=>b.unlockedAt-a.unlockedAt);
}
export async function getUserTournamentAchievementsV2(tournamentId:string,userId:string){ const all=await getTournamentAchievementsV2(tournamentId); return all.filter((item)=>item.userId===userId); }

export async function rebuildTournamentAchievementsV2(tournamentId:string) {
  const [statsSnap,predictionsSnap,matchesSnap,achievementSnap]=await Promise.all([
    getDocs(query(collection(db,"tournamentUserStats"),where("tournamentId","==",tournamentId))),
    getDocs(query(collection(db,"tournamentPredictions"),where("tournamentId","==",tournamentId))),
    getDocs(query(collection(db,"tournamentMatches"),where("tournamentId","==",tournamentId))),
    getDocs(query(collection(db,TOURNAMENT_ENGAGEMENT_COLLECTIONS.achievements),where("tournamentId","==",tournamentId))),
  ]);
  const now=Date.now();
  const exactByUser=new Map<string,number>();
  predictionsSnap.docs.forEach((item)=>{const d=item.data(); if(d.isCalculated===true && d.resultType==="exact") exactByUser.set(clean(d.userId),(exactByUser.get(clean(d.userId))||0)+1);});
  const finalDone=matchesSnap.docs.some((item)=>{const d=item.data(); return clean(d.id)==="g27-final" && d.calculationStatus==="calculated";});
  const awards:Array<{userId:string;fullName:string;key:string}>=[];
  statsSnap.docs.forEach((item)=>{const d=item.data(); const userId=clean(d.userId); const fullName=clean(d.fullName)||"عضو"; const exact=num(d.exact); const bestStreak=num(d.bestStreak); const rank=num(d.rank,9999);
    if((exactByUser.get(userId)||0)>=1) awards.push({userId,fullName,key:"first_exact"});
    if(exact>=3) awards.push({userId,fullName,key:"three_exact"});
    if(bestStreak>=5) awards.push({userId,fullName,key:"five_streak"});
    if(rank<=3) awards.push({userId,fullName,key:"top_three"});
    if(exact>=5) awards.push({userId,fullName,key:"prediction_king"});
    if(finalDone && rank===1) awards.push({userId,fullName,key:"champion"});
  });
  const existingUnlockedAt = new Map(achievementSnap.docs.map((item) => [item.id, num(item.data().unlockedAt, now)]));
  const desiredIds = new Set<string>();
  const operations: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];
  awards.forEach((award) => {
    const def = GULF_CUP_27_ACHIEVEMENTS.find((x) => x.key === award.key);
    if (!def) return;
    const id = `${tournamentId}_${award.userId}_${award.key}`;
    desiredIds.add(id);
    operations.push((batch) => batch.set(doc(db, TOURNAMENT_ENGAGEMENT_COLLECTIONS.achievements, id), {
      id, tournamentId, userId: award.userId, fullName: award.fullName, ...def,
      unlockedAt: existingUnlockedAt.get(id) ?? now, updatedAtServer: serverTimestamp(), schemaVersion: 2,
    }));
  });
  achievementSnap.docs.forEach((item) => {
    // الإنجازات الرقمية تعكس البيانات المحتسبة الحالية؛ Undo يزيل ما لم يعد مستحقًا.
    if (!desiredIds.has(item.id)) operations.push((batch) => batch.delete(item.ref));
  });
  for (let index = 0; index < operations.length; index += 400) {
    const batch = writeBatch(db);
    operations.slice(index, index + 400).forEach((operation) => operation(batch));
    await batch.commit();
  }
  return awards.length;
}
