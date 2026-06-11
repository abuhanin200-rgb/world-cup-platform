"use client";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { Trophy, ShieldAlert, User, Calendar, Award } from "lucide-react";

export default function Navbar() {
  const { profile } = useAuth();

  return (
    <nav className="w-full sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-black text-xl text-brand-deep dark:text-white">
          <Trophy className="w-6 h-6 text-brand-gold animate-bounce" />
          <span>تحدي توقعات كأس العالم <span className="text-brand-pink">2026</span></span>
        </Link>
        
        <div className="hidden md:flex items-center gap-6 font-medium">
          <Link href="/matches" className="hover:text-brand-purple flex items-center gap-1"><Calendar className="w-4 h-4"/> المباريات</Link>
          <Link href="/results" className="hover:text-brand-purple flex items-center gap-1"><Award className="w-4 h-4"/> النتائج</Link>
          <Link href="/rules" className="hover:text-brand-purple">الشروط والقوانين</Link>
          {profile && (
            <>
              <Link href="/profile" className="hover:text-brand-purple flex items-center gap-1">
                <User className="w-4 h-4"/> الملف الشخصي ({profile.favoriteTeam})
              </Link>
              <Link href="/admin" className="text-brand-pink font-bold flex items-center gap-1"><ShieldAlert className="w-4 h-4"/> لوحة التحكم</Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}