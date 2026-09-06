import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const bankPath = path.join(root, "src", "data", "majlisQuestionBank.json");
const bank = JSON.parse(fs.readFileSync(bankPath, "utf8"));
const errors = [];
const warnings = [];
const ids = new Set();
const categoryIds = new Set((bank.categories || []).map((item) => item.id));
const groupAnswers = new Map();
const promptAnswerPairs = new Set();
const bannedPrefixes = /^(?:سؤال المجلس|اختبر معلوماتك|للنقطة هذه|السؤال)\s*[:：-]?\s*/i;
const allowedTypes = new Set(["text", "multiple_choice", "audio", "speech"]);

if (!Array.isArray(bank.categories) || bank.categories.length < 10) errors.push("يجب أن يحتوي البنك على 10 فئات على الأقل.");
if (!Array.isArray(bank.questions)) errors.push("questions ليست مصفوفة.");

for (const question of bank.questions || []) {
  if (!question.id || ids.has(question.id)) errors.push(`معرّف سؤال مفقود/مكرر: ${question.id || "(فارغ)"}`);
  ids.add(question.id);
  if (!categoryIds.has(question.categoryId)) errors.push(`${question.id}: فئة غير معروفة ${question.categoryId}`);
  const prompt = String(question.prompt || "").trim();
  if (!prompt) errors.push(`${question.id}: نص السؤال فارغ`);
  if (bannedPrefixes.test(prompt)) errors.push(`${question.id}: يبدأ بمقدمة غير مطلوبة: ${prompt}`);
  if (!String(question.answer || "").trim()) errors.push(`${question.id}: الإجابة فارغة`);
  if (!question.groupKey) errors.push(`${question.id}: groupKey مفقود`);
  if (!String(question.sourceLabel || "").trim()) errors.push(`${question.id}: المصدر مفقود`);
  if (!['medium','hard'].includes(question.difficulty)) errors.push(`${question.id}: يجب أن يكون متوسطًا أو صعبًا فقط (${question.difficulty})`);
  if (!allowedTypes.has(question.type)) errors.push(`${question.id}: نوع غير صالح ${question.type}`);

  const groupKey = `${question.categoryId}:${question.groupKey}`;
  const priorAnswer = groupAnswers.get(groupKey);
  if (priorAnswer && priorAnswer !== question.answer) errors.push(`${question.id}: مجموعة المعلومة ${question.groupKey} لها إجابات متعارضة`);
  groupAnswers.set(groupKey, question.answer);

  const pair = `${question.categoryId}|${prompt}|${String(question.answer).trim()}`;
  if (!['audio','speech'].includes(question.type) && promptAnswerPairs.has(pair)) warnings.push(`${question.id}: صياغة سؤال وإجابة مكررة حرفيًا`);
  promptAnswerPairs.add(pair);

  if (question.categoryId === "world" && /(?:ما\s+هي\s+)?عاصمة|العاصمة/i.test(prompt)) {
    errors.push(`${question.id}: فئة حول العالم يجب ألا تحتوي أسئلة عواصم في النسخة الحالية`);
  }

  if (question.type === "audio") {
    const url = String(question.audioUrl || "");
    const isHumanCommons = ["dialects","languages"].includes(question.categoryId);
    if (isHumanCommons) {
      if (!url.startsWith("/api/games/majlis/human-audio?questionId=")) errors.push(`${question.id}: صوت اللهجات/اللغات يجب أن يمر عبر human-audio`);
      if (!String(question.audioSourceKey || "").startsWith("commons:")) errors.push(`${question.id}: audioSourceKey البشري مفقود`);
      if (question.speechText || question.speechLang) errors.push(`${question.id}: لا يسمح باستخدام TTS في اللهجات/اللغات`);
      if (Number(question.audioMaxSeconds || 0) < 4 || Number(question.audioMaxSeconds || 0) > 8) errors.push(`${question.id}: مدة الصوت البشري غير مناسبة`);
    } else {
      if (!url.startsWith("https://")) errors.push(`${question.id}: رابط الصوت يجب أن يكون HTTPS`);
      if (!(url.includes("cdn.islamic.network") || /server\d+\.mp3quran\.net/.test(url))) errors.push(`${question.id}: مصدر صوت القارئ غير معتمد`);
      if (!String(question.reciterName || "").trim()) errors.push(`${question.id}: اسم القارئ الإداري مفقود`);
      if (Number(question.audioMaxSeconds || 0) !== 15) errors.push(`${question.id}: مقطع القارئ يجب أن يكون 15 ثانية`);
    }
    if (!Array.isArray(question.options) || question.options.length < 3) errors.push(`${question.id}: السؤال الصوتي يحتاج 3 خيارات على الأقل لاستخدام وسيلة «عرض اختيارات»`);
    if (Array.isArray(question.options) && !question.options.includes(question.answer)) errors.push(`${question.id}: الإجابة غير موجودة ضمن خيارات السؤال الصوتي`);
    if (Number(question.audioStartSeconds || 0) < 0) errors.push(`${question.id}: بداية المقطع غير صالحة`);
  }

  if (question.type === "speech") {
    if (["dialects","languages"].includes(question.categoryId)) errors.push(`${question.id}: اللهجات واللغات يجب ألا تستخدم speechSynthesis`);
    if (!String(question.speechText || "").trim()) errors.push(`${question.id}: سؤال النطق يفتقد speechText`);
    if (!String(question.speechLang || "").trim()) errors.push(`${question.id}: سؤال النطق يفتقد speechLang`);
    if (!Array.isArray(question.options) || question.options.length < 3) errors.push(`${question.id}: سؤال النطق يحتاج خيارات مخفية للمساعدة`);
    if (Array.isArray(question.options) && !question.options.includes(question.answer)) errors.push(`${question.id}: إجابة سؤال النطق غير موجودة في الخيارات المخفية`);
  }

  if (question.categoryId === "quran" && question.quoteText && !String(question.quoteText).trim()) errors.push(`${question.id}: quoteText فارغ`);
}

console.log(`Majlis bank version: ${bank.version || "unknown"}`);
console.log(`Categories: ${bank.categories?.length || 0}`);
console.log(`Questions: ${bank.questions?.length || 0}`);

for (const category of bank.categories || []) {
  const questions = (bank.questions || []).filter((item) => item.categoryId === category.id && item.enabled !== false);
  const groups = new Set(questions.map((item) => item.groupKey));
  const medium = questions.filter((item) => item.difficulty === "medium").length;
  const hard = questions.filter((item) => item.difficulty === "hard").length;
  const hardGroups = new Set(questions.filter((item) => item.difficulty === "hard").map((item) => item.groupKey));
  const audio = questions.filter((item) => item.type === "audio").length;
  const speech = questions.filter((item) => item.type === "speech").length;
  console.log(`${category.id.padEnd(10)} ${String(questions.length).padStart(4)} questions | ${String(groups.size).padStart(3)} unique groups | med ${medium} / hard ${hard}${audio ? ` | audio ${audio}` : ""}${speech ? ` | speech ${speech}` : ""}`);
  if (questions.length < 100) errors.push(`${category.title}: أقل من 100 سؤال نشط (${questions.length})`);
  if (hardGroups.size < 4 && category.id !== "reciter") errors.push(`${category.title}: لا توجد معلومات صعبة متنوعة كافية لملء الجولة`);
  if (["quran","dialects","languages"].includes(category.id) && groups.size < 100) errors.push(`${category.title}: يجب أن تحتوي 100 معلومة/تحدٍ مستقلاً على الأقل (${groups.size})`);
  if (!["quran","dialects","languages","reciter"].includes(category.id) && groups.size < 25) warnings.push(`${category.title}: فيها ${groups.size} معلومة أساسية فقط مع صياغات متعددة؛ يوصى بتوسيعها لاحقًا.`);
}

const v16New = (bank.questions || []).filter((item) => String(item.id || "").startsWith("v16-") && item.enabled !== false);
const v16Groups = new Set(v16New.map((item) => `${item.categoryId}:${item.groupKey}`));
console.log(`V16 new unique facts: ${v16Groups.size}`);
if (v16Groups.size < 300) errors.push(`إضافات V16 أقل من 300 معلومة فريدة (${v16Groups.size})`);
for (const id of ["quran","dialects","languages"]) {
  const items=(bank.questions||[]).filter((item)=>item.categoryId===id&&item.enabled!==false);
  const families=new Set(items.map((item)=>item.family).filter(Boolean));
  console.log(`${id} families: ${families.size}`);
  if (id==="quran" && families.size < 8) errors.push(`القرآن يحتاج 8 عائلات أسئلة على الأقل (${families.size})`);
}

const reciter = (bank.questions || []).filter((item) => item.categoryId === "reciter" && item.enabled !== false);
const reciters = new Set(reciter.map((item) => item.reciterName || item.answer).filter(Boolean));
const reciterGroups = new Set(reciter.map((item) => item.groupKey));
const reciterUrls = new Set(reciter.map((item) => item.audioUrl).filter(Boolean));
console.log(`Reciter clips: ${reciter.length} | unique clips: ${reciterGroups.size} | unique URLs: ${reciterUrls.size} | reciters: ${reciters.size}`);
for (const required of ["أحمد طالب بن حميد", "أحمد الحذيفي", "علي الحذيفي"]) {
  if (!reciters.has(required)) errors.push(`فئة مَن القارئ؟ تفتقد القارئ المطلوب: ${required}`);
}
if (reciter.length < 100) errors.push(`فئة مَن القارئ؟ أقل من 100 مقطع (${reciter.length})`);
if (reciterGroups.size !== reciter.length) errors.push(`فئة مَن القارئ؟ يجب أن يكون لكل مقطع دورة عدم تكرار مستقلة (${reciterGroups.size}/${reciter.length})`);
if (reciterUrls.size !== reciter.length) errors.push(`فئة مَن القارئ؟ يوجد رابط صوت مكرر (${reciterUrls.size}/${reciter.length})`);
if (reciters.size < 15) errors.push(`فئة مَن القارئ؟ تحتاج 15 قارئًا على الأقل (${reciters.size})`);

if (warnings.length) {
  console.warn("\nWarnings:");
  for (const warning of [...new Set(warnings)].slice(0, 40)) console.warn(`- ${warning}`);
}
if (errors.length) {
  console.error("\nFAILED:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("\nMajlis bank audit: PASS");
