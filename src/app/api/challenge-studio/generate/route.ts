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

const EDITORIAL_SECTIONS = [
  { icon: "👑", title: "ملك التوقعات", goal: "إبراز المتصدر إذا كان الحدث متاحًا." },
  { icon: "🐎", title: "الحصان الأسود", goal: "إبراز عضو صاعد أو مفاجئ من البيانات." },
  { icon: "🚀", title: "أسرع صعود", goal: "إبراز أكبر صعود حقيقي في الترتيب." },
  { icon: "📉", title: "أكبر تراجع", goal: "تناول أكبر تراجع بلغة محترمة." },
  { icon: "🎯", title: "قناص النتائج", goal: "إبراز من أصاب نتائج دقيقة." },
  { icon: "🔥", title: "نجم الجولة", goal: "اختيار صاحب أفضل أثر في الجولة." },
  { icon: "⚡", title: "أفضل عودة", goal: "إبراز من عاد للمنافسة بعد تحسن واضح." },
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
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getEventMembers(event: ChallengeStudioEvent) {
  return Array.isArray(event.members)
    ? event.members.map(normalizeMemberName).filter(Boolean)
    : [];
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
  recentMembers: string[]
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

function extractMentionedMembersFromCards(
  cards: AiCard[],
  events: ChallengeStudioEvent[],
  summary = ""
) {
  const allNames = Array.from(
    new Set(events.flatMap((event) => getEventMembers(event)).filter(Boolean))
  ).sort((a, b) => b.length - a.length);

  const text = `${summary}\n${cards
    .map((card) => `${card.title}\n${card.content}`)
    .join("\n")}`;

  return allNames.filter((name) => text.includes(name));
}

function countOccurrences(text: string, value: string) {
  if (!value) return 0;
  return text.split(value).length - 1;
}

function findRepeatedMemberMentions(
  cards: AiCard[],
  events: ChallengeStudioEvent[],
  summary = ""
) {
  const allNames = Array.from(
    new Set(events.flatMap((event) => getEventMembers(event)).filter(Boolean))
  ).sort((a, b) => b.length - a.length);

  const fullText = `${summary}\n${cards
    .map((card) => `${card.title}\n${card.content}`)
    .join("\n")}`;

  return allNames.filter((name) => countOccurrences(fullText, name) > 1);
}

function findGenericMemberWords(cards: AiCard[], summary = "") {
  const forbidden = [
    "أحد الأعضاء",
    "أحد المشاركين",
    "عضو بارز",
    "عضو لافت",
    "أحد المنافسين",
    "أحد المتسابقين",
    "متسابق",
    "مشارك",
  ];

  const fullText = `${summary}\n${cards
    .map((card) => `${card.title}\n${card.content}`)
    .join("\n")}`;

  return forbidden.filter((word) => fullText.includes(word));
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
- إذا كان الحدث يحتوي على members أو memberName أو userName أو leaderName أو secondName، يجب ذكر الاسم الحقيقي للعضو في البطاقة.
- ممنوع استخدام عبارات عامة بدل الاسم إذا كان الاسم موجودًا في البيانات.
- العبارات الممنوعة إذا كان الاسم موجودًا: "أحد الأعضاء"، "أحد المشاركين"، "عضو بارز"، "عضو لافت"، "أحد المنافسين"، "متسابق"، "مشارك".
- إذا كان الحدث يحتوي على اسمين مثل منافسة المتصدر والوصيف، يمكن ذكر الاسمين في نفس البطاقة فقط.
- إذا كان الحدث لا يحتوي على أي اسم، عندها فقط يمكن استخدام صياغة عامة.
- اذكر اسم العضو مرة واحدة فقط في البطاقة، ثم أكمل بالضمائر أو الوصف دون تكرار الاسم.

قواعد صارمة جدًا:
- اكتب 8 بطاقات بالضبط، لا أقل ولا أكثر.
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

function buildRepairPrompt(input: {
  events: ChallengeStudioEvent[];
  recentMembers: string[];
  previousCards: AiCard[];
  previousSummary: string;
  repeatedMembers: string[];
  genericWords: string[];
}) {
  return `
أعد كتابة نشرة "استوديو التحدي" من جديد لأن المسودة السابقة خالفت قواعد التحرير.

أسباب الإعادة:
- عدد البطاقات يجب أن يكون ${REQUIRED_CARDS_COUNT} بالضبط.
- الأسماء التالية تكررت ويجب منع تكرارها:
${JSON.stringify(input.repeatedMembers, null, 2)}
- ظهرت عبارات عامة بدل أسماء حقيقية، وهي ممنوعة إذا كانت البيانات تحتوي على أسماء:
${JSON.stringify(input.genericWords, null, 2)}

المسودة السابقة:
${JSON.stringify(
  {
    summary: input.previousSummary,
    cards: input.previousCards,
  },
  null,
  2
)}

استخدم القواعد الأصلية التالية كما هي، وأخرج JSON فقط:
${buildPrompt(input.events, input.recentMembers)}
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

export async function POST() {
  try {
    const [events, recentMembers] = await Promise.all([
      buildChallengeStudioEvents(),
      getRecentlyMentionedMembers(),
    ]);

    if (events.length === 0) {
      return NextResponse.json(
        { error: "لا توجد أحداث كافية لتوليد النشرة" },
        { status: 400 }
      );
    }

    const filteredEvents = filterEventsForCooldown(events, recentMembers);
    const mainPrompt = buildPrompt(filteredEvents, recentMembers);

    let parsed = parseAiJson(await requestAiBulletin(mainPrompt));
    let cards = normalizeCards(Array.isArray(parsed.cards) ? parsed.cards : []);
    let summary = normalizeSummary(
      parsed.summary,
      filteredEvents[0]?.title || "نشرة استوديو التحدي"
    );

    let repeatedMembers = findRepeatedMemberMentions(
      cards,
      filteredEvents,
      summary
    );

    let genericWords = findGenericMemberWords(cards, summary);

    if (
      cards.length < REQUIRED_CARDS_COUNT ||
      repeatedMembers.length > 0 ||
      genericWords.length > 0
    ) {
      const repairPrompt = buildRepairPrompt({
        events: filteredEvents,
        recentMembers,
        previousCards: cards,
        previousSummary: summary,
        repeatedMembers,
        genericWords,
      });

      parsed = parseAiJson(await requestAiBulletin(repairPrompt, 0.45));
      cards = normalizeCards(Array.isArray(parsed.cards) ? parsed.cards : []);
      summary = normalizeSummary(
        parsed.summary,
        filteredEvents[0]?.title || "نشرة استوديو التحدي"
      );

      repeatedMembers = findRepeatedMemberMentions(
        cards,
        filteredEvents,
        summary
      );

      genericWords = findGenericMemberWords(cards, summary);
    }

    if (cards.length < REQUIRED_CARDS_COUNT) {
      return NextResponse.json(
        { error: "الذكاء الاصطناعي لم يرجع 8 بطاقات، أعد المحاولة" },
        { status: 500 }
      );
    }

    if (repeatedMembers.length > 0) {
      return NextResponse.json(
        {
          error:
            "تم إيقاف النشرة لأن اسم عضو تكرر داخلها. أعد التوليد للحصول على نسخة مختلفة.",
          repeatedMembers,
        },
        { status: 500 }
      );
    }

    if (genericWords.length > 0) {
      return NextResponse.json(
        {
          error:
            "تم إيقاف النشرة لأنها استخدمت عبارات عامة بدل أسماء الأعضاء. أعد التوليد.",
          genericWords,
        },
        { status: 500 }
      );
    }

    const mentionedMembers = extractMentionedMembersFromCards(
      cards,
      filteredEvents,
      summary
    );

    return NextResponse.json({
      date: getTodaySaudiDate(),
      summary,
      cards,
      events: filteredEvents,
      mentionedMembers,
      recentMembers,
    });
  } catch (error) {
    console.error("AI challenge studio generation error:", error);

    return NextResponse.json(
      { error: "تعذر توليد النشرة بالذكاء الاصطناعي" },
      { status: 500 }
    );
  }
}