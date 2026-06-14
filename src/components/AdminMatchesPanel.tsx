"use client";

import { useMemo, useState } from "react";
import { Match } from "@/lib/matches";

type AdminMatchesPanelProps = {
  matches: Match[];
  loading: boolean;
};

const MATCHES_PER_PAGE = 12;

type MatchFilter = "all" | "scheduled" | "finished";

export default function AdminMatchesPanel({
  matches,
  loading,
}: AdminMatchesPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<MatchFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredMatches = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return matches.filter((match) => {
      const matchesSearch =
        !search ||
        match.homeTeamName.toLowerCase().includes(search) ||
        match.awayTeamName.toLowerCase().includes(search) ||
        match.matchDate.toLowerCase().includes(search) ||
        match.matchTime.toLowerCase().includes(search);

      const matchesFilter =
        filter === "all" ||
        (filter === "scheduled" && match.status !== "finished") ||
        (filter === "finished" && match.status === "finished");

      return matchesSearch && matchesFilter;
    });
  }, [matches, searchTerm, filter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMatches.length / MATCHES_PER_PAGE)
  );

  const visibleMatches = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * MATCHES_PER_PAGE;
    const endIndex = startIndex + MATCHES_PER_PAGE;

    return filteredMatches.slice(startIndex, endIndex);
  }, [filteredMatches, currentPage, totalPages]);

  function changeFilter(nextFilter: MatchFilter) {
    setFilter(nextFilter);
    setCurrentPage(1);
  }

  function handleSearch(value: string) {
    setSearchTerm(value);
    setCurrentPage(1);
  }

  function goPrevious() {
    setCurrentPage((page) => Math.max(1, page - 1));
  }

  function goNext() {
    setCurrentPage((page) => Math.min(totalPages, page + 1));
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-6">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black">المباريات المضافة</h2>
          <p className="mt-2 text-sm text-slate-300">
            عرض مرتب للمباريات مع البحث والفلترة والصفحات.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
          العدد:{" "}
          <span className="font-black text-amber-300">
            {filteredMatches.length}
          </span>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
        <div>
          <label className="mb-2 block text-sm font-bold">
            بحث في المباريات
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => handleSearch(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:border-amber-400"
            placeholder="ابحث باسم المنتخب أو التاريخ أو الوقت"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold">فلترة</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => changeFilter("all")}
              className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                filter === "all"
                  ? "bg-amber-400 text-slate-950"
                  : "border border-white/10 bg-slate-950/60 text-white hover:bg-white/10"
              }`}
            >
              الكل
            </button>

            <button
              type="button"
              onClick={() => changeFilter("scheduled")}
              className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                filter === "scheduled"
                  ? "bg-blue-400 text-slate-950"
                  : "border border-white/10 bg-slate-950/60 text-white hover:bg-white/10"
              }`}
            >
              القادمة
            </button>

            <button
              type="button"
              onClick={() => changeFilter("finished")}
              className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                filter === "finished"
                  ? "bg-emerald-400 text-slate-950"
                  : "border border-white/10 bg-slate-950/60 text-white hover:bg-white/10"
              }`}
            >
              المحتسبة
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-slate-300">
          جاري تحميل المباريات...
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-slate-300">
          لا توجد مباريات مطابقة للبحث أو الفلترة.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleMatches.map((match) => (
              <div
                key={match.id}
                className="rounded-2xl border border-white/10 bg-slate-950/70 p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-2 text-xs">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-slate-300">
                    {match.matchDay}
                  </span>

                  <span className="rounded-full bg-white/10 px-3 py-1 text-slate-300">
                    {match.matchDate} • {match.matchTime}
                  </span>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
                  <div className="min-w-0">
                    <div className="text-2xl">{match.homeTeamEmoji}</div>
                    <div className="truncate text-sm font-black">
                      {match.homeTeamName}
                    </div>
                  </div>

                  <div className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-[10px] font-black text-amber-300">
                    VS
                  </div>

                  <div className="min-w-0">
                    <div className="text-2xl">{match.awayTeamEmoji}</div>
                    <div className="truncate text-sm font-black">
                      {match.awayTeamName}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  {match.status === "finished" ? (
                    <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-emerald-300">
                      تم الاحتساب
                    </span>
                  ) : (
                    <span className="rounded-full bg-blue-400/10 px-3 py-1 text-blue-300">
                      قادمة
                    </span>
                  )}

                  {match.resultCalculated && (
                    <span className="rounded-full bg-amber-400/10 px-3 py-1 text-amber-300">
                      النتيجة: {match.actualHomeScore} -{" "}
                      {match.actualAwayScore}
                    </span>
                  )}

                  {!match.isActive && (
                    <span className="rounded-full bg-red-400/10 px-3 py-1 text-red-300">
                      غير مفعلة
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goPrevious}
              disabled={currentPage === 1}
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              السابق
            </button>

            <div className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2 text-xs text-slate-200">
              صفحة {Math.min(currentPage, totalPages)} من {totalPages}
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
    </section>
  );
}