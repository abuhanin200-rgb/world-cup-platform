const ARABIC_PLAYER_NAMES: Record<string, string> = {
  // السعودية
  "mohammed al owais": "محمد العويس",
  "mohamed al owais": "محمد العويس",
  "m al owais": "محمد العويس",
  "ahmed al kassar": "أحمد الكسار",
  "nawaf al aqidi": "نواف العقيدي",
  "saud abdulhamid": "سعود عبدالحميد",
  "saud abdul hamid": "سعود عبدالحميد",
  "mohammed abu al shamat": "محمد أبو الشامات",
  "mohamed abu al shamat": "محمد أبو الشامات",
  "khalid al ghannam": "خالد الغنام",
  "moteb al harbi": "متعب الحربي",
  "moteab al harbi": "متعب الحربي",
  "abdulelah al amri": "عبدالإله العمري",
  "abdullah al amri": "عبدالإله العمري",
  "nawaf boushal": "نواف بوشل",
  "hassan kadesh": "حسان كادش",
  "ali lajami": "علي لاجامي",
  "ali al lajami": "علي لاجامي",
  "ali majrashi": "علي مجرشي",
  "hassan tambakti": "حسان تمبكتي",
  "hasan tambakti": "حسان تمبكتي",
  "jehad thikri": "جهاد ذكري",
  "j thakri": "جهاد ذكري",
  "nasser al dawsari": "ناصر الدوسري",
  "nasser al-dawsari": "ناصر الدوسري",
  "alaa al hajji": "علاء حجي",
  "alaa al haji": "علاء حجي",
  "ziyad al johani": "زياد الجهني",
  "musab al juwayr": "مصعب الجوير",
  "musab al juwair": "مصعب الجوير",
  "abdullah al khaibari": "عبدالله الخيبري",
  "mohammed kanno": "محمد كنو",
  "mohamed kanno": "محمد كنو",
  "sultan mandash": "سلطان مندش",
  "ayman yahya": "أيمن يحيى",
  "feras al brikan": "فراس البريكان",
  "firas al buraikan": "فراس البريكان",
  "salem al dawsari": "سالم الدوسري",
  "salem al-dawsari": "سالم الدوسري",
  "abdullah al hamdan": "عبدالله الحمدان",
  "saleh al shehri": "صالح الشهري",
  "saleh al amri": "صالح العمري",
  "mohammed al qahtani": "محمد القحطاني",
  "mohamed al qahtani": "محمد القحطاني",

  // عُمان
  "ibrahim al mukhaini": "إبراهيم المخيني",
  "ibrahim saleh al mukhaini": "إبراهيم المخيني",
  "fayeez al rushaidi": "فايز الرشيدي",
  "faiz al rushaidi": "فايز الرشيدي",
  "bilal al bloushi": "بلال البلوشي",
  "ghanim al habashi": "غانم الحبشي",
  "thani gharib al rushaidi": "ثاني الرشيدي",
  "musab al shaqsy": "مصعب الشقصي",
  "musaab al shaqsy": "مصعب الشقصي",
  "ahmed al khamisi": "أحمد الخميسي",
  "nayef faraj": "نايف فرج",
  "khalid al braiki": "خالد البريكي",
  "khalid al-braiki": "خالد البريكي",
  "ali al busaidi": "علي البوسعيدي",
  "ali al-busaidi": "علي البوسعيدي",
  "khalid al ghatrifi": "خالد الغطريفي",
  "arshad al alawi": "أرشد العلوي",
  "zahir al aghbari": "ظاهر الأغبري",
  "zahir sulaiman abdullah al aghbari": "ظاهر الأغبري",
  "mohammed al ghafri": "محمد الغافري",
  "mohamed al ghafri": "محمد الغافري",
  "sultan badar al marzuq": "سلطان المرزوق",
  "jameel al yahmadi": "جميل اليحمدي",
  "abdullah fawaz": "عبدالله فواز",
  "amjad al harthi": "أمجد الحارثي",
  "ahed al mashaiki": "عاهد المشايخي",
  "nasser al rawahi": "ناصر الرواحي",
  "nasser al-rawahi": "ناصر الرواحي",
  "mahmood mabrook": "محمود مبروك",
  "salah al yahyaei": "صلاح اليحيائي",
  "salaah al yahyaei": "صلاح اليحيائي",
  "harib al saadi": "حارب السعدي",
  "harib al-saadi": "حارب السعدي",
  "issam al sabhi": "عصام الصبحي",
  "muhsen al ghassani": "محسن الغساني",
  "mohsen al ghassani": "محسن الغساني",
  "abdulrahman al mushaifri": "عبدالرحمن المشيفري",
  "abdulrahman al-mushaifri": "عبدالرحمن المشيفري",

  // أسماء خليجية موثقة شائعة من القوائم الحالية
  "jalal hassan": "جلال حسن",
  "ahmed basil": "أحمد باسل",
  "fahad talib": "فهد طالب",
  "mahmoud abunada": "محمود أبو ندى",
  "mahmoud abu nada": "محمود أبو ندى",
  "salah zakaria": "صلاح زكريا",
  "meshaal barsham": "مشعل برشم",
  "boualem khoukhi": "بوعلام خوخي",
  "akram afif": "أكرم عفيف",
  "hassan al haydos": "حسن الهيدوس",
  "khaled al rashidi": "خالد الرشيدي",
  "khalid al rashidi": "خالد الرشيدي",
  "yousef nasser": "يوسف ناصر",
  "mohammad daham": "محمد دحام",
  "fahad al hajeri": "فهد الهاجري",
  "othman camara": "عثمان كامارا",
  "sultan adil": "سلطان عادل",
  "ali saleh": "علي صالح",
  "fabio de lima": "فابيو دي ليما",
};

const ARABIC_COACH_NAMES: Record<string, string> = {
  "georgios donis": "جورجيوس دونيس",
  "tarek sek tioui": "طارق السكتيوي",
  "tarik sektioui": "طارق السكتيوي",
  "tarek sektioui": "طارق السكتيوي",
  "julien lopetegui": "جولين لوبيتيغي",
  "julen lopetegui": "جولين لوبيتيغي",
  "dragan talajic": "دراغان تالاييتش",
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getVerifiedArabicPlayerName(name: string) {
  return ARABIC_PLAYER_NAMES[normalize(name)] || name;
}

export function getVerifiedArabicCoachName(name: string) {
  return ARABIC_COACH_NAMES[normalize(name)] || name;
}
