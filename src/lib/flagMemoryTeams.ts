export type FlagMemoryTeam = {
  id: string;
  nameAr: string;
  flag: string;
};

export const FLAG_MEMORY_TEAMS: FlagMemoryTeam[] = [
  {
    id: "saudi-arabia",
    nameAr: "السعودية",
    flag: "/flags/sa.svg",
  },
  {
    id: "brazil",
    nameAr: "البرازيل",
    flag: "/flags/br.svg",
  },
  {
    id: "argentina",
    nameAr: "الأرجنتين",
    flag: "/flags/ar.svg",
  },
  {
    id: "france",
    nameAr: "فرنسا",
    flag: "/flags/fr.svg",
  },
  {
    id: "germany",
    nameAr: "ألمانيا",
    flag: "/flags/de.svg",
  },
  {
    id: "spain",
    nameAr: "إسبانيا",
    flag: "/flags/es.svg",
  },
  {
    id: "portugal",
    nameAr: "البرتغال",
    flag: "/flags/pt.svg",
  },
  {
    id: "england",
    nameAr: "إنجلترا",
    flag: "/flags/gb-eng.svg",
  },
  {
    id: "netherlands",
    nameAr: "هولندا",
    flag: "/flags/nl.svg",
  },
  {
    id: "belgium",
    nameAr: "بلجيكا",
    flag: "/flags/be.svg",
  },
  {
    id: "italy",
    nameAr: "إيطاليا",
    flag: "/flags/it.svg",
  },
  {
    id: "croatia",
    nameAr: "كرواتيا",
    flag: "/flags/hr.svg",
  },
  {
    id: "morocco",
    nameAr: "المغرب",
    flag: "/flags/ma.svg",
  },
  {
    id: "egypt",
    nameAr: "مصر",
    flag: "/flags/eg.svg",
  },
  {
    id: "tunisia",
    nameAr: "تونس",
    flag: "/flags/tn.svg",
  },
  {
    id: "algeria",
    nameAr: "الجزائر",
    flag: "/flags/dz.svg",
  },
  {
    id: "japan",
    nameAr: "اليابان",
    flag: "/flags/jp.svg",
  },
  {
    id: "south-korea",
    nameAr: "كوريا الجنوبية",
    flag: "/flags/kr.svg",
  },
  {
    id: "australia",
    nameAr: "أستراليا",
    flag: "/flags/au.svg",
  },
  {
    id: "qatar",
    nameAr: "قطر",
    flag: "/flags/qa.svg",
  },
  {
    id: "iran",
    nameAr: "إيران",
    flag: "/flags/ir.svg",
  },
  {
    id: "usa",
    nameAr: "أمريكا",
    flag: "/flags/us.svg",
  },
  {
    id: "mexico",
    nameAr: "المكسيك",
    flag: "/flags/mx.svg",
  },
  {
    id: "canada",
    nameAr: "كندا",
    flag: "/flags/ca.svg",
  },
  {
    id: "uruguay",
    nameAr: "الأوروغواي",
    flag: "/flags/uy.svg",
  },
  {
    id: "colombia",
    nameAr: "كولومبيا",
    flag: "/flags/co.svg",
  },
  {
    id: "chile",
    nameAr: "تشيلي",
    flag: "/flags/cl.svg",
  },
  {
    id: "ecuador",
    nameAr: "الإكوادور",
    flag: "/flags/ec.svg",
  },
  {
    id: "peru",
    nameAr: "بيرو",
    flag: "/flags/pe.svg",
  },
  {
    id: "switzerland",
    nameAr: "سويسرا",
    flag: "/flags/ch.svg",
  },
  {
    id: "denmark",
    nameAr: "الدنمارك",
    flag: "/flags/dk.svg",
  },
  {
    id: "sweden",
    nameAr: "السويد",
    flag: "/flags/se.svg",
  },
  {
    id: "norway",
    nameAr: "النرويج",
    flag: "/flags/no.svg",
  },
  {
    id: "poland",
    nameAr: "بولندا",
    flag: "/flags/pl.svg",
  },
  {
    id: "serbia",
    nameAr: "صربيا",
    flag: "/flags/rs.svg",
  },
  {
    id: "turkey",
    nameAr: "تركيا",
    flag: "/flags/tr.svg",
  },
  {
    id: "ghana",
    nameAr: "غانا",
    flag: "/flags/gh.svg",
  },
  {
    id: "senegal",
    nameAr: "السنغال",
    flag: "/flags/sn.svg",
  },
  {
    id: "cameroon",
    nameAr: "الكاميرون",
    flag: "/flags/cm.svg",
  },
  {
    id: "nigeria",
    nameAr: "نيجيريا",
    flag: "/flags/ng.svg",
  },
  {
    id: "south-africa",
    nameAr: "جنوب أفريقيا",
    flag: "/flags/za.svg",
  },
  {
    id: "ivory-coast",
    nameAr: "كوت ديفوار",
    flag: "/flags/ci.svg",
  },
  {
    id: "new-zealand",
    nameAr: "نيوزيلندا",
    flag: "/flags/nz.svg",
  },
  {
    id: "china",
    nameAr: "الصين",
    flag: "/flags/cn.svg",
  },
  {
    id: "iraq",
    nameAr: "العراق",
    flag: "/flags/iq.svg",
  },
  {
    id: "uae",
    nameAr: "الإمارات",
    flag: "/flags/ae.svg",
  },
  {
    id: "jordan",
    nameAr: "الأردن",
    flag: "/flags/jo.svg",
  },
  {
    id: "uzbekistan",
    nameAr: "أوزبكستان",
    flag: "/flags/uz.svg",
  },
];

export function getFlagMemoryTeams() {
  return FLAG_MEMORY_TEAMS;
}

export function getFlagMemoryTeamById(teamId: string) {
  return FLAG_MEMORY_TEAMS.find((team) => team.id === teamId) || null;
}