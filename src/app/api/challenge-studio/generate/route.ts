import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { getChallengeStudioBulletins } from "@/lib/challengeStudio";
import {
  buildChallengeStudioEvents,
  type ChallengeStudioEvent,
} from "@/lib/challengeStudio/eventEngine";

export const runtime = "nodejs";

type AiCard = {
  type: "main" | "quote" | "number" | "badge" | "funny" | "watch";
  icon: string;
  title: string;
  content: string;
  priority: number;
};

const AI_MODEL = "gpt-4.1-mini";
const REQUIRED_CARDS_COUNT = 10;

const EXCEPTIONAL_EVENT_TYPES = new Set<ChallengeStudioEvent["type"]>([
  "final_spotlight",
  "semi_final_spotlight",
  "third_place_spotlight",
  "golden_prediction_alert",
  "exact_after_calculation",
  "leader_under_pressure",
  "biggest_climb",
  "top3_spotlight",
  "best_streak",
  "dangerous_prediction",
  "round_star",
  "best_comeback",
  "most_exact_results",
  "flag_memory_champion",
  "word_game_champion",
  "ten_seconds_exact",
  "ten_seconds_points_boost",
]);

const GENERIC_MEMBER_WORDS = [
  "أحد الأعضاء",
  "أحد المشاركين",
  "عضو بارز",
  "عضو لافت",
  "أحد المنافسين",
  "أحد المتسابقين",
  "العضو الذي",
  "العضو المتصدر",
  "عضو يحافظ",
  "عضو يملك",
  "عضو يقف",
  "عضو دخل",
  "عضو صعد",
  "عضو تراجع",
  "صاحب المركز",
  "صاحب الصدارة",
  "صاحب الرقم",
  "صاحب الحركة",
  "صاحب التوقع",
  "المتصدر",
  "الوصيف",
  "المنافس",
  "المطارد",
  "منافسه",
  "مطارده",
  "متسابق",
  "مشارك",
];

const EDITORIAL_SECTIONS = [
  {
    icon: "👑",
    title: "ملك التوقعات",
    goal: "إبراز المتصدر إذا كان الحدث متاحًا.",
  },
  {
    icon: "🐎",
    title: "الحصان الأسود",
    goal: "إبراز عضو صاعد أو مفاجئ من البيانات.",
  },
  { icon: "🚀", title: "أسرع صعود", goal: "إبراز أكبر صعود حقيقي في الترتيب." },
  { icon: "📉", title: "أكبر تراجع", goal: "تناول أكبر تراجع بلغة محترمة." },
  { icon: "🎯", title: "قناص النتائج", goal: "إبراز من أصاب نتائج دقيقة." },
  { icon: "🔥", title: "نجم الجولة", goal: "اختيار صاحب أفضل أثر في الجولة." },
  {
    icon: "⚡",
    title: "أفضل عودة",
    goal: "إبراز من عاد للمنافسة بعد تحسن واضح.",
  },
  { icon: "📈", title: "الأكثر ثباتًا", goal: "إبراز عضو يحافظ على مستواه." },
  { icon: "👀", title: "تحت المجهر", goal: "متابعة عضو أو توقع أو مواجهة." },
  { icon: "🎙️", title: "كلمة الاستوديو", goal: "خاتمة تحريرية قصيرة." },
];

function getTodaySaudiDate() {
  return new Intl.DateTimeFormat("ar-SA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

function getTimeValue(value?: string) {
  const time = new Date(value || "").getTime();
  return Number.isFinite(time) ? time : 0;
}

function normalizeMemberName(value: unknown) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function getText(value: unknown) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function getNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatDurationMs(value: unknown) {
  const durationMs = getNumber(value);

  if (!durationMs) return "وقت غير محدد";

  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, "0")} دقيقة`;
  }

  return `${seconds} ثانية`;
}

function formatSeconds(value: unknown) {
  const totalSeconds = Math.max(0, Math.floor(getNumber(value)));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, "0")} دقيقة`;
  }

  return `${seconds} ثانية`;
}

function getRankText(value: unknown) {
  const rank = getNumber(value);
  return rank > 0 ? `المركز ${rank}` : "مركزه الحالي";
}

function getPointsText(value: unknown) {
  const points = getNumber(value);
  return points > 0 ? `${points} نقطة` : "رصيده الحالي";
}

function getEventMembers(event: ChallengeStudioEvent) {
  const names = [
    ...(Array.isArray(event.members) ? event.members : []),
    event.data.memberName,
    event.data.userName,
    event.data.leaderName,
    event.data.secondName,
  ];

  return Array.from(new Set(names.map(normalizeMemberName).filter(Boolean)));
}

function eventHasMembers(event: ChallengeStudioEvent) {
  return getEventMembers(event).length > 0;
}

async function getRecentlyMentionedMembers() {
  const bulletins = await getChallengeStudioBulletins(20);
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const names = new Set<string>();

  bulletins.forEach((bulletin) => {
    const createdTime = getTimeValue(bulletin.createdAt);
    if (!createdTime || createdTime < cutoff) return;

    bulletin.mentionedMembers.forEach((name) => {
      const cleanName = normalizeMemberName(name);
      if (cleanName) names.add(cleanName);
    });
  });

  return Array.from(names);
}

function isExceptionalEvent(event: ChallengeStudioEvent) {
  return EXCEPTIONAL_EVENT_TYPES.has(event.type);
}

function filterEventsForCooldown(
  events: ChallengeStudioEvent[],
  recentMembers: string[],
) {
  const recentSet = new Set(recentMembers.map(normalizeMemberName));

  const preferred = events.filter((event) => {
    const members = getEventMembers(event);
    if (members.length === 0) return true;
    if (isExceptionalEvent(event)) return true;
    return !members.some((member) => recentSet.has(member));
  });

  if (preferred.length >= REQUIRED_CARDS_COUNT) return preferred;
  return events;
}

function getAllEventMemberNames(events: ChallengeStudioEvent[]) {
  return Array.from(
    new Set(events.flatMap((event) => getEventMembers(event)).filter(Boolean)),
  ).sort((a, b) => b.length - a.length);
}

function extractMentionedMembersFromCards(
  cards: AiCard[],
  events: ChallengeStudioEvent[],
  summary = "",
) {
  const allNames = getAllEventMemberNames(events);

  const text = `${summary}\n${cards
    .map((card) => `${card.title}\n${card.content}`)
    .join("\n")}`;

  return allNames.filter((name) => text.includes(name));
}

function findGenericMemberWords(cards: AiCard[], summary = "") {
  const fullText = `${summary}\n${cards
    .map((card) => `${card.title}\n${card.content}`)
    .join("\n")}`;

  return GENERIC_MEMBER_WORDS.filter((word) => fullText.includes(word));
}

function buildPrompt(events: ChallengeStudioEvent[], recentMembers: string[]) {
  return `
أنت رئيس تحرير رياضي محترف داخل منصة توقعات كأس العالم 2026.
مهمتك كتابة نشرة يومية باسم "استوديو التحدي" بأسلوب صحفي رياضي احترافي.

نبرة الكتابة:
- العربية فصيحة، واضحة، سهلة القراءة، وخالية من الأخطاء الإملائية والنحوية.
- الأسلوب صحفي رياضي حي، لا يكون رسميًا جامدًا ولا عاميًا زائدًا.
- الجمل قصيرة إلى متوسطة، مترابطة، ومفهومة من القراءة الأولى.
- استخدم التشويق والتحليل دون مبالغة، ودون اختراع وقائع.
- لا تستخدم Markdown.
- لا تكتب أي شرح خارج JSON.

قاعدة ذكر الأسماء وهي إلزامية جدًا:
- إذا كان الحدث يحتوي على members أو memberName أو userName أو leaderName أو secondName، يجب ذكر الاسم الحقيقي للعضو في البطاقة نفسها.
- لا تكتب بطاقة عن عضو موجود في البيانات بدون ذكر اسمه الحقيقي.
- ممنوع استخدام عبارات عامة بدل الاسم إذا كان الاسم موجودًا في البيانات.
- العبارات الممنوعة إذا كان الاسم موجودًا: ${JSON.stringify(GENERIC_MEMBER_WORDS)}.
- إذا كان الحدث يحتوي على اسمين مثل منافسة المتصدر والوصيف، يمكن ذكر الاسمين في نفس البطاقة فقط.
- إذا كان الحدث لا يحتوي على أي اسم، عندها فقط يمكن استخدام صياغة عامة.
- اذكر اسم العضو مرة واحدة فقط في البطاقة، ثم أكمل بالضمائر أو الوصف دون تكرار الاسم.

أولوية الأدوار الحاسمة وهي إلزامية جدًا:
- إذا وُجد حدث final_spotlight، اجعله البطاقة الأولى في النشرة بنوع main، ولا تضع قبله أي خبر آخر.
- إذا وُجد حدث semi_final_spotlight، خصص له بطاقة رئيسية مستقلة، واجعله ضمن أول ثلاث بطاقات.
- إذا وُجد حدثان لنصف النهائي، امنح كل مواجهة بطاقة مستقلة وزاوية تحريرية مختلفة، ولا تدمجهما في خبر واحد.
- إذا وُجد حدث third_place_spotlight، عامله كمواجهة خاصة على منصة التتويج، لكن بعد النهائي ونصف النهائي في الأولوية.
- يجب ذكر اسمي المنتخبين الواردين في homeTeamName وawayTeamName داخل النص بوضوح.
- لا تستخدم للأدوار الحاسمة عبارات عامة فقط مثل: مباراة قوية، قمة مرتقبة، مواجهة نارية؛ بل وضّح معنى العبور للنهائي أو حسم اللقب أو منصة التتويج.
- اجعل لغة النهائي أعلى هيبة وتأثيرًا من لغة نصف النهائي، ولغة نصف النهائي أكثر توترًا من المباريات العادية.
- نوّع المدخل الصحفي بين: قيمة المواجهة، ضغط التوقعات، طريق اللقب، اختبار الأعصاب، أثر السوبر ذهبي، وسيناريو التأهل.
- لا تخترع موعدًا أو نتيجة أو رقمًا غير موجود في الحدث.
- لا تكرر نفس عنوان أو افتتاحية الدور الحاسم في النشرة نفسها.

قواعد صارمة جدًا:
- اكتب 10 بطاقات بالضبط، لا أقل ولا أكثر.
- محتوى كل بطاقة يجب أن يكون بين 45 و85 كلمة تقريبًا.
- لا تجعل البطاقة قصيرة أو جملة واحدة فقط.
- كل بطاقة يجب أن تحتوي على سياق ثم تحليل مختصر ثم أثر الحدث على المنافسة.
- لا تكرر اسم أي عضو داخل النشرة نهائيًا، لا في العنوان ولا في النص ولا في الملخص.
- إذا ظهر اسم عضو في بطاقة، لا يظهر مرة أخرى في أي بطاقة أخرى.
- لا يظهر العضو الموجود ضمن قائمة آخر 48 ساعة إلا إذا كان الحدث استثنائيًا وموجودًا ضمن البيانات.
- عند تقارب الأحداث، اختر العضو الذي لم يظهر مؤخرًا لإعطاء فرصة لأسماء مختلفة.
- لا تخترع نقاطًا أو ترتيبًا أو توقعات أو نتائج أو سلاسل أو إنجازات.
- اعتمد فقط على الأحداث المرسلة لك في آخر البرومبت.
- إذا لم تجد معلومة رقمية واضحة في الحدث، لا تذكر رقمًا من عندك.
- لا تذكر أن النص مولد بالذكاء الاصطناعي.
- لا تكتب: "تصريح غير حقيقي" أو "للترفيه فقط" أو أي عبارة مشابهة.
- الطرافة مسموحة فقط إذا كانت محترمة وخفيفة وبدون إحراج أو تجريح.

قواعد التنوع:
- لا تبدأ البطاقات بنفس الكلمة أو نفس التركيب.
- لا تجعل كل البطاقات عن أصحاب المراكز الأولى.
- امنح مساحة لأصحاب الصعود، السلاسل، التوقعات الدقيقة، المطاردين، ومن ظهر له حدث حقيقي لافت.

فقرات إعلامية مقترحة للاختيار منها حسب البيانات المتاحة فقط:
${JSON.stringify(EDITORIAL_SECTIONS, null, 2)}

الأحداث التي تسمح بتجاوز قاعدة الظهور خلال آخر 48 ساعة:
- توقع ذهبي.
- نتيجة صحيحة بالملي بعد الاحتساب.
- ضغط مباشر على الصدارة.
- دخول التوب 3.
- أكبر صعود.
- أفضل سلسلة.
- توقع خطير مؤثر على الترتيب.
- نجم الجولة إذا كانت نقاطه في الجولة واضحة.
- أفضل عودة إذا كان الصعود في الترتيب واضحًا.
- قناص النتائج إذا كانت النتائج الدقيقة موثقة.

أعضاء ظهروا في آخر 48 ساعة، تجنب ذكرهم إلا لحدث استثنائي:
${JSON.stringify(recentMembers, null, 2)}

أنواع البطاقات المسموحة فقط:
main, quote, number, badge, funny, watch

هيكلة البطاقات المطلوبة:
1- النهائي أولًا إذا كان موجودًا، وإلا أقوى حدث متاح.
2- نصف النهائي إذا كان موجودًا، وإلا بطاقة من توقعات المباريات أو الصدارة.
3- بطاقة من تحدي العشر ثواني إذا توفرت نتيجة اليوم.
4- بطاقة من تحدي الأعلام إذا توفرت نتيجة اليوم.
5- بطاقة من خمن كلمة اليوم إذا توفرت نتيجة اليوم.
6- بطاقة رقم اليوم إذا وُجد رقم حقيقي واضح.
7- بطاقة وسام أو لقب إعلامي مستحق من البيانات.
8- بطاقة تحت المجهر لعضو أو توقع أو مواجهة.
9- بطاقة حركة ترتيب: صعود أو تراجع أو ثبات إذا توفرت البيانات.
10- بطاقة ختامية بعنوان "كلمة الاستوديو" أو تنبيه مهم للجولة.

صيغة الإخراج المطلوبة:
{
  "summary": "عنوان مختصر للنشرة بدون تكرار أسماء الأعضاء",
  "cards": [
    {
      "type": "main",
      "icon": "🔥",
      "title": "عنوان البطاقة",
      "content": "النص",
      "priority": 100
    }
  ]
}

الأحداث المتاحة:
${JSON.stringify(events, null, 2)}
`;
}

function cleanContent(content: string) {
  return content
    .replace(/تصريح غير حقيقي/g, "")
    .replace(/للترفيه فقط/g, "")
    .replace(/وليست تصريحات حقيقية/g, "")
    .replace(/مولدة بالذكاء الاصطناعي/g, "")
    .replace(/\s+([،.!؟:؛])/g, "$1")
    .replace(/([،.!؟:؛])([^\s\n])/g, "$1 $2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeCardType(value: unknown): AiCard["type"] {
  if (
    value === "main" ||
    value === "quote" ||
    value === "number" ||
    value === "badge" ||
    value === "funny" ||
    value === "watch"
  ) {
    return value;
  }

  return "watch";
}

function normalizeCards(cards: AiCard[]) {
  return cards
    .filter((card) => {
      return (
        card &&
        typeof card.title === "string" &&
        typeof card.content === "string" &&
        typeof card.icon === "string"
      );
    })
    .slice(0, REQUIRED_CARDS_COUNT)
    .map((card, index) => ({
      type: normalizeCardType(card.type),
      icon: card.icon.trim().slice(0, 6) || "🎙️",
      title: cleanContent(card.title).replace(/\n/g, " ").slice(0, 80),
      content: cleanContent(card.content).slice(0, 1200),
      priority:
        typeof card.priority === "number" && Number.isFinite(card.priority)
          ? card.priority
          : 100 - index,
    }));
}

function normalizeSummary(value: unknown, fallback: string) {
  return cleanContent(String(value || fallback || "نشرة استوديو التحدي"))
    .replace(/\n/g, " ")
    .slice(0, 120);
}

async function requestAiBulletin(prompt: string, temperature = 0.72) {
  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    temperature,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return response.choices[0]?.message?.content || "{}";
}

function parseAiJson(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function removeMemberNamesFromTitle(title: string, allNames: string[]) {
  let nextTitle = title;

  allNames.forEach((name) => {
    if (!name) return;
    nextTitle = nextTitle.split(name).join("");
  });

  nextTitle = cleanContent(nextTitle)
    .replace(/\s{2,}/g, " ")
    .replace(/^[-–—:،\s]+/, "")
    .replace(/[-–—:،\s]+$/, "")
    .trim();

  return nextTitle || "لقطة الاستوديو";
}

function replaceGenericWordsWithName(text: string, memberName: string) {
  if (!memberName) return text;

  let nextText = text;

  GENERIC_MEMBER_WORDS.forEach((word) => {
    nextText = nextText.split(word).join(memberName);
  });

  return nextText;
}

function countOccurrences(text: string, value: string) {
  if (!value) return 0;
  return text.split(value).length - 1;
}

function ensureNamesInCard(params: {
  card: AiCard;
  event: ChallengeStudioEvent;
  usedMembers: Set<string>;
  allNames: string[];
}) {
  const eventMembers = getEventMembers(params.event);
  const availableMembers = eventMembers.filter(
    (member) => !params.usedMembers.has(member),
  );

  const selectedMembers =
    params.event.type === "leader_under_pressure"
      ? availableMembers.slice(0, 2)
      : availableMembers.slice(0, 1);

  if (eventMembers.length > 0 && selectedMembers.length === 0) {
    return null;
  }

  let title = removeMemberNamesFromTitle(params.card.title, params.allNames);
  let content = cleanContent(params.card.content);

  selectedMembers.forEach((memberName) => {
    content = replaceGenericWordsWithName(content, memberName);
  });

  if (selectedMembers.length > 0) {
    const missingMembers = selectedMembers.filter(
      (memberName) => !content.includes(memberName),
    );

    if (missingMembers.length > 0) {
      content = `${missingMembers.join(" و")} يدخل نشرة اليوم من زاوية مستحقة. ${content}`;
    }
  }

  params.allNames.forEach((name) => {
    if (!name || selectedMembers.includes(name)) return;
    content = content.split(name).join("هذا العضو");
  });

  selectedMembers.forEach((memberName) => {
    const occurrences = countOccurrences(content, memberName);
    if (occurrences <= 1) return;

    let firstSeen = false;
    content = content
      .split(memberName)
      .map((part, index) => {
        if (index === 0) return part;
        if (!firstSeen) {
          firstSeen = true;
          return `${memberName}${part}`;
        }
        return `هذا العضو${part}`;
      })
      .join("");
  });

  if (eventMembers.length > 0) {
    selectedMembers.forEach((memberName) => params.usedMembers.add(memberName));
  }

  return {
    ...params.card,
    title: title.slice(0, 80),
    content: cleanContent(content).slice(0, 1200),
  };
}

function buildLocalCardFromEvent(
  event: ChallengeStudioEvent,
  usedMembers: Set<string>,
  index: number,
): AiCard | null {
  const members = getEventMembers(event).filter(
    (member) => !usedMembers.has(member),
  );
  const primaryName = members[0] || "";
  const secondaryName = members[1] || "";

  if (eventHasMembers(event) && !primaryName) return null;

  const basePriority = Math.max(30, event.priority || 60) - index;

  if (primaryName) usedMembers.add(primaryName);
  if (event.type === "leader_under_pressure" && secondaryName) {
    usedMembers.add(secondaryName);
  }

  if (event.type === "final_spotlight") {
    const homeTeamName = getText(event.data.homeTeamName);
    const awayTeamName = getText(event.data.awayTeamName);
    const hoursUntilStart = getNumber(event.data.hoursUntilStart);
    const isGolden = getText(event.data.predictionType) === "golden";

    return {
      type: "main",
      icon: "🏆",
      title: getText(event.title) || "ليلة الحسم الكبرى",
      content: `${homeTeamName} و${awayTeamName} يقفان أمام المشهد الأخير في البطولة، حيث لا مكان للتعويض بعد صافرة النهائي. ${hoursUntilStart > 0 ? `يتبقى على المواجهة نحو ${hoursUntilStart} ساعة،` : "موعد الحسم بات قريبًا،"} ومعها ترتفع قيمة كل توقع وتتضاعف حساسية التفاصيل. ${isGolden ? "وجود السوبر ذهبي يجعل قراءة النتيجة والمتأهل وطريقة الحسم فرصة قادرة على إعادة ترتيب المنافسة بالكامل." : "النهائي يختبر دقة الأعضاء في أهم مباراة، وقد تصنع نقطة واحدة الفارق في سباق الصدارة."}`,
      priority: basePriority,
    };
  }

  if (event.type === "semi_final_spotlight") {
    const homeTeamName = getText(event.data.homeTeamName);
    const awayTeamName = getText(event.data.awayTeamName);
    const hoursUntilStart = getNumber(event.data.hoursUntilStart);
    const isGolden = getText(event.data.predictionType) === "golden";

    return {
      type: "main",
      icon: "🎯",
      title: getText(event.title) || "بوابة النهائي تفتح أبوابها",
      content: `${homeTeamName} يواجه ${awayTeamName} في نصف نهائي لا يمنح سوى بطاقة واحدة إلى المشهد الأخير. ${hoursUntilStart > 0 ? `تبقى قرابة ${hoursUntilStart} ساعة على البداية،` : "صافرة البداية تقترب،"} والضغط هنا لا يقتصر على المنتخبين؛ فالأعضاء أمام اختبار صعب في قراءة النتيجة والمتأهل وسيناريو الحسم. ${isGolden ? "السوبر ذهبي يرفع سقف المخاطرة والمكافأة، وقد يحول هذه المواجهة إلى نقطة انقلاب في الترتيب." : "كل اختيار في هذه المرحلة قد يفتح طريقًا نحو الصدارة أو يوسع الفارق عن المنافسين."}`,
      priority: basePriority,
    };
  }

  if (event.type === "third_place_spotlight") {
    const homeTeamName = getText(event.data.homeTeamName);
    const awayTeamName = getText(event.data.awayTeamName);
    const hoursUntilStart = getNumber(event.data.hoursUntilStart);

    return {
      type: "watch",
      icon: "🥉",
      title: getText(event.title) || "معركة منصة التتويج",
      content: `${homeTeamName} و${awayTeamName} يعودان إلى الميدان من أجل المركز الثالث وإنهاء البطولة فوق منصة التتويج. ${hoursUntilStart > 0 ? `المواجهة تبدأ بعد نحو ${hoursUntilStart} ساعة،` : "الموعد بات قريبًا،"} وهي مباراة تختلف نفسيًا عن بقية الأدوار؛ لأنها تجمع بين رغبة التعويض وحفظ ختام مشرف. في منصة التوقعات تبقى نقاطها مؤثرة، خصوصًا مع تقارب المراكز في الأمتار الأخيرة.`,
      priority: basePriority,
    };
  }

  if (event.type === "leader_under_pressure" && primaryName && secondaryName) {
    return {
      type: "main",
      icon: "🔥",
      title: "الصدارة تحت الضغط",
      content: `${primaryName} يبقى في الواجهة، لكن ${secondaryName} يقترب من المشهد بفارق ${getNumber(event.data.pointsDiff)} نقطة فقط. هذه المسافة تجعل الجولة القادمة اختبارًا مباشرًا للأعصاب، وأي توقع صحيح قد يغير شكل القمة.`,
      priority: basePriority,
    };
  }

  if (event.type === "exact_after_calculation") {
    return {
      type: "main",
      icon: "🎯",
      title: "نتيجة دقيقة تغيّر المشهد",
      content: `${primaryName} حضر في العنوان الأبرز بعد احتساب مباراة ${getText(event.data.matchName)}، بعدما أصاب النتيجة ${getNumber(event.data.homeScore)} - ${getNumber(event.data.awayScore)} وحصد ${getNumber(event.data.points)} نقاط.`,
      priority: basePriority,
    };
  }

  if (event.type === "round_star") {
    return {
      type: "badge",
      icon: "🔥",
      title: "نجم الجولة",
      content: `${primaryName} كان الاسم الأبرز في نتائج الجولة الأخيرة، بعدما جمع ${getNumber(event.data.roundPoints)} نقاط من ${getNumber(event.data.calculatedCount)} توقعات محتسبة.`,
      priority: basePriority,
    };
  }

  if (event.type === "biggest_climb") {
    return {
      type: "number",
      icon: "🚀",
      title: "أسرع صعود",
      content: `${primaryName} قدّم واحدة من أبرز حركات الترتيب، بعدما صعد ${getNumber(event.data.rankChange)} مراكز ووصل إلى المركز ${getNumber(event.data.currentRank)}.`,
      priority: basePriority,
    };
  }

  if (event.type === "biggest_drop") {
    return {
      type: "funny",
      icon: "📉",
      title: "تراجع يحتاج ردًا",
      content: `${primaryName} تراجع ${getNumber(event.data.rankChange)} مراكز. القراءة الهادئة تقول إن الهبوط مؤلم، لكنه قابل للتعويض إذا جاءت الجولة القادمة بصورة أفضل.`,
      priority: basePriority,
    };
  }

  if (event.type === "best_streak") {
    return {
      type: "badge",
      icon: "🔥",
      title: "سلسلة نارية",
      content: `${primaryName} يستحق وسام اليوم بعد سلسلة وصلت إلى ${getNumber(event.data.bestStreak)} توقعات صحيحة. الاستمرارية بهذا الشكل تمنح المنافسة بُعدًا مختلفًا.`,
      priority: basePriority,
    };
  }

  if (event.type === "highest_accuracy") {
    return {
      type: "number",
      icon: "📊",
      title: "ملك الدقة",
      content: `${primaryName} يملك دقة تبلغ ${getNumber(event.data.accuracy)}% من أصل ${getNumber(event.data.total)} توقعات. رقم يعكس قراءة جيدة للمباريات وليس مجرد حضور في الجدول.`,
      priority: basePriority,
    };
  }

  if (event.type === "most_exact_results") {
    return {
      type: "badge",
      icon: "🎯",
      title: "قناص النتائج",
      content: `${primaryName} وصل إلى ${getNumber(event.data.exact)} توقعات دقيقة بالملي. هذا النوع من الأرقام يصنع الفارق في المراحل الحاسمة.`,
      priority: basePriority,
    };
  }

  if (event.type === "best_comeback") {
    return {
      type: "badge",
      icon: "⚡",
      title: "أفضل عودة",
      content: `${primaryName} عاد إلى الصورة بحركة لافتة، بعدما صعد ${getNumber(event.data.rankChange)} مراكز ووصل إلى المركز ${getNumber(event.data.currentRank)}.`,
      priority: basePriority,
    };
  }

  if (event.type === "most_stable") {
    return {
      type: "number",
      icon: "📈",
      title: "الأكثر ثباتًا",
      content: `${primaryName} يحافظ على حضوره بثبات، مع دقة ${getNumber(event.data.accuracy)}% من ${getNumber(event.data.total)} توقعات. الثبات هنا قيمة لا تقل أهمية عن الصعود السريع.`,
      priority: basePriority,
    };
  }

  if (event.type === "black_horse") {
    return {
      type: "badge",
      icon: "🐎",
      title: "الحصان الأسود",
      content: `${primaryName} يتحرك بعيدًا عن الضجيج، لكن أرقامه تشير إلى حضور لا يمكن تجاهله. دقة تصل إلى ${getNumber(event.data.accuracy)}% تضعه ضمن الأسماء التي قد تفاجئ المنافسين.`,
      priority: basePriority,
    };
  }

  if (event.type === "worst_luck") {
    return {
      type: "funny",
      icon: "😅",
      title: "الأكثر حظًا سيئًا",
      content: `${primaryName} واجه يومًا صعبًا مع ${getNumber(event.data.wrong)} توقعات غير موفقة من أصل ${getNumber(event.data.total)}. الاستوديو يقرأها بروح رياضية: الحظ يتغير، والمنافسة لا تنتهي من جولة واحدة.`,
      priority: basePriority,
    };
  }

  if (event.type === "forgot_prediction") {
    return {
      type: "funny",
      icon: "😴",
      title: "صح النوم",
      content: `${primaryName} غاب عن توقع مباراة ${getText(event.data.matchName)}. في بطولة بهذا الإيقاع، تفويت مباراة واحدة قد يترك أثرًا واضحًا على الجدول.`,
      priority: basePriority,
    };
  }

  if (event.type === "dangerous_prediction") {
    return {
      type: "watch",
      icon: "🎲",
      title: "توقع تحت المجهر",
      content: `${primaryName} اختار نتيجة جريئة في مباراة ${getText(event.data.matchName)}: ${getNumber(event.data.homeScore)} - ${getNumber(event.data.awayScore)}. إذا تحققت، فقد تتحول إلى واحدة من لقطات الجولة.`,
      priority: basePriority,
    };
  }


  if (event.type === "knockout_qualification_hit") {
    const qualifiedTeamName = getText(event.data.qualifiedTeamName);
    const qualificationMethod = getText(event.data.qualificationMethod);

    return {
      type: "main",
      icon: "🎯",
      title: "قراءة خروج المغلوب",
      content: `${primaryName} خرج من مباراة ${getText(event.data.matchName)} بقراءة ثمينة بعد توقعه ${getNumber(event.data.homeScore)} - ${getNumber(event.data.awayScore)} وحصوله على ${getNumber(event.data.points)} نقاط. ${qualifiedTeamName ? `اختياره للمتأهل ${qualifiedTeamName}` : "اختياره في تفاصيل التأهل"}${qualificationMethod ? ` وطريقة الحسم ${qualificationMethod}` : ""} جعل اللقطة أهم من مجرد نتيجة، لأن مباريات خروج المغلوب تكافئ من يقرأ السيناريو كاملًا لا الفائز فقط.`,
      priority: basePriority,
    };
  }

  if (event.type === "flag_memory_champion") {
    return {
      type: "badge",
      icon: "🎌",
      title: "بطل تحدي الأعلام",
      content: `${primaryName} فرض اسمه في تحدي الأعلام اليوم بعدما أنهى الجولة خلال ${formatSeconds(event.data.timeSeconds)} وسجل ${getNumber(event.data.score)} نقطة مع ${getNumber(event.data.mistakes)} أخطاء فقط. هذه النتيجة تكشف تركيزًا عاليًا وسرعة ملاحظة واضحة، وتضيف له حضورًا مختلفًا خارج حسابات مباريات كأس العالم، خصوصًا وهو يقف عند ${getRankText(event.data.currentRank)} برصيد ${getPointsText(event.data.points)}.`,
      priority: basePriority,
    };
  }

  if (event.type === "flag_memory_fastest") {
    return {
      type: "number",
      icon: "⚡",
      title: "أسرع عين في الأعلام",
      content: `${primaryName} كان الأسرع في تحدي الأعلام بزمن ${formatSeconds(event.data.timeSeconds)}، مع ${getNumber(event.data.moves)} محاولة و${getNumber(event.data.mistakes)} أخطاء. السرعة هنا ليست مجرد رقم جميل، بل دليل على ذاكرة بصرية حاضرة وقرار سريع تحت الضغط، وهذا النوع من الإنجاز يعطي النشرة زاوية تنافسية جديدة بين الأعضاء.`,
      priority: basePriority,
    };
  }

  if (event.type === "flag_memory_fewest_mistakes") {
    return {
      type: "watch",
      icon: "🧠",
      title: "أقل أخطاء في الأعلام",
      content: `${primaryName} قدّم واحدة من أنظف جولات تحدي الأعلام اليوم، بعدما أنهى اللعب بـ ${getNumber(event.data.mistakes)} أخطاء وسجل ${getNumber(event.data.score)} نقطة. هذا النوع من النتائج لا يعتمد على السرعة وحدها، بل على الهدوء والتركيز، وقد يجعله حاضرًا في سباق الألعاب اليومية إلى جانب سباق التوقعات.`,
      priority: basePriority,
    };
  }

  if (event.type === "word_game_champion") {
    return {
      type: "badge",
      icon: "🧩",
      title: "بطل خمن كلمة اليوم",
      content: `${primaryName} تصدر خمن كلمة اليوم بعدما حسمها في ${getNumber(event.data.attemptsUsed)} محاولات وخلال ${formatDurationMs(event.data.durationMs)}. الفوز هنا يضيف جانبًا مختلفًا للمنافسة، لأن سرعة البديهة واختيار الحروف الصحيحة أصبحت جزءًا من أخبار المنصة اليومية، خصوصًا مع وجوده عند ${getRankText(event.data.currentRank)} في لوحة الصدارة.`,
      priority: basePriority,
    };
  }

  if (event.type === "word_game_fastest") {
    return {
      type: "number",
      icon: "🚀",
      title: "أسرع فوز في خمن كلمة",
      content: `${primaryName} خطف لقطة السرعة في خمن كلمة اليوم بعدما أنهى التحدي خلال ${formatDurationMs(event.data.durationMs)} وبعدد ${getNumber(event.data.attemptsUsed)} محاولات. هذا الإنجاز يعكس سرعة قراءة للكلمة وقدرة على تضييق الاحتمالات مبكرًا، وهي تفاصيل تجعل الألعاب اليومية أكثر حماسًا بجانب صراع التوقعات.`,
      priority: basePriority,
    };
  }

  if (event.type === "word_game_first_try") {
    return {
      type: "funny",
      icon: "🎯",
      title: getNumber(event.data.attemptsUsed) === 1 ? "من أول محاولة" : "من ثاني محاولة",
      content: `${primaryName} دخل خمن كلمة اليوم بتركيز واضح، وحسمها من ${getNumber(event.data.attemptsUsed) === 1 ? "المحاولة الأولى" : "المحاولة الثانية"} خلال ${formatDurationMs(event.data.durationMs)}. مثل هذه البداية السريعة لا تمر مرورًا عاديًا في الاستوديو، لأنها تعطي انطباعًا عن سرعة بديهة عالية وتفتح باب التحدي لبقية الأعضاء في الأيام القادمة.`,
      priority: basePriority,
    };
  }

  if (event.type === "word_game_lost") {
    return {
      type: "funny",
      icon: "😅",
      title: "كلمة استعصت اليوم",
      content: `${primaryName} لم ينجح في خمن كلمة اليوم رغم استهلاك ${getNumber(event.data.attemptsUsed)} محاولات. الاستوديو يقرأ اللقطة بروح خفيفة: بعض الكلمات تحتاج نفسًا أطول وتركيزًا أكبر، لكن التعويض متاح في تحدي الغد، خصوصًا أن حضوره في ${getRankText(event.data.currentRank)} يجعل كل نشاط يومي مهمًا في المشهد العام.`,
      priority: basePriority,
    };
  }

  if (event.type === "ten_seconds_exact") {
    return {
      type: "main",
      icon: "⏱️",
      title: "العشر ثواني بالملي",
      content: `${primaryName} خطف لقطة تحدي العشر ثواني بعدما أوقف المؤقت على ${getText(event.data.bestDisplayTime) || "00:10.000"} بالملي، وأضاف لرصيده +${getNumber(event.data.awardedPoints)} نقاط مهمة. هذه النقاط ليست تفصيلًا عابرًا، لأنها قد ترفع الضغط على من حوله في الترتيب وتمنحه دفعة واضحة وهو يقف عند ${getRankText(event.data.currentRank)} برصيد ${getPointsText(event.data.points)}.`,
      priority: basePriority,
    };
  }

  if (event.type === "ten_seconds_points_boost") {
    return {
      type: "badge",
      icon: "🔥",
      title: "خمس نقاط في الوقت القاتل",
      content: `${primaryName} خرج من تحدي العشر ثواني بفوز ثمين ووقت ${getText(event.data.bestDisplayTime) || "قريب من 10 ثواني"}، ليضيف +${getNumber(event.data.awardedPoints)} نقاط إلى رصيده. مثل هذه الزيادة قد تبدو صغيرة، لكنها في منصة متقاربة قد تصنع فرقًا في المراكز، خصوصًا عندما تأتي من لعبة يومية لا تحتمل التردد.`,
      priority: basePriority,
    };
  }

  if (event.type === "ten_seconds_best_attempt") {
    return {
      type: "watch",
      icon: "⏳",
      title: "قريب من العشرة",
      content: `${primaryName} كان قريبًا من خطف تحدي العشر ثواني، بعدما سجل أفضل محاولة عند ${getText(event.data.bestDisplayTime)} بفارق ${getNumber(event.data.bestDiffMs)} ملي ثانية فقط. حتى دون الفوز، هذه اللقطة تستحق المتابعة لأنها تكشف عضوًا يقترب من لحظة مثالية قد تمنحه نقاطًا مهمة في يوم قادم.`,
      priority: basePriority,
    };
  }

  if (event.type === "top3_spotlight" || event.type === "top10_spotlight") {
    return {
      type: "watch",
      icon: event.type === "top3_spotlight" ? "🥉" : "🔟",
      title: "تحت المجهر",
      content: `${primaryName} يقف في المركز ${getNumber(event.data.currentRank)} ومعه ${getNumber(event.data.points)} نقطة. هذه المنطقة لا تمنح الهدوء؛ كل توقع صحيح قد يرفع السقف.`,
      priority: basePriority,
    };
  }

  if (event.type === "chasing_pack") {
    return {
      type: "watch",
      icon: "🐎",
      title: "قادم من الخلف",
      content: `${primaryName} يطارد من المركز ${getNumber(event.data.currentRank)}، ولا يفصله عن ${getText(event.data.leaderName) || "صاحب الصدارة"} سوى ${getNumber(event.data.pointsBehindLeader)} نقطة. هذا النوع من المطاردة يستحق المتابعة.`,
      priority: basePriority,
    };
  }

  if (event.type === "winner_after_calculation") {
    return {
      type: "watch",
      icon: "✅",
      title: "الفائز كان في الجيب",
      content: `${primaryName} خرج من مباراة ${getText(event.data.matchName)} بنقاط مستحقة بعد قراءة الفائز بشكل صحيح. هذا النوع من التوقعات يحافظ على الحضور في الجدول.`,
      priority: basePriority,
    };
  }

  if (event.type === "missed_after_calculation") {
    return {
      type: "funny",
      icon: "😬",
      title: "فرصة لم تكتمل",
      content: `${primaryName} خرج من مباراة ${getText(event.data.matchName)} دون نقاط. النتيجة لم تخدمه هذه المرة، لكن الطريق ما زال مفتوحًا للتعويض.`,
      priority: basePriority,
    };
  }

  if (event.type === "studio_word") {
    return {
      type: "watch",
      icon: "🎙️",
      title: "كلمة الاستوديو",
      content: `الصورة العامة تقول إن المنافسة لا تزال مفتوحة. عدد الأعضاء أصحاب التوقعات المحتسبة بلغ ${getNumber(event.data.activeMembersCount)}، وهناك ${getNumber(event.data.scheduledMatchesCount)} مباريات قادمة على الرادار.`,
      priority: basePriority,
    };
  }

  if (
    event.type === "strong_match_alert" ||
    event.type === "golden_prediction_alert"
  ) {
    return {
      type: event.type === "golden_prediction_alert" ? "main" : "watch",
      icon: event.type === "golden_prediction_alert" ? "⭐" : "⚽",
      title:
        event.type === "golden_prediction_alert"
          ? "التوقع الذهبي يفتح باب التحولات"
          : "مباراة قد تعيد ترتيب الأوراق",
      content: `استوديو التحدي يضع مباراة ${getText(event.data.matchName)} في واجهة المتابعة. هذا النوع من المواجهات يكشف من يقرأ التفاصيل الصغيرة قبل صافرة البداية، ومن يغامر في التوقيت الصحيح.`,
      priority: basePriority,
    };
  }

  if (primaryName) {
    return {
      type: "watch",
      icon: "👀",
      title: event.title || "تحت المجهر",
      content: `${primaryName} يدخل نشرة اليوم من زاوية مستحقة. الأرقام المرتبطة بهذا الحدث تمنحه حضورًا واضحًا في المشهد.`,
      priority: basePriority,
    };
  }

  return {
    type: "watch",
    icon: "🎙️",
    title: event.title || "كلمة الاستوديو",
    content:
      "استوديو التحدي يرصد حركة جديدة في المنافسة. الجولات القادمة ستكشف من يملك قراءة ثابتة ومن ينتظر لحظة الانفجار.",
    priority: basePriority,
  };
}

function buildFallbackGenericCard(index: number): AiCard {
  const fallbackCards: AiCard[] = [
    {
      type: "watch",
      icon: "👀",
      title: "زاوية المتابعة",
      content:
        "استوديو التحدي يواصل قراءة التفاصيل. لا توجد نتيجة صغيرة في سباق النقاط، فكل توقع قد يكون بداية لتحول جديد.",
      priority: 40,
    },
    {
      type: "number",
      icon: "📊",
      title: "إشارة رقمية",
      content:
        "لوحة الصدارة لا تتحرك بالأسماء فقط، بل بالأرقام الدقيقة: نقاط، توقعات صحيحة، ونتائج بالملي تصنع الفارق.",
      priority: 39,
    },
    {
      type: "badge",
      icon: "🏅",
      title: "رسالة المنافسة",
      content:
        "الحضور المستمر في التوقعات يمنح صاحبه فرصة دائمة للعودة. الغياب عن مباراة واحدة قد يكون مكلفًا.",
      priority: 38,
    },
  ];

  return fallbackCards[index % fallbackCards.length];
}


function expandCardContent(card: AiCard) {
  const content = cleanContent(card.content);

  if (content.length >= 260) {
    return {
      ...card,
      content,
    };
  }

  const additions: Record<AiCard["type"], string> = {
    main:
      "هذه اللقطة تمنح النشرة وزنًا خاصًا، لأنها لا تقف عند الرقم وحده، بل تكشف كيف يمكن لتفصيل واحد أن يغيّر قراءة المنافسة ويزيد الضغط في الجولات القادمة.",
    quote:
      "قراءة الاستوديو لهذا الحدث تؤكد أن المنافسة لم تعد تعتمد على الحضور فقط، بل على دقة الاختيار وتوقيت التوقع، خصوصًا مع تقارب النقاط.",
    number:
      "الأرقام هنا ليست مجرد إحصائية عابرة، بل مؤشر واضح على اتجاه المنافسة، وقد تكون سببًا في صعود مفاجئ أو ضغط مباشر على المراكز المتقدمة.",
    badge:
      "هذا الوسام لا يأتي من فراغ، بل من أثر واضح داخل المنصة، سواء في التوقعات أو الألعاب اليومية التي أصبحت جزءًا من الحماس العام.",
    funny:
      "الاستوديو يتعامل مع اللقطة بروح خفيفة، لكن الرسالة واضحة: التعويض ممكن في أي جولة، والمهم أن يبقى التركيز حاضرًا قبل كل تحدٍ قادم.",
    watch:
      "هذه الزاوية تستحق المتابعة لأنها قد تتحول من مجرد ملاحظة إلى حدث مؤثر، والجولات القادمة ستكشف إن كان هذا التحرك بداية لقصة أكبر.",
  };

  return {
    ...card,
    content: cleanContent(`${content} ${additions[card.type]}`).slice(0, 1200),
  };
}

function hasForbiddenGenericWord(card: AiCard) {
  const text = `${card.title}\n${card.content}`;
  return GENERIC_MEMBER_WORDS.some((word) => text.includes(word));
}

function finalizeCardsWithLocalRepair(
  aiCards: AiCard[],
  events: ChallengeStudioEvent[],
) {
  const allNames = getAllEventMemberNames(events);
  const usedMembers = new Set<string>();
  const usedEventIds = new Set<string>();
  const usedTypes = new Map<string, number>();
  const finalCards: AiCard[] = [];

  const marqueeEventTypes = new Set<ChallengeStudioEvent["type"]>([
    "final_spotlight",
    "semi_final_spotlight",
    "third_place_spotlight",
  ]);

  const marqueeEvents = events.filter((event) => marqueeEventTypes.has(event.type));
  const memberEvents = events.filter(
    (event) => eventHasMembers(event) && !marqueeEventTypes.has(event.type),
  );
  const generalEvents = events.filter(
    (event) => !eventHasMembers(event) && !marqueeEventTypes.has(event.type),
  );

  function canUseEvent(event: ChallengeStudioEvent) {
    const currentTypeCount = usedTypes.get(event.type) || 0;
    return currentTypeCount < 2;
  }

  function markEvent(event: ChallengeStudioEvent) {
    usedEventIds.add(event.id);
    usedTypes.set(event.type, (usedTypes.get(event.type) || 0) + 1);
  }

  // الأدوار الحاسمة تتصدر النشرة قبل أي خبر آخر، مع بطاقة مستقلة لكل مواجهة.
  marqueeEvents.forEach((event, index) => {
    if (finalCards.length >= REQUIRED_CARDS_COUNT) return;
    if (usedEventIds.has(event.id) || !canUseEvent(event)) return;

    const localCard = buildLocalCardFromEvent(event, usedMembers, index);
    if (!localCard) return;

    markEvent(event);
    finalCards.push(expandCardContent(localCard));
  });

  // الأولوية التالية للبطاقات المحلية المبنية من أحداث الأعضاء؛ لأنها تضمن الاسم الحقيقي وتمنع العبارات العامة.
  memberEvents.forEach((event, index) => {
    if (finalCards.length >= REQUIRED_CARDS_COUNT) return;
    if (usedEventIds.has(event.id) || !canUseEvent(event)) return;

    const localCard = buildLocalCardFromEvent(event, usedMembers, index);
    if (!localCard) return;

    const text = `${localCard.title}\n${localCard.content}`;
    const eventMembers = getEventMembers(event);
    const hasAtLeastOneEventMember = eventMembers.some((name) =>
      text.includes(name),
    );

    if (!hasAtLeastOneEventMember) return;
    if (hasForbiddenGenericWord(localCard)) return;

    markEvent(event);
    finalCards.push(expandCardContent(localCard));
  });

  // نستفيد من AI فقط إذا أعطى بطاقة نظيفة وفيها اسم عضو حقيقي وغير مكررة.
  aiCards.forEach((card) => {
    if (finalCards.length >= REQUIRED_CARDS_COUNT) return;

    const cardText = `${card.title}\n${card.content}`;
    const cardMembers = allNames.filter((name) => cardText.includes(name));

    if (cardMembers.length === 0) return;
    if (cardMembers.some((name) => usedMembers.has(name))) return;
    if (hasForbiddenGenericWord(card)) return;

    const matchedEvent = memberEvents.find((event) => {
      if (usedEventIds.has(event.id) || !canUseEvent(event)) return false;
      const eventMembers = getEventMembers(event);
      return eventMembers.some((name) => cardMembers.includes(name));
    });

    if (!matchedEvent) return;

    const cleanedCard = ensureNamesInCard({
      card,
      event: matchedEvent,
      usedMembers,
      allNames,
    });

    if (!cleanedCard) return;
    if (hasForbiddenGenericWord(cleanedCard)) return;

    markEvent(matchedEvent);
    finalCards.push(expandCardContent(cleanedCard));
  });

  generalEvents.forEach((event, index) => {
    if (finalCards.length >= REQUIRED_CARDS_COUNT) return;
    if (usedEventIds.has(event.id) || !canUseEvent(event)) return;

    const localCard = buildLocalCardFromEvent(event, usedMembers, index);
    if (!localCard) return;

    markEvent(event);
    finalCards.push(expandCardContent(localCard));
  });

  let fallbackIndex = 0;
  while (finalCards.length < REQUIRED_CARDS_COUNT) {
    finalCards.push(expandCardContent(buildFallbackGenericCard(fallbackIndex)));
    fallbackIndex += 1;
  }

  return normalizeCards(finalCards).slice(0, REQUIRED_CARDS_COUNT);
}

export async function POST() {
  try {
    const [events, recentMembers] = await Promise.all([
      buildChallengeStudioEvents(),
      getRecentlyMentionedMembers(),
    ]);

    if (events.length === 0) {
      return NextResponse.json(
        { error: "لا توجد أحداث كافية لتوليد النشرة" },
        { status: 400 },
      );
    }

    const filteredEvents = filterEventsForCooldown(events, recentMembers);
    const mainPrompt = buildPrompt(filteredEvents, recentMembers);

    const parsed = parseAiJson(await requestAiBulletin(mainPrompt));
    const aiCards = normalizeCards(
      Array.isArray(parsed.cards) ? parsed.cards : [],
    );

    const cards = finalizeCardsWithLocalRepair(aiCards, filteredEvents);
    const summary = normalizeSummary(
      parsed.summary,
      filteredEvents[0]?.title || "نشرة استوديو التحدي",
    );

    const mentionedMembers = extractMentionedMembersFromCards(
      cards,
      filteredEvents,
      summary,
    );

    const genericWords = findGenericMemberWords(cards, summary);

    return NextResponse.json({
      date: getTodaySaudiDate(),
      summary,
      cards,
      events: filteredEvents,
      mentionedMembers,
      recentMembers,
      cleanup: {
        aiCards: aiCards.length,
        finalCards: cards.length,
        genericWords,
        localRepairUsed: true,
      },
    });
  } catch (error) {
    console.error("AI challenge studio generation error:", error);

    return NextResponse.json(
      { error: "تعذر توليد النشرة بالذكاء الاصطناعي" },
      { status: 500 },
    );
  }
}