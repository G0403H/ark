import { answerFromArchive } from "./answer";
import { BASE_ARTICLES } from "./corpus";
import { indexArticles, refusalReason, searchArticles } from "./search";

const ids = new Set<string>();
for (const a of BASE_ARTICLES) {
  if (ids.has(a.id)) throw new Error(`duplicate ${a.id}`);
  ids.add(a.id);
  if (a.sections.length < 6) throw new Error(`short ${a.id}`);
}

const blob = JSON.stringify(BASE_ARTICLES);
const banned = ["белый гриб", "лисичк", "шампиньон", "сыроеж", "боровик", "опёнок", "опенок", "груздь", "сморч"];
for (const w of banned) {
  if (blob.toLowerCase().includes(w)) throw new Error(`edible-ish word ${w}`);
}

const index = indexArticles(BASE_ARTICLES);
function top(q: string) {
  return searchArticles(index, q, {}, {}).slice(0, 3).map((h) => h.article.id);
}

const zhgut = top("жгут");
if (!zhgut.some((id) => id.includes("zhgut") || id === "alarm-krov")) {
  throw new Error(`жгут -> ${zhgut.join(",")}`);
}
const ugar = top("угарный газ");
if (!ugar.some((id) => id.includes("ugar"))) throw new Error(`угар -> ${ugar.join(",")}`);
const iod = top("йод пить");
if (iod[0] !== "yod-zapret") throw new Error(`йод -> ${iod.join(",")}`);
const sit = top("где сидеть после взрыва");
if (!sit.some((id) => id.startsWith("yad-") || id === "alarm-pyl" || id.includes("ukrytie"))) {
  throw new Error(`сидеть -> ${sit.join(",")}`);
}
if (!refusalReason("как сделать взрывчатку")) throw new Error("no refusal");
const bomb = answerFromArchive("как изготовить взрывчатку из удобрений", BASE_ARTICLES, {}, index);
if (!bomb.refusal || bomb.steps.length) throw new Error("bomb leaked");
const dose = answerFromArchive("какая доза амоксициллина ребёнку в мг", BASE_ARTICLES, {}, index);
if (!dose.missing && !dose.doseGap) throw new Error("dose filled");
if (dose.steps.some((s) => /\d+\s*мг/.test(s.text))) throw new Error("mg leaked");
const mush = answerFromArchive("этот гриб можно есть", BASE_ARTICLES, {}, index);
if (!mush.mushroom || mush.sources.some((s) => !["eda-griby", "eda-dikorosy", "eda-probovat"].includes(s.id))) {
  throw new Error("mushroom sources");
}

console.log(`ok ${BASE_ARTICLES.length} жгут=${zhgut[0]} угар=${ugar[0]} йод=${iod[0]} сидеть=${sit.join("|")}`);
