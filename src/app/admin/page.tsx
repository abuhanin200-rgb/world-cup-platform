"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, updateDoc, getDocs, writeBatch } from "firebase/firestore";
import { Match, MatchStatus } from "@/types";
import * as XLSX from "xlsx";

export default function AdminPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);

  // حقول إضافة مباراة جديدة يدوياً
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [flagA, setFlagA] = useState("🏳️");
  const [flagB, setFlagB] = useState("🏳️");
  const [matchDate, setMatchDate] = useState("");
  const [matchTime, setMatchTime] = useState("");
  const [group, setGroup] = useState("المجموعة الأولى");
  const [stadium, setStadium] = useState("ملعب البطولة 2026");

  // 📝 مصفوفة جدول مباريات كأس العالم 2026 المستخرجة بالكامل من مستند التصميم المعتمد
  const worldCup2026Matches = [
    // الجولة الأولى
    { teamA: "المكسيك", flagA: "🇲🇽", teamB: "جنوب أفريقيا", flagB: "🇿🇦", date: "2026-06-11", time: "22:00", group: "المجموعة الأولى" },
    { teamA: "سويسرا", flagA: "🇨🇭", teamB: "البوسنة والهرسك", flagB: "🇧🇦", date: "2026-06-12", time: "22:00", group: "المجموعة الثانية" },
    { teamA: "أمريكا", flagA: "🇺🇸", teamB: "باراغواي", flagB: "🇵🇾", date: "2026-06-13", time: "04:00", group: "المجموعة الرابعة" },
    { teamA: "قطر", flagA: "🇶🇦", teamB: "سويسرا", flagB: "🇨🇭", date: "2026-06-13", time: "22:00", group: "المجموعة الثانية" },
    { teamA: "اسكتلندا", flagA: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", teamB: "المغرب", flagB: "🇲🇦", date: "2026-06-14", time: "01:00", group: "المجموعة الثالثة" },
    { teamA: "البرازيل", flagA: "🇧🇷", teamB: "هايتي", flagB: "🇭🇹", date: "2026-06-14", time: "03:30", group: "المجموعة الثالثة" },
    { teamA: "تركيا", flagA: "🇹🇷", teamB: "باراغواي", flagB: "🇵🇾", date: "2026-06-14", time: "06:00", group: "المجموعة الرابعة" },
    { teamA: "هولندا", flagA: "🇳🇱", teamB: "السويد", flagB: "🇸🇪", date: "2026-06-14", time: "20:00", group: "المجموعة الخامسة" },
    { teamA: "ألمانيا", flagA: "🇩🇪", teamB: "ساحل العاج", flagB: "🇨🇮", date: "2026-06-14", time: "20:00", group: "المجموعة السادسة" },
    { teamA: "الإكوادور", flagA: "🇪🇨", teamB: "كوراساو", flagB: "🇨🇼", date: "2026-06-15", time: "03:00", group: "المجموعة السادسة" },
    { teamA: "أستراليا", flagA: "🇦🇺", teamB: "باراغواي", flagB: "🇵🇾", date: "2026-06-15", time: "05:00", group: "المجموعة الرابعة" },
    { teamA: "إسبانيا", flagA: "🇪🇸", teamB: "السعودية", flagB: "🇸🇦", date: "2026-06-15", time: "19:00", group: "المجموعة السابعة" },
    { teamA: "السنغال", flagA: "🇸🇳", teamB: "العراق", flagB: "🇮🇶", date: "2026-06-15", time: "22:00", group: "المجموعة الثامنة" },
    { teamA: "النرويج", flagA: "🇳🇴", teamB: "فرنسا", flagB: "🇫🇷", date: "2026-06-15", time: "22:00", group: "المجموعة الثامنة" },
    { teamA: "بلجيكا", flagA: "🇧🇪", teamB: "مصر", flagB: "🇪🇬", date: "2026-06-16", time: "22:00", group: "المجموعة التاسعة" },
    { teamA: "إيران", flagA: "🇮🇷", teamB: "نيوزيلندا", flagB: "🇳🇿", date: "2026-06-16", time: "04:00", group: "المجموعة التاسعة" },
    { teamA: "أوروغواي", flagA: "🇺🇾", teamB: "الرأس الأخضر", flagB: "🇨🇻", date: "2026-06-17", time: "01:00", group: "المجموعة السابعة" },
    { teamA: "الأرجنتين", flagA: "🇦🇷", teamB: "الجزائر", flagB: "🇩🇿", date: "2026-06-17", time: "20:00", group: "المجموعة العاشرة" },
    { teamA: "الأردن", flagA: "🇯🇴", teamB: "إنجلترا", flagB: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", date: "2026-06-17", time: "06:00", group: "المجموعة الحادية عشر" },
    { teamA: "غانا", flagA: "🇬🇭", teamB: "كرواتيا", flagB: "🇭🇷", date: "2026-06-17", time: "00:00", group: "المجموعة الحادية عشر" },
    { teamA: "كولومبيا", flagA: "🇨🇴", teamB: "البرتغال", flagB: "🇵🇹", date: "2026-06-17", time: "02:30", group: "المجموعة الثانية عشر" },
    { teamA: "البرتغال", flagA: "🇵🇹", teamB: "الكونغو الديمقراطية", flagB: "🇨🇩", date: "2026-06-18", time: "20:00", group: "المجموعة الثانية عشر" },
    { teamA: "إنجلترا", flagA: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", teamB: "كرواتيا", flagB: "🇭🇷", date: "2026-06-18", time: "23:00", group: "المجموعة الحادية عشر" },
    { teamA: "النمسا", flagA: "🇦🇹", teamB: "أوزبكستان", flagB: "🇺🇿", date: "2026-06-18", time: "02:00", group: "المجموعة العاشرة" },

    // الجولة الثانية
    { teamA: "التشيك", flagA: "🇨🇿", teamB: "جنوب أفريقيا", flagB: "🇿🇦", date: "2026-06-18", time: "19:00", group: "المجموعة الأولى" },
    { teamA: "قطر", flagA: "🇶🇦", teamB: "البوسنة والهرسك", flagB: "🇧🇦", date: "2026-06-18", time: "22:00", group: "المجموعة الثانية" },
    { teamA: "قطر", flagA: "🇶🇦", teamB: "كندا", flagB: "🇨🇦", date: "2026-06-19", time: "01:00", group: "المجموعة الثانية" },
    { teamA: "كوريا الجنوبية", flagA: "🇰🇷", teamB: "المكسيك", flagB: "🇲🇽", date: "2026-06-19", time: "04:00", group: "المجموعة الأولى" },
    { teamA: "أمريكا", flagA: "🇺🇸", teamB: "أستراليا", flagB: "🇦🇺", date: "2026-06-19", time: "22:00", group: "المجموعة الرابعة" },
    { teamA: "البرازيل", flagA: "🇧🇷", teamB: "المغرب", flagB: "🇲🇦", date: "2026-06-20", time: "23:00", group: "المجموعة الثالثة" },
    { teamA: "هايتي", flagA: "🇭🇹", teamB: "اسكتلندا", flagB: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", date: "2026-06-20", time: "04:00", group: "المجموعة الثالثة" },
    { teamA: "كوراساو", flagA: "🇨🇼", teamB: "ساحل العاج", flagB: "🇨🇮", date: "2026-06-20", time: "23:00", group: "المجموعة السادسة" },
    { teamA: "الإكوادور", flagA: "🇪🇨", teamB: "ألمانيا", flagB: "🇩🇪", date: "2026-06-20", time: "20:00", group: "المجموعة السادسة" },
    { teamA: "أمريكا", flagA: "🇺🇸", teamB: "تركيا", flagB: "🇹🇷", date: "2026-06-21", time: "05:00", group: "المجموعة الرابعة" },
    { teamA: "إسبانيا", flagA: "🇪🇸", teamB: "أوروغواي", flagB: "🇺🇾", date: "2026-06-21", time: "03:00", group: "المجموعة السابعة" },
    { teamA: "السعودية", flagA: "🇸🇦", teamB: "أوروغواي", flagB: "🇺🇾", date: "2026-06-22", time: "03:00", group: "المجموعة السابعة" },
    { teamA: "فرنسا", flagA: "🇫🇷", teamB: "السنغال", flagB: "🇸🇳", date: "2026-06-22", time: "22:00", group: "المجموعة الثامنة" },
    { teamA: "العراق", flagA: "🇮🇶", teamB: "النرويج", flagB: "🇳🇴", date: "2026-06-22", time: "22:00", group: "المجموعة الثامنة" },
    { teamA: "مصر", flagA: "🇪🇬", teamB: "نيوزيلندا", flagB: "🇳🇿", date: "2026-06-23", time: "04:00", group: "المجموعة التاسعة" },
    { teamA: "إيران", flagA: "🇮🇷", teamB: "بلجيكا", flagB: "🇧🇪", date: "2026-06-23", time: "06:00", group: "المجموعة التاسعة" },
    { teamA: "الجزائر", flagA: "🇩🇿", teamB: "إنجلترا", flagB: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", date: "2026-06-23", time: "00:00", group: "المجموعة العاشرة" },
    { teamA: "غانا", flagA: "🇬🇭", teamB: "النمسا", flagB: "🇦🇹", date: "2026-06-23", time: "23:00", group: "المجموعة الحادية عشر" },

    // الجولة الثالثة
    { teamA: "كندا", flagA: "🇨🇦", teamB: "سويسرا", flagB: "🇨🇭", date: "2026-06-24", time: "22:00", group: "المجموعة الثانية" },
    { teamA: "كوريا الجنوبية", flagA: "🇰🇷", teamB: "التشيك", flagB: "🇨🇿", date: "2026-06-24", time: "05:00", group: "المجموعة الأولى" },
    { teamA: "البرتغال", flagA: "🇵🇹", teamB: "أوزبكستان", flagB: "🇺🇿", date: "2026-06-24", time: "20:00", group: "المجموعة الثانية عشر" },
    { teamA: "أوزبكستان", flagA: "🇺🇿", teamB: "الكونغو الديمقراطية", flagB: "🇨🇩", date: "2026-06-24", time: "02:30", group: "المجموعة العاشرة" },
    { teamA: "المغرب", flagA: "🇲🇦", teamB: "هايتي", flagB: "🇭🇹", date: "2026-06-25", time: "01:00", group: "المجموعة الثالثة" },
    { teamA: "اسكتلندا", flagA: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", teamB: "البرازيل", flagB: "🇧🇷", date: "2026-06-25", time: "01:00", group: "المجموعة الثالثة" },
    { teamA: "جنوب أفريقيا", flagA: "🇿🇦", teamB: "كوريا الجنوبية", flagB: "🇰🇷", date: "2026-06-25", time: "00:00", group: "المجموعة الأولى" },
    { teamA: "المكسيك", flagA: "🇲🇽", teamB: "التشيك", flagB: "🇨🇿", date: "2026-06-25", time: "04:00", group: "المجموعة الأولى" },
    { teamA: "تونس", flagA: "🇹🇳", teamB: "هولندا", flagB: "🇳🇱", date: "2026-06-26", time: "02:00", group: "المجموعة الخامسة" },
    { teamA: "اليابان", flagA: "🇯🇵", teamB: "السويد", flagB: "🇸🇪", date: "2026-06-26", time: "02:00", group: "المجموعة الخامسة" },
    { teamA: "الإكوادور", flagA: "🇪🇨", teamB: "ساحل العاج", flagB: "🇨🇮", date: "2026-06-26", time: "02:00", group: "المجموعة السادسة" },
    { teamA: "السعودية", flagA: "🇸🇦", teamB: "الرأس الأخضر", flagB: "🇨🇻", date: "2026-06-27", time: "03:00", group: "المجموعة السابعة" },
    { teamA: "فرنسا", flagA: "🇫🇷", teamB: "العراق", flagB: "🇮🇶", date: "2026-06-27", time: "22:00", group: "المجموعة الثامنة" },
    { teamA: "تونس", flagA: "🇹🇳", teamB: "السويد", flagB: "🇸🇪", date: "2026-06-27", time: "05:00", group: "المجموعة الخامسة" },
    { teamA: "النرويج", flagA: "🇳🇴", teamB: "السنغال", flagB: "🇸🇳", date: "2026-06-28", time: "03:00", group: "المجموعة الثامنة" },
    { teamA: "الأرجنتين", flagA: "🇦🇷", teamB: "الأردن", flagB: "🇯🇴", date: "2026-06-28", time: "05:00", group: "المجموعة الحادية عشر" },
    { teamA: "غانا", flagA: "🇬🇭", teamB: "بنما", flagB: "🇵🇦", date: "2026-06-28", time: "05:00", group: "المجموعة الحادية عشر" },
    { teamA: "كرواتيا", flagA: "🇭🇷", teamB: "بنما", flagB: "🇵🇦", date: "2026-06-28", time: "02:00", group: "المجموعة الحادية عشر" },
    { teamA: "الكونغو الديمقراطية", flagA: "🇨🇩", teamB: "كولومبيا", flagB: "🇨🇴", date: "2026-06-28", time: "05:00", group: "المجموعة الثانية عشر" }
  ];

  const fetchMatches = async () => {
    const querySnapshot = await getDocs(collection(db, "Matches"));
    const list: Match[] = [];
    querySnapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as Match));
    setMatches(list);
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  // 🚀 دالة الرفع التلقائي لجدول المستند بضغطة واحدة
  const handleAutoSeedMatches = async () => {
    if (!confirm("هل أنت متأكد من رفع جدول مباريات كأس العالم 2026 بالكامل تلقائياً؟")) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      worldCup2026Matches.forEach((m, idx) => {
        const matchId = `wc_2026_${idx + 1}`;
        const matchRef = doc(db, "Matches", matchId);
        batch.set(matchRef, {
          id: matchId,
          teamA: m.teamA,
          flagA: m.flagA,
          teamB: m.teamB,
          flagB: m.flagB,
          date: m.date,
          time: m.time,
          group: m.group,
          round: "المجموعات",
          stadium: "ملعب البطولة الرسمي",
          timestamp: new Date(`${m.date} ${m.time}`).getTime(),
          status: "open"
        });
      });
      await batch.commit();
      alert("✅ تم رفع وحفظ جدول البطولة بالكامل بنجاح مجدولاً حسب الأيام والتوقيت لمكة المكرمة!");
      fetchMatches();
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء الرفع");
    } finally {
      setLoading(false);
    }
  };

  // رفع عبر ملف إكسل مخصص
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[];
      setLoading(true);
      const batch = writeBatch(db);
      data.forEach((row, idx) => {
        const matchId = `match_excel_${Date.now()}_${idx}`;
        const matchRef = doc(db, "Matches", matchId);
        batch.set(matchRef, {
          id: matchId, teamA: row.TeamA, teamB: row.TeamB, flagA: row.FlagA || "🏳️", flagB: row.FlagB || "🏳️",
          date: row.Date, time: row.Time, group: row.Group || "الدور الأول", round: row.Round || "المجموعات",
          stadium: row.Stadium || "ملعب البطولة", timestamp: new Date(`${row.Date} ${row.Time}`).getTime(), status: "open"
        });
      });
      await batch.commit();
      setLoading(false);
      fetchMatches();
    };
    reader.readAsBinaryString(file);
  };

  const updateMatchStatus = async (matchId: string, status: MatchStatus, scoreA?: number, scoreB?: number) => {
    const matchRef = doc(db, "Matches", matchId);
    const updateData: any = { status };
    if (scoreA !== undefined) updateData.scoreA = scoreA;
    if (scoreB !== undefined) updateData.scoreB = scoreB;
    await updateDoc(matchRef, updateData);
    fetchMatches();
  };

  return (
    <div className="flex flex-col gap-8 p-4">
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800">
        <h1 className="text-2xl font-black text-brand-gold mb-2">🎛️ غرفة التحكم وإدارة بطولة 2026</h1>
        <p className="text-xs text-slate-400 font-bold">صلاحيات الإشراف: رفع الجداول المعتمدة، وإطلاق البث ورصد النتائج.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="flex flex-col gap-6 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800">
          
          {/* 🔥 زر الرفع التلقائي السحري المضاف */}
          <div>
            <h3 className="font-black text-sm mb-2 text-slate-900 dark:text-white">⚡ جدول مستند عبد الناصر واصل</h3>
            <button 
              onClick={handleAutoSeedMatches} 
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-brand-purple to-brand-pink text-white font-black rounded-xl hover:opacity-95 transition-all text-xs shadow-md"
            >
              {loading ? "جاري الحفظ والجدولة..." : "🚀 رفع وإدخال جدول البطولة الكامل تلقائياً"}
            </button>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          <div>
            <h3 className="font-black text-sm mb-3 text-slate-900 dark:text-white">📊 طريقة بديلة: رفع ملف (Excel)</h3>
            <input type="file" accept=".xlsx, .xls" onChange={handleExcelUpload} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-slate-800 file:text-white cursor-pointer" />
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 flex flex-col gap-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">📋 المباريات الحالية بالمنصة ({matches.length})</h2>
          <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
            {matches.map((m) => (
              <div key={m.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
                <div className="font-bold text-center sm:text-right">
                  <div className="text-slate-900 dark:text-white font-black text-sm">{m.flagA} {m.teamA} × {m.flagB} {m.teamB}</div>
                  <div className="text-slate-400 text-[10px] mt-0.5">{m.group} | {m.date} الساعة {m.time}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => updateMatchStatus(m.id, "live")} className="bg-red-600 text-white px-2.5 py-1.5 rounded-lg font-bold">🔴 مباشر</button>
                  <button onClick={() => updateMatchStatus(m.id, "closed")} className="bg-slate-700 text-white px-2.5 py-1.5 rounded-lg font-bold">🔒 غلق</button>
                  <button 
                    onClick={() => {
                      const sA = prompt("أهداف منتخب أ:", m.scoreA?.toString() || "0");
                      const sB = prompt("أهداف منتخب ب:", m.scoreB?.toString() || "0");
                      if (sA !== null && sB !== null) updateMatchStatus(m.id, "finished", Number(sA), Number(sB));
                    }} 
                    className="bg-green-600 text-white px-2.5 py-1.5 rounded-lg font-bold"
                  >
                    ✅ إنهاء
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}