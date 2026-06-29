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

const EXCEPTIONAL_EVENT_TYPES = new Set<ChallengeStudioEvent["type"]>([
  "golden_prediction_alert",
  "exact_after_calculation",
  "leader_under_pressure",
  "biggest_climb",
  "top3_spotlight",
  "best_streak",
  "dangerous_prediction",
]);

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

async function getRecentlyMentionedMembers() {
  const bulletins = await getChallengeStudioBulletins(20);
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;

  const names = new Set<string>();

  bulletins.forEach((bulletin) => {
    const createdTime = getTimeValue(bulletin.createdAt);
    if (!createdTime || createdTime < cutoff) return;

    bulletin.mentionedMembers.forEach((name) => {
      const cleanName = String(name || "").trim();
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
  const recentSet = new Set(recentMembers);

  const preferred = events.filter((event) => {
    if (event.members.length === 0) return true;
    if (isExceptionalEvent(event)) return true;
    return !event.members.some((member) => recentSet.has(member));
  });

  if (preferred.length >= 8) return preferred;

  return events;
}

function extractMentionedMembersFromCards(
  cards: AiCard[],
  events: ChallengeStudioEvent[]
) {
  const allNames = Array.from(
    new Set(events.flatMap((event) => event.members).filter(Boolean))
  );

  const text = cards
    .map((card) => `${card.title}\n${card.content}`)
    .join("\n");

  return allNames.filter((name) => text.includes(name));
}

function buildPrompt(events: ChallengeStudioEvent[], recentMembers: string[]) {
  return `
أنت محرر ومذيع رياضي سعودي داخل منصة توقعات كأس العالم 2026.

اكتب نشرة يومية باسم "استوديو التحدي" باللهجة السعودية الخفيفة.

المطلوب:
- اكتب 8 بطاقات بالضبط، لا أقل ولا أكثر.
- اجعل النشرة حماسية جدًا وكأنها برنامج رياضي مباشر.
- الخبر الرئيسي يكون قويًا ومشوقًا وطويلًا نسبيًا.
- بقية البطاقات قصيرة إلى متوسطة، لكنها مليئة بالحماس.
- لا تكرر اسم أي عضو في أكثر من بطاقة واحدة.
- لا تذكر عضوًا ظهر خلال آخر 48 ساعة إلا إذا كان عنده حدث مهم جدًا.
- الأحداث المهمة التي تسمح بتجاوز قاعدة 48 ساعة: توقع ذهبي، جابها بالملي، ضغط على الصدارة، دخول التوب 3، أكبر صعود، أفضل سلسلة، توقع خطير.
- إذا ظهر عضو في الخبر الرئيسي، لا تستخدمه في باقي البطاقات إلا لحدث استثنائي جدًا.
- وزّع الظهور الإعلامي على أكثر من عضو.
- استخدم المركز الثالث، التوب 10، المطاردين، والقادمين من الخلف إذا كانت ضمن الأحداث.
- إذا وُجد توقع ذهبي، اجعله حدثًا ناريًا لأن النتيجة بالملي قد تقلب لوحة الصدارة.
- إذا وُجدت مباراة قوية قادمة، أعطها بطاقة حماسية.
- إذا وُجد توقع خطير، اذكره كحدث لافت.
- بعد احتساب النتائج، ركّز على من جابها بالملي، ومن أخذ نقاط الفائز، ومن ضاعت عليه النقاط.
- أضف بطاقة لطيفة عن "الأكثر حظًا سيئًا" إذا كان الحدث موجودًا، بدون إحراج أو تجريح.
- لا تكتب عبارة: "تصريح غير حقيقي" أو "للترفيه فقط" داخل بطاقة التصريح.
- لا تستخدم صياغة باردة أو رسمية جدًا.
- استخدم أسلوبًا سعوديًا رياضيًا مثل: "ولعت"، "دخل على الخط"، "قلب الطاولة"، "ماهي سهلة"، "الجولة جاية نار".
- الطقطقة تكون خفيفة ومحترمة.
- ممنوع التجريح أو الإهانة.
- لا تخترع نقاطًا أو ترتيبًا أو أسماء غير موجودة.
- اعتمد فقط على الأحداث المرسلة لك.
- دقق النص لغويًا قبل الإخراج.
- صحح الإملاء والنحو وعلامات الترقيم.
- تجنب التراكيب الركيكة أو الجمل المترجمة حرفيًا.
- لا تكرر الكلمات بشكل مزعج.
- لا تستخدم Markdown.
- أرجع JSON فقط بدون أي شرح.

أعضاء ظهروا في آخر 48 ساعة، تجنب ذكرهم إلا لحدث مهم:
${JSON.stringify(recentMembers, null, 2)}

أنواع البطاقات المسموحة:
main, quote, number, badge, funny, watch

لازم تكون البطاقات الثمانية بهذا التنوع قدر الإمكان:
1- خبر رئيسي
2- تصريح ناري
3- رقم اليوم
4- وسام اليوم
5- لقطة اليوم
6- تحت المجهر
7- مواجهة أو تحدي مباشر
8- حركة الترتيب أو تنبيه مهم

صيغة الإخراج:
{
  "summary": "عنوان مختصر للنشرة",
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
    .slice(0, 8)
    .map((card, index) => ({
      type: normalizeCardType(card.type),
      icon: card.icon.trim().slice(0, 6) || "🎙️",
      title: card.title.trim().slice(0, 80),
      content: cleanContent(card.content).slice(0, 1200),
      priority:
        typeof card.priority === "number" && Number.isFinite(card.priority)
          ? card.priority
          : 100 - index,
    }));
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

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.9,
      messages: [
        {
          role: "user",
          content: buildPrompt(filteredEvents, recentMembers),
        },
      ],
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    const cards = normalizeCards(Array.isArray(parsed.cards) ? parsed.cards : []);

    if (cards.length < 8) {
      return NextResponse.json(
        { error: "الذكاء الاصطناعي لم يرجع 8 بطاقات، أعد المحاولة" },
        { status: 500 }
      );
    }

    const mentionedMembers = extractMentionedMembersFromCards(cards, events);

    return NextResponse.json({
      date: getTodaySaudiDate(),
      summary: String(
        parsed.summary || filteredEvents[0].title || "نشرة استوديو التحدي"
      ).slice(0, 120),
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