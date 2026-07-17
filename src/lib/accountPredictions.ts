import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import type {
  KnockoutRound,
  MatchStage,
  PredictionType,
  QualificationMethod,
} from "./matches";

export type AccountPredictionResultType = "exact" | "winner" | "wrong" | "";

export type AccountPrediction = {
  id: string;
  matchId: string;

  homeTeamName: string;
  homeTeamEmoji: string;
  homeTeamCode: string;

  awayTeamName: string;
  awayTeamEmoji: string;
  awayTeamCode: string;

  homeScore: number;
  awayScore: number;

  qualifiedTeamCode?: string | null;
  qualificationMethod?: QualificationMethod | null;

  actualHomeScore: number | null;
  actualAwayScore: number | null;

  actualQualifiedTeamCode?: string | null;
  actualQualificationMethod?: QualificationMethod | null;

  points: number;
  resultType: AccountPredictionResultType;
  isCalculated: boolean;

  predictionType: PredictionType;
  matchStage: MatchStage;
  knockoutRound?: KnockoutRound;

  createdAt: string;
  calculatedAt: string;

  /**
   * نحافظ على جميع حقول توقع النهائي كما هي في Firestore.
   * يشمل ذلك اختيارات الإضافات، النتائج الفعلية، وتفاصيل النقاط
   * سواء كانت محفوظة كحقول مباشرة أو داخل كائنات متداخلة.
   */
  [key: string]: unknown;
};

type AccountMatchInfo = {
  matchStage: MatchStage;
  knockoutRound?: KnockoutRound;
  rawData: Record<string, unknown>;
};

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toText(value: unknown) {
  return String(value || "").trim();
}

function toNullableText(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return toText(value);
}

function toNullableNumber(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeResultType(value: unknown): AccountPredictionResultType {
  if (value === "exact" || value === "winner" || value === "wrong") {
    return value;
  }

  return "";
}

function normalizePredictionType(value: unknown): PredictionType {
  return value === "golden" ? "golden" : "normal";
}

function normalizeMatchStage(value: unknown): MatchStage {
  return value === "knockout" ? "knockout" : "group";
}

function normalizeKnockoutRound(value: unknown): KnockoutRound {
  if (
    value === "semiFinal" ||
    value === "thirdPlace" ||
    value === "final"
  ) {
    return value;
  }

  return "general";
}

function normalizeQualificationMethod(
  value: unknown,
): QualificationMethod | null {
  if (value === "extraTime" || value === "penalties") {
    return value;
  }

  return null;
}

async function getAccountMatchesInfo() {
  const matchesSnapshot = await getDocs(collection(db, "matches"));
  const matchesMap = new Map<string, AccountMatchInfo>();

  matchesSnapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .forEach((docSnap) => {
      const data = docSnap.data() as Record<string, unknown>;
      const matchStage = normalizeMatchStage(data.matchStage);

      matchesMap.set(docSnap.id, {
        matchStage,
        knockoutRound:
          matchStage === "knockout"
            ? normalizeKnockoutRound(data.knockoutRound)
            : undefined,
        rawData: data,
      });
    });

  return matchesMap;
}

export async function getAccountPredictions(
  userId: string,
): Promise<AccountPrediction[]> {
  const predictionsRef = collection(db, "predictions");
  const predictionsQuery = query(
    predictionsRef,
    where("userId", "==", userId),
  );

  const [predictionsSnapshot, matchesMap] = await Promise.all([
    getDocs(predictionsQuery),
    getAccountMatchesInfo(),
  ]);

  return predictionsSnapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => {
      const data = docSnap.data() as Record<string, unknown>;
      const matchId = toText(data.matchId);
      const currentMatchInfo = matchesMap.get(matchId);

      const matchStage =
        currentMatchInfo?.matchStage ?? normalizeMatchStage(data.matchStage);

      const knockoutRound =
        matchStage === "knockout"
          ? currentMatchInfo?.knockoutRound ??
            normalizeKnockoutRound(data.knockoutRound)
          : undefined;

      return {
        // بيانات المباراة أولًا كاحتياط للنتائج والإضافات الفعلية.
        ...(currentMatchInfo?.rawData || {}),

        // بيانات توقع العضو لها الأولوية دائمًا.
        ...data,

        // الحقول الأساسية أدناه تُعاد بصيغة موحّدة وآمنة للواجهة.
        id: docSnap.id,
        matchId,

        homeTeamName: toText(data.homeTeamName),
        homeTeamEmoji: toText(data.homeTeamEmoji),
        homeTeamCode: toText(data.homeTeamCode),

        awayTeamName: toText(data.awayTeamName),
        awayTeamEmoji: toText(data.awayTeamEmoji),
        awayTeamCode: toText(data.awayTeamCode),

        homeScore: toNumber(data.homeScore),
        awayScore: toNumber(data.awayScore),

        qualifiedTeamCode: toNullableText(data.qualifiedTeamCode),
        qualificationMethod: normalizeQualificationMethod(
          data.qualificationMethod,
        ),

        actualHomeScore: toNullableNumber(data.actualHomeScore),
        actualAwayScore: toNullableNumber(data.actualAwayScore),

        actualQualifiedTeamCode: toNullableText(
          data.actualQualifiedTeamCode,
        ),
        actualQualificationMethod: normalizeQualificationMethod(
          data.actualQualificationMethod,
        ),

        points: toNumber(data.points),
        resultType: normalizeResultType(data.resultType),
        isCalculated: Boolean(data.isCalculated),

        predictionType: normalizePredictionType(data.predictionType),
        matchStage,
        knockoutRound,

        createdAt: toText(data.createdAt),
        calculatedAt: toText(data.calculatedAt),
      } satisfies AccountPrediction;
    })
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      return bTime - aTime;
    });
}