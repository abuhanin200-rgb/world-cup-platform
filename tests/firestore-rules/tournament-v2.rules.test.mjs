import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

const PROJECT_ID = "demo-altahaddi-rules";
let testEnv;
let adminApp;
let adminDb;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
  adminApp = initializeApp({ projectId: PROJECT_ID }, "firestore-rules-admin");
  adminDb = getFirestore(adminApp);
});

after(async () => {
  if (adminApp) await deleteApp(adminApp);
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, "admins", "admin-1"), { role: "admin", enabled: true }),
      setDoc(doc(db, "tournaments", "gulf-cup-27"), { name: "خليجي 27" }),
      setDoc(doc(db, "tournamentMatches", "gulf-cup-27_match-1"), {
        id: "match-1",
        tournamentId: "gulf-cup-27",
        kickoffAt: 1_900_000_000_000,
      }),
      setDoc(doc(db, "tournamentPredictions", "gulf-cup-27_user-1_match-1"), {
        tournamentId: "gulf-cup-27",
        matchId: "match-1",
        userId: "user-1",
        homeScore: 1,
        awayScore: 0,
        points: null,
        isCalculated: false,
      }),
      setDoc(doc(db, "tournamentPredictions", "gulf-cup-27_user-2_match-1"), {
        tournamentId: "gulf-cup-27",
        matchId: "match-1",
        userId: "user-2",
        homeScore: 0,
        awayScore: 0,
        points: null,
        isCalculated: false,
      }),
      setDoc(doc(db, "tournamentUserStats", "gulf-cup-27_user-1"), {
        tournamentId: "gulf-cup-27",
        userId: "user-1",
        points: 0,
      }),
    ]);
  });
});

test("يرفض إنشاء توقع V2 مباشرة من العميل", async () => {
  const db = testEnv.authenticatedContext("user-1").firestore();
  await assertFails(setDoc(doc(db, "tournamentPredictions", "new-prediction"), {
    tournamentId: "gulf-cup-27",
    matchId: "match-1",
    userId: "user-1",
    homeScore: 2,
    awayScore: 1,
  }));
});

test("يرفض تعديل أو حذف توقع المستخدم مباشرة", async () => {
  const db = testEnv.authenticatedContext("user-1").firestore();
  const ref = doc(db, "tournamentPredictions", "gulf-cup-27_user-1_match-1");
  await assertFails(updateDoc(ref, { homeScore: 3 }));
  await assertFails(deleteDoc(ref));
});

test("يرفض تعديل توقع مستخدم آخر أو تغيير النقاط والهوية", async () => {
  const db = testEnv.authenticatedContext("user-1").firestore();
  await assertFails(updateDoc(
    doc(db, "tournamentPredictions", "gulf-cup-27_user-2_match-1"),
    { userId: "user-1", points: 99, isCalculated: true },
  ));
});

test("الزائر لا يقرأ التوقعات الخاصة", async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, "tournamentPredictions", "gulf-cup-27_user-1_match-1")));
  await assertFails(getDocs(collection(db, "tournamentPredictions")));
});

test("المستخدم يقرأ توقعاته فقط عبر استعلام مقيد بهويته", async () => {
  const db = testEnv.authenticatedContext("user-1").firestore();
  const ownQuery = query(
    collection(db, "tournamentPredictions"),
    where("userId", "==", "user-1"),
  );
  const snapshot = await assertSucceeds(getDocs(ownQuery));
  assert.equal(snapshot.size, 1);
  await assertFails(getDoc(doc(db, "tournamentPredictions", "gulf-cup-27_user-2_match-1")));
  await assertFails(getDocs(collection(db, "tournamentPredictions")));
});

test("الأدمن يقرأ التوقعات لكنه لا يكتب إليها مباشرة", async () => {
  const db = testEnv.authenticatedContext("admin-1").firestore();
  const snapshot = await assertSucceeds(getDocs(collection(db, "tournamentPredictions")));
  assert.equal(snapshot.size, 2);
  await assertFails(updateDoc(
    doc(db, "tournamentPredictions", "gulf-cup-27_user-1_match-1"),
    { points: 50 },
  ));
});

test("يمنع العميل من كتابة الترتيب وسجلات الاحتساب والتدقيق", async () => {
  const adminDb = testEnv.authenticatedContext("admin-1").firestore();
  await assertFails(updateDoc(
    doc(adminDb, "tournamentUserStats", "gulf-cup-27_user-1"),
    { points: 100 },
  ));
  await assertFails(setDoc(doc(adminDb, "tournamentSyncRuns", "run-1"), { status: "done" }));
  await assertFails(setDoc(doc(adminDb, "admin_logs", "log-1"), { title: "direct" }));
});

test("السياق الخادمي المتجاوز للقواعد يستطيع حفظ التوقع والنتائج المشتقة", async () => {
  await adminDb.doc("tournamentPredictions/server-created").set({
    tournamentId: "gulf-cup-27",
    matchId: "match-1",
    userId: "user-1",
    homeScore: 2,
    awayScore: 1,
  });
  await adminDb.doc("tournamentUserStats/gulf-cup-27_user-1").update({ points: 3 });

  const prediction = await adminDb.doc("tournamentPredictions/server-created").get();
  const stats = await adminDb.doc("tournamentUserStats/gulf-cup-27_user-1").get();
  assert.equal(prediction.exists, true);
  assert.equal(stats.data()?.points, 3);
});

test("القراءات العامة اللازمة للبطولة والترتيب تعمل", async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  const [tournament, matches, standings] = await Promise.all([
    assertSucceeds(getDoc(doc(db, "tournaments", "gulf-cup-27"))),
    assertSucceeds(getDocs(collection(db, "tournamentMatches"))),
    assertSucceeds(getDocs(collection(db, "tournamentUserStats"))),
  ]);
  assert.equal(tournament.exists(), true);
  assert.equal(matches.size, 1);
  assert.equal(standings.size, 1);
});

test("مجموعة predictions القديمة بقيت مستقلة وتعمل", async () => {
  const db = testEnv.authenticatedContext("legacy-user").firestore();
  const ref = doc(db, "predictions", "legacy-prediction");
  await assertSucceeds(setDoc(ref, { userId: "legacy-user", homeScore: 1, awayScore: 0 }));
  await assertSucceeds(getDoc(ref));
  await assertFails(setDoc(doc(db, "unknownFutureCollection", "document-1"), { open: true }));
});
