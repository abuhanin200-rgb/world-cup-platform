import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          deep: "#110042",    // كحلي غامق جداً للخلفيات الفخمة
          purple: "#4c1d95",  // بنفسجي ملكي للأزرار الرئيسية
          pink: "#db2777",    // وردي رياضي حيوي للتنبيهات والمباشر
          gold: "#f59e0b",    // ذهبي برّاق للكؤوس والميداليات
        }
      },
      animation: {
        'marquee': 'marquee 25s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        }
      }
    },
  },
  plugins: [],
};
export default config;