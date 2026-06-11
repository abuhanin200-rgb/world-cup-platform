"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, addDoc } from "firebase/firestore";

export default function AdminDashboard() {
  const [chatList, setChatList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [predictionsCount, setPredictionsCount] = useState(0);

  // إعدادات المباراة للتحكم بها لايف وتحديثها عند الجميع
  const [matchControl, setMatchControl] = useState({
    score: "0 - 0",
    status: "بانتظار ركلة البداية"
  });

  // جلب البيانات الحية للإدارة
  useEffect(() => {
    const qChat = query(collection(db, "chats"), orderBy("createdAt", "desc"));
    const unsubChat = onSnapshot(qChat, (snap) => {
      setChatList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qUsers = query(collection(db, "users"), orderBy("fullName", "asc"));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubPreds = onSnapshot(collection(db, "predictions"), (snap) => {
      setPredictionsCount(snap.docs.length);
    });

    return () => { unsubChat(); unsubUsers(); unsubPreds(); };
  }, []);

  // دالة تحديث نتيجة ومجريات المباراة لايف في الموقع
  const handleUpdateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "match_status"), {
        score: matchControl.score,
        status: matchControl.status,
        updatedAt: new Date().toISOString()
      });
      alert("تم تحديث نتيجة المباراة والمجريات لايف عند جميع المشتركين! 📺🔥");
    } catch (err) { console.error(err); }
  };

  // دالة حذف رسالة مسيئة من الشات فوراً
  const handleDeleteMessage = async (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذه الرسالة نهائياً من الشات؟")) {
      try {
        await deleteDoc(doc(db, "chats", id));
      } catch (err) { console.error(err); }
    }
  };

  // دالة إضافة نقاط لمشترك فاز بالتوقع
  const handleAddPoints = async (userId: string, currentPoints: number) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        points: (currentPoints || 0) + 10,
        correct: (usersList.find(u => u.id === userId).correct || 0) + 1,
        total: (usersList.find(u => u.id === userId).total || 0) + 1
      });
      alert("تم منح المشترك 10 نقاط وزيادة التوقعات الصحيحة تلقائياً! 🥇");
    } catch (err) { console.error(err); }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans text-right">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* الهيدر */}
        <header className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-purple-400">👑 لوحة تحكم الآدمن السرية</h1>
            <p className="text-xs text-slate-400 mt-1">إدارة مباراة الافتتاح، الشات، ونقاط المشتركين لايف</p>
          </div>
          <div className="bg-purple-950/50 border border-purple-500/30 px-4 py-2 rounded-xl text-xs md:text-sm font-mono">
            📊 إجمالي التوقعات الحالية: <span className="text-green-400 font-bold">{predictionsCount}</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 1. قسم التحكم بالمباراة لايف */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-base text-yellow-400 border-b border-slate-700 pb-2">📺 تحديث المباراة المباشرة</h3>
            <form onSubmit={handleUpdateMatch} className="space-y-4 text-xs md:text-sm">
              <div>
                <label className="block text-slate-400 mb-1">النتيجة الحالية (المكسيك - جنوب أفريقيا)</label>
                <input type="text" value={matchControl.score} onChange={(e) => setMatchControl({...matchControl, score: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 font-mono text-center text-lg text-green-400 focus:outline-none" placeholder="مثال: 1 - 0" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">الحالة أو الشوط</label>
                <input type="text" value={matchControl.status} onChange={(e) => setMatchControl({...matchControl, status: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 focus:outline-none" placeholder="مثال: الشوط الأول، انتهت المباراة" />
              </div>
              <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl transition-colors">تحديث الشاشات الآن 🚀</button>
            </form>
          </div>

          {/* 2. قسم إدارة الشات */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col h-[400px]">
            <h3 className="font-bold text-base text-red-400 border-b border-slate-700 pb-2 mb-3 flex-shrink-0">💬 الرقابة الفورية على الشات</h3>
            <div className="space-y-2.5 overflow-y-auto flex-1 pl-1 text-xs">
              {chatList.length === 0 ? (
                <p className="text-slate-500 text-center py-12">لا توجد رسائل حالياً بالشات...</p>
              ) : (
                chatList.map((msg, i) => (
                  <div key={i} className="bg-slate-900 p-2.5 rounded-xl border border-slate-700/60 flex justify-between items-center gap-2">
                    <div className="flex-1">
                      <span className="block font-bold text-purple-400 mb-0.5">{msg.user}</span>
                      <p className="text-slate-300">{msg.text}</p>
                    </div>
                    <button onClick={() => handleDeleteMessage(msg.id)} className="bg-red-950 text-red-400 hover:bg-red-900 px-2 py-1.5 rounded-lg font-bold transition-colors">حذف</button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 3. لوحة تحكم وإضافة النقاط */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col h-[400px]">
            <h3 className="font-bold text-base text-green-400 border-b border-slate-700 pb-2 mb-3 flex-shrink-0">🏅 نقاط وترتيب الجماهير</h3>
            <div className="space-y-2.5 overflow-y-auto flex-1 pl-1 text-xs">
              {usersList.length === 0 ? (
                <p className="text-slate-500 text-center py-12">لم يسجل أي مشترك حتى الآن...</p>
              ) : (
                usersList.map((u, i) => (
                  <div key={i} className="bg-slate-900 p-2.5 rounded-xl border border-slate-700/60 flex justify-between items-center gap-2">
                    <div>
                      <span className="block font-bold text-white text-sm">{u.fullName}</span>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">📞 {u.phone} | ⭐ {u.favoriteTeam || "بلا مرشح"}</span>
                      <span className="inline-block bg-purple-950 text-purple-400 px-2 py-0.5 rounded mt-1 font-bold">النقاط: {u.points || 0}</span>
                    </div>
                    <button onClick={() => handleAddPoints(u.id, u.points)} className="bg-green-950 text-green-400 hover:bg-green-900 px-2 py-2 rounded-lg font-bold transition-colors text-center">🏆 +10 نقاط</button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}