"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, addDoc, onSnapshot, query, orderBy, getDocs, where, doc, updateDoc } from "firebase/firestore";

// قاعدة بيانات حية مجدولة لمباريات المونديال القادمة بتوقيت مكة المكرمة (GMT +3) بهوية 365
const FIXTURES_365_DATABASE = [
  { day: "اليوم — الخميس 11 يونيو", group: "كأس العالم - المجموعة أ", team1: "المكسيك", team1Emoji: "🇲🇽", team2: "جنوب أفريقيا", team2Emoji: "🇿🇦", time: "10:00 م", note: "المباراة الإفتتاحية لكأس العالم 2026" },
  { day: "غداً — الجمعة 12 يونيو", group: "كأس العالم - المجموعة أ", team1: "كوريا الجنوبية", team1Emoji: "🇰🇷", team2: "جمهورية التشيك", team2Emoji: "🇨🇿", time: "05:00 ص", note: "" },
  { day: "غداً — الجمعة 12 يونيو", group: "كأس العالم - المجموعة ب", team1: "كندا", team1Emoji: "🇨🇦", team2: "البوسنة والهرسك", team2Emoji: "🇧🇦", time: "10:00 م", note: "" },
  { day: "السبت، 13 يونيو", group: "كأس العالم - المجموعة د", team1: "الولايات المتحدة", team1Emoji: "🇺🇸", team2: "باراغواي", team2Emoji: "🇵🇾", time: "04:00 ص", note: "" },
  { day: "السبت، 13 يونيو", group: "كأس العالم - المجموعة ب", team1: "قطر", team1Emoji: "🇶🇦", team2: "سويسرا", team2Emoji: "🇨🇭", time: "10:00 م", note: "" },
  { day: "الأحد، 14 يونيو", group: "كأس العالم - المجموعة ج", team1: "السعودية", team1Emoji: "🇸🇦", team2: "فرنسا", team2Emoji: "🇫🇷", time: "09:00 م", note: "قمة جماهيرية مرتقبة للأخضر 🔥" }
];

const WORLD_CUP_2026_TEAMS = [
  { code: "MX", name: "المكسيك", emoji: "🇲🇽" }, { code: "ZA", name: "جنوب أفريقيا", emoji: "🇿🇦" },
  { code: "SA", name: "السعودية", emoji: "🇸🇦" }, { code: "MA", name: "المغرب", emoji: "🇲🇦" },
  { code: "EG", name: "مصر", emoji: "🇪🇬" }, { code: "DZ", name: "الجزائر", emoji: "🇩🇿" },
  { code: "TN", name: "تونس", emoji: "🇹🇳" }, { code: "AE", name: "الإمارات", emoji: "🇦🇪" },
  { code: "QA", name: "قطر", emoji: "🇶🇦" }, { code: "IQ", name: "العراق", emoji: "🇮🇶" },
  { code: "JO", name: "الأردن", emoji: "🇯🇴" }, { code: "OM", name: "عُمان", emoji: "🇴🇲" },
  { code: "BH", name: "البحرين", emoji: "🇧🇭" }, { code: "KW", name: "الكويت", emoji: "🇰🇼" },
  { code: "US", name: "الولايات المتحدة", emoji: "🇺🇸" }, { code: "CA", name: "كندا", emoji: "🇨🇦" },
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
  { code: "TR", name: "تركيا", emoji: "🇹🇷" }, { code: "UA", name: "أوكرانيا", emoji: "🇺🇦" }
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"main_screen" | "match_fixtures" | "points_rules">("main_screen");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false); 
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false); 
  const [authMode, setAuthMode] = useState<"menu" | "guest" | "manual_login">("menu");
  
  // الـ State مرنة ومفتوحة لقبول جميع الحقول الجديدة بدون قيود
  const [user, setUser] = useState<any>({ id: "", fullName: "", favoriteTeam: "السعودية 🇸🇦", teamEmoji: "🇸🇦", password: "", phone: "", residence: "السعودية" });
  const [editProfileFields, setEditProfileFields] = useState({ fullName: "", password: "", favoriteTeam: "", phone: "" });
  
  const [manualName, setManualName] = useState("");
  const [manualPassword, setManualPassword] = useState(""); 
  const [userPrediction, setUserPrediction] = useState({ team1Score: "", team2Score: "" });
  const [hasPredicted, setHasPredicted] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  
  const [chatList, setChatList] = useState<any[]>([]);
  const [livePredictions, setLivePredictions] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [predictionsStats, setPredictionsStats] = useState({ total: 0, correct: 0, wrong: 0, points: 0 });
  const [countdown, setCountdown] = useState("00:00:00");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [currentMatch, setCurrentMatch] = useState({
    id: "opening_2026", team1: "المكسيك", team1Emoji: "🇲🇽", team2: "جنوب أفريقيا", team2Emoji: "🇿🇦",
    kickoff: "2026-06-11T22:00:00", status: "بانتظار ركلة البداية", score: "0 - 0"
  });

  useEffect(() => {
    const savedUser = localStorage.getItem("worldCupUser");
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser) as any;
      setUser(parsedUser);
      setEditProfileFields({ 
        fullName: parsedUser.fullName, 
        password: parsedUser.password, 
        favoriteTeam: parsedUser.favoriteTeam, 
        phone: parsedUser.phone || "" 
      });
      setIsLoggedIn(true);
      if (localStorage.getItem(`hasPredicted_${parsedUser.fullName}`)) setHasPredicted(true);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const distance = new Date(currentMatch.kickoff).getTime() - new Date().getTime();
      if (distance < 0) {
        clearInterval(timer); setCountdown("بدأت المباراة (أُغلق التوقع)");
      } else {
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString().padStart(2, "0");
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, "0");
        const seconds = Math.floor((distance % (1000 * 60)) / 1000).toString().padStart(2, "0");
        setCountdown(`${hours}:${minutes}:${seconds}`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [currentMatch.kickoff]);

  useEffect(() => {
    const qChat = query(collection(db, "chats"), orderBy("createdAt", "desc"));
    const unsubChat = onSnapshot(qChat, (snap) => { setChatList(snap.docs.map(doc => doc.data())); });

    const qPred = query(collection(db, "predictions"), orderBy("createdAt", "desc"));
    const unsubPred = onSnapshot(qPred, (snap) => {
      const preds = snap.docs.map(doc => doc.data());
      setLivePredictions(preds);
      setPredictionsStats(prev => ({ ...prev, total: preds.length }));
    });

    const qUsers = query(collection(db, "users"), orderBy("points", "desc"));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      setLeaderboard(snap.docs.map((doc, idx) => ({
        id: doc.id, rank: idx + 1, name: doc.data().fullName, teamEmoji: doc.data().teamEmoji || "🏆",
        total: doc.data().total || 0, correct: doc.data().correct || 0, wrong: doc.data().wrong || 0, points: doc.data().points || 0
      })));
    });

    const unsubMatchSettings = onSnapshot(collection(db, "match_settings"), (snap) => {
      if (!snap.empty) setCurrentMatch(snap.docs[0].data() as any);
    });

    return () => { unsubChat(); unsubPred(); unsubUsers(); unsubMatchSettings(); };
  }, []);

  const fetchVisitorIdentityByIP = async () => {
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      const numString = data.ip.replace(/\./g, "");
      const cleanId = parseInt(numString.slice(-3)) || Math.floor(Math.random() * 89) + 10;
      return `زائر ${cleanId}`;
    } catch { return `زائر ${Math.floor(Math.random() * 800) + 100}`; }
  };

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    let targetName = user.fullName.trim();
    if (!targetName) targetName = await fetchVisitorIdentityByIP();
    if (!user.password) return;

    try {
      const q = query(collection(db, "users"), where("fullName", "==", targetName));
      const snap = await getDocs(q);
      if (!snap.empty) { alert("❌ عذراً! هذا الاسم مسجل مسبقاً في لوحة الصدارة، يرجى كتابة اسم فريد خاص بك، أو الولوج من خلال خيار (تسجيل دخول بحساب سابق)."); return; }

      const matchedTeam = WORLD_CUP_2026_TEAMS.find(t => t.name === user.favoriteTeam);
      const chosenEmoji = matchedTeam ? matchedTeam.emoji : "🏆";

      const userData = {
        fullName: targetName,
        favoriteTeam: user.favoriteTeam || "السعودية 🇸🇦",
        teamEmoji: chosenEmoji,
        password: user.password, 
        phone: user.phone || "",
        residence: user.residence,
        points: 0, total: 0, correct: 0, wrong: 0,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "users"), userData);
      const sessionUser = { id: docRef.id, ...userData };
      
      localStorage.setItem("worldCupUser", JSON.stringify(sessionUser));
      setUser(sessionUser); 
      setEditProfileFields({ fullName: sessionUser.fullName, password: sessionUser.password, favoriteTeam: sessionUser.favoriteTeam, phone: sessionUser.phone });
      setIsLoggedIn(true); setIsAuthModalOpen(false);
      alert(`🎉 تم اعتماد حسابك باسم "${targetName}" ${chosenEmoji} بنجاح وانطلقت رحلة التحدي!`);
    } catch (err) { console.error(err); }
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualPassword) return;

    try {
      const q = query(
        collection(db, "users"), 
        where("fullName", "==", manualName.trim()),
        where("password", "==", manualPassword)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        // ⚡ تم تطبيق الـ (as any) هنا لإنهاء آخر مشكلة متبقية مية بالمية ومنع تعليق الـ Build
        const loggedUser = snap.docs[0].data() as any;
        localStorage.setItem("worldCupUser", JSON.stringify(loggedUser));
        setUser(loggedUser); 
        setEditProfileFields({ fullName: loggedUser.fullName, password: loggedUser.password, favoriteTeam: loggedUser.favoriteTeam, phone: loggedUser.phone || "" });
        setIsLoggedIn(true); setIsAuthModalOpen(false);
        if (localStorage.getItem(`hasPredicted_${manualName.trim()}`)) setHasPredicted(true);
        alert(`مرحباً بعودتك يا ${manualName}! 👑🏆`);
      } else {
        alert("❌ عذراً! الاسم أو الرقم السري غير صحيح، يرجى التأكد وإعادة الإدخال.");
      }
    } catch (err) { console.error(err); }
  };

  const handleUpdateUserProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.id) return;
    try {
      const matched = WORLD_CUP_2026_TEAMS.find(t => t.name === editProfileFields.favoriteTeam);
      const newEmoji = matched ? matched.emoji : "🏆";

      const updatedPayload = {
        fullName: editProfileFields.fullName.trim(),
        password: editProfileFields.password.trim(),
        favoriteTeam: editProfileFields.favoriteTeam,
        teamEmoji: newEmoji,
        phone: editProfileFields.phone.trim()
      };

      await updateDoc(doc(db, "users", user.id), updatedPayload);
      const freshUser = { ...user, ...updatedPayload };
      localStorage.setItem("worldCupUser", JSON.stringify(freshUser));
      setUser(freshUser); setIsProfileModalOpen(false);
      alert("✅ تم تعديل وتحديث بيانات ملفك الشخصي بنجاح في السيرفر!");
    } catch (err) { alert("حدث عطل في مزامنة البيانات السحابية."); }
  };

  const handleLogout = () => {
    localStorage.removeItem("worldCupUser");
    setUser({ id: "", fullName: "", favoriteTeam: "السعودية 🇸🇦", teamEmoji: "🇸🇦", password: "", phone: "" });
    setIsLoggedIn(false); setHasPredicted(false);
  };

  const handleSavePrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) { setIsAuthModalOpen(true); return; }
    if (new Date().getTime() > new Date(currentMatch.kickoff).getTime()) { alert("أُغلقت التوقعات لبدء المباراة!"); return; }
    
    try {
      await addDoc(collection(db, "predictions"), {
        user: user.fullName, t1: currentMatch.team1, t1E: currentMatch.team1Emoji,
        t2: currentMatch.team2, t2E: currentMatch.team2Emoji,
        score1: userPrediction.team1Score, score2: userPrediction.team2Score,
        createdAt: new Date().toISOString()
      });
      setHasPredicted(true);
      localStorage.setItem(`hasPredicted_${user.fullName}`, "true");
    } catch (err) { console.error(err); }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    try {
      await addDoc(collection(db, "chats"), { 
        user: user.fullName || "زائر", 
        teamEmoji: user.teamEmoji || "🏆",
        text: chatMessage, 
        createdAt: new Date().toISOString() 
      });
      setChatMessage("");
    } catch (err) { console.error(err); }
  };

  const lastIndex = currentPage * itemsPerPage;
  const firstIndex = lastIndex - itemsPerPage;
  const slicedLeaderboard = leaderboard.slice(firstIndex, lastIndex);
  const maxPages = Math.ceil(leaderboard.length / itemsPerPage);

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950 text-slate-100 font-sans antialiased text-right flex flex-col justify-between">
      
      <style>{`
        @keyframes marqueeScroll { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        .forced-marquee { display: flex; white-space: nowrap; animation: marqueeScroll 25s linear infinite; }
        .forced-marquee:hover { animation-play-state: paused; }
      `}</style>

      <div>
        {/* 📺 شريط البث الحي لقنوات فيفا العالمية */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-900 text-white h-9 flex items-center overflow-hidden text-xs font-bold shadow-2xl border-b border-purple-500/30">
          <div className="bg-red-600 px-3 h-full flex items-center z-10 shadow-xl flex-shrink-0 animate-pulse text-white font-black text-[10px] tracking-tight">🔥 لايف:</div>
          <div className="w-full relative overflow-hidden flex items-center">
            <div className="forced-marquee gap-10 items-center">
              {livePredictions.length === 0 ? (
                <span className="text-purple-200 text-[11px] px-4">بانتظار انطلاق توقعات الجماهير الأولى لتشتعل اللوحة التفاعلية... ⚽🏆</span>
              ) : (
                livePredictions.map((p, idx) => (
                  <span key={idx} className="bg-white/10 px-3 py-1 rounded-xl border border-white/10 flex items-center gap-2 shadow-lg backdrop-blur-md text-[11px]">
                    ⚡ <span className="text-yellow-400 font-extrabold">{p.user}</span> يتوقع: {p.t1E} {p.t1} <span className="font-mono bg-purple-950 px-1.5 py-0.5 rounded text-green-400 font-black border border-green-500/20">{p.score1} - {p.score2}</span> {p.t2} {p.t2E}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Header */}
        <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-purple-900/30 shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-white text-xl p-1 focus:outline-none">
                <i className={`fa-solid ${isMenuOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 flex items-center justify-center overflow-hidden rounded-xl animate-pulse">
                  <img src="/wc2026-logo.png" alt="FIFA 2026" className="object-contain max-w-full max-h-full drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-xs md:text-base font-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">منصة توقعات كأس العالم 2026</h1>
                  <span className="text-[9px] text-purple-400 font-black tracking-widest -mt-0.5">OFFICIAL FAN PLATFORM</span>
                </div>
              </div>
            </div>

            <div>
              {isLoggedIn ? (
                <div className="flex items-center gap-2 md:gap-3">
                  <span onClick={() => setIsProfileModalOpen(true)} className="bg-purple-900/50 text-purple-300 border border-purple-500/30 px-3.5 py-1.5 rounded-xl font-black text-xs md:text-sm shadow-inner cursor-pointer hover:bg-purple-950/60 transition-colors">👤 حسابي {user.teamEmoji}</span>
                  <button onClick={handleLogout} className="text-xs font-bold text-red-400 hover:text-red-300 bg-red-950/40 border border-red-500/30 px-3 py-1.5 rounded-xl transition-all">خروج</button>
                </div>
              ) : (
                <button onClick={() => { setAuthMode("menu"); setIsAuthModalOpen(true); }} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs md:text-sm font-black px-5 py-2.5 rounded-xl shadow-lg shadow-purple-500/20 border border-purple-400/20 transition-all">🔐 تسجيل الدخول</button>
              )}
            </div>
          </div>

          {/* ☰ القائمة المنسدلة */}
          {isMenuOpen && (
            <div className="absolute top-16 right-0 w-64 bg-slate-900 border-l border-b border-purple-900/40 shadow-2xl animate-fade-in p-4 space-y-4 z-50 rounded-bl-xl">
              <button onClick={() => { setActiveTab("main_screen"); setIsMenuOpen(false); }} className={`block w-full text-right py-2 border-b border-white/5 font-black text-xs transition-colors ${activeTab === 'main_screen' ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'}`}>🏠 الرئيسية</button>
              <button onClick={() => { setActiveTab("match_fixtures"); setIsMenuOpen(false); }} className={`block w-full text-right py-2 border-b border-white/5 font-black text-xs transition-colors ${activeTab === 'match_fixtures' ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'}`}>📅 جدول المباريات</button>
              <button onClick={() => { setActiveTab("points_rules"); setIsMenuOpen(false); }} className={`block w-full text-right py-2 font-black text-xs transition-colors ${activeTab === 'points_rules' ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'}`}>📊 احتساب النقاط</button>
            </div>
          )}
        </header>

        {/* 📋 عرض التبويبات الفعالة */}
        {activeTab === "main_screen" && (
          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
            <section className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-5 md:p-6 shadow-2xl border border-purple-500/20 relative overflow-hidden">
              <div className="absolute top-0 left-0 bg-gradient-to-r from-red-600 to-pink-600 text-white font-black text-[10px] md:text-xs px-4 py-1.5 rounded-bl-xl shadow-md border-b border-r border-purple-500/20">⏰ نهاية التوقع: {countdown}</div>
              {hasPredicted ? (
                <div className="text-center py-8 space-y-3 animate-fade-in">
                  <div className="text-4xl md:text-5xl animate-bounce">🎯❤️🔥</div>
                  <h3 className="text-lg md:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">توقعك وصل واعتمدناه 🎯</h3>
                  <p className="text-xs md:text-sm text-purple-200 font-bold mt-1">لا تنسى ترجع لنا بعد المباراة وتشوف هل توقّعك صح ولا لا 😄</p>
                </div>
              ) : (
                <>
                  <div className="text-center md:text-right mb-4 mt-4 md:mt-0">
                    <h3 className="text-xs md:text-base font-black text-purple-300 flex items-center gap-1.5 justify-center md:justify-start">🔥 شارك توقعك الآن</h3>
                  </div>
                  <form onSubmit={handleSavePrediction} className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-950/50 p-4 rounded-xl border border-purple-500/10">
                    <div className="flex items-center gap-4 w-full md:w-auto justify-center md:justify-start">
                      <span className="text-3xl md:text-4xl drop-shadow">{currentMatch.team1Emoji}</span>
                      <span className="font-black text-sm md:text-lg">{currentMatch.team1}</span>
                      <input type="number" min="0" placeholder="0" required value={userPrediction.team1Score} onChange={(e) => setUserPrediction({...userPrediction, team1Score: e.target.value})} className="w-14 h-11 bg-slate-900 text-green-400 border border-purple-500/30 rounded-xl text-center font-black text-lg focus:outline-none" />
                    </div>
                    <div className="text-purple-400 font-black text-xs md:text-base tracking-widest">VS</div>
                    <div className="flex items-center gap-4 w-full md:w-auto justify-center md:flex-row-reverse">
                      <span className="text-3xl md:text-4xl drop-shadow">{currentMatch.team2Emoji}</span>
                      <span className="font-black text-sm md:text-lg">{currentMatch.team2}</span>
                      <input type="number" min="0" placeholder="0" required value={userPrediction.team2Score} onChange={(e) => setUserPrediction({...userPrediction, team2Score: e.target.value})} className="w-14 h-11 bg-slate-900 text-green-400 border border-purple-500/30 rounded-xl text-center font-black text-lg focus:outline-none" />
                    </div>
                    <button type="submit" className="w-full md:w-auto bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 text-white font-black px-8 py-3 rounded-xl text-xs md:text-sm transition-all shadow-lg">حفظ وارسال التوقع</button>
                  </form>
                </>
              )}
            </section>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-slate-900/40 backdrop-blur-xl rounded-2xl p-4 md:p-5 shadow-2xl border border-purple-900/20 overflow-hidden flex flex-col justify-between">
                <div>
                  <h3 className="font-black text-xs md:text-base text-amber-400 mb-3 border-b border-purple-900/30 pb-2">🏆 لوحة الصدارة التلقائية والترتيب المباشر</h3>
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-xs md:text-sm text-center border-collapse">
                      <thead>
                        <tr className="bg-purple-950/40 text-purple-300 font-black border-b border-purple-900/30">
                          <th className="py-2.5 px-2 text-right">الترتيب والاسم</th>
                          <th className="py-2.5 px-2">التوقعات</th>
                          <th className="py-2.5 px-2 text-green-400">الصح</th>
                          <th className="py-2.5 px-2 text-red-400">الخطأ</th>
                          <th className="py-2.5 px-2 text-yellow-400">النقاط</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-950/20 font-bold text-slate-300">
                        {slicedLeaderboard.map((u, i) => (
                          <tr key={i} className="hover:bg-purple-950/20 transition-all">
                            <td className="py-3 px-2 text-right font-black text-white">{u.rank}. {u.name} {u.teamEmoji}</td>
                            <td className="py-3 px-2 font-mono text-slate-400">{u.total}</td>
                            <td className="py-3 px-2 font-mono text-green-400">{u.correct}</td>
                            <td className="py-3 px-2 font-mono text-red-400">{u.wrong}</td>
                            <td className="py-3 px-2 font-mono font-black text-amber-400 text-sm">{u.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {maxPages > 1 && (
                  <div className="flex justify-center items-center gap-4 pt-4 border-t border-purple-900/20 mt-4 text-xs">
                    <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="bg-purple-950 border border-purple-500/20 px-3 py-1 rounded-lg text-purple-300 disabled:opacity-40">السابق ◀</button>
                    <span className="font-bold text-slate-400">صفحة {currentPage} من {maxPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(p + 1, maxPages))} disabled={currentPage === maxPages} className="bg-purple-950 border border-purple-500/20 px-3 py-1 rounded-lg text-purple-300 disabled:opacity-40">التالي ▶</button>
                  </div>
                )}
              </div>

              <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl p-4 md:p-5 shadow-2xl border border-purple-900/20 h-[450px] flex flex-col justify-between">
                <div className="overflow-hidden flex flex-col h-full">
                  <h3 className="font-black text-xs md:text-base text-purple-300 border-b border-purple-900/20 pb-3 mb-3"><span>💬</span> دردشة زوار المنصة الفورية</h3>
                  <div className="space-y-2.5 overflow-y-auto flex-1 text-xs hidden-scrollbar flex flex-col-reverse">
                    {chatList.map((msg, i) => (
                      <div key={i} className="bg-slate-950/60 p-3 rounded-xl border border-purple-500/10 shadow-md">
                        <span className="block font-black text-[10px] text-purple-400 mb-1">👤 {msg.user} {msg.teamEmoji || "🏆"}</span>
                        <p className="text-slate-200 leading-relaxed font-medium">{msg.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <form onSubmit={handleSendMessage} className="mt-3 flex gap-2 border-t border-purple-900/20 pt-3"><button type="submit" className="bg-purple-600 text-white font-black px-4 py-2 rounded-xl text-xs md:text-sm shadow-md transition-colors">إرسال</button><input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} placeholder="اكتب تعليقك المباشر..." className="flex-1 bg-slate-500/20 border border-purple-500/20 rounded-xl px-4 py-2 text-xs md:text-sm text-slate-200 focus:outline-none" /></form>
              </div>
            </div>
          </main>
        )}

        {/* التبويب 2: مواعيد المباريات 365 */}
        {activeTab === "match_fixtures" && (
          <main className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
            <div className="bg-slate-900/60 p-4 rounded-2xl border border-purple-500/20 shadow-2xl">
              <h3 className="font-black text-sm text-amber-400 mb-4 border-b border-purple-900/20 pb-2 flex items-center gap-2">📅 جدول مواعيد مباريات كأس العالم 2026 (توقيت مكة)</h3>
              <div className="space-y-6">
                {FIXTURES_365_DATABASE.map((fixture, idx) => (
                  <div key={idx} className="space-y-2 text-right">
                    <div className="text-[11px] font-black text-purple-400 bg-purple-950/30 px-3 py-1 rounded-lg inline-block">{fixture.day}</div>
                    <div className="bg-slate-950 border border-purple-900/20 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between text-center gap-3">
                      <div className="text-[10px] text-slate-500 font-bold">{fixture.group}</div>
                      <div className="flex items-center gap-8 justify-center">
                        <div className="flex items-center gap-2 font-black text-xs md:text-sm"><span>{fixture.team1}</span><span className="text-xl">{fixture.team1Emoji}</span></div>
                        <div className="bg-purple-900/40 border border-purple-500/30 text-green-400 font-mono font-black text-xs md:text-sm px-4 py-1.5 rounded-xl shadow-inner">{fixture.time}</div>
                        <div className="flex items-center gap-2 font-black text-xs md:text-sm"><span className="text-xl">{fixture.team2Emoji}</span><span>{fixture.team2}</span></div>
                      </div>
                      <div className="text-[10px] text-amber-400 font-bold">{fixture.note || "—"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        )}

        {/* التبويب 3: احتساب النقاط */}
        {activeTab === "points_rules" && (
          <main className="max-w-4xl mx-auto px-4 py-6 animate-fade-in">
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-purple-500/20 shadow-2xl space-y-6">
              <h3 className="font-black text-base text-amber-400 border-b border-purple-900/20 pb-2">📊 كود وقوانين احتساب نقاط تحدي التوقعات</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-green-500/20 text-center space-y-1">
                  <div className="text-2xl">🎯</div>
                  <h4 className="font-black text-green-400 text-xs">توقع النتيجة بالملي</h4>
                  <p className="text-[11px] text-slate-300 font-semibold leading-relaxed">تضاف لك <span className="text-green-400 font-bold">3 نقاط</span> كاملة في جدول الترتيب إذا أصبت النتيجة والأهداف بالظبط.</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-blue-500/20 text-center space-y-1">
                  <div className="text-2xl">⚽</div>
                  <h4 className="font-black text-blue-400 text-xs">توقع المنتخب الفائز</h4>
                  <p className="text-[11px] text-slate-300 font-semibold leading-relaxed">تضاف لك <span className="text-blue-400 font-bold">1 نقطة</span> واحدة لو توقعت الفائز أو التعادل دون إصابة عدد الأهداف.</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-red-500/20 text-center space-y-1">
                  <div className="text-2xl">❌</div>
                  <h4 className="font-black text-red-400 text-xs">التوقع الخاطئ</h4>
                  <p className="text-[11px] text-slate-300 font-semibold leading-relaxed">تحصل على <span className="text-red-400 font-bold">0 نقاط</span> إذا ذهبت نتيجة المباراة والملف بالكامل عكس توقعك المرسل.</p>
                </div>
              </div>
            </div>
          </main>
        )}
      </div>

      {/* الفوتر */}
      <footer className="bg-slate-950 text-slate-500 py-6 mt-12 border-t border-purple-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-xs text-center sm:text-right order-2 sm:order-1">
            <p className="font-bold text-slate-400">تحدي توقعات كأس العالم 2026</p>
            <p className="text-slate-600">© جميع الحقوق محفوظة • اطلاق تجريبي V5.1</p>
          </div>
          <div className="flex items-center gap-3 bg-slate-900/50 border border-purple-500/10 px-4 py-2 rounded-xl order-1 sm:order-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-bold text-white text-sm">ع</div>
            <div className="text-xs text-right">
              <span className="block text-[10px] text-purple-500 font-black">فكرة وتطوير</span>
              <span className="block font-black text-white mt-0.5">عبدالسلام العنزي</span>
            </div>
          </div>
        </div>
      </footer>

      {/* مودال التحكم الذكي */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/30 w-full max-w-md rounded-2xl p-5 md:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto text-slate-100">
            <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 left-4 text-slate-400 bg-slate-50 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black">✕</button>
            
            {authMode === "menu" && (
              <div className="space-y-6 py-4 text-center">
                <div>
                  <h4 className="text-base md:text-lg font-black text-white mb-1">🔐 اختر طريقة الدخول</h4>
                  <p className="text-xs text-slate-400">احفظ نقاطك وتوقعاتك فوراً في لوحة الصدارة</p>
                </div>
                <div className="space-y-3 pt-2">
                  <button onClick={() => setAuthMode("guest")} type="button" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl text-xs md:text-sm transition-all shadow-lg flex items-center justify-center gap-2">
                    <span>🟢</span> التسجيل السريع
                  </button>
                  <div className="border-t border-purple-950/50 my-4 pt-3">
                    <button onClick={() => setAuthMode("manual_login")} type="button" className="text-xs text-purple-400 hover:text-purple-300 font-bold underline">
                      👉 تسجيل دخول بحساب سابق
                    </button>
                  </div>
                </div>
              </div>
            )}

            {authMode === "guest" && (
              <form onSubmit={handleGuestLogin} className="space-y-4 py-2 text-right">
                <div className="text-center mb-3"><h4 className="text-base font-black text-white">🟢 التسجيل السريع الحصري</h4></div>
                <div><label className="block text-[11px] font-bold text-purple-300 mb-1">الاسم</label><input type="text" placeholder="اكتب اسمك (مثال: عبدالسلام أبو راكان)" onChange={(e) => setUser({...user, fullName: e.target.value})} className="w-full bg-slate-950 border border-purple-500/20 rounded-xl px-4 py-2.5 text-xs md:text-sm focus:outline-none focus:border-purple-500 text-slate-100" /></div>
                <div><label className="block text-[11px] font-bold text-purple-300 mb-1">الرقم السري الخاص بحسابك (لحمايته من الاستخدام من شخص آخر)</label><input type="password" required placeholder="ادخل رقماً سرياً خاصاً بك" onChange={(e) => setUser({...user, password: e.target.value})} className="w-full bg-slate-950 border border-purple-500/20 rounded-xl px-4 py-2.5 text-xs md:text-sm focus:outline-none focus:border-purple-500 text-slate-100" /></div>
                <div><label className="block text-[11px] font-bold text-purple-300 mb-1">رقم الجوال لتثبيت الهوية والتواصل الفوري 📱</label><input type="tel" placeholder="مثال: 050XXXXXXX" onChange={(e) => setUser({...user, phone: e.target.value})} className="w-full bg-slate-950 border border-purple-500/20 rounded-xl px-4 py-2.5 text-xs md:text-sm focus:outline-none focus:border-purple-500 text-slate-100 text-left" dir="ltr" /></div>
                <div><label className="block text-[11px] font-bold text-purple-300 mb-1">المنتخب المرشح لللقب كأس العالم 2026 🏆</label><select required value={user.favoriteTeam} onChange={(e) => setUser({...user, favoriteTeam: e.target.value})} className="w-full bg-slate-950 border border-purple-500/20 rounded-xl px-3 py-2.5 text-xs md:text-sm focus:outline-none text-slate-100">{WORLD_CUP_2026_TEAMS.map((t, i) => ( <option key={i} value={t.name}>{t.emoji} {t.name}</option> ))}</select></div>
                <div className="flex gap-2 pt-2"><button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-xl text-xs transition-all">تفعيل الدخول الفوري 🚀</button><button onClick={() => setAuthMode("menu")} type="button" className="bg-slate-950 text-slate-400 px-4 py-2.5 rounded-xl text-xs font-bold border border-purple-500/10">رجوع</button></div>
              </form>
            )}

            {authMode === "manual_login" && (
              <form onSubmit={handleManualLogin} className="space-y-4 py-2 text-right">
                <div className="text-center mb-3"><h4 className="text-base font-black text-yellow-500">📝 تسجيل دخول بحساب سابق</h4></div>
                <div><label className="block text-[11px] font-bold text-purple-300 mb-1">الاسم المطابق للحساب</label><input type="text" required placeholder="ادخل اسمك المسجل بدقة" value={manualName} onChange={(e) => setManualName(e.target.value)} className="w-full bg-slate-950 border border-purple-500/20 rounded-xl px-4 py-2.5 text-xs md:text-sm focus:outline-none text-slate-100" /></div>
                <div><label className="block text-[11px] font-bold text-purple-300 mb-1">الرقم السري الخاص بالحساب</label><input type="password" required placeholder="ادخل رقمك السري" value={manualPassword} onChange={(e) => setManualPassword(e.target.value)} className="w-full bg-slate-950 border border-purple-500/20 rounded-xl px-4 py-2.5 text-xs md:text-sm focus:outline-none text-slate-100" /></div>
                <div className="flex gap-2 pt-2"><button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-black py-2.5 rounded-xl text-xs transition-all">استعادة الجلسة</button><button onClick={() => setAuthMode("menu")} type="button" className="bg-slate-950 text-slate-400 px-4 py-2.5 rounded-xl text-xs font-bold border border-purple-500/10">رجوع</button></div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 👤 مودال تحرير الملف الشخصي الفوري للأعضاء */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 w-full max-w-md rounded-2xl p-5 md:p-6 shadow-2xl relative text-slate-100 text-right">
            <button onClick={() => setIsProfileModalOpen(false)} className="absolute top-4 left-4 text-slate-400 bg-slate-50 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black">✕</button>
            <h4 className="text-center font-black text-amber-400 text-sm md:text-base border-b border-white/5 pb-2 mb-4">👤 تعديل بيانات حسابي الشخصي</h4>
            
            <form onSubmit={handleUpdateUserProfile} className="space-y-3.5 text-xs font-bold">
              <div>
                <label className="text-purple-300 block mb-1">الاسم</label>
                <input type="text" value={editProfileFields.fullName} onChange={(e)=>setEditProfileFields({...editProfileFields, fullName: e.target.value})} className="w-full bg-slate-950 border border-purple-500/20 p-2.5 rounded-xl text-white focus:outline-none" required />
              </div>
              <div>
                <label className="text-purple-300 block mb-1">الرقم السري</label>
                <input type="text" value={editProfileFields.password} onChange={(e)=>setEditProfileFields({...editProfileFields, password: e.target.value})} className="w-full bg-slate-950 border border-purple-500/20 p-2.5 rounded-xl text-white focus:outline-none" required />
              </div>
              <div>
                <label className="text-purple-300 block mb-1">رقم الجوال 📱</label>
                <input type="tel" value={editProfileFields.phone} onChange={(e)=>setEditProfileFields({...editProfileFields, phone: e.target.value})} className="w-full bg-slate-950 border border-purple-500/20 p-2.5 rounded-xl text-white focus:outline-none text-left" dir="ltr" placeholder="اكتب رقم جوالك الحالي" />
              </div>
              <div>
                <label className="text-purple-300 block mb-1">ترشيحك لبطل كأس العالم 2026 🏆</label>
                <select value={editProfileFields.favoriteTeam} onChange={(e)=>setEditProfileFields({...editProfileFields, favoriteTeam: e.target.value})} className="w-full bg-slate-950 border border-purple-500/20 p-2.5 rounded-xl text-white focus:outline-none">
                  {WORLD_CUP_2026_TEAMS.map((t, i) => ( <option key={i} value={t.name}>{t.emoji} {t.name}</option> ))}
                </select>
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-black py-3 rounded-xl shadow-lg mt-2">حفظ التغييرات 💾</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}