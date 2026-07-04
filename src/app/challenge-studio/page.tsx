"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getPublishedChallengeStudioBulletins,
  type ChallengeStudioBulletin,
  type ChallengeStudioCard,
} from "@/lib/challengeStudio";
import {
  getChallengeStudioOnlineViewers,
  updateOnlinePresence,
} from "@/lib/presenceService";
import ChallengeStudioAnalysis from "@/components/ChallengeStudioAnalysis";
import { PredictionDetailsModal } from "@/components/LeaderboardTable";
import { getLeaderboardUsers, type LeaderboardUser } from "@/lib/leaderboard";
import { getPredictionsByUserId, type Prediction } from "@/lib/predictions";

const CHALLENGE_STUDIO_LAST_SEEN_KEY = "challengeStudioLastSeenBulletin";
const ARCHIVE_PAGE_SIZE = 4;

function getChallengeStudioBulletinSeenKey(bulletin: {
  id?: string;
  date?: string;
  summary?: string;
}) {
  return `${bulletin.id || ""}-${bulletin.date || ""}-${bulletin.summary || ""}`;
}

function markLatestChallengeStudioBulletinAsSeen(
  bulletins: ChallengeStudioBulletin[]
) {
  if (typeof window === "undefined") return;

  const latestBulletin = bulletins[0];
  if (!latestBulletin) return;

  const latestKey = getChallengeStudioBulletinSeenKey(latestBulletin);
  if (!latestKey) return;

  window.localStorage.setItem(CHALLENGE_STUDIO_LAST_SEEN_KEY, latestKey);
}

function getCardStyle(type: ChallengeStudioCard["type"]) {
  if (type === "main") {
    return {
      label: "الخبر الرئيسي",
      className:
        "border-red-400/30 bg-gradient-to-br from-red-500/20 to-slate-950/60",
      iconBox: "border-red-400/30 bg-red-500/20",
    };
  }

  if (type === "quote") {
    return {
      label: "مؤتمر صحفي",
      className:
        "border-amber-400/30 bg-gradient-to-br from-amber-400/15 to-slate-950/60",
      iconBox: "border-amber-400/30 bg-amber-400/20",
    };
  }

  if (type === "number") {
    return {
      label: "إحصائية اليوم",
      className:
        "border-sky-400/30 bg-gradient-to-br from-sky-400/15 to-slate-950/60",
      iconBox: "border-sky-400/30 bg-sky-400/20",
    };
  }

  if (type === "badge") {
    return {
      label: "وسام اليوم",
      className:
        "border-emerald-400/30 bg-gradient-to-br from-emerald-400/15 to-slate-950/60",
      iconBox: "border-emerald-400/30 bg-emerald-400/20",
    };
  }

  if (type === "funny") {
    return {
      label: "لقطة اليوم",
      className:
        "border-violet-400/30 bg-gradient-to-br from-violet-400/15 to-slate-950/60",
      iconBox: "border-violet-400/30 bg-violet-400/20",
    };
  }

  return {
    label: "تحت المجهر",
    className:
      "border-cyan-400/30 bg-gradient-to-br from-cyan-400/15 to-slate-950/60",
    iconBox: "border-cyan-400/30 bg-cyan-400/20",
  };
}

function StudioCard({
  card,
  featured = false,
}: {
  card: ChallengeStudioCard;
  featured?: boolean;
}) {
  const style = getCardStyle(card.type);

  return (
    <article
      className={`relative overflow-hidden rounded-3xl border p-4 shadow-2xl md:p-5 ${
        style.className
      } ${featured ? "md:col-span-2" : ""}`}
    >
      <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-3xl" />

      <div className="relative">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-2xl ${style.iconBox}`}
            >
              {card.icon}
            </div>

            <div>
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-black text-slate-200">
                {style.label}
              </span>

              <h3 className="mt-2 text-base font-black md:text-xl">
                {card.title}
              </h3>
            </div>
          </div>
        </div>

        <p className="whitespace-pre-line text-sm font-bold leading-8 text-slate-100 md:text-base">
          {card.content}
        </p>
      </div>
    </article>
  );
}

export default function ChallengeStudioPage() {
  const { user, loading: authLoading } = useAuth();
  const bulletinTopRef = useRef<HTMLDivElement | null>(null);

  const [bulletins, setBulletins] = useState<ChallengeStudioBulletin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBulletinId, setSelectedBulletinId] = useState("");
  const [archivePage, setArchivePage] = useState(0);

  const [onlineMembers, setOnlineMembers] = useState<
    { userId: string; userName: string }[]
  >([]);

  const [selectedUser, setSelectedUser] = useState<LeaderboardUser | null>(null);
  const [selectedPredictions, setSelectedPredictions] = useState<Prediction[]>(
    []
  );
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  async function openMemberProfile(userId: string) {
    if (!userId) return;

    try {
      setSelectedUser(null);
      setSelectedPredictions([]);
      setLoadingPredictions(true);

      const users = await getLeaderboardUsers();
      const member = users.find((item) => item.id === userId);

      if (!member) {
        alert("تعذر العثور على ملف العضو.");
        return;
      }

      setSelectedUser(member);

      const predictions = await getPredictionsByUserId(userId);
      setSelectedPredictions(predictions);
    } catch (error) {
      console.error("Challenge studio member profile error:", error);
      alert("تعذر تحميل ملف العضو.");
    } finally {
      setLoadingPredictions(false);
    }
  }

  function closeMemberProfile() {
    setSelectedUser(null);
    setSelectedPredictions([]);
    setLoadingPredictions(false);
  }

  async function loadBulletins() {
    try {
      setLoading(true);

      const data = await getPublishedChallengeStudioBulletins(30);

      setBulletins(data);
      markLatestChallengeStudioBulletinAsSeen(data);
    } catch (error) {
      console.error("Challenge studio load error:", error);
    } finally {
      setLoading(false);
    }
  }

  function selectBulletin(id: string) {
    setSelectedBulletinId(id);

    window.setTimeout(() => {
      bulletinTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

  function backToLatestBulletin() {
    setSelectedBulletinId("");

    window.setTimeout(() => {
      bulletinTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

  useEffect(() => {
    loadBulletins();
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;

    const currentUser = user;

    function updatePresence() {
      updateOnlinePresence({
        userId: currentUser.id,
        fullName: currentUser.fullName,
        path: "/challenge-studio",
      }).catch((error) => {
        console.error("Challenge studio presence update error:", error);
      });
    }

    updatePresence();

    const intervalId = window.setInterval(() => {
      updatePresence();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading || !user) return;

    let isMounted = true;

    async function loadOnlineMembers() {
      try {
        const viewers = await getChallengeStudioOnlineViewers();

        if (!isMounted) return;

        setOnlineMembers(
          viewers.map((viewer) => ({
            userId: viewer.userId,
            userName: viewer.fullName || "عضو",
          }))
        );
      } catch (error) {
        console.error("Challenge studio online viewers error:", error);
      }
    }

    loadOnlineMembers();

    const intervalId = window.setInterval(() => {
      loadOnlineMembers();
    }, 10000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [authLoading, user]);

  const latest = bulletins[0];

  const currentBulletin =
    bulletins.find((item) => item.id === selectedBulletinId) || latest;

  const isViewingArchive =
    Boolean(selectedBulletinId) && currentBulletin?.id !== latest?.id;

  const archive = bulletins.filter((item) => item.id !== currentBulletin?.id);

  const archiveTotalPages = Math.max(
    1,
    Math.ceil(archive.length / ARCHIVE_PAGE_SIZE)
  );

  const visibleArchive = archive.slice(
    archivePage * ARCHIVE_PAGE_SIZE,
    archivePage * ARCHIVE_PAGE_SIZE + ARCHIVE_PAGE_SIZE
  );

  const sortedCards = useMemo(() => {
    if (!currentBulletin) return [];
    return [...currentBulletin.cards].sort((a, b) => b.priority - a.priority);
  }, [currentBulletin]);

  const mainCard =
    sortedCards.find((card) => card.type === "main") || sortedCards[0];

  const otherCards = sortedCards.filter((card) => card !== mainCard);

  const breakingText =
    mainCard?.content ||
    "استوديو التحدي يترقب أحداث المنافسة القادمة بين الأعضاء.";

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
    >
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3 md:px-4 md:py-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-2xl border border-white/20 bg-white/10 md:h-12 md:w-12">
              <img
                src="/wc2026-logo.png"
                alt="شعار منصة توقعات كأس العالم 2026"
                className="h-full w-full object-contain p-1"
              />
            </div>

            <div>
              <h1 className="text-xs font-black md:text-xl">
                منصة توقعات كأس العالم 2026
              </h1>
              <p className="text-[10px] text-slate-300 md:text-sm">
                World Cup 2026 Predictions Platform
              </p>
            </div>
          </div>

          <a
            href="/"
            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold hover:bg-white/10 md:text-sm"
          >
            الرئيسية
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-3 py-5 md:px-4 md:py-7">
        <div className="relative mb-5 overflow-hidden rounded-3xl border border-amber-400/25 bg-white/10 p-5 text-center shadow-2xl md:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.22),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.18),transparent_40%)]" />

          <div className="relative">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl border border-amber-400/30 bg-slate-950/50 text-4xl shadow-lg shadow-amber-950/30">
              🎙️
            </div>

            <h2 className="text-3xl font-black md:text-5xl">
              استوديو التحدي
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-sm font-bold leading-7 text-amber-100 md:text-base">
              القناة الرسمية لأخبار الأعضاء، التصريحات، الأوسمة، والطقطقة
              الرياضية الخفيفة.
            </p>

            <p className="mt-2 text-[11px] text-slate-300 md:text-xs">
              المحتوى ترفيهي ومولد بالذكاء الاصطناعي بناءً على بيانات البطولة.
            </p>
          </div>
        </div>

        {currentBulletin && (
          <div className="mb-5 overflow-hidden rounded-2xl border border-red-400/30 bg-red-500/10 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="shrink-0 bg-red-500 px-4 py-3 text-xs font-black text-white md:text-sm">
                🚨 عاجل
              </div>

              <div className="min-w-0 flex-1 overflow-hidden py-3">
                <div className="animate-pulse truncate text-xs font-black text-red-100 md:text-sm">
                  {breakingText}
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/10 p-8 text-center text-slate-300">
            جاري تحميل النشرة...
          </div>
        ) : !currentBulletin ? (
          <>
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
              <div className="text-4xl">🎙️</div>

              <h3 className="mt-3 text-xl font-black">النشرة لم تُنشر بعد</h3>

              <p className="mt-2 text-sm text-slate-300">
                قريبًا تظهر هنا أخبار الأعضاء وتحدياتهم.
              </p>
            </div>

            <div className="mt-8">
              <ChallengeStudioAnalysis
                currentUserId={user?.id || ""}
                currentUserName={user?.fullName || "عضو"}
                onlineMembers={onlineMembers}
                onMemberClick={openMemberProfile}
              />
            </div>
          </>
        ) : (
          <>
            <div ref={bulletinTopRef} className="mb-4 scroll-mt-24">
              {isViewingArchive && (
                <div className="mb-4 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-3 text-center text-xs font-black text-amber-100 md:text-sm">
                  📚 أنت تشاهد نشرة قديمة: {currentBulletin.date}
                  <button
                    type="button"
                    onClick={backToLatestBulletin}
                    className="mr-3 rounded-xl bg-amber-400 px-3 py-1 text-[11px] font-black text-slate-950 hover:bg-amber-300"
                  >
                    العودة لأحدث نشرة
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black md:text-2xl">
                    {isViewingArchive ? "نشرة من الأرشيف" : "نشرة اليوم"}
                  </h3>
                  <p className="mt-1 text-xs text-slate-300">
                    {currentBulletin.date}
                  </p>
                </div>

                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-100">
                  {isViewingArchive ? "أرشيف" : "مباشر"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {mainCard && <StudioCard card={mainCard} featured />}

              {otherCards.map((card, index) => (
                <StudioCard key={`${card.type}-${index}`} card={card} />
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-3 text-center text-[11px] font-bold leading-6 text-slate-300 md:text-xs">
              🎙️ تصريحات ومحتوى استوديو التحدي ترفيهية ومولدة بالذكاء
              الاصطناعي، وليست تصريحات حقيقية من الأعضاء.
            </div>

            {archive.length > 0 && (
              <div className="mt-8">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-xl font-black">📚 آخر النشرات</h3>

                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-300">
                    {archivePage + 1} / {archiveTotalPages}
                  </span>
                </div>

                <div className="space-y-3">
                  {visibleArchive.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => selectBulletin(item.id)}
                      className={`w-full rounded-2xl border p-4 text-right transition hover:bg-white/10 ${
                        item.id === currentBulletin.id
                          ? "border-amber-400/40 bg-amber-400/10"
                          : "border-white/10 bg-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-black">
                            {item.summary || "نشرة استوديو التحدي"}
                          </div>

                          <div className="mt-1 text-xs text-slate-400">
                            {item.date}
                          </div>
                        </div>

                        <span className="shrink-0 rounded-full bg-slate-800 px-3 py-1 text-[11px] text-slate-300">
                          {item.cards.length} بطاقات
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {archiveTotalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setArchivePage((page) => Math.max(0, page - 1))
                      }
                      disabled={archivePage === 0}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-black hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      السابق
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setArchivePage((page) =>
                          Math.min(archiveTotalPages - 1, page + 1)
                        )
                      }
                      disabled={archivePage >= archiveTotalPages - 1}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-black hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      التالي
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="mt-8">
              <ChallengeStudioAnalysis
                currentUserId={user?.id || ""}
                currentUserName={user?.fullName || "عضو"}
                onlineMembers={onlineMembers}
                onMemberClick={openMemberProfile}
              />
            </div>
          </>
        )}
      </section>

      {selectedUser && (
        <PredictionDetailsModal
          user={selectedUser}
          predictions={selectedPredictions}
          loading={loadingPredictions}
          onClose={closeMemberProfile}
        />
      )}

      <footer className="border-t border-white/10 py-5 text-center text-xs text-slate-400">
        <div className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
          <span>©</span>
          <span>برمجة وتصميم</span>
          <span className="font-bold text-slate-200">عبدالسلام العنزي</span>
        </div>
      </footer>
    </main>
  );
}