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

  const [scoreEditUserId, setScoreEditUserId] = useState("");
  const [editPoints, setEditPoints] = useState(0);
  const [editTotal, setEditTotal] = useState(0);
  const [editCorrect, setEditCorrect] = useState(0);
  const [editWrong, setEditWrong] = useState(0);

  // 📝 تعديل حاسم: إنشاء عدادات صفحات مستقلة لكل قسم على حدة ليعرض 20 اسماً وعنصراً
  const [userPage, setUserPage] = useState(1);
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const [predPage, setPredPage] = useState(1);
  const [chatPage, setChatPage] = useState(1);
  
  const itemsPerPage = 20; // تثبيت العرض لـ 20 عنصراً في كل الجداول

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
    setEditingUserId(""); alert("✅ تم تعديل بيانات الحساب بصفحة الجمهور لايف!");
  };

  const handleUpdateUserScoresManual = async (userId: string) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        points: Number(editPoints),
        total: Number(editTotal),
        correct: Number(editCorrect),
        wrong: Number(editWrong)
      });
      setScoreEditUserId(""); alert("🏆 تم تحديث وإجبار لوحة الصدارة على التغيير أمام الجمهور لايف!");
    } catch (err) { console.error(err); }
  };

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
      await updateDoc(doc(db, "predictions", pred.id), { processed: true, pointsAwarded: pointsToAdd, matchTypeAwarded: type });
      alert(`🏆 حُسبت النقاط للعضو ${pred.user} وتحدثت الصدارة للجمهور!`);
    }
  };

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
      await updateDoc(doc(db, "users", uDoc.id), {
        points: Math.max((cur.points || 0) - pointsToSubtract, 0),
        total: Math.max((cur.total || 0) - 1, 0),
        correct: Math.max((cur.correct || 0) - isCorrect, 0),
        wrong: Math.max((cur.wrong || 0) - isWrong, 0)
      });
      await updateDoc(doc(db, "predictions", pred.id), { processed: false, pointsAwarded: 0, matchTypeAwarded: "" });
      alert(`↩️ تم التراجع وخصم النقاط بنجاح!`);
    }
  };

  const handleUpdateTickerSpeed = async () => {
    try {
      if (tickerId) { await updateDoc(doc(db, "ticker_settings", tickerId), { speed: tickerSpeed }); }
      else { await addDoc(collection(db, "ticker_settings"), { speed: tickerSpeed }); }
      alert("⚡ تم تغيير سرعة شريط الجمهور فوراً!");
    } catch (err) { console.error(err); }
  };

  // أرقام الصفحات القصوى لكل جدول ديناميكياً
  const maxUserPages = Math.ceil(users.length / itemsPerPage);
  const maxLeaderboardPages = Math.ceil(users.length / itemsPerPage);
  const maxPredPages = Math.ceil(predictions.length / itemsPerPage);
  const maxChatPages = Math.ceil(chats.length / itemsPerPage);
  return (
    <div dir="rtl" className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-8 font-sans text-right select-none">
      <style>{`.interactive-btn:active { transform: scale(0.95); filter: brightness(1.2); }`}</style>
      <h1 className="text-xl md:text-2xl font-black text-amber-400 mb-6 border-b border-slate-700 pb-2">⚙️ لوحة تحكم الإدارة الاحترافية الكاملة</h1>

      {/* شريط السرعة */}
      <section className="bg-slate-950 p-4 rounded-xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div><h3 className="font-black text-xs text-purple-300">⚙️ التحكم بسرعة شريط التوقعات بصفحة الجمهور</h3></div>
        <div className="flex gap-2">
          <select value={tickerSpeed} onChange={(e) => setTickerSpeed(e.target.value)} className="bg-slate-900 border p-2 rounded-lg text-xs text-white focus:outline-none"><option value="15s">سريع (15ث)</option><option value="30s">متوسط (30ث)</option><option value="50s">بطيء (50ث)</option></select>
          <button onClick={handleUpdateTickerSpeed} className="bg-purple-600 px-4 py-2 rounded-lg text-xs font-black interactive-btn">تحديث ⚡</button>
        </div>
      </section>

      {/* 👥 القسم الأول: إدارة والتحكم الكامل بـ 20 عضواً مع أزرار الصفحات */}
      <section className="bg-slate-950 p-4 rounded-xl mb-6 shadow-xl border border-white/5">
        <h3 className="font-black text-xs text-amber-400 mb-3 border-b border-slate-800 pb-1">👤 القسم الأول: التحكم الكامل بالأعضاء وبينات الحسابات ({users.length} عضو)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead><tr className="bg-slate-900 text-slate-400 border-b border-slate-800"><th className="p-2 text-right">الاسم</th><th className="p-2">الرمز السري</th><th className="p-2">الترشيح لبطل كأس العالم</th><th className="p-2">الإجراء والتحكم اليدوي</th></tr></thead>
            <tbody className="divide-y divide-slate-900">
              {users.slice((userPage - 1) * itemsPerPage, userPage * itemsPerPage).map((u) => (
                <tr key={u.id} className="hover:bg-slate-900/40">
                  <td className="p-2 text-right font-bold">{editingUserId === u.id ? <input type="text" className="bg-slate-900 border px-2 py-0.5 rounded text-white" value={editName} onChange={(e)=>setEditName(e.target.value)} /> : u.fullName}</td>
                  <td className="p-2 font-mono">{editingUserId === u.id ? <input type="text" className="bg-slate-900 border px-2 py-0.5 rounded text-center text-white" value={editPassword} onChange={(e)=>setEditPassword(e.target.value)} /> : u.password}</td>
                  <td className="p-2">{editingUserId === u.id ? <input type="text" className="bg-slate-900 border px-2 py-0.5 rounded text-center text-white" value={editTeam} onChange={(e)=>setEditTeam(e.target.value)} /> : u.favoriteTeam}</td>
                  <td className="p-2 flex gap-1 justify-center">
                    {editingUserId === u.id ? <button onClick={()=>handleUpdateUser(u.id)} className="bg-green-600 px-2 py-1 rounded text-[10px] font-bold interactive-btn">حفظ 💾</button> : <button onClick={()=>{setEditingUserId(u.id); setEditName(u.fullName); setEditPassword(u.password); setEditTeam(u.favoriteTeam);}} className="bg-blue-600 px-2 py-1 rounded text-[10px] font-bold interactive-btn">تعديل ⚙️</button>}
                    <button onClick={async ()=>{if(confirm("حذف هذا العضو؟")) await deleteDoc(doc(db,"users",u.id))}} className="bg-red-600 px-2 py-1 rounded text-[10px] font-bold interactive-btn">حذف 🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* أزرار التنقل المستقلة للقسم الأول لـ 20 اسماً */}
        {maxUserPages > 1 && (
          <div className="flex justify-center items-center gap-4 pt-3 border-t border-slate-800 mt-3 text-xs font-bold">
            <button onClick={()=>setUserPage(p=>Math.max(p-1,1))} disabled={userPage === 1} className="bg-slate-800 px-3 py-1 rounded disabled:opacity-30 interactive-btn">◀ السابق</button>
            <span className="text-slate-400">صفحة {userPage} من {maxUserPages}</span>
            <button onClick={()=>setUserPage(p=>Math.min(p+1,maxUserPages))} disabled={userPage === maxUserPages} className="bg-slate-800 px-3 py-1 rounded disabled:opacity-30 interactive-btn">التالي ▶</button>
          </div>
        )}
      </section>

      {/* 📊 قسم تعديل وإجبار إحصائيات الصدارة يدوياً لـ 20 اسماً مع أزرار الصفحات */}
      <section className="bg-slate-950 p-4 rounded-xl mb-6 border border-amber-500/20 shadow-xl">
        <h3 className="font-black text-xs text-amber-400 mb-3 border-b border-slate-800 pb-1">📊 قسم تعديل وإجبار إحصائيات الصدارة يدوياً (النقاط - التوقعات - الصح - الخطأ)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <th className="p-2 text-right">العضو</th>
                <th className="p-2">إجمالي التوقعات</th>
                <th className="p-2 text-green-400">الصح</th>
                <th className="p-2 text-red-400">الخطأ</th>
                <th className="p-2 text-yellow-400">النقاط الكلية</th>
                <th className="p-2">التحكم اليدوي المباشر</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 font-bold">
              {users.slice((leaderboardPage - 1) * itemsPerPage, leaderboardPage * itemsPerPage).map((u) => (
                <tr key={u.id} className="hover:bg-slate-900/40">
                  <td className="p-2 text-right text-white">👤 {u.fullName} {u.teamEmoji}</td>
                  <td className="p-2">{scoreEditUserId === u.id ? <input type="number" className="w-14 bg-slate-900 border text-center text-white" value={editTotal} onChange={(e)=>setEditTotal(Number(e.target.value))} /> : u.total || 0}</td>
                  <td className="p-2 text-green-400">{scoreEditUserId === u.id ? <input type="number" className="w-14 bg-slate-900 border text-center text-green-400" value={editCorrect} onChange={(e)=>setEditCorrect(Number(e.target.value))} /> : u.correct || 0}</td>
                  <td className="p-2 text-red-400">{scoreEditUserId === u.id ? <input type="number" className="w-14 bg-slate-900 border text-center text-red-400" value={editWrong} onChange={(e)=>setEditWrong(Number(e.target.value))} /> : u.wrong || 0}</td>
                  <td className="p-2 text-amber-400 font-black">{scoreEditUserId === u.id ? <input type="number" className="w-14 bg-slate-900 border text-center text-amber-400" value={editPoints} onChange={(e)=>setEditPoints(Number(e.target.value))} /> : u.points || 0}</td>
                  <td className="p-2 flex gap-1 justify-center">
                    {scoreEditUserId === u.id ? (
                      <button onClick={()=>handleUpdateUserScoresManual(u.id)} className="bg-emerald-600 px-3 py-1 rounded text-[10px] font-black interactive-btn">تحديث الصدارة لايف 💾</button>
                    ) : (
                      <button onClick={()=>{setScoreEditUserId(u.id); setEditTotal(u.total || 0); setEditCorrect(u.correct || 0); setEditWrong(u.wrong || 0); setEditPoints(u.points || 0);}} className="bg-amber-600 text-slate-950 font-black px-3 py-1 rounded text-[10px] interactive-btn">تعديل الإحصائيات 📊</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* أزرار التنقل المستقلة لقسم إحصائيات لوحة الصدارة لـ 20 اسماً */}
        {maxLeaderboardPages > 1 && (
          <div className="flex justify-center items-center gap-4 pt-3 border-t border-slate-800 mt-3 text-xs font-bold">
            <button onClick={()=>setLeaderboardPage(p=>Math.max(p-1,1))} disabled={leaderboardPage === 1} className="bg-slate-800 px-3 py-1 rounded disabled:opacity-30 interactive-btn">◀ السابق</button>
            <span className="text-slate-400">صفحة {leaderboardPage} من {maxLeaderboardPages}</span>
            <button onClick={()=>setLeaderboardPage(p=>Math.min(p+1,maxLeaderboardPages))} disabled={leaderboardPage === maxLeaderboardPages} className="bg-slate-800 px-3 py-1 rounded disabled:opacity-30 interactive-btn">التالي ▶</button>
          </div>
        )}
      </section>

      {/* 🧮 القسم الثاني والثالث: فرز توقعات الأعضاء لـ 20 عنصراً مع أزرار الصفحات */}
      <section className="bg-slate-950 p-4 rounded-xl mb-6 shadow-xl border border-white/5">
        <h3 className="font-black text-xs text-green-400 mb-3 border-b border-slate-800 pb-1">🧮 القسم الثاني والثالث: فرز التوقعات وتوزيع النقاط والتراجع اليدوي المضمون ({predictions.length} توقع)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead><tr className="bg-slate-900 text-slate-400 border-b border-slate-800"><th className="p-2 text-right">العضو</th><th className="p-2">المباراة</th><th className="p-2">التوقع المرسل</th><th className="p-2">الحالة والفرز</th><th className="p-2">إجراءات الفرز اليدوي وتوزيع النقاط</th></tr></thead>
            <tbody className="divide-y divide-slate-900 font-bold">
              {predictions.slice((predPage - 1) * itemsPerPage, predPage * itemsPerPage).map((p) => (
                <tr key={p.id} className="hover:bg-slate-900/40">
                  <td className="p-2 text-right text-white">👤 {p.user}</td>
                  <td className="p-2 text-purple-300">{p.t1} vs {p.t2}</td>
                  <td className="p-2 text-green-400 font-mono text-sm">{p.score1} - {p.score2}</td>
                  <td className="p-2">{p.processed ? <span className="text-green-500 font-black">حُسبت (+{p.pointsAwarded || 0})</span> : <span className="text-amber-500 font-black">انتظار الفرز</span>}</td>
                  <td className="p-2 flex gap-1 justify-center">
                    {!p.processed ? (
                      <>
                        <button onClick={()=>handleGrantPointsManual(p, "full")} className="bg-emerald-600 px-2 py-0.5 rounded text-[10px] font-bold interactive-btn">بالملي (+3)</button>
                        <button onClick={()=>handleGrantPointsManual(p, "win")} className="bg-blue-600 px-2 py-0.5 rounded text-[10px] font-bold interactive-btn">الفائز (+1)</button>
                        <button onClick={()=>handleGrantPointsManual(p, "wrong")} className="bg-slate-700 px-2 py-0.5 rounded text-[10px] font-bold interactive-btn">خطأ (0)</button>
                      </>
                    ) : (
                      <button onClick={()=>handleUndoPointsManual(p)} className="bg-orange-600 text-white font-black px-3 py-0.5 rounded text-[10px] interactive-btn shadow-md">↩️ تراجع عن الحسبة</button>
                    )}
                    <button onClick={async ()=>{if(confirm("حذف هذا التوقع؟")) await deleteDoc(doc(db,"predictions",p.id))}} className="bg-red-950 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold interactive-btn">حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* أزرار التنقل المستقلة لقسم إدارة التوقعات لـ 20 عنصراً */}
        {maxPredPages > 1 && (
          <div className="flex justify-center items-center gap-4 pt-3 border-t border-slate-800 mt-3 text-xs font-bold">
            <button onClick={()=>setPredPage(p=>Math.max(p-1,1))} disabled={predPage === 1} className="bg-slate-800 px-3 py-1 rounded disabled:opacity-30 interactive-btn">◀ السابق</button>
            <span className="text-slate-400">صفحة {predPage} من {maxPredPages}</span>
            <button onClick={()=>setPredPage(p=>Math.min(p+1,maxPredPages))} disabled={predPage === maxPredPages} className="bg-slate-800 px-3 py-1 rounded disabled:opacity-30 interactive-btn">التالي ▶</button>
          </div>
        )}
      </section>

      {/* 💬 القسم الرابع: الرقابة والتحكم بـ شات صفحة الجمهور لـ 20 عنصراً مع أزرار الصفحات */}
      <section className="bg-slate-950 p-4 rounded-xl shadow-xl border border-white/5">
        <h3 className="font-black text-xs text-red-400 mb-2 border-b border-slate-800 pb-1">💬 القسم الرابع: الرقابة والتحكم بـ شات صفحة الجمهور ({chats.length} رسالة)</h3>
        <div className="space-y-2 mb-3">
          {chats.slice((chatPage - 1) * itemsPerPage, chatPage * itemsPerPage).map((c) => (
            <div key={c.id} className="bg-slate-900 p-2 rounded-lg flex items-center justify-between text-xs">
              <div><span className="font-black text-purple-400">👤 {c.user}:</span> <span className="text-slate-200 font-medium">{c.text}</span></div>
              <button onClick={async()=>await deleteDoc(doc(db,"chats",c.id))} className="bg-red-900/50 text-red-300 px-2 py-0.5 rounded font-bold interactive-btn">حذف رسالة ✕</button>
            </div>
          ))}
        </div>
        {/* أزرار التنقل المستقلة لقسم رقابة الشات لـ 20 عنصراً */}
        {maxChatPages > 1 && (
          <div className="flex justify-center items-center gap-4 pt-3 border-t border-slate-800 mt-3 text-xs font-bold">
            <button onClick={()=>setChatPage(p=>Math.max(p-1,1))} disabled={chatPage === 1} className="bg-slate-800 px-3 py-1 rounded disabled:opacity-30 interactive-btn">◀ السابق</button>
            <span className="text-slate-400">صفحة {chatPage} من {maxChatPages}</span>
            <button onClick={()=>setChatPage(p=>Math.min(p+1,maxChatPages))} disabled={chatPage === maxChatPages} className="bg-slate-800 px-3 py-1 rounded disabled:opacity-30 interactive-btn">التالي ▶</button>
          </div>
        )}
      </section>
    </div>
  );
}