import type { Article } from "../types";
import type { Language } from "../i18n";
import { anatomyField } from "./anatomy-field";
import { aid } from "./aid";
import { fillBody } from "./fill-body";
import { fillHome } from "./fill-home";
import { fillWay } from "./fill-way";
import { fillWild } from "./fill-wild";
import { groupNuclear } from "./group-nuclear";
import { hygienePeople } from "./hygiene-people";
import { more } from "./more";
import { pathHome } from "./path-home";
import { shelterFood } from "./shelter-food";
import { waterFire } from "./water-fire";
import { cookingWild } from "./cooking-wild";
import { moraleGames } from "./morale-games";
import { knotsNavigation } from "./knots-navigation";
import { fishingWild } from "./fishing-wild";
import { plantsFungiDanger } from "./plants-fungi-danger";
import { emergencyRadio } from "./emergency-radio";
import { distressSignals } from "./distress-signals";
import { weatherSigns } from "./weather-signs";
import { fieldObstetrics } from "./field-obstetrics";
import { wartimeSafety } from "./wartime-safety";
import { wartimeSafetyEn } from "./wartime-safety-en";
import { wartimeSafetyAr } from "./wartime-safety-ar";
import { corpusEn } from "./corpus-en";
import { corpusAr } from "./corpus-ar";

export const BASE_ARTICLES: Article[] = [
  ...waterFire,
  ...shelterFood,
  ...hygienePeople,
  ...aid,
  ...anatomyField,
  ...pathHome,
  ...groupNuclear,
  ...more,
  ...fillHome,
  ...fillBody,
  ...fillWay,
  ...fillWild,
  ...cookingWild,
  ...fishingWild,
  ...plantsFungiDanger,
  ...emergencyRadio,
  ...distressSignals,
  ...weatherSigns,
  ...fieldObstetrics,
  ...moraleGames,
  ...knotsNavigation,
  ...wartimeSafety,
  ...corpusEn,
  ...wartimeSafetyEn,
  ...corpusAr,
  ...wartimeSafetyAr,
];

export const NUCLEAR_ORDER = [
  "yad-0",
  "yad-15",
  "yad-chas",
  "yad-sutki",
  "yad-sem-desyat",
  "yad-ne-vse-avarii",
  "yod-zapret",
  "yad-tablica-pusto",
  "yad-beremennye",
  "yad-vyhod",
  "yad-snyat-odezhdu",
  "yad-kozha",
  "yad-dve-nedeli",
  "yad-voda-eda",
  "yad-edu-shkaf",
  "yad-ne-podnimat",
  "yad-toshnota",
  "yad-evakuaciya",
  "yad-pribor",
  "yad-ne-umeet",
];

export const ALARM_ORDER_I18N = {
  ru: [
    { id: "alarm-krov", title: "Кровотечение", note: "Давить на рану" },
    { id: "alarm-dyshit", title: "Не дышит", note: "Нажатия в центр груди" },
    { id: "alarm-ozhog", title: "Ожог", note: "Чистая вода, не масло" },
    { id: "alarm-pyl", title: "Ядерная пыль", note: "Внутрь. Йод из пузырька не пить" },
    { id: "alarm-voda", title: "Вода", note: "Закрытое питьё, не химия" },
    { id: "alarm-holod", title: "Холод", note: "Сухое, ветер, не снег" },
    { id: "mine-booby-traps-danger", title: "Мины и растяжки", note: "Нулевое касание. Ничего не поднимать" },
    { id: "drones-fpv-defense", title: "Атака дрона", note: "Не бежать по прямой, рывок под 90° в укрытие" },
  ],
  en: [
    { id: "en-severe-bleeding", title: "Severe Bleeding", note: "Direct pressure & tourniquet" },
    { id: "en-cpr-breathing", title: "Not Breathing", note: "Center chest compressions (CPR)" },
    { id: "en-burns-emergency", title: "Burns", note: "Clean cool water, never oil or grease" },
    { id: "en-nuclear-fallout", title: "Nuclear Fallout", note: "Shelter inside. Never drink tincture iodine" },
    { id: "en-water-purification", title: "Drinking Water", note: "Filter particulates and boil 3-5 min" },
    { id: "en-hypothermia-cold", title: "Extreme Cold", note: "Dry clothes, windbreak, do not rub snow" },
    { id: "en-mine-booby-traps-danger", title: "Mines & Traps", note: "Zero touch. Never pick up items" },
    { id: "en-drones-fpv-defense", title: "Drone Attack", note: "Do not run straight; 90° dash to cover" },
  ],
  ar: [
    { id: "ar-severe-bleeding", title: "النزيف الحاد", note: "الضغط المباشر والعصابة الضاغطة" },
    { id: "ar-cpr-breathing", title: "توقف التنفس", note: "الضغط المتواصل وسط الصدر (إنعاش)" },
    { id: "ar-burns-emergency", title: "الحروق", note: "ماء نظيف بارد، تجنب الزيوت والمراهم" },
    { id: "ar-nuclear-protocol", title: "الغبار النووي", note: "البقاء داخل الملجأ، لا تشرب اليود السائل" },
    { id: "ar-water-purification", title: "مياه الشرب", note: "ترشيح الشوائب والغليان 3-5 دقائق" },
    { id: "ar-hypothermia-cold", title: "البرد القارس", note: "عزل الرياح، ملابس جافة، عدم فرك الصقيع" },
    { id: "ar-mine-booby-traps-danger", title: "الألغام والأفخاخ", note: "قاعدة عدم اللمس، لا تلتقط أي غرض" },
    { id: "ar-drones-fpv-defense", title: "هجوم المسيرات", note: "لا تركض في خط مستقيم، انعطاف حاد للاحتماء" },
  ],
};

export const ALARM_ORDER = ALARM_ORDER_I18N.ru;

export function getAlarmOrder(lang: Language = "ru") {
  return ALARM_ORDER_I18N[lang] ?? ALARM_ORDER_I18N.ru;
}
