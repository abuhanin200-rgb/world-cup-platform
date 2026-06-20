export type PresencePage =
  | "home"
  | "account"
  | "wordGame"
  | "admin"
  | "login"
  | "register"
  | "rules"
  | "unknown";

export type PresenceActivity =
  | "يتصفح الموقع"
  | "يشاهد الصفحة الرئيسية"
  | "يلعب خمن كلمة اليوم"
  | "يشاهد حسابه"
  | "يشاهد القوانين"
  | "في صفحة الدخول"
  | "في صفحة التسجيل"
  | "داخل لوحة الأدمن";

export type OnlinePresence = {
  userId: string;
  fullName: string;
  currentPage: PresencePage;
  activity: PresenceActivity;
  path: string;
  lastSeen: number;
};