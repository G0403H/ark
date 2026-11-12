import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  chunkArticles,
  buildKnowledgeIndex,
  searchKnowledgeIndex,
  type ChunkableArticle,
} from "./knowledge-indexer.ts";

const mockArticles: ChunkableArticle[] = [
  {
    id: "zhgut-krovotechenie",
    title: "Остановка артериального кровотечения",
    shelf: "aid",
    lead: "Артериальное кровотечение угрожает жизни за 1-2 минуты.",
    sections: [
      {
        id: "step-1",
        title: "Шаг 1. Наложение жгута",
        body: "Наложите жгут выше раны на одежду или ткань. Затяните до остановки крови. Запишите точное время наложения.",
      },
      {
        id: "warning",
        title: "Не делать",
        body: "Не накладывайте жгут на голую кожу. Не прячьте жгут под одежду.",
      },
    ],
  },
  {
    id: "voda-ochistka",
    title: "Обеззараживание воды кипячением",
    shelf: "water",
    lead: "Кипячение убивает бактерии и вирусы.",
    sections: [
      {
        id: "step-boil",
        title: "Шаг 1. Кипячение",
        body: "Кипятите воду бурным кипением не менее 3-5 минут. В горах увеличивайте время кипячения до 10 минут.",
      },
    ],
  },
];

describe("Knowledge Indexer & RAG Chunker", () => {
  test("chunkArticles decomposes articles into indexed chunks with keywords", () => {
    const chunks = chunkArticles(mockArticles);
    assert.ok(chunks.length >= 3, `Expected at least 3 chunks, got ${chunks.length}`);

    const zhgutChunk = chunks.find((c) => c.sectionId === "step-1");
    assert.ok(zhgutChunk);
    assert.equal(zhgutChunk.articleId, "zhgut-krovotechenie");
    assert.ok(zhgutChunk.content.includes("Наложите жгут выше раны"));
    assert.ok(zhgutChunk.keywords.includes("жгут"));
    assert.ok(zhgutChunk.keywords.includes("кровотечения") || zhgutChunk.keywords.includes("кровотечение") || zhgutChunk.keywords.some(k => k.startsWith("кров")));
  });

  test("buildKnowledgeIndex creates an index with metadata", () => {
    const index = buildKnowledgeIndex(mockArticles);
    assert.equal(index.totalArticles, 2);
    assert.ok(index.chunks.length > 0);
    assert.ok(index.updatedAt > 0);
    assert.ok(index.version);
  });

  test("searchKnowledgeIndex accurately retrieves top chunks for emergency query", () => {
    const index = buildKnowledgeIndex(mockArticles);
    const hits = searchKnowledgeIndex(index, "как правильно наложить жгут при кровотечении", 3);

    assert.ok(hits.length > 0);
    assert.equal(hits[0].chunk.articleId, "zhgut-krovotechenie");
    assert.ok(hits[0].score > 0);
    assert.ok(hits[0].matchedKeywords.length > 0);
  });

  test("searchKnowledgeIndex returns empty on completely unrelated query", () => {
    const index = buildKnowledgeIndex(mockArticles);
    const hits = searchKnowledgeIndex(index, "синхрофазотрон квантовая гравитация", 3);
    assert.equal(hits.length, 0);
  });
});
