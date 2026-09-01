"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { doc, onSnapshot } from "firebase/firestore";
import {
  ArrowLeft,
  Award,
  Gamepad2,
  LogOut,
  Mail,
  Medal,
  Settings,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { getTournamentLeaderboardV2 } from "@/lib/tournamentV2Firestore";
import { updateUserProfile } from "@/lib/users";
import { getMemberPrivateProfile, isValidEmail, updateMemberEmail } from "@/lib/memberPrivateProfile";
import {
  ASIAN_CUP_2027_TOURNAMENT,
  GULF_CUP_27_TOURNAMENT,
  GULF_CUP_27_TOURNAMENT_ID,
  WORLD_CUP_2026_TOURNAMENT,
  getTournamentHref,
} from "@/domain/tournaments";
import type { PlatformGameStats } from "@/domain/games/platformGames";
import { getLevelLabel, getLevelProgress } from "@/domain/games/platformGames";
import { playInteractionFeedback } from "@/lib/interactionFeedback";
import NationalTeamSelect from "@/components/NationalTeamSelect";
import TeamFlag from "@/components/TeamFlag";

type Tab = "overview" | "gulf" | "world" | "asia" | "games" | "settings";
type V2Stats = { points: number; rank: number | null; played: number; exact: number; correctOutcome: number; wrong: number; bestStreak: number };

const EMPTY_V2: V2Stats = { points: 0, rank: null, played: 0, exact: 0, correctOutcome: 0, wrong: 0, bestStreak: 0 };

function Stat({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 text-center md:p-4">
      <div dir="ltr" className={`text-xl font-black md:text-2xl ${accent ? "text-[var(--brand-yellow)]" : "text-white"}`}>{value}</div>
      <div className="mt-1 text-[9px] font-bold text-white/38 md:text-[10px]">{label}</div>
    </div>
  );
}

function SectionIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="mb-4">
      <p className="text-[10px] font-black text-[var(--brand-yellow)]">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-black md:text-2xl">{title}</h2>
      <p className="mt-1 text-xs font-semibold text-white/42">{text}</p>
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { user, isLoggedIn, loading, refreshUser, secureSession, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [gulf, setGulf] = useState<V2Stats>(EMPTY_V2);
  const [games, setGames] = useState<PlatformGameStats | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [favoriteTeam, setFavoriteTeam] = useState("");
  const [teamEmoji, setTeamEmoji] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !isLoggedIn) router.replace("/login");
  }, [loading, isLoggedIn, router]);

  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName);
    setPhone(user.phone);
    setFavoriteTeam(user.favoriteTeam);
    setTeamEmoji(user.teamEmoji || "");

    void getTournamentLeaderboardV2(GULF_CUP_27_TOURNAMENT_ID)
      .then((rows) => {
        const row = rows.find((item) => item.userId === user.id);
        if (row) setGulf({ points: row.points, rank: row.rank, played: row.played, exact: row.exact, correctOutcome: row.correctOutcome, wrong: row.wrong, bestStreak: row.bestStreak });
      })
      .catch(console.error);

    return onSnapshot(doc(db, "platformGameStats", user.id), (snapshot) => {
      setGames(snapshot.exists() ? (snapshot.data() as PlatformGameStats) : null);
    });
  }, [user]);

  useEffect(() => {
    if (!user || !secureSession) return;
    let active = true;
    void getMemberPrivateProfile(user.id)
      .then((profile) => { if (active) setEmail(profile?.email || ""); })
      .catch((error) => console.error("تعذر تحميل البريد الخاص:", error));
    return () => { active = false; };
  }, [user, secureSession]);

  const general = useMemo(() => ({
    points: (user?.points || 0) + gulf.points,
    played: (user?.total || 0) + gulf.played,
    exact: (user?.correct || 0) + gulf.exact,
    bestMath: Math.max(user?.bestStreak || 0, gulf.bestStreak),
    gameXp: games?.totalXp || 0,
  }), [user, gulf, games]);

  if (loading || !user) {
    return (
      <main className="mx-auto max-w-7xl px-3 py-8 md:px-6">
        <div className="grid gap-3"><div className="h-36 animate-pulse rounded-[28px] bg-white/[0.04]" /><div className="h-14 animate-pulse rounded-2xl bg-white/[0.04]" /><div className="grid grid-cols-3 gap-2 md:grid-cols-5">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-2xl bg-white/[0.04]" />)}</div></div>
      </main>
    );
  }

  const tabs: [Tab, string, typeof Trophy][] = [
    ["overview", "نظرة عامة", UserRound],
    ["gulf", "خليجي 27", Trophy],
    ["world", "كأس العالم", Medal],
    ["asia", "آسيا 2027", Award],
    ["games", "الألعاب", Gamepad2],
    ["settings", "الإعدادات", Settings],
  ];

  const levelProgress = getLevelProgress(games?.totalXp || 0);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    if (!isValidEmail(email)) {
      setMessage("أدخل بريدًا إلكترونيًا صحيحًا");
      playInteractionFeedback("error");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      await updateUserProfile({ userId: user.id, fullName, phone, favoriteTeam, teamEmoji });
      await updateMemberEmail(user.id, email);
      await refreshUser();
      setMessage("تم حفظ بياناتك بنجاح");
      playInteractionFeedback("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر حفظ البيانات");
      playInteractionFeedback("error");
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    playInteractionFeedback("selection");
    logout();
    router.replace("/");
  }

  return (
    <main dir="rtl" className="relative mx-auto max-w-7xl overflow-hidden px-3 pb-14 pt-4 sm:px-4 md:px-6 md:pb-20 md:pt-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(circle_at_88%_8%,rgba(255,194,16,.08),transparent_25%),radial-gradient(circle_at_10%_24%,rgba(53,108,255,.12),transparent_30%)]" />

      <motion.section initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="altahaddi-glass-strong relative overflow-hidden rounded-[28px] p-4 md:rounded-[36px] md:p-7">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,.04),transparent_42%),radial-gradient(circle_at_90%_5%,rgba(255,194,16,.16),transparent_25%)]" />
        <div className="relative flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[20px] border border-white/12 bg-white/[0.06] text-2xl font-black text-[var(--brand-yellow)] md:h-20 md:w-20 md:rounded-[24px]">{user.fullName.trim().charAt(0)}</div>
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-yellow)]/18 bg-[var(--brand-yellow)]/[0.06] px-2.5 py-1.5 text-[9px] font-black text-[var(--brand-yellow)]"><Sparkles className="h-3 w-3" /> ملف العضو</div>
            <h1 className="mt-2 truncate text-2xl font-black md:text-3xl">{user.fullName}</h1>
            <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold text-white/45 md:text-xs">{user.favoriteTeam ? <><TeamFlag name={user.favoriteTeam} size="sm" /><span>يشجع {user.favoriteTeam}</span></> : <span>عضو في منصة التحدي</span>}</div>
          </div>
          <button type="button" onClick={handleLogout} className="hidden min-h-[44px] items-center gap-1.5 rounded-xl border border-red-300/15 bg-red-400/[0.06] px-3 text-xs font-black text-red-100 transition hover:bg-red-400/[0.12] sm:inline-flex"><LogOut className="h-4 w-4" /> خروج</button>
        </div>
      </motion.section>

      <nav className="hidden-scrollbar mt-4 flex gap-1.5 overflow-x-auto pb-1 md:mt-5 md:gap-2" aria-label="أقسام الملف الشخصي">
        {tabs.map(([key, label, Icon]) => (
          <button key={key} onClick={() => { setTab(key); playInteractionFeedback("selection"); }} className={`relative inline-flex min-h-[42px] shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[10px] font-black transition md:min-h-[44px] md:px-4 md:text-xs ${tab === key ? "border-[var(--brand-yellow)]/40 bg-[var(--brand-yellow)] text-[#061a4d]" : "border-white/10 bg-white/[0.045] text-white/52 hover:bg-white/[0.07] hover:text-white/75"}`}>
            <Icon className="h-3.5 w-3.5 md:h-4 md:w-4" /> {label}
          </button>
        ))}
      </nav>

      <motion.section key={tab} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }} className="mt-4 md:mt-5">
        {tab === "overview" ? (
          <>
            <SectionIntro eyebrow="ملخصك" title="كل أرقامك في مكان واحد" text="نظرة سريعة على البطولات والألعاب من حساب واحد." />
            <div className="grid grid-cols-5 gap-1.5 md:gap-2.5">
              <Stat label="نقاط البطولات" value={general.points} accent />
              <Stat label="المشاركات" value={general.played} />
              <Stat label="الصحيح" value={general.exact} />
              <Stat label="أفضل سلسلة" value={general.bestMath} />
              <Stat label="XP الألعاب" value={general.gameXp} />
            </div>

            <div className="mt-4 grid gap-2.5 md:grid-cols-3">
              {[
                [GULF_CUP_27_TOURNAMENT, gulf.rank ? `المركز ${gulf.rank}` : "ابدأ المنافسة", "from-emerald-400/12"],
                [WORLD_CUP_2026_TOURNAMENT, user.currentRank ? `المركز ${user.currentRank}` : "السجل النهائي", "from-cyan-400/10"],
                [ASIAN_CUP_2027_TOURNAMENT, "قريبًا", "from-violet-400/10"],
              ].map(([tournament, meta, tone]) => {
                const t = tournament as typeof GULF_CUP_27_TOURNAMENT;
                return (
                  <Link key={t.id} href={getTournamentHref(t)} className={`group relative overflow-hidden rounded-[22px] border border-white/10 bg-gradient-to-br ${tone as string} to-white/[0.035] p-4 transition hover:-translate-y-0.5 hover:border-white/18`}>
                    <div className="flex items-center justify-between gap-3"><div><div className="text-sm font-black">{t.shortName}</div><div className="mt-1 text-[10px] font-bold text-white/38">{meta as string}</div></div><div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.05]"><Trophy className="h-5 w-5 text-[var(--brand-yellow)]" /></div></div>
                    <div className="mt-4 flex items-center justify-between text-[10px] font-black text-white/38"><span>فتح البطولة</span><ArrowLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-1" /></div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4 md:p-5">
              <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black text-[var(--brand-yellow)]">مستواك في الألعاب</p><h3 className="mt-1 text-lg font-black">{getLevelLabel(levelProgress.level)}</h3></div><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--brand-yellow)] text-lg font-black text-[#04133a]">{levelProgress.level}</div></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[var(--brand-yellow)]" style={{ width: `${levelProgress.progress}%` }} /></div>
            </div>
          </>
        ) : null}

        {tab === "gulf" ? (
          <div className="altahaddi-glass rounded-[26px] p-4 md:p-6">
            <SectionIntro eyebrow="خليجي 27" title="أرقامك في البطولة" text="إحصائيات مستقلة عن بقية البطولات والألعاب." />
            <div className="grid grid-cols-3 gap-2 md:grid-cols-6"><Stat label="المركز" value={gulf.rank || "—"} accent /><Stat label="النقاط" value={gulf.points} /><Stat label="المباريات" value={gulf.played} /><Stat label="بالملي" value={gulf.exact} /><Stat label="صحيح" value={gulf.correctOutcome} /><Stat label="أفضل سلسلة" value={gulf.bestStreak} /></div>
            <Link href="/tournaments/gulf-cup-27" className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--brand-yellow)] px-4 text-xs font-black text-[#061a4d]">دخول البطولة <ArrowLeft className="h-4 w-4" /></Link>
          </div>
        ) : null}

        {tab === "world" ? (
          <div className="rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_90%_0%,rgba(45,190,255,.09),transparent_25%),rgba(255,255,255,.035)] p-4 md:p-6">
            <SectionIntro eyebrow="كأس العالم 2026" title="سجلك النهائي" text="هذه الأرقام التاريخية معروضة كما هي دون تغيير في الحسبة القديمة." />
            <div className="grid grid-cols-3 gap-2 md:grid-cols-6"><Stat label="المركز" value={user.currentRank || "—"} accent /><Stat label="النقاط" value={user.points} /><Stat label="التوقعات" value={user.total} /><Stat label="الصحيح" value={user.correct} /><Stat label="الخطأ" value={user.wrong} /><Stat label="أفضل سلسلة" value={user.bestStreak} /></div>
            <Link href="/tournaments/world-cup-2026" className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-[#061a4d]">استعراض البطولة <ArrowLeft className="h-4 w-4" /></Link>
          </div>
        ) : null}

        {tab === "asia" ? (
          <div className="rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(111,68,255,.10),transparent_30%),rgba(255,255,255,.04)] p-7 text-center"><Award className="mx-auto h-9 w-9 text-[var(--brand-yellow)]" /><h2 className="mt-3 text-xl font-black">كأس آسيا 2027</h2><p className="mt-2 text-sm font-semibold text-white/44">سجل المشاركة والإحصائيات يظهر هنا تلقائيًا مع بدء البطولة.</p></div>
        ) : null}

        {tab === "games" ? (
          <div className="altahaddi-glass rounded-[26px] p-4 md:p-6">
            <SectionIntro eyebrow="الألعاب والتحديات" title="مستواك في اللعب" text="XP منفصل تمامًا عن نقاط البطولات." />
            <div className="grid grid-cols-5 gap-1.5 md:gap-2.5"><Stat label="XP" value={games?.totalXp || 0} accent /><Stat label="المستوى" value={games?.level || 1} /><Stat label="التحديات" value={games?.gamesPlayed || 0} /><Stat label="الفوز" value={games?.wins || 0} /><Stat label="التصنيف" value={getLevelLabel(games?.level || 1)} /></div>
            <Link href="/games" className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--brand-yellow)] px-4 text-xs font-black text-[#061a4d]">فتح الألعاب <Gamepad2 className="h-4 w-4" /></Link>
          </div>
        ) : null}

        {tab === "settings" ? (
          <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
            <div className="altahaddi-glass rounded-[26px] p-4 md:p-6">
              <div className="flex items-center justify-between gap-3"><SectionIntro eyebrow="الإعدادات" title="بيانات الحساب" text="حدّث بياناتك الأساسية عند الحاجة." /><ShieldCheck className="h-6 w-6 shrink-0 text-[var(--brand-yellow)]" /></div>
              <form onSubmit={saveProfile} className="grid gap-3 md:grid-cols-2">
                <label className="text-xs font-black">الاسم<input value={fullName} onChange={(event) => setFullName(event.target.value)} className="altahaddi-input mt-1.5" /></label>
                <label className="text-xs font-black">الجوال<input value={phone} onChange={(event) => setPhone(event.target.value)} className="altahaddi-input mt-1.5" /></label>
                <label className="text-xs font-black md:col-span-2">البريد الإلكتروني <span className="font-bold text-white/30">(اختياري)</span><div className="relative mt-1.5"><Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" className="altahaddi-input pr-10" /></div><span className="mt-1.5 block text-[9px] font-bold text-white/28">خاص بالحساب ولا يظهر للأعضاء.</span></label>
                <label className="text-xs font-black md:col-span-2">المنتخب المفضل
                  <div className="mt-1.5">
                    <NationalTeamSelect
                      value={favoriteTeam}
                      onChange={(value) => {
                        setFavoriteTeam(value);
                        setTeamEmoji("");
                      }}
                    />
                  </div>
                </label>
                {message ? <div role="status" className={`md:col-span-2 text-xs font-bold ${message.includes("تم") ? "text-emerald-300" : "text-red-200"}`}>{message}</div> : null}
                <div className="md:col-span-2"><button disabled={saving} className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--brand-yellow)] px-5 text-xs font-black text-[#061a4d] transition hover:brightness-105 disabled:opacity-55">{saving ? "جاري الحفظ…" : "حفظ البيانات"}</button></div>
              </form>
            </div>

            <aside className="rounded-[26px] border border-red-300/12 bg-red-400/[0.035] p-4 md:p-5"><LogOut className="h-6 w-6 text-red-200" /><h3 className="mt-3 text-lg font-black">تسجيل الخروج</h3><p className="mt-1 text-[11px] font-semibold leading-5 text-white/38">ينهي الجلسة على هذا الجهاز فقط، ولا يحذف حسابك أو بياناتك.</p><button type="button" onClick={handleLogout} className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-red-300/18 bg-red-400/[0.08] px-4 text-xs font-black text-red-100 transition hover:bg-red-400/[0.14]"><LogOut className="h-4 w-4" /> خروج</button></aside>
          </div>
        ) : null}
      </motion.section>
    </main>
  );
}
