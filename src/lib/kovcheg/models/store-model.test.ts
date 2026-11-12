import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { useArk } from "../store.ts";

describe("Store Model & Index Management", () => {
  test("initializes with default model and archive mode", () => {
    const state = useArk.getState();
    assert.equal(state.selectedModelId, "qwen2.5-0.5b");
    assert.equal(state.modelMode, "archive");
    assert.equal(Array.isArray(state.downloadedModels), true);
  });

  test("can change selected model and switch modelMode", () => {
    useArk.getState().setSelectedModelId("mnn-pocket-0.3b-q8");
    assert.equal(useArk.getState().selectedModelId, "mnn-pocket-0.3b-q8");

    useArk.getState().setModelMode("llm");
    assert.equal(useArk.getState().modelMode, "llm");
  });

  test("tracks downloaded models and removal", () => {
    useArk.getState().addDownloadedModel("qwen2.5-0.5b");
    assert.ok(useArk.getState().downloadedModels.includes("qwen2.5-0.5b"));

    // Adding again doesn't duplicate
    useArk.getState().addDownloadedModel("qwen2.5-0.5b");
    assert.equal(
      useArk.getState().downloadedModels.filter((m) => m === "qwen2.5-0.5b").length,
      1
    );

    useArk.getState().removeDownloadedModel("qwen2.5-0.5b");
    assert.ok(!useArk.getState().downloadedModels.includes("qwen2.5-0.5b"));
  });

  test("records archive training/indexing status", () => {
    useArk.getState().setArchiveIndexed(145);
    assert.equal(useArk.getState().archiveIndexedChunks, 145);
    assert.ok(typeof useArk.getState().archiveIndexedAt === "number");
    assert.ok((useArk.getState().archiveIndexedAt ?? 0) > 0);
  });

  test("adds, selects, and removes custom models", () => {
    const customConfig = {
      id: "custom-test-1",
      name: "Custom Gemma 2B",
      family: "Gemma",
      parametersB: 2.0,
      quantization: "q4" as const,
      sourceType: "local-endpoint" as const,
      endpointUrl: "http://127.0.0.1:11434/v1",
      sizeLabel: "Внешний",
      vramLabel: "Сервер",
      description: "My custom model",
      createdAt: Date.now(),
    };

    useArk.getState().addCustomModel(customConfig);
    assert.equal(useArk.getState().customModels.length, 1);
    assert.equal(useArk.getState().customModels[0].id, "custom-test-1");
    assert.ok(useArk.getState().downloadedModels.includes("custom-test-1"));

    useArk.getState().setSelectedModelId("custom-test-1");
    assert.equal(useArk.getState().selectedModelId, "custom-test-1");

    useArk.getState().removeCustomModel("custom-test-1");
    assert.equal(useArk.getState().customModels.length, 0);
    assert.ok(!useArk.getState().downloadedModels.includes("custom-test-1"));
    assert.equal(useArk.getState().selectedModelId, "qwen2.5-0.5b");
  });
});
