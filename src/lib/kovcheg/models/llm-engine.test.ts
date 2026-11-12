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

describe("LLM Engine & Safety Guardrails", () => {
  test("formatRAGPrompt embeds survival context and strict safety constraints", () => {
    const prompt = formatRAGPrompt("как наложить жгут", mockChunks);

    assert.ok(prompt.includes("КОНТЕКСТ ИЗ АРХИВА ВЫЖИВАНИЯ:"));
    assert.ok(prompt.includes("Наложение жгута: Затяните выше раны"));
    assert.ok(prompt.includes("Запрещено выдумывать лекарственные дозировки"));
    assert.ok(prompt.includes("Запрещено советовать пить настойку йода"));
    assert.ok(prompt.includes("Вопрос пользователя: как наложить жгут"));
  });

  test("buildFallbackResponse structures grounded steps when offline / no WebGPU", () => {
    const result = buildFallbackResponse("как наложить жгут", mockChunks);

    assert.equal(result.isFallback, true);
    assert.equal(result.citedChunks.length, 1);
    assert.equal(result.citedChunks[0].articleId, "aid-1");
    assert.ok(result.text.includes("Затяните выше раны"));
  });

  test("buildFallbackResponse enforces refusal for dangerous iodine tincture questions", () => {
    const result = buildFallbackResponse("можно ли пить йод", []);
    assert.ok(result.text.includes("запрет"));
    assert.ok(result.text.includes("Настойку йода") || result.text.includes("не пьют"));
  });

  test("buildFallbackResponse notifies if query asks for unknown dosages", () => {
    const result = buildFallbackResponse("доза антибиотика ребенку", []);
    assert.ok(result.text.includes("дозы"));
  });
});
