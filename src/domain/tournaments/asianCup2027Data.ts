import { ASIAN_CUP_2027_TOURNAMENT_ID } from "./asianCup2027";
import type { TournamentMatchV2, TournamentTeamV2 } from "./v2Types";

const T = ASIAN_CUP_2027_TOURNAMENT_ID;
export const ASIAN_CUP_2027_PREDICTION_OPEN_LEAD_MS = 3 * 24 * 60 * 60 * 1000;

export const ASIAN_CUP_2027_TEAMS: readonly TournamentTeamV2[] = [
  ["ksa","KSA","sa","السعودية","Saudi Arabia","A"],["kuw","KUW","kw","الكويت","Kuwait","A"],["oma","OMA","om","عُمان","Oman","A"],["ple","PLE","ps","فلسطين","Palestine","A"],
  ["uzb","UZB","uz","أوزبكستان","Uzbekistan","B"],["bhr","BHR","bh","البحرين","Bahrain","B"],["prk","PRK","kp","كوريا الشمالية","DPR Korea","B"],["jor","JOR","jo","الأردن","Jordan","B"],
  ["irn","IRN","ir","إيران","Iran","C"],["syr","SYR","sy","سوريا","Syria","C"],["kgz","KGZ","kg","قيرغيزستان","Kyrgyz Republic","C"],["chn","CHN","cn","الصين","China PR","C"],
  ["aus","AUS","au","أستراليا","Australia","D"],["tjk","TJK","tj","طاجيكستان","Tajikistan","D"],["irq","IRQ","iq","العراق","Iraq","D"],["sgp","SGP","sg","سنغافورة","Singapore","D"],
  ["kor","KOR","kr","كوريا الجنوبية","Korea Republic","E"],["uae","UAE","ae","الإمارات","United Arab Emirates","E"],["vie","VIE","vn","فيتنام","Vietnam","E"],["yem","YEM","ye","اليمن","Yemen","E"],
  ["jpn","JPN","jp","اليابان","Japan","F"],["qat","QAT","qa","قطر","Qatar","F"],["tha","THA","th","تايلاند","Thailand","F"],["idn","IDN","id","إندونيسيا","Indonesia","F"],
].map((x,i)=>({id:x[0],tournamentId:T,code:x[1],flagCode:x[2],nameAr:x[3],nameEn:x[4],shortName:x[3],group:x[5],sortOrder:i+1,isActive:true})) as TournamentTeamV2[];

const stadiums: Record<string,{name:string;city:string}> = {
  kf:{name:"استاد مدينة الملك فهد الرياضية",city:"الرياض"}, ksu:{name:"استاد جامعة الملك سعود",city:"الرياض"},
  ka:{name:"المملكة أرينا",city:"الرياض"}, imu:{name:"استاد جامعة الإمام محمد بن سعود",city:"الرياض"}, sh:{name:"استاد الشباب",city:"الرياض"},
  kaa:{name:"استاد مدينة الملك عبدالله الرياضية",city:"جدة"}, paf:{name:"استاد مدينة الأمير عبدالله الفيصل الرياضية",city:"جدة"}, ar:{name:"استاد أرامكو",city:"الخبر"},
};
function at(date:string){ return new Date(`${date}T12:00:00+03:00`).getTime(); }
function group(id:number,date:string,venue:string,g:string,h:string,a:string):TournamentMatchV2 & {kickoffTimeTbd:true;officialMatchNumber:number}{const s=stadiums[venue];return {id:`ac27-${id}`,tournamentId:T,stage:"group",round:`الجولة ${id<=12?1:id<=24?2:3}`,group:g,homeTeamId:h,awayTeamId:a,kickoffAt:at(date),stadium:s.name,city:s.city,status:"scheduled",predictionOpensAt:null,predictionClosesAt:null,result:{homeScore:null,awayScore:null},kickoffTimeTbd:true,officialMatchNumber:id};}
function ko(id:number,date:string,venue:string,round:string,h:string,a:string):TournamentMatchV2 & {kickoffTimeTbd:true;officialMatchNumber:number}{const s=stadiums[venue];return {id:`ac27-${id}`,tournamentId:T,stage:"knockout",round,group:null,homeTeamId:"",awayTeamId:"",homeSourceLabel:h,awaySourceLabel:a,kickoffAt:at(date),stadium:s.name,city:s.city,status:"scheduled",predictionOpensAt:null,predictionClosesAt:null,result:{homeScore:null,awayScore:null,extraTimeHomeScore:null,extraTimeAwayScore:null,penaltiesHomeScore:null,penaltiesAwayScore:null,qualifiedTeamId:null,qualificationMethod:null},kickoffTimeTbd:true,officialMatchNumber:id};}
export const ASIAN_CUP_2027_GROUP_MATCHES = [
 group(1,"2027-01-07","kf","A","ksa","ple"),group(2,"2027-01-08","ksu","A","kuw","oma"),group(3,"2027-01-08","imu","B","bhr","prk"),group(4,"2027-01-08","kaa","B","uzb","jor"),
 group(5,"2027-01-09","kf","C","syr","kgz"),group(6,"2027-01-09","ka","C","irn","chn"),group(7,"2027-01-09","ar","D","aus","sgp"),group(8,"2027-01-10","sh","D","tjk","irq"),group(9,"2027-01-10","kaa","E","kor","yem"),
 group(10,"2027-01-11","ksu","E","uae","vie"),group(11,"2027-01-11","imu","F","qat","tha"),group(12,"2027-01-11","paf","F","jpn","idn"),
 group(13,"2027-01-12","kf","A","oma","ksa"),group(14,"2027-01-12","ka","B","prk","uzb"),group(15,"2027-01-12","ar","A","ple","kuw"),group(16,"2027-01-13","sh","C","kgz","irn"),
 group(17,"2027-01-13","kaa","B","jor","bhr"),group(18,"2027-01-14","ksu","D","irq","aus"),group(19,"2027-01-14","imu","D","sgp","tjk"),group(20,"2027-01-14","paf","C","chn","syr"),
 group(21,"2027-01-15","kf","E","yem","uae"),group(22,"2027-01-15","ka","E","vie","kor"),group(23,"2027-01-15","sh","F","tha","jpn"),group(24,"2027-01-16","ar","F","idn","qat"),
 group(25,"2027-01-17","ksu","A","oma","ple"),group(26,"2027-01-17","imu","B","prk","jor"),group(27,"2027-01-17","kaa","A","ksa","kuw"),group(28,"2027-01-17","paf","B","uzb","bhr"),
 group(29,"2027-01-18","kf","C","irn","syr"),group(30,"2027-01-18","ka","C","kgz","chn"),group(31,"2027-01-19","sh","D","aus","tjk"),group(32,"2027-01-19","ar","D","irq","sgp"),
 group(33,"2027-01-20","ksu","E","kor","uae"),group(34,"2027-01-20","imu","F","jpn","qat"),group(35,"2027-01-20","kaa","F","tha","idn"),group(36,"2027-01-20","paf","E","vie","yem"),
] as const;
export const ASIAN_CUP_2027_KNOCKOUT_MATCHES = [
 ko(37,"2027-01-22","ka","دور الـ16","وصيف المجموعة A","وصيف المجموعة C"),ko(38,"2027-01-22","sh","دور الـ16","متصدر المجموعة B","ثالث A/C/D"),
 ko(39,"2027-01-23","imu","دور الـ16","متصدر المجموعة D","ثالث B/E/F"),ko(40,"2027-01-23","ar","دور الـ16","متصدر المجموعة A","ثالث C/D/E"),
 ko(41,"2027-01-24","kf","دور الـ16","متصدر المجموعة F","وصيف المجموعة E"),ko(42,"2027-01-24","paf","دور الـ16","وصيف المجموعة B","وصيف المجموعة F"),
 ko(43,"2027-01-25","ksu","دور الـ16","متصدر المجموعة E","وصيف المجموعة D"),ko(44,"2027-01-25","kaa","دور الـ16","متصدر المجموعة C","ثالث A/B/F"),
 ko(45,"2027-01-28","ka","ربع النهائي","الفائز من المباراة 37","الفائز من المباراة 39"),ko(46,"2027-01-28","kaa","ربع النهائي","الفائز من المباراة 38","الفائز من المباراة 41"),
 ko(47,"2027-01-29","kf","ربع النهائي","الفائز من المباراة 44","الفائز من المباراة 43"),ko(48,"2027-01-29","ar","ربع النهائي","الفائز من المباراة 40","الفائز من المباراة 42"),
 ko(49,"2027-02-01","ar","نصف النهائي","الفائز من المباراة 45","الفائز من المباراة 46"),ko(50,"2027-02-02","kaa","نصف النهائي","الفائز من المباراة 47","الفائز من المباراة 48"),
 ko(51,"2027-02-05","kf","النهائي","الفائز من المباراة 49","الفائز من المباراة 50"),
] as const;
export const ASIAN_CUP_2027_MATCHES = [...ASIAN_CUP_2027_GROUP_MATCHES,...ASIAN_CUP_2027_KNOCKOUT_MATCHES] as const;
export function getAsianCup2027Team(id:string){return ASIAN_CUP_2027_TEAMS.find(t=>t.id===id)??null;}
