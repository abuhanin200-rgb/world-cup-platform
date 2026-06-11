"use client";
import { useAuth } from "@/context/AuthContext";
import { LogOut, User, Phone, Globe, Heart, Award } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { profile, logout } = useAuth();
  const router = useRouter();

  if (!profile) {
    return (
      <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 max-w-md mx-auto">
        <p className="text-sm font-bold text-slate-400 mb-4">يرجى تسجيل الدخول أولاً لعرض ملفك الشخصي.</p>
        <button onClick={() => router.push("/")} className="px-6 py-2 bg-brand-purple text-white font-bold rounded-xl text-xs">الانتقال للرئيسية</button>
      </div>
    );
  }

  const handleLogoutClick = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-800 flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div className="w-20 h-20 bg-gradient-to-tr from-brand-purple to-brand-pink rounded-full flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-brand-purple/20">
          {profile.name.charAt(0)}
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">{profile.name}</h2>
        <span className="text-xs bg-brand-gold/10 text-brand-purple dark:text-brand-gold font-black px-4 py-1 rounded-full flex items-center gap-1">
          <Award className="w-3.5 h-3.5" /> رصيدك: {profile.points} نقطة
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold text-slate-600 dark:text-slate-300">
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <Phone className="w-4 h-4 text-slate-400" />
          <div>
            <span className="text-slate-400 block text-[10px] mb-0.5">رقم الجوال</span>
            <span className="font-mono">{profile.phone}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <Globe className="w-4 h-4 text-slate-400" />
          <div>
            <span className="text-slate-400 block text-[10px] mb-0.5">الدولة والإقامة</span>
            <span>{profile.country}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center gap-3 sm:col-span-2">
          <Heart className="w-4 h-4 text-brand-pink" />
          <div>
            <span className="text-slate-400 block text-[10px] mb-0.5">المنتخب المفضل وعلم التشجيع</span>
            <span>{profile.favoriteTeam}</span>
          </div>
        </div>
      </div>

      <button 
        onClick={handleLogoutClick}
        className="w-full mt-4 py-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-black rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-950/40 transition-all border border-red-100 dark:border-red-900/30"
      >
        <LogOut className="w-4 h-4" />
        <span>تسجيل الخروج من الحساب</span>
      </button>
    </div>
  );
}