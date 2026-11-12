import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useRef } from "react";
import { Send, Square, Trash2, Sparkles, Cpu } from "lucide-react";
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

  // User input and submitted query
  const [inputText, setInputText] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
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

  // Fast archive answer for "archive-only" mode based on submitted query
  const archiveAnswer = useMemo(
    () => answerFromArchive(submittedQuery, articles, boost, index),
    [submittedQuery, articles, boost, index],
  );

  // Send message handler (triggered by clicking "Send" or pressing Enter)
  async function handleSendMessage(queryOverride?: string) {
    const textToSend = (queryOverride !== undefined ? queryOverride : inputText).trim();
    if (!textToSend) return;

    // Abort previous generation if active
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setSubmittedQuery(textToSend);
    setSaved(false);

    if (modelMode === "llm") {
      setIsGenerating(true);
      setLlmAnswerText("");
      setCitedChunks([]);
      setGenerationTimeMs(null);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const knowledgeIndex = buildKnowledgeIndex(articles);
        const hits = searchKnowledgeIndex(knowledgeIndex, textToSend, 4);
        const retrievedChunks = hits.map((h) => h.chunk);
        setCitedChunks(retrievedChunks);

        const result = await generateRAGAnswer(
          textToSend,
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
      } catch (err: any) {
        if (!abortController.signal.aborted) {
          console.error("RAG Generation error:", err);
          setLlmAnswerText(
            lang === "ar"
              ? "حدث خطأ أثناء معالجة السؤال. يرجى المحاولة مرة أخرى."
              : lang === "en"
              ? "Error during generation. Please try again."
              : "Произошла ошибка при ответе. Попробуйте отправить запрос еще раз."
          );
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsGenerating(false);
        }
      }
    }
  }

  // Stop current generation
  function handleStopGeneration() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  }

  function handleClearInput() {
    setInputText("");
  }

  function saveCard() {
    if (!submittedQuery.trim()) return;
    const body =
      modelMode === "llm" && llmAnswerText
        ? llmAnswerText
        : archiveAnswer.steps.map((s) => `${s.text} — ${s.title}`).join("\n");

    if (!body) return;

    addNote({
      id: crypto.randomUUID(),
      title: submittedQuery.trim().slice(0, 80),
      body,
      created: Date.now(),
      pack: "user-cards",
    });
    setSaved(true);
  }

  return (
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem" }}>
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
            marginBottom: "0.8rem",
          }}
        >
          <span>
            {lang === "ar"
              ? `النموذج «${selectedModel?.name}» غير محمل في الذاكرة. يمكنك تنزيل веса в фоне.`
              : lang === "en"
              ? `Model "${selectedModel?.name}" is not downloaded yet. You can download it in the background.`
              : `Модель «${selectedModel?.name}» не загружена в память. Вы можете запустить её скачивание в фоне.`}
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

      {/* Interactive Message Input Box with SEND button */}
      <form
        className="assistant-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!isGenerating) {
            handleSendMessage();
          }
        }}
      >
        <label className="quiet" htmlFor="ask-input">
          {t("questionLabel", lang)}
        </label>

        <div className="ask-box-wrapper">
          <textarea
            id="ask-input"
            className="ask-box-textarea"
            rows={3}
            value={inputText}
            placeholder={t("askPlaceholder", lang)}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!isGenerating && inputText.trim()) {
                  handleSendMessage();
                }
              }
            }}
          />

          <div className="ask-box-bottom">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {inputText && (
                <button
                  type="button"
                  className="text-btn"
                  onClick={handleClearInput}
                  title={t("clearInput", lang)}
                  style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem", minHeight: "2rem" }}
                >
                  <Trash2 size={13} style={{ marginRight: "0.25rem" }} />
                  {t("clearInput", lang)}
                </button>
              )}
              <span className="meta" style={{ fontSize: "0.76rem" }}>
                {t("enterToSendHint", lang)}
              </span>
            </div>

            {isGenerating ? (
              <button
                type="button"
                className="stop-btn-primary"
                onClick={handleStopGeneration}
                title={t("stopGenerating", lang)}
              >
                <Square size={16} fill="currentColor" />
                <span>{t("stopGenerating", lang)}</span>
              </button>
            ) : (
              <button
                type="submit"
                className="send-btn-primary"
                disabled={!inputText.trim()}
                title={t("sendMessage", lang)}
              >
                <Send size={16} />
                <span>{t("sendMessage", lang)}</span>
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Suggested Quick Questions */}
      {!submittedQuery && (
        <div style={{ marginBottom: "1.2rem" }}>
          <span className="quiet" style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.82rem" }}>
            {lang === "ar" ? "أمثلة سريعة للأسئلة:" : lang === "en" ? "Suggested questions:" : "Примеры быстрых вопросов:"}
          </span>
          <div className="tools">
            {(EXAMPLES_MAP[lang] ?? EXAMPLES_MAP.ru).map((ex) => (
              <button
                key={ex}
                type="button"
                className="chip"
                onClick={() => {
                  setInputText(ex);
                  handleSendMessage(ex);
                }}
              >
                <Sparkles size={12} style={{ marginRight: "0.3rem", opacity: 0.8 }} />
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Render Answer: LLM Mode */}
      {submittedQuery.trim() && modelMode === "llm" && (
        <section style={{ marginTop: "1rem" }}>
          <div
            style={{
              padding: "0.5rem 0.75rem",
              background: "var(--color-bg)",
              border: "1px solid var(--color-line)",
              borderRadius: "var(--radius-card)",
              marginBottom: "0.8rem",
            }}
          >
            <span className="quiet" style={{ fontSize: "0.78rem" }}>
              {lang === "ar" ? "السؤال المطروح:" : lang === "en" ? "Query:" : "Запрос:"}
            </span>
            <p style={{ margin: "0.15rem 0 0", fontWeight: 600 }}>{submittedQuery}</p>
          </div>

          {isGenerating && !llmAnswerText && (
            <p className="lead" style={{ opacity: 0.85, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Cpu size={18} className="spin" style={{ color: "var(--color-lamp)" }} />
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
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.3rem" }}>
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
      {submittedQuery.trim() && modelMode === "archive" && (
        <section style={{ marginTop: "1rem" }}>
          <div
            style={{
              padding: "0.5rem 0.75rem",
              background: "var(--color-bg)",
              border: "1px solid var(--color-line)",
              borderRadius: "var(--radius-card)",
              marginBottom: "0.8rem",
            }}
          >
            <span className="quiet" style={{ fontSize: "0.78rem" }}>
              {lang === "ar" ? "السؤال المطروح:" : lang === "en" ? "Query:" : "Запрос:"}
            </span>
            <p style={{ margin: "0.15rem 0 0", fontWeight: 600 }}>{submittedQuery}</p>
          </div>

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
                  ? (lang === "ar" ? "تم الحفظ в البطاقات" : lang === "en" ? "Saved to cards" : "Сохранено в свои карточки")
                  : (lang === "ar" ? "حفظ كبطاقة" : lang === "en" ? "Save as card" : "Сохранить как карточку")}
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
