import fs from "node:fs";

const file = new URL("../src/data/majlisQuestionBank.json", import.meta.url);
const bank = JSON.parse(fs.readFileSync(file, "utf8"));

const quranSource = {
  sourceLabel: "القرآن الكريم — مجمع الملك فهد لطباعة المصحف الشريف",
  sourceName: "مجمع الملك فهد لطباعة المصحف الشريف",
  sourceUrl: "https://qurancomplex.gov.sa/techquran/dev/",
  license: "نص قرآني — يُراجع وفق شروط مجمع الملك فهد",
};

// The former complete-the-verse prompts exposed too much of their answer.  Each
// replacement has one deterministic neighbour and keeps the quoted verse separate
// from the verse revealed after the host asks for the answer.
const adjacentTargets = new Map([
  ["quran-v17-complete-02", { direction: "previous", ayah: 285, text: "ءَامَنَ ٱلرَّسُولُ بِمَآ أُنزِلَ إِلَيْهِ مِن رَّبِّهِۦ وَٱلْمُؤْمِنُونَ ۚ كُلٌّ ءَامَنَ بِٱللَّهِ وَمَلَـٰٓئِكَتِهِۦ وَكُتُبِهِۦ وَرُسُلِهِۦ لَا نُفَرِّقُ بَيْنَ أَحَدٍ مِّن رُّسُلِهِۦ ۚ وَقَالُوا۟ سَمِعْنَا وَأَطَعْنَا ۖ غُفْرَانَكَ رَبَّنَا وَإِلَيْكَ ٱلْمَصِيرُ" }],
  ["quran-v17-complete-03", { direction: "next", ayah: 29, text: "ٱلَّذِينَ ءَامَنُوا۟ وَعَمِلُوا۟ ٱلصَّـٰلِحَـٰتِ طُوبَىٰ لَهُمْ وَحُسْنُ مَـَٔابٍ" }],
  ["quran-v17-complete-04", { direction: "next", ayah: 3, text: "وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ ۚ وَمَن يَتَوَكَّلْ عَلَى ٱللَّهِ فَهُوَ حَسْبُهُۥٓ ۚ إِنَّ ٱللَّهَ بَـٰلِغُ أَمْرِهِۦ ۚ قَدْ جَعَلَ ٱللَّهُ لِكُلِّ شَىْءٍ قَدْرًا" }],
  ["quran-v17-complete-05", { direction: "next", ayah: 54, text: "وَأَنِيبُوٓا۟ إِلَىٰ رَبِّكُمْ وَأَسْلِمُوا۟ لَهُۥ مِن قَبْلِ أَن يَأْتِيَكُمُ ٱلْعَذَابُ ثُمَّ لَا تُنصَرُونَ" }],
  ["quran-v17-complete-06", { direction: "next", ayah: 140, text: "إِن يَمْسَسْكُمْ قَرْحٌ فَقَدْ مَسَّ ٱلْقَوْمَ قَرْحٌ مِّثْلُهُۥ ۚ وَتِلْكَ ٱلْأَيَّامُ نُدَاوِلُهَا بَيْنَ ٱلنَّاسِ وَلِيَعْلَمَ ٱللَّهُ ٱلَّذِينَ ءَامَنُوا۟ وَيَتَّخِذَ مِنكُمْ شُهَدَآءَ ۗ وَٱللَّهُ لَا يُحِبُّ ٱلظَّـٰلِمِينَ" }],
  ["quran-v17-complete-07", { direction: "next", ayah: 47, text: "وَلَا تَكُونُوا۟ كَٱلَّذِينَ خَرَجُوا۟ مِن دِيَـٰرِهِم بَطَرًا وَرِئَآءَ ٱلنَّاسِ وَيَصُدُّونَ عَن سَبِيلِ ٱللَّهِ ۚ وَٱللَّهُ بِمَا يَعْمَلُونَ مُحِيطٌ" }],
  ["quran-v17-complete-08", { direction: "next", ayah: 154, text: "وَلَا تَقُولُوا۟ لِمَن يُقْتَلُ فِى سَبِيلِ ٱللَّهِ أَمْوَٰتٌۢ ۚ بَلْ أَحْيَآءٌ وَلَـٰكِن لَّا تَشْعُرُونَ" }],
  ["quran-v17-complete-09", { direction: "next", ayah: 115, text: "وَلَقَدْ عَهِدْنَآ إِلَىٰٓ ءَادَمَ مِن قَبْلُ فَنَسِىَ وَلَمْ نَجِدْ لَهُۥ عَزْمًا" }],
  ["quran-v17-complete-10", { direction: "next", ayah: 24, text: "وَٱخْفِضْ لَهُمَا جَنَاحَ ٱلذُّلِّ مِنَ ٱلرَّحْمَةِ وَقُل رَّبِّ ٱرْحَمْهُمَا كَمَا رَبَّيَانِى صَغِيرًا" }],
  ["quran-v17-complete-11", { direction: "next", ayah: 14, text: "۞ قَالَتِ ٱلْأَعْرَابُ ءَامَنَّا ۖ قُل لَّمْ تُؤْمِنُوا۟ وَلَـٰكِن قُولُوٓا۟ أَسْلَمْنَا وَلَمَّا يَدْخُلِ ٱلْإِيمَـٰنُ فِى قُلُوبِكُمْ ۖ وَإِن تُطِيعُوا۟ ٱللَّهَ وَرَسُولَهُۥ لَا يَلِتْكُم مِّنْ أَعْمَـٰلِكُمْ شَيْـًٔا ۚ إِنَّ ٱللَّهَ غَفُورٌ رَّحِيمٌ" }],
  ["quran-v17-complete-12", { direction: "next", ayah: 91, text: "وَأَوْفُوا۟ بِعَهْدِ ٱللَّهِ إِذَا عَـٰهَدتُّمْ وَلَا تَنقُضُوا۟ ٱلْأَيْمَـٰنَ بَعْدَ تَوْكِيدِهَا وَقَدْ جَعَلْتُمُ ٱللَّهَ عَلَيْكُمْ كَفِيلًا ۚ إِنَّ ٱللَّهَ يَعْلَمُ مَا تَفْعَلُونَ" }],
  ["quran-v17-complete-13", { direction: "next", ayah: 57, text: "إِنَّ ٱلَّذِينَ يُؤْذُونَ ٱللَّهَ وَرَسُولَهُۥ لَعَنَهُمُ ٱللَّهُ فِى ٱلدُّنْيَا وَٱلْـَٔاخِرَةِ وَأَعَدَّ لَهُمْ عَذَابًا مُّهِينًا" }],
  ["quran-v17-complete-14", { direction: "next", ayah: 19, text: "وَلَا تَكُونُوا۟ كَٱلَّذِينَ نَسُوا۟ ٱللَّهَ فَأَنسَىٰهُمْ أَنفُسَهُمْ ۚ أُو۟لَـٰٓئِكَ هُمُ ٱلْفَـٰسِقُونَ" }],
  ["quran-v17-complete-15", { direction: "previous", ayah: 2, text: "إِنَّ ٱلْإِنسَـٰنَ لَفِى خُسْرٍ" }],
  ["quran-v17-complete-16", { direction: "next", ayah: 6, text: "أَلَمْ يَجِدْكَ يَتِيمًا فَـَٔاوَىٰ" }],
  ["quran-v17-complete-17", { direction: "next", ayah: 88, text: "فَلَمَّا دَخَلُوا۟ عَلَيْهِ قَالُوا۟ يَـٰٓأَيُّهَا ٱلْعَزِيزُ مَسَّنَا وَأَهْلَنَا ٱلضُّرُّ وَجِئْنَا بِبِضَـٰعَةٍ مُّزْجَىٰ فَأَوْفِ لَنَا ٱلْكَيْلَ وَتَصَدَّقْ عَلَيْنَآ ۖ إِنَّ ٱللَّهَ يَجْزِى ٱلْمُتَصَدِّقِينَ" }],
  ["quran-v17-complete-18", { direction: "previous", ayah: 68, text: "وَمَنْ أَظْلَمُ مِمَّنِ ٱفْتَرَىٰ عَلَى ٱللَّهِ كَذِبًا أَوْ كَذَّبَ بِٱلْحَقِّ لَمَّا جَآءَهُۥٓ أَلَيْسَ فِى جَهَنَّمَ مَثْوًى لِّلْكَـٰفِرِينَ" }],
  ["quran-v17-complete-19", { direction: "next", ayah: 153, text: "يَـٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ ٱسْتَعِينُوا۟ بِٱلصَّبْرِ وَٱلصَّلَوٰةِ ۚ إِنَّ ٱللَّهَ مَعَ ٱلصَّـٰبِرِينَ" }],
  ["quran-v17-complete-20", { direction: "next", ayah: 8, text: "وَقَالَ مُوسَىٰٓ إِن تَكْفُرُوا۟ أَنتُمْ وَمَن فِى ٱلْأَرْضِ جَمِيعًا فَإِنَّ ٱللَّهَ لَغَنِىٌّ حَمِيدٌ" }],
  ["quran-v17-complete-21", { direction: "next", ayah: 41, text: "ٱنفِرُوا۟ خِفَافًا وَثِقَالًا وَجَـٰهِدُوا۟ بِأَمْوَٰلِكُمْ وَأَنفُسِكُمْ فِى سَبِيلِ ٱللَّهِ ۚ ذَٰلِكُمْ خَيْرٌ لَّكُمْ إِن كُنتُمْ تَعْلَمُونَ" }],
  ["quran-v17-complete-22", { direction: "next", ayah: 88, text: "فَٱسْتَجَبْنَا لَهُۥ وَنَجَّيْنَـٰهُ مِنَ ٱلْغَمِّ ۚ وَكَذَٰلِكَ نُـۨجِى ٱلْمُؤْمِنِينَ" }],
  ["quran-v17-complete-23", { direction: "next", ayah: 61, text: "ٱللَّهُ ٱلَّذِى جَعَلَ لَكُمُ ٱللَّيْلَ لِتَسْكُنُوا۟ فِيهِ وَٱلنَّهَارَ مُبْصِرًا ۚ إِنَّ ٱللَّهَ لَذُو فَضْلٍ عَلَى ٱلنَّاسِ وَلَـٰكِنَّ أَكْثَرَ ٱلنَّاسِ لَا يَشْكُرُونَ" }],
  ["quran-v17-complete-24", { direction: "next", ayah: 8, text: "وَٱلَّذِينَ كَفَرُوا۟ فَتَعْسًا لَّهُمْ وَأَضَلَّ أَعْمَـٰلَهُمْ" }],
]);

let converted = 0;
for (const question of bank.questions) {
  if (question.id === "quran-v17-complete-01") {
    // 94:5 and 94:6 differ only by the initial conjunction, which makes a fair
    // next-ayah question impossible. Retire it rather than serving an ambiguous one.
    question.enabled = false;
    question.questionFamily = "quran_adjacent_ayah_retired";
    question.family = question.questionFamily;
    continue;
  }
  const target = adjacentTargets.get(question.id);
  if (!target) continue;
  const shownVerse = String(question.quranText || "").trim();
  if (!shownVerse) throw new Error(`Missing source verse for ${question.id}`);
  question.questionFamily = "quran_adjacent_ayah";
  question.family = "quran_adjacent_ayah";
  question.prompt = target.direction === "next" ? "ما الآية التي تلي هذه الآية؟" : "ما الآية التي تسبق هذه الآية؟";
  question.answer = target.text;
  question.quoteText = shownVerse;
  question.quranAyah = target.ayah;
  question.quranText = target.text;
  question.explanation = target.direction === "next" ? "الإجابة هي الآية التالية مباشرة في السورة." : "الإجابة هي الآية السابقة مباشرة في السورة.";
  Object.assign(question, quranSource);
  converted += 1;
}

for (const question of bank.questions) {
  if (question.enabled !== false && question.type === "audio") {
    question.audioMaxSeconds = 20;
  }
}

bank.version = "19.0.0";
fs.writeFileSync(file, `${JSON.stringify(bank, null, 2)}\n`, "utf8");
console.log(`Majlis bank upgraded to ${bank.version}: ${converted} complete-verse prompts converted; 1 ambiguous prompt retired.`);
