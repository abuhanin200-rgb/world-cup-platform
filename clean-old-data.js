const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const serviceAccount = require("./serviceAccountKey.json");

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

const collectionsToDelete = [
  "chats",
  "match_settings",
  "predictions",
  "ticker_settings",
  "user_notifications",
];

async function deleteCollection(collectionName) {
  const snapshot = await db.collection(collectionName).get();

  if (snapshot.empty) {
    console.log(`ℹ️ المجموعة ${collectionName} فارغة أو غير موجودة`);
    return;
  }

  const batchSize = 400;
  let deletedCount = 0;
  let docs = snapshot.docs;

  while (docs.length > 0) {
    const batch = db.batch();

    docs.slice(0, batchSize).forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    deletedCount += Math.min(batchSize, docs.length);
    docs = docs.slice(batchSize);

    console.log(`🗑️ تم حذف ${deletedCount} من ${collectionName}`);
  }

  console.log(`✅ انتهى حذف المجموعة: ${collectionName}`);
}

async function cleanOldData() {
  console.log("🚨 بدء تنظيف بيانات الموقع القديم");
  console.log("✅ سيتم الحفاظ على مجموعة users فقط");
  console.log("--------------------------------");

  for (const collectionName of collectionsToDelete) {
    await deleteCollection(collectionName);
  }

  console.log("--------------------------------");
  console.log("✅ تم تنظيف البيانات القديمة بنجاح");
  console.log("✅ مجموعة users لم يتم لمسها");
}

cleanOldData().catch((error) => {
  console.error("❌ حدث خطأ أثناء التنظيف:");
  console.error(error);
});