"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, addDoc, onSnapshot, query, orderBy, getDocs, where, doc, updateDoc } from "firebase/firestore";

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
  const [apiFixtures, setApiFixtures] = useState<any[]>([]);
  const [isLoadingFixtures, setIsLoadingFixtures] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [currentMatch, setCurrentMatch] = useState({ id: "opening_2026", team1: "المكسيك", team1Emoji: "🇲🇽", team2: "جنوب أفريقيا", team2Emoji: "🇿🇦", kickoff: "2026-06-11T22:00:00", status: "بانتظار ركلة البداية", score: "0 - 0" });
  useEffect(() => {
    const savedUser = localStorage.getItem("worldCupUser");
    if (savedUser) { const parsedUser = JSON.parse(savedUser) as any; setUser(parsedUser); setEditProfileFields({ fullName: parsedUser.fullName, password: parsedUser.password, favoriteTeam: parsedUser.favoriteTeam, phone: parsedUser.phone || "" }); setIsLoggedIn(true); }
  }, []);

  useEffect(() => {
    if (activeTab !== "match_fixtures") return;
    const fetchAllFixtures = async () => {
      setIsLoadingFixtures(true);
      try {
        const apiKey = process.env.NEXT_PUBLIC_FOOTBALL_API_KEY;
        if (!apiKey) return;
        const res = await fetch("https://v3.football.api-sports.io/fixtures?league=1&season=2026", { method: "GET", headers: { "x-rapidapi-key": apiKey, "x-rapidapi-host": "v3.football.api-sports.io" } });
        const data = await res.json();
        if (data.response) {
            const formatted = data.response.map((f: any) => ({
                day: new Date(f.fixture.date).toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' }),
                team1: f.teams.home.name, team2: f.teams.away.name,
                score: f.goals.home + " - " + f.goals.away,
                time: new Date(f.fixture.date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
            }));
            setApiFixtures(formatted);
        }
      } catch (err) { console.error(err); }
      setIsLoadingFixtures(false);
    };
    fetchAllFixtures();
  }, [activeTab]);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const snap = await getDocs(query(collection(db, "users"), where("fullName", "==", manualName.trim()), where("password", "==", manualPassword)));
    if (!snap.empty) { const loggedUser = { id: snap.docs[0].id, ...snap.docs[0].data() } as any; localStorage.setItem("worldCupUser", JSON.stringify(loggedUser)); setUser(loggedUser); setIsLoggedIn(true); setIsAuthModalOpen(false); } else alert("❌ خطأ.");
  };

  const handleUpdateUserProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.id) return;
    const updated = { fullName: editProfileFields.fullName, password: editProfileFields.password, phone: editProfileFields.phone };
    await updateDoc(doc(db, "users", user.id), updated);
    setUser({...user, ...updated}); setIsProfileModalOpen(false); alert("✅ تم التحديث!");
  };

  const handleLogout = () => { localStorage.removeItem("worldCupUser"); setIsLoggedIn(false); };
  const handleSavePrediction = async (e: React.FormEvent) => { e.preventDefault(); alert("تم حفظ التوقع!"); };
  const handleSendMessage = async (e: React.FormEvent) => { e.preventDefault(); await addDoc(collection(db, "chats"), { user: user.fullName || "زائر", text: chatMessage, createdAt: new Date().toISOString() }); setChatMessage(""); };
  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <style>{`
        @keyframes scrollRight { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .slow-marquee-right { animation: scrollRight 45s linear infinite; }
      `}</style>

      <div className="bg-purple-900 h-9 flex items-center overflow-hidden font-black text-[10px]">
        <div className="bg-red-600 px-3 h-full flex items-center">🔥 لايف:</div>
        <div className="w-full flex items-center overflow-hidden">
            <div className="slow-marquee-right flex gap-10 whitespace-nowrap">{livePredictions.map((p, i) => <span key={i}>⚡ {p.user}</span>)}</div>
        </div>
      </div>

      <header className="p-4 flex justify-between items-center bg-slate-900 border-b border-purple-900">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)}><i className="fa-solid fa-bars text-xl"></i></button>
          <h1 className="font-black text-xs">منصة توقعات كأس العالم 2026</h1>
          {isLoggedIn ? <button onClick={() => setIsProfileModalOpen(true)} className="bg-purple-900 p-2 rounded-lg text-xs">👤 حسابي</button> : <button onClick={() => setIsAuthModalOpen(true)} className="bg-purple-600 p-2 rounded-lg text-xs font-black">🔐 دخول</button>}
      </header>

      {/* [هنا تضيف باقي الـ JSX الخاص بالتبويبات والفوتر] */}

      <footer className="bg-slate-950 border-t border-purple-900 py-8 text-center text-xs">
         <p className="font-bold text-slate-400">تحدي توقعات كأس العالم 2026</p>
         <p className="mt-2 text-purple-500 font-black">تصميم وتطوير: عبدالسلام العنزي</p>
      </footer>
    </div>
  );
}