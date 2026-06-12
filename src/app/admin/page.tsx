"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, orderBy, getDocs, doc, updateDoc, deleteDoc, where, addDoc } from "firebase/firestore";

// قائمة المباريات المعتمدة للفرز الجماعي والربط الفوري بالصندوق المستقل المركزي للأدمن
const SETTLEMENT_MATCHES_LIST = [
  { id: "wc_01", title: "🇨🇦 كندا ضد البوسنة والهرسك 🇧🇦" },
  { id: "wc_02", title: "🇺🇸 الولايات المتحدة ضد باراغواي 🇵🇾" },
  { id: "wc_03", title: "🇶🇦 قطر ضد سويسرا 🇨🇭" },
  { id: "wc_04", title: "🇧🇷 البرازيل ضد المغرب 🇲🇦" },
  { id: "wc_05", title: "🇭🇹 هايتي ضد اسكتلندا 🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { id: "wc_06", title: "🇦🇺 أستراليا ضد تركيا 🇹🇷" },
  { id: "wc_07", title: "🇩🇪 ألمانيا ضد كوراساو 🇨🇼" },
  { id: "wc_08", title: "🇳🇱 هولندا ضد اليابان 🇯🇵" },
  { id: "wc_09", title: "🇸🇦 السعودية ضد فرنسا 🇫🇷" }
];

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
  { code: "GB", name: "إنجلترا", emoji: "🏴󠁧󠁢󠁥لن󠁧󠁿" }, { code: "PT", name: "البرتغال", emoji: "🇵🇹" },
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

  // 📝 حقول استقبال أهداف الفرز الجماعي بالصندوق المركزي المستقل
  const [selectedBulkMatchId, setSelectedMatchId] = useState("");
  const [bulkScore1, setBulkScore1] = useState("");
  const [bulkScore2, setBulkScore2] = useState("");

  // 📝 قسم الطوارئ لإضافة وجدولة مباريات التوقع يدوياً لايف بالجمهور
  const [matchEditingId, setMatchEditingId] = useState("");
  const [matchForm, setMatchForm] = useState({
    team1: "كندا", team1Emoji: "🇨🇦", team2: "البوسنة والهرسك", team2Emoji: "🇧🇦",
    day: "الجمعة 12 يونيو", group: "كأس العالم - دور المجموعات", time: "10:00 م", kickoff: "2026-06-12T22:00:00"
  });

  // عدادات الصفحات المستقلة لـ 20 اسماً وعنصراً لجميع الأقسام لمنع التكدس نهائياً
  const [userPage, setUserPage] = useState(1);
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const [predPage, setPredPage] = useState(1);
  const [matchPage, setMatchPage] = useState(1);
  const [chatPage, setChatPage] = useState(1);
  
  const itemsPerPage = 20;

  useEffect(() => {
    onSnapshot(query(collection(db, "users"), orderBy("fullName", "asc")), (snap) => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(query(collection(db, "predictions"), orderBy("createdAt", "desc")), (snap) => setPredictions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(query(collection(db, "chats"), orderBy("createdAt", "desc")), (snap) => setChats(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(query(collection(db, "custom_matches"), orderBy("kickoff", "asc")), (snap) => setMatches(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(collection(db, "ticker_settings"), (snap) => {
      if (!snap.empty) { setTickerSpeed(snap.docs[0].data().speed || "30s"); setTickerSpeedId(snap.docs[0].id); }
    });
  }, []);
  // 🚀 محرك الاحتساب الجماعي المركزي وحساب داتا حركة الترتيب وحفظها بـ Firebase لايف مية بالمية مصلح
  const handleSettleMatchPredictionsBulk = async () => {
    if (!selectedBulkMatchId) { alert("⚠️ يرجى اختيار المباراة أولاً من القائمة!"); return; }
    const score1 = parseInt(bulkScore1); const score2 = parseInt(bulkScore2);
    if (isNaN(score1) || isNaN(score2) || score1 < 0 || score2 < 0) { alert("⚠️ يرجى إدخال أهداف صحيحة!"); return; }

    setIsGlobalLoading(true);
    try {
      // 1. تثبيت وحفظ الترتيب السابق لجميع الأعضاء بـ Firebase قبل التحديث والمقارنة الحركية بالأسهم
      const usersSnap = await getDocs(query(collection(db, "users"), orderBy("points", "desc")));
      const currentOrderedUsers = usersSnap.docs.map((d, index) => ({ id: d.id, rank: index + 1, ...d.data() }));
      
      for (const u of currentOrderedUsers) {
        await updateDoc(doc(db, "users", u.id), { previousRank: u.rank });
      }

      // 2. الفرز السحابي وتوزيع النقاط على توقعات الأعضاء لايف
      const q = query(collection(db, "predictions"), where("matchId", "==", selectedBulkMatchId), where("processed", "==", false));
      const predSnap = await getDocs(q);
      
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
              total: (cur.total || 0) + 1, // إجمالي المشاركة لمنع الأصفار بجدول الصدارة
              correct: (cur.correct || 0) + isCorrect,
              wrong: (cur.wrong || 0) + isWrong
            });
            
            // تسجيل حقل الإشعارات غير المقروءة للجمهور Confetti
            await addDoc(collection(db, "user_notifications"), {
              userId: userDoc.id, user: pred.user, matchId: selectedBulkMatchId,
              pointsAwarded: earnedPoints, t1: pred.t1, t2: pred.t2, viewed: false, createdAt: new Date().toISOString()
            });
          }
          await updateDoc(doc(db, "predictions", predictionDoc.id), { processed: true, pointsAwarded: earnedPoints, matchTypeAwarded: p1 === score1 && p2 === score2 ? "full" : (earnedPoints === 1 ? "win" : "wrong") });
        }
      }

      // 3. إعادة حساب وحفظ اتجاه حركة المراكز rankDirection والـ rankChange بـ Firebase لايف مية بالمية للجمهور
      const freshUsersSnap = await getDocs(query(collection(db, "users"), orderBy("points", "desc")));
      freshUsersSnap.docs.forEach(async (d, index) => {
        const freshData = d.data();
        const currentRank = index + 1;
        const prevRank = freshData.previousRank || currentRank;
        let direction = "➖"; let change = 0;

        if (currentRank < prevRank) { direction = "⬆️"; change = prevRank - currentRank; }
        else if (currentRank > prevRank) { direction = "⬇️"; change = currentRank - prevRank; }

        await updateDoc(doc(db, "users", d.id), { currentRank: currentRank, rankDirection: direction, rankChange: change });
      });

      setBulkScore1(""); setBulkScore2(""); setSelectedMatchId("");
      alert("🎉 تم الفرز المركزي الجماعي وحفظ حركة المراكز بـ Firebase لايف للجمهور بنجاح!");
    } catch (err) { console.error(err); }
    setIsGlobalLoading(false);
  };

  const handleSaveCustomMatch = async (e: React.FormEvent) => {
    e.preventDefault(); setIsGlobalLoading(true);
    try {
      if (matchEditingId) {
        await updateDoc(doc(db, "custom_matches", matchEditingId), matchForm);
        setMatchEditingId(""); alert("✅ تم تحديث ونشر تعديل المباراة بصفحة الجمهور لايف!");
      } else {
        await addDoc(collection(db, "custom_matches"), { ...matchForm, createdAt: new Date().toISOString() });
        alert("✅ تم إضافة ونشر المباراة الجديدة للتوقع بنجاح!");
      }
      setMatchForm({ team1: "كندا", team1Emoji: "🇨🇦", team2: "البوسنة والهرسك", team2Emoji: "🇧🇦", day: "الجمعة 12 يونيو", group: "كأس العالم - دور المجموعات", time: "10:00 م", kickoff: "2026-06-12T22:00:00" });
    } catch (err) { console.error(err); }
    setIsGlobalLoading(false);
  };

  const handleUpdateUser = async (userId: string) => {
    setIsGlobalLoading(true);
    const matched = WORLD_CUP_2026_TEAMS.find(t => t.name === editTeam);
    await updateDoc(doc(db, "users", userId), { fullName: editName, password: editPassword, favoriteTeam: editTeam, teamEmoji: matched ? matched.emoji : "🏆" });
    setEditingUserId(""); setIsGlobalLoading(false); alert("✅ تم تحديث بيانات العضو بنجاح!");
  };

  const handleUpdateUserScoresManual = async (userId: string) => {
    setIsGlobalLoading(true);
    await updateDoc(doc(db, "users", userId), { points: Number(editPoints), total: Number(editTotal), correct: Number(editCorrect), wrong: Number(editWrong) });
    setScoreEditUserId(""); setIsGlobalLoading(false); alert("🏆 تم إجبار الحسبة وتحديث لوحة الصدارة يدوياً!");
  };

  const handleUndoPointsManual = async (pred: any) => {
    if (!pred.processed) return; setIsGlobalLoading(true);
    const uSnap = await getDocs(query(collection(db, "users"), where("fullName", "==", pred.user)));
    if (!uSnap.empty) {
      const uDoc = uSnap.docs[0]; const cur = uDoc.data();
      await updateDoc(doc(db, "users", uDoc.id), {
        points: Math.max((cur.points || 0) - (pred.pointsAwarded || 0), 0),
        total: Math.max((cur.total || 0) - 1, 0)
      });
      await updateDoc(doc(db, "predictions", pred.id), { processed: false, pointsAwarded: 0 });
      alert("↩️ تم التراجع وخصم النقاط بنجاح!");
    }
    setIsGlobalLoading(false);
  };

  // 🛠️ تثبيت دالة صيانة سرعة شريط التوقعات لمنع خطأ السطر 110 المعطل للـ Build
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
  const maxMatchPages = Math.ceil(matches.length / itemsPerPage);
  const maxChatPages = Math.ceil(chats.length / itemsPerPage);
  return (
    <div dir="rtl" className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-8 font-sans text-right select-none">
      <style>{`.interactive-btn:active { transform: scale(0.95); filter: brightness(1.2); } .hidden-scrollbar::-webkit-scrollbar { display: none; }`}</style>
      
      <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-6">
        <h1 className="text-xl md:text-2xl font-black text-amber-400">⚙️ لوحة قيادة وتحكم الآدمن الرسمية الشاملة</h1>
        {isGlobalLoading && <span className="text-xs bg-amber-500 text-slate-950 font-black px-3 py-1 rounded-full animate-pulse">جاري المزامنة السحابية لايف... ⏳</span>}
      </div>

      {/* 🚀 الصندوق المركزي المستقل للاحتساب الفوري الجماعي وحركة الترتيب */}
      <section className="bg-gradient-to-r from-purple-950 to-indigo-950 p-5 rounded-2xl border border-purple-500/30 mb-8 shadow-2xl">
        <h2 className="font-black text-xs md:text-sm text-white mb-2">⚡ الصندوق الذكي للاحتساب الفوري الجماعي للمباراة وحركة الترتيب السحابية</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-950/50 p-4 rounded-xl">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-purple-300 font-bold">اختر مباراة الفرز الجماعي:</label>
            <select value={selectedBulkMatchId} onChange={(e) => setSelectedMatchId(e.target.value)} className="bg-slate-900 text-white border border-purple-500/20 p-2.5 rounded-xl text-xs font-black focus:outline-none">
              <option value="">-- اضغط لاختيار المباراة الملعوبة --</option>
              {SETTLEMENT_MATCHES_LIST.map((m) => ( <option key={m.id} value={m.id}>{m.title}</option> ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 text-center">
            <label className="text-[11px] text-purple-300 font-bold">أهداف الأول:</label>
            <input type="number" min="0" className="bg-slate-900 text-green-400 text-center font-black p-2 rounded-xl border border-purple-500/20 text-sm" value={bulkScore1} onChange={(e) => setBulkScore1(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5 text-center">
            <label className="text-[11px] text-purple-300 font-bold">أهداف الثاني:</label>
            <input type="number" min="0" className="bg-slate-900 text-green-400 text-center font-black p-2 rounded-xl border border-purple-500/20 text-sm" value={bulkScore2} onChange={(e) => setBulkScore2(e.target.value)} />
          </div>
          <button onClick={handleSettleMatchPredictionsBulk} className="bg-gradient-to-r from-emerald-600 to-green-600 text-white font-black py-2.5 px-4 rounded-xl text-xs shadow-lg transition-all interactive-btn w-full">🚀 فرز نقاط وحركة الترتيب فوراَ</button>
        </div>
      </section>

      {/* 📅 قسم الطوارئ لإضافة مباريات التوقع ديناميكياً ونشرها لايف بالجمهور */}
      <section className="bg-slate-950 p-5 rounded-2xl border border-blue-500/20 mb-8 shadow-xl">
        <h3 className="font-black text-xs md:text-sm text-blue-400 mb-3 border-b border-slate-800 pb-1">📅 قسم الطوارئ: إضافة وجدولة مباريات التوقع يدوياً لايف بالجمهور</h3>
        <form onSubmit={handleSaveCustomMatch} className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/40 p-4 rounded-xl mb-4">
          <div><label className="block text-[10px] text-slate-400 mb-1">الفريق الأول</label><input type="text" value={matchForm.team1} onChange={(e)=>setMatchForm({...matchForm, team1: e.target.value})} className="w-full bg-slate-950 p-2 rounded-lg text-xs text-white" /></div>
          <div><label className="block text-[10px] text-slate-400 mb-1">علم الأول (إيموجي)</label><input type="text" value={matchForm.team1Emoji} onChange={(e)=>setMatchForm({...matchForm, team1Emoji: e.target.value})} className="w-full bg-slate-950 p-2 rounded-lg text-xs text-center" /></div>
          <div><label className="block text-[10px] text-slate-400 mb-1">الفريق الثاني</label><input type="text" value={matchForm.team2} onChange={(e)=>setMatchForm({...matchForm, team2: e.target.value})} className="w-full bg-slate-950 p-2 rounded-lg text-xs text-white" /></div>
          <div><label className="block text-[10px] text-slate-400 mb-1">علم الثاني (إيموجي)</label><input type="text" value={matchForm.team2Emoji} onChange={(e)=>setMatchForm({...matchForm, team2Emoji: e.target.value})} className="w-full bg-slate-950 p-2 rounded-lg text-xs text-center" /></div>
          <div className="col-span-2"><label className="block text-[10px] text-slate-400 mb-1">اليوم والتاريخ (نص)</label><input type="text" value={matchForm.day} onChange={(e)=>setMatchForm({...matchForm, day: e.target.value})} className="w-full bg-slate-950 p-2 rounded-lg text-xs text-white" /></div>
          <div><label className="block text-[10px] text-slate-400 mb-1">وقت المباراة</label><input type="text" value={matchForm.time} onChange={(e)=>setMatchForm({...matchForm, time: e.target.value})} className="w-full bg-slate-950 p-2 rounded-lg text-xs text-white" /></div>
          <div><label className="block text-[10px] text-slate-400 mb-1">وقت الإغلاق والتنازلي (ISO)</label><input type="text" value={matchForm.kickoff} onChange={(e)=>setMatchForm({...matchForm, kickoff: e.target.value})} className="w-full bg-slate-950 p-2 rounded-lg text-xs text-white" /></div>
          <div className="col-span-4 flex gap-2 pt-2">
            <button type="submit" className="w-full bg-blue-600 text-white font-black py-2 rounded-lg text-xs interactive-btn">{matchEditingId ? "تحديث ونشر التغييرات 💾" : "إضافة ونشر المباراة فوراً للجماهير 🚀"}</button>
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead><tr className="bg-slate-900 text-slate-400 border-b border-slate-800"><th className="p-2 text-right">المباراة المنشورة يدوياً</th><th className="p-2">التوقيت</th><th className="p-2">الإجراءات</th></tr></thead>
            <tbody className="divide-y divide-slate-900">
              {matches.slice((matchPage - 1) * itemsPerPage, matchPage * itemsPerPage).map((m) => (
                <tr key={m.id} className="hover:bg-slate-900/30">
                  <td className="p-2 text-right font-black text-white">{m.team1Emoji} {m.team1} vs {m.team2} {m.team2Emoji}</td>
                  <td className="p-2 font-bold text-purple-300">{m.day} الساعة {m.time}</td>
                  <td className="p-2 flex gap-1 justify-center">
                    <button onClick={()=>{setMatchEditingId(m.id); setMatchForm({team1:m.team1, team1Emoji:m.team1Emoji, team2:m.team2, team2Emoji:m.team2Emoji, day:m.day, group:m.group, time:m.time, kickoff:m.kickoff});}} className="bg-blue-600 px-2.5 py-1 rounded text-[10px] interactive-btn">تعديل ⚙️</button>
                    <button onClick={async()=>{if(confirm("حذف هذه المباراة من صفحة الجمهور نهائياً؟")) await deleteDoc(doc(db,"custom_matches",m.id))}} className="bg-red-600 px-2.5 py-1 rounded text-[10px] interactive-btn">حذف 🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {maxMatchPages > 1 && (
          <div className="flex justify-center items-center gap-4 pt-3 border-t border-slate-800 mt-3 text-xs font-bold">
            <button onClick={()=>setMatchPage(p=>Math.max(p-1,1))} disabled={matchPage === 1} className="bg-slate-800 px-3 py-1 rounded disabled:opacity-30">◀ السابق</button>
            <span className="text-slate-400">صفحة {matchPage} من {maxMatchPages}</span>
            <button onClick={()=>setMatchPage(p=>Math.min(p+1,maxMatchPages))} disabled={matchPage === maxMatchPages} className="bg-slate-800 px-3 py-1 rounded disabled:opacity-30">التالي ▶</button>
          </div>
        )}
      </section>

      {/* شريط التحكم بالسرعة للجمهور */}
      <section className="bg-slate-950 p-4 rounded-xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div><h3 className="font-black text-xs text-purple-300">⚙️ التحكم بسرعة شريط التوقعات بصفحة الجمهور</h3></div>
        <div className="flex gap-2">
          <select value={tickerSpeed} onChange={(e) => setTickerSpeed(e.target.value)} className="bg-slate-900 border p-2 rounded-lg text-xs text-white focus:outline-none"><option value="15s">سريع (15ث)</option><option value="30s">متوسط (30ث)</option><option value="50s">بطيء (50ث)</option></select>
          <button onClick={handleUpdateTickerSpeed} className="bg-purple-600 px-4 py-2 rounded-lg text-xs font-black interactive-btn">تحديث ⚡</button>
        </div>
      </section>

      {/* 👥 التحكم الكامل بالأعضاء وقوائم الأعلام المنسدلة الذكية (20 اسماً في الصفحة) */}
      <section className="bg-slate-950 p-4 rounded-xl mb-6 shadow-xl">
        <h3 className="font-black text-xs text-amber-400 mb-3 border-b border-slate-800 pb-1">👤 التحكم الكامل بالأعضاء وبينات الحسابات ({users.length} عضو)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead><tr className="bg-slate-900 text-slate-400 border-b border-slate-800"><th className="p-2 text-right">الاسم</th><th className="p-2">الرمز السري</th><th className="p-2">المنتخب المرشح لللقب</th><th className="p-2">الإجراء</th></tr></thead>
            <tbody className="divide-y divide-slate-900">
              {users.slice((userPage - 1) * itemsPerPage, userPage * itemsPerPage).map((u) => (
                <tr key={u.id} className="hover:bg-slate-900/40">
                  <td className="p-2 text-right font-bold">{editingUserId === u.id ? <input type="text" className="bg-slate-900 border px-2 py-0.5 rounded text-white" value={editName} onChange={(e)=>setEditName(e.target.value)} /> : u.fullName}</td>
                  <td className="p-2 font-mono">{editingUserId === u.id ? <input type="text" className="bg-slate-900 border px-2 py-0.5 rounded text-center text-white" value={editPassword} onChange={(e)=>setEditPassword(e.target.value)} /> : u.password}</td>
                  <td className="p-2">
                    {editingUserId === u.id ? (
                      <select value={editTeam} onChange={(e)=>setEditTeam(e.target.value)} className="bg-slate-900 text-white border border-slate-700 rounded px-2 py-1 text-xs focus:outline-none">
                        {WORLD_CUP_2026_TEAMS.map((t, idx) => ( <option key={idx} value={t.name}>{t.emoji} {t.name}</option> ))}
                      </select>
                    ) : ( <span className="font-bold text-purple-300">{u.teamEmoji} {u.favoriteTeam}</span> )}
                  </td>
                  <td className="p-2 flex gap-1 justify-center">
                    {editingUserId === u.id ? <button onClick={()=>handleUpdateUser(u.id)} className="bg-green-600 px-2 py-1 rounded text-[10px] font-black interactive-btn">حفظ 💾</button> : <button onClick={()=>{setEditingUserId(u.id); setEditName(u.fullName); setEditPassword(u.password); setEditTeam(u.favoriteTeam);}} className="bg-blue-600 px-2 py-1 rounded text-[10px] font-black interactive-btn">تعديل ⚙️</button>}
                    <button onClick={async ()=>{if(confirm("حذف؟")) await deleteDoc(doc(db,"users",u.id))}} className="bg-red-600 px-2 py-1 rounded text-[10px] font-black interactive-btn">حذف 🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {maxUserPages > 1 && (
          <div className="flex justify-center items-center gap-4 pt-3 border-t border-slate-800 mt-3 text-xs font-bold">
            <button onClick={()=>setUserPage(p=>Math.max(p-1,1))} disabled={userPage === 1} className="bg-slate-800 px-3 py-1 rounded disabled:opacity-30">◀ السابق</button>
            <span className="text-slate-400">صفحة {userPage} من {maxUserPages}</span>
            <button onClick={()=>setUserPage(p=>Math.min(p+1,maxUserPages))} disabled={userPage === maxUserPages} className="bg-slate-800 px-3 py-1 rounded disabled:opacity-30">التالي ▶</button>
          </div>
        )}
      </section>

      {/* 📊 تعديل يدوي مباشر لإحصائيات الصدارة */}
      <section className="bg-slate-950 p-4 rounded-xl mb-6 border border-amber-500/20 shadow-xl">
        <h3 className="font-black text-xs text-amber-400 mb-3 border-b border-slate-800 pb-1">📊 قسم تعديل وإجبار إحصائيات الصدارة يدوياً (يعرض 20 اسماً)</h3>
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
            <button onClick={()=>setLeaderboardPage(p=>Math.max(p-1,1))} disabled={leaderboardPage === 1} className="bg-slate-800 px-3 py-1 rounded disabled:opacity-30">◀ السابق</button>
            <span className="text-slate-400">صفحة {leaderboardPage} من {maxLeaderboardPages}</span>
            <button onClick={()=>setLeaderboardPage(p=>Math.min(p+1,maxLeaderboardPages))} disabled={leaderboardPage === maxLeaderboardPages} className="bg-slate-800 px-3 py-1 rounded disabled:opacity-30">التالي ▶</button>
          </div>
        )}
      </section>

      {/* قائمة وجدول توقعات الجماهير (20 توقعاً في الصفحة) */}
      <section className="bg-slate-950 p-4 rounded-xl mb-6 shadow-xl">
        <h3 className="font-black text-xs text-green-400 mb-3 border-b border-slate-800 pb-1">🧮 قائمة وجدول توقعات الجماهير الحالية (يعرض 20 توقعاً)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead><tr className="bg-slate-900 text-slate-400 border-b border-slate-800"><th className="p-2 text-right">العضو</th><th className="p-2">المباراة</th><th className="p-2">التوقع</th><th className="p-2">الحالة</th><th className="p-2">التحكم والتراجع عن الحسبة</th></tr></thead>
            <tbody className="divide-y divide-slate-900 font-bold">
              {predictions.slice((predPage - 1) * itemsPerPage, predPage * itemsPerPage).map((p) => (
                <tr key={p.id} className="hover:bg-slate-900/40">
                  <td className="p-2 text-right">👤 {p.user}</td>
                  <td className="p-2 text-purple-300">{p.t1} vs {p.t2}</td>
                  <td className="p-2 text-green-400 font-mono">{p.score1} - {p.score2}</td>
                  <td className="p-2">{p.processed ? <span className="text-green-500 font-black">حُسبت بالصندوق الرئيسي</span> : <span className="text-amber-500 font-black">بانتظار الفرز بالصندوق العلوي ⏰</span>}</td>
                  <td className="p-2 flex gap-1 justify-center">
                    {p.processed && <button onClick={() => handleUndoPointsManual(p)} className="bg-orange-600 text-white font-black px-3 py-0.5 rounded text-[10px] interactive-btn shadow-md">↩️ تراجع عن الحسبة</button>}
                    <button onClick={async ()=>{if(confirm("حذف؟")) await deleteDoc(doc(db,"predictions",p.id))}} className="bg-red-600 px-2 py-0.5 rounded text-[10px] interactive-btn">حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {maxPredPages > 1 && (
          <div className="flex justify-center items-center gap-4 pt-3 border-t border-slate-800 mt-3 text-xs font-bold">
            <button onClick={()=>setPredPage(p=>Math.max(p-1,1))} disabled={predPage === 1} className="bg-slate-800 px-3 py-1 rounded disabled:opacity-30">◀ السابق</button>
            <span className="text-slate-400">صفحة {predPage} من {maxPredPages}</span>
            <button onClick={()=>setPredPage(p=>Math.min(p+1,maxPredPages))} disabled={predPage === maxPredPages} className="bg-slate-800 px-3 py-1 rounded disabled:opacity-30">التالي ▶</button>
          </div>
        )}
      </section>

      {/* الرقابة على الشات للجمهور */}
      <section className="bg-slate-950 p-4 rounded-xl shadow-xl">
        <h3 className="font-black text-xs text-red-400 mb-2 border-b border-slate-800 pb-1">💬 القسم الرابع: الرقابة والتحكم بـ شات صفحة الجمهور (يعرض 20 رسالة)</h3>
        <div className="space-y-2 mb-3">
          {chats.slice((chatPage - 1) * itemsPerPage, chatPage * itemsPerPage).map((c) => (
            <div key={c.id} className="bg-slate-900 p-2 rounded-lg flex items-center justify-between text-xs">
              <div><span className="font-black text-purple-400">👤 {c.user}:</span> <span className="text-slate-200 font-medium">{c.text}</span></div>
              <button onClick={async()=>await deleteDoc(doc(db,"chats",c.id))} className="bg-red-900/50 text-red-300 px-2 py-0.5 rounded font-bold interactive-btn">حذف رسالة ✕</button>
            </div>
          ))}
        </div>
        {maxChatPages > 1 && (
          <div className="flex justify-center items-center gap-4 pt-3 border-t border-slate-800 mt-3 text-xs font-bold">
            <button onClick={()=>setChatPage(p=>Math.max(p-1,1))} disabled={chatPage === 1} className="bg-slate-800 px-3 py-1 rounded disabled:opacity-30">◀ السابق</button>
            <span className="text-slate-400">صفحة {chatPage} من {maxChatPages}</span>
            <button onClick={()=>setChatPage(p=>Math.min(p+1,maxChatPages))} disabled={chatPage === maxChatPages} className="bg-slate-800 px-3 py-1 rounded disabled:opacity-30">التالي ▶</button>
          </div>
        )}
      </section>
    </div>
  );
}