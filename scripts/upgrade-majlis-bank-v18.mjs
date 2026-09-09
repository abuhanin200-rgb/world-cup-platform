import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, "..", "src", "data", "majlisQuestionBank.json");
const bank = JSON.parse(fs.readFileSync(file, "utf8"));
const norm = (value) => String(value ?? "").trim().toLowerCase().replace(/[\u064B-\u065F\u0670]/g, "").replace(/[إأآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

const familyMap = {
  "quran-ayah-count": "quran_ayah_count",
  "quran-surah-order": "quran_order",
  "quran-quote-location": "quran_which_surah",
  "quran-structure": "quran_topic",
  "quran-verses": "quran_repeated_phrase",
  "quran-stories": "quran_story",
  "quran-names": "quran_names",
  "quran-aliases": "quran_names",
  "quran-openings": "quran_opening",
  "quran-muqattaat": "quran_opening",
  "quran-events": "quran_events",
};

const familyOverrides = {
  "v16-quran-001": "quran_opening",
  "v16-quran-002": "quran_repeated_phrase",
  "v16-quran-003": "quran_topic",
  "v16-quran-004": "quran_ayah_count",
  "v16-quran-005": "quran_ayah_count",
  "v16-quran-006": "quran_which_surah",
  "v16-quran-007": "quran_story",
  "v16-quran-008": "quran_nations",
  "v16-quran-009": "quran_people",
  "v16-quran-010": "quran_people",
  "v16-quran-012": "quran_prophets",
  "v16-quran-024": "quran_repeated_phrase",
  "v16-quran-025": "quran_sequence",
  "v16-quran-026": "quran_sequence",
  "quran-v17-people-01": "quran_who_is_meant",
  "quran-v17-people-02": "quran_people",
  "quran-v17-people-03": "quran_prophets",
  "quran-v17-people-04": "quran_who_is_meant",
  "quran-v17-people-05": "quran_who_is_meant",
  "quran-v17-people-06": "quran_prophets",
  "quran-v17-people-07": "quran_who_is_meant",
  "quran-v17-people-08": "quran_who_is_meant",
  "quran-v17-people-09": "quran_prophets",
  "quran-v17-people-10": "quran_prophets",
  "quran-v17-people-11": "quran_prophets",
  "quran-v17-people-12": "quran_prophets",
  "quran-v17-context-01": "quran_story",
  "quran-v17-context-02": "quran_story",
  "quran-v17-context-03": "quran_nations",
  "quran-v17-context-04": "quran_nations",
  "quran-v17-context-05": "quran_story",
  "quran-v17-context-06": "quran_people",
  "quran-v17-context-07": "quran_story",
  "quran-v17-context-08": "quran_context",
  "quran-v17-context-09": "quran_events",
  "quran-v17-context-10": "quran_people",
  "quran-v17-context-11": "quran_sequence",
  "quran-v17-context-12": "quran_prophets",
};

const promptFixes = {
  "v16-quran-007": "في أي سورة وردت قصة الفتية الذين آمنوا بربهم فزادهم هدى؟",
  "v16-quran-010": "في أي سورة وردت وصايا الحكيم لابنه، بدءًا بالنهي عن الشرك؟",
  "v16-quran-013": "ما السورة التي سُمّيت باسم حشرة، وتضمنت تحذيرها لقومها من جيش سليمان؟",
  "v16-quran-017": "ما السورة التي افتتحت بتمجيد من بيده السلطان على كل شيء؟",
  "v16-quran-018": "ما السورة التي افتتحت بقسمٍ بجرم سماوي إذا هوى؟",
  "v16-quran-029": "في أي سورة سُمّي يوم بدر «يوم الفرقان»؟",
  "quran-v17-context-01": "ما اسم قصة الجماعة التي حفرت النار وعذبت المؤمنين فيها؟",
  "quran-v17-context-04": "بأي اسم وصف القرآن القوم الذين كذبوا شعيبًا ونُسبوا إلى شجرٍ كثير ملتف؟",
};

const mediumQuran = new Set([
  "quran-v17-complete-01", "quran-v17-complete-02", "quran-v17-complete-03", "quran-v17-complete-04",
  "quran-v17-complete-05", "quran-v17-complete-09", "quran-v17-complete-11", "quran-v17-complete-16",
  "quran-v17-complete-19", "quran-v17-complete-20", "quran-v17-vocab-01", "quran-v17-vocab-02",
  "quran-v17-vocab-04", "quran-v17-vocab-08", "quran-v17-context-01", "quran-v17-context-07",
]);

const quranRevealFixes = {
  "v16-quran-007": ["الكهف", 13, "إِنَّهُمْ فِتْيَةٌ آمَنُوا بِرَبِّهِمْ وَزِدْنَاهُمْ هُدًى"],
  "v16-quran-009": ["الكهف", 83, "وَيَسْأَلُونَكَ عَن ذِي الْقَرْنَيْنِ قُلْ سَأَتْلُو عَلَيْكُم مِّنْهُ ذِكْرًا"],
  "v16-quran-010": ["لقمان", 13, "وَإِذْ قَالَ لُقْمَانُ لِابْنِهِ وَهُوَ يَعِظُهُ يَا بُنَيَّ لَا تُشْرِكْ بِاللَّهِ إِنَّ الشِّرْكَ لَظُلْمٌ عَظِيمٌ"],
  "v16-quran-027": ["النور", 11, "إِنَّ الَّذِينَ جَاءُوا بِالْإِفْكِ عُصْبَةٌ مِّنكُمْ"],
  "v16-quran-028": ["البقرة", 144, "فَوَلِّ وَجْهَكَ شَطْرَ الْمَسْجِدِ الْحَرَامِ"],
  "v16-quran-029": ["الأنفال", 41, "يَوْمَ الْفُرْقَانِ يَوْمَ الْتَقَى الْجَمْعَانِ"],
  "v16-quran-030": ["الفتح", 18, "لَقَدْ رَضِيَ اللَّهُ عَنِ الْمُؤْمِنِينَ إِذْ يُبَايِعُونَكَ تَحْتَ الشَّجَرَةِ"],
};

const reciterClips = [
  { globalAyah: 262, surah: 2, ayah: 255 }, { globalAyah: 289, surah: 2, ayah: 282 },
  { globalAyah: 319, surah: 3, ayah: 26 }, { globalAyah: 483, surah: 3, ayah: 190 },
  { globalAyah: 529, surah: 4, ayah: 36 }, { globalAyah: 675, surah: 5, ayah: 6 },
  { globalAyah: 940, surah: 6, ayah: 151 }, { globalAyah: 985, surah: 7, ayah: 31 },
];
const verseAudio = (bitrate, edition, globalAyah) => `https://cdn.islamic.network/quran/audio/${bitrate}/${edition}/${globalAyah}.mp3`;
const surahAudio = (edition, surah) => `https://cdn.islamic.network/quran/audio-surah/128/${edition}/${surah}.mp3`;
const mp3Quran = (base, surah) => `${base}${String(surah).padStart(3, "0")}.mp3`;
const reciterProfiles = {
  "مشاري راشد العفاسي": (clip) => [verseAudio(128, "ar.alafasy", clip.globalAyah), verseAudio(64, "ar.alafasy", clip.globalAyah), verseAudio(128, "ar.alafasy-2", clip.globalAyah)],
  "عبدالرحمن السديس": (clip) => [verseAudio(192, "ar.abdurrahmaansudais", clip.globalAyah), verseAudio(64, "ar.abdurrahmaansudais", clip.globalAyah), mp3Quran("https://server11.mp3quran.net/sds/", clip.surah)],
  "سعود الشريم": (clip) => [verseAudio(64, "ar.saoodshuraym", clip.globalAyah), surahAudio("ar.saudalshuraim", clip.surah), mp3Quran("https://server7.mp3quran.net/shur/", clip.surah)],
  "أحمد بن علي العجمي": (clip) => [verseAudio(128, "ar.ahmedajamy", clip.globalAyah), surahAudio("ar.ahmedalajmi", clip.surah), mp3Quran("https://server10.mp3quran.net/ajm/", clip.surah)],
  "محمد أيوب": (clip) => [verseAudio(128, "ar.muhammadayyoub", clip.globalAyah), verseAudio(128, "ar.muhammadayyoub-2", clip.globalAyah), mp3Quran("https://server8.mp3quran.net/ayyub/", clip.surah)],
  "علي الحذيفي": (clip) => [verseAudio(128, "ar.hudhaify", clip.globalAyah), verseAudio(64, "ar.hudhaify", clip.globalAyah), verseAudio(32, "ar.hudhaify", clip.globalAyah)],
  "محمود خليل الحصري": (clip) => [verseAudio(128, "ar.husary", clip.globalAyah), verseAudio(64, "ar.husary", clip.globalAyah), verseAudio(64, "ar.husary-2", clip.globalAyah)],
  "محمد صديق المنشاوي": (clip) => [verseAudio(128, "ar.minshawi", clip.globalAyah), verseAudio(128, "ar.minshawi-2", clip.globalAyah), mp3Quran("https://server10.mp3quran.net/minsh/", clip.surah)],
  "محمد صديق المنشاوي - مجود": (clip) => [verseAudio(64, "ar.minshawimujawwad", clip.globalAyah), verseAudio(64, "ar.minshawimujawwad-2", clip.globalAyah), mp3Quran("https://server10.mp3quran.net/minsh/Almusshaf-Al-Mojawwad/", clip.surah)],
  "عبدالباسط عبدالصمد": (clip) => [verseAudio(192, "ar.abdulbasitmurattal", clip.globalAyah), verseAudio(64, "ar.abdulbasitmurattal", clip.globalAyah), mp3Quran("https://server7.mp3quran.net/basit/", clip.surah)],
  "عبدالباسط عبدالصمد - مجود": (clip) => [`https://verses.quran.foundation/AbdulBaset/Mujawwad/mp3/${String(clip.surah).padStart(3, "0")}${String(clip.ayah).padStart(3, "0")}.mp3`, surahAudio("ar.abdulbasitmujawwad", clip.surah), mp3Quran("https://server7.mp3quran.net/basit/Almusshaf-Al-Mojawwad/", clip.surah)],
  "محمد جبريل": (clip) => [verseAudio(128, "ar.muhammadjibreel", clip.globalAyah), verseAudio(128, "ar.muhammadjibreel-2", clip.globalAyah), mp3Quran("https://server8.mp3quran.net/jbrl/", clip.surah)],
};

const leakSafeOverrides = {
  "arabic-08": { prompt: "ما الحرف الناسخ الذي يفيد الاستدراك، وينصب الاسم ويرفع الخبر؟", answer: "لكنّ" },
  "football-04": { hint: "حُسم النهائي بنتيجة 5–2." },
  "football-08": { hint: "حُسم النهائي بنتيجة 2–1 أمام هولندا." },
  "general-24": { prompt: "أي كوكب صخري تبلغ مدة دورانه حول الشمس قرابة 365.25 يومًا؟" },
  "v16-gulf-020": { prompt: "ما الدولة الخليجية الوحيدة التي تطل على بحر العرب والممر البحري الواصل به إلى الخليج العربي؟" },
  "v16-arabic-021": { prompt: "أي أقسام الكلمة يدل على معنى في نفسه من غير اقتران بزمن؟" },
  "v16-arabic-028": { prompt: "من الأديب البصري صاحب المقامات التي رواها الحارث بن همام؟" },
  "v16-arabic-007": {
    prompt: "ما اسم أقدم معجم عربي وصلنا مرتبًا بحسب مخارج الحروف ونُسب إلى الخليل بن أحمد؟",
    answer: "كتاب العين", hint: "يبدأ اسمه بحرف حلقي.", explanation: "كتاب العين من أقدم المعاجم العربية، ورتبت مادته وفق مخارج الحروف.",
    questionFamily: "arabic-lexicography", family: "arabic-lexicography",
  },
  "v16-arabic-017": {
    prompt: "ما اسم الزحاف المفرد الذي يُحذف فيه الحرف الثاني الساكن من التفعيلة؟",
    answer: "الخبن", hint: "من أشهر زحافات السبب الخفيف.", explanation: "الخبن هو حذف الثاني الساكن من التفعيلة في علم العروض.",
    questionFamily: "arabic-prosody", family: "arabic-prosody",
  },
  "science-v17-variety-07": {
    prompt: "ما نوع الحمض النووي الريبوزي الذي ينقل الشفرة من DNA إلى الريبوسوم لترجمة البروتين؟",
    answer: "الرنا المرسال (mRNA)", hint: "يُنسخ من قالب DNA.", explanation: "يحمل mRNA الشفرة المنسوخة إلى الريبوسومات حيث تُترجم إلى بروتين.",
    questionFamily: "science-biology", family: "science-biology",
  },
  "football-v17-variety-11": {
    prompt: "ما النادي الوحيد الذي أحرز أول خمس نسخ متتالية من كأس أوروبا للأندية بين 1956 و1960؟",
    answer: "ريال مدريد", hint: "نادٍ إسباني من العاصمة.", explanation: "فاز ريال مدريد بالنسخ الخمس الأولى من كأس أوروبا للأندية بين 1956 و1960.",
    questionFamily: "football-records", family: "football-records",
  },
  "v16-islamic-027": {
    prompt: "بأي وصف عددي ذكر القرآن النبي ﷺ وصاحبه حين كانا في الغار؟", answer: "ثاني اثنين",
    hint: "ورد الوصف في سورة التوبة.", explanation: "ورد في الآية 40 من سورة التوبة وصفهما بقوله تعالى: ﴿ثَانِيَ اثْنَيْنِ﴾.",
    questionFamily: "islamic-quran-context", family: "islamic-quran-context",
    sourceLabel: "القرآن الكريم — مجمع الملك فهد", sourceName: "مجمع الملك فهد لطباعة المصحف الشريف",
    sourceUrl: "https://qurancomplex.gov.sa/techquran/dev/", license: "نص قرآني — يُراجع وفق شروط مجمع الملك فهد", verifiedStatus: "source_checked",
  },
  "v16-world-008": {
    prompt: "وفق اليونسكو، ما النسبة التقريبية من احتياطي المياه العذبة غير المتجمدة في العالم التي تحتويها بحيرة بايكال؟",
    answer: "نحو 20%", hint: "تقارب خُمس الاحتياطي العالمي.", explanation: "تذكر اليونسكو أن بحيرة بايكال تحتوي قرابة 20% من احتياطي العالم غير المتجمد من المياه العذبة.",
    sourceLabel: "UNESCO World Heritage Centre — Lake Baikal", sourceName: "UNESCO World Heritage Centre",
    sourceUrl: "https://whc.unesco.org/en/list/754/", license: "وصف UNESCO متاح وفق CC BY-SA 3.0 IGO", verifiedStatus: "source_checked",
  },
};

const visualAssignments = {
  "science-02": {
    imageUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Jupiter%20and%20its%20shrunken%20Great%20Red%20Spot.jpg?width=1200",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Jupiter_and_its_shrunken_Great_Red_Spot.jpg",
    imageSourceName: "NASA / ESA / Wikimedia Commons", imageLicense: "Public domain — credit NASA, STScI and ESA",
  },
  "science-03": {
    imageUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Saturn%20during%20Equinox.jpg?width=1200",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Saturn_during_Equinox.jpg",
    imageSourceName: "NASA/JPL/Space Science Institute / Wikimedia Commons", imageLicense: "Public domain (NASA)",
  },
  "science-22": {
    imageUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/OSIRIS%20Mars%20true%20color.jpg?width=1200",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:OSIRIS_Mars_true_color.jpg",
    imageSourceName: "ESA / OSIRIS Team / Wikimedia Commons", imageLicense: "CC BY-SA 3.0 IGO",
  },
  "general-24": {
    imageUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/The%20Earth%20seen%20from%20Apollo%2017%20%28cropped%29.jpg?width=1200",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:The_Earth_seen_from_Apollo_17_(cropped).jpg",
    imageSourceName: "NASA / Apollo 17 crew / Wikimedia Commons", imageLicense: "Public domain (NASA)",
  },
  "history-20": {
    imageUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Mona%20Lisa.jpg?width=900",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Mona_Lisa.jpg",
    imageSourceName: "Louvre Museum / Wikimedia Commons", imageLicense: "Public domain artwork",
  },
  "v16-general-001": {
    imageUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Mona%20Lisa.jpg?width=900",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Mona_Lisa.jpg",
    imageSourceName: "Louvre Museum / Wikimedia Commons", imageLicense: "Public domain artwork",
  },
  "saudi-01-unesco-hegra": {
    imageUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Qasr%20al-Farid%2C%20Hegra%20%28Madain%20Salih%29%2C%201st%20cent.%20CE%2C%20Saudi%20Arabia%20%2819%29.jpg?width=1200",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Qasr_al-Farid,_Hegra_(Madain_Salih),_1st_cent._CE,_Saudi_Arabia_(19).jpg",
    imageSourceName: "Prof. Mortel / Wikimedia Commons", imageLicense: "CC BY 2.0",
  },
  "saudi-14-hegra-south-petra": {
    imageUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Qasr%20al-Farid%2C%20Hegra%20%28Madain%20Salih%29%2C%201st%20cent.%20CE%2C%20Saudi%20Arabia%20%2819%29.jpg?width=1200",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Qasr_al-Farid,_Hegra_(Madain_Salih),_1st_cent._CE,_Saudi_Arabia_(19).jpg",
    imageSourceName: "Prof. Mortel / Wikimedia Commons", imageLicense: "CC BY 2.0",
  },
  "gulf-07-bahrain-qalat": {
    imageUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Bahrain%20Fort.jpg?width=1000",
    imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Bahrain_Fort.jpg",
    imageSourceName: "Joel / Wikimedia Commons", imageLicense: "CC BY 2.0",
  },
};

for (const question of bank.questions) {
  question.factKey ||= question.groupKey || question.id;
  question.verifiedStatus ||= "unverified";
  const leakSafe = leakSafeOverrides[question.factKey];
  if (leakSafe) Object.assign(question, leakSafe);
  const visual = visualAssignments[question.factKey];
  if (visual) {
    Object.assign(question, visual, { type: "image", imageAlt: "صورة مرئية مرتبطة بالسؤال" });
  }
  if (question.categoryId === "quran") {
    if (question.id.startsWith("quran-v18-")) question.verifiedStatus = "unverified";
    const currentFamily = question.questionFamily || question.family || "quran_topic";
    question.questionFamily = familyOverrides[question.id] || familyMap[currentFamily] || currentFamily;
    if (/^quran-v17-vocab-(02|04|06|08|10|12)$/.test(question.id)) {
      question.questionFamily = "quran_meaning";
    }
    question.family = question.questionFamily;
    if (promptFixes[question.id]) question.prompt = promptFixes[question.id];
    if (question.questionFamily === "quran_complete_verse") delete question.quoteText;
    const answerToken = norm(question.answer).replace(/^سوره\s+/, "");
    if (answerToken.length >= 3 && norm(question.quoteText).includes(answerToken)) delete question.quoteText;
    const revealFix = quranRevealFixes[question.id];
    if (revealFix) {
      [question.quranSurah, question.quranAyah, question.quranText] = revealFix;
      question.sourceName = "مجمع الملك فهد لطباعة المصحف الشريف";
      question.sourceUrl = "https://qurancomplex.gov.sa/techquran/dev/";
      question.license = "نص قرآني — يُراجع وفق شروط مجمع الملك فهد";
    }
    if (mediumQuran.has(question.id)) {
      question.difficulty = "medium";
      question.points = 200;
    }
    if (["quran-count-017", "quran-count-018", "quran-count-019", "quran-count-020", "quran-order-022", "quran-order-023", "quran-order-024", "quran-order-025"].includes(question.id)) {
      question.enabled = false;
    }
  }
  if (question.categoryId === "reciter") {
    const profile = reciterProfiles[question.answer];
    const clipIndex = Math.max(0, Math.min(7, Number(question.id.match(/-(\d+)$/)?.[1] || 1) - 1));
    if (profile && question.id.startsWith("reciter-")) {
      const sources = profile(reciterClips[clipIndex]);
      [question.audioUrl, question.audioFallbackUrl] = sources;
      question.audioFallbacks = sources.slice(2);
      question.sourceName = "Al Quran Cloud CDN / MP3Quran API / Quran Foundation (بحسب البديل)";
      question.sourceUrl = "https://www.mp3quran.net/ar/api";
      question.license = "تلاوات بشرية؛ حقوق القرّاء محفوظة وتُراجع شروط كل مزود قبل النشر التجاري";
      question.audioSourceKey = `reciter:${question.id}`;
      const clipNumber = Number(question.id.match(/(\d+)$/)?.[1] || 0);
      question.difficulty = clipNumber % 4 === 0 ? "medium" : "hard";
      question.points = question.difficulty === "hard" ? 300 : 200;
    } else question.enabled = false;
  }
}

const quranSource = {
  sourceLabel: "القرآن الكريم — مجمع الملك فهد لطباعة المصحف الشريف",
  sourceName: "مجمع الملك فهد لطباعة المصحف الشريف",
  sourceUrl: "https://qurancomplex.gov.sa/techquran/dev/",
  license: "نص قرآني — يُراجع وفق شروط مجمع الملك فهد",
  categoryId: "quran",
  type: "text",
  enabled: true,
  verifiedStatus: "unverified",
};

const additions = [
  {
    id: "quran-v18-similar-01", groupKey: "quran-v18-similar-01", factKey: "quran-v18-similar-01",
    questionFamily: "quran_similar_verses", family: "quran_similar_verses",
    prompt: "تكررت جملة ﴿إِنَّ مَعَ الْعُسْرِ يُسْرًا﴾ متتابعة في سورة الشرح؛ ما رقما الآيتين؟",
    answer: "الآيتان 5 و6", difficulty: "hard", points: 300, hint: "الآيتان متتاليتان في النصف الثاني من السورة.",
    explanation: "وردت الجملة في الآيتين الخامسة والسادسة من سورة الشرح.", quranSurah: "الشرح", quranAyah: 5,
    quranText: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا", ...quranSource,
  },
  {
    id: "quran-v18-place-01", groupKey: "quran-v18-place-01", factKey: "quran-v18-place-01",
    questionFamily: "quran_places", family: "quran_places",
    prompt: "ما المكان الذي أُمر موسى عليه السلام أن يخلع نعليه عند دخوله؟",
    answer: "الوادي المقدس طُوًى", difficulty: "hard", points: 300, hint: "ورد اسمه في سورة طه.",
    explanation: "أمر الله موسى بخلع نعليه لأنه بالوادي المقدس طوى.", quranSurah: "طه", quranAyah: 12,
    quranText: "إِنِّي أَنَا رَبُّكَ فَاخْلَعْ نَعْلَيْكَ إِنَّكَ بِالْوَادِ الْمُقَدَّسِ طُوًى", ...quranSource,
  },
  {
    id: "quran-v18-nation-01", groupKey: "quran-v18-nation-01", factKey: "quran-v18-nation-01",
    questionFamily: "quran_nations", family: "quran_nations",
    prompt: "أي قوم وصف القرآن أنهم كانوا ينحتون من الجبال بيوتًا آمنين؟",
    answer: "ثمود، أصحاب الحِجر", difficulty: "hard", points: 300, hint: "القصة في السورة التي تحمل اسم موطنهم.",
    explanation: "المراد أصحاب الحجر، وهم ثمود قوم صالح عليه السلام.", quranSurah: "الحجر", quranAyah: 82,
    quranText: "وَكَانُوا يَنْحِتُونَ مِنَ الْجِبَالِ بُيُوتًا آمِنِينَ", ...quranSource,
  },
  {
    id: "quran-v18-closing-01", groupKey: "quran-v18-closing-01", factKey: "quran-v18-closing-01",
    questionFamily: "quran_closing", family: "quran_closing",
    prompt: "بأي توجيهين تُختتم سورة العلق بعد النهي عن طاعة من يمنع الصلاة؟",
    answer: "السجود والاقتراب من الله", difficulty: "hard", points: 300, hint: "التوجيه الأول فعلٌ من أفعال الصلاة.",
    explanation: "تختتم السورة بقوله تعالى: ﴿وَاسْجُدْ وَاقْتَرِبْ﴾.", quranSurah: "العلق", quranAyah: 19,
    quranText: "كَلَّا لَا تُطِعْهُ وَاسْجُدْ وَاقْتَرِبْ", ...quranSource,
  },
  {
    id: "quran-v18-objective-01", groupKey: "quran-v18-objective-01", factKey: "quran-v18-objective-01",
    questionFamily: "quran_tadabbur_objective", family: "quran_tadabbur_objective",
    prompt: "ما الأعمال الأربعة التي استثنت سورة العصر أصحابها من الخسر؟",
    answer: "الإيمان والعمل الصالح والتواصي بالحق والتواصي بالصبر", difficulty: "hard", points: 300,
    hint: "عملان فرديان وعملان يقومان على التواصي.", explanation: "جمعت الآية الثالثة أصول النجاة الأربعة المذكورة في السورة.",
    quranSurah: "العصر", quranAyah: 3,
    quranText: "إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ", ...quranSource,
  },
  {
    id: "saudi-v18-regions-count", categoryId: "saudi", groupKey: "saudi-v18-regions-count", factKey: "saudi-v18-regions-count",
    questionFamily: "saudi-administration", family: "saudi-administration",
    prompt: "كم منطقة إدارية تتكون منها المملكة العربية السعودية وفق نظام المناطق؟", answer: "13 منطقة إدارية",
    difficulty: "medium", points: 200, hint: "العدد أكبر من عشر وأقل من خمس عشرة.",
    explanation: "يقسم نظام المناطق المملكة إلى ثلاث عشرة منطقة إدارية.",
    sourceLabel: "المنصة الوطنية الموحدة — آلية عمل الحكومة", sourceName: "المنصة الوطنية الموحدة",
    sourceUrl: "https://my.gov.sa/saml.authn/content/govmechanism", license: "مرجع حكومي سعودي",
    type: "text", enabled: true, verifiedStatus: "source_checked",
  },
  {
    id: "seerah-v18-first-envoy", categoryId: "seerah", groupKey: "seerah-v18-first-envoy", factKey: "seerah-v18-first-envoy",
    questionFamily: "seerah_companions", family: "seerah_companions",
    prompt: "من الصحابي الذي بعثه النبي ﷺ إلى يثرب بعد بيعة العقبة الأولى ليعلّم أهلها الإسلام؟", answer: "مصعب بن عمير رضي الله عنه",
    difficulty: "hard", points: 300, hint: "استشهد لاحقًا حاملًا لواء المسلمين يوم أُحد.", explanation: "بعث النبي ﷺ مصعب بن عمير إلى يثرب ليقرئ أهلها القرآن ويعلّمهم الإسلام.",
    sourceLabel: "الموسوعة التاريخية — الدرر السنية", sourceName: "الموسوعة التاريخية — الدرر السنية", sourceUrl: "https://dorar.net/history", license: "مرجع معرفي عام؛ راجع المصدر الأصلي عند النشر",
    type: "text", enabled: true, verifiedStatus: "unverified",
  },
  {
    id: "seerah-v18-hijrah-bed", categoryId: "seerah", groupKey: "seerah-v18-hijrah-bed", factKey: "seerah-v18-hijrah-bed",
    questionFamily: "seerah_hijrah", family: "seerah_hijrah",
    prompt: "من الصحابي الذي نام في فراش النبي ﷺ ليلة خروجه للهجرة إلى المدينة؟", answer: "علي بن أبي طالب رضي الله عنه",
    difficulty: "hard", points: 300, hint: "هو ابن عم النبي ﷺ وزوج ابنته فاطمة.", explanation: "نام علي بن أبي طالب رضي الله عنه في فراش النبي ﷺ ليلة الهجرة وردّ الودائع إلى أهلها.",
    sourceLabel: "الموسوعة التاريخية — الدرر السنية", sourceName: "الموسوعة التاريخية — الدرر السنية", sourceUrl: "https://dorar.net/history", license: "مرجع معرفي عام؛ راجع المصدر الأصلي عند النشر",
    type: "text", enabled: true, verifiedStatus: "unverified",
  },
  {
    id: "science-v18-photon", categoryId: "science", groupKey: "science-v18-photon", factKey: "science-v18-photon",
    questionFamily: "science-physics", family: "science-physics",
    prompt: "ما الجسيم الحامل للقوة الكهرومغناطيسية في النموذج القياسي لفيزياء الجسيمات؟", answer: "الفوتون",
    difficulty: "hard", points: 300, hint: "هو أيضًا كمّ الضوء.", explanation: "يحمل الفوتون التفاعل الكهرومغناطيسي بين الجسيمات المشحونة.",
    sourceLabel: "CERN — The Standard Model", sourceName: "CERN", sourceUrl: "https://home.cern/science/physics/standard-model/", license: "مرجع علمي رسمي",
    type: "text", enabled: true, verifiedStatus: "source_checked",
  },
];

const knownIds = new Set(bank.questions.map((question) => question.id));
for (const question of additions) if (!knownIds.has(question.id)) bank.questions.push(question);

// Keep each Global Cycle divisible by six. This removes the only state in which a bridge
// session could be forced to repeat a family while still preserving the complete records.
const retiredFactKeys = new Set([
  "v16-gulf-030",
  "football-v17-variety-22", "football-v17-variety-23", "football-v17-variety-24",
  "v16-world-026", "v16-science-019", "science-v17-variety-10", "arabic-25", "v16-general-030",
  "quran-quote-018", "quran-quote-019", "quran-quote-020",
  "reciter-13-01", "reciter-13-02", "reciter-13-03", "reciter-13-04", "reciter-13-05", "reciter-13-06", "reciter-13-07", "reciter-13-08",
]);
const reactivatedFactKeys = new Set(["v16-world-030", "science-v17-variety-11", "v16-arabic-030"]);
for (const question of bank.questions) {
  if (reactivatedFactKeys.has(question.factKey || question.groupKey)) question.enabled = true;
  if (retiredFactKeys.has(question.factKey || question.groupKey)) question.enabled = false;
}

bank.version = "18.0.0";
fs.writeFileSync(file, `${JSON.stringify(bank, null, 2)}\n`, "utf8");
console.log(`Majlis bank upgraded to ${bank.version}: ${bank.questions.length} questions.`);
