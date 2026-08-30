import type { Tournament } from "./types";
import {
  getCurrentRegisteredTournament,
  getRegisteredTournamentById,
  getRegisteredTournamentBySlug,
  getRegisteredTournaments,
} from "./registry";

/**
 * واجهة موحدة للوصول إلى بيانات البطولات.
 *
 * الهدف منها فصل بقية المنصة عن مصدر البيانات الفعلي:
 * - الآن: Registry محلي وآمن يحتوي كأس العالم 2026 فقط.
 * - لاحقًا: Firestore للبطولات V2 مع إبقاء Legacy Adapter لكأس العالم.
 *
 * جميع الدوال Promise-based عمدًا حتى لا يحتاج المستهلك إلى التغيير
 * عندما يصبح مصدر البيانات لاحقًا غير متزامن مثل Firestore.
 */
export interface TournamentRepository {
  list(): Promise<Tournament[]>;
  getById(tournamentId: string): Promise<Tournament | null>;
  getBySlug(slug: string): Promise<Tournament | null>;
  getCurrent(): Promise<Tournament | null>;
}

/**
 * تنفيذ Read-only يعتمد على Registry المحلي فقط.
 * لا توجد هنا أي قراءة أو كتابة إلى Firebase.
 */
export class RegisteredTournamentRepository implements TournamentRepository {
  async list(): Promise<Tournament[]> {
    return getRegisteredTournaments();
  }

  async getById(tournamentId: string): Promise<Tournament | null> {
    return getRegisteredTournamentById(tournamentId);
  }

  async getBySlug(slug: string): Promise<Tournament | null> {
    return getRegisteredTournamentBySlug(slug);
  }

  async getCurrent(): Promise<Tournament | null> {
    return getCurrentRegisteredTournament();
  }
}

/**
 * النسخة الافتراضية الحالية للمنصة.
 * استيراد هذا الكائن يمنع إنشاء Repository جديد في كل Component/Service.
 */
export const tournamentRepository: TournamentRepository =
  new RegisteredTournamentRepository();
