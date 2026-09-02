import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  TOURNAMENT_CALCULATION_MODES,
  TOURNAMENT_MATCH_STATUSES,
  TOURNAMENT_STATUSES,
  type Tournament,
  type TournamentCalculationMode,
  type TournamentMatchStatus,
  type TournamentMatchV2,
  type TournamentStatus,
  type TournamentTeamV2,
} from "@/domain/tournaments";
import { TOURNAMENT_V2_COLLECTIONS } from "@/lib/tournamentV2Firestore";

export type TournamentV2AdminSnapshot = {
  tournament: Tournament | null;
  teams: TournamentTeamV2[];
  matches: TournamentMatchV2[];
};

export type TournamentV2MetaInput = {
  name: string;
  shortName: string;
  description: string;
  hostCountry: string;
  hostCities: string[];
  startAt: number | null;
  endAt: number | null;
  status: TournamentStatus;
  sortOrder: number;
  isCurrent: boolean;
  calculationMode: TournamentCalculationMode;
};

export type TournamentV2TeamInput = {
  id: string;
  code: string;
  flagCode: string;
  nameAr: string;
  nameEn: string;
  shortName: string;
  group: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type TournamentV2MatchInput = {
  id: string;
  stage: "group" | "knockout";
  round: string;
  group: string | null;
  homeTeamId: string;
  awayTeamId: string;
  homeSourceLabel?: string | null;
  awaySourceLabel?: string | null;
  kickoffAt: number;
  stadium: string;
  city: string;
  status: TournamentMatchStatus;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function safeEntityId(value: string) {
  const normalized = clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  if (!normalized) throw new Error("المعرّف غير صالح. استخدم أحرفًا إنجليزية وأرقامًا فقط.");
  return normalized;
}

function entityDocId(tournamentId: string, entityId: string) {
  return `${tournamentId}_${entityId}`;
}

function assertTournamentStatus(value: string): asserts value is TournamentStatus {
  if (!(TOURNAMENT_STATUSES as readonly string[]).includes(value)) {
    throw new Error("حالة البطولة غير صالحة");
  }
}

function assertCalculationMode(value: string): asserts value is TournamentCalculationMode {
  if (!(TOURNAMENT_CALCULATION_MODES as readonly string[]).includes(value)) {
    throw new Error("وضع الاحتساب غير صالح");
  }
}

function assertMatchStatus(value: string): asserts value is TournamentMatchStatus {
  if (!(TOURNAMENT_MATCH_STATUSES as readonly string[]).includes(value)) {
    throw new Error("حالة المباراة غير صالحة");
  }
}

function mapTournament(data: Record<string, unknown>): Tournament {
  return {
    id: clean(data.id),
    name: clean(data.name),
    shortName: clean(data.shortName),
    slug: clean(data.slug),
    description: clean(data.description),
    hostCountry: clean(data.hostCountry),
    hostCities: Array.isArray(data.hostCities) ? data.hostCities.map(clean).filter(Boolean) : [],
    startAt: data.startAt == null ? null : Number(data.startAt),
    endAt: data.endAt == null ? null : Number(data.endAt),
    status: (data.status || "draft") as TournamentStatus,
    sortOrder: Number(data.sortOrder || 0),
    isCurrent: Boolean(data.isCurrent),
    format: (data.format || "custom") as Tournament["format"],
    engine: (data.engine || "v2") as Tournament["engine"],
    calculationMode: (data.calculationMode || "automatic_guarded") as TournamentCalculationMode,
    scoringTemplateId: clean(data.scoringTemplateId) || undefined,
    scoringVersion: clean(data.scoringVersion) || undefined,
    branding: (data.branding && typeof data.branding === "object" ? data.branding : {}) as Tournament["branding"],
    features: (data.features && typeof data.features === "object"
      ? data.features
      : {
          predictions: true,
          leaderboard: true,
          studio: true,
          achievements: true,
          rewards: true,
          statistics: true,
        }) as Tournament["features"],
    createdAt: Number(data.createdAt || Date.now()),
    updatedAt: Number(data.updatedAt || Date.now()),
  };
}

function mapTeam(data: Record<string, unknown>): TournamentTeamV2 {
  return {
    id: clean(data.id),
    tournamentId: clean(data.tournamentId),
    code: clean(data.code),
    flagCode: clean(data.flagCode),
    nameAr: clean(data.nameAr),
    nameEn: clean(data.nameEn),
    shortName: clean(data.shortName),
    group: data.group ? clean(data.group) : null,
    sortOrder: Number(data.sortOrder || 0),
    isActive: data.isActive !== false,
  };
}

function mapMatch(data: Record<string, unknown>): TournamentMatchV2 {
  const result = data.result && typeof data.result === "object" ? (data.result as Record<string, unknown>) : {};
  return {
    id: clean(data.id),
    tournamentId: clean(data.tournamentId),
    stage: data.stage === "knockout" ? "knockout" : "group",
    round: clean(data.round),
    group: data.group ? clean(data.group) : null,
    homeTeamId: clean(data.homeTeamId),
    awayTeamId: clean(data.awayTeamId),
    homeSourceLabel: data.homeSourceLabel ? clean(data.homeSourceLabel) : null,
    awaySourceLabel: data.awaySourceLabel ? clean(data.awaySourceLabel) : null,
    kickoffAt: Number(data.kickoffAt || 0),
    stadium: clean(data.stadium),
    city: clean(data.city),
    status: (data.status || "scheduled") as TournamentMatchStatus,
    predictionOpensAt: data.predictionOpensAt == null ? null : Number(data.predictionOpensAt),
    predictionClosesAt: data.predictionClosesAt == null ? null : Number(data.predictionClosesAt),
    predictionIsOpen: Boolean(data.predictionIsOpen),
    predictionEditingIsOpen: data.predictionEditingIsOpen !== false,
    calculationStatus: (data.calculationStatus || "not_calculated") as TournamentMatchV2["calculationStatus"],
    calculationVersion: data.calculationVersion ? clean(data.calculationVersion) : null,
    resultHash: data.resultHash ? clean(data.resultHash) : null,
    calculatedAt: data.calculatedAt == null ? null : Number(data.calculatedAt),
    calculatedPredictions: Number(data.calculatedPredictions || 0),
    result: {
      homeScore: result.homeScore == null ? null : Number(result.homeScore),
      awayScore: result.awayScore == null ? null : Number(result.awayScore),
      extraTimeHomeScore: result.extraTimeHomeScore == null ? null : Number(result.extraTimeHomeScore),
      extraTimeAwayScore: result.extraTimeAwayScore == null ? null : Number(result.extraTimeAwayScore),
      penaltiesHomeScore: result.penaltiesHomeScore == null ? null : Number(result.penaltiesHomeScore),
      penaltiesAwayScore: result.penaltiesAwayScore == null ? null : Number(result.penaltiesAwayScore),
      qualifiedTeamId: result.qualifiedTeamId ? clean(result.qualifiedTeamId) : null,
      qualificationMethod: (result.qualificationMethod || null) as TournamentMatchV2["result"]["qualificationMethod"],
    },
  };
}

export async function getTournamentV2AdminSnapshot(tournamentId: string): Promise<TournamentV2AdminSnapshot> {
  const [tournamentSnap, teamsSnap, matchesSnap] = await Promise.all([
    getDoc(doc(db, TOURNAMENT_V2_COLLECTIONS.tournaments, tournamentId)),
    getDocs(query(collection(db, TOURNAMENT_V2_COLLECTIONS.teams), where("tournamentId", "==", tournamentId))),
    getDocs(query(collection(db, TOURNAMENT_V2_COLLECTIONS.matches), where("tournamentId", "==", tournamentId))),
  ]);

  const tournament = tournamentSnap.exists() ? mapTournament(tournamentSnap.data() as Record<string, unknown>) : null;
  const teams = teamsSnap.docs.map((item) => mapTeam(item.data() as Record<string, unknown>)).sort((a, b) => a.sortOrder - b.sortOrder);
  const matches = matchesSnap.docs.map((item) => mapMatch(item.data() as Record<string, unknown>)).sort((a, b) => a.kickoffAt - b.kickoffAt);
  return { tournament, teams, matches };
}

export async function updateTournamentV2Metadata(tournamentId: string, input: TournamentV2MetaInput) {
  assertTournamentStatus(input.status);
  assertCalculationMode(input.calculationMode);
  if (!clean(input.name) || !clean(input.shortName)) throw new Error("اسم البطولة والاسم المختصر مطلوبان");
  if (input.startAt != null && input.endAt != null && input.endAt < input.startAt) throw new Error("تاريخ النهاية يجب أن يكون بعد تاريخ البداية");

  await updateDoc(doc(db, TOURNAMENT_V2_COLLECTIONS.tournaments, tournamentId), {
    name: clean(input.name),
    shortName: clean(input.shortName),
    description: clean(input.description),
    hostCountry: clean(input.hostCountry),
    hostCities: input.hostCities.map(clean).filter(Boolean),
    startAt: input.startAt,
    endAt: input.endAt,
    status: input.status,
    sortOrder: Math.max(0, Math.trunc(input.sortOrder || 0)),
    isCurrent: Boolean(input.isCurrent),
    calculationMode: input.calculationMode,
    updatedAt: Date.now(),
    updatedAtServer: serverTimestamp(),
  });
}

export async function createTournamentTeamV2(tournamentId: string, input: TournamentV2TeamInput) {
  const id = safeEntityId(input.id);
  if (!clean(input.nameAr) || !clean(input.code)) throw new Error("اسم المنتخب والكود مطلوبان");
  const ref = doc(db, TOURNAMENT_V2_COLLECTIONS.teams, entityDocId(tournamentId, id));
  if ((await getDoc(ref)).exists()) throw new Error("يوجد منتخب بهذا المعرّف بالفعل");
  const now = Date.now();
  await setDoc(ref, {
    id,
    tournamentId,
    code: clean(input.code).toUpperCase().slice(0, 8),
    flagCode: clean(input.flagCode).toLowerCase().slice(0, 8),
    nameAr: clean(input.nameAr),
    nameEn: clean(input.nameEn),
    shortName: clean(input.shortName) || clean(input.nameAr),
    group: clean(input.group) || null,
    sortOrder: Math.max(0, Math.trunc(input.sortOrder || 0)),
    isActive: Boolean(input.isActive),
    schemaVersion: 2,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function updateTournamentTeamV2(tournamentId: string, teamId: string, input: Omit<TournamentV2TeamInput, "id">) {
  if (!clean(input.nameAr) || !clean(input.code)) throw new Error("اسم المنتخب والكود مطلوبان");
  await updateDoc(doc(db, TOURNAMENT_V2_COLLECTIONS.teams, entityDocId(tournamentId, teamId)), {
    code: clean(input.code).toUpperCase().slice(0, 8),
    flagCode: clean(input.flagCode).toLowerCase().slice(0, 8),
    nameAr: clean(input.nameAr),
    nameEn: clean(input.nameEn),
    shortName: clean(input.shortName) || clean(input.nameAr),
    group: clean(input.group) || null,
    sortOrder: Math.max(0, Math.trunc(input.sortOrder || 0)),
    isActive: Boolean(input.isActive),
    updatedAt: Date.now(),
  });
}

export async function deleteTournamentTeamV2Safely(tournamentId: string, teamId: string) {
  const matches = await getDocs(query(collection(db, TOURNAMENT_V2_COLLECTIONS.matches), where("tournamentId", "==", tournamentId)));
  const referenced = matches.docs.some((item) => {
    const data = item.data();
    return data.homeTeamId === teamId || data.awayTeamId === teamId || data?.result?.qualifiedTeamId === teamId;
  });
  if (referenced) throw new Error("لا يمكن حذف المنتخب لأنه مرتبط بمباراة. عطّله بدل الحذف أو عدّل المباريات أولًا.");
  await deleteDoc(doc(db, TOURNAMENT_V2_COLLECTIONS.teams, entityDocId(tournamentId, teamId)));
}

export async function createTournamentMatchV2(tournamentId: string, input: TournamentV2MatchInput) {
  const id = safeEntityId(input.id);
  assertMatchStatus(input.status);
  if (!clean(input.round)) throw new Error("اسم الجولة/الدور مطلوب");
  if (!Number.isFinite(input.kickoffAt) || input.kickoffAt <= 0) throw new Error("موعد المباراة غير صالح");
  if (input.stage === "group" && (!input.homeTeamId || !input.awayTeamId)) throw new Error("حدد الفريقين لمباراة دور المجموعات");
  if (input.homeTeamId && input.homeTeamId === input.awayTeamId) throw new Error("لا يمكن اختيار نفس المنتخب للطرفين");

  const ref = doc(db, TOURNAMENT_V2_COLLECTIONS.matches, entityDocId(tournamentId, id));
  if ((await getDoc(ref)).exists()) throw new Error("توجد مباراة بهذا المعرّف بالفعل");
  const now = Date.now();
  await setDoc(ref, {
    id,
    tournamentId,
    stage: input.stage,
    round: clean(input.round),
    group: clean(input.group) || null,
    homeTeamId: clean(input.homeTeamId),
    awayTeamId: clean(input.awayTeamId),
    homeSourceLabel: clean(input.homeSourceLabel) || null,
    awaySourceLabel: clean(input.awaySourceLabel) || null,
    kickoffAt: input.kickoffAt,
    stadium: clean(input.stadium),
    city: clean(input.city),
    status: input.status,
    predictionOpensAt: null,
    predictionClosesAt: null,
    predictionIsOpen: false,
    predictionEditingIsOpen: true,
    calculationStatus: "not_calculated",
    calculationVersion: null,
    resultHash: null,
    calculatedAt: null,
    calculatedPredictions: 0,
    result: {
      homeScore: null,
      awayScore: null,
      extraTimeHomeScore: null,
      extraTimeAwayScore: null,
      penaltiesHomeScore: null,
      penaltiesAwayScore: null,
      qualifiedTeamId: null,
      qualificationMethod: null,
    },
    schemaVersion: 2,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function updateTournamentMatchV2(tournamentId: string, matchId: string, input: Omit<TournamentV2MatchInput, "id">) {
  assertMatchStatus(input.status);
  if (!clean(input.round)) throw new Error("اسم الجولة/الدور مطلوب");
  if (!Number.isFinite(input.kickoffAt) || input.kickoffAt <= 0) throw new Error("موعد المباراة غير صالح");
  if (input.homeTeamId && input.homeTeamId === input.awayTeamId) throw new Error("لا يمكن اختيار نفس المنتخب للطرفين");

  const ref = doc(db, TOURNAMENT_V2_COLLECTIONS.matches, entityDocId(tournamentId, matchId));
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("المباراة غير موجودة");
  const current = snap.data();
  if (current.calculationStatus === "calculated") throw new Error("لا تعدّل بيانات مباراة محتسبة. تراجع عن الاحتساب أولًا.");

  const currentKickoffAt = Number(current.kickoffAt || 0);
  const currentPredictionClosesAt =
    current.predictionClosesAt == null
      ? null
      : Number(current.predictionClosesAt);
  const predictionClosesAt =
    currentPredictionClosesAt == null ||
    currentPredictionClosesAt === currentKickoffAt
      ? input.kickoffAt
      : currentPredictionClosesAt;

  await updateDoc(ref, {
    stage: input.stage,
    round: clean(input.round),
    group: clean(input.group) || null,
    homeTeamId: clean(input.homeTeamId),
    awayTeamId: clean(input.awayTeamId),
    homeSourceLabel: clean(input.homeSourceLabel) || null,
    awaySourceLabel: clean(input.awaySourceLabel) || null,
    kickoffAt: input.kickoffAt,
    stadium: clean(input.stadium),
    city: clean(input.city),
    status: input.status,
    predictionClosesAt,
    updatedAt: Date.now(),
  });
}

export async function deleteTournamentMatchV2Safely(tournamentId: string, matchId: string) {
  const ref = doc(db, TOURNAMENT_V2_COLLECTIONS.matches, entityDocId(tournamentId, matchId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const current = snap.data();
  if (current.calculationStatus === "calculated") throw new Error("لا يمكن حذف مباراة محتسبة. تراجع عن الاحتساب أولًا.");

  const predictions = await getDocs(query(collection(db, TOURNAMENT_V2_COLLECTIONS.predictions), where("matchId", "==", matchId)));
  const hasPredictions = predictions.docs.some((item) => item.data().tournamentId === tournamentId);
  if (hasPredictions) throw new Error("لا يمكن حذف المباراة لوجود توقعات عليها. أغلقها واتركها محفوظة للسجل.");
  await deleteDoc(ref);
}
