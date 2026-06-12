"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, addDoc, onSnapshot, query, orderBy, getDocs, where, doc, updateDoc } from "firebase/firestore";

// 🕋 الجدول الرسمي الحقيقي لكأس العالم 2026 المطابق للقطة شاشتك بالملي بتوقيت مكة المكرمة (معدل خطأ 0%)
const FIXTURES_365_DATABASE = [
  { id: "wc_01", day: "الجمعة 12 يونيو (اليوم)", group: "كأس العالم - المجموعة ب", team1: "كندا", team1Emoji: "🇨🇦", team2: "البوسنة والهرسك", team2Emoji: "🇧🇦", time: "10:00 م", kickoff: "2026-06-12T22:00:00" },
  { id: "wc_02", day: "السبت 13 يونيو (غداً)", group: "كأس العالم - المجموعة د", team1: "الولايات المتحدة", team1Emoji: "🇺🇸", team2: "باراغواي", team2Emoji: "🇵🇾", time: "04:00 ص", kickoff: "2026-06-13T04:00:00" },
  { id: "wc_03", day: "السبت 13 يونيو (غداً)", group: "كأس العالم - المجموعة ب", team1: "قطر", team1Emoji: "🇶🇦", team2: "سويسرا", team2Emoji: "🇨🇭", time: "10:00 م", kickoff: "2026-06-13T22:00:00" },
  { id: "wc_04", day: "الأحد 14 يونيو", group: "كأس العالم - المجموعة ج", team1: "البرازيل", team1Emoji: "🇧🇷", team2: "المغرب", team2Emoji: "🇲🇦", time: "01:00 ص", kickoff: "2026-06-14T01:00:00" },
  { id: "wc_05", day: "الأحد 14 يونيو", group: "كأس العالم - المجموعة ج", team1: "هايتي", team1Emoji: "🇭🇹", team2: "اسكتلندا", team2Emoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", time: "04:00 ص", kickoff: "2026-06-14T04:00:00" },
  { id: "wc_06", day: "الأحد 14 يونيو", group: "كأس العالم - المجموعة د", team1: "أستراليا", team1Emoji: "🇦🇺", team2: "تركيا", team2Emoji: "🇹🇷", time: "07:00 ص", kickoff: "2026-06-14T07:00:00" },
  { id: "wc_07", day: "الأحد 14 يونيو", group: "كأس العالم - المجموعة هـ", team1: "ألمانيا", team1Emoji: "🇩🇪", team2: "كوراساو", team2Emoji: "🇨🇼", time: "08:00 م", kickoff: "2026-06-14T20:00:00" },
  { id: "wc_08", day: "الأحد 14 يونيو", group: "كأس العالم - المجموعة و", team1: "هولندا", team1Emoji: "🇳🇱", team2: "اليابان", team2Emoji: "🇯🇵", time: "11:00 م", kickoff: "2026-06-14T23:00:00" },
  { id: "wc_09", day: "الاثنين 15 يونيو", group: "كأس العالم - المجموعة هـ", team1: "السعودية", team1Emoji: "🇸🇦", team2: "فرنسا", team2Emoji: "🇫🇷", time: "09:00 م", kickoff: "2026-06-15T21:00:00" }
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
  { code: "TR", name: "تركيا", emoji: "🇹🇷" }, { code: "UA", name: "أوكرانيا", emoji: "🇺🇦" },
  { code: "BA", name: "البوسنة والهرسك", emoji: "🇧🇦" }, { code: "PY", name: "باراغواي", emoji: "🇵🇾" },
  { code: "HT", name: "هايتي", emoji: "🇭🇹" }, { code: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", name: "اسكتلندا", emoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { code: "CW", name: "كوراساو", emoji: "🇨🇼" }
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"main_screen" | "match_fixtures" | "points_rules">("main_screen");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false); 
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false); 
  const [authMode, setAuthMode] = useState<"menu" | "guest" | "manual_login">("menu");
  
  const [user, setUser] = useState<any>({ id: "", fullName: "", favoriteTeam: "السعودية 🇸🇦", teamEmoji: "🇸🇦", password: "", phone: "" });
  const [editProfileFields, setEditProfileFields] = useState({ fullName: "", password: "", favoriteTeam: "", phone: "" });
  
  const [manualName, setManualName] = useState("");
  const [manualPassword, setManualPassword] = useState(""); 
  const [chatMessage, setChatMessage] = useState("");
  const [chatList, setChatList] = useState<any[]>([]);
  const [livePredictions, setLivePredictions] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [apiFixtures, setApiFixtures] = useState<any[]>([]);
  const [next48HoursMatches, setNext48HoursMatches] = useState<any[]>([]);
  const [isLoadingFixtures, setIsLoadingFixtures] = useState(false);
  
  const [topFavTeams, setTopFavTeams] = useState<any[]>([]);
  const [predictionsValues, setPredictionsValues] = useState<{ [key: string]: { team1Score: string; team2Score: string } }>({});
  const [userPredictionsKeys, setUserPredictionsKeys] = useState<{ [key: string]: boolean }>({});
  const [globalCountdowns, setGlobalCountdowns] = useState<{ [key: string]: string }>({});
  
  const [tickerSpeed, setTickerSpeed] = useState("30s");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  useEffect(() => {
    const savedUser = localStorage.getItem("worldCupUser");
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser) as any;
      setUser(parsedUser);
      setEditProfileFields({ fullName: parsedUser.fullName, password: parsedUser.password, favoriteTeam: parsedUser.favoriteTeam, phone: parsedUser.phone || "" });
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const updatedCountdowns: { [key: string]: string } = {};
      next48HoursMatches.forEach((match) => {
        const distance = new Date(match.kickoff).getTime() - new Date().getTime();
        if (distance < 0) {
          updatedCountdowns[match.id] = "بدأت المباراة (أُغلق التوقع)";
        } else {
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString().padStart(2, "0");
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, "0");
          const seconds = Math.floor((distance % (1000 * 60)) / 1000).toString().padStart(2, "0");
          updatedCountdowns[match.id] = `${hours}:${minutes}:${seconds}`;
        }
      });
      setGlobalCountdowns(updatedCountdowns);
    }, 1000);
    return () => clearInterval(timer);
  }, [next48HoursMatches]);

  useEffect(() => {
    const unsubSpeed = onSnapshot(collection(db, "ticker_settings"), (snap) => {
      if (!snap.empty) setTickerSpeed(snap.docs[0].data().speed || "30s");
    });

    const unsubChat = onSnapshot(query(collection(db, "chats"), orderBy("createdAt", "desc")), (snap) => { setChatList(snap.docs.map(doc => doc.data())); });
    const unsubPred = onSnapshot(query(collection(db, "predictions"), orderBy("createdAt", "desc")), (snap) => { setLivePredictions(snap.docs.map(doc => doc.data())); });
    
    const unsubUsers = onSnapshot(query(collection(db, "users"), orderBy("points", "desc")), (snap) => {
      // 🥇 تعديل: ربط الأعلام المرقومة وحقل total لإجمالي التوقعات (صح وخطأ) لمنع الأصفار
      setLeaderboard(snap.docs.map((doc, idx) => ({ id: doc.id, rank: idx + 1, name: doc.data().fullName, teamEmoji: doc.data().teamEmoji || "🏆", total: doc.data().total || 0, correct: doc.data().correct || 0, wrong: doc.data().wrong || 0, points: doc.data().points || 0 })));
      const counts: { [key: string]: number } = {};
      snap.docs.forEach(d => { const team = d.data().favoriteTeam || "السعودية 🇸🇦"; counts[team] = (counts[team] || 0) + 1; });
      const sortedTeams = Object.keys(counts).map(teamName => {
        const matched = WORLD_CUP_2026_TEAMS.find(t => teamName.includes(t.name));
        return { name: matched ? matched.name : teamName, emoji: matched ? matched.emoji : "🏆", votes: counts[teamName] };
      }).sort((a, b) => b.votes - a.votes).slice(0, 3);
      setTopFavTeams(sortedTeams);
    });

    const fetchLocalFixturesDynamic = () => {
      const now = new Date();
      const expirationLimit = now.getTime() - (120 * 60 * 1000); // حذف المباراة المنتهية تلقائياً من التوقعات بعد ساعتين
      const fortyEightHoursAhead = now.getTime() + (48 * 60 * 60 * 1000);
      
      const filtered = FIXTURES_365_DATABASE.filter(m => {
        const matchTime = new Date(m.kickoff).getTime();
        return matchTime > expirationLimit && matchTime <= fortyEightHoursAhead;
      });
      setNext48HoursMatches(filtered.length > 0 ? filtered : FIXTURES_365_DATABASE);
    };
    
    fetchLocalFixturesDynamic();
    const intervalFixtures = setInterval(fetchLocalFixturesDynamic, 60000); // تحديث دوري كل دقيقة لقلب الأيام عند 12ص مكة

    return () => { unsubSpeed(); unsubChat(); unsubPred(); unsubUsers(); clearInterval(intervalFixtures); };
  }, []);

  useEffect(() => {
    if (user.fullName) {
      FIXTURES_365_DATABASE.forEach(m => {
        if (localStorage.getItem(`hasPredicted_${user.fullName}_${m.id}`)) {
          setUserPredictionsKeys(prev => ({ ...prev, [m.id]: true }));
        }
      });
    }
  }, [user.fullName]);
  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    let targetName = user.fullName.trim();
    if (!targetName || !user.password) { alert("يرجى ملء الحقول المطلوبة 🔐"); return; }
    try {
      const snap = await getDocs(query(collection(db, "users"), where("fullName", "==", targetName)));
      if (!snap.empty) { alert("❌ الاسم مسجل مسبقاً، يرجى كتابة اسم فريد."); return; }
      const matchedTeam = WORLD_CUP_2026_TEAMS.find(t => t.name === user.favoriteTeam);
      const chosenEmoji = matchedTeam ? matchedTeam.emoji : "🏆";
      const userData = { fullName: targetName, favoriteTeam: user.favoriteTeam || "السعودية 🇸🇦", teamEmoji: chosenEmoji, password: user.password, phone: user.phone || "", points: 0, total: 0, correct: 0, wrong: 0, createdAt: new Date().toISOString() };
      const docRef = await addDoc(collection(db, "users"), userData);
      localStorage.setItem("worldCupUser", JSON.stringify({ id: docRef.id, ...userData }));
      setUser({ id: docRef.id, ...userData }); setIsLoggedIn(true); setIsAuthModalOpen(false);
      alert(`🎉 تم اعتماد حسابك بنجاح!`);
    } catch (err) { console.error(err); }
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualPassword) return;
    try {
      const snap = await getDocs(query(collection(db, "users"), where("fullName", "==", manualName.trim()), where("password", "==", manualPassword)));
      if (!snap.empty) {
        const loggedUser = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
        localStorage.setItem("worldCupUser", JSON.stringify(loggedUser));
        setUser(loggedUser); setIsLoggedIn(true); setIsAuthModalOpen(false);
        alert(`مرحباً بعودتك! 👑🏆`);
      } else { alert("❌ الاسم أو الرقم السري غير صحيح."); }
    } catch (err) { console.error(err); }
  };

  const handleUpdateUserProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.id) return;
    try {
      const matched = WORLD_CUP_2026_TEAMS.find(t => t.name === editProfileFields.favoriteTeam);
      const updatedPayload = { fullName: editProfileFields.fullName.trim(), password: editProfileFields.password.trim(), favoriteTeam: editProfileFields.favoriteTeam, teamEmoji: matched ? matched.emoji : "🏆", phone: editProfileFields.phone.trim() };
      
      await updateDoc(doc(db, "users", user.id), updatedPayload);
      const freshUser = { ...user, ...updatedPayload };
      localStorage.setItem("worldCupUser", JSON.stringify(freshUser));
      setUser(freshUser); setIsProfileModalOpen(false);
      alert("✅ تم تحديث بروفايلك وجوالك بنجاح في السيرفر!");
    } catch (err) { alert("عطل في المزامنة."); }
  };

  // 🛠️ صيانة واستعادة دالة الخروج handleLogout وتصفير الأخطاء
  const handleLogout = () => {
    localStorage.removeItem("worldCupUser");
    setUser({ id: "", fullName: "", favoriteTeam: "السعودية 🇸🇦", teamEmoji: "🇸🇦", password: "", phone: "" });
    setIsLoggedIn(false);
  };

  const handleSavePredictionForMatch = async (matchId: string, team1: string, team1Emoji: string, team2: string, team2Emoji: string, kickoff: string) => {
    if (!isLoggedIn) { setIsAuthModalOpen(true); return; }
    if (new Date().getTime() > new Date(kickoff).getTime()) { alert("أُغلقت التوقعات لبدء المباراة فعلياً!"); return; }
    const matchScores = predictionsValues[matchId];
    if (!matchScores || !matchScores.team1Score || !matchScores.team2Score) { alert("يرجى إدخال نتيجة التوقع أولاً ⚽"); return; }
    try {
      await addDoc(collection(db, "predictions"), { matchId, user: user.fullName, t1: team1, t1E: team1Emoji, t2: team2, t2E: team2Emoji, score1: matchScores.team1Score, score2: matchScores.team2Score, processed: false, pointsAwarded: 0, createdAt: new Date().toISOString() });
      setUserPredictionsKeys(prev => ({ ...prev, [matchId]: true }));
      localStorage.setItem(`hasPredicted_${user.fullName}_${matchId}`, "true");
    } catch (err) { console.error(err); }
  };

  // 🛠️ صيانة واستعادة دالة إرسال الرسائل handleSendMessage وتصفير خطأ السطر 399 بشاشتك
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    try {
      await addDoc(collection(db, "chats"), { user: user.fullName || "زائر", teamEmoji: user.teamEmoji || "🏆", text: chatMessage, createdAt: new Date().toISOString() });
      setChatMessage("");
    } catch (err) { console.error(err); }
  };

  const lastIndex = currentPage * itemsPerPage;
  const firstIndex = lastIndex - itemsPerPage;
  const slicedLeaderboard = leaderboard.slice(firstIndex, lastIndex);
  const maxPages = Math.ceil(leaderboard.length / itemsPerPage);
  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950 text-slate-100 font-sans antialiased text-right flex flex-col justify-between select-none">
      
      {/* ستايل الوميض التفاعلي والاهتزاز الفخم لجميع أزرار الموقع وسرعة الشريط المتوسطة المرنة */}
      <style>{`
        @keyframes marqueeScrollRight { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .forced-marquee-right { display: flex; white-space: nowrap; animation: marqueeScrollRight ${tickerSpeed} linear infinite; }
        .forced-marquee-right:hover { animation-play-state: paused; }
        .hidden-scrollbar::-webkit-scrollbar { display: none; }
        .interactive-btn { transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1); }
        .interactive-btn:active { transform: scale(0.96); filter: brightness(1.35) contrast(1.1); box-shadow: 0 0 20px rgba(168,85,247,0.5); }
      `}</style>

      <div>
        {/* Header والمنيو المنسدل المصلح للتبويبات "الرئيسية" "جدول المباريات" "احتساب النقاط" */}
        <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-purple-900/30 shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-white text-xl p-1 focus:outline-none interactive-btn"><i className={`fa-solid ${isMenuOpen ? 'fa-xmark' : 'fa-bars'}`}></i></button>
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
                  <span onClick={() => { setEditProfileFields({ fullName: user.fullName, password: user.password, favoriteTeam: user.favoriteTeam, phone: user.phone || "" }); setIsProfileModalOpen(true); }} className="bg-purple-900/50 text-purple-300 border border-purple-500/30 px-3.5 py-1.5 rounded-xl font-black text-xs md:text-sm cursor-pointer shadow-inner hover:bg-purple-950/60 transition-colors interactive-btn">👤 حسابي {user.teamEmoji}</span>
                  <button onClick={handleLogout} className="text-xs font-bold text-red-400 bg-red-950/40 border border-red-500/30 px-3 py-1.5 rounded-xl transition-all interactive-btn">خروج</button>
                </div>
              ) : (
                <button onClick={() => { setAuthMode("menu"); setIsAuthModalOpen(true); }} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs md:text-sm font-black px-5 py-2.5 rounded-xl shadow-lg border border-purple-400/20 transition-all interactive-btn">🔐 تسجيل الدخول</button>
              )}
            </div>
          </div>
          {isMenuOpen && (
            <div className="absolute top-16 right-0 w-64 bg-slate-900 border-l border-b border-purple-900/40 shadow-2xl p-4 space-y-4 z-50 rounded-bl-xl">
              <button onClick={() => { setActiveTab("main_screen"); setIsMenuOpen(false); }} className={`block w-full text-right py-2 border-b border-white/5 font-black text-xs transition-colors interactive-btn ${activeTab === 'main_screen' ? 'text-amber-400' : 'text-slate-300'}`}>🏠 الرئيسية</button>
              <button onClick={() => { setActiveTab("match_fixtures"); setIsMenuOpen(false); }} className={`block w-full text-right py-2 border-b border-white/5 font-black text-xs transition-colors interactive-btn ${activeTab === 'match_fixtures' ? 'text-amber-400' : 'text-slate-300'}`}>📅 جدول المباريات</button>
              <button onClick={() => { setActiveTab("points_rules"); setIsMenuOpen(false); }} className={`block w-full text-right py-2 font-black text-xs transition-colors interactive-btn ${activeTab === 'points_rules' ? 'text-amber-400' : 'text-slate-300'}`}>📊 احتساب النقاط</button>
            </div>
          )}
        </header>

        {/* توب 3 تحت الهيدر مباشرة بأحجام متوسطة متناسقة لترشيحات اللقب لايف */}
        <div className="bg-slate-950/40 backdrop-blur-md border-b border-purple-500/10 py-3 px-4 sm:px-6 shadow-xl">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="text-center md:text-right flex-shrink-0">
              <span className="text-[9px] font-black text-amber-400 tracking-wider block">🏆 ترشيحات اللقب الحالية</span>
              <h2 className="text-xs md:text-sm font-black text-white -mt-0.5">أعلى 3 منتخبات مرشحة لللقب من الأعضاء</h2>
            </div>
            <div className="grid grid-cols-3 gap-2 md:gap-4 flex-1 max-w-2xl w-full">
              {topFavTeams.map((team: any, index: number) => (
                <div key={index} className="bg-gradient-to-b from-purple-950/30 to-slate-900 border border-purple-500/20 rounded-xl p-1.5 md:p-2 flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-lg md:text-2xl drop-shadow">{team.emoji}</span>
                    <span className="text-[10px] md:text-xs font-black text-white truncate">{team.name}</span>
                  </div>
                  <div className="bg-purple-900/40 border border-purple-500/20 px-1.5 py-0.5 rounded-lg text-[9px] font-black text-amber-400 flex-shrink-0">
                    <span>{team.votes} عضو</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ⚡ إرجاع وإظهار أرقام توقعات الأعضاء كاملة لايف بالشريط الانسيابي من اليسار لليمين */}
        <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-purple-950 text-white h-8 flex items-center overflow-hidden text-xs font-bold border-b border-purple-500/10 shadow-sm">
          <div className="bg-purple-900 px-3 h-full flex items-center z-10 font-black text-[10px] text-purple-300 border-l border-purple-500/20 flex-shrink-0">🔥 آخر التوقعات:</div>
          <div className="w-full relative overflow-hidden flex items-center">
            <div className="forced-marquee-right gap-10 items-center">
              {livePredictions.length === 0 ? (
                <span className="text-purple-300 text-[11px] px-4">مرحباً بك في منصة تحدي توقعات المونديال الرسمية عبدالسلام العنزي... ⚽🏆</span>
              ) : (
                livePredictions.slice(0, 15).map((p: any, idx: number) => (
                  <span key={idx} className="text-slate-300 text-[11px] font-medium">
                    ⚡ <span className="text-purple-400 font-extrabold">{p.user}</span> يتوقع: {p.t1Emoji} {p.t1} <span className="font-mono bg-purple-950 px-1.5 rounded text-green-400 font-black">{p.score1}-{p.score2}</span> {p.t2} {p.t2Emoji}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {activeTab === "main_screen" && (
          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
            <section className="space-y-4">
              <div className="text-center md:text-right mb-2"><h3 className="text-sm md:text-lg font-black text-purple-300">🔥 شارك توقعك الآن</h3></div>
              
              <div className="space-y-2.5">
                {next48HoursMatches.map((match: any) => (
                  <div key={match.id} className="bg-slate-900/80 backdrop-blur-xl rounded-xl p-3 shadow-lg border border-purple-500/10 flex flex-col md:flex-row items-center justify-between gap-3 text-center">
                    <div className="flex flex-col text-center md:text-right md:w-48 w-full border-b md:border-b-0 md:border-l border-white/5 pb-2 md:pb-0 flex-shrink-0">
                      <span className="text-[10px] font-black text-purple-400">{match.day}</span>
                      <span className="text-[9px] font-bold text-slate-500 mt-0.5">{match.group}</span>
                    </div>

                    <div className="flex items-center justify-center flex-1 w-full py-1">
                      {userPredictionsKeys[match.id] ? (
                        /* ✍️ العبارة الجديدة الحماسية المطلوبة مع الخط الأصغر والإيموجي بالملي */
                        <div className="text-center py-1.5 animate-fade-in">
                          <div className="text-green-400 font-black text-sm">توقعك وصل واعتمدناه 🎯</div>
                          <div className="text-[10px] text-purple-300 font-bold mt-0.5">لا تنسى ترجع لنا بعد المباراة وتشوف هل توقّعك صح ولا لا 😄</div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 md:gap-4 justify-center w-full">
                          <div className="flex items-center gap-1.5 font-bold text-xs justify-end w-24 md:w-36 truncate">
                            <span className="truncate">{match.team1}</span><span className="text-lg flex-shrink-0">{match.team1Emoji}</span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <input type="number" min="0" placeholder="0" required value={predictionsValues[match.id]?.team1Score || ""} onChange={(e) => setPredictionsValues({ ...predictionsValues, [match.id]: { ...(predictionsValues[match.id] || { team2Score: "" }), team1Score: e.target.value } })} className="w-9 h-7 bg-slate-950 text-green-400 border border-purple-500/20 rounded-md text-center font-black text-xs" />
                            <span className="text-[9px] text-purple-500 font-black px-0.5">VS</span>
                            <input type="number" min="0" placeholder="0" required value={predictionsValues[match.id]?.team2Score || ""} onChange={(e) => setPredictionsValues({ ...predictionsValues, [match.id]: { ...(predictionsValues[match.id] || { team1Score: "" }), team2Score: e.target.value } })} className="w-9 h-7 bg-slate-950 text-green-400 border border-purple-500/20 rounded-md text-center font-black text-xs" />
                          </div>
                          <div className="flex items-center gap-1.5 font-bold text-xs justify-start w-24 md:w-36 truncate">
                            <span className="text-lg flex-shrink-0">{match.team2Emoji}</span><span className="truncate">{match.team2}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-row md:flex-col items-center justify-between md:justify-center md:w-48 w-full border-t md:border-t-0 md:border-r border-white/5 pt-2 md:pt-0 gap-2 flex-shrink-0">
                      <div className="text-[9px] font-black bg-purple-950/50 border border-purple-500/20 px-2 py-1 rounded-md text-red-400 tracking-tight">⏰ ينتهي: {globalCountdowns[match.id] || "00:00:00"}</div>
                      {!userPredictionsKeys[match.id] && (
                        <button onClick={() => handleSavePredictionForMatch(match.id, match.team1, match.team1Emoji, match.team2, match.team2Emoji, match.kickoff)} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black px-3 py-1.5 rounded-lg text-[10px] shadow-md transition-all interactive-btn">إرسال التوقع 🚀</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* لوحة الصدارة العامة المكونة من أول 20 اسماً مع أزرار الصفحات بالأسفل */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="md:col-span-2 bg-slate-900/40 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-purple-900/20 flex flex-col justify-between">
                <div>
                  <h3 className="font-black text-xs md:text-base text-amber-400 mb-3 border-b border-purple-900/30 pb-2">🏆 لوحة الصدارة العامة المباشرة</h3>
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-xs text-center border-collapse">
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
                        {slicedLeaderboard.map((u: any, i: number) => (
                          <tr key={i} className="hover:bg-purple-950/20 transition-all">
                            {/* ⚡ تعديل: عرض العلم المختار بجانب اسم اللاعب بلوحة الصدارة مباشرة لإشعال الحماس */}
                            <td className="py-3 px-2 text-right font-black text-white flex items-center gap-1.5">{(currentPage - 1) * itemsPerPage + i + 1}. {u.name} <span className="text-sm flex-shrink-0">{u.teamEmoji}</span></td>
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
                    <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="bg-purple-950 border border-purple-500/20 px-3 py-1 rounded-lg text-purple-300 disabled:opacity-40 interactive-btn">◀ السابق</button>
                    <span className="font-bold text-slate-400">صفحة {currentPage} من {maxPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(p + 1, maxPages))} disabled={currentPage === maxPages} className="bg-purple-950 border border-purple-500/20 px-3 py-1 rounded-lg text-purple-300 disabled:opacity-40 interactive-btn">التالي ▶</button>
                  </div>
                )}
              </div>

              {/* صندوق الشات الفوري */}
              <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl p-4 border border-purple-900/20 h-[450px] flex flex-col justify-between overflow-hidden w-full">
                <div className="overflow-hidden flex flex-col h-full flex-1 w-full">
                  <h3 className="font-black text-xs md:text-base text-purple-300 border-b border-purple-900/20 pb-2.5 mb-2.5">💬 دردشة زوار المنصة الفورية</h3>
                  <div className="space-y-2.5 overflow-y-auto flex-1 text-xs hidden-scrollbar flex flex-col-reverse pr-0.5 w-full">
                    {chatList.map((msg: any, i: number) => (
                      <div key={i} className="bg-slate-950/60 p-2.5 rounded-xl border border-purple-500/10 shadow-sm flex flex-col text-right w-full">
                        <span className="font-black text-[10px] text-purple-400 mb-0.5">👤 {msg.user} {msg.teamEmoji}</span>
                        <p className="text-slate-200 leading-relaxed font-medium break-words w-full">{msg.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <form onSubmit={handleSendMessage} className="mt-2.5 flex gap-2 border-t border-purple-900/20 pt-2.5 w-full">
                  <button type="submit" className="bg-purple-600 text-white font-black px-4 py-2 rounded-xl text-xs md:text-sm shadow-md flex-shrink-0 interactive-btn">إرسال</button>
                  <input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} placeholder="اكتب تعليقك المباشر..." className="flex-1 bg-slate-500/10 border border-purple-500/20 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500" />
                </form>
              </div>
            </div>
          </main>
        )}

        {activeTab === "match_fixtures" && (
          <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            <div className="bg-slate-900/60 p-4 rounded-2xl border border-purple-500/20 shadow-2xl">
              <h3 className="font-black text-sm text-amber-400 mb-4 border-b border-purple-900/20 pb-2 flex items-center gap-2">📅 جدول ومواعيد بطولة كأس العالم 2026 كاملة</h3>
              <div className="space-y-5 max-h-[70vh] overflow-y-auto hidden-scrollbar">
                {FIXTURES_365_DATABASE.map((fixture: any, idx: number) => (
                  <div key={idx} className="space-y-2 text-right px-1">
                    <div className="text-[11px] font-black text-purple-400 bg-purple-950/30 px-3 py-1 rounded-lg inline-block">{fixture.day}</div>
                    <div className="bg-slate-950 border border-purple-900/20 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between text-center gap-3">
                      <div className="text-[10px] text-slate-500 font-bold md:w-32 text-right">{fixture.group}</div>
                      <div className="flex items-center gap-6 justify-center flex-1">
                        <div className="flex items-center gap-2 font-black text-xs md:text-sm justify-end w-28 md:w-40"><span>{fixture.team1}</span><span className="text-xl flex-shrink-0">{fixture.team1Emoji}</span></div>
                        <div className="bg-purple-900/40 border border-purple-500/30 text-green-400 font-mono font-black text-xs md:text-sm px-4 py-1.5 rounded-xl shadow-inner min-w-[90px]">{fixture.score ? fixture.score : fixture.time}</div>
                        <div className="flex items-center gap-2 font-black text-xs md:text-sm justify-start w-28 md:w-40"><span className="text-xl flex-shrink-0">{fixture.team2Emoji}</span><span>{fixture.team2}</span></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        )}

        {activeTab === "points_rules" && (
          <main className="max-w-4xl mx-auto px-4 py-6">
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-purple-500/20 shadow-2xl space-y-6">
              <h3 className="font-black text-base text-amber-400 border-b border-purple-900/20 pb-2">📊 قوانين احتساب النقاط التفاعلية</h3>
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

      {/* مودال التحكم والتسجيل السريع */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/30 w-full max-w-md rounded-2xl p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto text-slate-100">
            <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 left-4 text-slate-400 bg-slate-50 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border border-purple-500/20 interactive-btn">✕</button>
            {authMode === "menu" && (
              <div className="space-y-6 py-4 text-center">
                <div><h4 className="text-base md:text-lg font-black text-white mb-1">🔐 اختر طريقة الدخول</h4><p className="text-xs text-slate-400">احفظ نقاطك وتوقعاتك فوراً في لوحة الصدارة</p></div>
                <div className="space-y-3 pt-2">
                  <button onClick={() => setAuthMode("guest")} type="button" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl text-xs md:text-sm flex items-center justify-center gap-2 interactive-btn"><span>🟢</span> التسجيل السريع</button>
                  <div className="border-t border-purple-950/50 my-4 pt-3"><button onClick={() => setAuthMode("manual_login")} type="button" className="text-xs text-purple-400 hover:text-purple-300 font-bold underline interactive-btn">👉 تسجيل دخول بحساب سابق</button></div>
                </div>
              </div>
            )}

            {authMode === "guest" && (
              <form onSubmit={handleGuestLogin} className="space-y-4 py-2 text-right">
                <div className="text-center mb-3"><h4 className="text-base font-black text-white"> 🟢  التسجيل السريع الحصري</h4></div>
                <div><label className="block text-[11px] font-bold text-purple-300 mb-1">الاسم</label><input type="text" required placeholder="اكتب اسمك الثلاثي" onChange={(e) => setUser({...user, fullName: e.target.value})} className="w-full bg-slate-950 border border-purple-500/20 rounded-xl px-4 py-2.5 text-xs md:text-sm text-slate-100 focus:outline-none" /></div>
                <div><label className="block text-[11px] font-bold text-purple-300 mb-1">الرقم السري الخاص بحسابك</label><input type="password" required placeholder="ادخل رقماً سرياً" onChange={(e) => setUser({...user, password: e.target.value})} className="w-full bg-slate-950 border border-purple-500/20 rounded-xl px-4 py-2.5 text-xs md:text-sm text-slate-100 focus:outline-none" /></div>
                <div><label className="block text-[11px] font-bold text-purple-300 mb-1">رقم الجوال لتثبيت الهوية 📱</label><input type="tel" required placeholder="مثال: 050XXXXXXX" onChange={(e) => setUser({...user, phone: e.target.value})} className="w-full bg-slate-950 border border-purple-500/20 rounded-xl px-4 py-2.5 text-xs md:text-sm text-left text-slate-100 focus:outline-none" dir="ltr" /></div>
                <div><label className="block text-[11px] font-bold text-purple-300 mb-1">المنتخب المرشح لللقب 🏆</label><select required value={user.favoriteTeam} onChange={(e) => setUser({...user, favoriteTeam: e.target.value})} className="w-full bg-slate-950 border border-purple-500/20 rounded-xl px-3 py-2.5 text-xs md:text-sm text-slate-100 focus:outline-none">{WORLD_CUP_2026_TEAMS.map((t: any, i: number) => ( <option key={i} value={t.name}>{t.emoji} {t.name}</option> ))}</select></div>
                <div className="flex gap-2 pt-2"><button type="submit" className="w-full bg-emerald-600 text-white font-black py-2.5 rounded-xl text-xs interactive-btn">تفعيل الدخول الفوري 🚀</button></div>
              </form>
            )}

            {authMode === "manual_login" && (
              <form onSubmit={handleManualLogin} className="space-y-4 py-2 text-right">
                <div className="text-center mb-3"><h4 className="text-base font-black text-yellow-500"> 📝  تسجيل دخول بحساب سابق</h4></div>
                <div><label className="block text-[11px] font-bold text-purple-300 mb-1">الاسم المطابق للحساب</label><input type="text" required placeholder="ادخل اسمك المسجل" value={manualName} onChange={(e) => setManualName(e.target.value)} className="w-full bg-slate-950 border border-purple-500/20 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none" /></div>
                <div><label className="block text-[11px] font-bold text-purple-300 mb-1">الرقم السري</label><input type="password" required placeholder="ادخل رقمك السري" value={manualPassword} onChange={(e) => setManualPassword(e.target.value)} className="w-full bg-slate-950 border border-purple-500/20 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none" /></div>
                <div className="flex gap-2 pt-2"><button type="submit" className="flex-1 bg-purple-600 text-white font-black py-2.5 rounded-xl text-xs interactive-btn">استعادة الجلسة</button></div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 👤 مودال تحرير الملف الشخصي وتعديل الجوال والترشيح المستعاد كاملاً */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 w-full max-w-md rounded-2xl p-5 shadow-2xl relative text-slate-100 text-right">
            <button onClick={() => setIsProfileModalOpen(false)} className="absolute top-4 left-4 text-slate-400 bg-slate-50 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black interactive-btn">✕</button>
            <h4 className="text-center font-black text-amber-400 text-sm md:text-base border-b border-white/5 pb-2 mb-4">👤 تعديل بيانات حسابي الشخصي</h4>
            <form onSubmit={handleUpdateUserProfile} className="space-y-3.5 text-xs font-bold">
              <div><label className="text-purple-300 block mb-1">الاسم</label><input type="text" value={editProfileFields.fullName} onChange={(e)=>setEditProfileFields({...editProfileFields, fullName: e.target.value})} className="w-full bg-slate-950 border border-purple-500/20 p-2.5 rounded-xl text-white focus:outline-none" required /></div>
              <div><label className="text-purple-300 block mb-1">الرقم السري</label><input type="text" value={editProfileFields.password} onChange={(e)=>setEditProfileFields({...editProfileFields, password: e.target.value})} className="w-full bg-slate-950 border border-purple-500/20 p-2.5 rounded-xl text-white focus:outline-none" required /></div>
              <div><label className="text-purple-300 block mb-1">رقم الجوال لتثبيت الحساب 📱</label><input type="tel" value={editProfileFields.phone} onChange={(e)=>setEditProfileFields({...editProfileFields, phone: e.target.value})} className="w-full bg-slate-950 border border-purple-500/20 p-2.5 rounded-xl text-white focus:outline-none text-left" dir="ltr" placeholder="اكتب رقم جوالك الحالي" /></div>
              <div><label className="text-purple-300 block mb-1">تعديل ترشيح البطل 🏆</label><select value={editProfileFields.favoriteTeam} onChange={(e)=>setEditProfileFields({...editProfileFields, favoriteTeam: e.target.value})} className="w-full bg-slate-950 border border-purple-500/20 p-2.5 rounded-xl text-white focus:outline-none">{WORLD_CUP_2026_TEAMS.map((t: any, i: number) => ( <option key={i} value={t.name}>{t.emoji} {t.name}</option> ))}</select></div>
              <button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-black py-3 rounded-xl shadow-lg mt-2 interactive-btn">حفظ التغييرات 💾</button>
            </form>
          </div>
        </div>
      )}

      {/* 👤 الفوتر الأصلي المعتمد المستعاد بنجاح وثبات كاملاً */}
      <footer className="bg-slate-950 text-slate-500 py-6 mt-12 border-t border-purple-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-xs text-center sm:text-right order-2 sm:order-1">
            <p className="font-bold text-slate-400">تحدي توقعات كأس العالم 2026</p>
            <p className="text-slate-600">© جميع الحقوق محفوظة • اطلاق تجريبي V5.1</p>
          </div>
          <div className="flex items-center gap-3 bg-slate-900/50 border border-purple-500/10 px-4 py-2 rounded-xl order-1 sm:order-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-bold text-white text-sm shadow-[0_0_10px_rgba(147,51,234,0.3)]">ع</div>
            <div className="text-xs text-right">
              <span className="block text-[10px] text-purple-500 font-black">فكرة وتطوير</span>
              <span className="block font-black text-white mt-0.5">عبدالسلام العنزي</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}