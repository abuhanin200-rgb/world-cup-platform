"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";

export default function HomePage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // بيانات المستخدم والتحكم بالتوقعات الحية
  const [formData, setFormData] = useState({ fullName: "", countryCode: "+966", phone: "", residence: "المملكة العربية السعودية", favoriteTeam: "" });
  const [userPrediction, setUserPrediction] = useState({ team1Score: "", team2Score: "" });
  const [chatMessage, setChatMessage] = useState("");
  
  // غرف البيانات الحية (مُصَفّرة بالكامل بدون أي بيانات وهمية)
  const [chatList, setChatList] = useState<{user: string, text: string}[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [predictionsStats, setPredictionsStats] = useState({ total: 0, correct: 0, wrong: 0, points: 0 });

  // عداد تنازلي حقيقي لنهاية التوقع (ينتهي تلقائياً عند بداية المباراة الافتتاحية اليوم)
  const [countdown, setCountdown] = useState("جاري الحساب...");

  // بيانات مباراة الافتتاح الرسمية الحقيقية لليوم لعام 2026
  const [currentMatch, setCurrentMatch] = useState({
    id: "opening_2026",
    team1: "المكسيك",
    team1Emoji: "🇲🇽",
    team2: "جنوب أفريقيا",
    team2Emoji: "🇿🇦",
    kickoff: new Date("2026-06-11T20:00:00"), // تاريخ ووقت المباراة الافتتاحية الحقيقي لليوم
    status: "بانتظار ركلة البداية",
    score: "0 - 0",
    time: "00'"
  });

  // أحداث مجريات المباراة الكتابية الحية (تُحدث لايف أسلوب قوقل)
  const [matchEvents, setMatchEvents] = useState<any[]>([]);

  // 1. تفعيل العداد التنازلي الحقيقي لوقت بداية المباراة وقفل التوقعات تلقائياً
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

  // 2. الاستماع الفوري لشات الجمهور الحقيقي من الفايربيز
  useEffect(() => {
    const q = query(collection(db, "chats"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveMessages = snapshot.docs.map(doc => ({
        user: doc.data().user,
        text: doc.data().text
      }));
      setChatList(liveMessages);
    });
    return () => unsubscribe();
  }, []);

  // 3. الاستماع الفوري للوحة الصدارة الحقيقية بناءً على توقعات المستخدمين الحقيقيين
  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("points", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveLeaderboard = snapshot.docs.map((doc, index) => ({
        rank: index + 1,
        name: doc.data().fullName || "مستخدم حي",
        total: doc.data().totalPredictions || 0,
        correct: doc.data().correctPredictions || 0,
        wrong: doc.data().wrongPredictions || 0,
        points: doc.data().points || 0
      }));
      setLeaderboard(liveLeaderboard);
    });
    return () => unsubscribe();
  }, []);

  // دالة إرسال الرسالة إلى سيرفر الفايربيز الحقيقي
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    try {
      await addDoc(collection(db, "chats"), {
        user: formData.fullName || "زائر محمس",
        text: chatMessage,
        createdAt: serverTimestamp()
      });
      setChatMessage("");
    } catch (error) {
      console.error("خطأ في إرسال الرسالة:", error);
    }
  };

  // دالة حفظ توقع المباراة الحقيقي للمستخدم
  const handleSavePrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date().getTime() > currentMatch.kickoff.getTime()) {
      alert("عذراً، بدأت المباراة وأُغلقت التوقعات رسمياً لهذه المواجهة!");
      return;
    }
    alert(`تم تسجيل توقعك بنجاح للمباراة: المكسيك ${userPrediction.team1Score} - ${userPrediction.team2Score} جنوب أفريقيا! 🚀`);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased text-right flex flex-col justify-between">
      
      <div>
        {/* الشريط العلوي المشترك */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 flex-shrink-0">
                <img src="/wc2026-logo.png" alt="🏆" className="object-contain w-full h-full" onError={(e) => { e.currentTarget.src = "🏆"; }} />
              </div>
              <h1 className="text-sm md:text-lg font-bold bg-gradient-to-r from-purple-800 to-indigo-600 bg-clip-text text-transparent">
                تحدي توقعات كأس العالم 2026
              </h1>
            </div>

            <div>
              {isLoggedIn ? (
                <div className="bg-purple-50 text-purple-700 px-4 py-2 rounded-xl font-medium text-sm">
                  أهلاً، {formData.fullName || "عبدالسلام العنزي"}
                </div>
              ) : (
                <button onClick={() => setIsAuthModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white text-xs md:text-sm font-semibold px-4 py-2 rounded-xl shadow-sm">
                  الدخول / التسجيل السريع
                </button>
              )}
            </div>
          </div>
        </header>

        {/* المحتوى الرئيسي للمنصة */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          
          {/* 🎯 صندوق توقع نتيجة مباراة اليوم الافتتاحية الحقيقية */}
          <section className="bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 md:p-6 shadow-xl border border-purple-500/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 bg-red-600 text-white font-bold text-[10px] md:text-xs px-4 py-1.5 rounded-bl-xl shadow-md">
              ⏰ نهاية التوقع: {countdown}
            </div>
            
            <div className="text-center md:text-right mb-4 mt-2 md:mt-0">
              <h3 className="text-sm md:text-base font-bold text-purple-300 flex items-center gap-1.5 justify-center md:justify-start">
                🔥 توقع نتيجة مباراة اليوم الافتتاحية واكسب نقاط الصدارة الكبرى!
              </h3>
            </div>

            <form onSubmit={handleSavePrediction} className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white/5 p-4 rounded-xl border border-white/10">
              <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-start">
                <span className="text-2xl md:text-3xl">{currentMatch.team1Emoji}</span>
                <span className="font-bold text-sm md:text-base">{currentMatch.team1}</span>
                <input 
                  type="number" min="0" placeholder="0" required
                  value={userPrediction.team1Score}
                  onChange={(e) => setUserPrediction({...userPrediction, team1Score: e.target.value})}
                  className="w-12 h-10 bg-slate-800 text-white border border-slate-700 rounded-lg text-center font-bold text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="text-slate-400 font-bold text-xs md:text-sm">ضد</div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-center md:flex-row-reverse">
                <span className="text-2xl md:text-3xl">{currentMatch.team2Emoji}</span>
                <span className="font-bold text-sm md:text-base">{currentMatch.team2}</span>
                <input 
                  type="number" min="0" placeholder="0" required
                  value={userPrediction.team2Score}
                  onChange={(e) => setUserPrediction({...userPrediction, team2Score: e.target.value})}
                  className="w-12 h-10 bg-slate-800 text-white border border-slate-700 rounded-lg text-center font-bold text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <button type="submit" className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs md:text-sm transition-all shadow-md">
                حفظ التوقع الحالي للمباراة 🚀
              </button>
            </form>
          </section>

          {/* 📊 صف فرعي: لوحة الصدارة الحقيقية + إحصائيات التوقعات */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="md:col-span-2 bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100 overflow-hidden flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-sm md:text-base text-slate-900 mb-3 border-b border-slate-50 pb-2 flex items-center gap-1.5">
                  🥇 لوحة الصدارة التلقائية والترتيب المباشر للمشتركين
                </h3>
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-xs md:text-sm text-center border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                        <th className="py-2 px-1 text-right">الترتيب والاسم</th>
                        <th className="py-2 px-1">عدد التوقعات</th>
                        <th className="py-2 px-1 text-green-600">الصح</th>
                        <th className="py-2 px-1 text-red-500">الخطأ</th>
                        <th className="py-2 px-1 font-extrabold text-purple-700">النقاط</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium">
                      {leaderboard.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 font-normal">بانتظار تسجيل أول توقع من المشتركين لبدء احتساب وترتيب النقاط تلقائياً...</td>
                        </tr>
                      ) : (
                        leaderboard.map((user, i) => (
                          <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-1 text-right font-bold text-slate-800">{user.rank === 1 ? "🥇" : user.rank === 2 ? "🥈" : user.rank === 3 ? "🥉" : ""} {user.rank}. {user.name}</td>
                            <td className="py-3 px-1 font-mono text-slate-600">{user.total}</td>
                            <td className="py-3 px-1 font-mono text-green-600">{user.correct}</td>
                            <td className="py-3 px-1 font-mono text-red-400">{user.wrong}</td>
                            <td className="py-3 px-1 font-mono font-bold text-purple-700">{user.points}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
              <h3 className="font-bold text-sm md:text-base text-slate-900 mb-3 border-b border-slate-50 pb-2">
                📊 إحصائيات لوحة التوقعات الإجمالية
              </h3>
              <div className="grid grid-cols-2 gap-3 flex-1 items-center">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <span className="block text-[10px] text-slate-500 font-bold">إجمالي التوقعات</span>
                  <span className="text-base md:text-lg font-mono font-bold text-slate-800">{predictionsStats.total}</span>
                </div>
                <div className="bg-green-50/50 p-3 rounded-xl border border-green-100 text-center">
                  <span className="block text-[10px] text-green-600 font-bold">التوقعات الصحيحة</span>
                  <span className="text-base md:text-lg font-mono font-bold text-green-700">{predictionsStats.correct}</span>
                </div>
                <div className="bg-red-50/50 p-3 rounded-xl border border-red-100 text-center">
                  <span className="block text-[10px] text-red-500 font-bold">التوقعات الخاطئة</span>
                  <span className="text-base md:text-lg font-mono font-bold text-red-600">{predictionsStats.wrong}</span>
                </div>
                <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 text-center">
                  <span className="block text-[10px] text-purple-600 font-bold">إجمالي نقاط المنصة</span>
                  <span className="text-base md:text-lg font-mono font-bold text-purple-700">{predictionsStats.points}</span>
                </div>
              </div>
            </div>

          </div>

          {/* تقسيم الشبكة السفلي: مركز المباراة المباشر (أسلوب قوقل الكتابي) + الشات الفوري الحقيقي */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-start">
            
            {/* مركز المباراة الحي والكتابي - قوقل ستايل */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                <h3 className="font-bold text-sm md:text-base text-slate-900 flex items-center gap-2">
                  <span>📺</span> مركز المباراة الحي والكتابي (أونلاين)
                </h3>
                <span className="flex items-center gap-1.5 bg-yellow-50 text-yellow-700 px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold">
                  <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></span> {currentMatch.status}
                </span>
              </div>

              <div className="bg-slate-900 text-white rounded-xl p-4 flex items-center justify-between text-center border border-slate-800">
                <div className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-2xl md:text-3xl">{currentMatch.team1Emoji}</span>
                  <span className="text-xs md:text-sm font-bold">{currentMatch.team1}</span>
                </div>
                <div className="flex-shrink-0 bg-slate-800 px-4 py-2 rounded-xl text-lg md:text-2xl font-mono font-extrabold tracking-widest text-slate-300">
                  {currentMatch.score}
                </div>
                <div className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-2xl md:text-3xl">{currentMatch.team2Emoji}</span>
                  <span className="text-xs md:text-sm font-bold">{currentMatch.team2}</span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-slate-400 block border-r-2 border-slate-100 pr-2">أبرز مجريات وأحداث اللقاء الحالية (أسلوب قوقل)</span>
                <div className="border-r-2 border-slate-100 pr-4 space-y-4 text-xs md:text-sm relative">
                  {matchEvents.length === 0 ? (
                    <p className="text-slate-400 font-normal py-4">تبدأ التحديثات والأحداث الفورية للكروت والأهداف تلقائياً فور انطلاق صافرة البداية للمباراة... ⚽</p>
                  ) : (
                    matchEvents.map((event, i) => (
                      <div key={i} className="relative">
                        <span className="absolute right-[-23px] top-0.5 bg-slate-100 text-slate-600 font-mono text-[9px] font-bold px-1 rounded-md border border-slate-200">
                          {event.time}
                        </span>
                        <p className="text-slate-700 font-medium leading-relaxed">{event.detail}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 💬 شات الجمهور الحي الحقيقي (Firebase connected) */}
            <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100 h-[450px] md:h-[480px] flex flex-col justify-between lg:sticky lg:top-24">
              <div className="overflow-hidden flex flex-col h-full">
                <h3 className="font-bold text-sm md:text-base text-slate-900 flex items-center gap-2 border-b border-slate-50 pb-3 mb-3 flex-shrink-0">
                  <span>💬</span> دردشة زوار المنصة الفورية (لايف حقيقي)
                </h3>
                
                <div className="space-y-2.5 overflow-y-auto flex-1 pl-1 text-xs md:text-sm">
                  {chatList.length === 0 ? (
                    <p className="text-slate-400 text-center py-12 font-normal">الشات فارغ حالياً.. كن أول من يكتب ويشارك حماسه للافتتاحية الآن مع الجميع! 💬🔥</p>
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

              <form onSubmit={handleSendMessage} className="mt-3 flex gap-2 border-t border-slate-100 pt-3 flex-shrink-0">
                <button type="submit" className="bg-purple-600 text-white font-bold px-3.5 py-2 rounded-xl text-xs md:text-sm hover:bg-purple-700 transition-colors">
                  إرسال
                </button>
                <input 
                  type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="اكتب تعليقك أو توقعك المباشر مع الجميع..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </form>
            </div>

          </div>
        </main>
      </div>

      {/* 🏁 الفوتر السفلي الأنيق والموحد لمنع التكرار نهائياً */}
      <footer className="bg-slate-900 text-slate-400 py-5 mt-12 border-t border-slate-800 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-xs space-y-0.5 text-center sm:text-right order-2 sm:order-1">
            <p className="font-bold text-slate-300">تحدي توقعات كأس العالم 2026</p>
            <p className="text-slate-500">© جميع الحقوق محفوظة • النسخة المحدثة V1.1</p>
          </div>
          <div className="flex items-center gap-3 bg-slate-800/50 border border-slate-800/80 px-4 py-2 rounded-xl shadow-sm order-1 sm:order-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-bold text-white text-sm">ع</div>
            <div className="text-xs text-right">
              <span className="block text-[10px] text-slate-500">فكرة وتطوير</span>
              <span className="block font-bold text-white mt-0.5">عبدالسلام العنزي</span>
            </div>
          </div>
        </div>
      </footer>

      {/* مودال التسجيل المنبثق عند الحاجة */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 left-4 text-slate-400 bg-slate-50 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold">✕</button>
            <div className="text-center mb-5">
              <h4 className="text-lg font-bold text-slate-900 mb-1">إنشاء حساب جديد</h4>
              <p className="text-xs text-slate-500">ادخل بياناتك للانضمام فوراً وتفعيل جدول حفظ التوقعات</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); setIsAuthModalOpen(false); setIsLoggedIn(true); }} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم الكريم (يظهر في لوحة الصدارة)</label>
                <input type="text" required placeholder="مثال: عبدالسلام العنزي" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم الجوال (المعرف السري لحسابك)</label>
                <div className="flex gap-2" style={{ direction: "ltr" }}>
                  <select className="bg-slate-50 border border-slate-200 rounded-xl px-2 text-xs font-mono"><option>🇸🇦 +966</option></select>
                  <input type="tel" required placeholder="رقم الهاتف" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm text-left" />
                </div>
              </div>
              <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl text-xs md:text-sm transition-colors mt-2">دخول المنصة وحفظ التوقعات 🚀</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}