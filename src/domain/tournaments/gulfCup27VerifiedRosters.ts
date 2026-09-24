export type GulfCup27VerifiedRole = "G" | "D" | "M" | "F";

export type GulfCup27VerifiedPlayer = {
  nameAr: string;
  role: GulfCup27VerifiedRole;
  aliases?: string[];
};

type TeamRoster = {
  coachAr: string;
  players: GulfCup27VerifiedPlayer[];
};

const P = (
  nameAr: string,
  role: GulfCup27VerifiedRole,
  ...aliases: string[]
): GulfCup27VerifiedPlayer => ({ nameAr, role, aliases });

/**
 * قائمة خليجي 27 الحالية باللغة العربية.
 * تستخدم كطبقة تحقق فقط: اللاعب غير الموجود هنا لا يدخل في التشكيل المتوقع.
 * في التشكيل الرسمي يبقى ترتيب/مركز/grid مزود المباراة هو مصدر الحقيقة.
 */
export const GULF_CUP_27_VERIFIED_ROSTERS: Record<string, TeamRoster> = {
  ksa: {
    coachAr: "جيورجوس دونيس",
    players: [
      P("محمد العويس", "G", "Mohammed Al Owais", "Mohamed Al Owais"),
      P("نواف العقيدي", "G", "Nawaf Al Aqidi", "Nawaf Al-Aqidi"),
      P("حامد يوسف", "G", "Hamed Youssef", "Hamed Yousef", "Hamed Yusuf"),
      P("حسان تمبكتي", "D", "Hassan Tambakti", "Hasan Tambakti"),
      P("عبد الإله العمري", "D", "Abdulelah Al Amri", "Abdulelah Al-Amri"),
      P("نواف بوشل", "D", "Nawaf Boushal", "Nawaf Bu Washl"),
      P("حسن كادش", "D", "Hassan Kadesh", "Hasan Kadesh"),
      P("متعب الحربي", "D", "Moteb Al Harbi", "Moteab Al Harbi"),
      P("جهاد ذكري", "D", "Jehad Thakri", "Jihad Thikri", "J. Thakri"),
      P("ريان حامد", "D", "Rayan Hamed", "Rayan Hamid"),
      P("محمد محزري", "D", "Mohammed Mahzari", "Mohamed Mahzari"),
      P("زكريا هوساوي", "D", "Zakaria Hawsawi", "Zakaria Housawi"),
      P("محمد كنو", "M", "Mohammed Kanno", "Mohamed Kanno"),
      P("ناصر الدوسري", "M", "Nasser Al Dawsari", "Nasser Al-Dawsari"),
      P("عبد الله الخيبري", "M", "Abdullah Al Khaibari", "Abdullah Al-Khaibari"),
      P("مختار علي", "M", "Mukhtar Ali", "Mokhtar Ali"),
      P("زياد الجهني", "M", "Ziyad Al Johani", "Ziad Al Johani"),
      P("محمد القحطاني", "M", "Mohammed Al Qahtani", "Mohamed Al Qahtani"),
      P("علاء آل حجي", "M", "Alaa Al Hajji", "Ala Al Haji"),
      P("فراس البريكان", "F", "Feras Al Brikan", "Firas Al Buraikan", "Firas Al-Birakan"),
      P("عبد الله الحمدان", "F", "Abdullah Al Hamdan", "Abdullah Al-Hamdan"),
      P("صالح أبو الشامات", "M", "Saleh Abu Al Shamat", "Saleh Abu Al-Shamat"),
      P("محمد أبو الشامات", "D", "Mohammed Abu Al Shamat", "Mohamed Abu Al-Shamat"),
      P("سلطان مندش", "M", "Sultan Mandash"),
      P("عبد الله آل سالم", "F", "Abdullah Al Salem", "Abdullah Al-Salem"),
      P("همام الهمامي", "F", "Hammam Al Hammami", "Homam Al Hammami"),
      // استدعاء لاحق بعد إصابة العقيدي؛ يبقى ضمن قائمة التحقق إن ظهر من المزود.
      P("عبد القدوس عطية", "G", "Abdulquddus Atiyah", "Abdul Quddus Atiah", "Abdulquddus Attiah"),
    ],
  },

  irq: {
    coachAr: "غراهام أرنولد",
    players: [
      P("أحمد باسل", "G", "Ahmed Basil", "Ahmad Basil"),
      P("حسين حسن", "G", "Hussein Hassan", "Hussain Hassan"),
      P("محمد صالح", "G", "Mohammed Saleh", "Mohamed Saleh"),
      P("زيد تحسين", "D", "Zaid Tahseen", "Zaid Tahsin"),
      P("أكام هاشم", "D", "Akam Hashim", "Akam Hashem"),
      P("ميرخاس دوسكي", "D", "Merchas Doski", "Mirhas Doski", "Merchas Doshki"),
      P("مصطفى سعدون", "D", "Mustafa Saadoun", "Mostafa Saadoun"),
      P("أحمد يحيى", "D", "Ahmed Yahya", "Ahmad Yahya"),
      P("ميثم جبار", "D", "Maytham Jabbar", "Mitham Jabbar"),
      P("يوسف الإمام", "D", "Yousef Al Imam", "Yusuf Al Imam"),
      P("محمد دلاور", "D", "Mohammed Dilawar", "Mohamed Delawar"),
      P("إبراهيم بايش", "M", "Ibrahim Bayesh", "Ibrahim Baysh"),
      P("أحمد قاسم", "M", "Ahmed Qasim", "Ahmad Qasem"),
      P("زيدان إقبال", "M", "Zidane Iqbal"),
      P("أمير العماري", "M", "Amir Al Ammari", "Amir Al-Ammari"),
      P("علي جاسم", "M", "Ali Jasim", "Ali Jassem"),
      P("زيد إسماعيل", "M", "Zaid Ismail", "Zaid Esmaeel"),
      P("يوسف نصراوي", "M", "Yousef Nasrawi", "Yusuf Nasraoui"),
      P("كرار نبيل", "M", "Karrar Nabeel", "Karrar Nabil"),
      P("عبد الرزاق قاسم", "M", "Abdulrazzaq Qasim", "Abdul Razzaq Qasim"),
      P("حيدر عبد الكريم", "M", "Haider Abdul Kareem", "Hayder Abdulkarim"),
      P("محمد قاسم", "M", "Mohammed Qasim", "Mohamed Qasem"),
      P("بسام شاكر", "M", "Bassam Shakir", "Bassem Shaker"),
      P("علي الحمادي", "F", "Ali Al Hamadi", "Ali Al-Hamadi"),
      P("أيمن حسين", "F", "Aymen Hussein", "Ayman Hussein"),
      P("سيف رشيد", "F", "Saif Rashid", "Saif Rasheed"),
    ],
  },

  uae: {
    coachAr: "زلاتكو داليتش",
    players: [
      P("خالد عيسى", "G", "Khalid Eisa", "Khalid Essa"),
      P("حمد المقبالي", "G", "Hamad Al Meqbaali", "Hamad Al Muqbali"),
      P("فهد الظنحاني", "G", "Fahad Al Dhanhani", "Fahad Al-Dhanhani"),
      P("خليفة الحمادي", "D", "Khalifa Al Hammadi", "Khalifa Al-Hammadi"),
      P("خالد الظنحاني", "D", "Khaled Al Dhanhani", "Khalid Al Dhanhani", "Khaled Al-Dhanhani"),
      P("ماركوس ميلوني", "D", "Marcus Meloni", "Marcos Meloni"),
      P("لوكاس بيمنتا", "D", "Lucas Pimenta"),
      P("زايد الزعابي", "D", "Zayed Al Zaabi", "Zayed Al-Zaabi"),
      P("روبن فيليب", "D", "Ruben Philip", "Ruben Filipe", "Ruben Canedo"),
      P("ساشا إيفكوفيتش", "D", "Sasa Ivkovic", "Sasha Ivkovic"),
      P("علاء الدين زهير", "D", "Alaeddine Zouhir", "Alaaeddine Zouhir", "A. Zouhir"),
      P("إيريك دي مينيزيس", "D", "Erik de Menezes", "Eric de Menezes", "Erik Menezes", "Erik"),
      P("حارب عبد الله", "M", "Harib Abdalla", "Harib Abdullah"),
      P("فابيو ليما", "M", "Fabio Lima", "Fabio De Lima"),
      P("عصام فايز", "M", "Eisa Fayez", "Issam Fayez"),
      P("عبد الله حمد", "M", "Abdalla Hamad", "Abdullah Hamad"),
      P("نيكولاس خيمينيز", "M", "Nicolas Gimenez", "Nicolas Giménez", "N. Gimenez", "Neeskens Gimenez"),
      P("لون بيريرا", "M", "Luan Pereira", "Luanzinho"),
      P("مامادو كوليبالي", "M", "Mamadou Coulibaly", "M. Coulibaly"),
      P("علي صالح", "F", "Ali Saleh"),
      P("سلطان عادل", "F", "Sultan Adil"),
      P("برونو دي أوليفيرا", "F", "Bruno de Oliveira", "Bruno Oliveira", "Bruno"),
      P("ريتشارد أكونور", "F", "Richard Akonnor", "R. Akonnor"),
      P("جويلهرم داسيلفا", "F", "Guilherme da Silva", "Guilherme Bala", "Guilherme Bissoli Bala"),
      P("عثمان كمارا", "F", "Othman Camara", "Ousmane Camara"),
      P("يوري سيزار", "F", "Yuri Cesar", "Yuri César"),
    ],
  },

  qat: {
    coachAr: "جولين لوبيتيغي",
    players: [
      P("محمود أبو ندى", "G", "Mahmoud Abunada", "Mahmoud Abu Nada"),
      P("صلاح زكريا", "G", "Salah Zakaria"),
      P("مشعل برشم", "G", "Meshaal Barsham", "Meshael Barsham"),
      P("بيدرو ميغيل", "D", "Pedro Miguel", "Pedro Miguel Carvalho"),
      P("طارق سلمان", "D", "Tarek Salman", "Tariq Salman"),
      P("عيسى لاي", "D", "Issa Lay", "Essa Lai", "Issa Lai"),
      P("جاسم جابر", "M", "Jassem Gaber", "Jasim Gaber", "Jassem Jaber"),
      P("أيوب العلوي", "D", "Ayoub Al Alawi", "Ayoub Al Ouwi", "Ayoub Al Owii"),
      P("همام الأمين", "D", "Homam Al Amin", "Homam Al-Amin", "Homam Ahmed"),
      P("بوعلام خوخي", "D", "Boualem Khoukhi"),
      P("سلطان البريك", "D", "Sultan Al Brake", "Sultan Al-Braik"),
      P("عبد العزيز حاتم", "M", "Abdulaziz Hatem", "Abdul Aziz Hatem"),
      P("كريم بوضياف", "M", "Karim Boudiaf"),
      P("محمد مناعي", "M", "Mohammed Mannai", "Mohamed Mannai"),
      P("أحمد فتحي", "M", "Ahmed Fathy", "Ahmad Fathi"),
      P("عاصم مادبو", "M", "Assim Madibo", "Assem Madibo"),
      P("نايف الحضرمي", "M", "Naif Al Hadhrami", "Nayef Al Hadhrami"),
      P("أحمد علاء الدين", "F", "Ahmed Alaaeldin", "Ahmed Alaa"),
      P("إدميلسون جونيور", "F", "Edmilson Junior", "Edmilson Jr"),
      P("أحمد الجانحي", "F", "Ahmed Al Janhi", "Ahmed Al-Janhi", "Ahmed Al Ganehi"),
      P("حسن الهيدوس", "F", "Hassan Al Haydos", "Hasan Al-Haydos"),
      P("أكرم عفيف", "F", "Akram Afif"),
      P("يوسف عبد الرزاق", "F", "Yusuf Abdurisag", "Yousef Abdulrazzaq"),
      P("المعز علي", "F", "Almoez Ali", "Al Moez Ali"),
      P("تحسين محمد", "F", "Tahsin Mohammed", "Tahseen Mohammed", "Tahsin Jamshid"),
      P("هاشم علي", "F", "Hashim Ali", "Hashem Ali"),
    ],
  },

  yem: {
    coachAr: "نور الدين ولد علي",
    players: [
      P("أسامة حيدر", "G", "Osama Haider", "Oussama Haider"),
      P("محمد أمان", "G", "Mohammed Aman", "Mohamed Aman"),
      P("أسامة مكرف", "G", "Osama Makraf", "Osama Makref"),
      P("هارون الزبيدي", "D", "Haroun Al Zubaidi", "Harun Al Zubaidi"),
      P("رامي الوسماني", "D", "Rami Al Wasmani", "Rami Al-Wasmani"),
      P("علي الدقين", "D", "Ali Al Duqain", "Ali Al-Duqain"),
      P("رضوان الحبيشي", "D", "Radwan Al Hubaishi", "Ridwan Al Hubaishi"),
      P("نادر سهل", "D", "Nader Sahl"),
      P("حمزة الريمي", "D", "Hamza Al Raimi", "Hamza Al-Raymi"),
      P("عماد الجديمة", "D", "Emad Al Jodaimah", "Imad Al Judaima"),
      P("صقر خالد الدربي", "D", "Saqr Al Darbi", "Saqr Al-Darbi", "Saqr Khaled", "Saqer Khalid"),
      P("حمزة الصرابي", "M", "Hamza Al Sorabi", "Hamza Al-Sorabi"),
      P("أسامة عنبر", "M", "Osama Anbar"),
      P("عمر منصور", "M", "Omar Mansour", "Omar Mansor", "Omar Golan", "Omar Joulan"),
      P("محمد هاشم", "M", "Mohammed Hashem", "Mohamed Hashim", "Mohammed Al Najjar"),
      P("نواف عبد الله", "M", "Nawaf Abdullah"),
      P("أنيس المعاري", "M", "Anis Al Maari", "Anes Al Maari"),
      P("طارق شهاب", "M", "Tareq Shihab", "Tariq Shehab"),
      P("ناصر محمدوه", "M", "Nasser Mohammedoh", "Nasser Mohammed", "Naser Mohammed", "Nasser Al Jahoushi"),
      P("عادل عباس", "M", "Adel Abbas", "Adil Abbas", "Adel Abbas Qasim"),
      P("عبدالواسع المطري", "F", "Abdulwasea Al Matari", "Abdulwase Al Matari"),
      P("عبد المجيد صبارة", "F", "Abdulmajid Sabara", "Abdul Majeed Sabara"),
      P("دماني ميلور", "F", "Damani Mellor", "D'Mani Mellor"),
      P("عمر الداحي", "F", "Omar Al Dahi", "Omar Al-Dahi"),
      P("أحمد ماهر", "F", "Ahmed Maher", "Ahmad Maher"),
      P("ممدوح بن عجاج", "F", "Mamdouh Bin Ajaj", "Mamdouh Ben Ajaj"),
    ],
  },

  bhr: {
    coachAr: "دراغان تالاييتش",
    players: [
      P("إبراهيم لطف الله", "G", "Ebrahim Lutfalla", "Ibrahim Lutfallah"),
      P("عمر سالم", "G", "Omar Salem", "Omar Salim"),
      P("محمد الغرابلي", "G", "Mohammed Al Gharabli", "Mohamed Al Gharabli"),
      P("وليد الحيام", "D", "Waleed Al Hayam", "Walid Al Hayyam"),
      P("سيد مهدي باقر", "D", "Sayed Mahdi Baqer", "Sayed Baqer", "Sayed Baqir"),
      P("أمين بنعدي", "D", "Amine Benaddi", "Amin Benaddi"),
      P("حمد شمسان", "D", "Hamad Al Shamsan", "Hamad Al-Shamsan"),
      P("عبد الله الخلاصي", "D", "Abdulla Al Khalasi", "Abdullah Al-Khalasi"),
      P("فينسنت إيمانويل", "D", "Vincent Emmanuel", "Vincent Emmanuel Joseph"),
      P("أحمد ربيعة", "D", "Ahmed Rabia", "Ahmad Rabia"),
      P("سيد ضياء سعيد", "M", "Sayed Dhiya Saeed", "Sayed Dhiya"),
      P("كميل الأسود", "M", "Komail Al Aswad", "Kamil Al Aswad"),
      P("علي مدن", "M", "Ali Madan", "Ali Madan Al Aswad"),
      P("محمد مرهون", "M", "Mohamed Marhoon", "Mohammed Marhoon"),
      P("مهدي حميدان", "M", "Mahdi Humaidan", "Mahdi Al Humaidan", "Mahdi Al-Humaidan"),
      P("جاسم الشيخ", "M", "Jasim Al Shaikh", "Jassem Al Shaikh"),
      P("إبراهيم الختال", "M", "Ebrahim Al Khatal", "Ibrahim Al Khatal"),
      P("عباس العصفور", "M", "Abbas Al Asfoor", "Abbas Al-Asfoor"),
      P("عمر صابر", "M", "Omar Saber", "Omar Sabir"),
      P("حسن الكراني", "M", "Hassan Al Karani", "Hasan Al Karani"),
      P("محمد عبدالقيوم", "M", "Mohamed Abdul Qayyum", "Mohammed Abdulqayoom"),
      P("علي الدوسري", "M", "Ali Al Dossari", "Ali Al-Dosari"),
      P("محمد الرميحي", "F", "Mohamed Al Romaihi", "Mohammed Al Rumaihi"),
      P("مهدي عبد الجبار", "F", "Mahdi Abduljabbar", "Mahdi Abdul Jabbar"),
      P("هاشم سيد عيسى", "F", "Hashim Sayed Isa", "Hashem Sayed Isa"),
      P("حسين عبد الكريم", "F", "Hussain Abdulkarim", "Hussein Abdul Kareem"),
    ],
  },

  kuw: {
    coachAr: "هيليو سوزا",
    players: [
      P("راكان السعيد", "G", "Rakan Al Saeed", "Rakan Al-Saeed"),
      P("عبد الرحمن الفضلي", "G", "Abdulrahman Al Fadli", "Abdulrahman Al-Fadhli"),
      P("سعود الحوشان", "G", "Saud Al Houshan", "Saud Al-Houshan"),
      P("خالد الرشيدي", "G", "Khaled Al Rashidi", "Khalid Al Rashidi"),
      P("فهد الهاجري", "D", "Fahad Al Hajeri", "Fahad Al-Hajeri"),
      P("خالد صباح", "D", "Khaled Sabah", "Khalid Sabah"),
      P("يوسف الحقان", "D", "Yousef Al Haqan", "Yusuf Al Haqan"),
      P("عبد العزيز مهران", "D", "Abdulaziz Mehran", "Abdul Aziz Mehran"),
      P("عبد الوهاب العوضي", "D", "Abdulwahab Al Awadhi", "Abdul Wahab Al Awadhi"),
      P("راشد الدوسري", "D", "Rashed Al Dosari", "Rashid Al Dossari"),
      P("معاذ الظفيري", "D", "Moath Al Dhafiri", "Muath Al Dhafiri"),
      P("محسن فلاح", "D", "Mohsen Falah", "Mohsin Falah"),
      P("رضا هاني", "M", "Reda Hani", "Rida Hani"),
      P("خالد المرشد", "M", "Khaled Al Mershed", "Khalid Al Murshid"),
      P("جاسم المطر", "M", "Jassem Al Matar", "Jasim Al Matar"),
      P("أحمد الظفيري", "M", "Ahmed Al Dhafiri", "Ahmad Al Dhafiri"),
      P("عذبي شهاب", "M", "Athbi Shehab", "Athbi Shihab"),
      P("عبد الله الفزعاي", "M", "Abdullah Al Fazaa", "Abdullah Al Fazai"),
      P("ناصر فالح", "M", "Nasser Faleh", "Naser Faleh"),
      P("مهدي دشتي", "M", "Mahdi Dashti", "Mehdi Dashti"),
      P("عيد الرشيدي", "F", "Eid Al Rashidi", "Eid Al-Rashidi"),
      P("يوسف ماجد", "F", "Yousef Majed", "Yusuf Majid"),
      P("محمد دحام", "F", "Mohammad Daham", "Mohammed Daham"),
      P("مبارك الفنيني", "F", "Mubarak Al Faneeni", "Mubarak Al-Faneeni"),
      P("عبد الله العوضي", "F", "Abdullah Al Awadhi", "Abdullah Al-Awadhi"),
      P("شبيب الخالدي", "F", "Shabaib Al Khaldi", "Shabib Al Khaldi"),
      P("يوسف ناصر", "F", "Yousef Nasser", "Yusuf Nasser"),
    ],
  },

  oma: {
    coachAr: "طارق السكتيوي",
    players: [
      P("إبراهيم المخيني", "G", "Ibrahim Al Mukhaini", "Ibrahim Al-Mukhaini"),
      P("أحمد الرواحي", "G", "Ahmed Al Rawahi", "Ahmad Al Rawahi"),
      P("إبراهيم الراجحي", "G", "Ibrahim Al Rajhi", "Ibrahim Al-Rajhi"),
      P("عبد الله المعمري", "G", "Abdullah Al Mamari", "Abdullah Al-Mamari"),
      P("حارب السعدي", "M", "Harib Al Saadi", "Harib Al-Saadi"),
      P("خالد البريكي", "D", "Khalid Al Braiki", "Khaled Al Braiki"),
      P("عبد المجيد البلوشي", "D", "Abdulmajid Al Balushi", "Abdul Majeed Al Balushi"),
      P("جميل اليحمدي", "D", "Jameel Al Yahmadi", "Jamil Al Yahmadi"),
      P("أحمد الكعبي", "D", "Ahmed Al Kaabi", "Ahmad Al Kaabi"),
      P("أمجد الحارثي", "D", "Amjad Al Harthi", "Amjad Al-Harthi"),
      P("زاهر الأغبري", "M", "Zahir Al Aghbari", "Zaher Al Aghbari"),
      P("مصعب الشقصي", "D", "Musab Al Shaqsi", "Musaab Al Shaqsy", "M. Al Shaqsi"),
      P("غانم الحبشي", "D", "Ghanim Al Habashi", "Ghanim Al-Habashi"),
      P("عصام الصبحي", "F", "Issam Al Sabhi", "Essam Al Subhi"),
      P("ناصر الرواحي", "M", "Nasser Al Rawahi", "Naser Al Rawahi"),
      P("عاهد المشايخي", "M", "Ahed Al Mashaiki", "Ahed Al-Mashaikhi"),
      P("سلطان المرزوق", "F", "Sultan Al Marzuq", "Sultan Al Marzouq"),
      P("خالد الغطريفي", "D", "Khalid Al Ghatrifi", "Khaled Al Ghatrifi"),
      P("عبد الحافظ المخيني", "F", "Abdulhafiz Al Mukhaini", "Abdul Hafez Al Mukhaini"),
      P("تركي بيت ربيع", "F", "Turki Bait Rabia", "Turki Bait Rabea"),
      P("حسين الشحري", "M", "Hussein Al Shahri", "Hussain Al Shihri", "Hussein Al-Shahri"),
      P("الحارث المخيني", "F", "Al Harith Al Mukhaini", "Al-Harith Al Mukhaini"),
      P("وليد المسلمي", "M", "Waleed Al Musallami", "Walid Al Musallami"),
      P("مصعب المعمري", "M", "Musab Al Mamari", "Musaab Al Maamari"),
      P("عبد السلام الشكيلي", "F", "Abdulsalam Al Shukaili", "Abdul Salam Al Shukaili", "Abdulsalam Al Shakili"),
      P("عبد الله فواز", "M", "Abdullah Fawaz", "Abdallah Fawaz"),
    ],
  },
};


export type GulfCup27ExpectedStarter = {
  nameAr: string;
  grid: string;
  position: GulfCup27VerifiedRole;
  number?: number;
};

export type GulfCup27ExpectedLineupOverride = {
  formation: string;
  starters: GulfCup27ExpectedStarter[];
};

/**
 * توقعات بشرية موثقة لمباريات محددة عندما يتوفر مصدر توقع واضح قبل المباراة.
 * لا تُستخدم بعد صدور التشكيل الرسمي؛ الرسمي من API-FOOTBALL يتقدم عليها دائمًا.
 * الأسماء هنا عربية فقط، بينما الصور/الأرقام/المعرفات تُربط من Squad المزود.
 */
const GULF_CUP_27_EXPECTED_LINEUP_OVERRIDES: Record<
  string,
  Partial<Record<string, GulfCup27ExpectedLineupOverride>>
> = {
  // الإمارات × اليمن — الجولة الأولى.
  // الإمارات: مواءم مع القائمة المنشورة يوم المباراة.
  // اليمن: مواءم مع التشكيل الظاهر في المرجع المرئي المرسل من المستخدم.
  "g27-b-r1-uae-yem": {
    uae: {
      formation: "4-2-3-1",
      starters: [
        { nameAr: "خالد عيسى", position: "G", grid: "1:1" },
        { nameAr: "روبن فيليب", position: "D", grid: "2:1" },
        { nameAr: "علاء الدين زهير", position: "D", grid: "2:2" },
        { nameAr: "لوكاس بيمنتا", position: "D", grid: "2:3" },
        { nameAr: "ماركوس ميلوني", position: "D", grid: "2:4" },
        { nameAr: "مامادو كوليبالي", position: "M", grid: "3:1" },
        { nameAr: "عصام فايز", position: "M", grid: "3:2" },
        { nameAr: "يوري سيزار", position: "M", grid: "4:1" },
        { nameAr: "نيكولاس خيمينيز", position: "M", grid: "4:2" },
        { nameAr: "لوان بيريرا", position: "M", grid: "4:3" },
        { nameAr: "برونو دي أوليفيرا", position: "F", grid: "5:1" },
      ],
    },
    yem: {
      formation: "4-4-2",
      starters: [
        { nameAr: "محمد أمان", position: "G", grid: "1:1", number: 1 },
        { nameAr: "رامي الوسماني", position: "D", grid: "2:1", number: 6 },
        { nameAr: "هارون الزبيدي", position: "D", grid: "2:2", number: 3 },
        { nameAr: "نادر سهل", position: "D", grid: "2:3", number: 2 },
        { nameAr: "رضوان الحبيشي", position: "D", grid: "2:4", number: 19 },
        { nameAr: "أسامة عنبر", position: "M", grid: "3:1", number: 15 },
        { nameAr: "عمر الداحي", position: "M", grid: "3:2", number: 9 },
        { nameAr: "عبدالواسع المطري", position: "M", grid: "3:3", number: 11 },
        { nameAr: "عبد المجيد صبارة", position: "M", grid: "3:4", number: 17 },
        { nameAr: "عمر منصور", position: "F", grid: "4:1", number: 16 },
        { nameAr: "ناصر محمدوه", position: "F", grid: "4:2", number: 7 },
      ],
    },
  },
  // السعودية × عُمان — الجولة الثانية. مواءم مع التشكيل المتوقع الظاهر في المرجع الحالي.
  "g27-a-r2-ksa-oma": {
    ksa: {
      formation: "4-4-2",
      starters: [
        { nameAr: "محمد العويس", position: "G", grid: "1:1", number: 21 },
        { nameAr: "متعب الحربي", position: "D", grid: "2:1", number: 24 },
        { nameAr: "حسن كادش", position: "D", grid: "2:2", number: 14 },
        { nameAr: "عبد الإله العمري", position: "D", grid: "2:3", number: 4 },
        { nameAr: "نواف بوشل", position: "D", grid: "2:4", number: 13 },
        { nameAr: "همام الهمامي", position: "M", grid: "3:1", number: 25 },
        { nameAr: "ناصر الدوسري", position: "M", grid: "3:2", number: 6 },
        { nameAr: "محمد كنو", position: "M", grid: "3:3", number: 23 },
        { nameAr: "محمد أبو الشامات", position: "M", grid: "3:4", number: 2 },
        { nameAr: "صالح أبو الشامات", position: "F", grid: "4:1", number: 7 },
        { nameAr: "فراس البريكان", position: "F", grid: "4:2", number: 9 },
      ],
    },
    oma: {
      formation: "4-4-2",
      starters: [
        { nameAr: "إبراهيم المخيني", position: "G", grid: "1:1", number: 1 },
        { nameAr: "أحمد الكعبي", position: "D", grid: "2:1", number: 14 },
        { nameAr: "خالد الغطريفي", position: "D", grid: "2:2", number: 3 },
        { nameAr: "أمجد الحارثي", position: "D", grid: "2:3", number: 13 },
        { nameAr: "مصعب الشقصي", position: "D", grid: "2:4", number: 5 },
        { nameAr: "ناصر الرواحي", position: "M", grid: "3:1", number: 17 },
        { nameAr: "عبد الله فواز", position: "M", grid: "3:2", number: 12 },
        { nameAr: "حارب السعدي", position: "M", grid: "3:3", number: 23 },
        { nameAr: "جميل اليحمدي", position: "M", grid: "3:4", number: 10 },
        { nameAr: "حسين الشحري", position: "F", grid: "4:1", number: 15 },
        { nameAr: "عصام الصبحي", position: "F", grid: "4:2", number: 7 },
      ],
    },
  },
};

export function getVerifiedGulfCup27ExpectedLineupOverride(
  matchId: string,
  teamId: string,
): GulfCup27ExpectedLineupOverride | null {
  const value = GULF_CUP_27_EXPECTED_LINEUP_OVERRIDES[matchId]?.[teamId];
  return value
    ? {
        formation: value.formation,
        starters: value.starters.map((starter) => ({ ...starter })),
      }
    : null;
}

const GULF_CUP_27_VERIFIED_OFFICIAL_FALLBACKS = new Set([
  "g27-b-r1-uae-yem:uae",
  "g27-b-r1-uae-yem:yem",
]);

export function isVerifiedGulfCup27OfficialLineupFallback(
  matchId: string,
  teamId: string,
) {
  return GULF_CUP_27_VERIFIED_OFFICIAL_FALLBACKS.has(`${matchId}:${teamId}`);
}

const ARABIC_TO_LATIN: Record<string, string> = {
  ا: "a", أ: "a", إ: "a", آ: "a", ٱ: "a", ء: "a", ئ: "a", ؤ: "a",
  ب: "b", ت: "t", ث: "th", ج: "j", ح: "h", خ: "kh", د: "d", ذ: "dh",
  ر: "r", ز: "z", س: "s", ش: "sh", ص: "s", ض: "d", ط: "t", ظ: "z",
  ع: "a", غ: "gh", ف: "f", ق: "q", ك: "k", ل: "l", م: "m", ن: "n",
  ه: "h", ة: "h", و: "w", ي: "y", ى: "a",
};

function normalizeLatin(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function transliterateArabic(value: string) {
  return [...value]
    .map((char) => ARABIC_TO_LATIN[char] ?? (/[a-z0-9 ]/i.test(char) ? char : " "))
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function skeleton(value: string) {
  return normalizeLatin(value).replace(/[aeiouyw]/g, "").replace(/\s+/g, "");
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const old = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = old;
    }
  }
  return previous[b.length];
}

function similarity(a: string, b: string) {
  const left = skeleton(a);
  const right = skeleton(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  const distance = levenshtein(left, right);
  return Math.max(0, 1 - distance / Math.max(left.length, right.length));
}

function roleFromApi(value: string | null | undefined): GulfCup27VerifiedRole | null {
  const normalized = String(value || "").toUpperCase();
  if (normalized === "G" || normalized.includes("GOAL")) return "G";
  if (normalized === "D" || normalized.includes("DEF")) return "D";
  if (normalized === "M" || normalized.includes("MID")) return "M";
  if (normalized === "F" || normalized.includes("ATT") || normalized.includes("FOR")) return "F";
  return null;
}

function candidateScore(
  apiName: string,
  apiPosition: string | null | undefined,
  player: GulfCup27VerifiedPlayer,
) {
  const apiNormalized = normalizeLatin(apiName);
  const aliases = [player.nameAr, ...(player.aliases || [])];
  let best = 0;

  for (const alias of aliases) {
    const latinAlias = /[\u0600-\u06FF]/.test(alias) ? transliterateArabic(alias) : alias;
    const normalizedAlias = normalizeLatin(latinAlias);
    if (!normalizedAlias) continue;
    if (apiNormalized === normalizedAlias) return 1;

    const apiTokens = apiNormalized.split(" ").filter(Boolean);
    const aliasTokens = normalizedAlias.split(" ").filter(Boolean);
    const apiFirst = apiTokens[0] || "";
    const aliasFirst = aliasTokens[0] || "";
    const apiLast = apiTokens[apiTokens.length - 1] || "";
    const aliasLast = aliasTokens[aliasTokens.length - 1] || "";
    if (
      apiLast &&
      aliasLast &&
      skeleton(apiLast) === skeleton(aliasLast) &&
      apiFirst &&
      aliasFirst &&
      apiFirst[0] === aliasFirst[0]
    ) {
      best = Math.max(best, apiFirst.length <= 2 ? 0.97 : 0.99);
    }

    if (apiNormalized.length >= 5 && (apiNormalized.includes(normalizedAlias) || normalizedAlias.includes(apiNormalized))) {
      best = Math.max(best, 0.96);
    }
    best = Math.max(best, similarity(apiNormalized, normalizedAlias));
  }

  const apiRole = roleFromApi(apiPosition);
  if (apiRole && apiRole === player.role) best += 0.025;
  return Math.min(1, best);
}

export function resolveVerifiedGulfCup27Player(input: {
  teamId: string;
  apiName: string;
  apiPosition?: string | null;
}) {
  const roster = GULF_CUP_27_VERIFIED_ROSTERS[input.teamId];
  const apiName = String(input.apiName || "").trim();
  if (!roster || !apiName) return null;

  const ranked = roster.players
    .map((player) => ({ player, score: candidateScore(apiName, input.apiPosition, player) }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  const second = ranked[1];
  if (!best || best.score < 0.72) return null;
  if (second && best.score < 0.93 && best.score - second.score < 0.08) return null;
  return best.player;
}

export function getVerifiedGulfCup27Coach(teamId: string) {
  return GULF_CUP_27_VERIFIED_ROSTERS[teamId]?.coachAr || "";
}

export function isVerifiedGulfCup27Player(teamId: string, apiName: string) {
  return Boolean(resolveVerifiedGulfCup27Player({ teamId, apiName }));
}


export type GulfCup27ManualAbsence = {
  nameAr: string;
  reason: string;
};

const GULF_CUP_27_MANUAL_ABSENCES: Record<string, Record<string, GulfCup27ManualAbsence[]>> = {
  "g27-a-r2-ksa-oma": {
    ksa: [{ nameAr: "نواف العقيدي", reason: "إصابة في المرفق" }],
  },
  "g27-a-r3-ksa-irq": {
    ksa: [{ nameAr: "نواف العقيدي", reason: "إصابة في المرفق" }],
  },
};

export function getVerifiedGulfCup27ManualAbsences(matchId: string, teamId: string) {
  return GULF_CUP_27_MANUAL_ABSENCES[matchId]?.[teamId] || [];
}
