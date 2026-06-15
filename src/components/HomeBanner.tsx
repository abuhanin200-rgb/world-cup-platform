"use client";

import { useEffect, useState } from "react";
import { getHomeBanner, HomeBannerSettings } from "@/lib/homeBanner";

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
    <img
      src={banner.imageUrl}
      alt="بانر إعلاني"
      className="h-full w-full rounded-2xl object-cover"
    />
  );

  return (
    <section className="mt-4 md:mt-5">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-2 shadow-2xl">
        <div className="relative aspect-[4/1] w-full overflow-hidden rounded-2xl bg-slate-950/60">
          {banner.externalUrl ? (
            <a
              href={banner.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block h-full w-full"
            >
              {bannerImage}
            </a>
          ) : (
            bannerImage
          )}
        </div>
      </div>
    </section>
  );
}