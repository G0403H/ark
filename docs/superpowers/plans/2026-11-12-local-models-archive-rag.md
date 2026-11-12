# Local Models Download & Archive Knowledge Ingestion (Offline RAG) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide in-app downloading of lightweight local language models (WebGPU / WebLLM) and immediate knowledge indexing/ingestion ("training") on the Kovcheg survival archive so the model answers faster, accurately, and 100% offline without hallucinations.

**Architecture:** 
1. **Model Management Layer:** A client-side model manager supporting WebGPU/WebLLM (Qwen 2.5 0.5B, SmolLM2 360M, Qwen 2.5 1.5B) with progress tracking, Cache Storage persistence, and device capability detection (WebGPU vs CPU fallback).
2. **Archive Knowledge Indexer (Local RAG):** Chunks all articles into emergency action units (steps, contraindications, dosages, safety rules) and builds a client-side semantic vector/TF-IDF index in IndexedDB for sub-second retrieval.
3. **Grounded Synthesis & Streaming Engine:** Synthesizes model prompts with retrieved archive context and strict safety guardrails (forbidding toxic iodine consumption, unverified dosages, mushroom foraging guesses), streaming token responses to the UI.
4. **UI Integration in `/assistant`:** Interactive model catalog with download progress, one-click archive indexing ("Обучить архив"), real-time streaming answers, and storage management.

**Tech Stack:** React 19, TanStack Router/Start, Zustand (persisted), `@mlc-ai/web-llm`, Tailwind CSS v4, Node.js test runner.

---

## Global Constraints

- **Offline-first:** All downloaded weights and indices must be cached in browser storage (`Cache API` / `IndexedDB`) and function completely disconnected from the network.
- **SSR-safe:** Model runner and browser APIs (`navigator.gpu`, `window`, `caches`, `indexedDB`) must never execute during server-side rendering or build.
- **Safety invariant:** Never invent medical dosages or permit toxic practices (iodine tincture ingestion); ground all answers strictly in archive citations.
- **Responsive & Lightweight:** Default to ultralight models (0.5B parameters) suitable for mobile devices and laptops.

---

## Review Focus

1. **Storage Quota & Offline Cache:** If Cache Storage or IndexedDB quota is exceeded or cleared, the UI must gracefully report status and allow clearing or re-downloading.
2. **Non-WebGPU Hardware Fallback:** If a device lacks WebGPU support, the assistant must cleanly fall back to high-speed local archive synthesis without crashing.
3. **Streaming Responsiveness:** LLM token generation must stream progressively with responsive cancellation (AbortController) when the user stops or queries again.
4. **Strict Medical & Emergency Boundaries:** Questions asking for unverified dosages or dangerous remedies must trigger clear refusal and warning banners.
5. **Archive Version Drift:** When new archive cards or shelves are added, re-indexing should update the vector knowledge base in a few seconds.

---

### Task 1: Data Types and Archive Knowledge Chunker & Indexer

**Files:**
- Create: `src/lib/kovcheg/models/types.ts`
- Create: `src/lib/kovcheg/models/knowledge-indexer.ts`
- Test: `src/lib/kovcheg/models/knowledge-indexer.test.ts`

- [ ] Write tests in `src/lib/kovcheg/models/knowledge-indexer.test.ts` for chunking articles and semantic vector scoring.
- [ ] Implement `types.ts` with model metadata, download state, indexing state, and retrieval chunk structures.
- [ ] Implement `knowledge-indexer.ts` to convert corpus articles into semantic chunks (lead, steps, warnings) and calculate relevance scores for queries.
- [ ] Run `node --experimental-strip-types --test src/lib/kovcheg/models/knowledge-indexer.test.ts` and verify all tests pass.

---

### Task 2: Model Catalog & WebLLM Engine with Safety Prompting

**Files:**
- Create: `src/lib/kovcheg/models/catalog.ts`
- Create: `src/lib/kovcheg/models/llm-engine.ts`
- Test: `src/lib/kovcheg/models/llm-engine.test.ts`

- [ ] Write tests in `src/lib/kovcheg/models/llm-engine.test.ts` for prompt formatting, safety constraint injection, and fallback execution.
- [ ] Implement `catalog.ts` listing recommended lightweight models (Qwen2.5-0.5B, SmolLM2-360M, Qwen2.5-1.5B) with size, description, and MLC model IDs.
- [ ] Implement `llm-engine.ts` wrapping WebLLM dynamic import, progress callback reporting, cache checking, prompt assembly with retrieved chunks, and graceful fallback.
- [ ] Run `node --experimental-strip-types --test src/lib/kovcheg/models/llm-engine.test.ts` and verify all tests pass.

---

### Task 3: Zustand Store Updates for Models and Training State

**Files:**
- Modify: `src/lib/kovcheg/store.ts`
- Test: `src/lib/kovcheg/models/store-model.test.ts`

- [ ] Add model management state to `useArk`: `selectedModelId`, `downloadedModels`, `indexedChunksCount`, `lastIndexedAt`, `modelMode` ("archive" | "llm").
- [ ] Add action reducers: `setSelectedModel`, `markModelDownloaded`, `removeDownloadedModel`, `setArchiveIndexed`, `setModelMode`.
- [ ] Write unit tests verifying persistence and state transitions.
- [ ] Run tests and ensure existing Zustand state remains backward-compatible.

---

### Task 4: UI Integration in Assistant Screen

**Files:**
- Modify: `src/routes/assistant.tsx`
- Create: `src/components/kovcheg/model-manager.tsx`

- [ ] Create `model-manager.tsx` component with:
  - Model list with badges (size, recommendation, offline status).
  - Download button with live progress bar and status text.
  - "Обучить архив" (Индексировать базу знаний) button with chunk count and timestamp.
  - Delete/Free space button for downloaded weights.
- [ ] Update `src/routes/assistant.tsx`:
  - Allow toggling between "Быстрый поиск" and "Локальная нейросеть + Архив".
  - If local model is ready, feed query through RAG pipeline, stream generated answer, and display cited source cards.
  - Show clear indicators when model is downloading, ready, or operating in fallback mode.
- [ ] Run `npm run typecheck` and verify clean build with no typing issues.

---

### Task 5: End-to-End Verification and Polish

**Files:**
- Test all components: `npm test` and `npm run typecheck`
- Verify build: `npm run build`

- [ ] Verify unit tests for indexer, engine, and store pass.
- [ ] Verify `npm run typecheck` passes without errors.
- [ ] Verify `npm run build` succeeds (confirming no SSR breakage with browser WebGPU/Window APIs).
