"use client";
import { motion } from "framer-motion";
import { ShieldCheck, Award, Target, HelpCircle } from "lucide-react";

export default function RulesPage() {
  const ruleCards = [
    {
      icon: <Target className="w-8 h-8 text-brand-gold" />,
      title: "التوقع الصحيح تماماً (3 نقاط)",
      desc: "إذا توقعت نتيجة المباراة بالملي (مثال: توقعت 2-1 وانتهت المباراة فعلياً 2-1)، ستحصل على العلامة الكاملة."
    },
    {
      icon: <Award className="w-8 h-8 text-emerald-500" />,
      title: "توقع الفائز أو التعادل فقط (1 نقطة)",
      desc: "إذا أصبت في تحديد الطرف الفائز أو توقعت التعادل ولكن الأرقام اختلفت (مثال: توقعت 1-0 وانتهت 3-1)."
    },
    {
      icon: <ShieldCheck className="w-8 h-8 text-brand-pink" />,
      title: "إغلاق التوقعات الآلي",
      desc: "نظام الحماية يغلق إمكانية إدخال أو تعديل التوقعات تلقائياً قبل انطلاق صافرة المباراة بـ 15 دقيقة بدون أي تدخل بشري."
    }
  ];

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      <div className="text-center py-6 bg-gradient-to-b from-brand-purple/10 to-transparent rounded-3xl p-6">
        <HelpCircle className="w-12 h-12 text-brand-purple mx-auto mb-2 animate-pulse" />
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">الشروط والقوانين الحاكمة للتحدي</h1>
        <p className="text-xs text-slate-400 font-bold mt-1">يرجى قراءة القواعد بعناية لضمان المنافسة الشريفة بين جميع الجماهير</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ruleCards.map((rule, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center gap-4"
          >
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl">{rule.icon}</div>
            <h3 className="font-black text-sm text-slate-900 dark:text-white">{rule.title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">{rule.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}