"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AdminMember,
  getAdminMembers,
  resetAdminMemberStats,
  resetAdminMemberPassword,
  updateAdminMember,
} from "@/lib/adminMembers";
import { addAdminLog } from "@/lib/adminLogs";
import { getTeams, Team } from "@/lib/teams";

const MEMBERS_PER_PAGE = 10;

type MemberFormState = {
  fullName: string;
  phone: string;
  password: string;
  teamCode: string;

  points: string;
  total: string;
  correct: string;
  wrong: string;
  currentStreak: string;
  bestStreak: string;
};

function buildFormState(member: AdminMember, teams: Team[]): MemberFormState {
  const selectedTeam = teams.find((team) => team.nameAr === member.favoriteTeam);

  return {
    fullName: member.fullName || "",
    phone: member.phone || "",
    password: "",
    teamCode: selectedTeam?.code || "",

    points: String(member.points || 0),
    total: String(member.total || 0),
    correct: String(member.correct || 0),
    wrong: String(member.wrong || 0),
    currentStreak: String(member.currentStreak || 0),
    bestStreak: String(member.bestStreak || 0),
  };
}

function toNumber(value: string) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export default function AdminMembersPanel() {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [formState, setFormState] = useState<MemberFormState | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const filteredMembers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return members;

    return members.filter((member) => {
      return (
        member.fullName.toLowerCase().includes(search) ||
        member.phone.toLowerCase().includes(search) ||
        member.favoriteTeam.toLowerCase().includes(search)
      );
    });
  }, [members, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMembers.length / MEMBERS_PER_PAGE)
  );

  const visibleMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * MEMBERS_PER_PAGE;
    const endIndex = startIndex + MEMBERS_PER_PAGE;

    return filteredMembers.slice(startIndex, endIndex);
  }, [filteredMembers, currentPage]);

  const selectedMember = members.find((member) => member.id === selectedMemberId);

  async function loadData() {
    try {
      setLoading(true);

      const [membersData, teamsData] = await Promise.all([
        getAdminMembers(),
        getTeams(),
      ]);

      setMembers(membersData);
      setTeams(teamsData);

      if (selectedMemberId) {
        const updatedSelected = membersData.find(
          (member) => member.id === selectedMemberId
        );

        if (updatedSelected) {
          setFormState(buildFormState(updatedSelected, teamsData));
        }
      }
    } catch (err) {
      console.error("فشل تحميل الأعضاء:", err);
      setError("تعذر تحميل بيانات الأعضاء");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  function selectMember(member: AdminMember) {
    setSelectedMemberId(member.id);
    setFormState(buildFormState(member, teams));
    setMessage("");
    setError("");
  }

  function updateField(field: keyof MemberFormState, value: string) {
    setFormState((current) => {
      if (!current) return current;

      return {
        ...current,
        [field]: value,
      };
    });
  }

  async function handleSaveMember(event: FormEvent) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!selectedMember || !formState) {
      setError("اختر العضو أولًا");
      return;
    }

    const selectedTeam = teams.find((team) => team.code === formState.teamCode);

    if (!selectedTeam) {
      setError("اختر المنتخب المرشح");
      return;
    }

    setSaving(true);

    try {
      await updateAdminMember({
        userId: selectedMember.id,
        fullName: formState.fullName,
        phone: formState.phone,
        favoriteTeam: selectedTeam.nameAr,
        teamEmoji: selectedTeam.emoji,

        points: toNumber(formState.points),
        total: toNumber(formState.total),
        correct: toNumber(formState.correct),
        wrong: toNumber(formState.wrong),
        currentStreak: toNumber(formState.currentStreak),
        bestStreak: toNumber(formState.bestStreak),
      });

      if (formState.password.trim()) {
        await resetAdminMemberPassword(selectedMember.id, formState.password);
      }

      await addAdminLog({
        action: "update_member",
        title: "تعديل بيانات عضو",
        description: `تم تعديل بيانات العضو: ${selectedMember.fullName}. البيانات الجديدة: الاسم ${formState.fullName}، الجوال ${formState.phone}، المنتخب ${selectedTeam.nameAr}، النقاط ${formState.points}.`,
      });

      setMessage("تم تحديث بيانات العضو بنجاح ✅");
      await loadData();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "تعذر تحديث بيانات العضو";
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  async function handleResetStats() {
    setMessage("");
    setError("");

    if (!selectedMember) {
      setError("اختر العضو أولًا");
      return;
    }

    const confirmed = window.confirm(
      `هل أنت متأكد من تصفير نقاط العضو: ${selectedMember.fullName}؟\n\nسيتم تصفير النقاط والتوقعات الصحيحة والخاطئة والسلاسل.`
    );

    if (!confirmed) return;

    setResetting(true);

    try {
      await resetAdminMemberStats(selectedMember.id);

      await addAdminLog({
        action: "reset_member_stats",
        title: "تصفير نقاط عضو",
        description: `تم تصفير نقاط وإحصائيات العضو: ${selectedMember.fullName}.`,
      });

      setMessage("تم تصفير نقاط العضو بنجاح ✅");
      await loadData();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "تعذر تصفير نقاط العضو";
      setError(errorMessage);
    } finally {
      setResetting(false);
    }
  }

  function goPrevious() {
    setCurrentPage((page) => Math.max(1, page - 1));
  }

  function goNext() {
    setCurrentPage((page) => Math.min(totalPages, page + 1));
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-6">
      <div className="mb-5">
        <h2 className="text-2xl font-black">إدارة الأعضاء</h2>
        <p className="mt-2 text-sm text-slate-300">
          تعديل بيانات الأعضاء والنقاط والمنتخب المرشح.
        </p>
      </div>

      {(message || error) && (
        <div className="mb-5 space-y-2">
          {message && (
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">
              {message}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">
              {error}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <div className="mb-4">
            <label className="mb-2 block text-sm font-bold">بحث عن عضو</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:border-amber-400"
              placeholder="ابحث بالاسم أو الجوال أو المنتخب"
            />
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-center text-sm text-slate-300">
              جاري تحميل الأعضاء...
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-center text-sm text-slate-300">
              لا يوجد أعضاء مطابقين للبحث.
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {visibleMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => selectMember(member)}
                    className={`w-full rounded-2xl border p-3 text-right transition ${
                      selectedMemberId === member.id
                        ? "border-amber-400 bg-amber-400/10"
                        : "border-white/10 bg-slate-900/70 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-black">
                          #{member.currentRank} - {member.fullName}
                        </div>
                        <div className="mt-1 truncate text-xs text-slate-300">
                          {member.phone || "-"} • {member.teamEmoji}{" "}
                          {member.favoriteTeam || "-"}
                        </div>
                      </div>

                      <div className="shrink-0 rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-slate-950">
                        {member.points} نقطة
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={goPrevious}
                  disabled={currentPage === 1}
                  className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  السابق
                </button>

                <div className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2 text-xs text-slate-200">
                  صفحة {currentPage} من {totalPages}
                </div>

                <button
                  type="button"
                  onClick={goNext}
                  disabled={currentPage === totalPages}
                  className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  التالي
                </button>
              </div>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          {!selectedMember || !formState ? (
            <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-white/10 bg-slate-900/70 p-6 text-center text-sm text-slate-300">
              اختر عضوًا من القائمة لعرض بياناته وتعديلها.
            </div>
          ) : (
            <form onSubmit={handleSaveMember} className="space-y-4">
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
                <div className="text-sm text-amber-100">العضو المحدد</div>
                <div className="mt-1 text-xl font-black text-amber-300">
                  {selectedMember.fullName}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold">الاسم</label>
                  <input
                    type="text"
                    value={formState.fullName}
                    maxLength={20}
                    onChange={(event) =>
                      updateField("fullName", event.target.value)
                    }
                    className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    رقم الجوال
                  </label>
                  <input
                    type="tel"
                    value={formState.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    كلمة مرور جديدة <span className="text-xs font-normal text-slate-400">(اختياري)</span>
                  </label>
                  <input
                    type="password"
                    value={formState.password}
                    autoComplete="new-password"
                    placeholder="اتركها فارغة بدون تغيير"
                    onChange={(event) =>
                      updateField("password", event.target.value)
                    }
                    className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    المنتخب المرشح
                  </label>
                  <select
                    value={formState.teamCode}
                    onChange={(event) =>
                      updateField("teamCode", event.target.value)
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-400"
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
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <h3 className="mb-3 font-black">تعديل إحصائيات العضو</h3>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-xs font-bold">
                      النقاط
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formState.points}
                      onChange={(event) =>
                        updateField("points", event.target.value)
                      }
                      className="w-full rounded-xl border border-white/10 bg-white px-3 py-2 text-center font-black text-slate-950 outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold">
                      التوقعات
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formState.total}
                      onChange={(event) =>
                        updateField("total", event.target.value)
                      }
                      className="w-full rounded-xl border border-white/10 bg-white px-3 py-2 text-center font-black text-slate-950 outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold">الصح</label>
                    <input
                      type="number"
                      min={0}
                      value={formState.correct}
                      onChange={(event) =>
                        updateField("correct", event.target.value)
                      }
                      className="w-full rounded-xl border border-white/10 bg-white px-3 py-2 text-center font-black text-slate-950 outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold">
                      الخطأ
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formState.wrong}
                      onChange={(event) =>
                        updateField("wrong", event.target.value)
                      }
                      className="w-full rounded-xl border border-white/10 bg-white px-3 py-2 text-center font-black text-slate-950 outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold">
                      السلسلة الحالية
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formState.currentStreak}
                      onChange={(event) =>
                        updateField("currentStreak", event.target.value)
                      }
                      className="w-full rounded-xl border border-white/10 bg-white px-3 py-2 text-center font-black text-slate-950 outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold">
                      أفضل سلسلة
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formState.bestStreak}
                      onChange={(event) =>
                        updateField("bestStreak", event.target.value)
                      }
                      className="w-full rounded-xl border border-white/10 bg-white px-3 py-2 text-center font-black text-slate-950 outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <button
                  type="submit"
                  disabled={saving || resetting}
                  className="rounded-xl bg-amber-400 px-4 py-3 font-black text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "جاري الحفظ..." : "حفظ تعديل العضو"}
                </button>

                <button
                  type="button"
                  onClick={handleResetStats}
                  disabled={saving || resetting}
                  className="rounded-xl border border-red-400/40 bg-red-500/15 px-4 py-3 font-black text-red-200 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resetting ? "جاري التصفير..." : "تصفير نقاط العضو"}
                </button>
              </div>

              <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-xs leading-6 text-red-100">
                تنبيه: تعديل النقاط يدويًا قد يختلف عن نتائج المباريات المحتسبة.
                استخدمه فقط للتصحيح الإداري.
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}