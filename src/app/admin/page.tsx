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
  
  // نظام الصفحات لجدول الأعضاء في الأدمن (Pagination)
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const usersPerPage = 10;

  const [matchSettings, setMatchSettings] = useState({
    id: "opening_2026", team1: "المكسيك", team1Emoji: "🇲🇽", team2: "جنوب أفريقيا", team2Emoji: "🇿🇦",
    kickoff: "2026-06-11T22:00:00", status: "بانتظار ركلة البداية", score: "0 - 0"
  });

  useEffect(() => {
    if (!isAdminAuthenticated) return;

    // جلب كافة الأعضاء بلا استثناء
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubPreds = onSnapshot(query(collection(db, "predictions"), orderBy("createdAt", "desc")), (snap) => {
      setPredictions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubChats = onSnapshot(query(collection(db, "chats"), orderBy("createdAt", "desc")), (snap) => {
      setChats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubMatch = onSnapshot(collection(db, "match_settings"), (snap) => {
      if (!snap.empty) setMatchSettings({ id: snap.docs[0].id, ...snap.docs[0].data() } as any);
    });

    return () => { unsubUsers(); unsubPreds(); unsubChats(); unsubMatch(); };
  }, [isAdminAuthenticated]);

  const handleAdminVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUsername === "عبدالسلام العنزي" && adminPassword === "96650") {
      setIsAdminAuthenticated(true);
    } else {
      alert("❌ خطأ: الرمز السري غير صحيح، هذه اللوحة خاصة بعبدالسلام فقط.");
    }
  };

  const deleteItem = async (col: string, id: string) => {
    if (confirm("هل أنت متأكد من الحذف النهائي الفوري من قاعدة البيانات؟")) {
      await deleteDoc(doc(db, col, id));
    }
  };

  // 1. دالة تعديل الاسم يدوياً
  const adminUpdateUsername = async (id: string, currentName: string) => {
    const newName = prompt("ادخل الاسم الجديد للعضو:", currentName);
    if (newName && newName.trim() !== "") {
      await updateDoc(doc(db, "users", id), { fullName: newName.trim() });
      alert("✅ تم تحديث اسم العضو بنجاح!");
    }
  };

  // 2. دالة تعديل الرقم السري يدوياً
  const adminUpdateUserPassword = async (id: string, currentPass: string) => {
    const newPass = prompt("ادخل الرقم السري الجديد للعضو:", currentPass || "");
    if (newPass && newPass.trim() !== "") {
      await updateDoc(doc(db, "users", id), { password: newPass.trim() });
      alert("✅ تم تحديث الرقم السري بنجاح!");
    }
  };

  // 3. دالة تعديل النقاط
  const updateUserPoints = async (id: string, currentPoints: number) => {
    const points = prompt("ادخل عدد النقاط الجديد للعضو المختار:", currentPoints.toString());
    if (points !== null) await updateDoc(doc(db, "users", id), { points: parseInt(points) || 0 });
  };

  const updateMatchOnServer = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = await getDocs(collection(db, "match_settings"));
    if (!q.empty) {
      await updateDoc(doc(db, "match_settings", q.docs[0].id), matchSettings);
    } else {
      await addDoc(collection(db, "match_settings"), matchSettings);
    }
    alert("🚀 تم التحديث اللحظي للموقع بالكامل لشاشات جميع المستخدمين لايف!");
  };

  if (!isAdminAuthenticated) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-right">
        <form onSubmit={handleAdminVerify} className="bg-slate-900 border border-amber-500/40 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl">
          <h2 className="text-center font-black text-amber-400 text-lg">🔒 نظام السيطرة والتحكم الكلي للمنصة</h2>
          <div><label className="block text-xs text-slate-300 mb-1">اسم المسؤول</label><input type="text" required onChange={(e)=>setAdminUsername(e.target.value)} className="w-full bg-slate-950 p-2.5 rounded-xl text-xs text-white border border-purple-500/20 text-right" /></div>
          <div><label className="block text-xs text-slate-300 mb-1">رمز التحقق السري الحصري</label><input type="password" required onChange={(e)=>setAdminPassword(e.target.value)} className="w-full bg-slate-950 p-2.5 rounded-xl text-xs text-white border border-purple-500/20 text-right" /></div>
          <button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-black py-2.5 rounded-xl text-xs shadow-lg">ولوج آمن وغرفة السيطرة 🔑</button>
        </form>
      </div>
    );
  }

  // حسابات الصفحات لجدول التحكم بالأعضاء
  const adminLastUserIndex = userCurrentPage * usersPerPage;
  const adminFirstUserIndex = adminLastUserIndex - usersPerPage;
  const slicedAdminUsers = users.slice(adminFirstUserIndex, adminLastUserIndex);
  const maxAdminUserPages = Math.ceil(users.length / usersPerPage);

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 p-4 md:p-6 text-slate-100 font-sans text-right space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-900 p-4 rounded-xl border border-amber-500/20 shadow-xl gap-4">
        <div><h1 className="text-sm md:text-lg font-black text-amber-400">🛠️ لوحة القيادة العليا والتحكم المطلق | عبدالسلام العنزي</h1><p className="text-[10px] text-slate-400">تحكم لحظي كلي بالشات، الأعضاء، التوقعات، والمباراة لايف دون الحاجة لدخول الفايربيز.</p></div>
        <button onClick={()=>window.location.href="/"} className="bg-purple-950 hover:bg-purple-900 border border-purple-500/30 text-purple-300 px-4 py-2 rounded-xl font-bold text-xs transition-colors">👁️ عرض الموقع الرئيسي</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-4 rounded-xl border border-purple-500/10 space-y-3 shadow-md">
          <h3 className="font-black text-amber-400 border-b border-white/5 pb-2 text-xs md:text-sm">🏟️ التحكم بالمباراة والصفحة الرئيسية والعداد التنازلي</h3>
          <form onSubmit={updateMatchOnServer} className="space-y-3 text-xs">
            <div><label className="text-[10px] text-slate-400">اسم المنتخب الأول</label><input type="text" value={matchSettings.team1} onChange={(e)=>setMatchSettings({...matchSettings, team1: e.target.value})} className="w-full bg-slate-950 p-2 rounded text-white mt-1 border border-white/5 focus:outline-none" /></div>
            <div><label className="text-[10px] text-slate-400">اسم المنتخب الثاني</label><input type="text" value={matchSettings.team2} onChange={(e)=>setMatchSettings({...matchSettings, team2: e.target.value})} className="w-full bg-slate-950 p-2 rounded text-white mt-1 border border-white/5 focus:outline-none" /></div>
            <div><label className="text-[10px] text-slate-400">النتيجة الحية الحين (لايف)</label><input type="text" value={matchSettings.score} onChange={(e)=>setMatchSettings({...matchSettings, score: e.target.value})} className="w-full bg-slate-950 p-2 rounded text-green-400 font-bold tracking-widest mt-1 border border-white/5 focus:outline-none" /></div>
            <div><label className="text-[10px] text-slate-400">وقت ركلة البداية بتوقيت مكة (للعداد التنازلي)</label><input type="text" value={matchSettings.kickoff} onChange={(e)=>setMatchSettings({...matchSettings, kickoff: e.target.value})} className="w-full bg-slate-950 p-2 rounded text-white font-mono mt-1 border border-white/5 focus:outline-none" /></div>
            <div><label className="text-[10px] text-slate-400">حالة البث والمباراة (مباشر، انتهت، بانتظار الركلة)</label><input type="text" value={matchSettings.status} onChange={(e)=>setMatchSettings({...matchSettings, status: e.target.value})} className="w-full bg-slate-950 p-2 rounded text-white mt-1 border border-white/5 focus:outline-none" /></div>
            <button type="submit" className="w-full bg-amber-500 text-slate-950 font-black py-2.5 rounded-xl transition-all shadow-md">تحديث المنصة الفوري عند الكل 🚀</button>
          </form>
        </div>

        {/* 👥 جدول الأعضاء المحدث بالصفحات والتعديل الكامل للاسم والرمز */}
        <div className="lg:col-span-2 bg-slate-900 p-4 rounded-xl border border-purple-500/10 h-[435px] flex flex-col justify-between shadow-md">
          <div>
            <h3 className="font-black text-amber-400 border-b border-white/5 pb-2 text-xs md:text-sm mb-2">👥 التحكم والمصادقة الكاملة بالأعضاء والزوار ومعرفة الأرقام السرية</h3>
            <div className="overflow-y-auto max-h-[300px] text-xs hidden-scrollbar overflow-x-auto">
              <table className="w-full text-center border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-slate-950/50 text-slate-400 font-bold border-b border-white/5">
                    <th className="py-2 text-right">الاسم المسجل / الزائر</th>
                    <th>الرقم السري</th>
                    <th>النقاط</th>
                    <th>خيارات التحكم والتحرير المطلق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300 font-semibold">
                  {slicedAdminUsers.length === 0 ? (
                    <tr><td colSpan={4} className="py-8 text-slate-500 font-normal">لا يوجد أي مستخدمين في هذه الصفحة...</td></tr>
                  ) : (
                    slicedAdminUsers.map((u, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors">
                        <td className="py-2 text-right text-white font-black">{u.fullName} {u.teamEmoji}</td>
                        <td className="font-mono text-purple-400 font-bold bg-purple-950/20 px-2 py-0.5 rounded-lg border border-purple-500/10 inline-block mt-1">
                          {u.password ? u.password : <span className="text-red-400 font-sans text-[10px]">حساب قديم - بدون رمز</span>}
                        </td>
                        <td className="font-mono text-yellow-400 font-black text-sm">{u.points || 0}</td>
                        <td className="space-x-1 space-x-reverse">
                          <button onClick={()=>adminUpdateUsername(u.id, u.fullName)} className="bg-emerald-950 text-emerald-400 border border-emerald-900/30 px-2 py-1 rounded-lg font-bold text-[11px]">الاسم ✏️</button>
                          <button onClick={()=>adminUpdateUserPassword(u.id, u.password)} className="bg-purple-950 text-purple-400 border border-purple-900/30 px-2 py-1 rounded-lg font-bold text-[11px]">الرمز 🔐</button>
                          <button onClick={()=>updateUserPoints(u.id, u.points || 0)} className="bg-blue-900/40 text-blue-300 border border-blue-500/20 px-2 py-1 rounded-lg font-bold text-[11px]">النقاط 📊</button>
                          <button onClick={()=>deleteItem("users", u.id)} className="bg-red-900/40 text-red-300 border border-red-500/20 px-2 py-1 rounded-lg font-bold text-[11px]">طرد 🗑️</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* أزرار التنقل (السابق / التالي) لجدول الأعضاء داخل الأدمن */}
          {maxAdminUserPages > 1 && (
            <div className="flex justify-center items-center gap-4 pt-3 border-t border-purple-900/25 text-xs">
              <button onClick={() => setUserCurrentPage(p => Math.max(p - 1, 1))} disabled={userCurrentPage === 1} className="bg-purple-950 border border-purple-500/20 px-3 py-1 rounded-lg text-purple-300 disabled:opacity-30">السابق ◀</button>
              <span className="font-bold text-slate-400">صفحة {userCurrentPage} من {maxAdminUserPages}</span>
              <button onClick={() => setUserCurrentPage(p => Math.min(p + 1, maxAdminUserPages))} disabled={userCurrentPage === maxAdminUserPages} className="bg-purple-950 border border-purple-500/20 px-3 py-1 rounded-lg text-purple-300 disabled:opacity-30">التالي ▶</button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 p-4 rounded-xl border border-purple-500/10 h-[320px] flex flex-col shadow-md">
          <h3 className="font-black text-amber-400 border-b border-white/5 pb-2 text-xs md:text-sm mb-2">📺 التحكم في شريط عرض التوقعات لايف</h3>
          <div className="overflow-y-auto flex-grow space-y-2 text-xs hidden-scrollbar">
            {predictions.length === 0 ? (
              <p className="text-slate-500 text-center py-12">الشريط فارغ، لا توجد توقعات حية حالياً...</p>
            ) : (
              predictions.map((p, i) => (
                <div key={i} className="bg-slate-950 p-2.5 rounded-xl flex justify-between items-center border border-white/5 shadow-inner">
                  <div className="font-semibold"><span className="text-yellow-400 font-black">{p.user}</span> متوقع: {p.t1E} {p.score1} - {p.score2} {p.t2E}</div>
                  <button onClick={()=>deleteItem("predictions", p.id)} className="text-red-400 hover:text-red-300 bg-red-950/20 border border-red-900/20 px-3 py-1 rounded-lg font-bold text-[10px]">حذف وإزالة 🗑️</button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-purple-500/10 h-[320px] flex flex-col shadow-md">
          <h3 className="font-black text-amber-400 border-b border-white/5 pb-2 text-xs md:text-sm mb-2">💬 التحكم الكامل والشامل في شات ودردشة الزوار</h3>
          <div className="overflow-y-auto flex-grow space-y-2 text-xs hidden-scrollbar">
            {chats.map((c, i) => (
              <div key={i} className="bg-slate-950 p-2.5 rounded-xl flex justify-between items-center border border-white/5 shadow-inner">
                <div className="font-medium"><span className="text-purple-400 font-black">👤 {c.user} {c.teamEmoji}:</span> <span className="text-slate-200 leading-relaxed">{c.text}</span></div>
                <button onClick={()=>deleteItem("chats", c.id)} className="text-red-400 hover:text-red-300 bg-red-950/20 border border-red-900/20 px-3 py-1 rounded-lg font-bold text-[10px]">نسف وحذف 🗑️</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}