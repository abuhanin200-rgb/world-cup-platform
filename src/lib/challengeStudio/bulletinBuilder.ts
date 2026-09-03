import type { ChallengeStudioCard } from "@/lib/challengeStudio";
import {
  buildChallengeStudioEvents,
  type ChallengeStudioEvent,
} from "@/lib/challengeStudio/eventEngine";

const REQUIRED_CARDS_COUNT = 8;

function getTodaySaudiDate() {
  return new Intl.DateTimeFormat("ar-SA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

function getNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getText(value: unknown) {
  return String(value || "").trim();
}

function getPrimaryMember(event?: ChallengeStudioEvent) {
  if (!event) return "";
  return (
    getText(event.data.memberName) ||
    getText(event.data.leaderName) ||
    getText(event.members[0])
  );
}

function hasUsedMember(
  event: ChallengeStudioEvent | undefined,
  usedMembers: Set<string>
) {
  if (!event) return true;
  return event.members.some((member) => usedMembers.has(member));
}

function markMembers(
  event: ChallengeStudioEvent | undefined,
  usedMembers: Set<string>
) {
  if (!event) return;

  event.members.forEach((member) => {
    if (member) usedMembers.add(member);
  });
}

function pickEvent(
  events: ChallengeStudioEvent[],
  usedMembers: Set<string>,
  types: ChallengeStudioEvent["type"][]
) {
  return events
    .filter((event) => types.includes(event.type))
    .find((event) => !hasUsedMember(event, usedMembers));
}

function cleanCard(card: ChallengeStudioCard): ChallengeStudioCard {
  return {
    ...card,
    icon: card.icon.trim() || "🎙️",
    title: card.title.trim().slice(0, 80),
    content: card.content.trim().slice(0, 1200),
    priority: Number.isFinite(Number(card.priority))
      ? Number(card.priority)
      : 50,
  };
}

function pushCard(cards: ChallengeStudioCard[], card: ChallengeStudioCard) {
  if (cards.length >= REQUIRED_CARDS_COUNT) return;
  cards.push(cleanCard(card));
}

function buildMainCard(event: ChallengeStudioEvent): ChallengeStudioCard {
  if (event.type === "golden_prediction_alert") {
    return {
      type: "main",
      icon: "🚀",
      title: "السوبر ذهبي يفتح باب الريمونتادا",
      content: `تتجه أنظار استوديو التحدي إلى مباراة ${getText(
        event.data.matchName
      )}، حيث تحمل بطاقة السوبر ذهبي قيمة أعلى وقد تغيّر حسابات المنافسة بالكامل.

النتيجة الدقيقة هنا ليست تفصيلًا عابرًا؛ فهي تمنح 10 نقاط، وفي مباريات خروج المغلوب قد تصل الضربة الكاملة إلى 20 نقطة. هذه فرصة حقيقية للمطاردين لقلب الطاولة. تبقّى نحو ${getNumber(
        event.data.hoursUntilStart
      )} ساعة على صافرة البداية، والقراءة الصحيحة قد تصنع فارقًا كبيرًا.`,
      priority: 115,
    };
  }

  if (event.type === "exact_after_calculation") {
    return {
      type: "main",
      icon: "🎯",
      title: "ضربة بالملي تغيّر المشهد",
      content: `${getText(
        event.data.memberName
      )} تصدّر العنوان الأبرز بعد احتساب مباراة ${getText(
        event.data.matchName
      )}، بعدما أصاب النتيجة ${getNumber(
        event.data.homeScore
      )} - ${getNumber(event.data.awayScore)} وحصد ${getNumber(
        event.data.points
      )} نقاط.

مثل هذه الضربات الدقيقة لا تمنح نقاطًا فقط، بل ترفع الضغط على المنافسين وتعيد قراءة لوحة الصدارة من زاوية مختلفة.`,
      priority: 112,
    };
  }

  if (event.type === "round_star") {
    return {
      type: "main",
      icon: "🔥",
      title: "نجم الجولة يفرض حضوره",
      content: `${getText(
        event.data.memberName
      )} كان الاسم الأبرز في نتائج الجولة الأخيرة، بعدما جمع ${getNumber(
        event.data.roundPoints
      )} نقاط من ${getNumber(event.data.calculatedCount)} توقعات محتسبة.

الأرقام تكشف تأثيرًا واضحًا: ${getNumber(
        event.data.correctCount
      )} توقعات ناجحة، منها ${getNumber(
        event.data.exactCount
      )} نتيجة دقيقة. هذه حصيلة كافية لوضع اسمه في واجهة الاستوديو اليوم.`,
      priority: 110,
    };
  }

  if (event.type === "leader_under_pressure") {
    return {
      type: "main",
      icon: "🔥",
      title: "إنذار للمتصدر",
      content: `${getText(
        event.data.leaderName
      )} لا يزال في الواجهة، لكن الفارق مع أقرب المطاردين لم يعد مريحًا؛ إذ يقف ${getText(
        event.data.secondName
      )} على بعد ${getNumber(event.data.pointsDiff)} نقطة فقط.

هذه المسافة القصيرة تجعل كل مباراة قادمة اختبارًا مباشرًا للأعصاب، وأي تعثر قد يفتح الباب لتغيير شكل القمة.`,
      priority: 106,
    };
  }

  if (event.type === "biggest_climb") {
    return {
      type: "main",
      icon: "🚀",
      title: "قفزة الترتيب الأقوى",
      content: `${getText(
        event.data.memberName
      )} قدّم واحدة من أبرز حركات الترتيب، بعدما تقدّم ${getNumber(
        event.data.rankChange
      )} مراكز دفعة واحدة.

هذا الصعود لا يمر مرورًا عاديًا، لأنه يعكس تحسنًا مؤثرًا في التوقيت المناسب، ويضع صاحبه ضمن الأسماء التي تستحق المتابعة.`,
      priority: 100,
    };
  }

  if (event.type === "top3_spotlight") {
    return {
      type: "main",
      icon: "🥉",
      title: "المركز الثالث يدخل دائرة الضوء",
      content: `${getText(event.data.memberName)} يتمركز الآن في المرتبة ${getNumber(
        event.data.currentRank
      )} برصيد ${getNumber(event.data.points)} نقطة.

وجوده داخل منطقة التوب 3 يمنح المنافسة طابعًا أكثر حساسية، لأن الفارق في هذه المنطقة لا يحتمل خسارة سهلة أو توقعًا عابرًا.`,
      priority: 100,
    };
  }

  if (event.type === "strong_match_alert") {
    return {
      type: "main",
      icon: "⚽",
      title: "قنبلة الجولة على الأبواب",
      content: `استوديو التحدي يضع مباراة ${getText(
        event.data.matchName
      )} في واجهة المتابعة.

هذا النوع من المواجهات لا يختبر معرفة الأعضاء فقط، بل يكشف من يقرأ التفاصيل الصغيرة قبل صافرة البداية، ومن يغامر في التوقيت الصحيح.`,
      priority: 96,
    };
  }

  if (event.type === "best_comeback") {
    return {
      type: "main",
      icon: "⚡",
      title: "أفضل عودة في المشهد",
      content: `${getText(
        event.data.memberName
      )} عاد إلى الصورة بحركة لافتة، بعدما صعد ${getNumber(
        event.data.rankChange
      )} مراكز ووصل إلى المركز ${getNumber(event.data.currentRank)}.

العودة هنا ليست مجرد تحسن رقمي، بل إشارة إلى أن المنافسة لا تزال مفتوحة لمن يحافظ على تركيزه في الجولات القادمة.`,
      priority: 96,
    };
  }

  return {
    type: "main",
    icon: "🎙️",
    title: event.title,
    content:
      "استوديو التحدي يرصد حدثًا مهمًا في مسار المنافسة. التفاصيل الصغيرة باتت تصنع الفارق، وكل نقطة أصبحت قادرة على تغيير المشهد.",
    priority: 100,
  };
}

function buildQuoteCard(event?: ChallengeStudioEvent): ChallengeStudioCard {
  if (event?.type === "leader_under_pressure") {
    return {
      type: "quote",
      icon: "🎙️",
      title: "تصريح الجولة",
      content: `القراءة الفنية للمشهد تقول إن الصدارة لم تعد منطقة آمنة. الفارق بين ${getText(
        event.data.leaderName
      )} وأقرب منافسيه لا يتجاوز ${getNumber(
        event.data.pointsDiff
      )} نقطة، وهذا يجعل الجولة القادمة مفتوحة على كل الاحتمالات.`,
      priority: 82,
    };
  }

  if (event?.type === "best_comeback") {
    return {
      type: "quote",
      icon: "🎙️",
      title: "تصريح الجولة",
      content: `عودة ${getText(
        event.data.memberName
      )} تحمل رسالة واضحة: التأخر في الترتيب لا يعني الخروج من المنافسة. الصعود المتدرج قد يكون أخطر من الظهور المفاجئ.`,
      priority: 82,
    };
  }

  if (event?.type === "black_horse") {
    return {
      type: "quote",
      icon: "🐎",
      title: "الحصان الأسود",
      content: `${getText(
        event.data.memberName
      )} يتحرك بعيدًا عن الضجيج، لكن أرقامه تشير إلى حضور لا يمكن تجاهله. دقة تصل إلى ${getNumber(
        event.data.accuracy
      )}% تضعه ضمن الأسماء التي قد تفاجئ المنافسين.`,
      priority: 82,
    };
  }

  const memberName = getPrimaryMember(event);

  if (memberName) {
    return {
      type: "quote",
      icon: "🎙️",
      title: "تصريح الجولة",
      content: `${memberName} يدخل نشرة اليوم من زاوية مستحقة، فالأرقام المرتبطة به تمنحه حضورًا واضحًا في المشهد. المنافسة لا تكافئ الظهور فقط، بل تكافئ التوقيت والدقة.`,
      priority: 82,
    };
  }

  return {
    type: "quote",
    icon: "🎙️",
    title: "تصريح الجولة",
    content:
      "لغة الأرقام في لوحة الصدارة تؤكد أن المنافسة لم تصل إلى مرحلة الاستقرار بعد. كل جولة تضيف اسمًا جديدًا إلى دائرة المتابعة.",
    priority: 82,
  };
}

function buildNumberCard(event?: ChallengeStudioEvent): ChallengeStudioCard {
  if (event?.type === "round_star") {
    return {
      type: "number",
      icon: "📊",
      title: "رقم الجولة",
      content: `${getText(event.data.memberName)} جمع ${getNumber(
        event.data.roundPoints
      )} نقاط في آخر النتائج المحتسبة، مع ${getNumber(
        event.data.correctCount
      )} توقعات ناجحة. رقم يمنحه أفضلية إعلامية مستحقة.`,
      priority: 76,
    };
  }

  if (event?.type === "highest_accuracy") {
    return {
      type: "number",
      icon: "📊",
      title: "رقم الجولة",
      content: `${getText(event.data.memberName)} يملك دقة تبلغ ${getNumber(
        event.data.accuracy
      )}% من أصل ${getNumber(
        event.data.total
      )} توقعات. رقم يعكس قراءة جيدة للمباريات وليس مجرد حضور في الجدول.`,
      priority: 76,
    };
  }

  if (event?.type === "most_exact_results") {
    return {
      type: "number",
      icon: "🎯",
      title: "رقم الجولة",
      content: `${getText(event.data.memberName)} وصل إلى ${getNumber(
        event.data.exact
      )} توقعات دقيقة بالملي. هذا النوع من الأرقام يصنع الفارق في المراحل الحاسمة.`,
      priority: 76,
    };
  }

  if (event?.type === "biggest_climb") {
    return {
      type: "number",
      icon: "📈",
      title: "رقم الجولة",
      content: `أكبر حركة صعود جاءت عبر ${getText(
        event.data.memberName
      )} بعد تقدمه ${getNumber(
        event.data.rankChange
      )} مراكز. رقم يكشف أن الجدول لا يزال قابلًا للاشتعال.`,
      priority: 76,
    };
  }

  if (event?.type === "most_stable") {
    return {
      type: "number",
      icon: "📈",
      title: "الأكثر ثباتًا",
      content: `${getText(event.data.memberName)} يحافظ على حضوره بثبات، مع دقة ${getNumber(
        event.data.accuracy
      )}% من ${getNumber(
        event.data.total
      )} توقعات. الثبات هنا قيمة لا تقل أهمية عن الصعود السريع.`,
      priority: 76,
    };
  }

  return {
    type: "number",
    icon: "📊",
    title: "رقم الجولة",
    content:
      "كل نقطة في لوحة الصدارة أصبحت ذات وزن واضح. الفارق البسيط قد يتحول بعد مباراة واحدة إلى قفزة أو تراجع مؤثر.",
    priority: 76,
  };
}

function buildBadgeCard(event?: ChallengeStudioEvent): ChallengeStudioCard {
  if (event?.type === "round_star") {
    return {
      type: "badge",
      icon: "🔥",
      title: "وسام نجم الجولة",
      content: `وسام الجولة يذهب إلى ${getText(
        event.data.memberName
      )} بعد حصيلة بلغت ${getNumber(
        event.data.roundPoints
      )} نقاط في آخر النتائج المحتسبة. حضور رقمي يستحق الإشارة.`,
      priority: 72,
    };
  }

  if (event?.type === "best_streak") {
    return {
      type: "badge",
      icon: "🔥",
      title: "وسام السلسلة النارية",
      content: `${getText(
        event.data.memberName
      )} يستحق وسام اليوم بعد سلسلة وصلت إلى ${getNumber(
        event.data.bestStreak
      )} توقعات صحيحة. الاستمرارية بهذا الشكل تمنح المنافسة بُعدًا مختلفًا.`,
      priority: 72,
    };
  }

  if (event?.type === "most_exact_results") {
    return {
      type: "badge",
      icon: "🎯",
      title: "وسام قناص النتائج",
      content: `وسام الدقة يذهب إلى ${getText(
        event.data.memberName
      )} بعد وصوله إلى ${getNumber(
        event.data.exact
      )} توقعات بالملي. إصابة النتائج الدقيقة تظل الطريق الأسرع للتقدم.`,
      priority: 72,
    };
  }

  if (event?.type === "black_horse") {
    return {
      type: "badge",
      icon: "🐎",
      title: "وسام الحصان الأسود",
      content: `${getText(
        event.data.memberName
      )} يظهر بهدوء، لكنه يملك أرقامًا تستحق المتابعة. عدد التوقعات محدود نسبيًا، لكن التأثير حاضر في الترتيب.`,
      priority: 72,
    };
  }

  if (event?.type === "best_comeback") {
    return {
      type: "badge",
      icon: "⚡",
      title: "وسام أفضل عودة",
      content: `${getText(
        event.data.memberName
      )} حصل على وسام العودة بعد صعوده ${getNumber(
        event.data.rankChange
      )} مراكز. الرجوع إلى المشهد يحتاج توقيتًا جيدًا ونتائج تخدم صاحبها.`,
      priority: 72,
    };
  }

  return {
    type: "badge",
    icon: "🏅",
    title: "وسام الاستوديو",
    content:
      "وسام اليوم لكل عضو يحافظ على حضوره في التوقعات. الاستمرارية لا تظهر دائمًا في العناوين، لكنها تصنع الفارق مع الوقت.",
    priority: 72,
  };
}

function buildFunnyCard(event?: ChallengeStudioEvent): ChallengeStudioCard {
  if (event?.type === "worst_luck") {
    return {
      type: "funny",
      icon: "😅",
      title: "الأكثر حظًا سيئًا",
      content: `${getText(event.data.memberName)} واجه يومًا صعبًا مع ${getNumber(
        event.data.wrong
      )} توقعات غير موفقة من أصل ${getNumber(
        event.data.total
      )}. الاستوديو يقرأها بروح رياضية: الحظ يتغير، والمنافسة لا تنتهي من جولة واحدة.`,
      priority: 70,
    };
  }

  if (event?.type === "forgot_prediction") {
    return {
      type: "funny",
      icon: "😴",
      title: "صح النوم",
      content: `${getText(event.data.memberName)} غاب عن توقع مباراة ${getText(
        event.data.matchName
      )}. في بطولة بهذا الإيقاع، تفويت مباراة واحدة قد يترك أثرًا واضحًا على الجدول.`,
      priority: 66,
    };
  }

  if (event?.type === "missed_after_calculation") {
    return {
      type: "funny",
      icon: "😬",
      title: "فرصة لم تكتمل",
      content: `${getText(event.data.memberName)} خرج من مباراة ${getText(
        event.data.matchName
      )} دون نقاط. النتيجة لم تخدمه هذه المرة، لكن الطريق ما زال مفتوحًا للتعويض.`,
      priority: 66,
    };
  }

  if (event?.type === "biggest_drop") {
    return {
      type: "funny",
      icon: "📉",
      title: "تراجع يحتاج ردًا",
      content: `${getText(event.data.memberName)} تراجع ${getNumber(
        event.data.rankChange
      )} مراكز. القراءة الهادئة تقول إن الهبوط مؤلم، لكنه قابل للتعويض إذا جاءت الجولة القادمة بصورة أفضل.`,
      priority: 66,
    };
  }

  return {
    type: "funny",
    icon: "😅",
    title: "لقطة الجولة",
    content:
      "الاستوديو يذكّر الجميع بأن التوقع قبل المباراة أهم من الندم بعدها. بعض النقاط تضيع لأن صاحبها تأخر خطوة واحدة فقط.",
    priority: 66,
  };
}

function buildWatchCard(event?: ChallengeStudioEvent): ChallengeStudioCard {
  if (event?.type === "top10_spotlight") {
    return {
      type: "watch",
      icon: "🔟",
      title: "رادار التوب 10",
      content: `${getText(event.data.memberName)} يقف في المركز ${getNumber(
        event.data.currentRank
      )} ومعه ${getNumber(
        event.data.points
      )} نقطة. منطقة التوب 10 لا تمنح الهدوء؛ كل توقع صحيح قد يرفع السقف.`,
      priority: 64,
    };
  }

  if (event?.type === "chasing_pack") {
    return {
      type: "watch",
      icon: "🐎",
      title: "قادم من الخلف",
      content: `${getText(event.data.memberName)} يطارد من المركز ${getNumber(
        event.data.currentRank
      )}، ولا يفصله عن المتصدر سوى ${getNumber(
        event.data.pointsBehindLeader
      )} نقطة. هذا النوع من المطاردة يستحق المتابعة.`,
      priority: 64,
    };
  }

  if (event?.type === "dangerous_prediction") {
    return {
      type: "watch",
      icon: "🎲",
      title: "توقع على الرادار",
      content: `${getText(event.data.memberName)} اختار نتيجة جريئة في مباراة ${getText(
        event.data.matchName
      )}: ${getNumber(event.data.homeScore)} - ${getNumber(
        event.data.awayScore
      )}. إذا تحققت، فقد تتحول إلى واحدة من لقطات الجولة.`,
      priority: 64,
    };
  }

  if (event?.type === "most_stable") {
    return {
      type: "watch",
      icon: "📈",
      title: "ثبات تحت المتابعة",
      content: `${getText(
        event.data.memberName
      )} لا يتحرك بضجيج كبير، لكنه يحافظ على موقعه وأرقامه. في سباق طويل، الثبات قد يكون سلاحًا أكثر تأثيرًا من القفزات المؤقتة.`,
      priority: 64,
    };
  }

  return {
    type: "watch",
    icon: "👀",
    title: "رادار المنافسة",
    content:
      "استوديو التحدي يراقب المنافسة عن قرب. الجولات القادمة ستكشف من يملك قراءة ثابتة، ومن ينتظر لحظة الانفجار.",
    priority: 62,
  };
}

function buildBattleCard(event?: ChallengeStudioEvent): ChallengeStudioCard {
  if (event?.type === "leader_under_pressure") {
    return {
      type: "watch",
      icon: "⚔️",
      title: "مواجهة الصدارة",
      content: `الفارق بين ${getText(event.data.leaderName)} و${getText(
        event.data.secondName
      )} يبلغ ${getNumber(
        event.data.pointsDiff
      )} نقطة فقط. هذه المسافة تجعل أي توقع قادم مؤثرًا في حسابات القمة.`,
      priority: 60,
    };
  }

  if (event?.type === "top3_spotlight") {
    return {
      type: "watch",
      icon: "🥉",
      title: "ضغط المركز الثالث",
      content: `${getText(
        event.data.memberName
      )} يعيش ضغط منطقة حساسة في الجدول. المركز الثالث يمنح حضورًا قويًا، لكنه يجذب المطاردين من كل اتجاه.`,
      priority: 60,
    };
  }

  if (event?.type === "best_comeback") {
    return {
      type: "watch",
      icon: "⚡",
      title: "عودة تستحق المتابعة",
      content: `${getText(
        event.data.memberName
      )} لم يكتف بتحسين ترتيبه، بل أرسل إشارة للمنافسين بأن العودة ممكنة متى حضرت القراءة الصحيحة للمباريات.`,
      priority: 60,
    };
  }

  return {
    type: "watch",
    icon: "⚔️",
    title: "مطاردة الصدارة",
    content:
      "الصدارة لم تعد منطقة مغلقة. أي مباراة قادمة قد تصنع مواجهة جديدة وتعيد توزيع الضغط بين الأعضاء.",
    priority: 60,
  };
}

function buildMovementCard(event?: ChallengeStudioEvent): ChallengeStudioCard {
  if (event?.type === "biggest_climb") {
    return {
      type: "number",
      icon: "📈",
      title: "قفزة الترتيب",
      content: `${getText(
        event.data.memberName
      )} كان صاحب الحركة الأبرز في الجدول، بعدما صعد ${getNumber(
        event.data.rankChange
      )} مراكز. هذا الصعود يمنحه حضورًا مستحقًا في نشرة اليوم.`,
      priority: 58,
    };
  }

  if (event?.type === "biggest_drop") {
    return {
      type: "funny",
      icon: "📉",
      title: "قفزة الترتيب",
      content: `${getText(event.data.memberName)} تراجع ${getNumber(
        event.data.rankChange
      )} مراكز. المنافسة طويلة، والرد الحقيقي يكون في الجولة القادمة.`,
      priority: 58,
    };
  }

  if (event?.type === "most_stable") {
    return {
      type: "number",
      icon: "📈",
      title: "الأكثر ثباتًا",
      content: `${getText(
        event.data.memberName
      )} بقي ثابتًا في المشهد رغم حركة الجدول. الثبات هنا ليس جمودًا، بل قدرة على عدم خسارة الأرض أمام المنافسين.`,
      priority: 58,
    };
  }

  return {
    type: "number",
    icon: "📈",
    title: "قفزة الترتيب",
    content:
      "الجدول يتحرك بهدوء، لكن الهدوء قد يكون مؤقتًا. نتيجة دقيقة واحدة كفيلة بتغيير أكثر من مركز دفعة واحدة.",
    priority: 58,
  };
}

function buildStudioWordCard(event?: ChallengeStudioEvent): ChallengeStudioCard {
  if (event?.type === "studio_word") {
    const pointsDiff = event.data.pointsDiff;

    return {
      type: "watch",
      icon: "🎙️",
      title: "كلمة الاستوديو",
      content: `الصورة العامة تقول إن المنافسة لا تزال مفتوحة. عدد الأعضاء أصحاب التوقعات المحتسبة بلغ ${getNumber(
        event.data.activeMembersCount
      )}، وهناك ${getNumber(
        event.data.scheduledMatchesCount
      )} مباريات قادمة على الرادار.${
        pointsDiff !== null && pointsDiff !== undefined
          ? ` الفارق عند القمة يقف عند ${getNumber(
              pointsDiff
            )} نقطة، وهذا يجعل التفاصيل الصغيرة أكثر تأثيرًا.`
          : ""
      }`,
      priority: 56,
    };
  }

  return {
    type: "watch",
    icon: "🎙️",
    title: "كلمة الاستوديو",
    content:
      "المنافسة ما زالت في مرحلة قابلة للتقلب. من يحافظ على حضوره ويتعامل مع كل مباراة بجدية سيجد نفسه قريبًا من دائرة الضوء.",
    priority: 56,
  };
}

function buildFallbackCard(index: number): ChallengeStudioCard {
  const fallbackCards: ChallengeStudioCard[] = [
    {
      type: "watch",
      icon: "👀",
      title: "زاوية المتابعة",
      content:
        "استوديو التحدي يواصل قراءة التفاصيل. لا توجد نتيجة صغيرة في سباق النقاط، فكل توقع قد يكون بداية لتحول جديد.",
      priority: 50,
    },
    {
      type: "number",
      icon: "📊",
      title: "إشارة رقمية",
      content:
        "لوحة الصدارة لا تتحرك بالأسماء فقط، بل بالأرقام الدقيقة: نقاط، توقعات صحيحة، ونتائج بالملي تصنع الفارق.",
      priority: 49,
    },
    {
      type: "badge",
      icon: "🏅",
      title: "رسالة المنافسة",
      content:
        "الحضور المستمر في التوقعات يمنح صاحبه فرصة دائمة للعودة. الغياب عن مباراة واحدة قد يكون مكلفًا.",
      priority: 48,
    },
  ];

  return fallbackCards[index % fallbackCards.length];
}

export async function generateChallengeStudioBulletinFromEvents() {
  const events = await buildChallengeStudioEvents();

  if (events.length === 0) {
    throw new Error("لا توجد أحداث كافية لتوليد نشرة اليوم");
  }

  const usedMembers = new Set<string>();
  const cards: ChallengeStudioCard[] = [];

  const mainEvent = events[0];
  pushCard(cards, buildMainCard(mainEvent));
  markMembers(mainEvent, usedMembers);

  if (
    mainEvent.type === "golden_prediction_alert" &&
    cards.length < REQUIRED_CARDS_COUNT
  ) {
    pushCard(cards, {
      type: "number",
      icon: "💥",
      title: "قيمة السوبر ذهبي",
      content:
        "النتيجة الدقيقة في السوبر ذهبي تمنح 10 نقاط، وفي مباريات خروج المغلوب قد تصل الضربة الكاملة إلى 20 نقطة. هذه ليست مباراة عادية؛ إنها فرصة الريمونتادا الكبرى لمن يحسن قراءة التفاصيل.",
      priority: 90,
    });
  }

  const quoteEvent = pickEvent(events, usedMembers, [
    "leader_under_pressure",
    "best_comeback",
    "black_horse",
    "top3_spotlight",
    "biggest_climb",
    "highest_accuracy",
    "most_exact_results",
  ]);
  pushCard(cards, buildQuoteCard(quoteEvent));
  markMembers(quoteEvent, usedMembers);

  const numberEvent = pickEvent(events, usedMembers, [
    "round_star",
    "highest_accuracy",
    "most_exact_results",
    "biggest_climb",
    "most_stable",
  ]);
  pushCard(cards, buildNumberCard(numberEvent));
  markMembers(numberEvent, usedMembers);

  const badgeEvent = pickEvent(events, usedMembers, [
    "round_star",
    "best_streak",
    "most_exact_results",
    "black_horse",
    "best_comeback",
  ]);
  pushCard(cards, buildBadgeCard(badgeEvent));
  markMembers(badgeEvent, usedMembers);

  const funnyEvent = pickEvent(events, usedMembers, [
    "worst_luck",
    "forgot_prediction",
    "missed_after_calculation",
    "biggest_drop",
  ]);
  pushCard(cards, buildFunnyCard(funnyEvent));
  markMembers(funnyEvent, usedMembers);

  const watchEvent = pickEvent(events, usedMembers, [
    "top10_spotlight",
    "chasing_pack",
    "dangerous_prediction",
    "most_stable",
    "black_horse",
  ]);
  pushCard(cards, buildWatchCard(watchEvent));
  markMembers(watchEvent, usedMembers);

  const battleEvent = pickEvent(events, usedMembers, [
    "leader_under_pressure",
    "top3_spotlight",
    "best_comeback",
  ]);
  pushCard(cards, buildBattleCard(battleEvent));
  markMembers(battleEvent, usedMembers);

  const movementEvent = pickEvent(events, usedMembers, [
    "biggest_climb",
    "biggest_drop",
    "most_stable",
  ]);
  pushCard(cards, buildMovementCard(movementEvent));
  markMembers(movementEvent, usedMembers);

  const studioWordEvent = pickEvent(events, usedMembers, ["studio_word"]);
  pushCard(cards, buildStudioWordCard(studioWordEvent));

  while (cards.length < REQUIRED_CARDS_COUNT) {
    pushCard(cards, buildFallbackCard(cards.length));
  }

  const finalCards = cards.slice(0, REQUIRED_CARDS_COUNT);

  return {
    date: getTodaySaudiDate(),
    summary:
      mainEvent.type === "golden_prediction_alert"
        ? "السوبر ذهبي يشعل الجولة"
        : mainEvent.title,
    events,
    cards: finalCards,
    mentionedMembers: Array.from(usedMembers),
  };
}
