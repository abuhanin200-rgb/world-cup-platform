"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase"; 
import { collection, addDoc, onSnapshot, query, orderBy, getDocs, where, doc, updateDoc } from "firebase/firestore";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const WORLD_CUP_2026_TEAMS = [
  { code: "MX", name: "المكسيك", emoji: "🇲🇽" }, { code: "ZA", name: "جنوب أفريقيا", emoji: "🇿🇦" },
  { code: "SA", name: "السعودية", emoji: "🇸🇦" }, { code: "MA", name: "المغرب", emoji: "🇲🇦" },
  { code: "EG", name: "مصر", emoji: "🇪🇬" }, { code: "US", name: "الولايات المتحدة", emoji: "🇺🇸" },
  { code: "AR", name: "الأرجنتين", emoji: "🇦🇷" }, { code: "BR", name: "البرازيل", emoji: "🇧🇷" },
  { code: "FR", name: "فرنسا", emoji: "🇫🇷" }, { code: "ES", name: "إسبانيا", emoji: "🇪🇸" }
];

export default function HomePage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // التحكم في القائمة المنسدلة
  const [authMode, setAuthMode] = useState<"menu" | "guest" | "manual_login">("menu");
  
  const [user, setUser] = useState<any>({ fullName: "", favoriteTeam: "", residence: "السعودية" });
  const [manualName, setManualName] = useState("");
  const [userPrediction, setUserPrediction] = useState({ team1Score: "", team2Score: "" });
  const [hasPredicted, setHasPredicted] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  
  const [chatList, setChatList] = useState<any[]>([]);
  const [livePredictions, setLivePredictions] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [predictionsStats, setPredictionsStats] = useState({ total: 0, correct: 0, wrong: 0, points: 0 });
  const [countdown, setCountdown] = useState("00:00:00");

  const [currentMatch, setCurrentMatch] = useState({
    id: "opening_2026",
    team1: "المكسيك", team1Emoji: "🇲🇽",
    team2: "جنوب أفريقيا", team2Emoji: "🇿🇦",
    kickoff: new Date("2026-06-11T20:00:00"),
    status: "بانتظار ركلة البداية", score: "0 - 0"
  });

  useEffect(() => {
    const savedUser = localStorage.getItem("worldCupUser");
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setIsLoggedIn(true);
      const savedPred = localStorage.getItem(`hasPredicted_${parsedUser.fullName}`);
      if (savedPred) setHasPredicted(true);
    }
  }, []);

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
        rank: idx + 1,
        name: doc.data().fullName,
        total: doc.data().total || 0,
        correct: doc.data().correct || 0,
        wrong: doc.data().wrong || 0,
        points: doc.data().points || 0
      })));
    });

    return () => { unsubChat(); unsubPred(); unsubUsers(); };
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user && result.user.displayName) {
        const userData = { fullName: result.user.displayName, favoriteTeam: "لم يحدد بعد", points: 0, total: 0, correct: 0, wrong: 0, createdAt: new Date().toISOString() };
        localStorage.setItem("worldCupUser", JSON.stringify(userData));
        setUser(userData); setIsLoggedIn(true); setIsAuthModalOpen(false);
        await addDoc(collection(db, "users"), userData);
        if (localStorage.getItem(`hasPredicted_${result.user.displayName}`)) setHasPredicted(true);
      }
    } catch (err) { alert("حدث تعليق في دومين قوقل، استخدم خيار الضيف السريع."); }
  };

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const userData = { fullName: user.fullName.trim() + " (ضيف)", favoriteTeam: user.favoriteTeam, points: 0, total: 0, correct: 0, wrong: 0, createdAt: new Date().toISOString() };
    localStorage.setItem("worldCupUser", JSON.stringify(userData));
    setUser(userData); setIsLoggedIn(true); setIsAuthModalOpen(false);
    await addDoc(collection(db, "users"), userData);
    alert("تم تفعيل حساب الضيف بنجاح! 🚀");
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;
    const q = query(collection(db, "users"), where("fullName", "==", manualName.trim()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const loggedUser = snap.docs[0].data();
      localStorage.setItem("worldCupUser", JSON.stringify(loggedUser));
      setUser(loggedUser); setIsLoggedIn(true); setIsAuthModalOpen(false);
      if (localStorage.getItem(`hasPredicted_${manualName.trim()}`)) setHasPredicted(true);
      alert(`مرحباً بعودتك يا ${manualName}! 👑🏆`);
    } else {
      alert("الاسم غير مسجل، يرجى الدخول كضيف سريع أو عبر قوقل.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("worldCupUser");
    setUser({ fullName: "", favoriteTeam: "", residence: "السعودية" });
    setIsLoggedIn(false); setHasPredicted(false);
  };

  const handleSavePrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) { setIsAuthModalOpen(true); return; }
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
    await addDoc(collection(db, "chats"), { user: user.fullName || "زائر", text: chatMessage, createdAt: new Date().toISOString() });
    setChatMessage("");
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased text-right flex flex-col">
      
      {/* 📺 شريط البث الحي المطور (تصغير المربع الأحمر ليعطي مساحة أكبر للأسماء) */}
      <div className="bg-slate-900 text-white h-10 flex items-center overflow-hidden text-xs font-bold border-b border-purple-900/30">
        <div className="bg-red-600 px-3 h-full flex items-center z-10 shadow-lg flex-shrink-0 animate-pulse">🔥 لايف:</div>
        <div className="w-full relative overflow-hidden flex items-center">
          <div className="flex gap-10 whitespace-nowrap animate-marquee absolute items-center">
            {livePredictions.length === 0 ? (
              <span className="text-purple-200">بانتظار انطلاق أولى التوقعات المباشرة... ⚽🏆</span>
            ) : (
              livePredictions.map((p, idx) => (
                <span key={idx} className="bg-white/5 px-3 py-1 rounded-lg flex items-center gap-2">
                  ⚡ <span className="text-yellow-400 font-black">{p.user}</span>: {p.t1E} {p.score1} - {p.score2} {p.t2E}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Header مع القائمة المنسدلة (Hamburger Menu) على يمين الشعار */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-purple-900/20 px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* أيقونة الخطوط الثلاثة للقائمة المنسدلة */}
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-white text-xl focus:outline-none">
            <i className={`fa-solid ${isMenuOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
          </button>
          <div className="flex items-center gap-2">
            <img src="/wc2026-logo.png" alt="FIFA" className="w-10 h-10 object-contain" />
            <h1 className="text-sm md:text-base font-black text-amber-400">تحدي 2026</h1>
          </div>
        </div>
        
        {/* أزرار الحساب */}
        <div>
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <span className="bg-purple-900/40 text-purple-300 px-3 py-1.5 rounded-xl text-xs font-black">👑 {user.fullName}</span>
              <button onClick={handleLogout} className="text-[10px] text-red-400 font-bold bg-red-950/20 border border-red-900/30 px-2 py-1 rounded-lg">خروج</button>
            </div>
          ) : (
            <button onClick={() => { setAuthMode("menu"); setIsAuthModalOpen(true); }} className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-xl text-xs font-black transition-all">🔐 دخول</button>
          )}
        </div>

        {/* القائمة الجانبية المنسدلة لليمين */}
        {isMenuOpen && (
          <div className="absolute top-16 right-0 w-64 bg-slate-900 border-l border-b border-purple-900/30 shadow-2xl animate-fade-in p-4 space-y-4">
            <button className="block w-full text-right py-2 border-b border-white/5 hover:text-amber-400 font-bold">Stadium 🏟️ المباريات</button>
            <button className="block w-full text-right py-2 border-b border-white/5 hover:text-amber-400 font-bold">Chart 📊 التوقعات</button>
            <button className="block w-full text-right py-2 border-b border-white/5 hover:text-amber-400 font-bold">Rule ⚖️ القوانين</button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 w-full space-y-6 flex-grow">
        
        {/* صندوق التوقع الذكي والمبسط بتعديلاتك */}
        <section className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 bg-gradient-to-r from-red-600 to-pink-600 text-white font-black text-[10px] px-3 py-1 rounded-bl-xl shadow-md">⏰ نهاية التوقع: {countdown}</div>
          
          {hasPredicted ? (
            <div className="text-center py-8 space-y-3">
              <div className="text-5xl animate-bounce">🎯❤️🔥</div>
              <h3 className="text-xl font-black text-green-400">توقعك وصل واعتمدناه 🎯</h3>
              <p className="text-sm text-purple-300 font-bold">لا تنسى ترجع لنا بعد المباراة وتشوف هل توقّعك صح ولا لا 😄</p>
            </div>
          ) : (
            <>
              <h3 className="text-sm md:text-base font-black text-purple-300 mb-4 text-center md:text-right mt-2">🔥 شارك توقعك الآن</h3>
              <form onSubmit={handleSavePrediction} className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-950/50 p-4 rounded-xl border border-purple-500/10">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{currentMatch.team1Emoji}</span>
                  <span className="font-black text-sm md:text-base">{currentMatch.team1}</span>
                  <input type="number" min="0" placeholder="0" required value={userPrediction.team1Score} onChange={(e) => setUserPrediction({...userPrediction, team1Score: e.target.value})} className="w-14 h-11 bg-slate-900 border border-purple-500/30 rounded-xl text-center font-black text-green-400 focus:outline-none" />
                </div>
                <div className="text-purple-400 font-black text-xs">VS</div>
                <div className="flex items-center gap-4 md:flex-row-reverse">
                  <span className="text-3xl">{currentMatch.team2Emoji}</span>
                  <span className="font-black text-sm md:text-base">{currentMatch.team2}</span>
                  <input type="number" min="0" placeholder="0" required value={userPrediction.team2Score} onChange={(e) => setUserPrediction({...userPrediction, team2Score: e.target.value})} className="w-14 h-11 bg-slate-900 border border-purple-500/30 rounded-xl text-center font-black text-green-400 focus:outline-none" />
                </div>
                <button type="submit" className="w-full md:w-auto bg-purple-600 hover:bg-purple-500 text-white font-black px-8 py-3 rounded-xl text-xs md:text-sm transition-all shadow-lg">حفظ وارسال التوقع</button>
              </form>
            </>
          )}
        </section>

        {/* لوحة الصدارة والشات المباشر */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-slate-900/40 rounded-2xl p-5 border border-purple-900/20 overflow-hidden">
              <h3 className="font-black text-amber-400 mb-3 border-b border-purple-900/30 pb-2">🏆 لوحة الصدارة التلقائية</h3>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-xs md:text-sm text-center">
                  <thead className="text-purple-300 font-black border-b border-purple-900/30">
                    <tr><th className="py-2 text-right">الترتيب والاسم</th><th>عدد التوقعات</th><th>النقاط</th></tr>
                  </thead>
                  <tbody className="divide-y divide-purple-950/10 font-bold text-slate-300">
                    {leaderboard.length === 0 ? (
                      <tr><td colSpan={3} className="py-6 text-center text-slate-500">بانتظار تسجيل التوقعات لبدء الترتيب...</td></tr>
                    ) : (
                      leaderboard.map((u, i) => (
                        <tr key={i} className="hover:bg-purple-950/10"><td className="py-3 text-right font-black text-white">{u.rank}. {u.name}</td><td>{u.total}</td><td className="text-amber-400 font-black">{u.points}</td></tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
          </div>

          {/* غرفة الدردشة الفورية */}
          <div className="bg-slate-900/40 rounded-2xl p-4 border border-purple-900/20 h-[350px] flex flex-col justify-between">
            <div className="overflow-hidden flex flex-col h-full">
              <h3 className="font-black text-xs text-purple-300 border-b border-purple-900/20 pb-2 mb-2">💬 دردشة المنصة الحية</h3>
              <div className="space-y-2 overflow-y-auto flex-1 text-xs hidden-scrollbar flex flex-col-reverse">
                {chatList.map((msg, i) => (
                  <div key={i} className="bg-slate-950/60 p-2 rounded-lg border border-purple-500/10">
                    <span className="block font-black text-[10px] text-purple-400 mb-0.5">👤 {msg.user}</span>
                    <p className="text-slate-200 font-medium">{msg.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <form onSubmit={handleSendMessage} className="mt-2 flex gap-2 border-t border-purple-900/20 pt-2">
              <button type="submit" className="bg-purple-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs">إرسال</button>
              <input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} placeholder="شارك برأيك لايف..." className="flex-1 bg-slate-950 border border-purple-500/20 rounded-lg px-3 py-1 text-xs text-slate-200 focus:outline-none" />
            </form>
          </div>
        </div>

      </main>

      {/* Footer المعدل بناء على رغبتك */}
      <footer className="mt-auto py-5 border-t border-purple-900/20 text-center text-slate-600 text-[10px] md:text-xs">
        <p>© جميع الحقوق محفوظة • اطلاق تجريبي V5.1</p>
      </footer>

      {/* مودال الدخول السريع والمعالج بالكامل لقوقل */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/30 w-full max-w-md rounded-2xl p-6 text-center space-y-5 text-slate-100">
            <h4 className="text-base md:text-lg font-black">🔐 اختر طريقة الدخول</h4>
            <p className="text-xs text-slate-400 -mt-2">احفظ نقاطك وتوقعاتك فوراً بضغطة زر</p>
            
            <div className="space-y-3">
              <button onClick={handleGoogleLogin} type="button" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-xl text-xs md:text-sm transition-all shadow-lg flex items-center justify-center gap-2">
                <span>🔵</span> الدخول بواسطة Google
              </button>
              
              <button onClick={() => setAuthMode("guest")} type="button" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl text-xs md:text-sm transition-all shadow-lg flex items-center justify-center gap-2">
                <span>🟢</span> الدخول كـ زائر سريع
              </button>
            </div>

            {authMode === "guest" && (
              <form onSubmit={handleGuestLogin} className="space-y-3 pt-2 border-t border-purple-950/50 animate-fade-in">
                <input type="text" required placeholder="اكتب اسمك المستعار هنا" onChange={(e) => setUser({...user, fullName: e.target.value})} className="w-full bg-slate-950 border border-purple-500/20 p-3 rounded-xl text-xs md:text-sm text-center text-slate-200 focus:outline-none" />
                <select required value={user.favoriteTeam} onChange={(e) => setUser({...user, favoriteTeam: e.target.value})} className="w-full bg-slate-950 border border-purple-500/20 p-3 rounded-xl text-xs md:text-sm text-center text-slate-200 focus:outline-none">
                  <option value="" disabled>اختر مرشحك المفضل للقب كأس العالم...</option>
                  {WORLD_CUP_2026_TEAMS.map((t, i) => ( <option key={i} value={t.name}>{t.emoji} {t.name}</option> ))}
                </select>
                <button type="submit" className="w-full bg-purple-600 font-black py-2.5 rounded-xl text-xs">ابدأ التحدي الحركي الحين 🚀</button>
              </form>
            )}

            <div className="pt-2 border-t border-purple-950/20">
              <button onClick={() => setAuthMode("manual_login")} className="text-[11px] text-purple-400 hover:text-purple-300 underline block mx-auto">👉 مسجل بالاسم مسبقاً؟ اضغط هنا للدخول اليدوي</button>
            </div>

            {authMode === "manual_login" && (
              <form onSubmit={handleManualLogin} className="space-y-3 pt-2 animate-fade-in">
                <input type="text" required placeholder="اكتب اسمك المسجل بدقة" value={manualName} onChange={(e) => setManualName(e.target.value)} className="w-full bg-slate-950 border border-purple-500/20 p-3 rounded-xl text-xs text-center text-slate-200 focus:outline-none" />
                <button type="submit" className="w-full bg-amber-500 text-slate-950 font-black py-2.5 rounded-xl text-xs">استعادة الجلسة 🔓</button>
              </form>
            )}

            <button onClick={() => setIsAuthModalOpen(false)} className="text-xs text-slate-500 hover:text-slate-400 block mx-auto pt-2">إلغاء النافذة</button>
          </div>
        </div>
      )}

    </div>
  );
}