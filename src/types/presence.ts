export type PresencePage =
  | "home"
  | "challengeStudio"
  | "account"
  | "wordGame"
  | "admin"
  | "login"
  | "register"
  | "rules"
  | "unknown";

export type PresenceActivity =
  | "يشاهد الصفحة الرئيسية"
  | "يشاهد استوديو التحدي"
  | "يشاهد حسابه"
  | "يلعب خمن كلمة اليوم"
  | "داخل لوحة الأدمن"
  | "في صفحة الدخول"
  | "في صفحة التسجيل"
  | "يشاهد القوانين"
  | "يتصفح الموقع";

export type OnlinePresence = {
  userId: string;
  fullName: string;
  currentPage: PresencePage;
  activity: PresenceActivity;
  path: string;
  lastSeen: number;
  lastChallengeStudioVisit?: number;
};