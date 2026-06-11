"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query, doc, deleteDoc, updateDoc, getDocs, addDoc } from "firebase/firestore";

export default function AdminDashboard() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [users, setUsers] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  
  // إعدادات التحكم بالمباراة بتوقيت مكة المكرمة الافتراضي (10:00 مساءً)
  const [matchSettings, setMatchSettings] = useState({
    id: "opening_2026", 
    team1: "المكسيك", 
    team1Emoji: "🇲🇽", 
    team2: "جنوب أفريقيا", 
    team2Emoji: "🇿🇦",
    kickoff: "2026-06-11T22:00:00", 
    status: "بانتظار ركلة البداية", 
    score: "0 - 0"
  });

  useEffect(() => {
    if (!isAdminAuthenticated) return;

    // جلب والتحكم بالمستخدمين والزوار والأرقام السرية لايف
    const unsubUsers = onSnapshot(query(collection(db, "users"), orderBy("createdAt", "desc")), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // جلب والتحكم بشريط التوقعات لايف
    const unsubPreds = onSnapshot(query(collection(db, "predictions"), orderBy("createdAt", "desc")), (snap) => {
      setPredictions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // جلب والتحكم برسائل الشات لايف
    const unsubChats = onSnapshot(query(collection(db, "chats"), orderBy("createdAt", "desc")), (snap) => {
      setChats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // جلب إعدادات المباراة التلقائية
    const unsubMatch = onSnapshot(collection(db, "match_settings"), (snap) => {
      if (!snap.empty) setMatchSettings({ id: snap.docs[0].id, ...snap.docs[0].data() } as any);
    });

    return () => { unsubUsers(); unsubPreds(); unsubChats(); unsubMatch(); };
  }, [isAdminAuthenticated]);

  // التحقق الحصري من هوية المدير (عبدسلام أبو راكان)
  const handleAdminVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUsername === "عبدالسلام العنزي" && adminPassword === "96650") {
      setIsAdminAuthenticated(true);
    } else {
      alert("❌ خطأ صارم: صلاحيات الأدمن غير صحيحة، هالحجرة الإدارية سرية وخاصة بعبدالسلام فقط!");
    }
  };

  // دالة الحذف الكلي الفوري من السيرفر لأي قسم (شات - توقعات - أعضاء)
  const deleteItem = async (col: string, id: string) => {
    if (confirm("⚠️ تنبيه أمني: هل أنت متأكد من الحذف النهائي الفوري من قاعدة البيانات السحابية؟")) {
      await deleteDoc(doc(db, col, id));
    }
  };

  // دالة تعديل نقاط الصدارة يدوياً لأي مشترك
  const updateUserPoints = async (id: string, currentPoints: number) => {
    const points = prompt("ادخل مجموع النقاط الجديد الفعلي لهذا العضو:", currentPoints.toString());
    if (points !== null) {
      await updateDoc(doc(db, "users", id), { points: parseInt(points) || 0 });
    }
  };

  // دالة التحكم الكلي بالصفحة الرئيسية وتحديث شاشات جميع الجماهير في نفس الثانية
  const updateMatchOnServer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const q = await getDocs(collection(db, "match_settings"));
      if (!q.empty) {
        await updateDoc(doc(db, "match_settings", q.docs[0].id), matchSettings);
      } else {
        await addDoc(collection(db, "match_settings"), matchSettings);
      }
      alert("🚀 تم تعديل المباراة والتحكم بالصفحة الرئيسية بنجاح، وتحديث شاشات كل الزوار لايف!");
    } catch (err) {
      console.error(err);
    }
  };

  if (!isAdminAuthenticated) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-right">
        <form onSubmit={handleAdminVerify} className="bg-slate-900 border border-amber-500/40 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl">
          <div className="text-center space-y-1">
            <h2 className="font-black text-amber-400 text-lg">🔒 نظام السيطرة والتحكم الكلي للمنصة</h2>
            <p className="text-[10px] text-slate-400">يرجى تأكيد الرمز السري لعبدالسلام أبو راكان للولوج</p>
          </div>
          <div>
            <label className="block text-xs text-slate-300 mb-1">اسم المسؤول</label>
            <input type="text" required onChange={(e)=>setAdminUsername(e.target.value)} className="w-full bg-slate-950 p-2.5 rounded-xl text-xs text-white border border-purple-500/20 focus:outline-none focus:border-amber-500 text-right" />
          </div>
          <div>
            <label className="block text-xs text-slate-300 mb-1">رمز التحقق السري الحصري</label>
            <input type="password" required onChange={(e)=>setAdminPassword(e.target.value)} className="w-full bg-slate-950 p-2.5 rounded-xl text-xs text-white border border-purple-500/20 focus:outline-none focus:border-amber-500 text-right" />
          </div>
          <button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-black py-2.5 rounded-xl text-xs shadow-lg transition-transform active:scale-95">ولوجه آمن لغرفة السيطرة 🔑</button>
        </form>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 p-4 md:p-6 text-slate-100 font-sans text-right space-y-6">
      
      {/* هيدر لوحة التحكم */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-900 p-4 rounded-xl border border-amber-500/20 shadow-xl gap-4">
        <div>
          <h1 className="text-sm md:text-lg font-black text-amber-400">🛠️ لوحة القيادة العليا والتحكم المطلق | عبدالسلام العنزي</h1>
          <p className="text-[10px] text-slate-400">تحكم لحظي كلي بالشات، الأعضاء، التوقعات، والمباراة لايف دون الحاجة لدخول الفايربيز.</p>
        </div>
        <button onClick={()=>window.location.href="/"} className="bg-purple-950 hover:bg-purple-900 border border-purple-500/30 text-purple-300 px-4 py-2 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5">
          <span>👁️</span> عرض موقع الجماهير الرئيسي
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* أ. التحكم بالصفحة الرئيسية والمباراة والعداد التنازلي */}
        <div className="bg-slate-900 p-4 rounded-xl border border-purple-500/10 space-y-3 shadow-md">
          <h3 className="font-black text-amber-400 border-b border-white/5 pb-2 text-xs md:text-sm">🏟️ التحكم بالمباراة والصفحة الرئيسية والعداد التنازلي</h3>
          <form onSubmit={updateMatchOnServer} className="space-y-3 text-xs">
            <div>
              <label className="text-[10px] text-slate-400">اسم المنتخب الأول</label>
              <input type="text" value={matchSettings.team1} onChange={(e)=>setMatchSettings({...matchSettings, team1: e.target.value})} className="w-full bg-slate-950 p-2 rounded text-white mt-1 border border-white/5 focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400">اسم المنتخب الثاني</label>
              <input type="text" value={matchSettings.team2} onChange={(e)=>setMatchSettings({...matchSettings, team2: e.target.value})} className="w-full bg-slate-950 p-2 rounded text-white mt-1 border border-white/5 focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400">النتيجة الحية الحين (لايف)</label>
              <input type="text" value={matchSettings.score} onChange={(e)=>setMatchSettings({...matchSettings, score: e.target.value})} className="w-full bg-slate-950 p-2 rounded text-green-400 font-bold tracking-widest mt-1 border border-white/5 focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400">وقت ركلة البداية بتوقيت مكة (للعداد التنازلي)</label>
              <input type="text" value={matchSettings.kickoff} onChange={(e)=>setMatchSettings({...matchSettings, kickoff: e.target.value})} className="w-full bg-slate-950 p-2 rounded text-white font-mono mt-1 border border-white/5 focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400">حالة البث والمباراة (مباشر، انتهت، بانتظار الركلة)</label>
              <input type="text" value={matchSettings.status} onChange={(e)=>setMatchSettings({...matchSettings, status: e.target.value})} className="w-full bg-slate-950 p-2 rounded text-white mt-1 border border-white/5 focus:outline-none" />
            </div>
            <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl transition-all shadow-md">تحديث المنصة الفوري عند الكل 🚀</button>
          </form>
        </div>

        {/* ب. التحكم الكامل بالأعضاء والزوار الحقيقيين وكلمات السر الفريدة */}
        <div className="lg:col-span-2 bg-slate-900 p-4 rounded-xl border border-purple-500/10 h-[395px] flex flex-col shadow-md">
          <h3 className="font-black text-amber-400 border-b border-white/5 pb-2 text-xs md:text-sm mb-2">👥 التحكم والمصادقة الكاملة بالأعضاء والزوار ومعرفة الأرقام السرية</h3>
          <div className="overflow-y-auto flex-grow text-xs hidden-scrollbar overflow-x-auto">
            <table className="w-full text-center border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-slate-950/50 text-slate-400 font-bold border-b border-white/5">
                  <th className="py-2 text-right">الاسم المسجل / الزائر</th>
                  <th>الرقم السري الحقيقي</th>
                  <th>النقاط</th>
                  <th>خيارات السيطرة المطلقة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300 font-semibold">
                {users.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-slate-500 font-normal">لا يوجد أي مستخدمين مسجلين بالسيرفر حالياً...</td></tr>
                ) : (
                  users.map((u, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="py-2.5 text-right text-white font-black">{u.fullName} {u.teamEmoji}</td>
                      <td className="font-mono text-purple-400 font-bold bg-purple-950/20 px-2 py-0.5 rounded-lg border border-purple-500/10 inline-block mt-1.5">{u.password}</td>
                      <td className="font-mono text-yellow-400 font-black text-sm">{u.points}</td>
                      <td className="space-x-1 space-x-reverse">
                        <button onClick={()=>updateUserPoints(u.id, u.points)} className="bg-blue-900/40 text-blue-300 border border-blue-500/20 hover:bg-blue-900/60 px-2.5 py-1 rounded-lg font-bold">تعديل النقاط ⚙️</button>
                        <button onClick={()=>deleteItem("users", u.id)} className="bg-red-900/40 text-red-300 border border-red-500/20 hover:bg-red-900/60 px-2.5 py-1 rounded-lg font-bold">طرد وحذف 🗑️</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* ج. التحكم في شريط البث وعرض التوقعات لايف */}
        <div className="bg-slate-900 p-4 rounded-xl border border-purple-500/10 h-[320px] flex flex-col shadow-md">
          <h3 className="font-black text-amber-400 border-b border-white/5 pb-2 text-xs md:text-sm mb-2">📺 التحكم في شريط عرض التوقعات لايف (Ticker Control)</h3>
          <div className="overflow-y-auto flex-grow space-y-2 text-xs hidden-scrollbar">
            {predictions.length === 0 ? (
              <p className="text-slate-500 text-center py-12">الشريط فارغ، لا توجد توقعات حية حالياً...</p>
            ) : (
              predictions.map((p, i) => (
                <div key={i} className="bg-slate-950 p-2.5 rounded-xl flex justify-between items-center border border-white/5 shadow-inner">
                  <div className="font-semibold"><span className="text-yellow-400 font-black">{p.user}</span> متوقع: {p.t1E} {p.score1} - {p.score2} {p.t2E}</div>
                  <button onClick={()=>deleteItem("predictions", p.id)} className="text-red-400 hover:text-red-300 bg-red-950/20 border border-red-900/20 px-3 py-1 rounded-lg font-bold text-[10px] transition-colors">حذف وإزالة 🗑️</button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* د. التحكم الكامل والشامل في الشات والدردشة العامة */}
        <div className="bg-slate-900 p-4 rounded-xl border border-purple-500/10 h-[320px] flex flex-col shadow-md">
          <h3 className="font-black text-amber-400 border-b border-white/5 pb-2 text-xs md:text-sm mb-2">💬 التحكم الكامل والشامل في شات ودردشة الزوار (صمام الأمان)</h3>
          <div className="overflow-y-auto flex-grow space-y-2 text-xs hidden-scrollbar">
            {chats.length === 0 ? (
              <p className="text-slate-500 text-center py-12">غرفة الشات فارغة تماماً حالياً...</p>
            ) : (
              chats.map((c, i) => (
                <div key={i} className="bg-slate-950 p-2.5 rounded-xl flex justify-between items-center border border-white/5 shadow-inner">
                  <div className="font-medium"><span className="text-purple-400 font-black">👤 {c.user} {c.teamEmoji}:</span> <span className="text-slate-200 leading-relaxed">{c.text}</span></div>
                  <button onClick={()=>deleteItem("chats", c.id)} className="text-red-400 hover:text-red-300 bg-red-950/20 border border-red-900/20 px-3 py-1 rounded-lg font-bold text-[10px] transition-colors">نسف وحذف 🗑️</button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}