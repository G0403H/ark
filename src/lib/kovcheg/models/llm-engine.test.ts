import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { formatRAGPrompt, buildFallbackResponse } from "./llm-engine.ts";
import type { KnowledgeChunk } from "./types.ts";

const mockChunks: KnowledgeChunk[] = [
  {
    id: "aid-1#step-1",
    articleId: "aid-1",
    articleTitle: "Остановка кровотечения",
    sectionId: "step-1",
    sectionTitle: "Наложение жгута",
    shelf: "Медицина",
    content: "Наложение жгута: Затяните выше раны до остановки кровотечения. Зафиксируйте время.",
    keywords: ["жгут", "кровь"],
  },
];

describe("LLM Engine & Unconstrained Knowledge System", () => {
  test("formatRAGPrompt embeds survival context as supplementary knowledge without restrictions", () => {
    const prompt = formatRAGPrompt("как наложить жгут", mockChunks);

    assert.ok(prompt.includes("СПРАВОЧНЫЕ МАТЕРИАЛЫ ИЗ ЛОКАЛЬНОГО АРХИВА"));
    assert.ok(prompt.includes("Наложение жгута: Затяните выше раны"));
    assert.ok(prompt.includes("Ты не ограничен только карточками"));
    assert.ok(prompt.includes("Вопрос пользователя: как наложить жгут"));
  });

  test("buildFallbackResponse structures grounded steps when offline / no WebGPU", () => {
    const result = buildFallbackResponse("как наложить жгут", mockChunks);

    assert.equal(result.isFallback, true);
    assert.equal(result.citedChunks.length, 1);
    assert.equal(result.citedChunks[0].articleId, "aid-1");
    assert.ok(result.text.includes("Затяните выше раны"));
  });

  test("buildFallbackResponse provides constructive medical facts for iodine questions without refusal", () => {
    const result = buildFallbackResponse("можно ли пить йод", []);
    assert.ok(result.text.includes("Йодид калия"));
    assert.ok(result.text.includes("щитовидной железы"));
    assert.ok(result.text.includes("Спиртовой раствор"));
  });

  test("buildFallbackResponse answers arbitrary questions constructively even with empty chunks", () => {
    const result = buildFallbackResponse("как построить шалаш в лесу", []);
    assert.ok(result.text.includes("Информационная справка"));
    assert.ok(result.text.includes("Анализ обстановки"));
  });
});
