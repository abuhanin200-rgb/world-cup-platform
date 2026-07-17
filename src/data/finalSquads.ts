export type FinalSquadPlayerPosition =
  | "goalkeeper"
  | "defender"
  | "midfielder"
  | "forward";

export type FinalSquadPlayer = {
  id: string;
  nameAr: string;
  nameEn: string;
  position: FinalSquadPlayerPosition;
};

export const SPAIN_FINAL_SQUAD: FinalSquadPlayer[] = [
  { id: "unai-simon", nameAr: "أوناي سيمون", nameEn: "Unai Simón", position: "goalkeeper" },
  { id: "david-raya", nameAr: "دافيد رايا", nameEn: "David Raya", position: "goalkeeper" },
  { id: "joan-garcia", nameAr: "خوان غارسيا", nameEn: "Joan Garcia", position: "goalkeeper" },

  { id: "pedro-porro", nameAr: "بيدرو بورو", nameEn: "Pedro Porro", position: "defender" },
  { id: "marcos-llorente", nameAr: "ماركوس يورينتي", nameEn: "Marcos Llorente", position: "defender" },
  { id: "aymeric-laporte", nameAr: "إيميريك لابورت", nameEn: "Aymeric Laporte", position: "defender" },
  { id: "pau-cubarsi", nameAr: "باو كوبارسي", nameEn: "Pau Cubarsí", position: "defender" },
  { id: "marc-pubill", nameAr: "مارك بوبيل", nameEn: "Marc Pubill", position: "defender" },
  { id: "eric-garcia", nameAr: "إريك غارسيا", nameEn: "Eric Garcia", position: "defender" },
  { id: "marc-cucurella", nameAr: "مارك كوكوريّا", nameEn: "Marc Cucurella", position: "defender" },
  { id: "alejandro-grimaldo", nameAr: "أليخاندرو غريمالدو", nameEn: "Alejandro Grimaldo", position: "defender" },

  { id: "rodrigo-hernandez", nameAr: "رودري", nameEn: "Rodrigo Hernández", position: "midfielder" },
  { id: "martin-zubimendi", nameAr: "مارتن زوبيميندي", nameEn: "Martín Zubimendi", position: "midfielder" },
  { id: "pedri-gonzalez", nameAr: "بيدري", nameEn: "Pedri González", position: "midfielder" },
  { id: "fabian-ruiz", nameAr: "فابيان رويز", nameEn: "Fabián Ruiz", position: "midfielder" },
  { id: "mikel-merino", nameAr: "ميكيل ميرينو", nameEn: "Mikel Merino", position: "midfielder" },
  { id: "gavi", nameAr: "غافي", nameEn: "Pablo Páez 'Gavi'", position: "midfielder" },
  { id: "alex-baena", nameAr: "أليكس باينا", nameEn: "Álex Baena", position: "midfielder" },

  { id: "mikel-oyarzabal", nameAr: "ميكيل أويارزابال", nameEn: "Mikel Oyarzabal", position: "forward" },
  { id: "lamine-yamal", nameAr: "لامين يامال", nameEn: "Lamine Yamal", position: "forward" },
  { id: "ferran-torres", nameAr: "فيران توريس", nameEn: "Ferran Torres", position: "forward" },
  { id: "borja-iglesias", nameAr: "بورخا إغليسياس", nameEn: "Borja Iglesias", position: "forward" },
  { id: "dani-olmo", nameAr: "داني أولمو", nameEn: "Dani Olmo", position: "forward" },
  { id: "victor-munoz", nameAr: "فيكتور مونيوز", nameEn: "Víctor Muñoz", position: "forward" },
  { id: "nico-williams", nameAr: "نيكو ويليامز", nameEn: "Nico Williams", position: "forward" },
  { id: "yeremy-pino", nameAr: "ييريمي بينو", nameEn: "Yeremy Pino", position: "forward" },
];

export const ARGENTINA_FINAL_SQUAD: FinalSquadPlayer[] = [
  { id: "emiliano-martinez", nameAr: "إيميليانو مارتينيز", nameEn: "Emiliano Martínez", position: "goalkeeper" },
  { id: "geronimo-rulli", nameAr: "خيرونيمو رولي", nameEn: "Gerónimo Rulli", position: "goalkeeper" },
  { id: "juan-musso", nameAr: "خوان موسو", nameEn: "Juan Musso", position: "goalkeeper" },

  { id: "gonzalo-montiel", nameAr: "غونزالو مونتييل", nameEn: "Gonzalo Montiel", position: "defender" },
  { id: "nahuel-molina", nameAr: "ناهويل مولينا", nameEn: "Nahuel Molina", position: "defender" },
  { id: "lisandro-martinez", nameAr: "ليساندرو مارتينيز", nameEn: "Lisandro Martínez", position: "defender" },
  { id: "nicolas-otamendi", nameAr: "نيكولاس أوتامندي", nameEn: "Nicolás Otamendi", position: "defender" },
  { id: "leonardo-balerdi", nameAr: "ليوناردو باليردي", nameEn: "Leonardo Balerdi", position: "defender" },
  { id: "cristian-romero", nameAr: "كريستيان روميرو", nameEn: "Cristian Romero", position: "defender" },
  { id: "nicolas-tagliafico", nameAr: "نيكولاس تاغليافيكو", nameEn: "Nicolás Tagliafico", position: "defender" },
  { id: "facundo-medina", nameAr: "فاكوندو ميدينا", nameEn: "Facundo Medina", position: "defender" },

  { id: "giovani-lo-celso", nameAr: "جيوفاني لو سيلسو", nameEn: "Giovani Lo Celso", position: "midfielder" },
  { id: "leandro-paredes", nameAr: "لياندرو باريديس", nameEn: "Leandro Paredes", position: "midfielder" },
  { id: "rodrigo-de-paul", nameAr: "رودريغو دي بول", nameEn: "Rodrigo De Paul", position: "midfielder" },
  { id: "exequiel-palacios", nameAr: "إكسيكييل بالاسيوس", nameEn: "Exequiel Palacios", position: "midfielder" },
  { id: "enzo-fernandez", nameAr: "إنزو فرنانديز", nameEn: "Enzo Fernández", position: "midfielder" },
  { id: "alexis-mac-allister", nameAr: "أليكسيس ماك أليستر", nameEn: "Alexis Mac Allister", position: "midfielder" },
  { id: "valentin-barco", nameAr: "فالنتين باركو", nameEn: "Valentín Barco", position: "midfielder" },

  { id: "lionel-messi", nameAr: "ليونيل ميسي", nameEn: "Lionel Messi", position: "forward" },
  { id: "nicolas-gonzalez", nameAr: "نيكولاس غونزاليس", nameEn: "Nicolás González", position: "forward" },
  { id: "giuliano-simeone", nameAr: "جوليانو سيميوني", nameEn: "Giuliano Simeone", position: "forward" },
  { id: "lautaro-martinez", nameAr: "لاوتارو مارتينيز", nameEn: "Lautaro Martínez", position: "forward" },
  { id: "jose-manuel-lopez", nameAr: "خوسيه مانويل لوبيز", nameEn: "José Manuel López", position: "forward" },
  { id: "julian-alvarez", nameAr: "جوليان ألفاريز", nameEn: "Julián Álvarez", position: "forward" },
  { id: "thiago-almada", nameAr: "تياغو ألمادا", nameEn: "Thiago Almada", position: "forward" },
  { id: "nico-paz", nameAr: "نيكو باز", nameEn: "Nico Paz", position: "forward" },
];

export const FINAL_SQUADS_BY_TEAM_CODE: Record<
  string,
  FinalSquadPlayer[]
> = {
  ESP: SPAIN_FINAL_SQUAD,
  ARG: ARGENTINA_FINAL_SQUAD,
};

export function getFinalSquadByTeamCode(teamCode?: string | null) {
  const normalizedCode = String(teamCode || "").trim().toUpperCase();

  return FINAL_SQUADS_BY_TEAM_CODE[normalizedCode] || [];
}

export function getFinalSquadPlayerName(
  teamCode: string | null | undefined,
  playerId: string | null | undefined
) {
  if (!playerId) return "";

  const player = getFinalSquadByTeamCode(teamCode).find(
    (item) => item.id === playerId
  );

  return player?.nameAr || playerId;
}