"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, addDoc, onSnapshot, query, orderBy } from "firebase/firestore";

// القائمة الرسمية الكاملة لمنتخبات كأس العالم 2026 المعتمدة (48 منتخب) مع الأعلام
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
  { code: "GB", name: "إنجلترا", emoji: "🏴󠁧󠁢󠁥لنكولنشاير" }, { code: "PT", name: "البرتغال", emoji: "🇵🇹" },
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

const ALL_COUNTRY_DIAL_CODES = [
  { code: "SA", name: "السعودية", dialCode: "+966", flag: "🇸🇦" },
  { code: "KW", name: "الكويت", dialCode: "+965", flag: "🇰🇼" },
  { code: "AE", name: "الإمارات", dialCode: "+971", flag: "🇦🇪" },
  { code: "QA", name: "قطر", dialCode: "+974", flag: "🇶🇦" },
  { code: "BH", name: "البحرين", dialCode: "+973", flag: "🇧🇭" },
  { code: "OM", name: "عُمان", dialCode: "+968", flag: "🇴🇲" },
  { code: "EG", name: "مصر", dialCode: "+20", flag: "🇪🇬" },
  { code: "MA", name: "المغرب", dialCode: "+212", flag: "🇲🇦" }
];

export default function HomePage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // بيانات المستخدم المسجل
  const [user, setUser] = useState<any>({ fullName: "", countryCode: "+966", phone: "", residence: "السعودية", favoriteTeam: "" });
  const [userPrediction, setUserPrediction] = useState({ team1Score: "", team2Score: "" });
  const [chatMessage, setChatMessage] = useState("");
  
  // القوائم الحية من الفايربيز للربط الفوري بين الأجهزة
  const [chatList, setChatList] = useState<any[]>([]);
  const [livePredictions, setLivePredictions] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [predictionsStats, setPredictionsStats] = useState({ total: 0, correct: 0, wrong: 0, points: 0 });
  const [countdown, setCountdown] = useState("00:00:00");

  const [currentMatch] = useState({
    id: "opening_2026",
    team1: "المكسيك", team1Emoji: "🇲🇽",
    team2: "جنوب أفريقيا", team2Emoji: "🇿🇦",
    kickoff: new Date("2026-06-11T20:00:00"),
    status: "بانتظار ركلة البداية", score: "0 - 0"
  });

  // ✨ 1. فحص تذكر الحساب تلقائياً لمنع ظهور المودال مرتين عند الدخول
  useEffect(() => {
    const savedUser = localStorage.getItem("worldCupUser");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setIsLoggedIn(true);
    }
  }, []);

  // ✨ 2. العداد التنازلي الحماسي لوقت المباراة الافتتاحية
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = currentMatch.kickoff.getTime() - now;
      if (distance < 0) {
        clearInterval(timer);
        setCountdown("بدأت المباراة (أُغلق التوقع)");
      } else {
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString().padStart(2, "0");
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, "0");
        const seconds = Math.floor((distance % (1000 * 60)) / 1000).toString().padStart(2, "0");
        setCountdown(`${hours}:${minutes}:${seconds}`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [currentMatch.kickoff]);

  // ✨ 3. الاستماع السحابي الحي (Real-time DB Listeners) لتحديث الأجهزة تلقائياً فوراً
  useEffect(() => {
    const qChat = query(collection(db, "chats"), orderBy("createdAt", "desc"));
    const unsubChat = onSnapshot(qChat, (snap) => {
      setChatList(snap.docs.map(doc => doc.data()));
    });

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

  // ✨ 4. دالة التسجيل الفورية المعالجة جذرياً لتقفل الخانة وتثبت الدخول بالملي
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userData = {
        fullName: user.fullName,
        phone: user.countryCode + user.phone,
        residence: user.residence,
        favoriteTeam: user.favoriteTeam,
        points: 0, total: 0, correct: 0, wrong: 0,
        createdAt: new Date().toISOString()
      };

      // الحفظ الفوري المحلي لإغلاق المودال وتغيير شكل أزرار الهيدر فوراً
      localStorage.setItem("worldCupUser", JSON.stringify(userData)); 
      setIsLoggedIn(true);
      setIsAuthModalOpen(false); 
      
      // الإرسال السحابي لقاعدة البيانات بالخلفية بدون تعطيل متصفح الجوال
      await addDoc(collection(db, "users"), userData);
      alert("تم تفعيل حسابك بنجاح وبدأت رحلة التحدي! 🚀🏆");
    } catch (err) {
      console.error("خطأ التسجيل السحابي: ", err);
      alert("حدث خطأ بسيط أثناء الاتصال بقاعدة البيانات المفتوحة، ولكن تم حفظ دخولك محلياً.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("worldCupUser");
    setUser({ fullName: "", countryCode: "+966", phone: "", residence: "السعودية", favoriteTeam: "" });
    setIsLoggedIn(false);
  };

  // ✨ 5. إرسال التوقع وحفظه ليظهر في شريط البث الحي الجديد فوراً للكل
  const handleSavePrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      setIsAuthModalOpen(true);
      return;
    }
    if (new Date().getTime() > currentMatch.kickoff.getTime()) {
      alert("أُغلقت التوقعات لبدء المباراة!");
      return;
    }
    try {
      await addDoc(collection(db, "predictions"), {
        user: user.fullName,
        team1: currentMatch.team1, team1Emoji: currentMatch.team1Emoji,
        team2: currentMatch.team2, team2Emoji: currentMatch.team2Emoji,
        score1: userPrediction.team1Score, score2: userPrediction.team2Score,
        createdAt: new Date().toISOString()
      });
      alert("تم تسجيل توقعك بنظام التيكر الحي بنجاح! 🔥");
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    try {
      await addDoc(collection(db, "chats"), { user: user.fullName || "زائر", text: chatMessage, createdAt: new Date().toISOString() });
      setChatMessage("");
    } catch (err) { console.error(err); }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased text-right flex flex-col justify-between">
      <div>
        
        {/* 🔥 اقتراح البطل: شريط التوقعات الحية اللاقائي والمتحرك بنظام القنوات الرياضية العالمية */}
        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white h-10 flex items-center overflow-hidden text-xs font-bold shadow-inner border-b border-purple-900/50">
          <div className="bg-red-600 px-3 h-full flex items-center z-10 shadow-md flex-shrink-0 animate-pulse">🔥 توقعات حية الآن:</div>
          <div className="w-full relative overflow-hidden flex items-center">
            <div className="flex gap-12 whitespace-nowrap animate-marquee absolute items-center">
              {livePredictions.length === 0 ? (
                <span>بانتظار توقعات الجماهير الأولى لتشتعل لوحة التحكم الحية... ⚽🏆</span>
              ) : (
                livePredictions.map((p, idx) => (
                  <span key={idx} className="bg-white/10 px-3 py-1 rounded-full border border-white/5 flex items-center gap-1.5 shadow-sm">
                    ⚡ <span className="text-yellow-400 font-extrabold">{p.user}</span> يتوقع: {p.team1Emoji} {p.team1} <span className="font-mono text-sm bg-purple-950 px-1.5 py-0.5 rounded text-green-400 font-bold">{p.score1} - {p.score2}</span> {p.team2} {p.team2Emoji}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-sm md:text-lg font-bold bg-gradient-to-r from-purple-800 to-indigo-600 bg-clip-text text-transparent">تحدي توقعات كأس العالم 2026</h1>
            </div>
            <div>
              {isLoggedIn ? (
                <div className="flex items-center gap-3">
                  <span className="bg-purple-50 text-purple-700 px-4 py-2 rounded-xl font-bold text-xs md:text-sm shadow-sm">👑 {user.fullName}</span>
                  <button onClick={handleLogout} className="text-xs font-bold text-red-500 hover:text-red-600 bg-red-50 ... rounded-xl transition-all">خروج</button>
                </div>
              ) : (
                <button onClick={() => setIsAuthModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white text-xs md:text-sm font-semibold px-4 py-2 rounded-xl shadow-sm">الدخول / التسجيل السريع</button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          
          {/* صندوق التوقع الأساسي الفخم (تأثير Glassmorphism مع خلفية فيفا بنفسجية عميقة) */}
          <section className="bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 md:p-6 shadow-xl border border-purple-500/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 bg-red-600 text-white font-bold text-[10px] md:text-xs px-4 py-1.5 rounded-bl-xl shadow-md">⏰ نهاية التوقع: {countdown}</div>
            <div className="text-center md:text-right mb-4 mt-4 md:mt-0">
              <h3 className="text-sm md:text-base font-bold text-purple-300 flex items-center gap-1.5 justify-center md:justify-start">🔥 ادخل توقعك الحين ليظهر اسمك للجميع في شريط البث الحي!</h3>
            </div>

            <form onSubmit={handleSavePrediction} className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white/5 p-4 rounded-xl border border-white/10">
              <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-start">
                <span className="text-2xl md:text-3xl">{currentMatch.team1Emoji}</span>
                <span className="font-bold text-sm md:text-base">{currentMatch.team1}</span>
                <input type="number" min="0" placeholder="0" required value={userPrediction.team1Score} onChange={(e) => setUserPrediction({...userPrediction, team1Score: e.target.value})} className="w-12 h-10 bg-slate-800 text-white border border-slate-700 rounded-lg text-center font-bold text-base focus:outline-none" />
              </div>
              <div className="text-slate-400 font-bold text-xs md:text-sm">ضد</div>
              <div className="flex items-center gap-3 w-full md:w-auto justify-center md:flex-row-reverse">
                <span className="text-2xl md:text-3xl">{currentMatch.team2Emoji}</span>
                <span className="font-bold text-sm md:text-base">{currentMatch.team2}</span>
                <input type="number" min="0" placeholder="0" required value={userPrediction.team2Score} onChange={(e) => setUserPrediction({...userPrediction, team2Score: e.target.value})} className="w-12 h-10 bg-slate-800 text-white border border-slate-700 rounded-lg text-center font-bold text-base focus:outline-none" />
              </div>
              <button type="submit" className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs md:text-sm transition-all shadow-md">حفظ وإرسال التوقع لايف 🚀</button>
            </form>
          </section>

          {/* لوحة الصدارة الحقيقية */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100 overflow-hidden flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-sm md:text-base text-slate-900 mb-3 border-b border-slate-50 pb-2">🥇 لوحة الصدارة التلقائية والترتيب المباشر للمشتركين</h3>
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-xs md:text-sm text-center border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                        <th className="py-2 px-2 text-right">الترتيب والاسم</th>
                        <th className="py-2 px-2">عدد التوقعات</th>
                        <th className="py-2 px-2 text-green-600">الصح</th>
                        <th className="py-2 px-2 text-red-500">الخطأ</th>
                        <th className="py-2 px-2 text-purple-700">النقاط</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium">
                      {leaderboard.length === 0 ? (
                        <tr><td colSpan={5} className="py-8 text-center text-slate-400 font-normal">بانتظار تسجيل التوقعات لبدء الترتيب التلقائي...</td></tr>
                      ) : (
                        leaderboard.map((u, i) => (
                          <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-2 text-right font-bold text-slate-800">{u.rank === 1 ? "🥇 " : u.rank === 2 ? "🥈 " : u.rank === 3 ? "🥉 " : ""}{u.rank}. {u.name}</td>
                            <td className="py-3 px-2 font-mono text-slate-600">{u.total}</td>
                            <td className="py-3 px-2 font-mono text-green-600">{u.correct}</td>
                            <td className="py-3 px-2 font-mono text-red-400">{u.wrong}</td>
                            <td className="py-3 px-2 font-mono font-bold text-purple-700">{u.points}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
              <h3 className="font-bold text-sm md:text-base text-slate-900 mb-3 border-b border-slate-50 pb-2">📊 إحصائيات لوحة التوقعات الإجمالية</h3>
              <div className="grid grid-cols-2 gap-3 flex-1 items-center">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <span className="block text-[10px] text-slate-500 font-bold">إجمالي التوقعات</span>
                  <span className="text-base md:text-lg font-mono font-bold text-slate-800">{predictionsStats.total}</span>
                </div>
                <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 text-center"><span className="block text-[10px] text-purple-600 font-bold">إجمالي نقاط المنصة</span><span className="text-base md:text-lg font-mono font-bold text-purple-700">{predictionsStats.points}</span></div>
              </div>
            </div>
          </div>

          {/* مركز المباراة والشات المباشر */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-start">
            <div className="lg:col-span-2 bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                <h3 className="font-bold text-sm md:text-base text-slate-900 flex items-center gap-2"><span>📺</span> مركز المباراة الحي والكتابي (أونلاين)</h3>
                <span className="bg-yellow-50 text-yellow-700 px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold animate-pulse">● {currentMatch.status}</span>
              </div>
              <div className="bg-slate-900 text-white rounded-xl p-4 flex items-center justify-between text-center border border-slate-800">
                <div className="flex-1 flex flex-col items-center gap-1"><span className="text-2xl md:text-3xl">{currentMatch.team1Emoji}</span><span className="text-xs md:text-sm font-bold">{currentMatch.team1}</span></div>
                <div className="bg-slate-800 px-4 py-2 rounded-xl text-lg md:text-2xl font-mono font-extrabold text-slate-300">{currentMatch.score}</div>
                <div className="flex-1 flex flex-col items-center gap-1"><span className="text-2xl md:text-3xl">{currentMatch.team2Emoji}</span><span className="text-xs md:text-sm font-bold">{currentMatch.team2}</span></div>
              </div>
            </div>

            {/* الشات */}
            <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100 h-[450px] flex flex-col justify-between">
              <div className="overflow-hidden flex flex-col h-full">
                <h3 className="font-bold text-sm md:text-base text-slate-900 border-b border-slate-50 pb-3 mb-3"><span>💬</span> دردشة زوار المنصة الفورية (لايف حقيقي)</h3>
                <div className="space-y-2.5 overflow-y-auto flex-1 text-xs md:text-sm flex flex-col-reverse">
                  {chatList.length === 0 ? (
                    <p className="text-slate-400 text-center py-12 font-normal">الشات فارغ حالياً.. شارك حماسك للافتتاحية الآن! 🔥</p>
                  ) : (
                    chatList.map((msg, i) => (
                      <div key={i} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="block font-bold text-[10px] text-purple-700 mb-0.5">{msg.user}</span>
                        <p className="text-slate-700 leading-relaxed">{msg.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <form onSubmit={handleSendMessage} className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                <button type="submit" className="bg-purple-600 text-white font-bold px-3.5 py-2 rounded-xl text-xs md:text-sm">إرسال</button>
                <input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} placeholder="اكتب تعليقك المباشر مع الجمهور..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm focus:outline-none" />
              </form>
            </div>
          </div>

        </main>
      </div>

      {/* الفوتر مع التوقيع الذكي للهوية */}
      <footer className="bg-slate-900 text-slate-400 py-5 mt-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-xs text-center sm:text-right order-2 sm:order-1">
            <p className="font-bold text-slate-300">تحدي توقعات كأس العالم 2026</p>
            <p className="text-slate-500">© جميع الحقوق محفوظة • النسخة المحدثة V4.0</p>
          </div>
          <div className="flex items-center gap-3 bg-slate-800/50 border border-slate-800 px-4 py-2 rounded-xl order-1 sm:order-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-bold text-white text-sm">ع</div>
            <div className="text-xs text-right">
              <span className="block text-[10px] text-slate-500">فكرة وتطوير</span>
              <span className="block font-bold text-white mt-0.5">عبدالسلام العنزي</span>
            </div>
          </div>
        </div>
      </footer>

      {/* مودال التسجيل السريع المعالج جذرياً لمتصفحات الجوال */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 md:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 left-4 text-slate-400 bg-slate-50 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold">✕</button>
            <div className="text-center mb-4">
              <h4 className="text-lg font-bold text-slate-900 mb-1">إنشاء حساب للمشاركة في التحدي</h4>
              <p className="text-xs text-slate-500">سجل بياناتك الحقيقية لحفظ نقاطك وتوقعاتك تلقائياً</p>
            </div>
            
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم</label>
                <input type="text" required placeholder="ادخل اسمك الكامل" value={user.fullName} onChange={(e) => setUser({...user, fullName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm focus:outline-none" />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم الجوال</label>
                <div className="flex gap-2" style={{ direction: "ltr" }}>
                  <select value={user.countryCode} onChange={(e) => setUser({...user, countryCode: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-xl px-2 text-xs font-mono max-w-[100px] focus:outline-none">
                    {ALL_COUNTRY_DIAL_CODES.map((c, i) => (
                      <option key={i} value={c.dialCode}>{c.flag} {c.dialCode}</option>
                    ))}
                  </select>
                  <input type="tel" required placeholder="رقم الهاتف" value={user.phone} onChange={(e) => setUser({...user, phone: e.target.value})} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm text-left focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">الدولة أو مقر الإقامة الحالية</label>
                <select value={user.residence} onChange={(e) => setUser({...user, residence: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm focus:outline-none">
                  {ALL_COUNTRY_DIAL_CODES.map((c, i) => (
                    <option key={i} value={c.name}>{c.flag} {c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">المنتخب المتوقع فوزه ببطولة كأس العالم 2026 🏆</label>
                <select required value={user.favoriteTeam} onChange={(e) => setUser({...user, favoriteTeam: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm focus:outline-none">
                  <option value="" disabled>اختر مرشحك للقب...</option>
                  {WORLD_CUP_2026_TEAMS.map((t, i) => (
                    <option key={i} value={t.name}>{t.emoji} {t.name}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl text-xs md:text-sm transition-colors shadow-md mt-2">تفعيل الحساب وبدء التوقعات الفورية 🚀</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}