import { adminDb } from "@/lib/firebaseAdmin";
import rawBank from "@/data/majlisQuestionBank.json";
import {
  DEFAULT_MAJLIS_SETTINGS,
  type MajlisCategory,
  type MajlisDifficulty,
  type MajlisQuestion,
  type MajlisQuestionType,
  type MajlisSettings,
} from "@/types/majlisGame";

export const MAJLIS_CATEGORY_OVERRIDE_COLLECTION = "majlisCategoryOverrides";
export const MAJLIS_CUSTOM_CATEGORY_COLLECTION = "majlisCustomCategories";
export const MAJLIS_QUESTION_OVERRIDE_COLLECTION = "majlisQuestionOverrides";
export const MAJLIS_CUSTOM_QUESTION_COLLECTION = "majlisCustomQuestions";
export const MAJLIS_SETTINGS_DOC = "majlisGame";

function text(value: unknown, fallback = "") {
  const result = String(value ?? "").trim();
  return result || fallback;
}

function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function difficulty(value: unknown): MajlisDifficulty {
  return value === "hard" ? "hard" : value === "medium" ? "medium" : "easy";
}

function questionType(value: unknown): MajlisQuestionType {
  return value === "speech" ? "speech" : value === "audio" ? "audio" : value === "multiple_choice" ? "multiple_choice" : "text";
}


function cleanPrompt(value: unknown) {
  return text(value)
    .replace(/^(?:سؤال المجلس|اختبر معلوماتك|للنقطة هذه|السؤال)\s*[:：-]?\s*/i, "")
    .trim();
}

function cleanOptions(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const options = value.map((item) => text(item)).filter(Boolean).slice(0, 6);
  return options.length ? options : undefined;
}

function baseCategories(): MajlisCategory[] {
  return (rawBank.categories as Array<Record<string, unknown>>).map((item) => ({
    id: text(item.id),
    title: text(item.title),
    shortTitle: text(item.shortTitle, text(item.title)),
    description: text(item.description),
    icon: text(item.icon, "🧠"),
    accent: text(item.accent, "#d6b16b"),
    sortOrder: number(item.sortOrder, 999),
    enabled: item.enabled !== false,
    custom: false,
    overridden: false,
  }));
}

function baseQuestions(): MajlisQuestion[] {
  return (rawBank.questions as Array<Record<string, unknown>>).map((item) => ({
    id: text(item.id),
    categoryId: text(item.categoryId),
    groupKey: text(item.groupKey, text(item.id)),
    family: text(item.family) || undefined,
    prompt: cleanPrompt(item.prompt),
    answer: text(item.answer),
    options: cleanOptions(item.options),
    difficulty: difficulty(item.difficulty),
    points: Math.max(0, Math.floor(number(item.points, 100))),
    hint: text(item.hint),
    explanation: text(item.explanation),
    sourceLabel: text(item.sourceLabel),
    type: questionType(item.type),
    quoteText: text(item.quoteText) || undefined,
    speechText: text(item.speechText) || undefined,
    speechLang: text(item.speechLang) || undefined,
    audioUrl: text(item.audioUrl) || undefined,
    audioFallbackUrl: text(item.audioFallbackUrl) || undefined,
    audioStartSeconds: item.audioStartSeconds == null ? undefined : Math.max(0, Math.min(3600, number(item.audioStartSeconds, 0))),
    audioMaxSeconds: item.audioMaxSeconds == null ? undefined : Math.max(4, Math.min(20, Math.floor(number(item.audioMaxSeconds, 12)))),
    audioSourceKey: text(item.audioSourceKey) || undefined,
    reciterName: text(item.reciterName) || undefined,
    enabled: item.enabled !== false,
    custom: false,
    overridden: false,
  }));
}

function mergeCategory(base: MajlisCategory, override: Record<string, unknown> | undefined): MajlisCategory {
  if (!override) return base;
  return {
    ...base,
    title: text(override.title, base.title),
    shortTitle: text(override.shortTitle, base.shortTitle),
    description: text(override.description, base.description),
    icon: text(override.icon, base.icon),
    accent: text(override.accent, base.accent),
    sortOrder: number(override.sortOrder, base.sortOrder),
    enabled: bool(override.enabled, base.enabled),
    overridden: true,
  };
}

function mapCustomCategory(id: string, data: Record<string, unknown>): MajlisCategory {
  return {
    id,
    title: text(data.title, "فئة جديدة"),
    shortTitle: text(data.shortTitle, text(data.title, "فئة")),
    description: text(data.description),
    icon: text(data.icon, "🧠"),
    accent: text(data.accent, "#d6b16b"),
    sortOrder: number(data.sortOrder, 500),
    enabled: bool(data.enabled, true),
    custom: true,
    overridden: false,
  };
}

function mergeQuestion(base: MajlisQuestion, override: Record<string, unknown> | undefined): MajlisQuestion {
  if (!override) return base;
  return {
    ...base,
    categoryId: text(override.categoryId, base.categoryId),
    groupKey: text(override.groupKey, base.groupKey),
    family: override.family == null ? base.family : (text(override.family) || undefined),
    prompt: override.prompt == null ? base.prompt : cleanPrompt(override.prompt),
    answer: text(override.answer, base.answer),
    options: override.options == null ? base.options : cleanOptions(override.options),
    difficulty: override.difficulty == null ? base.difficulty : difficulty(override.difficulty),
    points: override.points == null ? base.points : Math.max(0, Math.floor(number(override.points, base.points))),
    hint: override.hint == null ? base.hint : text(override.hint),
    explanation: override.explanation == null ? base.explanation : text(override.explanation),
    sourceLabel: override.sourceLabel == null ? base.sourceLabel : text(override.sourceLabel),
    type: override.type == null ? base.type : questionType(override.type),
    quoteText: override.quoteText == null ? base.quoteText : (text(override.quoteText) || undefined),
    speechText: override.speechText == null ? base.speechText : (text(override.speechText) || undefined),
    speechLang: override.speechLang == null ? base.speechLang : (text(override.speechLang) || undefined),
    audioUrl: override.audioUrl == null ? base.audioUrl : (text(override.audioUrl) || undefined),
    audioFallbackUrl: override.audioFallbackUrl == null ? base.audioFallbackUrl : (text(override.audioFallbackUrl) || undefined),
    audioStartSeconds: override.audioStartSeconds == null ? base.audioStartSeconds : Math.max(0, Math.min(3600, number(override.audioStartSeconds, 0))),
    audioMaxSeconds: override.audioMaxSeconds == null ? base.audioMaxSeconds : Math.max(4, Math.min(20, Math.floor(number(override.audioMaxSeconds, 12)))),
    audioSourceKey: override.audioSourceKey == null ? base.audioSourceKey : (text(override.audioSourceKey) || undefined),
    reciterName: override.reciterName == null ? base.reciterName : (text(override.reciterName) || undefined),
    enabled: bool(override.enabled, base.enabled),
    overridden: true,
  };
}

function mapCustomQuestion(id: string, data: Record<string, unknown>): MajlisQuestion {
  const diff = difficulty(data.difficulty);
  return {
    id,
    categoryId: text(data.categoryId),
    groupKey: text(data.groupKey, id),
    family: text(data.family) || undefined,
    prompt: cleanPrompt(data.prompt),
    answer: text(data.answer),
    options: cleanOptions(data.options),
    difficulty: diff,
    points: Math.max(0, Math.floor(number(data.points, diff === "hard" ? 300 : diff === "medium" ? 200 : 100))),
    hint: text(data.hint),
    explanation: text(data.explanation),
    sourceLabel: text(data.sourceLabel),
    type: questionType(data.type),
    quoteText: text(data.quoteText) || undefined,
    speechText: text(data.speechText) || undefined,
    speechLang: text(data.speechLang) || undefined,
    audioUrl: text(data.audioUrl) || undefined,
    audioFallbackUrl: text(data.audioFallbackUrl) || undefined,
    audioStartSeconds: data.audioStartSeconds == null ? undefined : Math.max(0, Math.min(3600, number(data.audioStartSeconds, 0))),
    audioMaxSeconds: data.audioMaxSeconds == null ? undefined : Math.max(4, Math.min(20, Math.floor(number(data.audioMaxSeconds, 12)))),
    audioSourceKey: text(data.audioSourceKey) || undefined,
    reciterName: text(data.reciterName) || undefined,
    enabled: bool(data.enabled, true),
    custom: true,
    overridden: false,
  };
}

export async function getMajlisSettings(): Promise<MajlisSettings> {
  const snap = await adminDb.collection("settings").doc(MAJLIS_SETTINGS_DOC).get();
  const data = snap.data() || {};
  return {
    categoriesPerGame: Math.max(4, Math.min(8, Math.floor(number(data.categoriesPerGame, DEFAULT_MAJLIS_SETTINGS.categoriesPerGame)))),
    questionSeconds: Math.max(10, Math.min(90, Math.floor(number(data.questionSeconds, DEFAULT_MAJLIS_SETTINGS.questionSeconds)))),
    stealSeconds: Math.max(5, Math.min(30, Math.floor(number(data.stealSeconds, DEFAULT_MAJLIS_SETTINGS.stealSeconds)))),
    allowSteal: bool(data.allowSteal, DEFAULT_MAJLIS_SETTINGS.allowSteal),
    showExplanations: bool(data.showExplanations, DEFAULT_MAJLIS_SETTINGS.showExplanations),
    easyPoints: Math.max(50, Math.min(1000, Math.floor(number(data.easyPoints, DEFAULT_MAJLIS_SETTINGS.easyPoints)))),
    mediumPoints: Math.max(50, Math.min(1000, Math.floor(number(data.mediumPoints, DEFAULT_MAJLIS_SETTINGS.mediumPoints)))),
    hardPoints: Math.max(50, Math.min(1000, Math.floor(number(data.hardPoints, DEFAULT_MAJLIS_SETTINGS.hardPoints)))),
  };
}

export async function getEffectiveMajlisBank() {
  const [categoryOverridesSnap, customCategoriesSnap, questionOverridesSnap, customQuestionsSnap] = await Promise.all([
    adminDb.collection(MAJLIS_CATEGORY_OVERRIDE_COLLECTION).get(),
    adminDb.collection(MAJLIS_CUSTOM_CATEGORY_COLLECTION).get(),
    adminDb.collection(MAJLIS_QUESTION_OVERRIDE_COLLECTION).get(),
    adminDb.collection(MAJLIS_CUSTOM_QUESTION_COLLECTION).get(),
  ]);

  const categoryOverrides = new Map<string, Record<string, unknown>>(categoryOverridesSnap.docs.map((doc) => [doc.id, doc.data() as Record<string, unknown>]));
  const questionOverrides = new Map<string, Record<string, unknown>>(questionOverridesSnap.docs.map((doc) => [doc.id, doc.data() as Record<string, unknown>]));

  const categories = [
    ...baseCategories().map((item) => mergeCategory(item, categoryOverrides.get(item.id))),
    ...customCategoriesSnap.docs.map((doc) => mapCustomCategory(doc.id, doc.data())),
  ].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "ar"));

  const questions = [
    ...baseQuestions().map((item) => mergeQuestion(item, questionOverrides.get(item.id))),
    ...customQuestionsSnap.docs.map((doc) => mapCustomQuestion(doc.id, doc.data())),
  ];

  return { categories, questions };
}

export function majlisBankSummary(categories: MajlisCategory[], questions: MajlisQuestion[]) {
  return categories.map((category) => {
    const items = questions.filter((question) => question.categoryId === category.id);
    const active = items.filter((question) => question.enabled);
    return {
      ...category,
      totalQuestions: items.length,
      activeQuestions: active.length,
      easy: active.filter((question) => question.difficulty === "easy").length,
      medium: active.filter((question) => question.difficulty === "medium").length,
      hard: active.filter((question) => question.difficulty === "hard").length,
      audio: active.filter((question) => question.type === "audio" || question.type === "speech").length,
    };
  });
}

export function normalizeMajlisQuestionInput(data: Record<string, unknown>, id: string): MajlisQuestion {
  return mapCustomQuestion(id, data);
}

export function normalizeMajlisCategoryInput(data: Record<string, unknown>, id: string): MajlisCategory {
  return mapCustomCategory(id, data);
}
