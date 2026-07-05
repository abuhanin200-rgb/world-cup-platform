"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, UsersRound } from "lucide-react";
import { subscribeOnlineMembersCount } from "@/lib/presence";

export default function OnlineMembersCounter() {
  const [count, setCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeOnlineMembersCount(setCount);

    return () => {
      unsubscribe();
    };
  }, [refreshKey]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRefreshKey((current) => current + 1);
    }, 30 * 1000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.94 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: false, amount: 0.4 }}
      transition={{ duration: 0.42, ease: "easeOut" }}
      whileTap={{ scale: 0.96 }}
      className="relative mx-auto my-4 w-fit overflow-hidden rounded-full border border-emerald-400/25 bg-slate-950/55 px-4 py-2 text-center text-sm font-black text-emerald-100 shadow-lg shadow-emerald-950/20 backdrop-blur-xl md:text-base"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-emerald-300/10 via-transparent to-cyan-300/10" />

      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-transparent via-white/10 to-transparent"
        animate={{ x: ["120%", "-720%"] }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div className="relative flex items-center justify-center gap-2">
        <span className="relative flex h-3 w-3 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-lg shadow-emerald-300/40" />
        </span>

        <Radio className="h-4 w-4 text-emerald-200" />

        <AnimatePresence mode="popLayout">
          <motion.span
            key={count}
            initial={{ y: 10, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="inline-flex min-w-5 justify-center text-emerald-200"
          >
            {count}
          </motion.span>
        </AnimatePresence>

        <span>عضو متواجد الآن</span>

        <UsersRound className="h-4 w-4 text-emerald-200" />
      </div>
    </motion.div>
  );
}