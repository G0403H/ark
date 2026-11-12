import type { Article } from "../types.ts";
import type { KnowledgeChunk, KnowledgeIndex, RetrievalHit } from "./types.ts";
import { shelfTitle } from "../shelves.ts";

export type ChunkableArticle = Pick<Article, "id" | "title" | "shelf" | "lead"> & {
  sections?: Article["sections"];
  keywords?: string[];
};

const STOP_WORDS = new Set([
  "и", "в", "во", "не", "что", "он", "на", "я", "с", "со", "как", "а", "то", "все",
  "она", "так", "его", "но", "да", "ты", "к", "у", "же", "вы", "за", "бы", "по",
  "только", "ее", "мне", "было", "вот", "от", "меня", "еще", "нет", "о", "из", "ему",
  "теперь", "когда", "даже", "ну", "вдруг", "ли", "если", "уже", "или", "ни", "быть",
  "был", "него", "до", "вас", "нибудь", "опять", "уж", "вам", "ведь", "там", "потом",
  "себя", "ничего", "ей", "может", "они", "тут", "где", "есть", "надо", "ней", "для",
  "мы", "тебя", "их", "чем", "была", "сам", "чтоб", "без", "будто", "чего", "раз",
  "тоже", "себе", "под", "будет", "ж", "тогда", "кто", "этот", "того", "потому",
  "этого", "какой", "совсем", "ним", "здесь", "этом", "один", "почти", "мой", "тем",
  "чтобы", "нее", "сейчас", "были", "куда", "зачем", "всех", "никогда", "можно", "при",
  "наконец", "два", "об", "другой", "хоть", "после", "над", "больше", "тот", "через",
  "эти", "нас", "про", "всего", "них", "какая", "много", "разве", "три", "эту", "моя",
  "впрочем", "хорошо", "свою", "этой", "перед", "иногда", "лучше", "чуть", "том", "нельзя"
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 2 && !STOP_WORDS.has(word));
}

function stemPrefix(word: string): string {
  if (word.length <= 4) return word;
  // Basic heuristic prefix stemmer for Russian words to match inflections
  return word.slice(0, Math.min(word.length, 6));
}

export function chunkArticles(articles: ChunkableArticle[]): KnowledgeChunk[] {
  const chunks: KnowledgeChunk[] = [];

  for (const article of articles) {
    const shelfName = shelfTitle(article.shelf);
    const articleWords = tokenize(`${article.title} ${article.lead}`);

    // If article has sections, create a chunk per section
    if (article.sections && article.sections.length > 0) {
      for (const section of article.sections) {
        const bodyText = Array.isArray(section.body)
          ? section.body.join(" ")
          : section.body || "";
        
        const fullContent = `${section.title}: ${bodyText.trim()}`;
        const sectionWords = tokenize(`${section.title} ${bodyText}`);
        const allKeywords = Array.from(new Set([...articleWords, ...sectionWords]));

        chunks.push({
          id: `${article.id}#${section.id}`,
          articleId: article.id,
          articleTitle: article.title,
          sectionId: section.id,
          sectionTitle: section.title,
          shelf: shelfName,
          content: fullContent,
          keywords: allKeywords,
        });
      }
    } else {
      // Fallback single chunk for articles without sections
      chunks.push({
        id: `${article.id}#lead`,
        articleId: article.id,
        articleTitle: article.title,
        sectionId: "lead",
        sectionTitle: article.title,
        shelf: shelfName,
        content: article.lead,
        keywords: articleWords,
      });
    }
  }

  return chunks;
}

export function buildKnowledgeIndex(articles: ChunkableArticle[]): KnowledgeIndex {
  const chunks = chunkArticles(articles);
  return {
    version: "kovcheg-rag-v1",
    updatedAt: Date.now(),
    totalArticles: articles.length,
    chunks,
  };
}

export function searchKnowledgeIndex(
  index: KnowledgeIndex,
  query: string,
  topK = 5
): RetrievalHit[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0 || index.chunks.length === 0) {
    return [];
  }

  const queryStems = queryTokens.map((t) => stemPrefix(t));
  const results: RetrievalHit[] = [];

  for (const chunk of index.chunks) {
    let score = 0;
    const matched: string[] = [];

    const chunkStems = new Set(chunk.keywords.map((k) => stemPrefix(k)));
    const contentLower = chunk.content.toLowerCase();
    const titleLower = chunk.articleTitle.toLowerCase();
    const secLower = chunk.sectionTitle.toLowerCase();

    for (let i = 0; i < queryTokens.length; i++) {
      const token = queryTokens[i];
      const stem = queryStems[i];

      // Exact token presence in keywords
      if (chunk.keywords.includes(token)) {
        score += 3;
        matched.push(token);
      } else if (chunkStems.has(stem)) {
        // Stem match
        score += 2;
        matched.push(token);
      }

      // Title match boosts relevance
      if (titleLower.includes(token)) {
        score += 4;
      }
      if (secLower.includes(token)) {
        score += 3;
      }
      if (contentLower.includes(token)) {
        score += 1;
      }
    }

    if (score > 0) {
      results.push({
        chunk,
        score,
        matchedKeywords: Array.from(new Set(matched)),
      });
    }
  }

  // Sort descending by score
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}
