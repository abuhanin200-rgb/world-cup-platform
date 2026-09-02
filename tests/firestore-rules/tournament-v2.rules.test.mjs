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
  serverTimestamp,
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
      setDoc(doc(db, "users", "user-1"), {
        userId: "user-1", fullName: "owner", phone: "0500000001", password: "legacy-secret", points: 4,
      }),
      setDoc(doc(db, "users", "user-2"), {
        userId: "user-2", fullName: "other", phone: "0500000002", points: 8,
      }),
      setDoc(doc(db, "matches", "legacy-match-1"), { startAt: "2030-01-01T00:00:00.000Z", status: "scheduled" }),
      setDoc(doc(db, "teams", "team-1"), { name: "team" }),
      setDoc(doc(db, "predictions", "user-1_legacy-match-1"), {
        userId: "user-1", matchId: "legacy-match-1", homeScore: 1, awayScore: 0, points: 0, isCalculated: false,
      }),
      setDoc(doc(db, "settings", "main"), { maintenanceMode: false }),
      setDoc(doc(db, "settings", "homeBanner"), { isActive: false }),
      setDoc(doc(db, "settings", "flagMemory"), { enabled: true }),
      setDoc(doc(db, "settings", "tenSecondsChallenge"), { enabled: true }),
      setDoc(doc(db, "settings", "private"), { secret: true }),
      setDoc(doc(db, "challengeStudio", "published"), { published: true, title: "public" }),
      setDoc(doc(db, "challengeStudio", "draft"), { published: false, title: "draft" }),
      setDoc(doc(db, "challengeStudioChat", "message-1"), {
        userId: "user-1", userName: "owner", text: "message", createdAt: new Date(), updatedAt: new Date(), isEdited: false,
      }),
      setDoc(doc(db, "challengeStudioChatLikes", "message-1_user-1"), {
        messageId: "message-1", userId: "user-1", userName: "owner", createdAt: new Date(),
      }),
      setDoc(doc(db, "challengeStudioChatReplies", "reply-1"), { userId: "user-1", text: "reply" }),
      setDoc(doc(db, "flagMemoryResults", "user-1_2026-01-01"), { userId: "user-1", score: 10 }),
      setDoc(doc(db, "tenSecondsChallengeDaily", "user-1_2026-01-01"), { userId: "user-1", score: 10 }),
      setDoc(doc(db, "wordGameDailyGames", "user-1_2026-01-01"), { userId: "user-1", targetWord: "secret" }),
      setDoc(doc(db, "wordGameDailyResults", "user-1_2026-01-01"), { userId: "user-1", score: 3 }),
      setDoc(doc(db, "wordGameUserStats", "user-1"), { userId: "user-1", totalScore: 3 }),
      setDoc(doc(db, "onlinePresence", "user-1"), { userId: "user-1", path: "/account" }),
      setDoc(doc(db, "memberNotices", "active"), { isActive: true, isArchived: false, title: "notice" }),
      setDoc(doc(db, "memberNotices", "archived"), { isActive: true, isArchived: true, title: "archived" }),
      setDoc(doc(db, "memberNoticeViews", "active_user-1"), { noticeId: "active", userId: "user-1", hasSeen: false }),
      setDoc(doc(db, "Matches", "old-match"), { name: "old" }),
      setDoc(doc(db, "Stats", "old-stats"), { total: 1 }),
      setDoc(doc(db, "Predictions", "old-prediction"), { userId: "user-1", points: 3 }),
      setDoc(doc(db, "Users", "user-1"), { userId: "user-1", password: "old-secret" }),
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
  await assertFails(setDoc(ref, { userId: "legacy-user", homeScore: 1, awayScore: 0 }));
  await assertFails(getDoc(ref));
  await assertFails(setDoc(doc(db, "unknownFutureCollection", "document-1"), { open: true }));
});

test("Legacy public collections are read-only and settings are allowlisted", async () => {
  const guest = testEnv.unauthenticatedContext().firestore();
  const readable = [
    ["matches", "legacy-match-1"], ["teams", "team-1"], ["settings", "main"],
    ["settings", "homeBanner"], ["settings", "flagMemory"], ["settings", "tenSecondsChallenge"],
    ["challengeStudio", "published"], ["challengeStudioChat", "message-1"],
    ["challengeStudioChatLikes", "message-1_user-1"], ["challengeStudioChatReplies", "reply-1"],
    ["flagMemoryResults", "user-1_2026-01-01"], ["tenSecondsChallengeDaily", "user-1_2026-01-01"],
    ["wordGameDailyResults", "user-1_2026-01-01"], ["Matches", "old-match"], ["Stats", "old-stats"],
  ];
  for (const [collectionName, documentId] of readable) {
    await assertSucceeds(getDoc(doc(guest, collectionName, documentId)));
    await assertFails(setDoc(doc(guest, collectionName, documentId), { overwritten: true }));
  }
  await assertFails(getDoc(doc(guest, "settings", "private")));
  await assertFails(getDoc(doc(guest, "challengeStudio", "draft")));
  await assertFails(getDocs(collection(guest, "challengeStudio")));
  const published = await assertSucceeds(getDocs(query(collection(guest, "challengeStudio"), where("published", "==", true))));
  assert.equal(published.size, 1);
});

test("Legacy user documents and predictions are owner-only and direct prediction writes are blocked", async () => {
  const guest = testEnv.unauthenticatedContext().firestore();
  const owner = testEnv.authenticatedContext("user-1").firestore();
  const other = testEnv.authenticatedContext("user-2").firestore();
  const userRef = doc(owner, "users", "user-1");
  const predictionRef = doc(owner, "predictions", "user-1_legacy-match-1");
  await assertFails(getDoc(doc(guest, "users", "user-1")));
  await assertFails(getDoc(doc(other, "users", "user-1")));
  await assertSucceeds(getDoc(userRef));
  await assertSucceeds(updateDoc(userRef, { fullName: "updated owner" }));
  await assertFails(updateDoc(userRef, { points: 999 }));
  await assertFails(updateDoc(userRef, { userId: "user-2" }));
  await assertSucceeds(getDoc(predictionRef));
  await assertFails(getDoc(doc(other, "predictions", "user-1_legacy-match-1")));
  await assertFails(getDocs(collection(owner, "predictions")));
  await assertFails(setDoc(doc(owner, "predictions", "user-1_new"), { userId: "user-1", matchId: "legacy-match-1" }));
  await assertFails(updateDoc(predictionRef, { homeScore: 9, points: 99, isCalculated: true }));
  await assertFails(deleteDoc(predictionRef));
});

test("Private legacy documents and derived scores resist guest, other-user, and owner tampering", async () => {
  const guest = testEnv.unauthenticatedContext().firestore();
  const owner = testEnv.authenticatedContext("user-1").firestore();
  const other = testEnv.authenticatedContext("user-2").firestore();
  const privateDocs = [
    ["wordGameDailyGames", "user-1_2026-01-01"], ["wordGameUserStats", "user-1"],
    ["onlinePresence", "user-1"], ["memberNoticeViews", "active_user-1"], ["Users", "user-1"],
  ];
  for (const [collectionName, documentId] of privateDocs) {
    await assertFails(getDoc(doc(guest, collectionName, documentId)));
    await assertFails(getDoc(doc(other, collectionName, documentId)));
  }
  await assertSucceeds(getDoc(doc(owner, "wordGameDailyGames", "user-1_2026-01-01")));
  await assertSucceeds(getDoc(doc(owner, "wordGameUserStats", "user-1")));
  await assertSucceeds(getDoc(doc(owner, "onlinePresence", "user-1")));
  await assertSucceeds(getDoc(doc(owner, "memberNoticeViews", "active_user-1")));
  for (const [collectionName, documentId] of [
    ["flagMemoryResults", "user-1_2026-01-01"], ["tenSecondsChallengeDaily", "user-1_2026-01-01"],
    ["wordGameDailyGames", "user-1_2026-01-01"], ["wordGameDailyResults", "user-1_2026-01-01"],
    ["wordGameUserStats", "user-1"], ["Predictions", "old-prediction"],
  ]) {
    await assertFails(updateDoc(doc(owner, collectionName, documentId), { points: 999, score: 999 }));
  }
});

test("Owners can only create their presence and notice views, and active notices require sign-in", async () => {
  const owner = testEnv.authenticatedContext("user-1").firestore();
  const other = testEnv.authenticatedContext("user-2").firestore();
  const guest = testEnv.unauthenticatedContext().firestore();
  await assertSucceeds(setDoc(doc(owner, "onlinePresence", "user-1"), { userId: "user-1", path: "/predictions" }));
  await assertFails(setDoc(doc(owner, "onlinePresence", "user-2"), { userId: "user-2", path: "/" }));
  await assertSucceeds(setDoc(doc(owner, "memberNoticeViews", "active_user-1"), {
    noticeId: "active", userId: "user-1", hasSeen: true, shownCount: 1,
  }));
  await assertFails(setDoc(doc(other, "memberNoticeViews", "active_user-1"), { noticeId: "active", userId: "user-1", hasSeen: true }));
  await assertFails(getDoc(doc(guest, "memberNotices", "active")));
  await assertSucceeds(getDoc(doc(owner, "memberNotices", "active")));
  await assertFails(getDoc(doc(owner, "memberNotices", "archived")));
  const activeNotices = await assertSucceeds(getDocs(query(
    collection(owner, "memberNotices"), where("isActive", "==", true), where("isArchived", "==", false),
  )));
  assert.equal(activeNotices.size, 1);
});

test("Chat writes are owner-bound and admin access does not reopen the catch-all", async () => {
  const owner = testEnv.authenticatedContext("user-1").firestore();
  const other = testEnv.authenticatedContext("user-2").firestore();
  const admin = testEnv.authenticatedContext("admin-1").firestore();
  await assertSucceeds(setDoc(doc(owner, "challengeStudioChat", "message-2"), {
    userId: "user-1", userName: "owner", text: "new message", createdAt: serverTimestamp(), updatedAt: serverTimestamp(), isEdited: false,
  }));
  await assertFails(setDoc(doc(other, "challengeStudioChat", "forged"), {
    userId: "user-1", userName: "owner", text: "forged", createdAt: serverTimestamp(), updatedAt: serverTimestamp(), isEdited: false,
  }));
  await assertSucceeds(updateDoc(doc(admin, "matches", "legacy-match-1"), { status: "finished" }));
  await assertSucceeds(updateDoc(doc(admin, "settings", "main"), { maintenanceMode: true }));
  await assertSucceeds(getDocs(collection(admin, "users")));
  await assertSucceeds(getDoc(doc(admin, "Predictions", "old-prediction")));
  await assertFails(setDoc(doc(other, "unknownFutureCollection", "document-1"), { open: true }));
  await assertFails(setDoc(doc(other, "users", "user-1", "nested", "escape"), { open: true }));
});
