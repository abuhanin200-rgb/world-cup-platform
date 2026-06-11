"use client";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Match, Prediction } from "@/types";
import LiveMatches from "@/components/LiveMatches";
import GlobalStats from "@/components/GlobalStats";
import Leaderboard from "@/components/ui/Leaderboard";
import PublicPredictions from "@/components/ui/PublicPredictions";
import MatchCard from "@/components/ui/MatchCard";
import { Trophy, LogIn } from "lucide-react";

export default function HomePage() {
  const { profile, loginWithPhone } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [userPredictions, setUserPredictions] = useState<Record<string, Prediction>>({});

  // حقول نموذج تسجيل الدخول السريع للمشترك الجديد
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [country, setCountry] = useState("المملكة العربية السعودية");
  const [favTeam, setFavTeam] = useState("🇸🇦 السعودية");

  useEffect(() => {
    // 1. جلب جميع مباريات البطولة مجدولة زمنيًا بتحديث حي
    const qMatches = query(collection(db, "Matches"), orderBy("timestamp", "asc"));
    const unsubMatches = onSnapshot(qMatches, (snapshot) => {
      const data: Match[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Match));
      setMatches(data);
    });

    return () => unsubMatches();
  }, []);

  useEffect(() => {
    if (!profile?.id) {
      setUserPredictions({});
      return;
    }
    // 2. مزامنة توقعات المستخدم الحالي لعرضها داخل الكروت تلقائيًا
    const qPreds = query(collection(db, "Predictions"));
    const unsubPreds = onSnapshot(qPreds, (snapshot) => {
      const preds: Record<string, Prediction> = {};
      snapshot.forEach((doc) => {
        const p = doc.data() as Prediction;
        if (p.userId === profile.id) {
          preds[p.matchId] = p;
        }
      });
      setUserPredictions(preds);
    });

    return () => unsubPreds();
  }, [profile?.id]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !name) return;
    loginWithPhone(phone, name, country, favTeam);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* البانر الترحيبي الرئيسي الأعلى */}
      <div className="text-center md:text-right flex flex-col md:flex-row justify-between items-center bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 p-8 rounded-3xl text-white shadow-xl gap-4 border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-pink/10 rounded-full blur-3xl" />
        <div className="z-10">
          <h1 className="text-2xl md:text-4xl font-black mb-2 flex items-center justify-center md:justify-start gap-2">
            <span>مرحباً بك في تحدي التوقعات الأكبر!</span>
            <Trophy className="w-8 h-8 text-brand-gold hidden md:inline-block" />
          </h1>
          <p className="text-slate-300 text-sm font-bold">سجل توقعاتك الدقيقة للمباريات، اجمع النقاط، ونافس على صدارة المجموعات الكبرى لعام 2026!</p>
        </div>
        {profile && (
          <div className="bg-white/5 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 text-center min-w-[160px] z-10">
            <span className="text-xs text-brand-gold font-black block mb-1">🎯 رصيدك الحالي</span>
            <span className="text-3xl font-black text-white">{profile.points}</span>
            <span className="text-xs block text-slate-400 mt-1">نقطة كليّة</span>
          </div>
        )}
      </div>

      {/* لوحة المؤشرات السريعة والإحصائيات الكلية */}
      <GlobalStats />

      {/* شاشة أحداث البث المباشر والأهداف اللحظية للمباريات الجارية الآن */}
      <LiveMatches />

      {/* التقسيم الهيكلي المتوازن لواجهة المستخدم */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* المقطع الأيمن والأوسط: قائمة المباريات أو بوابة الدخول */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {!profile ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-800 transition-all">
              <div className="flex items-center gap-2 mb-6 text-brand-purple dark:text-brand-gold">
                <LogIn className="w-5 h-5" />
                <h2 className="text-lg font-black text-slate-900 dark:text-white">إنشاء حساب أو تسجيل الدخول السريع</h2>
              </div>
              
              <form onSubmit={handleLoginSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-slate-400">الاسم الكريم (يظهر للعامة ولوحة الصدارة)</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-brand-purple outline-none font-bold text-sm text-slate-900 dark:text-white" placeholder="مثال: عبدالمحسن العنزي" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-slate-400">رقم الجوال (المعرف السري والوحيد لحسابك)</label>
                  <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-brand-purple outline-none font-mono text-sm text-slate-900 dark:text-white" placeholder="05xxxxxxxx" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-slate-400">الدولة أو مقر الإقامة الحالي</label>
                  <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-brand-purple outline-none font-bold text-sm text-slate-900 dark:text-white" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-slate-400">المنتخب المفضل أو المتوقع فوزه بالبطولة</label>
                  <input type="text" value={favTeam} onChange={(e) => setFavTeam(e.target.value)} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-brand-purple outline-none font-bold text-sm text-slate-900 dark:text-white" />
                </div>
                <button type="submit" className="sm:col-span-2 py-3.5 bg-brand-purple text-white font-black rounded-xl hover:bg-brand-deep transition-all mt-2 shadow-lg shadow-brand-purple/20 text-sm">
                  دخول المنصة وبدء حفظ التوقعات الحالية 🚀
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">📅 جدول مباريات التحدي القائمة</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {matches.map((match) => (
                  <MatchCard 
                    key={match.id} 
                    match={match} 
                    currentUserId={profile.id}
                    userName={profile.name}
                    userFavoriteTeam={profile.favoriteTeam}
                    existingPrediction={userPredictions[match.id]}
                  />
                ))}
                {matches.length === 0 && (
                  <p className="text-sm font-bold text-slate-400 text-center py-12 col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                    لا توجد مباريات مضافة في جدول البطولة حالياً.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* المقطع الأيسر: لوحات المراقبة، الصدارة الحية، وتوقعات الجماهير */}
        <div className="flex flex-col gap-8">
          <Leaderboard />
          <PublicPredictions />
        </div>

      </div>
    </div>
  );
}