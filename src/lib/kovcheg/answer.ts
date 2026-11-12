import type { Article } from "./types";
import { shelfTitle } from "./shelves";
import {
  aboutIodine,
  asksDose,
  indexArticles,
  mushroomQuestion,
  refusalReason,
  searchArticles,
  type Indexed,
} from "./search";

export type CitedStep = {
  text: string;
  articleId: string;
  title: string;
  anchor: string;
  shelf: string;
};

export type ArchiveAnswer = {
  refusal: string | null;
  missing: boolean;
  doseGap: boolean;
  iodine: boolean;
  mushroom: boolean;
  intro: string;
  steps: CitedStep[];
  sources: { id: string; title: string; shelf: string; anchor: string }[];
};

function stepsOf(article: Article): CitedStep[] {
  const out: CitedStep[] = [];
  for (const section of article.sections) {
    const title = section.title.toLowerCase();
    const take = title.startsWith("шаг") || title.startsWith("не делать") || title.startsWith("признак");
    if (!take) continue;
    const bits = Array.isArray(section.body) ? section.body : [section.body];
    for (const bit of bits) {
      const text = bit.trim();
      if (!text) continue;
      out.push({
        text,
        articleId: article.id,
        title: article.title,
        anchor: section.id,
        shelf: shelfTitle(article.shelf),
      });
    }
  }
  if (out.length === 0) {
    out.push({
      text: article.lead,
      articleId: article.id,
      title: article.title,
      anchor: article.sections[0]?.id ?? article.id,
      shelf: shelfTitle(article.shelf),
    });
  }
  return out;
}

export function answerFromArchive(
  query: string,
  articles: Article[],
  boost: Record<string, number>,
  index?: Indexed[],
): ArchiveAnswer {
  const refusal = refusalReason(query);
  if (refusal) {
    return {
      refusal,
      missing: false,
      doseGap: false,
      iodine: false,
      mushroom: false,
      intro: refusal,
      steps: [],
      sources: [],
    };
  }

  const q = query.trim();
  if (!q) {
    return {
      refusal: null,
      missing: false,
      doseGap: false,
      iodine: false,
      mushroom: false,
      intro: "Спросите архив своими словами. Ответ будет только из скачанных карточек.",
      steps: [],
      sources: [],
    };
  }

  const idx = index ?? indexArticles(articles);
  const iodine = aboutIodine(q);
  const dose = asksDose(q);
  const mushrooms = mushroomQuestion(q);

  let hits = searchArticles(idx, q, {}, boost).slice(0, 8);

  if (iodine && dose) {
    const yod = articles.find((a) => a.id === "yod-zapret");
    hits = yod ? [{ article: yod, score: 100 }] : [];
  } else if (mushrooms) {
    const allow = new Set(["eda-griby", "eda-dikorosy", "eda-probovat"]);
    const pool = articles.filter((a) => allow.has(a.id));
    hits = pool.map((a) => ({ article: a, score: a.id === "eda-griby" ? 5 : 1 }));
  }

  if (hits.length === 0) {
    return {
      refusal: null,
      missing: true,
      doseGap: dose,
      iodine,
      mushroom: mushrooms,
      intro: dose
        ? "В локальной базе нет дозы. Приложение её не назначает и не заполняет дыру."
        : "В локальной базе этого нет.",
      steps: [],
      sources: [],
    };
  }

  const steps: CitedStep[] = [];
  for (const hit of hits) {
    for (const step of stepsOf(hit.article)) {
      steps.push(step);
      if (steps.length >= 8) break;
    }
    if (steps.length >= 8) break;
  }

  const sources = hits.slice(0, 6).map((h) => ({
    id: h.article.id,
    title: h.article.title,
    shelf: shelfTitle(h.article.shelf),
    anchor: h.article.sections[0]?.id ?? h.article.id,
  }));

  let intro = "Ниже только выдержки из карточек, которые уже лежат на устройстве.";
  if (iodine) {
    intro =
      "Сначала запрет. Настойку йода, раствор Люголя и «йодную сетку» не пьют и не мажут вместо йодида калия. Дозы в этой базе нет: её берут только из официального сообщения, если препарат объявили.";
  } else if (dose) {
    intro =
      "В локальной базе нет дозы на этот вопрос. Цифры не подставлены. Ниже — только то, что прямо написано в карточках, без назначения лечения.";
  } else if (mushrooms) {
    intro =
      "Съедобных видов в базе нет. Без эксперта и без регионального определителя грибы и дикоросы не едят. Ниже — запрет, не рецепт.";
  }

  return {
    refusal: null,
    missing: false,
    doseGap: dose && !iodine,
    iodine,
    mushroom: mushrooms,
    intro,
    steps,
    sources,
  };
}
