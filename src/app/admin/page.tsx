"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, orderBy, getDocs, doc, updateDoc, deleteDoc, where, addDoc } from "firebase/firestore";

// 🕋 الداتابيز المركزية الرسمية والنهائية الـ 49 مباراة كاملة مية بالمية لضمان دقة الفلترة والصندوق المركزي بالـ matchId
const MASTER_OFFICIAL_ADMIN_FIXTURES = [
  { id: "wc_01", title: "🇲🇽 المكسيك ضد جنوب أفريقيا 🇿🇦 (المجموعة أ)" },
  { id: "wc_02", title: "🇨🇦 كندا ضد البوسنة والهرسك 🇧🇦 (المجموعة ب)" },
  { id: "wc_03", title: "🇺🇸 الولايات المتحدة ضد باراغواي 🇵🇾 (المجموعة د)" },
  { id: "wc_04", title: "🇶🇦 قطر ضد سويسرا 🇨🇭 (المجموعة ب)" },
  { id: "wc_05", title: "🇧🇷 البرازيل ضد المغرب 🇲🇦 (المجموعة ج)" },
  { id: "wc_06", title: "🇭🇹 هايتي ضد اسكتلندا 🏴󠁧󠁢󠁳󠁣󠁴󠁿 (المجموعة ج)" },
  { id: "wc_07", title: "🇦🇺 أستراليا ضد تركيا 🇹🇷 (المجموعة د)" },
  { id: "wc_08", title: "🇩🇪 ألمانيا ضد كوراساو 🇨🇼 (المجموعة هـ)" },
  { id: "wc_09", title: "🇳🇱 هولندا ضد اليابان 🇯🇵 (المجموعة و)" },
  { id: "wc_10", title: "🇨🇮 ساحل العاج ضد الإكوادور 🇪🇨 (المجموعة هـ)" },
  { id: "wc_11", title: "🇸🇪 السويد ضد تونس 🇹🇳 (المجموعة و)" },
  { id: "wc_12", title: "🇪🇸 إسبانيا ضد الرأس الأخضر 🇨🇻 (المجموعة ح)" },
  { id: "wc_13", title: "🇧🇪 بلجيكا ضد مصر 🇪🇬 (المجموعة ر)" },
  { id: "wc_14", title: "🇸🇦 السعودية ضد أوروغواي 🇺🇾 (المجموعة ح)" },
  { id: "wc_15", title: "🇮🇷 إيران ضد نيوزيلندا 🇳🇿 (المجموعة ر)" },
  { id: "wc_16", title: "🇫🇷 فرنسا ضد السنغال 🇸🇳 (المجموعة ط)" },
  { id: "wc_17", title: "🇮🇶 العراق ضد النرويج 🇳🇴 (المجموعة ط)" },
  { id: "wc_18", title: "🇦🇷 الأرجنتين ضد الجزائر 🇩🇿 (المجموعة ي)" },
  { id: "wc_19", title: "🇦🇹 النمسا ضد الأردن 🇯🇴 (المجموعة ي)" },
  { id: "wc_20", title: "🇵🇹 البرتغال ضد الكونغو الديمقراطية 🇨🇩 (المجموعة ك)" },
  { id: "wc_21", title: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 إنجلترا ضد كرواتيا 🇭🇷 (المجموعة ل)" },
  { id: "wc_22", title: "🇺🇿 أوزبكستان ضد كولومبيا 🇨🇴 (المجموعة ك)" },
  { id: "wc_23", title: "🇬🇭 غانا ضد بنما 🇵🇦 (المجموعة ل)" },
  { id: "wc_24", title: "🇲🇽 المكسيك ضد كوريا الجنوبية 🇰🇷 (المجموعة أ)" },
  { id: "wc_25", title: "🇨🇦 كندا ضد قطر 🇶🇦 (المجموعة ب)" },
  { id: "wc_26", title: "🇺🇸 الولايات المتحدة ضد أستراليا 🇦🇺 (المجموعة د)" },
  { id: "wc_27", title: "🇧🇷 البرازيل ضد هايتي 🇭🇹 (المجموعة ج)" },
  { id: "wc_28", title: "🏴󠁧󠁢󠁳󠁣󠁴󠁿 اسكتلندا ضد المغرب 🇲🇦 (المجموعة ج)" },
  { id: "wc_29", title: "🇳🇱 هولندا ضد السويد 🇸🇪 (المجموعة و)" },
  { id: "wc_30", title: "🇹🇷 تركيا ضد باراغواي 🇵🇾 (المجموعة د)" },
  { id: "wc_31", title: "🇩🇪 ألمانيا ضد ساحل العاج 🇨🇮 (المجموعة هـ)" },
  { id: "wc_32", title: "🇹🇳 تونس ضد اليابان 🇯🇵 (المجموعة و)" },
  { id: "wc_33", title: "🇪🇨 الإكوادور ضد كوراساو 🇨🇼 (المجموعة هـ)" },
  { id: "wc_34", title: "🇧🇪 بلجيكا ضد إيران 🇮🇷 (المجموعة ر)" },
  { id: "wc_35", title: "🇪🇸 إسبانيا ضد السعودية 🇸🇦 (المجموعة ح)" },
  { id: "wc_36", title: "🇺🇾 أوروغواي ضد الرأس الأخضر 🇨🇻 (المجموعة ح)" },
  { id: "wc_37", title: "🇳🇿 نيوزيلندا ضد مصر 🇪🇬 (المجموعة ر)" },
  { id: "wc_38", title: "🇦🇷 الأرجنتين ضد النمسا 🇦🇹 (المجموعة ي)" },
  { id: "wc_39", title: "🇫🇷 فرنسا ضد العراق 🇮🇶 (المجموعة ط)" },
  { id: "wc_40", title: "🇳🇴 النرويج ضد السنغال 🇸🇳 (المجموعة ط)" },
  { id: "wc_41", title: "🇵🇹 البرتغال ضد أوزبكستان 🇺🇿 (المجموعة ك)" },
  { id: "wc_42", title: "🇯🇴 الأردن ضد الجزائر 🇩🇿 (المجموعة ي)" },
  { id: "wc_43", title: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 إنجلترا ضد غانا 🇬🇭 (المجموعة ل)" },
  { id: "wc_44", title: "🇨🇴 كولومبيا ضد الكونغو الديمقراطية 🇨🇩 (المجموعة ك)" },
  { id: "wc_45", title: "🇵🇦 بنما ضد كرواتيا 🇭🇷 (المجموعة ل)" },
  { id: "wc_46", title: "🇧🇦 البوسنة والهرسك ضد قطر 🇶🇦 (المجموعة ب)" },
  { id: "wc_47", title: "🇨🇭 سويسرا ضد كندا 🇨🇦 (المجموعة ب)" },
  { id: "wc_48", title: "🇿🇦 جنوب أفريقيا ضد كوريا الجنوبية 🇰🇷 (المجموعة أ)" },
  { id: "wc_49", title: "🇰🇷 كوريا الجنوبية ضد التشيك 🇨🇿 (المجموعة أ)" }
];

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [sortedPointsUsers, setSortedPointsUsers] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);

  // 1️⃣ حقول صندوق الاحتساب الفوري المركزي
  const [selectedBulkMatchId, setSelectedMatchId] = useState("");
  const [bulkScore1, setBulkScore1] = useState("");
  const [bulkScore2, setBulkScore2] = useState("");

  // 2️⃣ حقول تعديل الحسابات والبيانات الأساسية
  const [editingUserId, setEditingUserId] = useState("");
  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editTeam, setEditTeam] = useState("");

  // 3️⃣ حقول إجبار الإحصائيات يدوياً
  const [scoreEditUserId, setScoreEditUserId] = useState("");
  const [editPoints, setEditPoints] = useState(0);
  const [editTotal, setEditTotal] = useState(0);
  const [editCorrect, setEditCorrect] = useState(0);
  const [editWrong, setEditWrong] = useState(0);

  // 4️⃣ أدوات الفلترة والبحث المتقدمة والدقيقة مية بالمية لقسم توقعات الجمهور
  const [filterMatchId, setFilterMatchId] = useState("");
  const [searchMemberName, setSearchMemberName] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // عدادات تصفح الـ 20 عنصراً المستقرة لجميع الجداول بدون اختفاء
  const [userPage, setUserPage] = useState(1);
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const [predPage, setPredPage] = useState(1);
  const itemsPerPage = 20;
  useEffect(() => {
    onSnapshot(query(collection(db, "users"), orderBy("createdAt", "desc")), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    onSnapshot(query(collection(db, "users"), orderBy("points", "desc")), (snap) => {
      setSortedPointsUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    onSnapshot(query(collection(db, "predictions"), orderBy("createdAt", "desc")), (snap) => {
      setPredictions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // 🚨 أولاً: دالة التصفير المطلق المقترحة (تصفير فقط إلى صِفر وبدون أي احتساب مباريات سابق)
  const handleWipeAllUsersStatsToZeroAbsolute = async () => {
    if (!confirm("🚨 تحذير حاسم: هل أنت متأكد من تصفير جميع إحصائيات ونقاط وتوقعات كل الأعضاء بالكامل في قاعدة البيانات إلى صِفر؟")) return;
    setIsGlobalLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      for (const uDoc of usersSnap.docs) {
        await updateDoc(doc(db, "users", uDoc.id), { points: 0, total: 0, correct: 0, wrong: 0, currentRank: 1, rankDirection: "➖", rankChange: 0, previousRank: 1 });
      }
      const predSnap = await getDocs(collection(db, "predictions"));
      for (const pDoc of predSnap.docs) {
        await updateDoc(doc(db, "predictions", pDoc.id), { processed: false, pointsAwarded: 0, statusType: "uncalculated" });
      }
      alert("🚨 تم التصفير المطلق لجميع البيانات سحابياً بنجاح تام!");
    } catch (err) { console.error(err); }
    setIsGlobalLoading(false);
  };

  // 🧹 ثانياً: دالة التصفير الفردي المستحدثة بجانب كل عضو لتصفير مستخدم واحد فقط بالملي
  const handleWipeSingleUserStatsToZero = async (userId: string) => {
    if (!confirm("🗑️ هل تريد تصفير نقاط وإحصائيات هذا العضو الفردي فقط؟")) return;
    setIsGlobalLoading(true);
    try {
      await updateDoc(doc(db, "users", userId), { points: 0, total: 0, correct: 0, wrong: 0, rankDirection: "➖", rankChange: 0 });
      alert("🧹 تم تصفير إحصائيات العضو بنجاح لايف!");
    } catch (err) { console.error(err); }
    setIsGlobalLoading(false);
  };

  // 🚀 ثالثاً: دالة محرك صندوق الاحتساب الفوري الموحد بالـ matchId (فرز العدادات الأربعة معاً لايف)
  const handleSettleMatchPredictionsBulk = async () => {
    if (!selectedBulkMatchId) { alert("⚠️ يرجى اختيار المباراة أولاً!"); return; }
    const score1 = parseInt(bulkScore1); const score2 = parseInt(bulkScore2);
    if (isNaN(score1) || isNaN(score2) || score1 < 0 || score2 < 0) { alert("⚠️ النتيجة غير صحيحة!"); return; }

    setIsGlobalLoading(true);
    try {
      const usersSnap = await getDocs(query(collection(db, "users"), orderBy("points", "desc")));
      const currentOrderedUsers = usersSnap.docs.map((d, index) => ({ id: d.id, rank: index + 1, ...d.data() }));
      for (const u of currentOrderedUsers) { await updateDoc(doc(db, "users", u.id), { previousRank: u.rank }); }

      // جلب توقعات الأعضاء المطابقة تماماً مية بالمية للـ matchId المختار لمنع سحب لقاءات أخرى
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
            // تحديث مترابط وشامل لكافة العدادات الأربعة معاً في نفس السطر سحابياً
            await updateDoc(doc(db, "users", userDoc.id), {
              points: (cur.points || 0) + earnedPoints,
              total: (cur.total || 0) + 1,
              correct: (cur.correct || 0) + isCorrect,
              wrong: (cur.wrong || 0) + isWrong
            });
          }
          await updateDoc(doc(db, "predictions", predictionDoc.id), { processed: true, pointsAwarded: earnedPoints, statusType: earnedPoints === 3 ? "full" : (earnedPoints === 1 ? "win" : "wrong"), bulkSettleScore1: score1, bulkSettleScore2: score2, oldIsCorrect: isCorrect, oldIsWrong: isWrong });
          settledCount++;
        }
      }

      // حساب تحديث حركات المراكز من المركز الأول #1
      const freshUsersSnap = await getDocs(query(collection(db, "users"), orderBy("points", "desc")));
      let rankCounter = 1;
      for (const d of freshUsersSnap.docs) {
        const freshData = d.data(); const currentRank = rankCounter++;
        const prevRank = freshData.previousRank || currentRank;
        let direction = "➖"; let change = 0;
        if (currentRank < prevRank) { direction = "⬆️"; change = prevRank - currentRank; }
        else if (currentRank > prevRank) { direction = "⬇️"; change = currentRank - prevRank; }
        await updateDoc(doc(db, "users", d.id), { currentRank: currentRank, rankDirection: direction, rankChange: change });
      }

      setBulkScore1(""); setBulkScore2(""); setSelectedMatchId("");
      alert(`🎉 تم الاحتساب الجماعي لـ (${settledCount}) توقع بالـ matchId بنجاح كامل وتحديث العدادات الكلية لايف!`);
    } catch (err) { console.error(err); }
    setIsGlobalLoading(false);
  };

  // 🧮 رابعاً: معالجة الاحتساب اليدوي الثلاثي (بالملي/الفائز/خطأ) واستبدال الداتا السابقة وحساب التوقعات
  const handleSettlePredictionSingleManualOldWay = async (pred: any, buttonScoreType: "full" | "win" | "wrong") => {
    let earnedPoints = 0; let isCorrect = 0; let isWrong = 0;
    if (buttonScoreType === "full") { earnedPoints = 3; isCorrect = 1; }
    else if (buttonScoreType === "win") { earnedPoints = 1; isCorrect = 1; }
    else { isWrong = 1; }

    setIsGlobalLoading(true);
    try {
      const uSnap = await getDocs(query(collection(db, "users"), where("fullName", "==", pred.user)));
      if (!uSnap.empty) {
        const uDoc = uSnap.docs[0]; const cur = uDoc.data();
        
        // جلب الداتا والفرز القديم لنفس التوقع وطرحه أولاً لاستبداله تماماً ومنع تدبيل الأرقام
        const oldPoints = pred.pointsAwarded || 0;
        const oldCorrect = pred.oldIsCorrect || 0;
        const oldWrong = pred.oldIsWrong || 0;

        await updateDoc(doc(db, "users", uDoc.id), {
          points: Math.max(((cur.points || 0) - oldPoints) + earnedPoints, 0),
          total: pred.processed ? (cur.total || 0) : (cur.total || 0) + 1, // زيادة عدد التوقعات تلقائياً
          correct: Math.max(((cur.correct || 0) - oldCorrect) + isCorrect, 0),
          wrong: Math.max(((cur.wrong || 0) - oldWrong) + isWrong, 0)
        });

        await updateDoc(doc(db, "predictions", pred.id), { 
          processed: true, pointsAwarded: earnedPoints, statusType: buttonScoreType, oldIsCorrect: isCorrect, oldIsWrong: isWrong 
        });
        alert(`✓ تم استبدال الفرز وتحديث العدادات الأربعة بنجاح للعضو: ${pred.user}`);
      }
    } catch (err) { console.error(err); }
    setIsGlobalLoading(false);
  };
  const handleUpdateUser = async (userId: string) => {
    setIsGlobalLoading(true);
    await updateDoc(doc(db, "users", userId), { fullName: editName, password: editPassword, favoriteTeam: editTeam });
    setEditingUserId(""); setIsGlobalLoading(false); alert("✅ تم التعديل لايف!");
  };

  const handleUpdateUserScoresManual = async (userId: string) => {
    setIsGlobalLoading(true);
    await updateDoc(doc(db, "users", userId), { points: Number(editPoints), total: Number(editTotal), correct: Number(editCorrect), wrong: Number(editWrong) });
    setScoreEditUserId(""); setIsGlobalLoading(false); alert("🏆 تم تحديث الإحصائيات يدوياً!");
  };

  const handleResetAllFiltersButton = () => { setFilterMatchId(""); setSearchMemberName(""); setFilterStatus("all"); };

  // 🔍 تـصحيح الفلترة والبحث الاحترافي مية بالمية: ربط دقيق عن طريق الـ matchId الثابت ومطابقة الاسم
  const filteredPredictionsList = predictions.filter((p) => {
    const matchesMatch = filterMatchId ? p.matchId === filterMatchId : true;
    const matchesName = searchMemberName.trim() ? p.user.toLowerCase().includes(searchMemberName.toLowerCase()) : true;
    
    let matchesStatus = true;
    if (filterStatus === "full") matchesStatus = p.processed && p.statusType === "full";
    else if (filterStatus === "win") matchesStatus = p.processed && p.statusType === "win";
    else if (filterStatus === "wrong") matchesStatus = p.processed && p.statusType === "wrong";
    else if (filterStatus === "uncalculated") matchesStatus = !p.processed || p.statusType === "uncalculated";

    return matchesMatch && matchesName && matchesStatus;
  });

  const maxUserPages = Math.ceil(users.length / itemsPerPage);
  const maxLeaderboardPages = Math.ceil(sortedPointsUsers.length / itemsPerPage);
  const maxPredPages = Math.ceil(filteredPredictionsList.length / itemsPerPage);
  return (
    <div dir="rtl" className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-8 font-sans text-right select-none">
      <style>{`.interactive-btn:active { transform: scale(0.95); filter: brightness(1.2); }`}</style>
      
      <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-700 pb-4 mb-6 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-amber-400">⚙️ لوحة قيادة تحكم الآدمن المصلحة بالكامل</h1>
          <p className="text-xs text-slate-400 mt-1">احتساب دقيق ومحمي مية بالمية مربوط بالـ matchId لمنع التداخل واللخبطة</p>
        </div>
        <button onClick={handleWipeAllUsersStatsToZeroAbsolute} className="bg-red-700 hover:bg-red-600 text-white font-black px-4 py-2.5 rounded-xl text-xs shadow-xl transition-all interactive-btn animate-pulse">
          🚨 تصفير الداتا الكلي السحابي المطلق (إلى صِفر 0)
        </button>
      </div>

      {/* 🚀 صندوق الاحتساب الفوري الجماعي المركزي المربوط بالـ matchId */}
      <section className="bg-gradient-to-r from-purple-950 to-indigo-950 p-5 rounded-2xl border border-purple-500/30 mb-8 shadow-2xl">
        <h2 className="font-black text-xs md:text-sm text-white mb-2">⚡ صندوق الاحتساب الفوري الجماعي والمسح السحابي الذكي عضو عضو بالمعرّف الفريد الثابت (matchId)</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-950/50 p-4 rounded-xl">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-purple-300 font-bold">اختر لقاء الفرز الجماعي الدقيق:</label>
            <select value={selectedBulkMatchId} onChange={(e) => setSelectedMatchId(e.target.value)} className="bg-slate-900 text-white border border-purple-500/20 p-2.5 rounded-xl text-xs font-black focus:outline-none">
              <option value="">-- اضغط لاختيار المباراة الملعوبة --</option>
              {MASTER_OFFICIAL_ADMIN_FIXTURES.map((m) => ( <option key={m.id} value={m.id}>{m.title}</option> ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 text-center">
            <label className="text-[11px] text-purple-300 font-bold">أهداف الأول:</label>
            <input type="number" min="0" className="w-full bg-slate-900 text-green-400 text-center font-black p-2 rounded-xl border border-purple-500/20 text-sm focus:outline-none" value={bulkScore1} onChange={(e) => setBulkScore1(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5 text-center">
            <label className="text-[11px] text-purple-300 font-bold">أهداف الثاني:</label>
            <input type="number" min="0" className="w-full bg-slate-900 text-green-400 text-center font-black p-2 rounded-xl border border-purple-500/20 text-sm focus:outline-none" value={bulkScore2} onChange={(e) => setBulkScore2(e.target.value)} />
          </div>
          <button onClick={handleSettleMatchPredictionsBulk} className="bg-gradient-to-r from-emerald-600 to-green-600 text-white font-black py-2.5 px-4 rounded-xl text-xs shadow-lg transition-all interactive-btn w-full">🚀 فرز اللقاء وحركة المراكز فوراَ</button>
        </div>
      </section>

      {/* 👥 قسم التحكم بالحسابات والأعضاء */}
      <section className="bg-slate-950 p-4 rounded-xl mb-8 shadow-xl">
        <h3 className="font-black text-xs text-amber-400 mb-3 border-b border-slate-800 pb-1">👤 التحكم بالأعضاء وبينات الحسابات (التسلسل من الأحدث مسجلاً إلى الأقدم تلقائياً 🟢)</h3>
        <div className="overflow-x-auto min-h-[200px]">
          <table className="w-full text-xs text-center border-collapse">
            <thead><tr className="bg-slate-900 text-slate-400 border-b border-slate-800"><th className="p-2 text-right">الاسم</th><th className="p-2">الرمز السري</th><th className="p-2">المنتخب المرشح لللقب</th><th className="p-2">الإجراء والتحكم</th></tr></thead>
            <tbody className="divide-y divide-slate-900">
              {users.slice((userPage - 1) * itemsPerPage, userPage * itemsPerPage).map((u) => (
                <tr key={u.id} className="hover:bg-slate-900/40">
                  <td className="p-2 text-right font-bold">{editingUserId === u.id ? <input type="text" className="bg-slate-900 border px-2 py-0.5 rounded text-white focus:outline-none" value={editName} onChange={(e)=>setEditName(e.target.value)} /> : u.fullName}</td>
                  <td className="p-2 font-mono">{editingUserId === u.id ? <input type="text" className="bg-slate-900 border px-2 py-0.5 rounded text-center text-white focus:outline-none" value={editPassword} onChange={(e)=>setEditPassword(e.target.value)} /> : u.password}</td>
                  <td className="p-2">
                    {editingUserId === u.id ? <input type="text" className="bg-slate-900 border px-2 py-0.5 rounded text-center text-white focus:outline-none" value={editTeam} onChange={(e)=>setEditTeam(e.target.value)} /> : <span className="font-bold text-purple-300">{u.teamEmoji} {u.favoriteTeam}</span>}
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

      {/* 📊 قسم إجبار وتعديل الإحصائيات يدوياً مع حقن زر التصفير الفردي الجديد */}
      <section className="bg-slate-950 p-4 rounded-xl mb-8 border border-amber-500/20 shadow-xl">
        <h3 className="font-black text-xs text-amber-400 mb-3 border-b border-slate-800 pb-1">📊 قسم تعديل وإجبار إحصائيات الصدارة يدوياً (التسلسل بالأعلى نقاطاً فالأقل وحقن التصفير الفردي 🏆)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <th className="p-2 text-right">العضو المشترك</th>
                <th className="p-2">إجمالي التوقعات</th>
                <th className="p-2 text-green-400">الصح</th>
                <th className="p-2 text-red-400">الخطأ</th>
                <th className="p-2 text-yellow-400">النقاط الكلية</th>
                <th className="p-2">التحكم اليدوي المباشر والفرز الفردي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 font-bold">
              {sortedPointsUsers.slice((leaderboardPage - 1) * itemsPerPage, leaderboardPage * itemsPerPage).map((u) => (
                <tr key={u.id} className="hover:bg-purple-950/10">
                  <td className="p-2 text-right text-white">👤 {u.fullName} {u.teamEmoji}</td>
                  <td className="p-2">{scoreEditUserId === u.id ? <input type="number" className="w-14 bg-slate-900 border text-center text-white focus:outline-none" value={editTotal} onChange={(e)=>setEditTotal(Number(e.target.value))} /> : u.total || 0}</td>
                  <td className="p-2 text-green-400">{scoreEditUserId === u.id ? <input type="number" className="w-14 bg-slate-900 border text-center text-green-400 focus:outline-none" value={editCorrect} onChange={(e)=>setEditCorrect(Number(e.target.value))} /> : u.correct || 0}</td>
                  <td className="p-2 text-red-400">{scoreEditUserId === u.id ? <input type="number" className="w-14 bg-slate-900 border text-center text-red-400 focus:outline-none" value={editWrong} onChange={(e)=>setEditWrong(Number(e.target.value))} /> : u.wrong || 0}</td>
                  <td className="p-2 text-amber-400 font-black">{scoreEditUserId === u.id ? <input type="number" className="w-14 bg-slate-900 border text-center text-amber-400 focus:outline-none" value={editPoints} onChange={(e)=>setEditPoints(Number(e.target.value))} /> : u.points || 0}</td>
                  <td className="p-2">
                    <div className="flex gap-1 justify-center items-center">
                      {scoreEditUserId === u.id ? <button onClick={()=>handleUpdateUserScoresManual(u.id)} className="bg-emerald-600 px-3 py-1 rounded text-[10px] font-black interactive-btn">تحديث 💾</button> : <button onClick={()=>{setScoreEditUserId(u.id); setEditTotal(u.total || 0); setEditCorrect(u.correct || 0); setEditWrong(u.wrong || 0); setEditPoints(u.points || 0);}} className="bg-amber-600 text-slate-950 font-black px-2.5 py-1 rounded text-[10px] interactive-btn">تعديل الإحصائيات 📊</button>}
                      {/* ✅ ميزة التصفير الفردي المطلوبة بجانب تعديل الإحصائيات لتصفير عضو واحد بالملي */}
                      <button onClick={() => handleWipeSingleUserStatsToZero(u.id)} className="bg-red-950 hover:bg-red-900 text-red-400 font-black px-2.5 py-1 rounded text-[10px] interactive-btn">تصفير فردي 🧹</button>
                    </div>
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

      {/* 🔍 رابعاً: أدوات الفلترة والبحث المتقدمة والدقيقة مية بالمية لقسم توقعات الأعضاء بالـ matchId الثابت */}
      <section className="bg-slate-950 p-4 rounded-xl mb-6 shadow-xl border border-purple-500/10">
        <h3 className="font-black text-xs text-purple-400 mb-3 border-b border-slate-800 pb-2">🔍 أدوات التصفية والبحث والفلترة الاحترافية لقسم توقعات الأعضاء المربوطة بالـ matchId</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-900/60 p-4 rounded-xl items-center">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-400 font-bold">فلترة حسب المباراة (مطابقة 100%):</label>
            <select value={filterMatchId} onChange={(e) => setFilterMatchId(e.target.value)} className="bg-slate-950 text-white border border-slate-700 rounded-lg p-2 text-xs focus:outline-none">
              <option value="">-- عرض كل المباريات --</option>
              {MASTER_OFFICIAL_ADMIN_FIXTURES.map(m => ( <option key={m.id} value={m.id}>{m.title}</option> ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-400 font-bold">بحث باسم العضو البطل:</label>
            <input type="text" placeholder="اكتب اسم العضو هنا..." value={searchMemberName} onChange={(e) => setSearchMemberName(e.target.value)} className="bg-slate-950 text-white border border-slate-700 rounded-lg p-2 text-xs focus:outline-none" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-400 font-bold">حالة الاحتساب والفرز الكلي:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-slate-950 text-white border border-slate-700 rounded-lg p-2 text-xs focus:outline-none">
              <option value="all">عرض الكل</option>
              <option value="full">بالملي +3 نقاط</option>
              <option value="win">توقع الفائز +1 نقطة</option>
              <option value="wrong">توقع خاطئ 0 نقاط</option>
              <option value="uncalculated">غير محتسب / بانتظار الفرز</option>
            </select>
          </div>
          <div className="pt-4">
            <button onClick={handleResetAllFiltersButton} className="w-full bg-slate-800 hover:bg-slate-700 text-purple-300 font-black py-2 rounded-lg text-xs transition-all interactive-btn">🔄 إعادة تعيين جميع الفلاتر</button>
          </div>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <th className="p-2 text-right">العضو المشترك</th>
                <th className="p-2">المباراة الملعوبة</th>
                <th className="p-2 text-green-400">التوقع المرسل</th>
                <th className="p-2">الحالة السحابية الحقيقية</th>
                <th className="p-2">الأزرار الثلاثة المستبدلة للاحتساب السابق (تحديث النقاط والتوقعات والصح والخطأ معاً لايف)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 font-bold text-slate-300">
              {filteredPredictionsList.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-slate-500 text-center">لا توجد توقعات تطابق فلاتر البحث الحالية بالـ matchId 🔍</td></tr>
              ) : filteredPredictionsList.slice((predPage - 1) * itemsPerPage, predPage * itemsPerPage).map((p) => (
                <tr key={p.id} className="hover:bg-slate-900/40">
                  <td className="p-2 text-right">👤 {p.user}</td>
                  <td className="p-2 text-purple-300">{p.t1} vs {p.t2}</td>
                  <td className="p-2 text-green-400 font-mono text-sm">{p.score1} - {p.score2}</td>
                  <td className="p-2">
                    {p.processed ? (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${p.statusType === 'full' ? 'bg-green-950 text-green-400' : (p.statusType === 'win' ? 'bg-blue-950 text-blue-400' : 'bg-red-950 text-red-400')}`}>
                        {p.statusType === 'full' ? 'بالملي +3' : (p.statusType === 'win' ? 'الفائز +1' : 'خطأ 0')}
                      </span>
                    ) : ( <span className="text-amber-500 font-black animate-pulse">غير محتسب / بانتظار الفرز ⏰</span> )}
                  </td>
                  <td className="p-2">
                    <div className="flex gap-1 justify-center items-center">
                      <button onClick={() => handleSettlePredictionSingleManualOldWay(p, "full")} className="bg-green-600 hover:bg-green-500 text-white font-black px-2.5 py-1 rounded text-[10px] interactive-btn shadow-md whitespace-nowrap">🎯 بالملي +3</button>
                      <button onClick={() => handleSettlePredictionSingleManualOldWay(p, "win")} className="bg-blue-600 hover:bg-blue-500 text-white font-black px-2.5 py-1 rounded text-[10px] interactive-btn shadow-md whitespace-nowrap">⚽ الفائز +1</button>
                      <button onClick={() => handleSettlePredictionSingleManualOldWay(p, "wrong")} className="bg-red-600 hover:bg-red-500 text-white font-black px-2.5 py-1 rounded text-[10px] interactive-btn shadow-md whitespace-nowrap">✕ خطأ 0</button>
                      <button onClick={async ()=>{if(confirm("حذف التوقع نهائياً؟")) await deleteDoc(doc(db,"predictions",p.id))}} className="bg-slate-800 text-red-400 px-2.5 py-1 rounded text-[10px] interactive-btn">حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
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