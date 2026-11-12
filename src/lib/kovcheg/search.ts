import type { Article } from "./types";
import type { ShelfId } from "./shelves";

const SYN: string[][] = [
  ["радиац", "радиоактив", "ядерн", "пыль", "выпаден", "осадк", "убежищ"],
  ["жгут", "турникет"],
  ["угар", "окись", "копот"],
  ["понос", "диаре", "обезвож", "регидрат"],
  ["йод", "йодид", "настойк", "люгол", "щитовид"],
  ["гриб", "дикорос"],
  ["ожог", "кипяток", "обвар"],
  ["холод", "обморож", "переохлажд"],
  ["жар", "тепловой", "перегрев"],
  ["кровотеч", "кровоточ"],
  ["подвал", "укрыт"],
  ["клещ"],
  ["змея", "змеи", "змей", "гадюк"],
  ["судорог", "эпилеп", "припадок"],
  ["инсульт", "перекос"],
  ["аллерг", "анафилакс"],
  ["астм", "ингалятор"],
  ["диабет", "глюкоз"],
  ["роды", "схватк", "пуповин"],
  ["цунами"],
  ["ополз", "сель"],
  ["пепел", "вулкан"],
  ["лавин"],
  ["электрич", "проводк"],
  ["отрав", "проглот"],
  ["шалаш", "навес", "лапник"],
  ["костер", "розжиг", "берест"],
  ["снег", "сугроб"],
  ["гора", "перевал", "высот"],
  ["тайга"],
];

const ENDINGS = [
  "иями",
  "ями",
  "ами",
  "ого",
  "ему",
  "ыми",
  "ими",
  "его",
  "ой",
  "ий",
  "ый",
  "ая",
  "яя",
  "ое",
  "ее",
  "ые",
  "ие",
  "ов",
  "ев",
  "ам",
  "ям",
  "ах",
  "ях",
  "ом",
  "ем",
  "ую",
  "юю",
  "а",
  "я",
  "у",
  "ю",
  "ы",
  "и",
  "о",
  "е",
];

const STOPS = new Set([
  "и",
  "в",
  "во",
  "не",
  "что",
  "он",
  "на",
  "я",
  "с",
  "со",
  "как",
  "а",
  "то",
  "все",
  "она",
  "так",
  "его",
  "но",
  "да",
  "ты",
  "к",
  "у",
  "же",
  "вы",
  "за",
  "бы",
  "по",
  "ее",
  "мне",
  "это",
  "от",
  "уже",
  "или",
  "ни",
  "до",
  "без",
  "для",
  "мы",
  "их",
  "чем",
  "под",
  "кто",
  "при",
  "про",
  "над",
  "после",
  "через",
  "из",
  "ли",
  "если",
  "чтобы",
  "еще",
  "только",
  "можно",
  "нужно",
  "надо",
  "этот",
  "эта",
  "эти",
  "этой",
  "этом",
  "будет",
  "быть",
  "был",
  "было",
  "были",
  "вас",
  "вам",
  "нас",
  "том",
  "тем",
  "той",
  "свой",
  "свою",
  "свои",
  "мой",
  "твой",
  "наш",
  "где",
  "когда",
  "уже",
  "ещё",
  "при",
]);

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9\u0600-\u06FF\s-]/gu, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stem(w: string): string {
  if (w.length < 4 || !/[а-я]/.test(w)) return w;
  for (const e of ENDINGS) {
    if (w.endsWith(e) && w.length - e.length >= 3) return w.slice(0, -e.length);
  }
  return w;
}

export function analyze(text: string): string[] {
  const parts = normalize(text).split(" ").filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    if (STOPS.has(p) || p.length < 2) continue;
    out.push(stem(p));
  }
  return out;
}

function familyHit(token: string, prefix: string): boolean {
  if (token === prefix) return true;
  if (prefix.length >= 4 && token.startsWith(prefix)) return true;
  if (token.length >= 4 && prefix.length >= 4 && prefix.startsWith(token)) return true;
  return false;
}

export function sameFamily(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))) return true;
  for (const group of SYN) {
    const ga = group.some((p) => familyHit(a, p));
    if (!ga) continue;
    if (group.some((p) => familyHit(b, p))) return true;
  }
  return false;
}

export type Indexed = {
  article: Article;
  tokens: Map<string, number>;
  titleNorm: string;
};

export function indexArticles(list: Article[]): Indexed[] {
  return list.map((article) => {
    const tokens = new Map<string, number>();
    const add = (text: string, w: number) => {
      for (const t of analyze(text)) {
        const prev = tokens.get(t) ?? 0;
        if (w > prev) tokens.set(t, w);
      }
    };
    add(article.title, 10);
    add(article.keywords.join(" "), 8);
    add(article.lead, 4);
    for (const s of article.sections) {
      add(s.title, 3);
      add(Array.isArray(s.body) ? s.body.join(" ") : s.body, 2);
    }
    return { article, tokens, titleNorm: normalize(article.title) };
  });
}

import type { Language } from "./i18n";

export type SearchFilter = {
  shelf?: ShelfId | "";
  pictures?: boolean;
  alarms?: boolean;
  packId?: string;
  lang?: Language | "all";
};

export type Hit = { article: Article; score: number };

export function searchArticles(
  index: Indexed[],
  query: string,
  filter: SearchFilter,
  boost: Record<string, number> = {},
): Hit[] {
  const qTokens = analyze(query);
  const qNorm = normalize(query);
  const hits: Hit[] = [];
  const iodine = qTokens.some((t) => sameFamily(t, "йод"));

  for (const doc of index) {
    const a = doc.article;
    if (filter.lang && filter.lang !== "all" && (a.lang || "ru") !== filter.lang) continue;
    if (filter.shelf && a.shelf !== filter.shelf) continue;
    if (filter.pictures && !a.figure) continue;
    if (filter.alarms && a.kind === "guide") continue;
    if (filter.packId && a.packId !== filter.packId) continue;

    if (qTokens.length === 0) {
      hits.push({ article: a, score: 1 + (boost[a.id] ?? 0) });
      continue;
    }

    let score = 0;
    let ok = true;
    for (const qt of qTokens) {
      let best = 0;
      for (const [dt, w] of doc.tokens) {
        if (sameFamily(qt, dt)) best = Math.max(best, w);
      }
      if (best === 0) {
        ok = false;
        break;
      }
      score += best;
    }
    if (!ok) continue;
    if (qNorm.length > 3 && doc.titleNorm.includes(qNorm)) score += 24;
    if (a.id === "yod-zapret" && iodine) score += 100;
    if (a.kind !== "guide") score += 2;
    score += (boost[a.id] ?? 0) * 4;
    hits.push({ article: a, score });
  }

  hits.sort((x, y) => y.score - x.score || x.article.title.localeCompare(y.article.title, "ru"));
  return hits;
}

const REFUSAL =
  "Этого в архиве нет и не будет. КОВЧЕГ не учит делать оружие, взрывчатку, яды и наркотики и не показывает обход блокировок. Рецепта здесь нет.";

export function refusalReason(query: string): string | null {
  const q = normalize(query);
  if (!q) return null;
  const banned = [
    /взрывчат/,
    /детонатор/,
    /напалм/,
    /коктейл\S* молотов/,
    /зажигательн\S* смес/,
    /(^| )порох( |$)/,
    /самодельн\S* (оруж|патрон|бомб|пистолет)/,
    /(сделать|изготовить|собрать) (оруж|пистолет|глушител|патрон|автомат|бомб|взрыв)/,
    /как сделать (оруж|пистолет|глушител|патрон|автомат|бомб)/,
    /синтез\S* (яд|наркот|отрав)/,
    /(изготовить|приготовить|сварить) яд/,
    /наркотик/,
    /метамфетам/,
    /героин/,
    /отравляющ\S* веществ/,
    /химическ\S* оруж/,
    /биологическ\S* оруж/,
    /ядерн\S* (бомб|заряд|оруж)/,
    /обогащен\S* уран/,
    /вредоносн\S* код/,
    /эксплойт/,
    /кейлогер/,
    /обход блокир/,
    /(^| )взлом( |$)/,
    /(^| )взломать( |$)/,
  ];
  return banned.some((r) => r.test(q)) ? REFUSAL : null;
}

export function asksDose(query: string): boolean {
  const q = normalize(query);
  return /дозир|доза |дозу|дозы|сколько (мг|грамм|таблет|капел|капл|мл)|миллиграм|(^| )мг( |$)/.test(q);
}

export function aboutIodine(query: string): boolean {
  return analyze(query).some((t) => sameFamily(t, "йод"));
}

export function mushroomQuestion(query: string): boolean {
  const q = normalize(query);
  return /гриб/.test(q);
}
