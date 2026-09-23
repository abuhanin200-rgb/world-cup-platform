import { getAdminMembers, type AdminMember } from "@/lib/adminMembers";
import { getAdminTournamentPredictionsV2 } from "@/lib/tournamentPredictionsAdminV2";

export type TournamentMissingMemberV2 = Pick<
  AdminMember,
  "id" | "fullName" | "phone" | "favoriteTeam" | "teamEmoji"
>;

const PLATFORM_PREDICTIONS_URL =
  "https://world-cup-platform.vercel.app/tournaments/gulf-cup-27/predictions";

function toText(value: unknown) {
  return String(value ?? "").trim();
}

export function normalizeWhatsappPhone(phone: string) {
  const digits = toText(phone).replace(/\D/g, "");

  if (!digits) return "";
  if (digits.startsWith("966")) return digits;
  if (digits.startsWith("05")) return `966${digits.slice(1)}`;
  if (digits.startsWith("5") && digits.length === 9) return `966${digits}`;

  return digits;
}

export function buildGulf27ReturnReminderMessage(memberName?: string) {
  const cleanName = toText(memberName);
  const greeting = cleanName ? `هلا ${cleanName} 👋` : "هلا يا بطل 👋";

  return [
    "🔥 التحديات رجعت!",
    "",
    greeting,
    "بدأت توقعات خليجي الديار العربية 27 🇸🇦🏆",
    "",
    "لاحظنا إنك ما شاركت بتوقعات البطولة حتى الآن.",
    "توقع المباريات، اجمع نقاطك، ونافس على صدارة التحدي 👑",
    "",
    "⏳ لا تنتظر بداية المباراة… سجّل توقعاتك الآن!",
    "",
    `🌐 ${PLATFORM_PREDICTIONS_URL}`,
  ].join("\n");
}

export function buildGulf27WhatsappUrl(phone: string, memberName?: string) {
  const cleanPhone = normalizeWhatsappPhone(phone);
  if (!cleanPhone) return "";

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    buildGulf27ReturnReminderMessage(memberName),
  )}`;
}

export async function getTournamentMembersWithoutPredictionsV2(
  tournamentId: string,
): Promise<{
  members: TournamentMissingMemberV2[];
  totalMembers: number;
  predictedMembers: number;
  missingMembers: number;
  missingPhone: number;
}> {
  const [allMembers, predictions] = await Promise.all([
    getAdminMembers(),
    getAdminTournamentPredictionsV2(tournamentId),
  ]);

  const members = allMembers.filter(
    (member) => member.id && member.id !== "_init",
  );
  const validMemberIds = new Set(members.map((member) => member.id));
  const predictedUserIds = new Set(
    predictions
      .map((prediction) => toText(prediction.userId))
      .filter((userId) => userId && validMemberIds.has(userId)),
  );

  const missing = members
    .filter((member) => !predictedUserIds.has(member.id))
    .map((member) => ({
      id: member.id,
      fullName: member.fullName,
      phone: member.phone,
      favoriteTeam: member.favoriteTeam,
      teamEmoji: member.teamEmoji,
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "ar"));

  return {
    members: missing,
    totalMembers: members.length,
    predictedMembers: predictedUserIds.size,
    missingMembers: missing.length,
    missingPhone: missing.filter((member) => !normalizeWhatsappPhone(member.phone)).length,
  };
}
