"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, orderBy, getDocs, doc, updateDoc, deleteDoc, where, addDoc } from "firebase/firestore";

// قائمة المنتخبات الكاملة وأعلامها الموقوتة بالفيفا للمطابقة التلقائية في القائمة المنسدلة للأدمن
const WORLD_CUP_2026_TEAMS = [
  { code: "MX", name: "المكسيك", emoji: "🇲🇽" }, { code: "ZA", name: "جنوب أفريقيا", emoji: "🇿🇦" },
  { code: "SA", name: "السعودية", emoji: "🇸🇦" }, { code: "MA", name: "المغرب", emoji: "🇲🇦" },
  { code: "EG", name: "مصر", emoji: "🇪🇬" }, { code: "DZ", name: "الجزائر", emoji: "🇩🇿" },
  { code: "TN", name: "تونس", emoji: "🇹🇳" }, { code: "AE", name: "الإمارات", emoji: "🇦🇪" },
  { code: "QA", name: "قطر", emoji: "🇶🇦" }, { code: "IQ", name: "العراق", emoji: "🇮🇶" },
  { code: "JO", name: "الأردن", emoji: "🇯🇴" }, { code: "OM", name: "عُمان", emoji: "🇴🇲" },
  { code: "BH", name: "البحرين", emoji: "🇧🇭" }, { code: "KW", name: "الكويت", emoji: "🇰🇼" },
  { code: "US", name: "الولايات المتحدة الأمريكية", emoji: "🇺🇸" }, { code: "CA", name: "كندا", emoji: "🇨🇦" },
  { code: "AR", name: "الأرجنتين", emoji: "🇦🇷" }, { code: "BR", name: "البرازيل", emoji: "🇧🇷" },
  { code: "FR", name: "فرنسا", emoji: "🇫🇷" }, { code: "ES", name: "إسبانيا", emoji: "🇪🇸" },
  { code: "DE", name: "ألمانيا", emoji: "🇩🇪" }, { code: "IT", name: "إيطاليا", emoji: "🇮🇹" },
  { code: "GB", name: "إنجلترا", emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" }, { code: "PT", name: "البرتغال", emoji: "🇵🇹" },
  { code: "NL", name: "هولندا", emoji: "🇳🇱" }, { code: "BE", name: "بلجيكا", emoji: "🇧🇪" },
  { code: "HR", name: "كرواتيا", emoji: "🇭🇷" }, { code: "UY", name: "أوروغواي", emoji: "🇺🇾" },
  { code: "CO", name: "كولومبيا", emoji: "🇨🇴" }, { code: "CL", name: "تشيلي", emoji: "🇨🇱" },
  { code: "EC", name: "الإكوادور", emoji: "🇪🇨" }, { code: "PE", name: "بيرو", emoji: "🇵🇪" },
  { code: "SN", name: "السنغال", emoji: "🇸🇳" }, { code: "CM", name: "الكاميرون", emoji: "🇨🇲" },
  { code: "GH", name: "غانا", emoji: "🇬🇭" }, { code: "NG", name: "نيجيريا", emoji: "🇳🇬" },
  { code: "CI", name: "ساحل العاج", emoji: "🇨🇮" }, { code: "JP", name: "اليابان", emoji: "🇯🇵" },
  { code: "KR", name: "كوريا الجنوبية", emoji: "🇰🇷" }, { code: "AU", name: "أستراليا", emoji: "🇦🇺" },
  { code: "IR", name: "إيران", emoji: "🇮🇷" }, { code: "CR", name: "كوستاريكا", emoji: "🇨🇷" },
  { code: "JM", name: "جامايكا", emoji: "🇯🇲" }, { code: "PA", name: "بنما", emoji: "🇵🇦" },
  { code: "NZ", name: "نيوزيلندا", emoji: "🇳🇿" }, { code: "CH", name: "سويسرا", emoji: "🇨🇭" },
  { code: "TR", name: "تركيا", emoji: "🇹🇷" }, { code: "UA", name: "أوكرانيا", emoji: "🇺🇦" },
  { code: "BA", name: "البوسنة والهرسك", emoji: "🇧🇦" }, { code: "PY", name: "باراغواي", emoji: "🇵🇾" },
  { code: "HT", name: "هايتي", emoji: "🇭🇹" }, { code: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", name: "اسكتلندا", emoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { code: "CW", name: "كوراساو", emoji: "🇨🇼" }
];

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [tickerSpeed, setTickerSpeed] = useState("30s");
  const [tickerId, setTickerSpeedId] = useState("");

  const [editingUserId, setEditingUserId] = useState("");
  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editTeam, setEditTeam] = useState("");

  const [scoreEditUserId, setScoreEditUserId] = useState("");
  const [editPoints, setEditPoints] = useState(0);
  const [editTotal, setEditTotal] = useState(0);
  const [editCorrect, setEditCorrect] = useState(0);
  const [editWrong, setEditWrong] = useState(0);

  // 📝 حقل استقبال أهداف الفرز الجماعي التلقائي للمباراة كبسة واحدة
  const [matchResultsInput, setMatchResultsInput] = useState<{ [key: string]: { s1: string; s2: string } }>({});

  // عدادات الصفحات المستقلة لـ 20 اسماً وعنصراً لكل جدول
  const [userPage, setUserPage] = useState(1);
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const [predPage, setPredPage] = useState(1);
  const [chatPage, setChatPage] = useState(1);
  
  const itemsPerPage = 20;

  useEffect(() => {
    onSnapshot(query(collection(db, "users"), orderBy("fullName", "asc")), (snap) => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(query(collection(db, "predictions"), orderBy("createdAt", "desc")), (snap) => setPredictions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(query(collection(db, "chats"), orderBy("createdAt", "desc")), (snap) => setChats(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(collection(db, "ticker_settings"), (snap) => {
      if (!snap.empty) { setTickerSpeed(snap.docs[0].data().speed || "30s"); setTickerSpeedId(snap.docs[0].id); }
    });
  }, []);
  // 🧮 محرك الاحتساب الجماعي الفوري المطلوب: تدخل النتيجة الحقيقية ويقوم السيستم تلقائياً بفرز وتوزيع نقاط كل من شارك في ثانية واحدة!
  const handleSettleMatchPredictionsBulk = async (matchId: string, team1Name: string, team2Name: string, finalScore1: number, finalScore2: number) => {
    if (isNaN(finalScore1) || isNaN(finalScore2) || finalScore1 < 0 || finalScore2 < 0) { 
      alert("⚠️ يرجى إدخال نتيجة أهداف صحيحة للفريقين أولاً قبل الضغط على الفرز الجماعي!"); 
      return; 
    }
    
    if (!confirm(`هل أنت متأكد من اعتماد نتيجة مباراة ${team1Name} ضد ${team2Name} كـ (${finalScore1} - ${finalScore2})؟ سيتم توزيع النقاط على الجميع فوراً لايف.`)) return;

    try {
      const q = query(collection(db, "predictions"), where("matchId", "==", matchId), where("processed", "==", false));
      const snap = await getDocs(q);
      
      if (snap.empty) { alert("⚠️ لا توجد توقعات غير مفروزة لهذه المباراة حالياً في السيرفر."); return; }

      let count = 0;
      for (const predictionDoc of snap.docs) {
        const pred = predictionDoc.data();
        const p1 = parseInt(pred.score1);
        const p2 = parseInt(pred.score2);
        let earnedPoints = 0;
        let isCorrect = 0, isWrong = 0;

        // مطابقة قانون النقاط الحصري بالملي
        if (p1 === finalScore1 && p2 === finalScore2) {
          earnedPoints = 3; isCorrect = 1; // بالملي صح (+3)
        } else if ((finalScore1 > finalScore2 && p1 > p2) || (finalScore2 > finalScore1 && p2 > p1) || (finalScore1 === finalScore2 && p1 === p2)) {
          earnedPoints = 1; isCorrect = 1; // الفائز أو التعادل صح (+1)
        } else {
          isWrong = 1; // خطأ (0)
        }

        const userQuery = query(collection(db, "users"), where("fullName", "==", pred.user));
        const userSnap = await getDocs(userQuery);
        if (!userSnap.empty) {
          const userDoc = userSnap.docs[0];
          const cur = userDoc.data();
          await updateDoc(doc(db, "users", userDoc.id), {
            points: (cur.points || 0) + earnedPoints,
            total: (cur.total || 0) + 1, // إجمالي التوقعات الكلية (صح وخطأ) لمنع الأصفار
            correct: (cur.correct || 0) + isCorrect,
            wrong: (cur.wrong || 0) + isWrong
          });
        }
        await updateDoc(doc(db, "predictions", predictionDoc.id), { processed: true, pointsAwarded: earnedPoints, matchTypeAwarded: p1 === finalScore1 && p2 === finalScore2 ? "full" : (earnedPoints === 1 ? "win" : "wrong") });
        count++;
      }
      alert(`🎉 نجاح باهر! تم احتساب وتوزيع النقاط وتحديث صدارة الجمهور تلقائياً لـ (${count}) عضو!`);
    } catch (err) { console.error(err); }
  };

  const handleUpdateUser = async (userId: string) => {
    const matched = WORLD_CUP_2026_TEAMS.find(t => t.name === editTeam);
    const chosenEmoji = matched ? matched.emoji : "🏆";
    await updateDoc(doc(db, "users", userId), { fullName: editName, password: editPassword, favoriteTeam: editTeam, teamEmoji: chosenEmoji });
    setEditingUserId(""); alert("✅ تم تعديل بيانات الحساب والعلم بصفحة الجمهور لايف!");
  };

  const handleUpdateUserScoresManual = async (userId: string) => {
    try {
      await updateDoc(doc(db, "users", userId), { points: Number(editPoints), total: Number(editTotal), correct: Number(editCorrect), wrong: Number(editWrong) });
      setScoreEditUserId(""); alert("🏆 تم تحديث وإجبار لوحة الصدارة يدوياً بنجاح!");
    } catch (err) { console.error(err); }
  };

  const handleUndoPointsManual = async (pred: any) => {
    if (!pred.processed) return;
    const pointsToSubtract = pred.pointsAwarded || 0;
    const type = pred.matchTypeAwarded;
    let isCorrect = type === "full" || type === "win" ? 1 : 0;
    let isWrong = type === "wrong" ? 1 : 0;

    const uSnap = await getDocs(query(collection(db, "users"), where("fullName", "==", pred.user)));
    if (!uSnap.empty) {
      const uDoc = uSnap.docs[0];
      const cur = uDoc.data();
      await updateDoc(doc(db, "users", uDoc.id), {
        points: Math.max((cur.points || 0) - pointsToSubtract, 0),
        total: Math.max((cur.total || 0) - 1, 0),
        correct: Math.max((cur.correct || 0) - isCorrect, 0),
        wrong: Math.max((cur.wrong || 0) - isWrong, 0)
      });
      await updateDoc(doc(db, "predictions", pred.id), { processed: false, pointsAwarded: 0, matchTypeAwarded: "" });
      alert(`↩️ تم التراجع وخصم النقاط بنجاح من حساب ${pred.user}!`);
    }
  };

  const handleUpdateTickerSpeed = async () => {
    try {
      if (tickerId) { await updateDoc(doc(db, "ticker_settings", tickerId), { speed: tickerSpeed }); }
      else { await addDoc(collection(db, "ticker_settings"), { speed: tickerSpeed }); }
      alert("⚡ تم تغيير سرعة شريط الجمهور فوراً!");
    } catch (err) { console.error(err); }
  };

  const maxUserPages = Math.ceil(users.length / itemsPerPage);
  const maxLeaderboardPages = Math.ceil(users.length / itemsPerPage);
  const maxPredPages = Math.ceil(predictions.length / itemsPerPage);
  const maxChatPages = Math.ceil(chats.length / itemsPerPage);
  return (
    <div dir="rtl" className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-8 font-sans text-right select-none">
      <style>{`.interactive-btn:active { transform: scale(0.95); filter: brightness(1.2); } .hidden-scrollbar::-webkit-scrollbar { display: none; }`}</style>
      <h1 className="text-xl md:text-2xl font-black text-amber-400 mb-6 border-b border-slate-700 pb-2">⚙️ لوحة تحكم الإدارة الاحترافية الكاملة (المطورة)</h1>

      {/* شريط السرعة للأدمن */}
      <section className="bg-slate-950 p-4 rounded-xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div><h3 className="font-black text-xs text-purple-300">⚙️ التحكم بسرعة شريط التوقعات بصفحة الجمهور</h3></div>
        <div className="flex gap-2">
          <select value={tickerSpeed} onChange={(e) => setTickerSpeed(e.target.value)} className="bg-slate-900 border p-2 rounded-lg text-xs text-white focus:outline-none"><option value="15s">سريع (15ث)</option><option value="30s">متوسط (30ث)</option><option value="50s">بطيء (50ث)</option></select>
          <button onClick={handleUpdateTickerSpeed} className="bg-purple-600 px-4 py-2 rounded-lg text-xs font-black interactive-btn">تحديث السرعة ⚡</button>
        </div>
      </section>

      {/* 👥 القسم الأول: التحكم بالأعضاء (20 اسماً في الصفحة مع أزرار مستقلة) */}
      <section className="bg-slate-950 p-4 rounded-xl mb-6 shadow-xl">
        <h3 className="font-black text-xs text-amber-400 mb-3 border-b border-slate-800 pb-1">👤 القسم الأول: التحكم الكامل بالأعضاء وبينات الحسابات ({users.length} عضو)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead><tr className="bg-slate-900 text-slate-400 border-b border-slate-800"><th className="p-2 text-right">الاسم</th><th className="p-2">الرمز السري</th><th className="p-2">المنتخب المرشح</th><th className="p-2">الإجراء</th></tr></thead>
            <tbody className="divide-y divide-slate-900">
              {users.slice((userPage - 1) * itemsPerPage, userPage * itemsPerPage).map((u) => (
                <tr key={u.id} className="hover:bg-slate-900/40">
                  <td className="p-2 text-right font-bold">{editingUserId === u.id ? <input type="text" className="bg-slate-900 border px-2 py-0.5 rounded text-white" value={editName} onChange={(e)=>setEditName(e.target.value)} /> : u.fullName}</td>
                  <td className="p-2 font-mono">{editingUserId === u.id ? <input type="text" className="bg-slate-900 border px-2 py-0.5 rounded text-center text-white" value={editPassword} onChange={(e)=>setEditPassword(e.target.value)} /> : u.password}</td>
                  <td className="p-2">
                    {editingUserId === u.id ? (
                      /* قائمة منسدلة بالأعلام والمنتخبات الـ 48 كاملة من الداتابيز لتسهيل الاختيار ومطابقته */
                      <select value={editTeam} onChange={(e)=>setEditTeam(e.target.value)} className="bg-slate-900 text-white border border-slate-700 rounded px-2 py-1 text-xs focus:outline-none">
                        {WORLD_CUP_2026_TEAMS.map((t, idx) => (
                          <option key={idx} value={t.name}>{t.emoji} {t.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-bold text-purple-300">{u.teamEmoji} {u.favoriteTeam}</span>
                    )}
                  </td>
                  <td className="p-2 flex gap-1 justify-center">
                    {editingUserId === u.id ? <button onClick={()=>handleUpdateUser(u.id)} className="bg-green-600 px-2 py-1 rounded text-[10px] font-black interactive-btn">حفظ 💾</button> : <button onClick={()=>{setEditingUserId(u.id); setEditName(u.fullName); setEditPassword(u.password); setEditTeam(u.favoriteTeam);}} className="bg-blue-600 px-2 py-1 rounded text-[10px] font-black interactive-btn">تعديل ⚙️</button>}
                    <button onClick={async ()=>{if(confirm("حذف العضو نهائياً؟")) await deleteDoc(doc(db,"users",u.id))}} className="bg-red-600 px-2 py-1 rounded text-[10px] font-black interactive-btn">حذف 🗑️</button>
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

      {/* 📊 تعديل يدوي مباشر لأرقام الصدارة (20 اسماً في الصفحة مع أزرار مستقلة) */}
      <section className="bg-slate-950 p-4 rounded-xl mb-6 border border-amber-500/20 shadow-xl">
        <h3 className="font-black text-xs text-amber-400 mb-3 border-b border-slate-800 pb-1">📊 قسم تعديل وإجبار إحصائيات الصدارة يدوياً (يعرض 20 اسماً)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <th className="p-2 text-right">العضو</th>
                <th className="p-2">إجمالي T التوقعات</th>
                <th className="p-2 text-green-400">الصح</th>
                <th className="p-2 text-red-400">الخطأ</th>
                <th className="p-2 text-yellow-400">النقاط الكلية</th>
                <th className="p-2">التحكم اليدوي المباشر</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 font-bold">
              {users.slice((leaderboardPage - 1) * itemsPerPage, leaderboardPage * itemsPerPage).map((u) => (
                <tr key={u.id} className="hover:bg-slate-900/40">
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

      {/* 🧮 فرز التوقعات وصندوق إدخال النتائج الجماعية الذكي الفوري (20 توقعاً في الصفحة مع أزرار مستقلة) */}
      <section className="bg-slate-950 p-4 rounded-xl mb-6 shadow-xl">
        <h3 className="font-black text-xs text-green-400 mb-3 border-b border-slate-800 pb-1">🧮 القسم الثاني والثالث: فرز وصندوق إدخال النتائج الجماعي للتوقعات (يعرض 20 توقعاً)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead><tr className="bg-slate-900 text-slate-400 border-b border-slate-800"><th className="p-2 text-right">العضو</th><th className="p-2">المباراة</th><th className="p-2">التوقع المرسل</th><th className="p-2">الحالة والفرز</th><th className="p-2">صندوق إدخال النتيجة الحقيقية والفرز الجماعي الفوري</th></tr></thead>
            <tbody className="divide-y divide-slate-900 font-bold">
              {predictions.slice((predPage - 1) * itemsPerPage, predPage * itemsPerPage).map((p) => {
                const matchId = p.matchId || "default";
                const currentInput = matchResultsInput[matchId] || { s1: "", s2: "" };

                return (
                  <tr key={p.id} className="hover:bg-slate-900/40">
                    <td className="p-2 text-right">👤 {p.user}</td>
                    <td className="p-2 text-purple-300">{p.t1E} {p.t1} vs {p.t2} {p.t2E}</td>
                    <td className="p-2 text-green-400 font-mono text-sm bg-slate-900/30 px-2 py-1 rounded-md">{p.score1} - {p.score2}</td>
                    <td className="p-2">{p.processed ? <span className="text-green-500 font-black">حُسبت تلقائياً (+{p.pointsAwarded})</span> : <span className="text-amber-500 font-black">انتظار الفرز</span>}</td>
                    <td className="p-2 flex gap-1 justify-center items-center">
                      {!p.processed ? (
                        <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-lg border border-white/5">
                          {/* ⚽ حقول إدخال النتيجة للمباراة جماعياً */}
                          <input type="number" min="0" placeholder="0" className="w-8 h-6 bg-slate-950 text-white rounded text-center text-xs focus:outline-none" value={currentInput.s1} onChange={(e) => setMatchResultsInput({ ...matchResultsInput, [matchId]: { ...currentInput, s1: e.target.value } })} />
                          <span className="text-slate-500 text-xs">-</span>
                          <input type="number" min="0" placeholder="0" className="w-8 h-6 bg-slate-950 text-white rounded text-center text-xs focus:outline-none" value={currentInput.s2} onChange={(e) => setMatchResultsInput({ ...matchResultsInput, [matchId]: { ...currentInput, s2: e.target.value } })} />
                          
                          {/* 🚀 زر الفرز الجماعي الذكي كبسة واحدة */}
                          <button onClick={() => handleSettleMatchPredictionsBulk(matchId, p.t1, p.t2, parseInt(currentInput.s1), parseInt(currentInput.s2))} className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-2.5 py-0.5 rounded text-[9px] font-black interactive-btn shadow-md">
                            🚀 فرز نقاط المباراة بالكامل
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => handleUndoPointsManual(p)} className="bg-orange-600 text-white font-black px-3 py-0.5 rounded text-[10px] interactive-btn shadow-md">↩️ تراجع عن الحسبة</button>
                      )}
                      <button onClick={async ()=>{if(confirm("حذف؟")) await deleteDoc(doc(db,"predictions",p.id))}} className="bg-red-950 text-red-400 px-2 py-0.5 rounded text-[10px] interactive-btn">حذف</button>
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

      {/* الرقابة على الشات (20 رسالة في الصفحة مع أزرار مستقلة) */}
      <section className="bg-slate-950 p-4 rounded-xl shadow-xl border border-white/5">
        <h3 className="font-black text-xs text-red-400 mb-2 border-b border-slate-800 pb-1">💬 القسم الرابع: الرقابة والتحكم بـ شات صفحة الجمهور (يعرض 20 رسالة)</h3>
        <div className="space-y-2 mb-3">
          {chats.slice((chatPage - 1) * itemsPerPage, chatPage * itemsPerPage).map((c) => (
            <div key={c.id} className="bg-slate-900 p-2 rounded-lg flex items-center justify-between text-xs">
              <div><span className="font-black text-purple-400">👤 {c.user} {c.teamEmoji}:</span> <span className="text-slate-200 font-medium">{c.text}</span></div>
              <button onClick={async()=>await deleteDoc(doc(db,"chats",c.id))} className="bg-red-900/50 text-red-300 px-2 py-0.5 rounded font-bold interactive-btn">حذف رسالة ✕</button>
            </div>
          ))}
        </div>
        {maxChatPages > 1 && (
          <div className="flex justify-center items-center gap-4 pt-3 border-t border-slate-800 mt-3 text-xs font-bold">
            <button onClick={()=>setChatPage(p=>Math.max(p-1,1))} disabled={chatPage === 1} className="bg-slate-800 px-3 py-1 rounded disabled:opacity-30 interactive-btn">◀ السابق</button>
            <span className="text-slate-400">صفحة {chatPage} من {maxChatPages}</span>
            <button onClick={()=>setChatPage(p=>Math.min(p+1,maxChatPages))} disabled={chatPage === maxChatPages} className="bg-slate-800 px-3 py-1 rounded disabled:opacity-30 interactive-btn">التالي ▶</button>
          </div>
        )}
      </section>
    </div>
  );
}