import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import type { Match } from "./matches";

export type MissingPredictionMember = {
  id: string;
  name: string;
  phone: string;
};

function toText(value: unknown) {
  return String(value || "").trim();
}

function normalizeSaudiPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("966")) return digits;
  if (digits.startsWith("05")) return `966${digits.slice(1)}`;
  if (digits.startsWith("5")) return `966${digits}`;

  return digits;
}

function getUserName(data: Record<string, unknown>) {
  return (
    toText(data.fullName) ||
    toText(data.name) ||
    toText(data.userName) ||
    "عضو"
  );
}

function getUserPhone(data: Record<string, unknown>) {
  return normalizeSaudiPhone(
    toText(data.phone) || toText(data.mobile) || toText(data.phoneNumber)
  );
}

export function buildMissingPredictionMessage(match: Match) {
  const isGolden = match.predictionType === "golden";

  const pointsLine = isGolden
    ? "🔥 لا تفوّت الفرصة:\nتوقع صح ودبّل نقاطك في التوقع الذهبي!"
    : "🔥 لا تفوّت الفرصة:\nتوقع صح وزِد نقاطك في جدول الترتيب!";

  return `🚨 تنبيه مهم يا بطل

لاحظنا إنك ما سجلت توقعك حتى الآن لمباراة:

${match.homeTeamEmoji} ${match.homeTeamName} × ${match.awayTeamName} ${match.awayTeamEmoji}

${pointsLine}

⏳ سجّل توقعك قبل إغلاق التوقعات.

رابط المنصة:
https://world-cup-platform.vercel.app`;
}

export function buildWhatsappUrl(phone: string, message: string) {
  const cleanPhone = normalizeSaudiPhone(phone);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export async function getMembersMissingPrediction(
  matchId: string
): Promise<MissingPredictionMember[]> {
  if (!matchId) return [];

  const [usersSnapshot, predictionsSnapshot] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(query(collection(db, "predictions"), where("matchId", "==", matchId))),
  ]);

  const predictedUserIds = new Set(
    predictionsSnapshot.docs
      .filter((docSnap) => docSnap.id !== "_init")
      .map((docSnap) => toText(docSnap.data().userId))
      .filter(Boolean)
  );

  return usersSnapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => {
      const data = docSnap.data();

      return {
        id: docSnap.id,
        name: getUserName(data),
        phone: getUserPhone(data),
      };
    })
    .filter((member) => !predictedUserIds.has(member.id))
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));
}