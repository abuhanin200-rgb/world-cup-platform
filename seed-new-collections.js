const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const serviceAccount = require("./serviceAccountKey.json");

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

const teams = [
  { code: "MEX", nameAr: "المكسيك", nameEn: "Mexico", emoji: "🇲🇽", group: "A" },
  { code: "RSA", nameAr: "جنوب أفريقيا", nameEn: "South Africa", emoji: "🇿🇦", group: "A" },
  { code: "KOR", nameAr: "كوريا الجنوبية", nameEn: "South Korea", emoji: "🇰🇷", group: "A" },
  { code: "CZE", nameAr: "التشيك", nameEn: "Czechia", emoji: "🇨🇿", group: "A" },

  { code: "CAN", nameAr: "كندا", nameEn: "Canada", emoji: "🇨🇦", group: "B" },
  { code: "BIH", nameAr: "البوسنة والهرسك", nameEn: "Bosnia and Herzegovina", emoji: "🇧🇦", group: "B" },
  { code: "QAT", nameAr: "قطر", nameEn: "Qatar", emoji: "🇶🇦", group: "B" },
  { code: "SUI", nameAr: "سويسرا", nameEn: "Switzerland", emoji: "🇨🇭", group: "B" },

  { code: "BRA", nameAr: "البرازيل", nameEn: "Brazil", emoji: "🇧🇷", group: "C" },
  { code: "MAR", nameAr: "المغرب", nameEn: "Morocco", emoji: "🇲🇦", group: "C" },
  { code: "HAI", nameAr: "هايتي", nameEn: "Haiti", emoji: "🇭🇹", group: "C" },
  { code: "SCO", nameAr: "اسكتلندا", nameEn: "Scotland", emoji: "🏴", group: "C" },

  { code: "USA", nameAr: "الولايات المتحدة", nameEn: "United States", emoji: "🇺🇸", group: "D" },
  { code: "PAR", nameAr: "باراغواي", nameEn: "Paraguay", emoji: "🇵🇾", group: "D" },
  { code: "AUS", nameAr: "أستراليا", nameEn: "Australia", emoji: "🇦🇺", group: "D" },
  { code: "TUR", nameAr: "تركيا", nameEn: "Türkiye", emoji: "🇹🇷", group: "D" },

  { code: "GER", nameAr: "ألمانيا", nameEn: "Germany", emoji: "🇩🇪", group: "E" },
  { code: "CUW", nameAr: "كوراساو", nameEn: "Curaçao", emoji: "🇨🇼", group: "E" },
  { code: "CIV", nameAr: "كوت ديفوار", nameEn: "Côte d'Ivoire", emoji: "🇨🇮", group: "E" },
  { code: "ECU", nameAr: "الإكوادور", nameEn: "Ecuador", emoji: "🇪🇨", group: "E" },

  { code: "NED", nameAr: "هولندا", nameEn: "Netherlands", emoji: "🇳🇱", group: "F" },
  { code: "JPN", nameAr: "اليابان", nameEn: "Japan", emoji: "🇯🇵", group: "F" },
  { code: "SWE", nameAr: "السويد", nameEn: "Sweden", emoji: "🇸🇪", group: "F" },
  { code: "TUN", nameAr: "تونس", nameEn: "Tunisia", emoji: "🇹🇳", group: "F" },

  { code: "BEL", nameAr: "بلجيكا", nameEn: "Belgium", emoji: "🇧🇪", group: "G" },
  { code: "EGY", nameAr: "مصر", nameEn: "Egypt", emoji: "🇪🇬", group: "G" },
  { code: "IRN", nameAr: "إيران", nameEn: "Iran", emoji: "🇮🇷", group: "G" },
  { code: "NZL", nameAr: "نيوزيلندا", nameEn: "New Zealand", emoji: "🇳🇿", group: "G" },

  { code: "ESP", nameAr: "إسبانيا", nameEn: "Spain", emoji: "🇪🇸", group: "H" },
  { code: "CPV", nameAr: "الرأس الأخضر", nameEn: "Cape Verde", emoji: "🇨🇻", group: "H" },
  { code: "KSA", nameAr: "السعودية", nameEn: "Saudi Arabia", emoji: "🇸🇦", group: "H" },
  { code: "URU", nameAr: "الأوروغواي", nameEn: "Uruguay", emoji: "🇺🇾", group: "H" },

  { code: "FRA", nameAr: "فرنسا", nameEn: "France", emoji: "🇫🇷", group: "I" },
  { code: "SEN", nameAr: "السنغال", nameEn: "Senegal", emoji: "🇸🇳", group: "I" },
  { code: "IRQ", nameAr: "العراق", nameEn: "Iraq", emoji: "🇮🇶", group: "I" },
  { code: "NOR", nameAr: "النرويج", nameEn: "Norway", emoji: "🇳🇴", group: "I" },

  { code: "ARG", nameAr: "الأرجنتين", nameEn: "Argentina", emoji: "🇦🇷", group: "J" },
  { code: "ALG", nameAr: "الجزائر", nameEn: "Algeria", emoji: "🇩🇿", group: "J" },
  { code: "AUT", nameAr: "النمسا", nameEn: "Austria", emoji: "🇦🇹", group: "J" },
  { code: "JOR", nameAr: "الأردن", nameEn: "Jordan", emoji: "🇯🇴", group: "J" },

  { code: "POR", nameAr: "البرتغال", nameEn: "Portugal", emoji: "🇵🇹", group: "K" },
  { code: "COD", nameAr: "الكونغو الديمقراطية", nameEn: "DR Congo", emoji: "🇨🇩", group: "K" },
  { code: "UZB", nameAr: "أوزبكستان", nameEn: "Uzbekistan", emoji: "🇺🇿", group: "K" },
  { code: "COL", nameAr: "كولومبيا", nameEn: "Colombia", emoji: "🇨🇴", group: "K" },

  { code: "ENG", nameAr: "إنجلترا", nameEn: "England", emoji: "🏴", group: "L" },
  { code: "CRO", nameAr: "كرواتيا", nameEn: "Croatia", emoji: "🇭🇷", group: "L" },
  { code: "GHA", nameAr: "غانا", nameEn: "Ghana", emoji: "🇬🇭", group: "L" },
  { code: "PAN", nameAr: "بنما", nameEn: "Panama", emoji: "🇵🇦", group: "L" },
];

async function seedTeams() {
  console.log("🚀 بدء إنشاء مجموعة teams وإضافة المنتخبات");

  const batch = db.batch();

  teams.forEach((team) => {
    const ref = db.collection("teams").doc(team.code);
    batch.set(ref, {
      ...team,
      isActive: true,
      createdAt: new Date().toISOString(),
    });
  });

  await batch.commit();

  console.log(`✅ تم إضافة ${teams.length} منتخبًا في مجموعة teams`);
}

async function seedSettings() {
  console.log("🚀 بدء إنشاء مجموعة settings");

  const siteSettingsRef = db.collection("settings").doc("site");

  await siteSettingsRef.set({
    siteNameAr: "منصة توقعات كأس العالم 2026",
    siteNameEn: "World Cup 2026 Predictions Platform",
    isMaintenanceMode: false,
    maintenanceMessage:
      "الموقع مغلق مؤقتًا للصيانة، ونعود لكم قريبًا بتجربة أفضل بإذن الله.",
    timezone: "Asia/Riyadh",
    predictionsLockAtMatchStart: true,
    hideMatchAfterMinutes: 120,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  console.log("✅ تم إنشاء إعدادات الموقع");
}

async function seedEmptyCollections() {
  console.log("🚀 بدء إنشاء المجموعات الفارغة الأساسية");

  const now = new Date().toISOString();

  await db.collection("matches").doc("_init").set({
    note: "ملف مؤقت لإنشاء مجموعة المباريات. يمكن حذفه لاحقًا من لوحة الأدمن.",
    createdAt: now,
  });

  await db.collection("predictions").doc("_init").set({
    note: "ملف مؤقت لإنشاء مجموعة التوقعات. يمكن حذفه لاحقًا من لوحة الأدمن.",
    createdAt: now,
  });

  await db.collection("admin_logs").doc("_init").set({
    action: "init_collections",
    note: "تم إنشاء المجموعات الأساسية للنظام الجديد",
    createdAt: now,
  });

  console.log("✅ تم إنشاء matches و predictions و admin_logs");
}

async function run() {
  try {
    console.log("================================");
    console.log("بدء تجهيز قاعدة البيانات الجديدة");
    console.log("================================");

    await seedTeams();
    await seedSettings();
    await seedEmptyCollections();

    console.log("================================");
    console.log("✅ تم تجهيز Collections الجديدة بنجاح");
    console.log("✅ تم الحفاظ على users بدون تعديل");
    console.log("================================");
  } catch (error) {
    console.error("❌ حدث خطأ أثناء تجهيز Collections:");
    console.error(error);
  }
}

run();