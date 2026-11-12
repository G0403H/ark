import { useState, useEffect, useMemo } from "react";
import { getAllModels } from "@/lib/kovcheg/models/catalog";
import type {
  LocalModelId,
  ModelDownloadProgress,
  CustomModelConfig,
  DeviceHardwareProfile,
  QuantizationType,
  CustomModelSourceType,
} from "@/lib/kovcheg/models/types";
import {
  isWebGPUSupported,
  loadWebLLMModel,
} from "@/lib/kovcheg/models/llm-engine";
import {
  profileDeviceHardware,
  evaluateModelCompatibility,
  estimateModelVRAM,
} from "@/lib/kovcheg/models/hardware-profiler";
import { buildKnowledgeIndex } from "@/lib/kovcheg/models/knowledge-indexer";
import { useCorpus } from "@/lib/kovcheg/library";
import { useArk } from "@/lib/kovcheg/store";
import { t } from "@/lib/kovcheg/i18n";

export function ModelManager() {
  const lang = useArk((s) => s.lang) ?? "ru";
  const { articles } = useCorpus();
  const selectedModelId = useArk((s) => s.selectedModelId);
  const setSelectedModelId = useArk((s) => s.setSelectedModelId);
  const downloadedModels = useArk((s) => s.downloadedModels);
  const customModels = useArk((s) => s.customModels);
  const addDownloadedModel = useArk((s) => s.addDownloadedModel);
  const removeDownloadedModel = useArk((s) => s.removeDownloadedModel);
  const addCustomModel = useArk((s) => s.addCustomModel);
  const removeCustomModel = useArk((s) => s.removeCustomModel);
  const archiveIndexedChunks = useArk((s) => s.archiveIndexedChunks);
  const archiveIndexedAt = useArk((s) => s.archiveIndexedAt);
  const setArchiveIndexed = useArk((s) => s.setArchiveIndexed);

  const [hardwareProfile, setHardwareProfile] = useState<DeviceHardwareProfile | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<
    Record<string, ModelDownloadProgress>
  >({});
  const [indexing, setIndexing] = useState(false);
  const [indexSuccess, setIndexSuccess] = useState(false);

  // Custom model form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customFamily, setCustomFamily] = useState("Qwen");
  const [customSourceType, setCustomSourceType] = useState<CustomModelSourceType>("local-endpoint");
  const [customEndpointUrl, setCustomEndpointUrl] = useState("http://127.0.0.1:11434/v1");
  const [customMlcModelId, setCustomMlcModelId] = useState("");
  const [customLocalFileName, setCustomLocalFileName] = useState("");
  const [customParamsB, setCustomParamsB] = useState<number>(0.5);
  const [customQuant, setCustomQuant] = useState<QuantizationType>("q4");
  const [customDescription, setCustomDescription] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    profileDeviceHardware().then((prof) => setHardwareProfile(prof));
  }, []);

  const allModels = useMemo(() => getAllModels(customModels), [customModels]);

  // Live threshold estimation for the custom model being drafted in form
  const customLiveCompatibility = useMemo(() => {
    if (!hardwareProfile) return null;
    return evaluateModelCompatibility(
      {
        parametersB: customParamsB,
        quantization: customQuant,
        customConfig: {
          id: "draft",
          name: customName || "Своя модель",
          family: customFamily,
          parametersB: customParamsB,
          quantization: customQuant,
          sourceType: customSourceType,
          endpointUrl: customEndpointUrl,
          mlcModelId: customMlcModelId,
          localFileName: customLocalFileName,
          sizeLabel: "",
          vramLabel: "",
          description: customDescription,
          createdAt: 0,
        },
      },
      hardwareProfile
    );
  }, [
    hardwareProfile,
    customParamsB,
    customQuant,
    customSourceType,
    customEndpointUrl,
    customMlcModelId,
    customLocalFileName,
    customName,
    customFamily,
    customDescription,
  ]);

  async function handleIndexArchive() {
    if (articles.length === 0) return;
    setIndexing(true);
    setIndexSuccess(false);

    try {
      await new Promise((r) => setTimeout(r, 100));
      const index = buildKnowledgeIndex(articles);
      setArchiveIndexed(index.chunks.length);
      setIndexSuccess(true);
      setTimeout(() => setIndexSuccess(false), 4000);
    } finally {
      setIndexing(false);
    }
  }

  async function handleDownloadModel(modelId: LocalModelId) {
    setDownloadProgress((prev) => ({
      ...prev,
      [modelId]: { status: "downloading", progress: 0, text: "Подготовка..." },
    }));

    const ok = await loadWebLLMModel(
      modelId,
      (progress) => {
        setDownloadProgress((prev) => ({
          ...prev,
          [modelId]: progress,
        }));
      },
      customModels
    );

    if (ok) {
      addDownloadedModel(modelId);
      setSelectedModelId(modelId);
    }
  }

  function handleDeleteModel(modelId: LocalModelId) {
    removeDownloadedModel(modelId);
    setDownloadProgress((prev) => {
      const copy = { ...prev };
      delete copy[modelId];
      return copy;
    });
  }

  function handleAddCustomModelSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!customName.trim()) {
      setFormError("Укажите понятное название для модели");
      return;
    }

    if (customSourceType === "local-endpoint" && !customEndpointUrl.trim()) {
      setFormError("Укажите адрес локального сервера (например, http://127.0.0.1:11434/v1)");
      return;
    }

    if (customSourceType === "mlc-webllm" && !customMlcModelId.trim()) {
      setFormError("Укажите репозиторий MLC или HuggingFace ID модели");
      return;
    }

    const { sizeLabel, vramLabel } = estimateModelVRAM(customParamsB, customQuant);
    const newId = `custom-${Date.now()}`;

    const newConfig: CustomModelConfig = {
      id: newId,
      name: customName.trim(),
      family: customFamily,
      parametersB: customParamsB,
      quantization: customQuant,
      sourceType: customSourceType,
      endpointUrl: customEndpointUrl.trim(),
      mlcModelId: customMlcModelId.trim(),
      localFileName: customLocalFileName.trim(),
      sizeLabel: customSourceType === "local-endpoint" ? "Внешний процесс" : sizeLabel,
      vramLabel: customSourceType === "local-endpoint" ? "ОЗУ сервера" : vramLabel,
      description:
        customDescription.trim() ||
        (customSourceType === "local-endpoint"
          ? `Локальный сервер ${customEndpointUrl.trim()} (${customParamsB}B ${customQuant.toUpperCase()})`
          : `Пользовательская локальная модель ${customFamily} (${customParamsB}B, квантование ${customQuant.toUpperCase()})`),
      createdAt: Date.now(),
    };

    addCustomModel(newConfig);
    setSelectedModelId(newId);
    setShowAddForm(false);
    setCustomName("");
    setCustomDescription("");
    setCustomMlcModelId("");
    setCustomLocalFileName("");
  }

  return (
    <section className="card-block" style={{ marginTop: "1rem", marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", margin: "0 0 0.4rem" }}>
          Локальные модели и порог устройства (RAG)
        </h2>
        <button
          type="button"
          className="text-btn"
          onClick={() => setShowAddForm((v) => !v)}
          style={{ fontSize: "0.85rem", padding: "0.25rem 0.75rem", minHeight: "2.2rem" }}
        >
          {showAddForm ? "✕ Отменить" : "➕ Добавить свою модель"}
        </button>
      </div>

      <p className="meta" style={{ marginBottom: "0.8rem" }}>
        Автономный ИИ-советник работает прямо на устройстве. Система автоматически оценивает
        характеристики вашего процессора, видеочипа и памяти, информируя о пороге возможностей.
      </p>

      {/* Hardware Profile & Capability Threshold Card */}
      {hardwareProfile && (
        <div
          style={{
            border: "1px solid var(--color-line)",
            background: "rgba(0, 0, 0, 0.25)",
            borderRadius: "var(--radius-card)",
            padding: "0.85rem",
            marginBottom: "1rem",
            fontSize: "0.88rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.4rem" }}>
            <div>
              <strong style={{ fontSize: "0.95rem", color: "var(--color-lamp)" }}>
                🛡️ Профиль устройства и порог возможностей ИИ
              </strong>
            </div>
            <span
              style={{
                fontSize: "0.75rem",
                padding: "0.15rem 0.5rem",
                borderRadius: "4px",
                background: hardwareProfile.hasWebGPU ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                color: hardwareProfile.hasWebGPU ? "#10b981" : "#ef4444",
                fontWeight: 700,
              }}
            >
              {hardwareProfile.hasWebGPU ? "WebGPU АКТИВЕН" : "БЕЗ WEBGPU"}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "0.5rem",
              marginTop: "0.6rem",
              padding: "0.6rem 0",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div>
              <span className="meta" style={{ fontSize: "0.75rem", display: "block" }}>Тип устройства</span>
              <strong>{hardwareProfile.isMobile ? "📱 Смартфон / Планшет" : "💻 Компьютер / Ноутбук"}</strong>
            </div>
            <div>
              <span className="meta" style={{ fontSize: "0.75rem", display: "block" }}>Видеочип / Ускоритель</span>
              <strong style={{ fontSize: "0.82rem" }}>{hardwareProfile.adapterName}</strong>
            </div>
            <div>
              <span className="meta" style={{ fontSize: "0.75rem", display: "block" }}>ОЗУ устройства</span>
              <strong>~{hardwareProfile.deviceMemoryGb} ГБ</strong>
            </div>
            <div>
              <span className="meta" style={{ fontSize: "0.75rem", display: "block" }}>Свободное хранилище</span>
              <strong>~{(hardwareProfile.storageEstimateMb / 1024).toFixed(1)} ГБ</strong>
            </div>
          </div>

          <div style={{ marginTop: "0.6rem" }}>
            <span style={{ fontWeight: 600, color: "var(--color-calm)" }}>
              Безопасный порог модели для данного устройства:
            </span>{" "}
            {hardwareProfile.hasWebGPU ? (
              <span>
                модели до <strong>{hardwareProfile.maxSafeParamsB}B</strong> параметров (лимит памяти VRAM:{" "}
                <strong>~{hardwareProfile.safeVramBudgetMb} МБ</strong>). {hardwareProfile.tierDescription}.
              </span>
            ) : (
              <span>
                WebGPU не поддерживается браузером. Доступны легкие модели через локальный сервер (Ollama/Termux) либо быстрый синтез правил архива.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Add Custom Model Form */}
      {showAddForm && (
        <div
          style={{
            border: "2px solid var(--color-lamp)",
            borderRadius: "var(--radius-card)",
            padding: "1rem",
            marginBottom: "1.2rem",
            background: "rgba(224, 160, 69, 0.04)",
          }}
        >
          <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem" }}>
            Добавление своей локальной модели
          </h3>
          <p className="meta" style={{ fontSize: "0.85rem", marginBottom: "0.8rem" }}>
            Поддерживаются локальные серверы (Ollama, Termux с llama.cpp, LocalAI на телефоне/ноутбуке),
            а также WebLLM / MLC репозитории с HuggingFace.
          </p>

          <form onSubmit={handleAddCustomModelSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem", fontWeight: 600 }}>
                  Название модели *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например: Gemma-2 2B Local или Моя Llama"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  style={{ width: "100%", padding: "0.45rem 0.6rem", fontSize: "0.9rem" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem", fontWeight: 600 }}>
                  Семейство архитектуры
                </label>
                <select
                  value={customFamily}
                  onChange={(e) => setCustomFamily(e.target.value)}
                  style={{ width: "100%", padding: "0.45rem 0.6rem", fontSize: "0.9rem" }}
                >
                  <option value="Qwen">Qwen (2.5 / 3)</option>
                  <option value="Llama">Llama (3.2 / 3.1)</option>
                  <option value="Gemma">Gemma (2 / 3)</option>
                  <option value="Mistral">Mistral</option>
                  <option value="Phi">Phi (3.5 / 4)</option>
                  <option value="SmolLM">SmolLM</option>
                  <option value="MNN-Pocket">MNN-Pocket</option>
                  <option value="DeepSeek">DeepSeek</option>
                  <option value="Другая">Другая архитектура</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem", fontWeight: 600 }}>
                  Размер параметров
                </label>
                <select
                  value={customParamsB}
                  onChange={(e) => setCustomParamsB(parseFloat(e.target.value))}
                  style={{ width: "100%", padding: "0.45rem 0.6rem", fontSize: "0.9rem" }}
                >
                  <option value="0.3">0.3B (300M - ультралегкая, для любых телефонов)</option>
                  <option value="0.5">0.5B (500M - оптимально для смартфонов)</option>
                  <option value="1.0">1.0B (1B - легкая)</option>
                  <option value="1.5">1.5B (1.5B - хороший баланс)</option>
                  <option value="2.0">2.0B (2B - для телефонов с 6-8 ГБ ОЗУ)</option>
                  <option value="3.0">3.0B (3B - высокая нагрузка на мобильные)</option>
                  <option value="7.0">7.0B (7B - только мощный ПК или сервер)</option>
                  <option value="8.0">8.0B (8B - только мощный ПК или сервер)</option>
                  <option value="14.0">14.0B (14B - флагманский сервер)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem", fontWeight: 600 }}>
                  Квантование весов
                </label>
                <select
                  value={customQuant}
                  onChange={(e) => setCustomQuant(e.target.value as QuantizationType)}
                  style={{ width: "100%", padding: "0.45rem 0.6rem", fontSize: "0.9rem" }}
                >
                  <option value="q4">Q4 (4-бит, минимальный расход памяти)</option>
                  <option value="int4">INT4 (4-бит аппаратный)</option>
                  <option value="q5">Q5 (5-бит средний баланс)</option>
                  <option value="q8">Q8 (8-бит высокая точность)</option>
                  <option value="f16">FP16 (16-бит оригинальные веса без сжатия)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem", fontWeight: 600 }}>
                Способ подключения модели
              </label>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                <button
                  type="button"
                  className="chip"
                  data-on={customSourceType === "local-endpoint" ? "1" : "0"}
                  onClick={() => setCustomSourceType("local-endpoint")}
                >
                  Локальный сервер (Ollama / Termux / llama.cpp)
                </button>
                <button
                  type="button"
                  className="chip"
                  data-on={customSourceType === "mlc-webllm" ? "1" : "0"}
                  onClick={() => setCustomSourceType("mlc-webllm")}
                >
                  WebLLM / MLC Репозиторий
                </button>
                <button
                  type="button"
                  className="chip"
                  data-on={customSourceType === "local-file" ? "1" : "0"}
                  onClick={() => setCustomSourceType("local-file")}
                >
                  Локальный файл весов (GGUF / bin)
                </button>
              </div>

              {customSourceType === "local-endpoint" && (
                <div>
                  <span className="meta" style={{ fontSize: "0.78rem", display: "block", marginBottom: "0.2rem" }}>
                    URL OpenAI-совместимого эндпоинта (Termux / Ollama / llama-server на устройстве):
                  </span>
                  <input
                    type="url"
                    placeholder="http://127.0.0.1:11434/v1"
                    value={customEndpointUrl}
                    onChange={(e) => setCustomEndpointUrl(e.target.value)}
                    style={{ width: "100%", padding: "0.45rem 0.6rem", fontSize: "0.9rem" }}
                  />
                </div>
              )}

              {customSourceType === "mlc-webllm" && (
                <div>
                  <span className="meta" style={{ fontSize: "0.78rem", display: "block", marginBottom: "0.2rem" }}>
                    Идентификатор модели MLC или репозиторий HuggingFace:
                  </span>
                  <input
                    type="text"
                    placeholder="Например: mlc-ai/gemma-2-2b-it-q4f16_1-MLC"
                    value={customMlcModelId}
                    onChange={(e) => setCustomMlcModelId(e.target.value)}
                    style={{ width: "100%", padding: "0.45rem 0.6rem", fontSize: "0.9rem" }}
                  />
                </div>
              )}

              {customSourceType === "local-file" && (
                <div>
                  <span className="meta" style={{ fontSize: "0.78rem", display: "block", marginBottom: "0.2rem" }}>
                    Имя скачанного файла весов на устройстве:
                  </span>
                  <input
                    type="text"
                    placeholder="Например: my-model-q4_k_m.gguf"
                    value={customLocalFileName}
                    onChange={(e) => setCustomLocalFileName(e.target.value)}
                    style={{ width: "100%", padding: "0.45rem 0.6rem", fontSize: "0.9rem" }}
                  />
                </div>
              )}
            </div>

            {/* Live Threshold Feedback for this custom model */}
            {customLiveCompatibility && (
              <div
                style={{
                  padding: "0.6rem 0.8rem",
                  borderRadius: "var(--radius-card)",
                  border: `1px solid ${customLiveCompatibility.badgeColor}`,
                  background: "rgba(0,0,0,0.3)",
                  fontSize: "0.85rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                  <span style={{ fontWeight: 700, color: customLiveCompatibility.badgeColor }}>
                    {customLiveCompatibility.label}
                  </span>
                  {customSourceType !== "local-endpoint" && (
                    <span className="meta" style={{ fontSize: "0.75rem" }}>
                      Потребность: ~{customLiveCompatibility.estimatedVramMb} МБ VRAM
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: "0.82rem" }}>
                  {customLiveCompatibility.detail}
                </p>
              </div>
            )}

            {formError && (
              <p style={{ color: "var(--color-lamp)", margin: "0.2rem 0", fontSize: "0.85rem" }}>
                ⚠️ {formError}
              </p>
            )}

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.4rem" }}>
              <button
                type="submit"
                className="chip"
                data-on="1"
                style={{ minHeight: "2.3rem", padding: "0.2rem 1rem", fontWeight: 700 }}
              >
                ✓ Сохранить модель в Ковчег
              </button>
              <button
                type="button"
                className="text-btn"
                onClick={() => setShowAddForm(false)}
                style={{ minHeight: "2.3rem", padding: "0.2rem 0.8rem" }}
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Knowledge Indexing ("Training" on archive) Section */}
      <div
        style={{
          border: "1px dashed var(--color-line)",
          padding: "0.8rem",
          borderRadius: "var(--radius-card)",
          marginBottom: "1.2rem",
          background: "rgba(224, 160, 69, 0.05)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <strong style={{ display: "block", fontSize: "1rem" }}>
              {t("ragTrainingTitle", lang)}
            </strong>
            <span className="meta">
              {(archiveIndexedChunks ?? 0) > 0
                ? `${archiveIndexedChunks} chunks · ${new Date(
                    archiveIndexedAt || 0
                  ).toLocaleDateString()}`
                : lang === "ar"
                ? "الأرشيف غير مفهرс بعد للنموذج المحلي"
                : lang === "en"
                ? "Archive is not vectorized for local model yet"
                : "Архив ещё не векторизован для локальной модели"}
            </span>
          </div>
          <button
            type="button"
            className="text-btn"
            disabled={indexing}
            onClick={handleIndexArchive}
            style={{ minHeight: "2.3rem", padding: "0.2rem 0.8rem", fontSize: "0.9rem" }}
          >
            {indexing ? t("ragIndexing", lang) : t("ragTrainingBtn", lang)}
          </button>
        </div>
        {indexSuccess && (
          <p style={{ margin: "0.5rem 0 0", color: "var(--color-calm)", fontSize: "0.88rem" }}>
            {t("ragSuccess", lang)}
          </p>
        )}
      </div>

      {/* Local Models Catalog */}
      <h3 style={{ fontSize: "1.1rem", marginBottom: "0.6rem" }}>
        {t("localModelsCatalog", lang)} ({allModels.length})
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {allModels.map((m) => {
          const isDownloaded = downloadedModels.includes(m.id);
          const isSelected = selectedModelId === m.id;
          const progress = downloadProgress[m.id];
          const isDownloading = progress?.status === "downloading";

          const compat = hardwareProfile
            ? evaluateModelCompatibility(m, hardwareProfile)
            : null;

          return (
            <div
              key={m.id}
              style={{
                border: isSelected
                  ? "2px solid var(--color-lamp)"
                  : "1px solid var(--color-line)",
                borderRadius: "var(--radius-card)",
                padding: "0.85rem",
                background: "var(--color-raise)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  flexWrap: "wrap",
                  gap: "0.3rem",
                }}
              >
                <div>
                  <strong style={{ fontSize: "1.05rem" }}>{m.name}</strong>
                  {m.recommended && (
                    <span
                      style={{
                        marginLeft: "0.5rem",
                        padding: "0.15rem 0.45rem",
                        background: "var(--color-lamp)",
                        color: "var(--color-ink)",
                        fontSize: "0.75rem",
                        borderRadius: "999px",
                        fontWeight: 700,
                      }}
                    >
                      Рекомендована
                    </span>
                  )}
                  {m.isCustom && (
                    <span
                      style={{
                        marginLeft: "0.5rem",
                        padding: "0.15rem 0.45rem",
                        background: "rgba(59, 130, 246, 0.2)",
                        color: "#60a5fa",
                        fontSize: "0.75rem",
                        borderRadius: "999px",
                        fontWeight: 700,
                      }}
                    >
                      Своя модель
                    </span>
                  )}
                </div>
                <span className="meta" style={{ fontSize: "0.85rem" }}>
                  {m.sizeLabel} · {m.vramLabel}
                </span>
              </div>

              {/* Hardware Threshold Indicator */}
              {compat && (
                <div
                  style={{
                    margin: "0.4rem 0 0.2rem",
                    padding: "0.35rem 0.6rem",
                    borderRadius: "4px",
                    background: "rgba(0, 0, 0, 0.2)",
                    borderLeft: `3px solid ${compat.badgeColor}`,
                    fontSize: "0.82rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, color: compat.badgeColor }}>
                      {compat.label}
                    </span>
                    {compat.estimatedVramMb > 0 && (
                      <span className="meta" style={{ fontSize: "0.75rem" }}>
                        {compat.percentOfBudget}% порога памяти
                      </span>
                    )}
                  </div>
                  <span className="meta" style={{ fontSize: "0.8rem", display: "block", marginTop: "0.15rem" }}>
                    {compat.detail}
                  </span>
                </div>
              )}

              <p className="meta" style={{ margin: "0.3rem 0 0.6rem" }}>
                {m.description}
              </p>

              {/* Download progress bar */}
              {isDownloading && (
                <div style={{ margin: "0.5rem 0" }}>
                  <div
                    style={{
                      height: "8px",
                      background: "var(--color-line)",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${progress.progress}%`,
                        height: "100%",
                        background: "var(--color-lamp)",
                        transition: "width 0.2s ease",
                      }}
                    />
                  </div>
                  <span className="meta" style={{ fontSize: "0.8rem", display: "block", marginTop: "0.2rem" }}>
                    {progress.text} ({progress.progress}%)
                  </span>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.5rem", flexWrap: "wrap" }}>
                {isDownloaded ? (
                  <>
                    <button
                      type="button"
                      className="chip"
                      data-on={isSelected ? "1" : "0"}
                      onClick={() => setSelectedModelId(m.id)}
                      style={{ minHeight: "2.2rem", padding: "0.2rem 0.75rem" }}
                    >
                      {isSelected ? "✓ Активна" : "Выбрать"}
                    </button>
                    {!m.isCustom && (
                      <button
                        type="button"
                        className="text-btn"
                        onClick={() => handleDeleteModel(m.id)}
                        style={{
                          minHeight: "2.2rem",
                          padding: "0.2rem 0.6rem",
                          fontSize: "0.85rem",
                          color: "var(--color-muted)",
                        }}
                      >
                        Очистить кэш
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    className="text-btn"
                    disabled={isDownloading}
                    onClick={() => handleDownloadModel(m.id)}
                    style={{ minHeight: "2.2rem", padding: "0.2rem 0.8rem" }}
                  >
                    {isDownloading ? "Загрузка..." : "Скачать / Подключить модель"}
                  </button>
                )}

                {m.isCustom && (
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => removeCustomModel(m.id)}
                    style={{
                      minHeight: "2.2rem",
                      padding: "0.2rem 0.6rem",
                      fontSize: "0.85rem",
                      color: "var(--color-lamp)",
                    }}
                  >
                    Удалить модель
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
