import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { answerFromArchive } from "@/lib/kovcheg/answer";
import { useCorpus } from "@/lib/kovcheg/library";
import { useArk } from "@/lib/kovcheg/store";
import { ModelManager } from "@/components/kovcheg/model-manager";
import { getModelInfo } from "@/lib/kovcheg/models/catalog";
import {
  buildKnowledgeIndex,
  searchKnowledgeIndex,
} from "@/lib/kovcheg/models/knowledge-indexer";
import { generateRAGAnswer } from "@/lib/kovcheg/models/llm-engine";
import type { KnowledgeChunk } from "@/lib/kovcheg/models/types";

import { t } from "@/lib/kovcheg/i18n";

export const Route = createFileRoute("/assistant")({ component: AssistantPage });

const EXAMPLES_MAP = {
  ru: ["Где сидеть после взрыва", "Жгут при ранении", "Фильтр для воды", "Выпечка хлеба на углях"],
  en: ["Where to shelter after nuclear flash", "Severe bleeding tourniquet", "DIY water filter", "Campfire bannock bread"],
  ar: ["أين تختبئ بعد الانفجار النووي", "إيقاف النزيف الحاد", "تنقية المياه الميدانية", "صنع الخبز على الجمر"],
};

function AssistantPage() {
  const lang = useArk((s) => s.lang) ?? "ru";
  const { articles, index } = useCorpus();
  const boost = useArk((s) => s.helped);
  const modelMode = useArk((s) => s.modelMode);
  const setModelMode = useArk((s) => s.setModelMode);
  const selectedModelId = useArk((s) => s.selectedModelId);
  const downloadedModels = useArk((s) => s.downloadedModels);
  const customModels = useArk((s) => s.customModels);
  const archiveIndexedChunks = useArk((s) => s.archiveIndexedChunks);
  const addNote = useArk((s) => s.addNote);

  const [q, setQ] = useState("");
  const [saved, setSaved] = useState(false);
  const [showModelManager, setShowModelManager] = useState(false);

  // Local LLM generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [llmAnswerText, setLlmAnswerText] = useState("");
  const [citedChunks, setCitedChunks] = useState<KnowledgeChunk[]>([]);
  const [generationTimeMs, setGenerationTimeMs] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const selectedModel = useMemo(() => getModelInfo(selectedModelId, customModels), [selectedModelId, customModels]);
  const isModelReady = downloadedModels.includes(selectedModelId);

  // Fast archive answer for "archive-only" mode
  const archiveAnswer = useMemo(
    () => answerFromArchive(q, articles, boost, index),
    [q, articles, boost, index],
  );

  // Trigger LLM generation when in LLM mode and query changes
  useEffect(() => {
    if (modelMode !== "llm" || !q.trim()) {
      setLlmAnswerText("");
      setCitedChunks([]);
      setGenerationTimeMs(null);
      return;
    }

    // Abort previous generation if user is typing
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const timer = setTimeout(async () => {
      setIsGenerating(true);
      setLlmAnswerText("");

      try {
        const knowledgeIndex = buildKnowledgeIndex(articles);
        const hits = searchKnowledgeIndex(knowledgeIndex, q, 4);
        const retrievedChunks = hits.map((h) => h.chunk);
        setCitedChunks(retrievedChunks);

        const result = await generateRAGAnswer(
          q,
          retrievedChunks,
          selectedModelId,
          {
            signal: abortController.signal,
            onToken: (_delta, fullText) => {
              setLlmAnswerText(fullText);
            },
          },
          customModels
        );

        if (!abortController.signal.aborted) {
          setLlmAnswerText(result.text);
          setGenerationTimeMs(result.inferenceTimeMs);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error("RAG Generation error:", err);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsGenerating(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [q, modelMode, selectedModelId, articles, customModels]);

  function saveCard() {
    if (!q.trim()) return;
    const body =
      modelMode === "llm" && llmAnswerText
        ? llmAnswerText
        : archiveAnswer.steps.map((s) => `${s.text} — ${s.title}`).join("\n");

    if (!body) return;

    addNote({
      id: crypto.randomUUID(),
      title: q.trim().slice(0, 80),
      body,
      created: Date.now(),
      pack: "user-cards",
    });
    setSaved(true);
  }

  return (
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap" }}>
        <h1 className="screen-title" style={{ margin: 0 }}>{t("assistantTitle", lang)}</h1>
        <button
          type="button"
          className="text-btn"
          onClick={() => setShowModelManager((v) => !v)}
          style={{ fontSize: "0.85rem", minHeight: "2.2rem", padding: "0.2rem 0.6rem" }}
        >
          {showModelManager ? t("hideModels", lang) : t("manageModels", lang)}
        </button>
      </div>

      <p className="calm-note" style={{ marginTop: "0.6rem" }}>
        {modelMode === "llm"
          ? isModelReady
            ? lang === "ar"
              ? `النموذج المحلي «${selectedModel?.name}» نشط. الرد مستخرج بصرامة من بطاقات الأرشيف دون إنترنت.`
              : lang === "en"
              ? `Local model "${selectedModel?.name}" is active. Responses are grounded strictly in archive cards offline.`
              : `Активна локальная нейросеть «${selectedModel?.name}». Ответ формулируется строго по карточкам архива без интернета.`
            : lang === "ar"
            ? `تم تحديد وضع النموذج، لكن النموذج «${selectedModel?.name}» لم يتم تنزيله بعد.`
            : lang === "en"
            ? `LLM mode selected, but model "${selectedModel?.name}" is not downloaded yet.`
            : `Выбран режим нейросети, но модель «${selectedModel?.name}» ещё не скачана в память устройства.`
          : lang === "ar"
          ? "وضع البطاقات: استرجاع مقتطفات الأرشيف مباشرة دون استهلاك ذاكرة النموذج."
          : lang === "en"
          ? "Card mode: direct retrieval from archive cards without LLM memory overhead."
          : "Режим карточек: поиск выдержек напрямую из архива без нейросетевых затрат памяти."}
      </p>

      {/* Mode Toggle */}
      <div className="toggle tools" style={{ marginBottom: "0.8rem" }}>
        <button
          type="button"
          className="text-btn"
          data-on={modelMode === "archive" ? "1" : "0"}
          onClick={() => setModelMode("archive")}
        >
          {t("modeArchiveCards", lang)}
        </button>
        <button
          type="button"
          className="text-btn"
          data-on={modelMode === "llm" ? "1" : "0"}
          onClick={() => setModelMode("llm")}
        >
          {t("modeLlmArchive", lang)}
        </button>
      </div>

      {/* Model Manager Drawer */}
      {showModelManager && <ModelManager />}

      {modelMode === "llm" && !isModelReady && !showModelManager && (
        <div
          className="warn"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <span>
            {lang === "ar"
              ? `النموذج «${selectedModel?.name}» غير محمل في الذاكرة. سيتم الرد بناءً على القواعد المباشرة للأرشيف.`
              : lang === "en"
              ? `Model "${selectedModel?.name}" is not downloaded. The response will be grounded on direct archive rules.`
              : `Модель «${selectedModel?.name}» не загружена в память. Ответ будет сгенерирован встроенным правилом или вы можете скачать веса.`}
          </span>
          <button
            type="button"
            className="chip"
            onClick={() => setShowModelManager(true)}
            style={{ minHeight: "2rem", padding: "0.1rem 0.6rem", fontSize: "0.85rem" }}
          >
            {t("downloadModel", lang)}
          </button>
        </div>
      )}

      {modelMode === "llm" && isModelReady && archiveIndexedChunks === 0 && (
        <p className="meta" style={{ color: "var(--color-lamp)", marginBottom: "0.8rem" }}>
          {lang === "ar"
            ? "قاعدة المعرفة لم تُفهرس بعد. افتح 'إدارة النماذج' واضغط 'تدريب الأرشيف' لتسريع الاستجابة."
            : lang === "en"
            ? "Knowledge base is not indexed yet. Open 'Manage models' and click 'Train archive' for accelerated inference."
            : "База знаний ещё не индексирована. Откройте «Управление моделями» и нажмите «Обучить архив» для ускорения ответов."}
        </p>
      )}

      <label className="quiet" htmlFor="ask">
        {t("questionLabel", lang)}
      </label>
      <textarea
        id="ask"
        className="ask-field"
        rows={3}
        value={q}
        placeholder={t("askPlaceholder", lang)}
        onChange={(e) => {
          setQ(e.target.value);
          setSaved(false);
        }}
      />

      {!q.trim() && (
        <div className="tools">
          {(EXAMPLES_MAP[lang] ?? EXAMPLES_MAP.ru).map((ex) => (
            <button key={ex} type="button" className="chip" onClick={() => setQ(ex)}>
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* Render Answer: LLM Mode */}
      {q.trim() && modelMode === "llm" && (
        <section style={{ marginTop: "1rem" }}>
          {isGenerating && !llmAnswerText && (
            <p className="lead" style={{ opacity: 0.7 }}>
              {lang === "ar"
                ? "الذكاء الاصطناعي يبحث في الأرشيف ويصيغ الرد..."
                : lang === "en"
                ? "AI is studying the archive and generating the response..."
                : "Нейросеть изучает архив и формулирует ответ..."}
            </p>
          )}

          {llmAnswerText && (
            <div
              className="card-block"
              style={{
                borderLeft: "4px solid var(--color-lamp)",
                whiteSpace: "pre-line",
                lineHeight: "1.6",
                fontSize: "1.05rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span className="meta" style={{ fontSize: "0.8rem", color: "var(--color-lamp)" }}>
                  ● {lang === "ar" ? `رد النموذج المحلي ${selectedModel?.name}` : lang === "en" ? `Response from local ${selectedModel?.name}` : `Ответ локальной модели ${selectedModel?.name}`} {generationTimeMs ? `(${generationTimeMs} ${lang === "ru" ? "мс" : "ms"})` : ""}
                </span>
                <span className="meta" style={{ fontSize: "0.8rem" }}>
                  {lang === "ar" ? "100% بدون إنترنت · مستند بدقة إلى الأرشيف" : lang === "en" ? "100% offline · Strictly grounded in archive" : "100% офлайн · Строго по архиву"}
                </span>
              </div>
              <p>{llmAnswerText}</p>
            </div>
          )}

          {/* Cited sources */}
          {citedChunks.length > 0 && (
            <>
              <h2 className="section-title" style={{ marginTop: "1.2rem", fontSize: "1.1rem" }}>
                {lang === "ar" ? "بطاقات الأرشيف المستشهد بها" : lang === "en" ? "Cited archive cards" : "Использованные карточки архива"}
              </h2>
              <div className="source-list">
                {citedChunks.map((chunk) => (
                  <Link
                    key={chunk.id}
                    to="/read/$id"
                    params={{ id: chunk.articleId }}
                    hash={chunk.sectionId}
                  >
                    {chunk.articleTitle}
                    <span className="meta"> · {chunk.shelf} ({chunk.sectionTitle})</span>
                  </Link>
                ))}
              </div>
            </>
          )}

          {llmAnswerText && (
            <div className="tools" style={{ marginTop: "1rem" }}>
              <button type="button" className="text-btn" onClick={saveCard}>
                {saved
                  ? (lang === "ar" ? "تم الحفظ في البطاقات" : lang === "en" ? "Saved to cards" : "Сохранено в свои карточки")
                  : (lang === "ar" ? "حفظ كبطاقة" : lang === "en" ? "Save as card" : "Сохранить как карточку")}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Render Answer: Archive-Only Mode */}
      {q.trim() && modelMode === "archive" && (
        <section style={{ marginTop: "1rem" }}>
          <p className={archiveAnswer.refusal || archiveAnswer.iodine ? "warn" : "lead"}>
            {archiveAnswer.intro}
          </p>
          {archiveAnswer.steps.map((s, i) => (
            <div key={`${s.anchor}-${i}`} className="step-cite">
              <p>{s.text}</p>
              <Link to="/read/$id" params={{ id: s.articleId }} hash={s.anchor}>
                {s.title}
              </Link>
              <span className="meta"> · {s.shelf}</span>
            </div>
          ))}
          {archiveAnswer.sources.length > 0 && (
            <>
              <h2 className="section-title">
                {lang === "ar" ? "المصادر" : lang === "en" ? "Sources" : "Источники"}
              </h2>
              <div className="source-list">
                {archiveAnswer.sources.map((s) => (
                  <Link key={s.id} to="/read/$id" params={{ id: s.id }} hash={s.anchor}>
                    {s.title}
                    <span className="meta"> · {s.shelf}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
          {archiveAnswer.steps.length > 0 && !archiveAnswer.refusal && (
            <div className="tools">
              <button type="button" className="text-btn" onClick={saveCard}>
                {saved
                  ? (lang === "ar" ? "تم الحفظ في البطاقات" : lang === "en" ? "Saved to cards" : "Сохранено в свои карточки")
                  : (lang === "ar" ? "حفظ كبطاقة" : lang === "en" ? "Save as card" : "Сохранить как карточку")}
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
