const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

function env(name) {
  return String(process.env[name] || "").trim();
}

function privateKey() {
  return env("FIREBASE_ADMIN_PRIVATE_KEY").replace(/^"|"$/g, "").replace(/\\n/g, "\n");
}

const projectId = env("FIREBASE_ADMIN_PROJECT_ID");
const clientEmail = env("FIREBASE_ADMIN_CLIENT_EMAIL");
const key = privateKey();

if (!projectId || !clientEmail || !key) {
  throw new Error("Missing FIREBASE_ADMIN_PROJECT_ID / FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY");
}

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey: key }) });
}

const db = getFirestore();
const COLLECTIONS = ["notifications", "user_notifications"];
const BATCH_SIZE = 400;

async function purgeCollection(name) {
  let total = 0;
  while (true) {
    const snapshot = await db.collection(name).limit(BATCH_SIZE).get();
    if (snapshot.empty) break;
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    total += snapshot.size;
    console.log(`Deleted ${total} documents from ${name}`);
  }
  console.log(`Done: ${name} (${total} deleted)`);
  return total;
}

(async () => {
  console.log("Purging legacy notification data permanently...");
  let total = 0;
  for (const collection of COLLECTIONS) total += await purgeCollection(collection);
  console.log(`Notification purge complete. Total deleted: ${total}`);
  console.log("Preserved: memberNotices, tournamentNotificationDispatches, systemAutomationState.");
})().catch((error) => {
  console.error("Notification purge failed:", error);
  process.exitCode = 1;
});
