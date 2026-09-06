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
  return value === "speech" ? "speech" : value === "audio" ? "audio" : value === "image" ? "image" : value === "multiple_choice" ? "multiple_choice" : "text";
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
    imageUrl: text(item.imageUrl) || undefined,
    imageSourceName: text(item.imageSourceName) || undefined,
    imageSourceUrl: text(item.imageSourceUrl) || undefined,
    imageLicense: text(item.imageLicense) || undefined,
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
    questionFamily: text(item.questionFamily, text(item.family, `${text(item.categoryId, "general")}-general`)),
    family: text(item.family, text(item.questionFamily)) || undefined,
    prompt: cleanPrompt(item.prompt),
    answer: text(item.answer),
    options: cleanOptions(item.options),
    difficulty: difficulty(item.difficulty),
    points: Math.max(0, Math.floor(number(item.points, 100))),
    hint: text(item.hint),
    explanation: text(item.explanation),
    sourceLabel: text(item.sourceLabel),
    sourceName: text(item.sourceName) || undefined,
    sourceUrl: text(item.sourceUrl) || undefined,
    license: text(item.license) || undefined,
    type: questionType(item.type),
    quoteText: text(item.quoteText) || undefined,
    imageUrl: text(item.imageUrl) || undefined,
    imageAlt: text(item.imageAlt) || undefined,
    imageSourceName: text(item.imageSourceName) || undefined,
    imageSourceUrl: text(item.imageSourceUrl) || undefined,
    imageLicense: text(item.imageLicense) || undefined,
    speechText: text(item.speechText) || undefined,
    speechLang: text(item.speechLang) || undefined,
    audioUrl: text(item.audioUrl) || undefined,
    audioFallbackUrl: text(item.audioFallbackUrl) || undefined,
    audioStartSeconds: item.audioStartSeconds == null ? undefined : Math.max(0, Math.min(3600, number(item.audioStartSeconds, 0))),
    audioMaxSeconds: item.audioMaxSeconds == null ? undefined : Math.max(4, Math.min(20, Math.floor(number(item.audioMaxSeconds, 12)))),
    audioMinSeconds: item.audioMinSeconds == null ? undefined : Math.max(0, Math.min(20, number(item.audioMinSeconds, 0))),
    audioSourceKey: text(item.audioSourceKey) || undefined,
    audioDuration: item.audioDuration == null ? undefined : Math.max(0, number(item.audioDuration, 0)),
    reciterName: text(item.reciterName) || undefined,
    speakerCountry: text(item.speakerCountry) || undefined,
    dialect: text(item.dialect) || undefined,
    speechLanguage: text(item.speechLanguage) || undefined,
    quranSurah: text(item.quranSurah) || undefined,
    quranAyah: item.quranAyah == null ? undefined : Math.max(1, Math.floor(number(item.quranAyah, 1))),
    quranText: text(item.quranText) || undefined,
    quranPage: item.quranPage == null ? undefined : Math.max(1, Math.floor(number(item.quranPage, 1))),
    quranImageUrl: text(item.quranImageUrl) || undefined,
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
    imageUrl: override.imageUrl == null ? base.imageUrl : (text(override.imageUrl) || undefined),
    imageSourceName: override.imageSourceName == null ? base.imageSourceName : (text(override.imageSourceName) || undefined),
    imageSourceUrl: override.imageSourceUrl == null ? base.imageSourceUrl : (text(override.imageSourceUrl) || undefined),
    imageLicense: override.imageLicense == null ? base.imageLicense : (text(override.imageLicense) || undefined),
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
    imageUrl: text(data.imageUrl) || undefined,
    imageSourceName: text(data.imageSourceName) || undefined,
    imageSourceUrl: text(data.imageSourceUrl) || undefined,
    imageLicense: text(data.imageLicense) || undefined,
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
    questionFamily: override.questionFamily == null && override.family == null ? base.questionFamily : text(override.questionFamily, text(override.family, base.questionFamily)),
    family: override.family == null && override.questionFamily == null ? base.family : (text(override.family, text(override.questionFamily)) || undefined),
    prompt: override.prompt == null ? base.prompt : cleanPrompt(override.prompt),
    answer: text(override.answer, base.answer),
    options: override.options == null ? base.options : cleanOptions(override.options),
    difficulty: override.difficulty == null ? base.difficulty : difficulty(override.difficulty),
    points: override.points == null ? base.points : Math.max(0, Math.floor(number(override.points, base.points))),
    hint: override.hint == null ? base.hint : text(override.hint),
    explanation: override.explanation == null ? base.explanation : text(override.explanation),
    sourceLabel: override.sourceLabel == null ? base.sourceLabel : text(override.sourceLabel),
    sourceName: override.sourceName == null ? base.sourceName : (text(override.sourceName) || undefined),
    sourceUrl: override.sourceUrl == null ? base.sourceUrl : (text(override.sourceUrl) || undefined),
    license: override.license == null ? base.license : (text(override.license) || undefined),
    type: override.type == null ? base.type : questionType(override.type),
    quoteText: override.quoteText == null ? base.quoteText : (text(override.quoteText) || undefined),
    imageUrl: override.imageUrl == null ? base.imageUrl : (text(override.imageUrl) || undefined),
    imageAlt: override.imageAlt == null ? base.imageAlt : (text(override.imageAlt) || undefined),
    imageSourceName: override.imageSourceName == null ? base.imageSourceName : (text(override.imageSourceName) || undefined),
    imageSourceUrl: override.imageSourceUrl == null ? base.imageSourceUrl : (text(override.imageSourceUrl) || undefined),
    imageLicense: override.imageLicense == null ? base.imageLicense : (text(override.imageLicense) || undefined),
    speechText: override.speechText == null ? base.speechText : (text(override.speechText) || undefined),
    speechLang: override.speechLang == null ? base.speechLang : (text(override.speechLang) || undefined),
    audioUrl: override.audioUrl == null ? base.audioUrl : (text(override.audioUrl) || undefined),
    audioFallbackUrl: override.audioFallbackUrl == null ? base.audioFallbackUrl : (text(override.audioFallbackUrl) || undefined),
    audioStartSeconds: override.audioStartSeconds == null ? base.audioStartSeconds : Math.max(0, Math.min(3600, number(override.audioStartSeconds, 0))),
    audioMaxSeconds: override.audioMaxSeconds == null ? base.audioMaxSeconds : Math.max(4, Math.min(20, Math.floor(number(override.audioMaxSeconds, 12)))),
    audioMinSeconds: override.audioMinSeconds == null ? base.audioMinSeconds : Math.max(0, Math.min(20, number(override.audioMinSeconds, 0))),
    audioSourceKey: override.audioSourceKey == null ? base.audioSourceKey : (text(override.audioSourceKey) || undefined),
    audioDuration: override.audioDuration == null ? base.audioDuration : Math.max(0, number(override.audioDuration, 0)),
    reciterName: override.reciterName == null ? base.reciterName : (text(override.reciterName) || undefined),
    speakerCountry: override.speakerCountry == null ? base.speakerCountry : (text(override.speakerCountry) || undefined),
    dialect: override.dialect == null ? base.dialect : (text(override.dialect) || undefined),
    speechLanguage: override.speechLanguage == null ? base.speechLanguage : (text(override.speechLanguage) || undefined),
    quranSurah: override.quranSurah == null ? base.quranSurah : (text(override.quranSurah) || undefined),
    quranAyah: override.quranAyah == null ? base.quranAyah : Math.max(1, Math.floor(number(override.quranAyah, 1))),
    quranText: override.quranText == null ? base.quranText : (text(override.quranText) || undefined),
    quranPage: override.quranPage == null ? base.quranPage : Math.max(1, Math.floor(number(override.quranPage, 1))),
    quranImageUrl: override.quranImageUrl == null ? base.quranImageUrl : (text(override.quranImageUrl) || undefined),
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
    questionFamily: text(data.questionFamily, text(data.family, `${text(data.categoryId, "general")}-general`)),
    family: text(data.family, text(data.questionFamily)) || undefined,
    prompt: cleanPrompt(data.prompt),
    answer: text(data.answer),
    options: cleanOptions(data.options),
    difficulty: diff,
    points: Math.max(0, Math.floor(number(data.points, diff === "hard" ? 300 : diff === "medium" ? 200 : 100))),
    hint: text(data.hint),
    explanation: text(data.explanation),
    sourceLabel: text(data.sourceLabel),
    sourceName: text(data.sourceName) || undefined,
    sourceUrl: text(data.sourceUrl) || undefined,
    license: text(data.license) || undefined,
    type: questionType(data.type),
    quoteText: text(data.quoteText) || undefined,
    imageUrl: text(data.imageUrl) || undefined,
    imageAlt: text(data.imageAlt) || undefined,
    imageSourceName: text(data.imageSourceName) || undefined,
    imageSourceUrl: text(data.imageSourceUrl) || undefined,
    imageLicense: text(data.imageLicense) || undefined,
    speechText: text(data.speechText) || undefined,
    speechLang: text(data.speechLang) || undefined,
    audioUrl: text(data.audioUrl) || undefined,
    audioFallbackUrl: text(data.audioFallbackUrl) || undefined,
    audioStartSeconds: data.audioStartSeconds == null ? undefined : Math.max(0, Math.min(3600, number(data.audioStartSeconds, 0))),
    audioMaxSeconds: data.audioMaxSeconds == null ? undefined : Math.max(4, Math.min(20, Math.floor(number(data.audioMaxSeconds, 12)))),
    audioMinSeconds: data.audioMinSeconds == null ? undefined : Math.max(0, Math.min(20, number(data.audioMinSeconds, 0))),
    audioSourceKey: text(data.audioSourceKey) || undefined,
    audioDuration: data.audioDuration == null ? undefined : Math.max(0, number(data.audioDuration, 0)),
    reciterName: text(data.reciterName) || undefined,
    speakerCountry: text(data.speakerCountry) || undefined,
    dialect: text(data.dialect) || undefined,
    speechLanguage: text(data.speechLanguage) || undefined,
    quranSurah: text(data.quranSurah) || undefined,
    quranAyah: data.quranAyah == null ? undefined : Math.max(1, Math.floor(number(data.quranAyah, 1))),
    quranText: text(data.quranText) || undefined,
    quranPage: data.quranPage == null ? undefined : Math.max(1, Math.floor(number(data.quranPage, 1))),
    quranImageUrl: text(data.quranImageUrl) || undefined,
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
      uniqueFacts: new Set(active.map((question) => question.groupKey)).size,
      questionFamilies: new Set(active.map((question) => question.questionFamily)).size,
    };
  });
}

export function normalizeMajlisQuestionInput(data: Record<string, unknown>, id: string): MajlisQuestion {
  return mapCustomQuestion(id, data);
}

export function normalizeMajlisCategoryInput(data: Record<string, unknown>, id: string): MajlisCategory {
  return mapCustomCategory(id, data);
}
