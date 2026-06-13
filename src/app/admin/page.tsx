"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, orderBy, getDocs, doc, updateDoc, deleteDoc, where, addDoc } from "firebase/firestore";

const SETTLEMENT_MATCHES_LIST = [
  { id: "wc_01", title: "🇲🇽 المكسيك ضد جنوب أفريقيا 🇿🇦 (مجموعة أ)" },
  { id: "wc_02", title: "🇨🇦 كندا ضد البوسنة والهرسك 🇧🇦 (مجموعة ب)" },
  { id: "wc_03", title: "🇺🇸 الولايات المتحدة ضد باراغواي 🇵🇾 (مجموعة د)" },
  { id: "wc_04", title: "🇶🇦 قطر ضد سويسرا 🇨🇭 (مجموعة ب)" },
  { id: "wc_05", title: "🇧🇷 البرازيل ضد المغرب 🇲🇦 (مجموعة ج)" },
  { id: "wc_06", title: "🇲🇹 هايتي ضد اسكتلندا 🏴󠁧󠁢󠁳󠁣󠁴󠁿 (مجموعة ج)" },
  { id: "wc_07", title: "🇦🇺 أستراليا ضد تركيا 🇹🇷 (مجموعة د)" },
  { id: "wc_08", title: "🇩🇪 ألمانيا ضد كوراساو 🇨🇼 (مجموعة هـ)" },
  { id: "wc_09", title: "🇳🇱 هولندا ضد اليابان 🇯🇵 (مجموعة و)" },
  { id: "wc_10", title: "🇨🇮 ساحل العاج ضد الإكوادور 🇪🇨 (مجموعة هـ)" },
  { id: "wc_11", title: "🇸🇪 السويد ضد تونس 🇹🇳 (مجموعة و)" },
  { id: "wc_12", title: "🇪🇸 إسبانيا ضد الرأس الأخضر 🇨🇻 (مجموعة ح)" },
  { id: "wc_13", title: "🇧🇪 بلجيكا ضد مصر 🇪🇬 (مجموعة ر)" },
  { id: "wc_14", title: "🇸🇦 السعودية ضد أوروغواي 🇺🇾 (مجموعة ح)" },
  { id: "wc_15", title: "🇮🇷 إيران ضد نيوزيلندا 🇳🇿 (مجموعة ر)" },
  { id: "wc_49", title: "🇰🇷 كوريا الجنوبية ضد التشيك 🇨🇿 (مجموعة أ - مباراة مستحدثة)" }
];

const WORLD_CUP_2026_TEAMS = [
  { code: "MX", name: "المكسيك", emoji: "🇲🇽" }, { code: "ZA", name: "جنوب أفريقيا", emoji: "🇿🇦" },
  { code: "SA", name: "السعودية", emoji: "🇸🇦" }, { code: "MA", name: "المغرب", emoji: "🇲🇦" },
  { code: "KR", name: "كوريا الجنوبية", emoji: "🇰🇷" }, { code: "CZ", name: "التشيك", emoji: "🇨🇿" }
];

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [sortedPointsUsers, setSortedPointsUsers] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [tickerSpeed, setTickerSpeed] = useState("30s");
  const [tickerId, setTickerSpeedId] = useState("");
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);

  const [editingUserId, setEditingUserId] = useState("");
  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editTeam, setEditTeam] = useState("");

  const [scoreEditUserId, setScoreEditUserId] = useState("");
  const [editPoints, setEditPoints] = useState(0);
  const [editTotal, setEditTotal] = useState(0);
  const [editCorrect, setEditCorrect] = useState(0);
  const [editWrong, setEditWrong] = useState(0);

  const [selectedBulkMatchId, setSelectedMatchId] = useState("");
  const [bulkScore1, setBulkScore1] = useState("");
  const [bulkScore2, setBulkScore2] = useState("");

  const [matchEditingId, setMatchEditingId] = useState("");
  const [matchForm, setMatchForm] = useState({
    team1: "كوريا الجنوبية", team1Emoji: "🇰🇷", team2: "التشيك", team2Emoji: "🇨🇿",
    day: "السبت 13 يونيو", group: "مجموعة أ", time: "08:00 م", kickoff: "2026-06-13T20:00:00"
  });

  // تفعيل وتثبيت عدادات الـ 20 عنصراً (السابق / التالي) لجميع الجداول بدون استثناء لمنع التداخل
  const [userPage, setUserPage] = useState(1);
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const [predPage, setPredPage] = useState(1);
  const [matchPage, setMatchPage] = useState(1);
  const [chatPage, setChatPage] = useState(1);
  const itemsPerPage = 20;
  useEffect(() => {
    onSnapshot(query(collection(db, "users"), orderBy("createdAt", "desc")), (snap) => { setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    onSnapshot(query(collection(db, "users"), orderBy("points", "desc")), (snap) => { setSortedPointsUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    onSnapshot(query(collection(db, "predictions"), orderBy("createdAt", "desc")), (snap) => setPredictions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(query(collection(db, "custom_matches"), orderBy("kickoff", "asc")), (snap) => setMatches(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  // دالة الاحتساب التلقائي المركزي الدقيق: تمسح داتا جميع الأعضاء وتحدث (التوقعات، الصح، الخطأ، والنقاط) فوراً
  const handleSettleMatchPredictionsBulk = async () => {
    if (!selectedBulkMatchId) { alert("⚠️ اختر مباراة أولاً!"); return; }
    const score1 = parseInt(bulkScore1); const score2 = parseInt(bulkScore2);
    if (isNaN(score1) || isNaN(score2) || score1 < 0 || score2 < 0) { alert("⚠️ النتيجة خطأ!"); return; }

    setIsGlobalLoading(true);
    try {
      const usersSnap = await getDocs(query(collection(db, "users"), orderBy("points", "desc")));
      const currentOrderedUsers = usersSnap.docs.map((d, index) => ({ id: d.id, rank: index + 1, ...d.data() }));
      for (const u of currentOrderedUsers) { await updateDoc(doc(db, "users", u.id), { previousRank: u.rank }); }

      const q = query(collection(db, "predictions"), where("matchId", "==", selectedBulkMatchId), where("processed", "==", false));
      const predSnap = await getDocs(q);
      let settledCount = 0;

      if (!predSnap.empty) {
        for (const predictionDoc of predSnap.docs) {
          const pred = predictionDoc.data();
          const p1 = parseInt(pred.score1); const p2 = parseInt(pred.score2);
          let earnedPoints = 0; let isCorrect = 0; let isWrong = 0;

          if (p1 === score1 && p2 === score2) { earnedPoints = 3; isCorrect = 1; }
          else if ((score1 > score2 && p1 > p2) || (score2 > score1 && p2 > p1) || (score1 === score2 && p1 === p2)) { earnedPoints = 1; isCorrect = 1; }
          else { isWrong = 1; }

          const userQuery = query(collection(db, "users"), where("fullName", "==", pred.user));
          const userSnap = await getDocs(userQuery);
          if (!userSnap.empty) {
            const userDoc = userSnap.docs[0]; const cur = userDoc.data();
            await updateDoc(doc(db, "users", userDoc.id), {
              points: (cur.points || 0) + earnedPoints,
              total: (cur.total || 0) + 1,
              correct: (cur.correct || 0) + isCorrect,
              wrong: (cur.wrong || 0) + isWrong
            });
          }
          await updateDoc(doc(db, "predictions", predictionDoc.id), { processed: true, pointsAwarded: earnedPoints, bulkSettleScore1: score1, bulkSettleScore2: score2 });
          settledCount++;
        }
      }

      // حساب تحديث حركة المراكز بالأسهم صعوداً ونزولاً من المركز #1
      const freshUsersSnap = await getDocs(query(collection(db, "users"), orderBy("points", "desc")));
      freshUsersSnap.docs.forEach(async (d, index) => {
        const freshData = d.data(); const currentRank = index + 1;
        const prevRank = freshData.previousRank || currentRank;
        let direction = "➖"; let change = 0;
        if (currentRank < prevRank) { direction = "⬆️"; change = prevRank - currentRank; }
        else if (currentRank > prevRank) { direction = "⬇️"; change = currentRank - prevRank; }
        await updateDoc(doc(db, "users", d.id), { currentRank: currentRank, rankDirection: direction, rankChange: change });
      });

      setBulkScore1(""); setBulkScore2(""); setSelectedMatchId("");
      alert(`🎉 نجاح الاحتساب التلقائي المطور لـ (${settledCount}) توقع! وتنشيط أسهم لوحة الصدارة لايف مية بالمية.`);
    } catch (err) { console.error(err); }
    setIsGlobalLoading(false);
  };

  // دالة الـ 3 أزرار الفردية المستعادة: تزيد رصيد التوقعات الكلي وتحدث الصح والخطأ فوراً بالصدارة
  const handleSettlePredictionSingleManualOldWay = async (pred: any, scoreType: "full" | "win" | "wrong") => {
    let earnedPoints = 0; let isCorrect = 0; let isWrong = 0;
    if (scoreType === "full") { earnedPoints = 3; isCorrect = 1; }
    else if (scoreType === "win") { earnedPoints = 1; isCorrect = 1; }
    else { isWrong = 1; }

    setIsGlobalLoading(true);
    try {
      const uSnap = await getDocs(query(collection(db, "users"), where("fullName", "==", pred.user)));
      if (!uSnap.empty) {
        const uDoc = uSnap.docs[0]; const cur = uDoc.data();
        const oldPoints = pred.pointsAwarded || 0;
        const oldCorrect = pred.oldIsCorrect || 0;
        const oldWrong = pred.oldIsWrong || 0;

        await updateDoc(doc(db, "users", uDoc.id), {
          points: Math.max(((cur.points || 0) - oldPoints) + earnedPoints, 0),
          total: pred.processed ? (cur.total || 0) : (cur.total || 0) + 1,
          correct: Math.max(((cur.correct || 0) - oldCorrect) + isCorrect, 0),
          wrong: Math.max(((cur.wrong || 0) - oldWrong) + isWrong, 0)
        });

        await updateDoc(doc(db, "predictions", pred.id), { processed: true, pointsAwarded: earnedPoints, oldIsCorrect: isCorrect, oldIsWrong: isWrong });
        alert(`✅ تم احتساب الزر اليدوي وزيادة عدد التوقعات والصح والخطأ فوراً للعضو: ${pred.user}`);
      }
    } catch (err) { console.error(err); }
    setIsGlobalLoading(false);
  };

  const handleUpdateUser = async (userId: string) => {
    setIsGlobalLoading(true);
    const matched = WORLD_CUP_2026_TEAMS.find(t => t.name === editTeam);
    await updateDoc(doc(db, "users", userId), { fullName: editName, password: editPassword, favoriteTeam: editTeam, teamEmoji: matched ? matched.emoji : "🏆" });
    setEditingUserId(""); setIsGlobalLoading(false); alert("✅ تم التعديل!");
  };

  const handleUpdateUserScoresManual = async (userId: string) => {
    setIsGlobalLoading(true);
    await updateDoc(doc(db, "users", userId), { points: Number(editPoints), total: Number(editTotal), correct: Number(editCorrect), wrong: Number(editWrong) });
    setScoreEditUserId(""); setIsGlobalLoading(false); alert("🏆 تم التحديث!");
  };

  const maxUserPages = Math.ceil(users.length / itemsPerPage);
  const maxLeaderboardPages = Math.ceil(sortedPointsUsers.length / itemsPerPage);
  const maxPredPages = Math.ceil(predictions.length / itemsPerPage);
  return (
    <div dir="rtl" className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-8 font-sans text-right select-none">
      <style>{`.interactive-btn:active { transform: scale(0.95); filter: brightness(1.2); }`}</style>
      
      <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-6">
        <h1 className="text-xl md:text-2xl font-black text-amber-400">⚙️ لوحة قيادة تحكم الآدمن الرسمية (النسخة المستقرة المحدثة)</h1>
        {isGlobalLoading && <span className="text-xs bg-amber-500 text-slate-950 font-black px-3 py-1 rounded-full">جاري المزامنة والحفظ... ⏳</span>}
      </div>

      {/* 🚀 صندوق الاحتساب الفوري المطور المربوط بالتوقعات والعدادات الأربعة */}
      <section className="bg-gradient-to-r from-purple-950 to-indigo-950 p-5 rounded-2xl border border-purple-500/30 mb-8 shadow-2xl">
        <h2 className="font-black text-xs md:text-sm text-white mb-2">⚡ صندوق الاحتساب الفوري الجماعي والمسح السحابي الذكي عضو عضو بالملي (حساب تلقائي دقيق)</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-950/50 p-4 rounded-xl">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-purple-300 font-bold">اختر لقاء الفرز الجماعي:</label>
            <select value={selectedBulkMatchId} onChange={(e) => setSelectedMatchId(e.target.value)} className="bg-slate-900 text-white border border-purple-500/20 p-2.5 rounded-xl text-xs font-black focus:outline-none">
              <option value="">-- اضغط لاختيار المباراة --</option>
              {SETTLEMENT_MATCHES_LIST.map((m) => ( <option key={m.id} value={m.id}>{m.title}</option> ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 text-center">
            <label className="text-[11px] text-purple-300 font-bold">أهداف الأول:</label>
            <input type="number" min="0" className="bg-slate-900 text-green-400 text-center font-black p-2 rounded-xl border border-purple-500/20 text-sm focus:outline-none" value={bulkScore1} onChange={(e) => setBulkScore1(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5 text-center">
            <label className="text-[11px] text-purple-300 font-bold">أهداف الثاني:</label>
            <input type="number" min="0" className="bg-slate-900 text-green-400 text-center font-black p-2 rounded-xl border border-purple-500/20 text-sm focus:outline-none" value={bulkScore2} onChange={(e) => setBulkScore2(e.target.value)} />
          </div>
          <button onClick={handleSettleMatchPredictionsBulk} className="bg-gradient-to-r from-emerald-600 to-green-600 text-white font-black py-2.5 px-4 rounded-xl text-xs shadow-lg transition-all interactive-btn w-full">🚀 فرز اللقاء وحركة المراكز فوراَ</button>
        </div>
      </section>

      {/* 👥 جدول 1: التحكم بالأعضاء مزود بـ (السابق / التالي) */}
      <section className="bg-slate-950 p-4 rounded-xl mb-6 shadow-xl">
        <h3 className="font-black text-xs text-amber-400 mb-3 border-b border-slate-800 pb-1">👤 التحكم بالأعضاء وبينات الحسابات (التسلسل من الأحدث مسجلاً إلى الأقدم 🟢)</h3>
        <div className="overflow-x-auto min-h-[200px]">
          <table className="w-full text-xs text-center border-collapse">
            <thead><tr className="bg-slate-900 text-slate-400 border-b border-slate-800"><th className="p-2 text-right">الاسم</th><th className="p-2">الرمز السري</th><th className="p-2">المنتخب المرشح لللقب</th><th className="p-2">الإجراء</th></tr></thead>
            <tbody className="divide-y divide-slate-900">
              {users.slice((userPage - 1) * itemsPerPage, userPage * itemsPerPage).map((u) => (
                <tr key={u.id} className="hover:bg-slate-900/40">
                  <td className="p-2 text-right font-bold">{editingUserId === u.id ? <input type="text" className="bg-slate-900 border px-2 py-0.5 rounded text-white focus:outline-none" value={editName} onChange={(e)=>setEditName(e.target.value)} /> : u.fullName}</td>
                  <td className="p-2 font-mono">{editingUserId === u.id ? <input type="text" className="bg-slate-900 border px-2 py-0.5 rounded text-center text-white focus:outline-none" value={editPassword} onChange={(e)=>setEditPassword(e.target.value)} /> : u.password}</td>
                  <td className="p-2">
                    {editingUserId === u.id ? (
                      <select value={editTeam} onChange={(e)=>setEditTeam(e.target.value)} className="bg-slate-900 text-white border border-slate-700 rounded px-2 py-1 text-xs focus:outline-none">
                        {WORLD_CUP_2026_TEAMS.map((t, idx) => ( <option key={idx} value={t.name}>{t.emoji} {t.name}</option> ))}
                      </select>
                    ) : ( <span className="font-bold text-purple-300">{u.teamEmoji} {u.favoriteTeam}</span> )}
                  </td>
                  <td className="p-2">
                    <div className="flex gap-1 justify-center items-center">
                      {editingUserId === u.id ? <button onClick={()=>handleUpdateUser(u.id)} className="bg-green-600 px-2 py-1 rounded text-[10px] font-black interactive-btn">حفظ 💾</button> : <button onClick={()=>{setEditingUserId(u.id); setEditName(u.fullName); setEditPassword(u.password); setEditTeam(u.favoriteTeam);}} className="bg-blue-600 px-2 py-1 rounded text-[10px] font-black interactive-btn">تعديل ⚙️</button>}
                      <button onClick={async ()=>{if(confirm("حذف العضو؟")) await deleteDoc(doc(db,"users",u.id))}} className="bg-red-600 px-2 py-1 rounded text-[10px] font-black interactive-btn">حذف 🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {maxUserPages > 1 && (
          <div className="flex justify-center items-center gap-4 pt-3 border-t border-slate-800 mt-3 text-xs font-bold">
            <button onClick={()=>setUserPage(p=>Math.max(p-1,1))} disabled={userPage === 1} className="bg-slate-800 px-3 py-1 rounded disabled:opacity-30 interactive-btn">◀ السابق</button>
            <span className="text-slate-400">صفحة {userPage} من {maxUserPages}</span>
            <button onClick={()=>setUserPage(p=>Math.min(p+1,maxUserPages))} disabled={userPage === maxUserPages} className="bg-slate-800 px-3 py-1 rounded disabled:opacity-30 interactive-btn">التالي ▶</button>
          </div>
        )}
      </section>

      {/* 📊 جدول 2: إجبار إحصائيات الصدارة مزود بـ (السابق / التالي) */}
      <section className="bg-slate-950 p-4 rounded-xl mb-6 border border-amber-500/20 shadow-xl">
        <h3 className="font-black text-xs text-amber-400 mb-3 border-b border-slate-800 pb-1">📊 قسم تعديل وإجبار إحصائيات الصدارة يدوياً (التسلسل بالأعلى نقاطاً فالأقل 🏆)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <th className="p-2 text-right">العضو</th>
                <th className="p-2">إجمالي التوقعات</th>
                <th className="p-2 text-green-400">الصح</th>
                <th className="p-2 text-red-400">الخطأ</th>
                <th className="p-2 text-yellow-400">النقاط الكلية</th>
                <th className="p-2">التحكم اليدوي المباشر</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 font-bold">
              {sortedPointsUsers.slice((leaderboardPage - 1) * itemsPerPage, leaderboardPage * itemsPerPage).map((u) => (
                <tr key={u.id} className="hover:bg-purple-950/20">
                  <td className="p-2 text-right text-white">👤 {u.fullName} {u.teamEmoji}</td>
                  <td className="p-2">{scoreEditUserId === u.id ? <input type="number" className="w-14 bg-slate-900 border text-center text-white" value={editTotal} onChange={(e)=>setEditTotal(Number(e.target.value))} /> : u.total || 0}</td>
                  <td className="p-2 text-green-400">{scoreEditUserId === u.id ? <input type="number" className="w-14 bg-slate-900 border text-center text-green-400" value={editCorrect} onChange={(e)=>setEditCorrect(Number(e.target.value))} /> : u.correct || 0}</td>
                  <td className="p-2 text-red-400">{scoreEditUserId === u.id ? <input type="number" className="w-14 bg-slate-900 border text-center text-red-400" value={editWrong} onChange={(e)=>setEditWrong(Number(e.target.value))} /> : u.wrong || 0}</td>
                  <td className="p-2 text-amber-400 font-black">{scoreEditUserId === u.id ? <input type="number" className="w-14 bg-slate-900 border text-center text-amber-400" value={editPoints} onChange={(e)=>setEditPoints(Number(e.target.value))} /> : u.points || 0}</td>
                  <td className="p-2 flex gap-1 justify-center">
                    {scoreEditUserId === u.id ? <button onClick={()=>handleUpdateUserScoresManual(u.id)} className="bg-emerald-600 px-3 py-1 rounded text-[10px] font-black interactive-btn">تحديث 💾</button> : <button onClick={()=>{setScoreEditUserId(u.id); setEditTotal(u.total || 0); setEditCorrect(u.correct || 0); setEditWrong(u.wrong || 0); setEditPoints(u.points || 0);}} className="bg-amber-600 text-slate-950 font-black px-3 py-1 rounded text-[10px] interactive-btn">تعديل الإحصائيات 📊</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {maxLeaderboardPages > 1 && (
          <div className="flex justify-center items-center gap-4 pt-3 border-t border-slate-800 mt-3 text-xs font-bold">
            <button onClick={()=>setLeaderboardPage(p=>Math.max(p-1,1))} disabled={leaderboardPage === 1} className="bg-slate-800 px-3 py-1 rounded disabled:opacity-30 interactive-btn">◀ السابق</button>
            <span className="text-slate-400">صفحة {leaderboardPage} من {maxLeaderboardPages}</span>
            <button onClick={()=>setLeaderboardPage(p=>Math.min(p+1,maxLeaderboardPages))} disabled={leaderboardPage === maxLeaderboardPages} className="bg-slate-800 px-3 py-1 rounded disabled:opacity-30 interactive-btn">التالي ▶</button>
          </div>
        )}
      </section>

      {/* 🧮 جدول 3: توقعات الجماهير للطوارئ بـ 3 أزرار مزود بـ (السابق / التالي) */}
      <section className="bg-slate-950 p-4 rounded-xl mb-6 shadow-xl">
        <h3 className="font-black text-xs text-green-400 mb-3 border-b border-slate-800 pb-1">🧮 جدول توقعات الجماهير للطوارئ (التحكم اليدوي الفردي الدقيق بـ 3 أزرار مستقلة مع احتساب العدادات الأربعة 🔄)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <th className="p-2 text-right">العضو</th>
                <th className="p-2">المباراة الملعوبة</th>
                <th className="p-2 text-green-400">التوقع المرسل</th>
                <th className="p-2">الحالة السحابية</th>
                <th className="p-2">الإجراء اليدوي المباشر لحساب النقاط والعدادات الأربعة فوراً</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 font-bold">
              {predictions.slice((predPage - 1) * itemsPerPage, predPage * itemsPerPage).map((p) => {
                return (
                  <tr key={p.id} className="hover:bg-slate-900/40">
                    <td className="p-2 text-right">👤 {p.user}</td>
                    <td className="p-2 text-purple-300">{p.t1} vs {p.t2}</td>
                    <td className="p-2 text-green-400 font-mono text-sm">{p.score1} - {p.score2}</td>
                    <td className="p-2">
                      {p.processed ? <span className="text-green-500 font-black">حُسبت بالكامل ✓</span> : <span className="text-amber-500 font-black">بانتظار الفرز ⏰</span>}
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1 justify-center items-center">
                        <button onClick={() => handleSettlePredictionSingleManualOldWay(p, "full")} className="bg-green-600 hover:bg-green-500 text-white font-black px-2 py-1 rounded text-[10px] interactive-btn shadow-md">🎯 بالملي +3</button>
                        <button onClick={() => handleSettlePredictionSingleManualOldWay(p, "win")} className="bg-blue-600 hover:bg-blue-500 text-white font-black px-2 py-1 rounded text-[10px] interactive-btn shadow-md">⚽ الفائز +1</button>
                        <button onClick={() => handleSettlePredictionSingleManualOldWay(p, "wrong")} className="bg-red-600 hover:bg-red-500 text-white font-black px-2 py-1 rounded text-[10px] interactive-btn shadow-md">✕ خطأ 0</button>
                        <button onClick={async ()=>{if(confirm("حذف التوقع؟")) await deleteDoc(doc(db,"predictions",p.id))}} className="bg-slate-800 text-red-400 px-2 py-1 rounded text-[10px] interactive-btn">حذف</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {maxPredPages > 1 && (
          <div className="flex justify-center items-center gap-4 pt-3 border-t border-slate-800 mt-3 text-xs font-bold">
            <button onClick={()=>setPredPage(p=>Math.max(p-1,1))} disabled={predPage === 1} className="bg-slate-800 px-3 py-1 rounded disabled:opacity-30 interactive-btn">◀ السابق</button>
            <span className="text-slate-400">صفحة {predPage} من {maxPredPages}</span>
            <button onClick={()=>setPredPage(p=>Math.min(p+1,maxPredPages))} disabled={predPage === maxPredPages} className="bg-slate-800 px-3 py-1 rounded disabled:opacity-30 interactive-btn">التالي ▶</button>
          </div>
        )}
      </section>
    </div>
  );
}