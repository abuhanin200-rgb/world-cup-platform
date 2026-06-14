"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  AccountPrediction,
  getAccountPredictions,
} from "@/lib/accountPredictions";
import { getTeams, Team } from "@/lib/teams";
import { updateUserProfile } from "@/lib/users";

const PREDICTIONS_PER_PAGE = 10;

type AccountTab = "predictions" | "info";

function StatCard({
  label,
  value,
  colorClass = "text-white",
}: {
  label: string;
  value: string | number;
  colorClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-center">
      <div className={`text-2xl font-black ${colorClass}`}>{value}</div>
      <div className="mt-2 text-xs text-slate-300 md:text-sm">{label}</div>
    </div>
  );
}

function ResultBadge({ prediction }: { prediction: AccountPrediction }) {
  if (!prediction.isCalculated) {
    return (
      <span className="rounded-full bg-slate-400/15 px-3 py-1 text-[11px] font-black text-slate-300">
        بانتظار النتيجة
      </span>
    );
  }

  if (prediction.resultType === "exact") {
    return (
      <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-black text-emerald-300">
        جابها بالملي +3
      </span>
    );
  }

  if (prediction.resultType === "winner") {
    return (
      <span className="rounded-full bg-amber-400/15 px-3 py-1 text-[11px] font-black text-amber-300">
        توقع صحيح +1
      </span>
    );
  }

  return (
    <span className="rounded-full bg-red-400/15 px-3 py-1 text-[11px] font-black text-red-300">
      خطأ +0
    </span>
  );
}

function PredictionCard({ prediction }: { prediction: AccountPrediction }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <ResultBadge prediction={prediction} />

        <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-slate-950">
          {prediction.points} نقطة
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
        <div className="min-w-0">
          <div className="text-3xl">{prediction.homeTeamEmoji || "🏳️"}</div>
          <div className="mt-1 truncate text-xs font-black md:text-sm">
            {prediction.homeTeamName}
          </div>
        </div>

        <div>
          <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-black text-amber-300">
            توقعك
          </div>
          <div className="mt-2 text-lg font-black text-white">
            {prediction.homeScore} - {prediction.awayScore}
          </div>
        </div>

        <div className="min-w-0">
          <div className="text-3xl">{prediction.awayTeamEmoji || "🏳️"}</div>
          <div className="mt-1 truncate text-xs font-black md:text-sm">
            {prediction.awayTeamName}
          </div>
        </div>
      </div>

      {prediction.isCalculated && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/10 p-3 text-center text-sm text-slate-200">
          النتيجة الفعلية:{" "}
          <span className="font-black text-emerald-300">
            {prediction.actualHomeScore} - {prediction.actualAwayScore}
          </span>
        </div>
      )}
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, isLoggedIn, logout, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<AccountTab>("predictions");

  const [predictions, setPredictions] = useState<AccountPrediction[]>([]);
  const [predictionsLoading, setPredictionsLoading] = useState(true);
  const [currentPredictionsPage, setCurrentPredictionsPage] = useState(1);

  const [teams, setTeams] = useState<Team[]>([]);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editTeamCode, setEditTeamCode] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  const totalPredictionPages = Math.max(
    1,
    Math.ceil(predictions.length / PREDICTIONS_PER_PAGE)
  );

  const visiblePredictions = useMemo(() => {
    const startIndex = (currentPredictionsPage - 1) * PREDICTIONS_PER_PAGE;
    const endIndex = startIndex + PREDICTIONS_PER_PAGE;

    return predictions.slice(startIndex, endIndex);
  }, [predictions, currentPredictionsPage]);

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login");
    }
  }, [loading, isLoggedIn, router]);

  useEffect(() => {
    async function loadTeams() {
      try {
        const data = await getTeams();
        setTeams(data);
      } catch (error) {
        console.error("فشل تحميل المنتخبات:", error);
      }
    }

    loadTeams();
  }, []);

  useEffect(() => {
    if (!user) return;

    setEditFullName(user.fullName || "");
    setEditPhone(user.phone || "");

    const selectedTeam = teams.find(
      (team) => team.nameAr === user.favoriteTeam
    );

    setEditTeamCode(selectedTeam?.code || "");
  }, [user?.id, teams]);

  useEffect(() => {
    async function loadAccountData() {
      if (!isLoggedIn || !user) return;

      try {
        setPredictionsLoading(true);
        await refreshUser();

        const data = await getAccountPredictions(user.id);
        setPredictions(data);

        const newTotalPages = Math.max(
          1,
          Math.ceil(data.length / PREDICTIONS_PER_PAGE)
        );

        setCurrentPredictionsPage((page) => Math.min(page, newTotalPages));
      } catch (error) {
        console.error("فشل تحميل توقعات الحساب:", error);
      } finally {
        setPredictionsLoading(false);
      }
    }

    loadAccountData();
  }, [isLoggedIn, user?.id]);

  function goToPreviousPredictionsPage() {
    setCurrentPredictionsPage((page) => Math.max(1, page - 1));
  }

  function goToNextPredictionsPage() {
    setCurrentPredictionsPage((page) =>
      Math.min(totalPredictionPages, page + 1)
    );
  }

  async function handleUpdateProfile(event: FormEvent) {
    event.preventDefault();

    if (!user) return;

    setProfileMessage("");
    setProfileError("");

    const selectedTeam = teams.find((team) => team.code === editTeamCode);

    if (!selectedTeam) {
      setProfileError("اختر المنتخب المرشح");
      return;
    }

    setSavingProfile(true);

    try {
      await updateUserProfile({
        userId: user.id,
        fullName: editFullName,
        phone: editPhone,
        favoriteTeam: selectedTeam.nameAr,
        teamEmoji: selectedTeam.emoji,
      });

      await refreshUser();

      setProfileMessage("تم تحديث معلومات حسابك بنجاح ✅");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "تعذر تحديث معلومات الحساب";
      setProfileError(errorMessage);
    } finally {
      setSavingProfile(false);
    }
  }

  if (loading || !user) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4 text-white"
      >
        <div className="rounded-3xl border border-white/10 bg-white/10 p-6 text-center shadow-2xl">
          جاري تحميل حسابك...
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4 text-white"
    >
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15"
          >
            العودة للرئيسية
          </button>

          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="rounded-xl bg-red-500 px-4 py-2 text-sm font-black text-white hover:bg-red-400"
          >
            خروج
          </button>
        </header>

        <section className="rounded-3xl border border-white/10 bg-white/10 p-5 text-center shadow-2xl md:p-8">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10 text-4xl">
            {user.teamEmoji || "🏆"}
          </div>

          <h1 className="text-3xl font-black md:text-4xl">{user.fullName}</h1>

          <p className="mt-2 text-sm text-slate-300 md:text-base">
            المنتخب المرشح:{" "}
            <span className="font-black text-amber-300">
              {user.favoriteTeam || "غير محدد"}
            </span>
          </p>

          <div className="mt-5 inline-flex rounded-full border border-white/10 bg-slate-950/60 px-5 py-2 text-sm text-slate-200">
            ترتيبك الحالي:{" "}
            <span className="mx-1 font-black text-amber-300">
              #{user.currentRank || "-"}
            </span>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="النقاط"
            value={user.points || 0}
            colorClass="text-amber-300"
          />

          <StatCard label="عدد التوقعات" value={user.total || 0} />

          <StatCard
            label="الصحيح"
            value={user.correct || 0}
            colorClass="text-emerald-300"
          />

          <StatCard
            label="الخطأ"
            value={user.wrong || 0}
            colorClass="text-red-300"
          />
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3">
          <StatCard
            label="السلسلة الحالية"
            value={user.currentStreak || 0}
            colorClass="text-sky-300"
          />

          <StatCard
            label="أفضل سلسلة صحيحة"
            value={user.bestStreak || 0}
            colorClass="text-orange-300"
          />
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/10 p-3 shadow-2xl md:p-5">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-950/60 p-2">
            <button
              type="button"
              onClick={() => setActiveTab("predictions")}
              className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                activeTab === "predictions"
                  ? "bg-amber-400 text-slate-950"
                  : "text-slate-300 hover:bg-white/10"
              }`}
            >
              توقعاتي
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("info")}
              className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                activeTab === "info"
                  ? "bg-amber-400 text-slate-950"
                  : "text-slate-300 hover:bg-white/10"
              }`}
            >
              معلومات حسابي
            </button>
          </div>

          {activeTab === "predictions" && (
            <div className="mt-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-black">توقعاتي</h2>

                <span className="rounded-full bg-slate-950/60 px-3 py-1 text-[11px] text-slate-300">
                  {predictions.length} توقع
                </span>
              </div>

              {predictionsLoading ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-sm text-slate-300">
                  جاري تحميل توقعاتك...
                </div>
              ) : predictions.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-sm text-slate-300">
                  ما عندك توقعات حتى الآن.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {visiblePredictions.map((prediction) => (
                      <PredictionCard
                        key={prediction.id}
                        prediction={prediction}
                      />
                    ))}
                  </div>

                  {predictions.length > PREDICTIONS_PER_PAGE && (
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={goToPreviousPredictionsPage}
                        disabled={currentPredictionsPage === 1}
                        className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40 md:text-sm"
                      >
                        السابق
                      </button>

                      <div className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2 text-xs font-bold text-slate-200 md:text-sm">
                        صفحة {currentPredictionsPage} من {totalPredictionPages}
                      </div>

                      <button
                        type="button"
                        onClick={goToNextPredictionsPage}
                        disabled={currentPredictionsPage === totalPredictionPages}
                        className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40 md:text-sm"
                      >
                        التالي
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === "info" && (
            <div className="mt-5">
              <h2 className="mb-4 text-xl font-black">تعديل معلومات حسابي</h2>

              {(profileMessage || profileError) && (
                <div className="mb-4 space-y-2">
                  {profileMessage && (
                    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-center text-xs text-emerald-100 md:text-sm">
                      {profileMessage}
                    </div>
                  )}

                  {profileError && (
                    <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-center text-xs text-red-100 md:text-sm">
                      {profileError}
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-bold">الاسم</label>
                  <input
                    type="text"
                    value={editFullName}
                    maxLength={20}
                    onChange={(event) => setEditFullName(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:border-amber-400"
                    required
                  />
                  <div className="mt-1 text-[11px] text-slate-400">
                    الحد الأقصى 20 حرف
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    رقم الجوال
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(event) => setEditPhone(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    المنتخب المرشح
                  </label>
                  <select
                    value={editTeamCode}
                    onChange={(event) => setEditTeamCode(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-amber-400"
                    required
                  >
                    <option value="">اختر المنتخب</option>
                    {teams.map((team) => (
                      <option key={team.code} value={team.code}>
                        {team.emoji} {team.nameAr}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingProfile ? "جاري حفظ التعديل..." : "حفظ التعديل"}
                </button>
              </form>

              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-xs leading-6 text-slate-300">
                تعديل البيانات لا يؤثر على نقاطك أو توقعاتك السابقة.
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}