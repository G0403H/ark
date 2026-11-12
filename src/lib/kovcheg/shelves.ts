import type { Language } from "./i18n";

export interface ShelfDefinition {
  id: string;
  ru: { title: string; hint: string };
  en: { title: string; hint: string };
  ar: { title: string; hint: string };
}

export const SHELVES_DATA: ShelfDefinition[] = [
  {
    id: "voda",
    ru: { title: "Вода", hint: "Сколько пить, как отстоять, фильтрация и когда не пить" },
    en: { title: "Water", hint: "Purification, solar still, rationing, and unsafe sources" },
    ar: { title: "الماء", hint: "التنقية، الترشيح، التقطير الشمسي ومصادر المياه الآمنة" },
  },
  {
    id: "ogon",
    ru: { title: "Огонь и тепло", hint: "Розжиг в сырости и на снегу, виды костров, угарный газ" },
    en: { title: "Fire & Heat", hint: "Campfires, damp kindling, teepee vs log cabin, carbon monoxide" },
    ar: { title: "النار والحرارة", hint: "إشعال النار في الرطوبة والثلج، أنواع المواقد، أول أكسيد الكربون" },
  },
  {
    id: "ukrytie",
    ru: { title: "Укрытие", hint: "Шалаш, навес, снежная нора, подвал, укрепление убежища" },
    en: { title: "Shelter", hint: "Lean-to, snow trench, basement, insulation and tarp rigging" },
    ar: { title: "المأوى", hint: "الأكواخ، خنادق الثلج، الملاجئ الأرضية والعزل الحراري" },
  },
  {
    id: "eda",
    ru: { title: "Еда и запасы", hint: "Ротация, порча, сушка, запрет на непроверенные грибы" },
    en: { title: "Food & Rations", hint: "Preservation, long-term staples, calorie rationing" },
    ar: { title: "الطعام والمؤن", hint: "التخزين، التجفيف، التمليح، وتجنب الفطريات السامة" },
  },
  {
    id: "kuhnya",
    ru: { title: "Кулинария и рецепты", hint: "Походный хлеб, пресные лепешки, дикоросы, чай из хвои" },
    en: { title: "Field Cooking", hint: "Ash cakes, bannock bread, edible wild greens, vitamin C teas" },
    ar: { title: "الطبخ والوصفات البرية", hint: "خبز الجمر، النباتات البرية الصالحة للأكل، والشاي العشبي" },
  },
  {
    id: "rybalka",
    ru: { title: "Рыбалка и добыча рыбы", hint: "Снасти из подручных средств, наживки, повадки рыб, верши, донки" },
    en: { title: "Survival Fishing", hint: "Improvised tackle, natural baits, fish species guide, traps and trotlines" },
    ar: { title: "صيد الأسماك الميداني", hint: "صناعة الصنارات الميدانية، الطعوم الطبيعية، فخاخ الأسماك والشباك" },
  },
  {
    id: "dosug",
    ru: { title: "Досуг и мораль", hint: "Психология в укрытии, игры без реквизита, шахматы на бумаге" },
    en: { title: "Morale & Mental Health", hint: "Isolation psychology, zero-prop games, daily routines" },
    ar: { title: "المعنويات والترفيه", hint: "علم نفس البقاء، ألعاب دون أدوات، والتغلب على القلق" },
  },
  {
    id: "uzly",
    ru: { title: "Узлы и веревки", hint: "Булинь, прямой, прусик, плетение веревок из крапивы и коры" },
    en: { title: "Knots & Cordage", hint: "Bowline, square knot, prusik, making cordage from plants" },
    ar: { title: "العقد والحبال", hint: "عقدة البولين، العقدة المربعة، وصناعة الحبال من النباتات" },
  },
  {
    id: "navigaciya",
    ru: { title: "Навигация и погода", hint: "Полярная звезда, солнце и часы, чтение облаков и ветра" },
    en: { title: "Navigation & Weather", hint: "North Star, watch method, reading storm clouds and barometers" },
    ar: { title: "الملاحة والطقس", hint: "نجم القطب، طريقة الساعة، والتنبؤ بالعواصف وحركة السحب" },
  },
  {
    id: "energiya",
    ru: { title: "Энергия и свет", hint: "Свечной обогреватель, масляная лампа, повербанки на морозе" },
    en: { title: "Energy & Lighting", hint: "Clay pot candle heaters, DIY oil lamps, battery preservation" },
    ar: { title: "الطاقة والإضاءة", hint: "مدافئ الشموع الفخارية، مصابيح الزيت، والحفاظ على البطاريات" },
  },
  {
    id: "gigiena",
    ru: { title: "Гигиена", hint: "Мытье рук без водопровода, полевой туалет, профилактика дизентерии" },
    en: { title: "Hygiene", hint: "Handwashing without tap water, latrines, dysentery prevention" },
    ar: { title: "النظافة والصحة", hint: "غسل اليدين دون ماء جاري، المراحيض الميدانية ومنع الأوبئة" },
  },
  {
    id: "pomosh",
    ru: { title: "Первая помощь", hint: "Кровь, жгут, дыхание, сердечно-легочная реанимация, ожоги, переломы" },
    en: { title: "First Aid", hint: "Severe bleeding, CPR, burns, splints, tourniquets, hypothermia" },
    ar: { title: "الإسعافات الأولية", hint: "النزيف الشديد، الإنعاش القلبي، الحروق، والكسور" },
  },
  {
    id: "anatomiya",
    ru: { title: "Анатомия", hint: "Крупные ориентиры и точки пульса, чтобы правильно описать травму" },
    en: { title: "Field Anatomy", hint: "Pulse points, organ locations to accurately assess trauma" },
    ar: { title: "تشريح الإصابات", hint: "نقاط النبض، مواضع الأعضاء الحيوية لتقييم الإصابة الميدانية" },
  },
  {
    id: "infekciya",
    ru: { title: "Инфекция", hint: "Карантин, изоляция больного, дезинфекция посуды и белья" },
    en: { title: "Infection Control", hint: "Quarantine in tight spaces, boiling dishware, fever care" },
    ar: { title: "مكافحة العدوى", hint: "العزل المنزلي، تعقيم الأدوات، والتعامل مع الحمى" },
  },
  {
    id: "holod",
    ru: { title: "Холод", hint: "Правило трех слоев одежды, сухая обувь, защита от обморожения" },
    en: { title: "Cold Survival", hint: "Layering principles, trench foot prevention, avoiding snow rubbing" },
    ar: { title: "مقاومة البرد", hint: "طبقات الملابس الثلاث، الوقاية من قرصة الصقيع والتدفئة" },
  },
  {
    id: "zhara",
    ru: { title: "Жара", hint: "Тепловой удар, режим питья, укрытие от солнца, электролиты" },
    en: { title: "Extreme Heat", hint: "Heat stroke prevention, siesta rhythm, salt & electrolyte balance" },
    ar: { title: "الحرارة الشديدة", hint: "ضربات الشمس، تعويض الأملاح، والتظلل في ساعات الذروة" },
  },
  {
    id: "put",
    ru: { title: "Путь без GPS", hint: "Лес, горы, рельеф, реки как ориентир. Мох — ненадежный компас" },
    en: { title: "Trail Finding", hint: "Ridge lines, river descent, why moss is a misleading compass" },
    ar: { title: "تتبع المسار", hint: "الاعتماد على التضاريس ومجاري المياه عند فقدان نظام GPS" },
  },
  {
    id: "signaly",
    ru: { title: "Сигналы бедствия", hint: "Правило трех сигналов, зеркало, дым, когда костер опасен" },
    en: { title: "Distress Signals", hint: "Rule of threes, signal mirror, whistle, fire safety" },
    ar: { title: "إشارات الاستغاثة", hint: "قاعدة الإشارات الثلاث، المرايا العاكسة، والصفارات" },
  },
  {
    id: "instrument",
    ru: { title: "Инструмент и ремонт", hint: "Заточка ножа, заплатки на ткань, проволока, уход за топором" },
    en: { title: "Tools & Repair", hint: "Knife maintenance, duct tape, cord whipping, ax safety" },
    ar: { title: "الأدوات والإصلاح", hint: "صيانة السكاكين، ترقيع الملابس، والتعامل الآمن مع الفؤوس" },
  },
  {
    id: "svet",
    ru: { title: "Свет и малый ток", hint: "Батарейки, повербанки, генераторы и опасность выхлопа" },
    en: { title: "Power & Light", hint: "LED conservation, hand cranks, generator exhaust hazards" },
    ar: { title: "الكهرباء والإضاءة", hint: "ترشيد بطاريات LED، خطر عوادم المولدات الكهربائية" },
  },
  {
    id: "gruppa",
    ru: { title: "Группа и сон", hint: "Ночное дежурство, дисциплина воды, предотвращение паники" },
    en: { title: "Group Dynamics", hint: "Night watches, conflict resolution, rationing fairly" },
    ar: { title: "إدارة المجموعة", hint: "الحراسة الليلية، العدالة في توزيع المؤن وتجنب النزاع" },
  },
  {
    id: "lyudi",
    ru: { title: "Дети, пожилые, больные", hint: "Особый уход, сохранение тепла, адаптация рациона" },
    en: { title: "Vulnerable Care", hint: "Infants, pregnant women, elderly: hydration and warmth" },
    ar: { title: "الأطفال وكبار السن", hint: "العناية الخاصة بالحوامل والمسنين وترشيد طاقتهم" },
  },
  {
    id: "stihiya",
    ru: { title: "Стихия", hint: "Землетрясение, наводнение, пожар, ураган, правила поведения" },
    en: { title: "Natural Disasters", hint: "Earthquakes, floods, wildfires, structural collapse" },
    ar: { title: "الكوارث الطبيعية", hint: "الزلازل، الفيضانات، حرائق الغابات والعواصف" },
  },
  {
    id: "bumaga",
    ru: { title: "Бумага", hint: "Что зарисовать и записать на бумаге, пока есть блокнот и карандаш" },
    en: { title: "Paper Records", hint: "Vital contacts, medical details, coordinates on physical paper" },
    ar: { title: "التدوين الورقي", hint: "حفظ أرقام الهواتف، الخرائط والمعلومات الطبية على الورق" },
  },
  {
    id: "yadro",
    ru: { title: "Ядерный регламент", hint: "Радиоактивная пыль, время полураспада, герметизация укрытия" },
    en: { title: "Nuclear Protocol", hint: "Fallout sheltering, sealing cracks, decay timing, decontamination" },
    ar: { title: "البروتوكول النووي", hint: "الغبار الإشعاعي، الإغلاق المحكم، ومراحل انخفاض الإشعاع" },
  },
  {
    id: "voina",
    ru: {
      title: "Военная опасность и БПЛА",
      hint: "Дроны (FPV/сбросы), мины-ловушки, неразорвавшиеся боеприпасы, артобстрелы",
    },
    en: {
      title: "Wartime Safety & Drones",
      hint: "FPV drones, thermal evasion, booby traps, UXO, minefields, artillery shelter",
    },
    ar: {
      title: "مخاطر الحرب والمسيرات",
      hint: "طائرات FPV، التخفي الحراري، الشرك الخداعية، الألغام وملاجئ القصف",
    },
  },
];

export const SHELVES = SHELVES_DATA.map((s) => ({
  id: s.id,
  title: s.ru.title,
  hint: s.ru.hint,
}));

export type ShelfId = (typeof SHELVES_DATA)[number]["id"];

export function shelfTitle(id: ShelfId, lang: Language = "ru"): string {
  const item = SHELVES_DATA.find((s) => s.id === id);
  if (!item) return id;
  return item[lang]?.title ?? item.ru.title ?? id;
}

export function shelfHint(id: ShelfId, lang: Language = "ru"): string {
  const item = SHELVES_DATA.find((s) => s.id === id);
  if (!item) return "";
  return item[lang]?.hint ?? item.ru.hint ?? "";
}

export function getLocalizedShelves(lang: Language = "ru") {
  return SHELVES_DATA.map((s) => ({
    id: s.id as ShelfId,
    title: s[lang]?.title ?? s.ru.title,
    hint: s[lang]?.hint ?? s.ru.hint,
  }));
}
