"use client";

import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { ExternalLink, Sparkles } from "lucide-react";
import { getHomeBanner, HomeBannerSettings } from "@/lib/homeBanner";

const bannerMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 18,
    scale: 0.98,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.38,
      ease: "easeOut",
    },
  },
};

export default function HomeBanner() {
  const [banner, setBanner] = useState<HomeBannerSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBanner() {
      try {
        const data = await getHomeBanner();
        setBanner(data);
      } catch (error) {
        console.error("Home banner error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadBanner();
  }, []);

  if (loading) return null;

  if (!banner?.isActive || !banner.imageUrl) return null;

  const bannerImage = (
    <div className="group relative h-full w-full overflow-hidden rounded-[1.35rem]">
      <img
        src={banner.imageUrl}
        alt="بانر إعلاني"
        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/25 via-transparent to-white/5" />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

      <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-cyan-300/15 blur-2xl" />

      <div className="pointer-events-none absolute -left-16 bottom-0 h-32 w-32 rounded-full bg-amber-300/15 blur-2xl" />

      {banner.externalUrl && (
        <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/45 px-2.5 py-1.5 text-[10px] font-black text-white shadow-lg shadow-slate-950/30 backdrop-blur-xl md:text-xs">
          <ExternalLink className="h-3.5 w-3.5" />
          <span>رابط</span>
        </div>
      )}

      <div className="absolute bottom-3 right-3 hidden items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/35 px-2.5 py-1.5 text-[10px] font-black text-white/90 shadow-lg shadow-slate-950/20 backdrop-blur-xl sm:inline-flex">
        <Sparkles className="h-3.5 w-3.5 text-amber-200" />
        <span>إعلان المنصة</span>
      </div>
    </div>
  );

  return (
    <motion.section
      variants={bannerMotion}
      initial="hidden"
      animate="show"
      className="mt-4 md:mt-5"
    >
      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.08] p-1.5 shadow-2xl shadow-slate-950/35 backdrop-blur-xl md:p-2">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/12 via-transparent to-cyan-400/5" />

        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent" />

        <div className="relative aspect-[4/1] w-full overflow-hidden rounded-[1.35rem] bg-slate-950/60 ring-1 ring-white/10">
          {banner.externalUrl ? (
            <a
              href={banner.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block h-full w-full outline-none transition active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-cyan-300/70"
            >
              {bannerImage}
            </a>
          ) : (
            bannerImage
          )}
        </div>
      </div>
    </motion.section>
  );
}