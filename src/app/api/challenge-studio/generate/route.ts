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
const REQUIRED_CARDS_COUNT = 8;

const EXCEPTIONAL_EVENT_TYPES = new Set<ChallengeStudioEvent["type"]>([
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
  {
    icon: "🚀",
    title: "قفزة الترتيب",
    goal: "إبراز قفزة الترتيب حقيقي في الترتيب.",
  },
  {
    icon: "📉",
    title: "أكبر تراجع",
    goal: "تناول أكبر تراجع بلغة محترمة.",
  },
  {
    icon: "🎯",
    title: "قناص النتائج",
    goal: "إبراز من أصاب نتائج دقيقة.",
  },
  {
    icon: "🔥",
    title: "نجم الجولة",
    goal: "اختيار صاحب أفضل أثر في الجولة.",
  },
  {
    icon: "⚡",
    title: "أفضل عودة",
    goal: "إبراز من عاد للمنافسة بعد تحسن واضح.",
  },
  {
    icon: "📈",
    title: "جدار الثبات",
    goal: "إبراز عضو يحافظ على مستواه.",
  },
  {
    icon: "👀",
    title: "تحت المجهر",
    goal: "متابعة عضو أو توقع أو مواجهة.",
  },
  {
    icon: "🎙️",
    title: "كلمة الاستوديو",
    goal: "خاتمة تحريرية قصيرة.",
  },
];

const STUDIO_TERMS = [
  {
    term: "🚀 السوبر ذهبي",
    meaning:
      "مباراة نقاطها عالية وقد تقلب الترتيب؛ بالملي +10، الفائز +4، المتأهل +6، الطريقة +4، والسقف في خروج المغلوب 20 نقطة.",
  },
  {
    term: "🔥 فرصة الريمونتادا",
    meaning: "نافذة عودة للعضو المتأخر أو المطارد إذا أحسن قراءة مباراة مؤثرة.",
  },
  {
    term: "⚡ قفزة الترتيب",
    meaning: "صعود واضح في المراكز بعد احتساب نتيجة أو سلسلة توقعات ناجحة.",
  },
  {
    term: "🎯 ضربة بالملي",
    meaning: "توقع نتيجة صحيحة بالملي يمنح صاحبه أثرًا قويًا في السباق.",
  },
  {
    term: "🧊 سقوط مفاجئ",
    meaning: "تراجع عضو كان قريبًا من القمة أو في موقع متقدم.",
  },
  {
    term: "👑 حارس الصدارة",
    meaning: "المتصدر الذي يحاول حماية المركز الأول من ضغط المطاردين.",
  },
  {
    term: "🐎 الحصان الأسود",
    meaning: "عضو يتحرك بهدوء ويملك أرقامًا تجعله مرشحًا للمفاجأة.",
  },
  {
    term: "🧨 قنبلة الجولة",
    meaning: "نتيجة أو توقع غيّر شكل المنافسة بشكل واضح.",
  },
  {
    term: "🛡️ دفاع المتصدر",
    meaning: "قراءة حالة المتصدر عندما يكون تحت ضغط مباشر.",
  },
  {
    term: "🚨 إنذار للمتصدر",
    meaning: "اقتراب مطارد أو وصيف من الصدارة بفارق مؤثر.",
  },
  {
    term: "🧠 قراءة ذكية",
    meaning: "توقع صحيح أو اختيار جريء مبني على قراءة ممتازة.",
  },
  {
    term: "😅 زلة توقع",
    meaning: "توقع لم ينجح لكن يذكر بروح خفيفة ومحترمة.",
  },
  {
    term: "💥 انقلاب الطاولة",
    meaning: "تحول كبير في الترتيب بعد احتساب مباراة مؤثرة.",
  },
  {
    term: "🏹 صائد النقاط",
    meaning: "عضو يجمع نقاطًا باستمرار حتى لو لم يخطف كل الأضواء.",
  },
  {
    term: "🌪️ عاصفة السوبر ذهبي",
    meaning: "تأثير مباراة سوبر ذهبي على الصدارة والمطاردين.",
  },
  {
    term: "📉 نزيف النقاط",
    meaning: "فترة ضياع فرص متكررة تحتاج إلى تصحيح سريع.",
  },
  {
    term: "📈 مؤشر الصعود",
    meaning: "أرقام حديثة تشير إلى تحسن واضح في المسار.",
  },
  {
    term: "🧱 جدار الثبات",
    meaning: "عضو يحافظ على موقعه أو مستواه رغم ضغط المنافسة.",
  },
  {
    term: "🥶 تجميد الرصيد",
    meaning: "عضو لم يضيف نقاطًا في لقطة أو جولة مهمة.",
  },
  {
    term: "🔥 عودة الكبار",
    meaning: "عضو يعود للمشهد بعد تحسن أو صعود مؤثر.",
  },
];

const NEWS_ANGLES = [
  "خبر عاجل",
  "مؤتمر صحفي",
  "تقرير الجولة",
  "لقطة اليوم",
  "رادار المنافسة",
  "تحت المجهر",
  "غرفة التحليل",
  "رسالة للمتصدر",
  "مطاردة الوصيف",
  "حكاية الريمونتادا",
  "نجم السوبر ذهبي",
  "المتضرر الأكبر",
  "المستفيد الأكبر",
  "أقوى قفزة",
  "أكبر تراجع",
  "هدوء قبل العاصفة",
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

مصطلحات الاستوديو الجديدة، استخدم المناسب منها فقط حسب البيانات ولا تحشرها كلها:
${JSON.stringify(STUDIO_TERMS, null, 2)}

زوايا الأخبار المسموحة والمطلوبة للتنويع:
${JSON.stringify(NEWS_ANGLES, null, 2)}

قواعد السوبر ذهبي:
- اكتب "السوبر ذهبي" ولا تكتب "التوقع الذهبي".
- عند ذكر نقاط السوبر ذهبي استخدم: بالملي +10، الفائز +4، المتأهل +6، الطريقة +4، والسقف في خروج المغلوب 20 نقطة.
- إذا كان الحدث مرتبطًا بمباراة سوبر ذهبي، اجعلها فرصة للريمونتادا أو انقلاب الطاولة دون مبالغة أو اختراع.

قاعدة ذكر الأسماء وهي إلزامية جدًا:
- إذا كان الحدث يحتوي على members أو memberName أو userName أو leaderName أو secondName، يجب ذكر الاسم الحقيقي للعضو في البطاقة نفسها.
- لا تكتب بطاقة عن عضو موجود في البيانات بدون ذكر اسمه الحقيقي.
- ممنوع استخدام عبارات عامة بدل الاسم إذا كان الاسم موجودًا في البيانات.
- العبارات الممنوعة إذا كان الاسم موجودًا: ${JSON.stringify(GENERIC_MEMBER_WORDS)}.
- إذا كان الحدث يحتوي على اسمين مثل منافسة المتصدر والوصيف، يمكن ذكر الاسمين في نفس البطاقة فقط.
- إذا كان الحدث لا يحتوي على أي اسم، عندها فقط يمكن استخدام صياغة عامة.
- اذكر اسم العضو مرة واحدة فقط في البطاقة، ثم أكمل بالضمائر أو الوصف دون تكرار الاسم.

قواعد صارمة جدًا:
- اكتب 8 بطاقات بالضبط، لا أقل ولا أكثر.
- محتوى كل بطاقة يجب أن يكون بين 45 و75 كلمة تقريبًا.
- لا تجعل البطاقة قصيرة أو جملة واحدة فقط.
- كل بطاقة يجب أن تحتوي على سياق ثم تحليل مختصر ثم أثر الحدث على المنافسة.
- لا تكرر نفس المعنى داخل البطاقة.
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
- سوبر ذهبي.
- ضربة بالملي بعد الاحتساب.
- إنذار للمتصدر.
- دخول التوب 3.
- قفزة الترتيب.
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
1- بطاقة رئيسية قوية ومبنية على أهم حدث.
2- بطاقة تصريح أو تعليق استوديو بصياغة صحفية محترمة.
3- بطاقة رقم اليوم إذا وُجد رقم حقيقي واضح.
4- بطاقة وسام أو لقب إعلامي مستحق من البيانات.
5- بطاقة لقطة اليوم أو الحصان الأسود إذا وُجد حدث مناسب.
6- بطاقة تحت المجهر لعضو أو توقع أو مواجهة.
7- بطاقة حركة ترتيب: صعود أو تراجع أو ثبات إذا توفرت البيانات.
8- بطاقة ختامية بعنوان "كلمة الاستوديو" أو تنبيه مهم للجولة.

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

  if (event.type === "leader_under_pressure" && primaryName && secondaryName) {
    return {
      type: "main",
      icon: "🔥",
      title: "الصدارة تحت الضغط",
      content: `${primaryName} يبقى في الواجهة، لكن ${secondaryName} يقترب من المشهد بفارق ${getNumber(event.data.pointsDiff)} نقطة فقط. هذا التقارب يجعل الجولة القادمة اختبارًا مباشرًا للأعصاب، لأن أي توقع صحيح قد يعيد توزيع الضغط في القمة. المنافسة هنا لم تعد مجرد ترتيب، بل صراع على التفاصيل الصغيرة.`,
      priority: basePriority,
    };
  }

  if (event.type === "exact_after_calculation") {
    return {
      type: "main",
      icon: "🎯",
      title: "ضربة بالملي تغيّر المشهد",
      content: `${primaryName} حضر في العنوان الأبرز بعد احتساب مباراة ${getText(event.data.matchName)}، بعدما أصاب النتيجة ${getNumber(event.data.homeScore)} - ${getNumber(event.data.awayScore)} وحصد ${getNumber(event.data.points)} نقاط. مثل هذه الضربة الدقيقة تمنح صاحبها دفعة قوية، وتضع بقية المنافسين تحت ضغط القراءة الصحيحة في المباريات القادمة.`,
      priority: basePriority,
    };
  }

  if (event.type === "round_star") {
    return {
      type: "badge",
      icon: "🔥",
      title: "نجم الجولة",
      content: `${primaryName} كان الاسم الأبرز في نتائج الجولة الأخيرة، بعدما جمع ${getNumber(event.data.roundPoints)} نقاط من ${getNumber(event.data.calculatedCount)} توقعات محتسبة. هذه الحصيلة لا تعكس الحظ فقط، بل قراءة جيدة لمسار المباريات، وقد تمنحه حضورًا أقوى في حسابات المنافسة خلال المرحلة القادمة.`,
      priority: basePriority,
    };
  }

  if (event.type === "biggest_climb") {
    return {
      type: "number",
      icon: "🚀",
      title: "قفزة الترتيب",
      content: `${primaryName} قدّم واحدة من أبرز حركات الترتيب، بعدما صعد ${getNumber(event.data.rankChange)} مراكز ووصل إلى المركز ${getNumber(event.data.currentRank)}. هذا الصعود السريع يمنحه دفعة معنوية مهمة، ويؤكد أن لوحة الصدارة ما زالت قابلة للاشتعال مع كل جولة جديدة.`,
      priority: basePriority,
    };
  }

  if (event.type === "biggest_drop") {
    return {
      type: "funny",
      icon: "📉",
      title: "سقوط مفاجئ يحتاج ردًا",
      content: `${primaryName} تراجع ${getNumber(event.data.rankChange)} مراكز في حركة لافتة داخل الجدول. القراءة الهادئة تقول إن الهبوط مؤلم، لكنه لا يعني نهاية المنافسة. الطريق ما زال مفتوحًا للتعويض، بشرط أن تأتي الجولة القادمة بتركيز أعلى وقراءة أدق للمباريات.`,
      priority: basePriority,
    };
  }

  if (event.type === "best_streak") {
    return {
      type: "badge",
      icon: "🔥",
      title: "سلسلة نارية",
      content: `${primaryName} يستحق وسام اليوم بعد سلسلة وصلت إلى ${getNumber(event.data.bestStreak)} توقعات صحيحة. الاستمرارية بهذا الشكل تمنح المنافسة بُعدًا مختلفًا، لأنها تكشف عضوًا لا يعتمد على لقطة واحدة فقط، بل يحافظ على إيقاع ثابت في قراءة النتائج.`,
      priority: basePriority,
    };
  }

  if (event.type === "highest_accuracy") {
    return {
      type: "number",
      icon: "📊",
      title: "ملك الدقة",
      content: `${primaryName} يملك دقة تبلغ ${getNumber(event.data.accuracy)}% من أصل ${getNumber(event.data.total)} توقعات. هذا الرقم لا يظهر من فراغ، بل يعكس قراءة جيدة للمباريات وقدرة على اختيار النتائج بعناية. في سباق طويل، الدقة قد تكون أهم من كثرة المحاولات.`,
      priority: basePriority,
    };
  }

  if (event.type === "most_exact_results") {
    return {
      type: "badge",
      icon: "🎯",
      title: "قناص النتائج",
      content: `${primaryName} وصل إلى ${getNumber(event.data.exact)} توقعات دقيقة بالملي. هذا النوع من الأرقام يصنع الفارق في المراحل الحاسمة، لأن النتيجة الدقيقة تمنح أثرًا أكبر من مجرد معرفة الفائز. حضوره هنا يضعه ضمن الأسماء التي تستحق المتابعة.`,
      priority: basePriority,
    };
  }

  if (event.type === "best_comeback") {
    return {
      type: "badge",
      icon: "⚡",
      title: "أفضل عودة",
      content: `${primaryName} عاد إلى الصورة بحركة لافتة، بعدما صعد ${getNumber(event.data.rankChange)} مراكز ووصل إلى المركز ${getNumber(event.data.currentRank)}. هذه العودة لا تعني تحسنًا رقميًا فقط، بل رسالة واضحة بأن التعويض ممكن متى حضرت القراءة الصحيحة والثبات في التوقعات.`,
      priority: basePriority,
    };
  }

  if (event.type === "most_stable") {
    return {
      type: "number",
      icon: "📈",
      title: "جدار الثبات",
      content: `${primaryName} يحافظ على حضوره بثبات، مع دقة ${getNumber(event.data.accuracy)}% من ${getNumber(event.data.total)} توقعات. الثبات هنا قيمة لا تقل أهمية عن الصعود السريع، لأنه يمنح صاحبه موقعًا آمنًا نسبيًا ويجعله حاضرًا في حسابات الجولات القادمة.`,
      priority: basePriority,
    };
  }

  if (event.type === "black_horse") {
    return {
      type: "badge",
      icon: "🐎",
      title: "الحصان الأسود",
      content: `${primaryName} يتحرك بعيدًا عن الضجيج، لكن أرقامه تشير إلى حضور لا يمكن تجاهله. دقة تصل إلى ${getNumber(event.data.accuracy)}% تضعه ضمن الأسماء التي قد تفاجئ المنافسين. مثل هذا الهدوء قد يتحول سريعًا إلى قصة كبيرة في لوحة الصدارة.`,
      priority: basePriority,
    };
  }

  if (event.type === "worst_luck") {
    return {
      type: "funny",
      icon: "😅",
      title: "الأكثر حظًا سيئًا",
      content: `${primaryName} واجه يومًا صعبًا مع ${getNumber(event.data.wrong)} توقعات غير موفقة من أصل ${getNumber(event.data.total)}. الاستوديو يقرأها بروح رياضية: الحظ يتغير، والمنافسة لا تنتهي من جولة واحدة. المهم أن يعود التركيز قبل المباراة القادمة، فالتعويض وارد دائمًا.`,
      priority: basePriority,
    };
  }

  if (event.type === "forgot_prediction") {
    return {
      type: "funny",
      icon: "😴",
      title: "صح النوم",
      content: `${primaryName} غاب عن توقع مباراة ${getText(event.data.matchName)}. في بطولة بهذا الإيقاع، تفويت مباراة واحدة قد يترك أثرًا واضحًا على الجدول. الاستوديو يذكّر بأن الحضور قبل صافرة البداية لا يقل أهمية عن دقة التوقع نفسها.`,
      priority: basePriority,
    };
  }

  if (event.type === "dangerous_prediction") {
    return {
      type: "watch",
      icon: "🎲",
      title: "توقع تحت المجهر",
      content: `${primaryName} اختار نتيجة جريئة في مباراة ${getText(event.data.matchName)}: ${getNumber(event.data.homeScore)} - ${getNumber(event.data.awayScore)}. إذا تحققت، فقد تتحول إلى واحدة من لقطات الجولة. مثل هذه التوقعات تحمل مخاطرة عالية، لكنها قد تمنح صاحبها قفزة مهمة.`,
      priority: basePriority,
    };
  }

  if (event.type === "top3_spotlight" || event.type === "top10_spotlight") {
    return {
      type: "watch",
      icon: event.type === "top3_spotlight" ? "🥉" : "🔟",
      title: "تحت المجهر",
      content: `${primaryName} يقف في المركز ${getNumber(event.data.currentRank)} ومعه ${getNumber(event.data.points)} نقطة. هذه المنطقة لا تمنح الهدوء؛ كل توقع صحيح قد يرفع السقف، وكل تعثر قد يفتح الباب للمطاردين. لذلك تبدو الجولات القادمة حاسمة في تثبيت موقعه.`,
      priority: basePriority,
    };
  }

  if (event.type === "chasing_pack") {
    const leaderName = getText(event.data.leaderName);

    return {
      type: "watch",
      icon: "🐎",
      title: "حكاية الريمونتادا",
      content: `${primaryName} يطارد من المركز ${getNumber(event.data.currentRank)}، ولا يفصله عن ${leaderName || "صاحب الصدارة"} سوى ${getNumber(event.data.pointsBehindLeader)} نقطة. هذا النوع من المطاردة يستحق المتابعة، لأن الاقتراب بهذا الشكل يجعل كل توقع قادم فرصة لتغيير موازين المنافسة.`,
      priority: basePriority,
    };
  }

  if (event.type === "winner_after_calculation") {
    return {
      type: "watch",
      icon: "✅",
      title: "قراءة ذكية للفائز",
      content: `${primaryName} خرج من مباراة ${getText(event.data.matchName)} بنقاط مستحقة بعد قراءة الفائز بشكل صحيح. هذا النوع من التوقعات يحافظ على الحضور في الجدول، حتى لو لم تكن النتيجة بالملي. الاستمرارية في جمع النقاط الصغيرة قد تصنع فارقًا كبيرًا لاحقًا.`,
      priority: basePriority,
    };
  }

  if (event.type === "missed_after_calculation") {
    return {
      type: "funny",
      icon: "😬",
      title: "زلة توقع تحتاج ردًا",
      content: `${primaryName} خرج من مباراة ${getText(event.data.matchName)} دون نقاط. النتيجة لم تخدمه هذه المرة، لكن الطريق ما زال مفتوحًا للتعويض. مثل هذه اللقطات تذكّر الجميع بأن قراءة المباراة قبل البداية قد تكون أصعب مما تبدو بعد صافرة النهاية.`,
      priority: basePriority,
    };
  }

  if (event.type === "studio_word") {
    return {
      type: "watch",
      icon: "🎙️",
      title: "كلمة الاستوديو",
      content: `الصورة العامة تقول إن المنافسة لا تزال مفتوحة. عدد الأعضاء أصحاب التوقعات المحتسبة بلغ ${getNumber(event.data.activeMembersCount)}، وهناك ${getNumber(event.data.scheduledMatchesCount)} مباريات قادمة على الرادار. هذه الأرقام تجعل كل جولة فرصة جديدة لتغيير المشهد وإعادة ترتيب المراكز.`,
      priority: basePriority,
    };
  }

  if (
    event.type === "strong_match_alert" ||
    event.type === "golden_prediction_alert"
  ) {
    return {
      type: event.type === "golden_prediction_alert" ? "main" : "watch",
      icon: event.type === "golden_prediction_alert" ? "🚀" : "⚽",
      title:
        event.type === "golden_prediction_alert"
          ? "السوبر ذهبي يفتح باب الريمونتادا"
          : "مباراة قد تعيد ترتيب الأوراق",
      content:
        event.type === "golden_prediction_alert"
          ? `استوديو التحدي يضع مباراة ${getText(event.data.matchName)} في واجهة المتابعة. السوبر ذهبي هنا ليس مجرد توقع عابر؛ بالملي يمنح +10، والفائز +4، وفي خروج المغلوب قد تصل الضربة الكاملة إلى 20 نقطة. لذلك تبدو المواجهة فرصة ريمونتادا حقيقية لمن يقرأ التفاصيل قبل صافرة البداية.`
          : `استوديو التحدي يضع مباراة ${getText(event.data.matchName)} في واجهة المتابعة. هذا النوع من المواجهات يكشف من يقرأ التفاصيل الصغيرة قبل صافرة البداية، ومن يغامر في التوقيت الصحيح. النتيجة هنا قد لا تكون مجرد توقع عابر، بل نقطة تحول في سباق الترتيب.`,
      priority: basePriority,
    };
  }

  if (primaryName) {
    return {
      type: "watch",
      icon: "👀",
      title: event.title || "تحت المجهر",
      content: `${primaryName} يدخل نشرة اليوم من زاوية مستحقة. الأرقام المرتبطة بهذا الحدث تمنحه حضورًا واضحًا في المشهد. الاستوديو يضعه تحت المتابعة لأن مثل هذه التفاصيل قد تتحول إلى أثر مباشر في الجولات القادمة.`,
      priority: basePriority,
    };
  }

  return {
    type: "watch",
    icon: "🎙️",
    title: event.title || "كلمة الاستوديو",
    content:
      "استوديو التحدي يرصد حركة جديدة في المنافسة. الجولات القادمة ستكشف من يملك قراءة ثابتة، ومن ينتظر لحظة الانفجار. لا توجد نقطة صغيرة في سباق طويل، فكل توقع قد يفتح بابًا جديدًا في الترتيب.",
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
        "استوديو التحدي يواصل قراءة التفاصيل. لا توجد نتيجة صغيرة في سباق النقاط، فكل توقع قد يكون بداية لتحول جديد. الجولات القادمة ستكشف من يحافظ على تركيزه، ومن ينتظر فرصة العودة إلى دائرة المنافسة.",
      priority: 40,
    },
    {
      type: "number",
      icon: "📊",
      title: "إشارة رقمية",
      content:
        "لوحة الصدارة لا تتحرك بالأسماء فقط، بل بالأرقام الدقيقة: نقاط، توقعات صحيحة، ونتائج بالملي تصنع الفارق. قراءة هذه الأرقام تمنح الاستوديو صورة أوضح عن شكل المنافسة قبل الجولات القادمة.",
      priority: 39,
    },
    {
      type: "badge",
      icon: "🏅",
      title: "رسالة المنافسة",
      content:
        "الحضور المستمر في التوقعات يمنح صاحبه فرصة دائمة للعودة. الغياب عن مباراة واحدة قد يكون مكلفًا، لكن الثبات في الجولات التالية قادر على تعويض الكثير وإعادة العضو إلى المشهد من جديد.",
      priority: 38,
    },
  ];

  return fallbackCards[index % fallbackCards.length];
}

function expandCardContent(card: AiCard) {
  const content = cleanContent(card.content);

  if (content.length >= 230) {
    return {
      ...card,
      content,
    };
  }

  const additions: Record<AiCard["type"], string> = {
    main:
      "هذه اللقطة تمنح النشرة وزنًا خاصًا، لأنها لا تقف عند الرقم وحده، بل تكشف كيف يمكن لتفصيل واحد أن يغيّر قراءة المنافسة ويزيد الضغط على بقية الأسماء في الجولات القادمة.",
    quote:
      "قراءة الاستوديو لهذا الحدث تؤكد أن المنافسة لم تعد تعتمد على الحضور فقط، بل على دقة الاختيار وتوقيت التوقع، خصوصًا مع تقارب النقاط واقتراب المراحل الأكثر حساسية.",
    number:
      "الأرقام هنا ليست مجرد إحصائية عابرة، بل مؤشر واضح على اتجاه المنافسة. كل رقم يحمل خلفه قراءة مختلفة، وقد يكون سببًا في صعود مفاجئ أو ضغط مباشر على المراكز المتقدمة.",
    badge:
      "هذا الوسام لا يأتي من فراغ، بل من أثر واضح داخل الجدول. الاستمرارية والدقة في مثل هذه الجولات تمنح العضو حضورًا إعلاميًا مستحقًا وتجعله ضمن الأسماء التي تستحق المتابعة.",
    funny:
      "الاستوديو يتعامل مع اللقطة بروح خفيفة، لكن الرسالة واضحة: البطولة طويلة، والتعويض ممكن في أي جولة. المهم أن يبقى التركيز حاضرًا قبل كل مباراة قادمة.",
    watch:
      "هذه الزاوية تستحق المتابعة لأنها قد تتحول من مجرد ملاحظة إلى حدث مؤثر. الجولات القادمة ستكشف إن كان هذا التحرك بداية لقصة أكبر داخل لوحة الصدارة.",
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
  const finalCards: AiCard[] = [];

  const memberEvents = events.filter((event) => eventHasMembers(event));
  const generalEvents = events.filter((event) => !eventHasMembers(event));

  memberEvents.forEach((event, index) => {
    if (finalCards.length >= REQUIRED_CARDS_COUNT) return;
    if (usedEventIds.has(event.id)) return;

    const localCard = buildLocalCardFromEvent(event, usedMembers, index);
    if (!localCard) return;

    const text = `${localCard.title}\n${localCard.content}`;
    const eventMembers = getEventMembers(event);
    const hasAtLeastOneEventMember = eventMembers.some((name) =>
      text.includes(name),
    );

    if (!hasAtLeastOneEventMember) return;
    if (hasForbiddenGenericWord(localCard)) return;

    usedEventIds.add(event.id);
    finalCards.push(expandCardContent(localCard));
  });

  aiCards.forEach((card) => {
    if (finalCards.length >= REQUIRED_CARDS_COUNT) return;

    const cardText = `${card.title}\n${card.content}`;
    const cardMembers = allNames.filter((name) => cardText.includes(name));

    if (cardMembers.length === 0) return;
    if (cardMembers.some((name) => usedMembers.has(name))) return;
    if (hasForbiddenGenericWord(card)) return;

    const matchedEvent = memberEvents.find((event) => {
      if (usedEventIds.has(event.id)) return false;
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

    usedEventIds.add(matchedEvent.id);
    finalCards.push(expandCardContent(cleanedCard));
  });

  generalEvents.forEach((event, index) => {
    if (finalCards.length >= REQUIRED_CARDS_COUNT) return;
    if (usedEventIds.has(event.id)) return;

    const localCard = buildLocalCardFromEvent(event, usedMembers, index);
    if (!localCard) return;

    usedEventIds.add(event.id);
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