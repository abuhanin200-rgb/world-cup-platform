const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const serviceAccount = require("./serviceAccountKey.json");

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

async function resetUsersStats() {
  try {
    console.log("🚀 بدء تصفير إحصائيات الأعضاء مع الحفاظ على بياناتهم الأساسية");

    const snapshot = await db.collection("users").get();

    if (snapshot.empty) {
      console.log("ℹ️ لا يوجد أعضاء في users");
      return;
    }

    let batch = db.batch();
    let count = 0;
    let totalUpdated = 0;

    snapshot.forEach((doc) => {
      batch.update(doc.ref, {
        points: 0,
        total: 0,
        correct: 0,
        wrong: 0,
        currentRank: 0,
        previousRank: 0,
        rankChange: 0,
        rankDirection: "-",
        currentStreak: 0,
        bestStreak: 0,
        lastUpdated: new Date().toISOString(),
      });

      count++;
      totalUpdated++;

      if (count === 400) {
        batch.commit();
        batch = db.batch();
        count = 0;
      }
    });

    if (count > 0) {
      await batch.commit();
    }

    console.log("✅ تم تصفير إحصائيات الأعضاء بنجاح");
    console.log(`📦 عدد الأعضاء الذين تم تحديثهم: ${totalUpdated}`);
    console.log("✅ تم الحفاظ على الأسماء، الجوالات، كلمات المرور، والمنتخب المرشح");
  } catch (error) {
    console.error("❌ حدث خطأ أثناء تصفير إحصائيات الأعضاء:");
    console.error(error);
  }
}

resetUsersStats();