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

if (!Array.isArray(bank.categories) || bank.categories.length < 6) errors.push("يجب أن يحتوي البنك على 6 فئات على الأقل.");
if (!Array.isArray(bank.questions)) errors.push("questions ليست مصفوفة.");

for (const question of bank.questions || []) {
  if (!question.id || ids.has(question.id)) errors.push(`معرّف سؤال مفقود/مكرر: ${question.id || "(فارغ)"}`);
  ids.add(question.id);
  if (!categoryIds.has(question.categoryId)) errors.push(`${question.id}: فئة غير معروفة ${question.categoryId}`);
  if (!String(question.prompt || "").trim()) errors.push(`${question.id}: نص السؤال فارغ`);
  if (!String(question.answer || "").trim()) errors.push(`${question.id}: الإجابة فارغة`);
  if (!question.groupKey) errors.push(`${question.id}: groupKey مفقود`);
  if (!String(question.sourceLabel || "").trim()) errors.push(`${question.id}: المصدر مفقود`);
  if (!['medium','hard'].includes(question.difficulty)) errors.push(`${question.id}: البنك الأساسي يجب أن يكون متوسطًا أو صعبًا فقط (${question.difficulty})`);
  if (!["text", "multiple_choice", "audio"].includes(question.type)) errors.push(`${question.id}: نوع غير صالح`);
  const groupKey = `${question.categoryId}:${question.groupKey}`;
  const priorAnswer = groupAnswers.get(groupKey);
  if (priorAnswer && priorAnswer !== question.answer) errors.push(`${question.id}: مجموعة المعلومة ${question.groupKey} لها إجابات متعارضة`);
  groupAnswers.set(groupKey, question.answer);
  const pair = `${question.categoryId}|${String(question.prompt).trim()}|${String(question.answer).trim()}`;
  if (question.type !== "audio" && promptAnswerPairs.has(pair)) warnings.push(`${question.id}: صياغة سؤال وإجابة مكررة حرفيًا`);
  promptAnswerPairs.add(pair);

  if (question.type === "audio") {
    const url = String(question.audioUrl || "");
    if (!url.startsWith("https://")) errors.push(`${question.id}: رابط الصوت يجب أن يكون HTTPS`);
    if (!(url.includes("cdn.islamic.network") || /server\d+\.mp3quran\.net/.test(url))) errors.push(`${question.id}: مصدر الصوت غير معتمد في بنك مجلس التحدي`);
    if (!Array.isArray(question.options) || question.options.length < 3) errors.push(`${question.id}: السؤال الصوتي يحتاج 3 خيارات على الأقل`);
    if (Array.isArray(question.options) && !question.options.includes(question.answer)) errors.push(`${question.id}: الإجابة غير موجودة ضمن خيارات السؤال الصوتي`);
    if (!String(question.reciterName || "").trim()) errors.push(`${question.id}: اسم القارئ الإداري مفقود`);
  }
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
  console.log(`${category.id.padEnd(10)} ${String(questions.length).padStart(4)} questions | ${String(groups.size).padStart(3)} fact groups | med ${medium} / hard ${hard}${audio ? ` | audio ${audio}` : ""}`);
  if (questions.length < 100) errors.push(`${category.title}: أقل من 100 سؤال نشط (${questions.length})`);
  if (groups.size < (category.id === "reciter" ? 15 : 20)) errors.push(`${category.title}: تنوع المعلومات غير كافٍ (${groups.size} مجموعات)`);
  if (hardGroups.size < 2) errors.push(`${category.title}: لا توجد أسئلة صعبة متنوعة كافية لملء الجولة`);
  if (groups.size < 40 && category.id !== "reciter") warnings.push(`${category.title}: البنك يحتوي ${groups.size} معلومة أساسية مع صياغات متعددة؛ يوصى بتوسيعه لاحقًا إلى 100 معلومة فريدة.`);
}

const reciter = (bank.questions || []).filter((item) => item.categoryId === "reciter" && item.enabled !== false);
const reciters = new Set(reciter.map((item) => item.reciterName || item.answer).filter(Boolean));
console.log(`Reciter clips: ${reciter.length} | reciters: ${reciters.size}`);
for (const required of ["أحمد طالب بن حميد", "أحمد الحذيفي", "علي الحذيفي"]) {
  if (!reciters.has(required)) errors.push(`فئة مَن القارئ؟ تفتقد القارئ المطلوب: ${required}`);
}
if (reciter.length < 100) errors.push(`فئة مَن القارئ؟ أقل من 100 مقطع (${reciter.length})`);
if (reciters.size < 15) errors.push(`فئة مَن القارئ؟ تحتاج 15 قارئًا على الأقل (${reciters.size})`);

if (warnings.length) {
  console.warn("\nWarnings:");
  for (const warning of [...new Set(warnings)].slice(0, 30)) console.warn(`- ${warning}`);
}
if (errors.length) {
  console.error("\nFAILED:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("\nMajlis bank audit: PASS");
