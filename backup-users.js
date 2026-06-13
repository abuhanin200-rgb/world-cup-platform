const fs = require("fs");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const serviceAccount = require("./serviceAccountKey.json");

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function backupUsers() {
  try {
    const snapshot = await db.collection("users").get();

    const users = [];

    snapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    const fileName = `users-backup-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`;

    fs.writeFileSync(fileName, JSON.stringify(users, null, 2), "utf8");

    console.log("✅ تم تصدير الأعضاء بنجاح");
    console.log(`📦 عدد الأعضاء: ${users.length}`);
    console.log(`📁 اسم الملف: ${fileName}`);
  } catch (error) {
    console.error("❌ حدث خطأ أثناء تصدير الأعضاء:");
    console.error(error);
  }
}

backupUsers();