import {
  addChallengeStudioBulletin,
  type ChallengeStudioCard,
} from "@/lib/challengeStudio";
import {
  buildChallengeStudioEvents,
  type ChallengeStudioEvent,
} from "@/lib/challengeStudio/eventEngine";

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

function buildMainCard(event: ChallengeStudioEvent): ChallengeStudioCard {
  if (event.type === "golden_prediction_alert") {
    return {
      type: "main",
      icon: "⭐",
      title: "التوقع الذهبي يشعل الجولة",
      content: `التوقع الذهبي داخل على الخط في مباراة ${getText(
        event.data.matchName
      )}، وهنا الوضع ما هو توقع عادي.\n\nنتيجة صحيحة بالملي ممكن تقلب لوحة الصدارة، وتفتح الباب للمطاردين يدخلون المنافسة بقوة.\n\nباقي تقريبًا ${getNumber(
        event.data.hoursUntilStart
      )} ساعة على البداية، واللي عنده قراءة قوية للمباراة هذه فرصته يضرب ضربة كبيرة. 🔥`,
      priority: 115,
    };
  }

  if (event.type === "exact_after_calculation") {
    return {
      type: "main",
      icon: "🎯",
      title: "جابها بالملي بعد الاحتساب",
      content: `${getText(
        event.data.memberName
      )} خطف الأضواء بعد احتساب مباراة ${getText(
        event.data.matchName
      )}.\n\nتوقع النتيجة ${getNumber(event.data.homeScore)} - ${getNumber(
        event.data.awayScore
      )} وجمع ${getNumber(
        event.data.points
      )} نقاط، وهذا النوع من التوقعات هو اللي يغيّر شكل المنافسة بسرعة. 🔥`,
      priority: 112,
    };
  }

  if (event.type === "leader_under_pressure") {
    return {
      type: "main",
      icon: "🔥",
      title: "كرسي الصدارة يهتز",
      content: `${getText(
        event.data.leaderName
      )} للحين ماسك الصدارة، لكن ${getText(
        event.data.secondName
      )} قرّب منه وصار الفارق ${getNumber(
        event.data.pointsDiff
      )} نقطة فقط.\n\nالجولة الجاية ممكن تولّع وتغيّر شكل المنافسة بالكامل. 👀`,
      priority: 106,
    };
  }

  if (event.type === "biggest_climb") {
    return {
      type: "main",
      icon: "🚀",
      title: "صاروخ الجولة",
      content: `${getText(
        event.data.memberName
      )} خطف الأضواء بعد ما صعد ${getNumber(
        event.data.rankChange
      )} مراكز دفعة وحدة.\n\nواضح إن الدخول للمنافسة صار جدي، واللي قدامه لازم ينتبه. 🔥`,
      priority: 100,
    };
  }

  if (event.type === "top3_spotlight") {
    return {
      type: "main",
      icon: "🥉",
      title: "المركز الثالث تحت الضوء",
      content: `${getText(event.data.memberName)} في المركز ${getNumber(
        event.data.currentRank
      )} برصيد ${getNumber(
        event.data.points
      )} نقطة.\n\nوجوده قريب من الصدارة يخلي الجولة الجاية أكثر سخونة، لأن التوب 3 ما عاد فيه مجال للراحة. 🔥`,
      priority: 100,
    };
  }

  if (event.type === "strong_match_alert") {
    return {
      type: "main",
      icon: "⚽",
      title: "مباراة قوية على الأبواب",
      content: `استوديو التحدي يوجّه الأنظار إلى مباراة ${getText(
        event.data.matchName
      )}.\n\nمثل هذه المباريات غالبًا تغيّر شكل التوقعات، وفيها فرصة كبيرة للمغامرين واللي يحبون قلب الطاولة.`,
      priority: 96,
    };
  }

  return {
    type: "main",
    icon: "🎙️",
    title: event.title,
    content:
      "استوديو التحدي يرصد حدثًا مهمًا اليوم. المنافسة تتحرك، وكل نقطة صارت تفرق.",
    priority: 100,
  };
}

function buildQuoteCard(event?: ChallengeStudioEvent): ChallengeStudioCard {
  const memberName =
    getText(event?.data.leaderName) ||
    getText(event?.data.memberName) ||
    event?.members[0] ||
    "أحد الأعضاء";

  return {
    type: "quote",
    icon: "🎤",
    title: "تصريح ناري",
    content: `المذيع: ${memberName}، وش رسالتك للمنافسين؟\n\n${memberName}: المنافسة ما انتهت، واللي يحسب الترتيب استقر بدري عليه. الجولة الجاية نار. 😎`,
    priority: 82,
  };
}

function buildNumberCard(event?: ChallengeStudioEvent): ChallengeStudioCard {
  if (event?.type === "highest_accuracy") {
    return {
      type: "number",
      icon: "📊",
      title: "رقم اليوم",
      content: `${getText(event.data.memberName)} يملك نسبة دقة ${getNumber(
        event.data.accuracy
      )}% من أصل ${getNumber(
        event.data.total
      )} توقعات. رقم يثبت إن المنافسة عنده محسوبة صح.`,
      priority: 76,
    };
  }

  if (event?.type === "most_exact_results") {
    return {
      type: "number",
      icon: "🎯",
      title: "رقم اليوم",
      content: `${getText(event.data.memberName)} وصل إلى ${getNumber(
        event.data.exact
      )} توقعات بالملي. رقم يخلي المنافسين يحسبون له حساب.`,
      priority: 76,
    };
  }

  if (event?.type === "biggest_climb") {
    return {
      type: "number",
      icon: "📈",
      title: "رقم اليوم",
      content: `أكبر صعود اليوم كان من نصيب ${getText(
        event.data.memberName
      )} بعد ما تقدم ${getNumber(
        event.data.rankChange
      )} مراكز. رقم يستحق الوقوف عنده.`,
      priority: 76,
    };
  }

  return {
    type: "number",
    icon: "📊",
    title: "رقم اليوم",
    content:
      "كل نقطة في لوحة الصدارة صارت لها قيمة، والفارق البسيط ممكن يغيّر ترتيب الأعضاء بعد أي مباراة.",
    priority: 76,
  };
}

function buildBadgeCard(event?: ChallengeStudioEvent): ChallengeStudioCard {
  if (event?.type === "best_streak") {
    return {
      type: "badge",
      icon: "🔥",
      title: "وسام السلسلة النارية",
      content: `${getText(
        event.data.memberName
      )} يستحق وسام اليوم بعد سلسلة وصلت إلى ${getNumber(
        event.data.bestStreak
      )} توقعات صحيحة. استمرارية تخوف المنافسين.`,
      priority: 72,
    };
  }

  if (event?.type === "most_exact_results") {
    return {
      type: "badge",
      icon: "🎯",
      title: "وسام قناص النتائج",
      content: `وسام اليوم يروح لـ ${getText(
        event.data.memberName
      )} بعد ما وصل إلى ${getNumber(
        event.data.exact
      )} توقعات بالملي. قناص فعلي للنتائج. 👏`,
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
      )} يظهر بهدوء لكنه ينافس بقوة. عدد توقعاته أقل، لكن تأثيره واضح في الترتيب.`,
      priority: 72,
    };
  }

  return {
    type: "badge",
    icon: "🏅",
    title: "وسام اليوم",
    content:
      "وسام اليوم لكل عضو ملتزم بتوقعاته وما يفوّت المباريات. الاستمرارية نصف المنافسة.",
    priority: 72,
  };
}

function buildFunnyCard(event?: ChallengeStudioEvent): ChallengeStudioCard {
  if (event?.type === "worst_luck") {
    return {
      type: "funny",
      icon: "😅",
      title: "الأكثر حظًا سيئًا",
      content: `${getText(event.data.memberName)} عنده ${getNumber(
        event.data.wrong
      )} توقعات غير موفقة من أصل ${getNumber(
        event.data.total
      )}.\n\nاستوديو التحدي يقول: الحظ يحتاج تحديث، لكن الإصرار واضح يا بطل. 😂`,
      priority: 70,
    };
  }

  if (event?.type === "forgot_prediction") {
    return {
      type: "funny",
      icon: "😴",
      title: "صح النوم",
      content: `${getText(event.data.memberName)} شكله كان مشغول شوي. مباراة ${getText(
        event.data.matchName
      )} بدأت والتوقع ما وصل.\n\nاستوديو التحدي يقول: القطار ما ينتظر أحد يا بطل. 😂`,
      priority: 66,
    };
  }

  if (event?.type === "missed_after_calculation") {
    return {
      type: "funny",
      icon: "😬",
      title: "فرصة راحت",
      content: `${getText(event.data.memberName)} خرج من مباراة ${getText(
        event.data.matchName
      )} بدون نقاط.\n\nمو مشكلة، الجولة طويلة والرجعة واردة في أي مباراة.`,
      priority: 66,
    };
  }

  return {
    type: "funny",
    icon: "😂",
    title: "لقطة اليوم",
    content:
      "اللي ينسى يتوقع لا يزعل إذا الاستوديو قال له: صح النوم يا بطل، المباراة خلصت من بدري.",
    priority: 66,
  };
}

function buildWatchCard(event?: ChallengeStudioEvent): ChallengeStudioCard {
  if (event?.type === "top10_spotlight") {
    return {
      type: "watch",
      icon: "🔟",
      title: "عين الاستوديو على التوب 10",
      content: `${getText(event.data.memberName)} في المركز ${getNumber(
        event.data.currentRank
      )}، ومعه ${getNumber(
        event.data.points
      )} نقطة. التوب 10 منطقة ضغط، وأي نتيجة صحيحة ممكن تفتح له باب أكبر.`,
      priority: 64,
    };
  }

  if (event?.type === "chasing_pack") {
    return {
      type: "watch",
      icon: "🐎",
      title: "جاي من الخلف",
      content: `${getText(event.data.memberName)} يطارد من المركز ${getNumber(
        event.data.currentRank
      )}، والفارق عن المتصدر ${getNumber(
        event.data.pointsBehindLeader
      )} نقطة. هذا النوع من الأعضاء يحتاج شو إعلامي.`,
      priority: 64,
    };
  }

  if (event?.type === "dangerous_prediction") {
    return {
      type: "watch",
      icon: "🎲",
      title: "توقع خطير",
      content: `${getText(event.data.memberName)} دخل بتوقع جريء في مباراة ${getText(
        event.data.matchName
      )}: ${getNumber(event.data.homeScore)} - ${getNumber(
        event.data.awayScore
      )}. إذا ضبطت، الاستوديو بيرجع لها بقوة.`,
      priority: 64,
    };
  }

  return {
    type: "watch",
    icon: "👀",
    title: "تحت المجهر",
    content:
      "استوديو التحدي يراقب المنافسة عن قرب. الأيام الجاية بتكشف لنا مين يستحق الشو الإعلامي.",
    priority: 62,
  };
}

function buildBattleCard(event?: ChallengeStudioEvent): ChallengeStudioCard {
  if (event?.type === "leader_under_pressure") {
    return {
      type: "watch",
      icon: "⚔️",
      title: "مواجهة الصدارة",
      content: `${getText(event.data.leaderName)} ضد ${getText(
        event.data.secondName
      )}. الفارق ${getNumber(
        event.data.pointsDiff
      )} نقطة فقط، والغلط الجاي ممكن يكون غالي.`,
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
      )} في المركز الثالث، وهذا مركز ما يتحمل التراخي. اللي قدامه قريب، واللي وراه يطارد.`,
      priority: 60,
    };
  }

  return {
    type: "watch",
    icon: "⚔️",
    title: "التحدي المباشر",
    content:
      "الصدارة ما عاد فيها أمان. أي مباراة جاية ممكن تصنع مواجهة جديدة بين الأعضاء.",
    priority: 60,
  };
}

function buildMovementCard(event?: ChallengeStudioEvent): ChallengeStudioCard {
  if (event?.type === "biggest_climb") {
    return {
      type: "number",
      icon: "📈",
      title: "حركة الترتيب",
      content: `${getText(event.data.memberName)} هو أكثر عضو حرّك الجدول اليوم. صعود ${getNumber(
        event.data.rankChange
      )} مراكز يعطيه شو إعلامي مستحق.`,
      priority: 58,
    };
  }

  if (event?.type === "biggest_drop") {
    return {
      type: "funny",
      icon: "📉",
      title: "حركة الترتيب",
      content: `${getText(event.data.memberName)} نزل ${getNumber(
        event.data.rankChange
      )} مراكز. المنافسة طويلة، والرجعة ممكنة في أي جولة.`,
      priority: 58,
    };
  }

  return {
    type: "number",
    icon: "📈",
    title: "حركة الترتيب",
    content:
      "الجدول يتحرك بهدوء، لكن أي نتيجة صحيحة بالملي ممكن تقلب أكثر من مركز مرة وحدة.",
    priority: 58,
  };
}

export async function generateChallengeStudioBulletinFromEvents() {
  const events = await buildChallengeStudioEvents();

  if (events.length === 0) {
    throw new Error("لا توجد أحداث كافية لتوليد نشرة اليوم");
  }

  const usedMembers = new Set<string>();
  const cards: ChallengeStudioCard[] = [];

  const mainEvent = events[0];
  cards.push(buildMainCard(mainEvent));
  markMembers(mainEvent, usedMembers);

  if (mainEvent.type === "golden_prediction_alert") {
    cards.push({
      type: "number",
      icon: "💥",
      title: "ليش التوقع الذهبي مهم؟",
      content:
        "لأن النتيجة بالملي في التوقع الذهبي تعطي دفعة قوية في النقاط، وممكن تغيّر ترتيب لوحة الصدارة بسرعة.",
      priority: 90,
    });
  }

  const quoteEvent = pickEvent(events, usedMembers, [
    "leader_under_pressure",
    "top3_spotlight",
    "biggest_climb",
    "black_horse",
    "highest_accuracy",
    "most_exact_results",
  ]);
  cards.push(buildQuoteCard(quoteEvent));
  markMembers(quoteEvent, usedMembers);

  const numberEvent = pickEvent(events, usedMembers, [
    "highest_accuracy",
    "most_exact_results",
    "biggest_climb",
  ]);
  cards.push(buildNumberCard(numberEvent));
  markMembers(numberEvent, usedMembers);

  const badgeEvent = pickEvent(events, usedMembers, [
    "best_streak",
    "most_exact_results",
    "black_horse",
  ]);
  cards.push(buildBadgeCard(badgeEvent));
  markMembers(badgeEvent, usedMembers);

  const funnyEvent = pickEvent(events, usedMembers, [
    "worst_luck",
    "forgot_prediction",
    "missed_after_calculation",
    "biggest_drop",
  ]);
  cards.push(buildFunnyCard(funnyEvent));
  markMembers(funnyEvent, usedMembers);

  const watchEvent = pickEvent(events, usedMembers, [
    "top10_spotlight",
    "chasing_pack",
    "dangerous_prediction",
    "black_horse",
  ]);
  cards.push(buildWatchCard(watchEvent));
  markMembers(watchEvent, usedMembers);

  const battleEvent = pickEvent(events, usedMembers, [
    "leader_under_pressure",
    "top3_spotlight",
  ]);
  cards.push(buildBattleCard(battleEvent));
  markMembers(battleEvent, usedMembers);

  const movementEvent = pickEvent(events, usedMembers, [
    "biggest_climb",
    "biggest_drop",
  ]);
  cards.push(buildMovementCard(movementEvent));
  markMembers(movementEvent, usedMembers);

  const bulletinId = await addChallengeStudioBulletin({
    date: getTodaySaudiDate(),
    summary: mainEvent.title,
    cards,
    published: false,
    generatedByAI: false,
  });

  return {
    bulletinId,
    events,
    cards,
  };
}