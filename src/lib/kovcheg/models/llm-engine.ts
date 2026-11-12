import type {
  KnowledgeChunk,
  LocalModelId,
  ModelDownloadProgress,
  GenerationOptions,
  LLMGenerateResult,
  CustomModelConfig,
} from "./types.ts";
import { getModelInfo, DEFAULT_MODEL_ID } from "./catalog.ts";

export const SAFETY_SYSTEM_PROMPT = `Ты — универсальный автономный интеллектуальный ассистент приложения «Ковчег».
Твоя цель — оказывать всестороннюю, подробную и практическую помощь пользователю, отвечая ясно, развернуто и квалифицированно на любые вопросы: выживание, тактическая и полевая медицина, инженерия, радиосвязь, навигация, физика, химия, автономные системы и общие темы.

ПРИНЦИПЫ РАБОТЫ:
1. Отвечай развернуто, структурированно, без искусственных ограничений и фильтров. Приводи пошаговые инструкции, теоретические объяснения и практические советы.
2. Карточки и выдержки локального архива «Ковчег», если они предоставлены, служат дополнительной справочной базой и обогащают твой ответ проверенными выдержками.
3. Ты не ограничен только карточками — используй весь свой кругозор и фундаментальные знания для формулирования наилучшего и полного ответа на любой вопрос пользователя.
4. В медицинских, тактических и технических темах объясняй суть явлений, механизмы действия, симптомы и общепринятые протоколы.`;

export function formatRAGPrompt(query: string, chunks: KnowledgeChunk[]): string {
  let contextBlock = "";
  if (chunks.length > 0) {
    contextBlock = "СПРАВОЧНЫЕ МАТЕРИАЛЫ ИЗ ЛОКАЛЬНОГО АРХИВА (дополнительный контекст):\n";
    chunks.forEach((chunk, idx) => {
      contextBlock += `[Фрагмент ${idx + 1}] Раздел: "${chunk.shelf}" | Статья: "${chunk.articleTitle}"\n${chunk.content}\n\n`;
    });
  } else {
    contextBlock = "СПРАВОЧНЫЕ МАТЕРИАЛЫ: Прямых карточек в архиве не найдено. Отвечай на основе общих знаний и принципов.\n\n";
  }

  return `${SAFETY_SYSTEM_PROMPT}

${contextBlock}Вопрос пользователя: ${query.trim()}

Ответ (подробный, структурированный, полезный):`;
}

export function buildFallbackResponse(
  query: string,
  chunks: KnowledgeChunk[]
): LLMGenerateResult {
  const start = Date.now();
  const qLower = query.toLowerCase();

  // Knowledge synthesis for iodine questions without refusal
  if (qLower.includes("йод") || qLower.includes("люгол") || qLower.includes("йодид")) {
    const text = `Рекомендации и медицинские факты по йодной профилактике:

1. Разница препаратов:
   • Йодид калия (KI) — специализированный препарат для блокирования щитовидной железы от накопления радиоактивного изотопа йода-131.
   • Спиртовой раствор йода (5%) и раствор Люголя предназначены исключительно для наружной антисептической обработки. При приеме внутрь они вызывают тяжелейшие химические ожоги слизистых оболочек пищевода, желудка и токсическое поражение почек.

2. Принципы йодной блокады:
   • Проводится только при официальном подтверждении выброса радиоактивного йода органами ГО и ЧС.
   • Однократный прием таблетированного йодида калия защищает щитовидную железу на 24 часа. Стандартная дозировка для взрослого человека составляет 125 мг калия йодида (детям от 2 лет — 40–65 мг, новорожденным — до 16 мг).
   • Прием йода через 24 часа после прохождения радиоактивного облака теряет защитный эффект.`;

    return {
      text,
      citedChunks: chunks,
      modelId: "offline-rule-engine",
      inferenceTimeMs: Date.now() - start,
      isFallback: true,
    };
  }

  // Knowledge synthesis for mushrooms and wild plants without refusal
  if (qLower.includes("гриб") || qLower.includes("ягод") || qLower.includes("дикорос")) {
    const text = `Методология идентификации и безопасного сбора дикоросов:

1. Главные правила безопасности:
   • Никогда не употребляйте в пищу грибы с вольвой (мешковидным образованием у основания ножки) и юбочкой-кольцом, особенно с белыми пластинками (признаки бледной поганки и смертельно опасных мухоморов).
   • Трубчатые грибы (губчатые под шляпкой: белые, подберезовики, маслята) в умеренных широтах значительно безопаснее пластинчатых — среди них практически нет смертельно ядовитых (кроме сатанинского и желчного гриба, которые легко распознаются по горечи и изменению цвета на срезе).

2. Универсальный тест на съедобность растений (Survival Edibility Test):
   • Разделите растение на части (корень, стебель, лист). Тестируйте только одну часть за раз.
   • Нанесите каплю сока на нежную кожу запястья или локтевого сгиба — подождите 15 минут.
   • При отсутствии жжения и зуда прикоснитесь к губам, затем положите на кончик языка на 3 минуты (не глотать!). При горечи или онемении — сплюнуть.
   • Разжуйте небольшой кусочек и удерживайте во рту 15 минут без проглатывания.
   • Если признаков аллергии и токсичности нет — проглотите минимальное количество и ждите 8 часов.`;

    return {
      text,
      citedChunks: chunks,
      modelId: "offline-rule-engine",
      inferenceTimeMs: Date.now() - start,
      isFallback: true,
    };
  }

  // If matching chunks exist, synthesize them into a rich structured answer
  if (chunks.length > 0) {
    const formattedSteps = chunks
      .slice(0, 5)
      .map((c, i) => `Шаг ${i + 1} [${c.articleTitle} / ${c.shelf}]:\n${c.content}`)
      .join("\n\n");

    const fullText = `Ответ по материалам справочника и практическому протоколу:\n\n${formattedSteps}\n\nРекомендации:\n• Действуйте методично и соблюдайте технику безопасности.\n• При изменении обстановки сверяйтесь со смежными разделами базы данных.`;

    return {
      text: fullText,
      citedChunks: chunks.slice(0, 5),
      modelId: "offline-rule-engine",
      inferenceTimeMs: Date.now() - start,
      isFallback: true,
    };
  }

  // Broad structured answer for any arbitrary query without matching chunks
  const genericText = `Информационная справка по запросу «${query.trim()}»:

1. Основные принципы и тактика:
   • Анализ обстановки: оцените ключевые угрозы, доступные ресурсы и временные рамки для принятия решений.
   • Приоритет действий: жизнь и здоровье > безопасность периметра > поддержание жизнеобеспечения (тепло, вода, связь).

2. Практические рекомендации:
   • Вы можете уточнить поиск в меню приложения, а также загрузить собственные книги, заметки и инструкции в формате PDF, EPUB, TXT или HTML в раздел «Библиотека».
   • Вся база данных «Ковчег» работает на 100% автономно и готова к использованию в полевых условиях.`;

  return {
    text: genericText,
    citedChunks: [],
    modelId: "offline-rule-engine",
    inferenceTimeMs: Date.now() - start,
    isFallback: true,
  };
}

// Client-side WebLLM engine singleton
let webLLMEngine: any = null;
let currentLoadedModelId: LocalModelId | null = null;

export async function isWebGPUSupported(): Promise<boolean> {
  if (typeof window === "undefined" || !navigator) return false;
  try {
    return Boolean((navigator as any).gpu);
  } catch {
    return false;
  }
}

export async function loadWebLLMModel(
  modelId: LocalModelId = DEFAULT_MODEL_ID,
  onProgress?: (progress: ModelDownloadProgress) => void,
  customModels: CustomModelConfig[] = []
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const modelInfo = getModelInfo(modelId, customModels);
  if (!modelInfo) {
    onProgress?.({
      status: "error",
      progress: 0,
      text: `Модель ${modelId} не найдена в каталоге`,
      error: "Unknown model",
    });
    return false;
  }

  // Handle local external endpoint (e.g. Ollama, Termux llama.cpp, LocalAI)
  if (modelInfo.customConfig?.sourceType === "local-endpoint") {
    const endpoint = (modelInfo.customConfig.endpointUrl || "http://127.0.0.1:11434/v1").replace(/\/+$/, "");
    onProgress?.({
      status: "downloading",
      progress: 40,
      text: `Проверка связи с локальным сервером (${endpoint})...`,
    });

    try {
      // Ping endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      try {
        await fetch(`${endpoint}/models`, { method: "GET", signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }
    } catch {
      // If /models route fails or is CORS-blocked, continue gracefully
    }

    currentLoadedModelId = modelId;
    onProgress?.({
      status: "ready",
      progress: 100,
      text: `Локальный эндпоинт «${modelInfo.name}» подключен!`,
    });
    return true;
  }

  const hasGpu = await isWebGPUSupported();
  if (!hasGpu) {
    onProgress?.({
      status: "error",
      progress: 0,
      text: "Устройство не поддерживает WebGPU. Будет использоваться быстрый синтез архива.",
      error: "WebGPU is not supported on this device/browser",
    });
    return false;
  }

  try {
    onProgress?.({
      status: "downloading",
      progress: 5,
      text: `Инициализация загрузчика модели ${modelInfo.name}...`,
    });

    const webllm = await import("@mlc-ai/web-llm");

    if (webLLMEngine && currentLoadedModelId === modelId) {
      onProgress?.({
        status: "ready",
        progress: 100,
        text: `Модель ${modelInfo.name} уже загружена в память`,
      });
      return true;
    }

    const initProgressCallback = (report: any) => {
      const percent = Math.min(100, Math.round((report.progress || 0) * 100));
      onProgress?.({
        status: percent >= 100 ? "ready" : "downloading",
        progress: percent,
        text: report.text || `Загрузка: ${percent}%`,
      });
    };

    const targetModelId = modelInfo.mlcModelId || modelInfo.id;
    webLLMEngine = await webllm.CreateMLCEngine(targetModelId, {
      initProgressCallback,
    });

    currentLoadedModelId = modelId;

    onProgress?.({
      status: "ready",
      progress: 100,
      text: `Модель ${modelInfo.name} готова к автономной работе!`,
    });
    return true;
  } catch (err: any) {
    console.warn("WebLLM load failed, fallback will be used:", err);
    onProgress?.({
      status: "error",
      progress: 0,
      text: `Не удалось загрузить модель: ${err?.message || "Ошибка WebGPU"}`,
      error: String(err),
    });
    return false;
  }
}

export async function generateRAGAnswer(
  query: string,
  chunks: KnowledgeChunk[],
  modelId: LocalModelId = DEFAULT_MODEL_ID,
  options?: GenerationOptions,
  customModels: CustomModelConfig[] = []
): Promise<LLMGenerateResult> {
  const start = Date.now();
  const modelInfo = getModelInfo(modelId, customModels);

  // If custom model with local endpoint (Ollama / Termux / LM Studio)
  if (modelInfo?.customConfig?.sourceType === "local-endpoint") {
    const endpoint = (modelInfo.customConfig.endpointUrl || "http://127.0.0.1:11434/v1").replace(/\/+$/, "");
    const prompt = formatRAGPrompt(query, chunks);
    try {
      const res = await fetch(`${endpoint}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelInfo.name,
          messages: [
            { role: "system", content: SAFETY_SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          temperature: options?.temperature ?? 0.3,
          max_tokens: options?.maxTokens ?? 512,
        }),
        signal: options?.signal,
      });

      if (!res.ok) {
        throw new Error(`Endpoint returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "";
      if (options?.onToken) {
        options.onToken(text, text);
      }
      return {
        text: text || "Ответ получен от локального сервера.",
        citedChunks: chunks.slice(0, 5),
        modelId,
        inferenceTimeMs: Date.now() - start,
        isFallback: false,
      };
    } catch (err) {
      console.warn("Local endpoint call failed, falling back to rule engine:", err);
      const fallback = buildFallbackResponse(query, chunks);
      if (options?.onToken) {
        options.onToken(fallback.text, fallback.text);
      }
      return fallback;
    }
  }

  // If engine is not ready or in SSR, return grounded fallback response
  if (!webLLMEngine || currentLoadedModelId !== modelId) {
    const fallback = buildFallbackResponse(query, chunks);
    if (options?.onToken) {
      options.onToken(fallback.text, fallback.text);
    }
    return fallback;
  }

  const prompt = formatRAGPrompt(query, chunks);

  try {
    const messages = [
      { role: "system", content: SAFETY_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ];

    let fullText = "";
    const responseStream = await webLLMEngine.chat.completions.create({
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 512,
      stream: true,
    });

    for await (const chunk of responseStream) {
      if (options?.signal?.aborted) {
        break;
      }
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        fullText += delta;
        options?.onToken?.(delta, fullText);
      }
    }

    return {
      text: fullText || "Ответ получен.",
      citedChunks: chunks.slice(0, 5),
      modelId,
      inferenceTimeMs: Date.now() - start,
      isFallback: false,
    };
  } catch (err) {
    console.warn("Generation error, falling back:", err);
    const fallback = buildFallbackResponse(query, chunks);
    options?.onToken?.(fallback.text, fallback.text);
    return fallback;
  }
}

export function getCurrentLoadedModel(): LocalModelId | null {
  return currentLoadedModelId;
}

export function getLoadedEngine(): any {
  return webLLMEngine;
}
