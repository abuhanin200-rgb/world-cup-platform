"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, orderBy, getDocs, doc, updateDoc, deleteDoc, where, addDoc } from "firebase/firestore";

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [tickerSpeed, setTickerSpeed] = useState("30s");
  const [tickerId, setTickerSpeedId] = useState("");

  const [editingUserId, setEditingUserId] = useState("");
  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editTeam, setEditTeam] = useState("");

  const [userPage, setUserPage] = useState(1);
  const [predPage, setPredPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    onSnapshot(query(collection(db, "users"), orderBy("fullName", "asc")), (snap) => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(query(collection(db, "predictions"), orderBy("createdAt", "desc")), (snap) => setPredictions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(query(collection(db, "chats"), orderBy("createdAt", "desc")), (snap) => setChats(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(collection(db, "ticker_settings"), (snap) => {
      if (!snap.empty) { setTickerSpeed(snap.docs[0].data().speed || "30s"); setTickerSpeedId(snap.docs[0].id); }
    });
  }, []);

  const handleUpdateUser = async (userId: string) => {
    await updateDoc(doc(db, "users", userId), { fullName: editName, password: editPassword, favoriteTeam: editTeam });
    setEditingUserId(""); alert("✅ تم التعديل بصفحة الجمهور لايف!");
  };

  // 🧮 فرز واحتساب النقاط وحفظ قيمة النقاط الموزعة بداخل التوقع للقدرة على خصمها لاحقاً بالتراجع
  const handleGrantPointsManual = async (pred: any, type: "full" | "win" | "wrong") => {
    let pointsToAdd = 0, isCorrect = 0, isWrong = 0;
    if (type === "full") { pointsToAdd = 3; isCorrect = 1; }
    else if (type === "win") { pointsToAdd = 1; isCorrect = 1; }
    else { isWrong = 1; }

    const uSnap = await getDocs(query(collection(db, "users"), where("fullName", "==", pred.user)));
    if (!uSnap.empty) {
      const uDoc = uSnap.docs[0];
      const cur = uDoc.data();
      await updateDoc(doc(db, "users", uDoc.id), {
        points: (cur.points || 0) + pointsToAdd,
        total: (cur.total || 0) + 1,
        correct: (cur.correct || 0) + isCorrect,
        wrong: (cur.wrong || 0) + isWrong
      });
      // نقوم بتخزين كم نقطة عطيناه ووش الحالة عشان نقدر نتراجع
      await updateDoc(doc(db, "predictions", pred.id), { processed: true, pointsAwarded: pointsToAdd, matchTypeAwarded: type });
      alert(`🏆 تم فرز النقاط بنجاح للعضو ${pred.user}`);
    }
  };

  // 🛠️ ميزة التراجع الجذري الحصري: يخصم النقاط ويرجع حالة التوقع لـ "انتظار"
  const handleUndoPointsManual = async (pred: any) => {
    if (!pred.processed) return;
    const pointsToSubtract = pred.pointsAwarded || 0;
    const type = pred.matchTypeAwarded;

    let isCorrect = type === "full" || type === "win" ? 1 : 0;
    let isWrong = type === "wrong" ? 1 : 0;

    const uSnap = await getDocs(query(collection(db, "users"), where("fullName", "==", pred.user)));
    if (!uSnap.empty) {
      const uDoc = uSnap.docs[0];
      const cur = uDoc.data();
      
      // خصم النقاط المسجلة بالخطأ وإعادة الصدارة
      await updateDoc(doc(db, "users", uDoc.id), {
        points: Math.max((cur.points || 0) - pointsToSubtract, 0),
        total: Math.max((cur.total || 0) - 1, 0),
        correct: Math.max((cur.correct || 0) - isCorrect, 0),
        wrong: Math.max((cur.wrong || 0) - isWrong, 0)
      });

      // إرجاع حالة التوقع لـ "غير معالج" ليظهر لك في لوحة الإدارة مجدداً للفرز الصحيح
      await updateDoc(doc(db, "predictions", pred.id), { processed: false, pointsAwarded: 0, matchTypeAwarded: "" });
      alert(`↩️ تم التراجع بنجاح! تم خصم ${pointsToSubtract} نقاط من حساب ${pred.user} وإعادة التوقع لجدول الفرز.`);
    }
  };

  const handleUpdateTickerSpeed = async () => {
    if (tickerId) { await updateDoc(doc(db, "ticker_settings", tickerId), { speed: tickerSpeed }); }
    else { await addDoc(collection(db, "ticker_settings"), { speed: tickerSpeed }); }
    alert("⚡ تم تغيير سرعة شريط الجمهور!");
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-8 font-sans text-right">
      <style>{`.interactive-btn:active { transform: scale(0.95); filter: brightness(1.2); }`}</style>
      <h1 className="text-xl md:text-2xl font-black text-amber-400 mb-6 border-b border-slate-700 pb-2">⚙️ لوحة تحكم الإدارة الاحترافية</h1>

      {/* شريط السرعة */}
      <section className="bg-slate-950 p-4 rounded-xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div><h3 className="font-black text-xs text-purple-300">⚙️ التحكم بسرعة شريط التوقعات بصفحة الجمهور</h3></div>
        <div className="flex gap-2">
          <select value={tickerSpeed} onChange={(e) => setTickerSpeed(e.target.value)} className="bg-slate-900 border p-2 rounded-lg text-xs text-white focus:outline-none"><option value="15s">سريع (15ث)</option><option value="30s">متوسط (30ث)</option><option value="50s">بطيء (50ث)</option></select>
          <button onClick={handleUpdateTickerSpeed} className="bg-purple-600 px-4 py-2 rounded-lg text-xs font-black interactive-btn">تحديث السرعة ⚡</button>
        </div>
      </section>

      {/* إدارة الأعضاء */}
      <section className="bg-slate-950 p-4 rounded-xl mb-6">
        <h3 className="font-black text-xs text-amber-400 mb-3 border-b border-slate-800 pb-1">👤 القسم الأول: التحكم الكامل بالأعضاء</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead><tr className="bg-slate-900 text-slate-400 border-b border-slate-800"><th className="p-2 text-right">الاسم</th><th className="p-2">الرمز</th><th className="p-2">الترشيح</th><th className="p-2">الإجراء</th></tr></thead>
            <tbody className="divide-y divide-slate-900">
              {users.slice((userPage - 1) * itemsPerPage, userPage * itemsPerPage).map((u) => (
                <tr key={u.id} className="hover:bg-slate-900/40">
                  <td className="p-2 text-right">{editingUserId === u.id ? <input type="text" className="bg-slate-900 border px-2 py-0.5 rounded" value={editName} onChange={(e)=>setEditName(e.target.value)} /> : u.fullName}</td>
                  <td className="p-2">{editingUserId === u.id ? <input type="text" className="bg-slate-900 border px-2 py-0.5 rounded text-center" value={editPassword} onChange={(e)=>setEditPassword(e.target.value)} /> : u.password}</td>
                  <td className="p-2">{editingUserId === u.id ? <input type="text" className="bg-slate-900 border px-2 py-0.5 rounded text-center" value={editTeam} onChange={(e)=>setEditTeam(e.target.value)} /> : u.favoriteTeam}</td>
                  <td className="p-2 flex gap-1 justify-center">
                    {editingUserId === u.id ? <button onClick={()=>handleUpdateUser(u.id)} className="bg-green-600 px-2 py-1 rounded text-[10px] interactive-btn">حفظ 💾</button> : <button onClick={()=>{setEditingUserId(u.id); setEditName(u.fullName); setEditPassword(u.password); setEditTeam(u.favoriteTeam);}} className="bg-blue-600 px-2 py-1 rounded text-[10px] interactive-btn">تعديل ⚙️</button>}
                    <button onClick={async ()=>{if(confirm("حذف؟")) await deleteDoc(doc(db,"users",u.id))}} className="bg-red-600 px-2 py-1 rounded text-[10px] interactive-btn">حذف 🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-center gap-4 mt-3 text-xs font-bold"><button onClick={()=>setUserPage(p=>Math.max(p-1,1))} className="bg-slate-800 px-3 py-1 rounded">السابق</button><span>{userPage}</span><button onClick={()=>setUserPage(p=>p+1)} className="bg-slate-800 px-3 py-1 rounded">التالي</button></div>
      </section>

      {/* توزيع النقاط والتراجع المستحدث */}
      <section className="bg-slate-950 p-4 rounded-xl mb-6">
        <h3 className="font-black text-xs text-green-400 mb-3 border-b border-slate-800 pb-1">🧮 القسم الثاني والثالث: فرز التوقعات وتوزيع النقاط والتراجع اليدوي</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead><tr className="bg-slate-900 text-slate-400 border-b border-slate-800"><th className="p-2 text-right">العضو</th><th className="p-2">المباراة</th><th className="p-2">التوقع</th><th className="p-2">الحالة</th><th className="p-2">إجراءات الفرز والكبس اليدوي المضمون</th></tr></thead>
            <tbody className="divide-y divide-slate-900">
              {predictions.slice((predPage - 1) * itemsPerPage, predPage * itemsPerPage).map((p) => (
                <tr key={p.id} className="hover:bg-slate-900/40">
                  <td className="p-2 text-right">👤 {p.user}</td>
                  <td className="p-2">{p.t1} vs {p.t2}</td>
                  <td className="p-2 text-green-400 font-mono">{p.score1} - {p.score2}</td>
                  <td className="p-2">{p.processed ? <span className="text-green-500 font-bold">حُسبت (+{p.pointsAwarded || 0})</span> : <span className="text-amber-500 font-bold">انتظار الفرز</span>}</td>
                  <td className="p-2 flex gap-1 justify-center">
                    {!p.processed ? (
                      <>
                        <button onClick={()=>handleGrantPointsManual(p, "full")} className="bg-emerald-600 px-2 py-0.5 rounded text-[10px] interactive-btn">بالملي (+3)</button>
                        <button onClick={()=>handleGrantPointsManual(p, "win")} className="bg-blue-600 px-2 py-0.5 rounded text-[10px] interactive-btn">الفائز (+1)</button>
                        <button onClick={()=>handleGrantPointsManual(p, "wrong")} className="bg-slate-700 px-2 py-0.5 rounded text-[10px] interactive-btn">خطأ (0)</button>
                      </>
                    ) : (
                      <button onClick={()=>handleUndoPointsManual(p)} className="bg-orange-600 text-white font-black px-3 py-0.5 rounded text-[10px] interactive-btn shadow-md">↩️ تراجع عن الحسبة</button>
                    )}
                    <button onClick={async ()=>{if(confirm("حذف؟")) await deleteDoc(doc(db,"predictions",p.id))}} className="bg-red-950 text-red-400 px-2 py-0.5 rounded text-[10px] interactive-btn">حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-center gap-4 mt-3 text-xs font-bold"><button onClick={()=>setPredPage(p=>Math.max(p-1,1))} className="bg-slate-800 px-3 py-1 rounded">السابق</button><span>{predPage}</span><button onClick={()=>setPredPage(p=>p+1)} className="bg-slate-800 px-3 py-1 rounded">التالي</button></div>
      </section>

      {/* الرقابة على الشات */}
      <section className="bg-slate-950 p-4 rounded-xl">
        <h3 className="font-black text-xs text-red-400 mb-2 border-b border-slate-800 pb-1">💬 القسم الرابع: الرقابة والتحكم بـ شات صفحة الجمهور</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto hidden-scrollbar">
          {chats.map((c) => (
            <div key={c.id} className="bg-slate-900 p-2 rounded-lg flex items-center justify-between text-xs">
              <div><span className="font-black text-purple-400">👤 {c.user}:</span> <span className="text-slate-200 font-medium">{c.text}</span></div>
              <button onClick={async()=>await deleteDoc(doc(db,"chats",c.id))} className="bg-red-900/50 text-red-300 px-2 py-0.5 rounded font-bold interactive-btn">حذف رسالة ✕</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}