import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { openai } from "@/lib/openai";
import { requireAdminRequest } from "@/lib/serverAdminAuth";
import {
  MAJLIS_CATEGORY_OVERRIDE_COLLECTION,
  MAJLIS_CUSTOM_CATEGORY_COLLECTION,
  MAJLIS_CUSTOM_QUESTION_COLLECTION,
  MAJLIS_QUESTION_OVERRIDE_COLLECTION,
  MAJLIS_SETTINGS_DOC,
  getEffectiveMajlisBank,
  getMajlisSettings,
  majlisBankSummary,
} from "@/lib/serverMajlisQuestionBank";
import type { MajlisDifficulty, MajlisQuestionType } from "@/types/majlisGame";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function text(value: unknown) { return String(value ?? "").trim(); }
function number(value: unknown, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function difficulty(value: unknown): MajlisDifficulty { return value === "hard" ? "hard" : value === "medium" ? "medium" : "easy"; }
function type(value: unknown): MajlisQuestionType { return value === "speech" ? "speech" : value === "audio" ? "audio" : value === "image" ? "image" : value === "multiple_choice" ? "multiple_choice" : "text"; }
function options(value: unknown) { return Array.isArray(value) ? value.map(text).filter(Boolean).slice(0, 6) : []; }
function slug(value: unknown) {
  const cleaned = text(value).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || `custom-${randomUUID().slice(0, 8)}`;
}

async function listPayload(request: NextRequest) {
  const bank = await getEffectiveMajlisBank();
  const settings = await getMajlisSettings();
  const q = text(request.nextUrl.searchParams.get("q")).toLocaleLowerCase("ar");
  const category = text(request.nextUrl.searchParams.get("category"));
  const diff = text(request.nextUrl.searchParams.get("difficulty"));
  const kind = text(request.nextUrl.searchParams.get("type"));
  const family = text(request.nextUrl.searchParams.get("questionFamily"));
  const status = text(request.nextUrl.searchParams.get("status"));
  const page = Math.max(1, Math.floor(number(request.nextUrl.searchParams.get("page"), 1)));
  const pageSize = Math.max(20, Math.min(100, Math.floor(number(request.nextUrl.searchParams.get("pageSize"), 50))));

  let questions = bank.questions.filter((item) => {
    if (category && item.categoryId !== category) return false;
    if (diff && item.difficulty !== diff) return false;
    if (kind && item.type !== kind) return false;
    if (family && item.questionFamily !== family) return false;
    if (status === "enabled" && !item.enabled) return false;
    if (status === "disabled" && item.enabled) return false;
    if (q) {
      const haystack = [item.prompt, item.answer, item.hint, item.explanation, item.sourceLabel, item.sourceName, item.groupKey, item.questionFamily, item.reciterName, item.dialect, item.speechLanguage, item.id].join(" ").toLocaleLowerCase("ar");
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
  questions = questions.sort((a, b) => a.categoryId.localeCompare(b.categoryId) || a.id.localeCompare(b.id));
  const total = questions.length;
  const offset = (page - 1) * pageSize;

  return {
    settings,
    categories: majlisBankSummary(bank.categories, bank.questions),
    questions: questions.slice(offset, offset + pageSize),
    total,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminRequest(request);
    const mode = text(request.nextUrl.searchParams.get("mode"));
    if (mode === "export") {
      const bank = await getEffectiveMajlisBank();
      return NextResponse.json({ categories: bank.categories, questions: bank.questions, settings: await getMajlisSettings() });
    }
    return NextResponse.json(await listPayload(request), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Majlis admin GET error:", error);
    return NextResponse.json({ error: "تعذر تحميل إدارة مجلس التحدي." }, { status: 403 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminRequest(request);
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const action = text(body.action);
    const now = Date.now();

    if (action === "save_settings") {
      const data = body.settings && typeof body.settings === "object" ? body.settings as Record<string, unknown> : {};
      await adminDb.collection("settings").doc(MAJLIS_SETTINGS_DOC).set({
        categoriesPerGame: Math.max(4, Math.min(8, Math.floor(number(data.categoriesPerGame, 6)))),
        questionSeconds: Math.max(10, Math.min(90, Math.floor(number(data.questionSeconds, 30)))),
        stealSeconds: Math.max(5, Math.min(30, Math.floor(number(data.stealSeconds, 10)))),
        allowSteal: data.allowSteal !== false,
        showExplanations: data.showExplanations !== false,
        easyPoints: Math.max(50, Math.min(1000, Math.floor(number(data.easyPoints, 100)))),
        mediumPoints: Math.max(50, Math.min(1000, Math.floor(number(data.mediumPoints, 200)))),
        hardPoints: Math.max(50, Math.min(1000, Math.floor(number(data.hardPoints, 300)))),
        updatedAt: now,
        updatedBy: admin.uid,
      }, { merge: true });
      return NextResponse.json({ ok: true });
    }

    if (action === "save_category") {
      const raw = body.category && typeof body.category === "object" ? body.category as Record<string, unknown> : {};
      const id = slug(raw.id || raw.title);
      const isCustom = raw.custom === true || id.startsWith("custom-");
      const collection = isCustom ? MAJLIS_CUSTOM_CATEGORY_COLLECTION : MAJLIS_CATEGORY_OVERRIDE_COLLECTION;
      await adminDb.collection(collection).doc(id).set({
        title: text(raw.title) || "فئة جديدة",
        shortTitle: text(raw.shortTitle) || text(raw.title) || "فئة",
        description: text(raw.description),
        icon: text(raw.icon) || "🧠",
        accent: text(raw.accent) || "#d6b16b",
        imageUrl: text(raw.imageUrl),
        imageSourceName: text(raw.imageSourceName),
        imageSourceUrl: text(raw.imageSourceUrl),
        imageLicense: text(raw.imageLicense),
        sortOrder: Math.floor(number(raw.sortOrder, 500)),
        enabled: raw.enabled !== false,
        updatedAt: now,
        updatedBy: admin.uid,
      }, { merge: true });
      return NextResponse.json({ ok: true, id, custom: isCustom });
    }

    if (action === "restore_category") {
      const id = text(body.id);
      await adminDb.collection(MAJLIS_CATEGORY_OVERRIDE_COLLECTION).doc(id).delete();
      return NextResponse.json({ ok: true });
    }

    if (action === "delete_custom_category") {
      const id = text(body.id);
      if (!id) return NextResponse.json({ error: "معرّف الفئة مطلوب." }, { status: 400 });
      await adminDb.collection(MAJLIS_CUSTOM_CATEGORY_COLLECTION).doc(id).delete();
      return NextResponse.json({ ok: true });
    }

    if (action === "save_question") {
      const raw = body.question && typeof body.question === "object" ? body.question as Record<string, unknown> : {};
      const id = text(raw.id) || `custom-${randomUUID()}`;
      const isCustom = raw.custom === true || id.startsWith("custom-");
      const collection = isCustom ? MAJLIS_CUSTOM_QUESTION_COLLECTION : MAJLIS_QUESTION_OVERRIDE_COLLECTION;
      const diff = difficulty(raw.difficulty);
      const questionType = type(raw.type);
      const prompt = text(raw.prompt);
      const answer = text(raw.answer);
      const categoryId = text(raw.categoryId);
      if (!prompt || !answer || !categoryId) {
        return NextResponse.json({ error: "الفئة والسؤال والإجابة حقول مطلوبة." }, { status: 400 });
      }
      const optionList = options(raw.options);
      if ((questionType === "multiple_choice" || questionType === "audio" || questionType === "speech") && optionList.length > 0 && !optionList.includes(answer)) {
        optionList.unshift(answer);
      }
      await adminDb.collection(collection).doc(id).set({
        categoryId,
        groupKey: text(raw.groupKey) || id,
        questionFamily: text(raw.questionFamily) || text(raw.family) || `${categoryId}-general`,
        family: text(raw.questionFamily) || text(raw.family) || `${categoryId}-general`,
        prompt,
        answer,
        options: optionList.slice(0, 6),
        difficulty: diff,
        points: Math.max(50, Math.min(1000, Math.floor(number(raw.points, diff === "hard" ? 300 : diff === "medium" ? 200 : 100)))),
        hint: text(raw.hint),
        explanation: text(raw.explanation),
        sourceLabel: text(raw.sourceLabel),
        sourceName: text(raw.sourceName),
        sourceUrl: text(raw.sourceUrl),
        license: text(raw.license),
        type: questionType,
        quoteText: text(raw.quoteText),
        imageUrl: text(raw.imageUrl),
        imageAlt: text(raw.imageAlt),
        imageSourceName: text(raw.imageSourceName),
        imageSourceUrl: text(raw.imageSourceUrl),
        imageLicense: text(raw.imageLicense),
        speechText: text(raw.speechText),
        speechLang: text(raw.speechLang),
        audioUrl: text(raw.audioUrl),
        audioFallbackUrl: text(raw.audioFallbackUrl),
        audioStartSeconds: Math.max(0, Math.min(3600, number(raw.audioStartSeconds, 0))),
        audioMaxSeconds: Math.max(4, Math.min(20, Math.floor(number(raw.audioMaxSeconds, 15)))),
        audioMinSeconds: Math.max(0, Math.min(20, number(raw.audioMinSeconds, 0))),
        audioDuration: Math.max(0, number(raw.audioDuration, 0)),
        audioSourceKey: text(raw.audioSourceKey),
        reciterName: text(raw.reciterName),
        speakerCountry: text(raw.speakerCountry),
        dialect: text(raw.dialect),
        speechLanguage: text(raw.speechLanguage),
        quranSurah: text(raw.quranSurah),
        quranAyah: raw.quranAyah == null ? null : Math.max(1, Math.floor(number(raw.quranAyah, 1))),
        quranText: text(raw.quranText),
        quranPage: raw.quranPage == null ? null : Math.max(1, Math.floor(number(raw.quranPage, 1))),
        quranImageUrl: text(raw.quranImageUrl),
        enabled: raw.enabled !== false,
        updatedAt: now,
        updatedBy: admin.uid,
      }, { merge: true });
      return NextResponse.json({ ok: true, id, custom: isCustom });
    }

    if (action === "restore_question") {
      const id = text(body.id);
      await adminDb.collection(MAJLIS_QUESTION_OVERRIDE_COLLECTION).doc(id).delete();
      return NextResponse.json({ ok: true });
    }

    if (action === "delete_custom_question") {
      const id = text(body.id);
      await adminDb.collection(MAJLIS_CUSTOM_QUESTION_COLLECTION).doc(id).delete();
      return NextResponse.json({ ok: true });
    }

    if (action === "ai_review_question") {
      if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "OPENAI_API_KEY غير مهيأ للمراجع الذكي." }, { status: 503 });
      const raw = body.question && typeof body.question === "object" ? body.question as Record<string, unknown> : {};
      const bank = await getEffectiveMajlisBank();
      const prompt = text(raw.prompt);
      const answer = text(raw.answer);
      const categoryId = text(raw.categoryId);
      if (!prompt || !answer || !categoryId) return NextResponse.json({ error: "الفئة والسؤال والإجابة مطلوبة للمراجعة الذكية." }, { status: 400 });
      const nearby = bank.questions
        .filter((item) => item.categoryId === categoryId)
        .slice(0, 250)
        .map((item) => ({ id: item.id, groupKey: item.groupKey, questionFamily: item.questionFamily, prompt: item.prompt, answer: item.answer }));
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MAJLIS_MODEL || "gpt-5-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "أنت مراجع محتوى لمسابقات عربية. لا تخترع مصدرًا. راجع الوضوح، الغموض، احتمال الخطأ، صعوبة المعلومة، questionFamily، groupKey، والتشابه الدلالي. أعد JSON فقط بالمفاتيح: verdict(pass|warn|reject), confidence(0-100), clarityIssues[], factualRisk[], suggestedQuestionFamily, suggestedGroupKey, duplicateCandidates[], suggestedPrompt, notes[]. إذا تعذر التحقق الخارجي قل ذلك صراحة في factualRisk." },
          { role: "user", content: JSON.stringify({ question: { categoryId, prompt, answer, questionFamily: text(raw.questionFamily) || text(raw.family), groupKey: text(raw.groupKey), sourceName: text(raw.sourceName), sourceUrl: text(raw.sourceUrl) }, nearby }) },
        ],
      });
      const content = response.choices[0]?.message?.content || "{}";
      let review: unknown = {};
      try { review = JSON.parse(content); } catch { review = { verdict: "warn", notes: [content] }; }
      return NextResponse.json({ ok: true, review, model: process.env.OPENAI_MAJLIS_MODEL || "gpt-5-mini" });
    }

    if (action === "bulk_import") {
      const rows = Array.isArray(body.questions) ? body.questions.slice(0, 500) : [];
      if (!rows.length) return NextResponse.json({ error: "لا توجد أسئلة للاستيراد." }, { status: 400 });
      const batch = adminDb.batch();
      let imported = 0;
      rows.forEach((row, index) => {
        if (!row || typeof row !== "object") return;
        const raw = row as Record<string, unknown>;
        const prompt = text(raw.prompt);
        const answer = text(raw.answer);
        const categoryId = text(raw.categoryId);
        if (!prompt || !answer || !categoryId) return;
        const id = text(raw.id) || `custom-${randomUUID()}`;
        const diff = difficulty(raw.difficulty);
        batch.set(adminDb.collection(MAJLIS_CUSTOM_QUESTION_COLLECTION).doc(id), {
          categoryId,
          groupKey: text(raw.groupKey) || id,
          questionFamily: text(raw.questionFamily) || text(raw.family) || `${categoryId}-general`,
          family: text(raw.questionFamily) || text(raw.family) || `${categoryId}-general`,
          prompt,
          answer,
          options: options(raw.options),
          difficulty: diff,
          points: Math.max(50, Math.min(1000, Math.floor(number(raw.points, diff === "hard" ? 300 : diff === "medium" ? 200 : 100)))),
          hint: text(raw.hint), explanation: text(raw.explanation), sourceLabel: text(raw.sourceLabel), sourceName: text(raw.sourceName), sourceUrl: text(raw.sourceUrl), license: text(raw.license),
          type: type(raw.type), quoteText: text(raw.quoteText), imageUrl: text(raw.imageUrl), imageAlt: text(raw.imageAlt), imageSourceName: text(raw.imageSourceName), imageSourceUrl: text(raw.imageSourceUrl), imageLicense: text(raw.imageLicense), speechText: text(raw.speechText), speechLang: text(raw.speechLang),
          audioUrl: text(raw.audioUrl), audioFallbackUrl: text(raw.audioFallbackUrl), audioStartSeconds: Math.max(0, Math.min(3600, number(raw.audioStartSeconds, 0))),
          audioMaxSeconds: Math.max(4, Math.min(20, Math.floor(number(raw.audioMaxSeconds, 15)))), audioMinSeconds: Math.max(0, Math.min(20, number(raw.audioMinSeconds, 0))), audioSourceKey: text(raw.audioSourceKey), reciterName: text(raw.reciterName), speakerCountry: text(raw.speakerCountry), dialect: text(raw.dialect), speechLanguage: text(raw.speechLanguage),
          quranSurah: text(raw.quranSurah), quranAyah: raw.quranAyah == null ? null : Math.max(1, Math.floor(number(raw.quranAyah, 1))), quranText: text(raw.quranText), quranPage: raw.quranPage == null ? null : Math.max(1, Math.floor(number(raw.quranPage, 1))), quranImageUrl: text(raw.quranImageUrl),
          enabled: raw.enabled !== false, updatedAt: now, updatedBy: admin.uid,
        }, { merge: true });
        imported += 1;
      });
      await batch.commit();
      return NextResponse.json({ ok: true, imported });
    }

    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  } catch (error) {
    console.error("Majlis admin POST error:", error);
    return NextResponse.json({ error: "تعذر حفظ التعديلات في مجلس التحدي." }, { status: 403 });
  }
}
