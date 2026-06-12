"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, addDoc, onSnapshot, query, orderBy, getDocs, where, doc, updateDoc } from "firebase/firestore";

// 🕋 جدول بطولة كأس العالم 2026 الحقيقي المعتمد من الفيفا وقوقل بتوقيت مكة المكرمة الرسمي
const FIXTURES_365_DATABASE = [
  { id: "wc_01", day: "الجمعة 12 يونيو (اليوم)", group: "كأس العالم - دور المجموعات", team1: "كندا", team1Emoji: "🇨🇦", team2: "البوسنة والهرسك", team2Emoji: "🇧🇦", time: "10:00 م", kickoff: "2026-06-12T22:00:00" },
  { id: "wc_02", day: "السبت 13 يونيو (غداً)", group: "كأس العالم - دور المجموعات", team1: "الولايات المتحدة", team1Emoji: "🇺🇸", team2: "باراغواي", team2Emoji: "🇵🇾", time: "04:00 ص", kickoff: "2026-06-13T04:00:00" },
  { id: "wc_03", day: "السبت 13 يونيو (غداً)", group: "كأس العالم - دور المجموعات", team1: "قطر", team1Emoji: "🇶🇦", team2: "سويسرا", team2Emoji: "🇨🇭", time: "10:00 م", kickoff: "2026-06-13T22:00:00" },
  { id: "wc_04", day: "الأحد 14 يونيو", group: "كأس العالم - دور المجموعات", team1: "البرازيل", team1Emoji: "🇧🇷", team2: "المغرب", team2Emoji: "🇲🇦", time: "01:00 ص", kickoff: "2026-06-14T01:00:00" },
  { id: "wc_05", day: "الأحد 14 يونيو", group: "كأس العالم - دور المجموعات", team1: "هايتي", team1Emoji: "🇭🇹", team2: "اسكتلندا", team2Emoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", time: "04:00 ص", kickoff: "2026-06-14T04:00:00" },
  { id: "wc_06", day: "الأحد 14 يونيو", group: "كأس العالم - دور المجموعات", team1: "أستراليا", team1Emoji: "🇦🇺", team2: "تركيا", team2Emoji: "🇹🇷", time: "07:00 ص", kickoff: "2026-06-14T07:00:00" },
  { id: "wc_07", day: "الأحد 14 يونيو", group: "كأس العالم - دور المجموعات", team1: "ألمانيا", team1Emoji: "🇩🇪", team2: "كوراساو", team2Emoji: "🇨🇼", time: "08:00 م", kickoff: "2026-06-14T20:00:00" },
  { id: "wc_08", day: "الأحد 14 يونيو", group: "كأس العالم - دور المجموعات", team1: "هولندا", team1Emoji: "🇳🇱", team2: "اليابان", team2Emoji: "🇯🇵", time: "11:00 م", kickoff: "2026-06-14T23:00:00" },
  { id: "wc_09", day: "الاثنين 15 يونيو", group: "كأس العالم - دور المجموعات", team1: "السعودية", team1Emoji: "🇸🇦", team2: "فرنسا", team2Emoji: "🇫🇷", time: "09:00 م", kickoff: "2026-06-15T21:00:00" }
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
  const [next48HoursMatches, setNext48HoursMatches] = useState<any[]>([]);
  
  const [topFavTeams, setTopFavTeams] = useState<any[]>([]);
  const [predictionsValues, setPredictionsValues] = useState<{ [key: string]: { team1Score: string; team2Score: string } }>({});
  const [userPredictionsKeys, setUserPredictionsKeys] = useState<{ [key: string]: boolean }>({});
  const [globalCountdowns, setGlobalCountdowns] = useState<{ [key: string]: string }>({});
  // 🔐 ربط التوقعات بـ الحساب السحابي الموحد لتعمل عبر أي جهاز بالملي وبدون LocalStorage
  const [firebaseUserPredictions, setFirebaseUserPredictions] = useState<{ [key: string]: any }>({});
  
  // 🔔 حاويات الإشعارات التفاعلية الفورية والـ Confetti والـ Loading
  const [activeNotifications, setActiveNotifications] = useState<any[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  const [tickerSpeed, setTickerSpeed] = useState("30s");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // داتا بطاقات التحفيز العلوي
  const [streakKing, setStreakKing] = useState("لا يوجد حالياً 🔥");
  const [leaderKing, setLeaderKing] = useState("جاري الحساب... 👑");

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
    
    // دمج مباريات الطوارئ المنشورة والمعدلة من لوحة الآدمن لايف بالجمهور
    const unsubMatches = onSnapshot(query(collection(db, "custom_matches"), orderBy("kickoff", "asc")), (snap) => {
      const dynamicMatches = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const merged = [...FIXTURES_365_DATABASE, ...dynamicMatches];
      
      const now = new Date();
      const expirationLimit = now.getTime() - (120 * 60 * 1000); 
      const fortyEightHoursAhead = now.getTime() + (48 * 60 * 60 * 1000);
      
      const filtered = merged.filter(m => {
        const matchTime = new Date(m.kickoff).getTime();
        return matchTime > expirationLimit && matchTime <= fortyEightHoursAhead;
      });
      setNext48HoursMatches(filtered.length > 0 ? filtered : merged);
    });

    const unsubUsers = onSnapshot(query(collection(db, "users")), (snap) => {
      const rawUsers = snap.docs.map(doc => ({ id: doc.id, name: doc.data().fullName, teamEmoji: doc.data().teamEmoji || "🏆", total: doc.data().total || 0, correct: doc.data().correct || 0, wrong: doc.data().wrong || 0, points: doc.data().points || 0, favoriteTeam: doc.data().favoriteTeam, rankDirection: doc.data().rankDirection || "➖", rankChange: doc.data().rankChange || 0 }));
      
      const sortedUsers = rawUsers.sort((a, b) => {
        if (a.total === 0 && b.total > 0) return 1;
        if (b.total === 0 && a.total > 0) return -1;
        if (b.points !== a.points) return b.points - a.points;
        if (b.correct !== a.correct) return b.correct - a.correct;
        return b.total - a.total;
      });

      const finalLeaderboard = sortedUsers.map((u, idx) => ({ ...u, rank: idx + 1 }));
      setLeaderboard(finalLeaderboard);

      // استخراج هوية بطاقات ملك وسلسلة التوقعات لايف
      if (finalLeaderboard.length > 0) {
        setLeaderKing(finalLeaderboard[0].name);
        const streakUser = [...finalLeaderboard].sort((a,b) => b.correct - a.correct)[0];
        if (streakUser && streakUser.correct > 0) setStreakKing(streakUser.name);
      }

      const counts: { [key: string]: number } = {};
      snap.docs.forEach(d => { const team = d.data().favoriteTeam || "السعودية 🇸🇦"; counts[team] = (counts[team] || 0) + 1; });
      const sortedTeams = Object.keys(counts).map(teamName => {
        const matched = WORLD_CUP_2026_TEAMS.find(t => teamName.includes(t.name));
        return { name: matched ? matched.name : teamName, emoji: matched ? matched.emoji : "🏆", votes: counts[teamName] };
      }).sort((a, b) => b.votes - a.votes).slice(0, 3);
      setTopFavTeams(sortedTeams);
    });

    return () => { unsubSpeed(); unsubChat(); unsubPred(); unsubMatches(); unsubUsers(); };
  }, []);

  // 🔐 الاستماع لتوقعات وإشعارات النقاط غير المقروءة للعضو المسجل لايف عبر السيرفر
  useEffect(() => {
    if (!user.fullName) return;
    const q = query(collection(db, "predictions"), where("user", "==", user.fullName));
    const unsubUserPreds = onSnapshot(q, (snap) => {
      const mapped: { [key: string]: any } = {};
      snap.docs.forEach(d => { const data = d.data(); mapped[data.matchId] = data; });
      setFirebaseUserPredictions(mapped);
    });

    const qNotif = query(collection(db, "user_notifications"), where("user", "==", user.fullName), where("viewed", "==", false));
    const unsubNotif = onSnapshot(qNotif, (snap) => {
      const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setActiveNotifications(notifs);
      if (notifs.some((n: any) => n.pointsAwarded === 3)) {
        setShowConfetti(true); setTimeout(() => setShowConfetti(false), 6000);
      }
    });

    return () => { unsubUserPreds(); unsubNotif(); };
  }, [user.fullName]);
  const handleDismissNotification = async (id: string) => {
    try {
      await updateDoc(doc(db, "user_notifications", id), { viewed: true });
    } catch (err) { console.error(err); }
  };

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    let targetName = user.fullName.trim();
    if (!targetName || !user.password) { alert("يرجى ملء الحقول المطلوبة 🔐"); return; }
    try {
      const snap = await getDocs(query(collection(db, "users"), where("fullName", "==", targetName)));
      if (!snap.empty) { alert("❌ الاسم مسجل مسبقاً، يرجى كتابة اسم فريد."); return; }
      const matchedTeam = WORLD_CUP_2026_TEAMS.find(t => t.name === user.favoriteTeam);
      const chosenEmoji = matchedTeam ? matchedTeam.emoji : "🏆";
      const userData = { fullName: targetName, favoriteTeam: user.favoriteTeam || "السعودية 🇸🇦", teamEmoji: chosenEmoji, password: user.password, phone: user.phone || "", points: 0, total: 0, correct: 0, wrong: 0, currentRank: 99, previousRank: 99, rankDirection: "➖", rankChange: 0, createdAt: new Date().toISOString() };
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

  const handleLogout = () => {
    localStorage.removeItem("worldCupUser");
    setUser({ id: "", fullName: "", favoriteTeam: "السعودية 🇸🇦", teamEmoji: "🇸🇦", password: "", phone: "" });
    setIsLoggedIn(false);
  };

  const handleSavePredictionForMatch = async (matchId: string, team1: string, team1Emoji: string, team2: string, team2Emoji: string, kickoff: string) => {
    if (!isLoggedIn) { setIsAuthModalOpen(true); return; }
    if (new Date().getTime() > new Date(kickoff).getTime()) { alert("أُغلقت التوقعات لبدء المباراة فعلياً!"); return; }
    if (firebaseUserPredictions[matchId]) { alert("لقد قمت بحفظ وتثبيت توقعك مسبقاً في حساب السيرفر!"); return; }

    const matchScores = predictionsValues[matchId];
    if (!matchScores || !matchScores.team1Score || !matchScores.team2Score) { alert("يرجى إدخال نتيجة التوقع أولاً ⚽"); return; }
    
    setIsSubmitLoading(true);
    try {
      await addDoc(collection(db, "predictions"), { matchId, user: user.fullName, t1: team1, t1E: team1Emoji, t2: team2, t2E: team2Emoji, score1: matchScores.team1Score, score2: matchScores.team2Score, processed: false, pointsAwarded: 0, createdAt: new Date().toISOString() });
      setUserPredictionsKeys(prev => ({ ...prev, [matchId]: true }));
      alert("🎯 تم اعتماد وتثبيت التوقع سحابياً عبر قاعدة البيانات!");
    } catch (err) { console.error(err); }
    setIsSubmitLoading(false);
  };

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
      
      {showConfetti && (
        <div className="fixed inset-0 z-50 pointer-events-none bg-purple-500/10 backdrop-blur-sm flex items-center justify-center animate-pulse">
          <div className="text-center bg-slate-950/90 border border-yellow-500 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-black text-yellow-400">🎉 احتفالية فوز كبرى! 🎉</h2>
            <p className="text-sm font-bold text-white mt-2">مبروك! جبت التوقع صح وحصلت على 3 نقاط كاملة</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes marqueeScrollRight { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .forced-marquee-right { display: flex; white-space: nowrap; animation: marqueeScrollRight ${tickerSpeed} linear infinite; }
        .forced-marquee-right:hover { animation-play-state: paused; }
        .hidden-scrollbar::-webkit-scrollbar { display: none; }
        .interactive-btn { transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1); }
        .interactive-btn:active { transform: scale(0.96); filter: brightness(1.35) contrast(1.1); box-shadow: 0 0 20px rgba(168,85,247,0.5); }
      `}</style>

      <div>
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

        {/* 🔔 قسم كروت إشعارات الأرباح غير المزعجة عند الدخول */}
        {activeNotifications.length > 0 && (
          <div className="max-w-4xl mx-auto px-4 mt-4 space-y-2">
            {activeNotifications.map((notif: any) => (
              <div key={notif.id} className="bg-slate-950/90 border border-purple-500/20 rounded-xl p-3 flex items-center justify-between gap-4 shadow-xl">
                <p className="text-xs font-bold text-slate-200">
                  {notif.pointsAwarded === 3 && `🎉 مبروك! جبت التوقع صح وحصلت على 3 نقاط في مباراة (${notif.t1} vs ${notif.t2})`}
                  {notif.pointsAwarded === 1 && `👏 ممتاز! حصلت على نقطة واحدة لمباراة (${notif.t1} vs ${notif.t2})`}
                  {notif.pointsAwarded === 0 && `ولا يهمك، أنت قدها وتعوضها بالتوقعات الجاية 💪 لمباراة (${notif.t1} vs ${notif.t2})`}
                </p>
                <button onClick={() => handleDismissNotification(notif.id)} className="bg-purple-900 text-purple-300 text-[10px] px-2.5 py-1 rounded-lg font-black interactive-btn">تم القراءة ✓</button>
              </div>
            ))}
          </div>
        )}

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

        <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-purple-950 text-white h-8 flex items-center overflow-hidden text-xs font-bold border-b border-purple-500/10 shadow-sm">
          <div className="bg-purple-900 px-3 h-full flex items-center z-10 font-black text-[10px] text-purple-300 border-l border-purple-500/20 flex-shrink-0">🔥 آخر التوقعات:</div>
          <div className="w-full relative overflow-hidden flex items-center">
            <div className="forced-marquee-right gap-10 items-center">
              {livePredictions.slice(0, 15).map((p: any, idx: number) => (
                <span key={idx} className="text-slate-300 text-[11px] font-medium">
                  ⚡ <span className="text-yellow-400 font-extrabold">{p.user}</span> يتوقع: {p.t1E} {p.t1} <span className="font-mono bg-purple-950 px-1.5 rounded text-green-400 font-black">{p.score1}-{p.score2}</span> {p.t2} {p.t2E}
                </span>
              ))}
            </div>
          </div>
        </div>
        {activeTab === "main_screen" && (
          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
            <section className="space-y-4">
              <div className="text-center md:text-right mb-2"><h3 className="text-sm md:text-lg font-black text-purple-300">🔥 شارك توقعك الآن</h3></div>
              
              <div className="space-y-2.5">
                {next48HoursMatches.map((match: any) => {
                  // قفل التوقعات من السيرفر مباشرة لتعمل على أي جهاز أو متصفح آخر
                  const savedPred = firebaseUserPredictions[match.id];
                  return (
                    <div key={match.id} className="bg-slate-900/80 backdrop-blur-xl rounded-xl p-3 shadow-lg border border-purple-500/10 flex flex-col md:flex-row items-center justify-between gap-3 text-center">
                      <div className="flex flex-col text-center md:text-right md:w-48 w-full border-b md:border-b-0 md:border-l border-white/5 pb-2 md:pb-0 flex-shrink-0">
                        <span className="text-[10px] font-black text-purple-400">{match.day}</span>
                        <span className="text-[9px] font-bold text-slate-500 mt-0.5">{match.group}</span>
                      </div>

                      <div className="flex items-center justify-center flex-1 w-full py-1">
                        {savedPred ? (
                          /* 🕋 الحفاظ على أعلام اللقاء الأصلية وتثبيتها مية بالمية لمنع انعكاسها مجدداً */
                          <div className="text-center py-1.5 animate-fade-in font-bold text-xs">
                            <span className="text-slate-400">{match.team1} {match.team1Emoji} </span>
                            <span className="font-mono bg-purple-950 px-3 py-1 rounded-xl text-green-400 font-black text-sm mx-1">{savedPred.score1} - {savedPred.score2}</span>
                            <span className="text-slate-400"> {match.team2Emoji} {match.team2}</span>
                            <div className="text-green-400 font-black text-sm mt-1">توقعك وصل واعتمدناه 🎯</div>
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
                        {!savedPred && (
                          <button onClick={() => handleSavePredictionForMatch(match.id, match.team1, match.team1Emoji, match.team2, match.team2Emoji, match.kickoff)} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black px-3 py-1.5 rounded-lg text-[10px] shadow-md transition-all interactive-btn">إرسال التوقع 🚀</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto pt-2">
              <div className="bg-gradient-to-br from-purple-950 to-slate-950 border border-purple-500/20 rounded-2xl p-4 flex items-center justify-between shadow-2xl">
                <div>
                  <span className="text-xs text-purple-400 font-black block">🔥 أفضل 3 توقعات متتالية</span>
                  <span className="text-sm font-black text-white mt-1 block">{streakKing}</span>
                </div>
                <span className="text-2xl animate-pulse">🔥</span>
              </div>
              <div className="bg-gradient-to-br from-indigo-950 to-slate-950 border border-purple-500/20 rounded-2xl p-4 flex items-center justify-between shadow-2xl">
                <div>
                  <span className="text-xs text-amber-400 font-black block">👑 ملك التوقعات</span>
                  <span className="text-sm font-black text-white mt-1 block">{leaderKing}</span>
                </div>
                <span className="text-2xl animate-bounce">👑</span>
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="md:col-span-2 bg-slate-900/40 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-purple-900/20 flex flex-col justify-between overflow-hidden">
                <div className="w-full max-w-full overflow-hidden">
                  <h3 className="font-black text-xs md:text-base text-amber-400 mb-3 border-b border-purple-900/30 pb-2">🏆 لوحة الصدارة العامة المباشرة</h3>
                  <div className="w-full max-w-full overflow-x-hidden">
                    
                    {/* 🛠️ التعديل الجذري المعتمد: منع السحب الأفقي مية بالمية في الجوال وتقليل الـ Padding وحجم خطوط الأرقام */}
                    <table className="w-full text-center border-collapse max-w-full" style={{ tableLayout: "fixed" }}>
                      <thead>
                        <tr className="bg-purple-950/40 text-purple-300 font-black border-b border-purple-900/30 text-[10px] md:text-xs">
                          <th className="py-2 px-1 text-right w-[20%] sm:w-[18%]">المركز</th>
                          <th className="py-2 px-1 text-right w-[40%] sm:w-[42%]">الاسم</th>
                          <th className="py-2 px-0.5 w-[10%] text-center">توقع</th>
                          <th className="py-2 px-0.5 w-[10%] text-center text-green-400">صح</th>
                          <th className="py-2 px-0.5 w-[10%] text-center text-red-400">خطأ</th>
                          <th className="py-2 px-0.5 w-[10%] text-center text-yellow-400">نقاط</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-950/20 font-bold text-slate-300">
                        {slicedLeaderboard.map((u: any, i: number) => (
                          <tr key={i} className="hover:bg-purple-950/20 transition-all text-[11px] md:text-xs">
                            
                            {/* المركز والأسهم مصغرة جداً ومثبتة جهة اليمين */}
                            <td className="py-2 px-1 text-right font-black bg-purple-950/10 rounded-r-lg">
                              <div className="flex items-center gap-0.5 md:gap-1 justify-start">
                                <span className={`text-[8px] md:text-[10px] px-1 py-0.5 rounded font-black flex-shrink-0 ${u.rankDirection === '⬆️' ? 'bg-green-950/70 text-green-400' : (u.rankDirection === '⬇️' ? 'bg-red-950/70 text-red-400' : 'bg-slate-800/70 text-slate-400')}`}>
                                  {u.rankDirection}{u.rankChange > 0 ? u.rankChange : ""}
                                </span>
                                <span className="text-amber-500 font-black text-[11px] md:text-sm">#{u.rank}</span>
                              </div>
                            </td>

                            {/* الاسم الطويل ينزل على سطرين بكامل حروفه وبدون قص بنقاط طبقاً لطلبك الحرفي */}
                            <td className="py-2 px-1 text-right font-black text-white">
                              <div className="flex items-center gap-1 flex-wrap md:flex-nowrap justify-start w-full">
                                <span className="text-xs md:text-[14px] leading-snug break-words overflow-wrap-anywhere whitespace-normal font-black block">
                                  {u.name}
                                </span>
                                <span className="text-xs md:text-sm flex-shrink-0 block">{u.teamEmoji}</span>
                              </div>
                            </td>

                            <td className="py-2 px-0.5 font-mono text-slate-400 text-center text-[11px] md:text-sm">{u.total}</td>
                            <td className="py-2 px-0.5 font-mono text-green-400 text-center text-[11px] md:text-sm">{u.correct}</td>
                            <td className="py-2 px-0.5 font-mono text-red-400 text-center text-[11px] md:text-sm">{u.wrong}</td>
                            <td className="py-2 px-0.5 font-mono font-black text-amber-400 text-center text-[12px] md:text-sm">{u.points}</td>
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

              {/* صندوق الشات */}
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
                  <input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} placeholder="اكتب تعليقك المباشر..." className="flex-1 bg-slate-500/10 border border-purple-500/20 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none" />
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
                        <div className="bg-purple-900/40 border border-purple-500/30 text-green-400 font-mono font-black text-xs md:text-sm px-4 py-1.5 rounded-xl shadow-inner min-w-[90px]">{fixture.time}</div>
                        <div className="flex items-center gap-2 font-black text-xs md:text-sm justify-start w-28 md:w-40"><span className="text-xl flex-shrink-0">{fixture.team2Emoji}</span><span>{fixture.team2}</span></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        )}
      </div>

      {/* الفوتر القديم المستعاد والمطابق تماماً */}
      <footer className="bg-slate-950 text-slate-500 py-6 mt-12 border-t border-purple-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-xs text-center sm:text-right order-2 sm:order-1">
            <p className="font-bold text-slate-400">تحدي توقعات كأس العالم 2026</p>
            <p className="text-slate-600">© جميع الحقوق محفوظة • اطلاق تجريبي V5.1</p>
            <p className="text-purple-500 font-black mt-0.5">فكرة وتطوير عبدالسلام العنزي</p>
          </div>
          <div className="flex items-center gap-3 bg-slate-900/50 border border-purple-500/10 px-4 py-2 rounded-xl order-1 sm:order-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-bold text-white text-sm shadow-[0_0_10px_rgba(147,51,234,0.3)]">ع</div>
          </div>
        </div>
      </footer>
    </div>
  );
}