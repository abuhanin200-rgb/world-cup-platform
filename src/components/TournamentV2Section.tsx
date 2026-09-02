import type { ReactNode } from "react";
import {
  CalendarDays,
  Clock3,
  Edit3,
  RefreshCw,
  Scale,
  ScrollText,
  ShieldCheck,
  Trophy,
  UsersRound,
} from "lucide-react";
import GulfCup27CompetitionPanel from "@/components/GulfCup27CompetitionPanel";
import GulfCup27PredictionsPanel from "@/components/GulfCup27PredictionsPanel";
import GulfCup27LeaderboardPanel from "@/components/GulfCup27LeaderboardPanel";
import TournamentSectionPlaceholder from "@/components/tournaments/TournamentSectionPlaceholder";
import GulfCup27StudioPanel from "@/components/GulfCup27StudioPanel";
import TournamentAutomationHeartbeat from "@/components/TournamentAutomationHeartbeat";
import {
  GULF_CUP_27_KNOCKOUT_DATES,
  GULF_CUP_27_KNOCKOUT_SCORING_V1,
  GULF_CUP_27_SCORING_V1,
  GULF_CUP_27_TOURNAMENT_ID,
  type Tournament,
  type TournamentSection,
} from "@/domain/tournaments";

const DATE_LOCALE = "ar-SA-u-ca-gregory-nu-latn";

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat(DATE_LOCALE, { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Riyadh" }).format(new Date(timestamp));
}

function RuleCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return <article className="rounded-[22px] border border-white/10 bg-white/[0.055] p-5"><div className="text-[var(--tournament-primary)]">{icon}</div><h2 className="mt-3 text-lg font-black">{title}</h2><div className="mt-2 space-y-2 text-sm font-semibold leading-7 text-white/62">{children}</div></article>;
}

function ScoreExample({ label, prediction, result, points }: { label: string; prediction: string; result: string; points: number }) {
  return <div className="rounded-2xl border border-white/[0.08] bg-black/15 p-3"><div className="text-[11px] font-black text-white/48">{label}</div><div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center text-xs font-black"><span><span className="block text-[10px] text-white/40">توقعك</span><b dir="ltr" className="text-base [unicode-bidi:isolate]">{prediction}</b></span><span className="text-white/25">←</span><span><span className="block text-[10px] text-white/40">النتيجة</span><b dir="ltr" className="text-base [unicode-bidi:isolate]">{result}</b></span></div><div dir="ltr" className="mt-2 text-center text-lg font-black text-[var(--tournament-primary)] [unicode-bidi:isolate]">+{points}</div></div>;
}

function GulfRulesSection() {
  const semi = formatDate(GULF_CUP_27_KNOCKOUT_DATES.semiFinalsAt);
  const final = formatDate(GULF_CUP_27_KNOCKOUT_DATES.finalAt);
  return <div className="space-y-4">
    <div className="grid gap-3 md:grid-cols-2">
      <RuleCard icon={<UsersRound className="h-5 w-5" aria-hidden="true" />} title="نظام البطولة"><p>مجموعتان، في كل مجموعة أربعة منتخبات، ويتأهل الأول والثاني إلى نصف النهائي.</p><p>نصف النهائي: {semi}. النهائي: {final} في جدة.</p></RuleCard>
      <RuleCard icon={<Clock3 className="h-5 w-5" aria-hidden="true" />} title="فتح التوقع وإغلاقه"><p>يفتح التوقع عندما تفعّله إدارة البطولة وتكتمل هوية طرفي المباراة.</p><p>يُغلق في الموعد المحدد للمباراة أو في وقت الإغلاق الذي تعتمده الإدارة، أيهما مطبق في بيانات المواجهة.</p></RuleCard>
      <RuleCard icon={<Edit3 className="h-5 w-5" aria-hidden="true" />} title="التعديل بعد الحفظ"><p>يمكن تعديل التوقع ما دامت حالة التعديل مفتوحة والمباراة مجدولة أو باب التوقع مفتوحًا.</p><p>بعد الإغلاق أو بدء المباراة لا يقبل النظام توقعًا جديدًا أو تعديلًا متأخرًا.</p></RuleCard>
      <RuleCard icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />} title="التأجيل والإلغاء"><p>المباراة المؤجلة أو الملغاة لا تظهر كتوقع مفتوح، ولا تُحتسب بلا نتيجة مكتملة ومعتمدة.</p><p>عند اعتماد موعد جديد، تتبع الواجهة وقت الفتح والإغلاق المسجل للمواجهة.</p></RuleCard>
      <RuleCard icon={<Trophy className="h-5 w-5" aria-hidden="true" />} title="دور المجموعات"><p>النتيجة بالملي: <strong className="text-white">{GULF_CUP_27_SCORING_V1.exact} نقاط بطولة</strong>. توقع الفائز أو التعادل الصحيح: <strong className="text-white">{GULF_CUP_27_SCORING_V1.outcome}</strong>. خلاف ذلك: صفر.</p></RuleCard>
      <RuleCard icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />} title="خروج المغلوب"><p>النتيجة المتوقعة والرسمية هنا تخص نهاية الوقت الأصلي بعد 90 دقيقة. المطابقة الدقيقة: {GULF_CUP_27_KNOCKOUT_SCORING_V1.exact}، اتجاه النتيجة الصحيح: {GULF_CUP_27_KNOCKOUT_SCORING_V1.outcome}، المتأهل الصحيح: {GULF_CUP_27_KNOCKOUT_SCORING_V1.qualified}، وطريقة التأهل الصحيحة: {GULF_CUP_27_KNOCKOUT_SCORING_V1.method}. الحد الأعلى {GULF_CUP_27_KNOCKOUT_SCORING_V1.max} نقاط.</p><p>عند توقع فوز مباشر يُعتمد الفائز كمتأهل وطريقة التأهل «فوز مباشر» تلقائيًا. وعند توقع التعادل يجب اختيار المتأهل وطريقة الحسم: وقت إضافي أو ركلات ترجيح. تُحتسب البنود الأربعة باستقلال ولا تُمنح نقطة اتجاه التعادل إذا انتهت الدقائق التسعون بفوز.</p></RuleCard>
      <RuleCard icon={<Scale className="h-5 w-5" aria-hidden="true" />} title="حسم تساوي الأعضاء"><p>الترتيب حسب مجموع نقاط البطولة، ثم عدد النتائج بالملي، ثم النتائج الصحيحة، ثم الأقل أخطاء، وأخيرًا الاسم.</p></RuleCard>
      <RuleCard icon={<RefreshCw className="h-5 w-5" aria-hidden="true" />} title="تصحيح نتيجة محتسبة"><p>إذا تراجعت الإدارة عن احتساب مباراة، يمسح النظام نقاط احتسابها ونتيجتها ثم يعيد بناء ترتيب البطولة والإنجازات من التوقعات المعتمدة.</p><p>لا تمس هذه العملية XP الألعاب أو بيانات كأس العالم التاريخية.</p></RuleCard>
    </div>

    <section className="rounded-[24px] border border-[var(--tournament-primary)]/20 bg-[var(--tournament-primary)]/[0.055] p-4 md:p-5">
      <div className="flex items-center gap-2"><ScrollText className="h-5 w-5 text-[var(--tournament-accent)]" aria-hidden="true" /><h2 className="text-lg font-black">أمثلة من محرك الاحتساب الفعلي</h2></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><ScoreExample label="نتيجة بالملي · مجموعات" prediction="2 - 1" result="2 - 1" points={GULF_CUP_27_SCORING_V1.exact} /><ScoreExample label="فائز صحيح · مجموعات" prediction="1 - 0" result="2 - 0" points={GULF_CUP_27_SCORING_V1.outcome} /><ScoreExample label="فوز مباشر دقيق + متأهل + طريقة" prediction="2 - 1" result="2 - 1" points={GULF_CUP_27_KNOCKOUT_SCORING_V1.exact + GULF_CUP_27_KNOCKOUT_SCORING_V1.qualified + GULF_CUP_27_KNOCKOUT_SCORING_V1.method} /><ScoreExample label="تعادل دقيق + متأهل + طريقة" prediction="1 - 1" result="1 - 1" points={GULF_CUP_27_KNOCKOUT_SCORING_V1.exact + GULF_CUP_27_KNOCKOUT_SCORING_V1.qualified + GULF_CUP_27_KNOCKOUT_SCORING_V1.method} /></div>
      <p className="mt-3 text-[11px] font-bold leading-6 text-white/48">مثالا خروج المغلوب يفترضان تطابق المتأهل وطريقة الحسم أيضًا؛ لذلك يجمع كل منهما 3 + 2 + 1 = 6 نقاط.</p>
    </section>
  </div>;
}

export default function TournamentV2Section({ tournament, section }: { tournament: Tournament; section: TournamentSection }) {
  if (tournament.id !== GULF_CUP_27_TOURNAMENT_ID) return <TournamentSectionPlaceholder tournament={tournament} section={section} />;
  let content: ReactNode;
  if (section === "matches") content = <GulfCup27CompetitionPanel />;
  else if (section === "predictions") content = <GulfCup27PredictionsPanel />;
  else if (section === "leaderboard") content = <GulfCup27LeaderboardPanel />;
  else if (section === "rules") content = <GulfRulesSection />;
  else content = <GulfCup27StudioPanel />;
  return <><TournamentAutomationHeartbeat /><div className="mx-auto max-w-7xl px-3 pb-14 pt-1 sm:px-4 md:px-6 md:pb-20">{content}</div></>;
}
