import type {
  KnowledgeChunk,
  LocalModelId,
  ModelDownloadProgress,
  GenerationOptions,
  LLMGenerateResult,
  CustomModelConfig,
} from "./types.ts";
import { getModelInfo, DEFAULT_MODEL_ID } from "./catalog.ts";
import { aboutIodine, asksDose, mushroomQuestion, refusalReason } from "../search.ts";

export const SAFETY_SYSTEM_PROMPT = `Ты — автономный медицинский и тактический ассистент приложения «Ковчег».
Твоя цель — помочь человеку выжить и оказать помощь в чрезвычайной ситуации без интернета.

ЖЕСТКИЕ ПРАВИЛА БЕЗОПАСНОСТИ:
1. Отвечай строго, четко и по шагам. Без лишней воды и пространных рассуждений.
2. Запрещено выдумывать лекарственные дозировки, если они прямо не указаны в контексте карточки.
3. Запрещено советовать пить настойку йода, спиртовой раствор йода или раствор Люголя вместо йодида калия (это смертельно опасно для слизистых и почек).
4. Запрещено давать советы по определению съедобности неизвестных дикоросов и грибов без специализированного регионального определителя.
5. Опирайся исключительно на факты из предоставленного ниже архива. В конце каждого шага указывай, на какую карточку опираешься.`;

export function formatRAGPrompt(query: string, chunks: KnowledgeChunk[]): string {
  let contextBlock = "КОНТЕКСТ ИЗ АРХИВА ВЫЖИВАНИЯ:\n";
  if (chunks.length === 0) {
    contextBlock += "(Прямых совпадений в карточках не найдено. Руководствуйся только базовыми правилами безопасности Ковчега.)\n";
  } else {
    chunks.forEach((chunk, idx) => {
      contextBlock += `[Фрагмент ${idx + 1}] Раздел: "${chunk.shelf}" | Статья: "${chunk.articleTitle}"\n${chunk.content}\n\n`;
    });
  }

  return `${SAFETY_SYSTEM_PROMPT}

${contextBlock}
Вопрос пользователя: ${query.trim()}

Ответ (кратко, по шагам, с указанием карточек-источников):`;
}

export function buildFallbackResponse(
  query: string,
  chunks: KnowledgeChunk[]
): LLMGenerateResult {
  const start = Date.now();
  const refusal = refusalReason(query);
  if (refusal) {
    return {
      text: refusal,
      citedChunks: [],
      modelId: "offline-rule-engine",
      inferenceTimeMs: Date.now() - start,
      isFallback: true,
    };
  }

  const iodine = aboutIodine(query);
  const dose = asksDose(query);
  const mushrooms = mushroomQuestion(query);

  if (iodine) {
    return {
      text: "Сначала запрет. Настойку йода, раствор Люголя и «йодную сетку» не пьют и не мажут вместо йодида калия. Дозы в этой базе нет: её берут только из официального сообщения штаба ГО, если радиозащитный препарат объявлен.",
      citedChunks: chunks,
      modelId: "offline-rule-engine",
      inferenceTimeMs: Date.now() - start,
      isFallback: true,
    };
  }

  if (dose) {
    return {
      text: "Внимание: в локальной базе нет точной дозировки и дозы для этого препарата. Приложение не назначает лекарства и не заполняет дозы во избежание отравления. Обратитесь к регламентам или официальной инструкции.",
      citedChunks: chunks,
      modelId: "offline-rule-engine",
      inferenceTimeMs: Date.now() - start,
      isFallback: true,
    };
  }

  if (mushrooms) {
    return {
      text: "Предупреждение: в базе Ковчега нет определителя съедобных грибов. Без квалифицированного миколога и точного регионального определителя незнакомые грибы в дикой природе категорически нельзя употреблять в пищу.",
      citedChunks: chunks,
      modelId: "offline-rule-engine",
      inferenceTimeMs: Date.now() - start,
      isFallback: true,
    };
  }

  if (chunks.length === 0) {
    return {
      text: "В локальном архиве Ковчега нет карточек по данному запросу. Попробуйте переформулировать поиск другими ключевыми словами (например: 'жгут', 'вода', 'радиация', 'укрытие').",
      citedChunks: [],
      modelId: "offline-rule-engine",
      inferenceTimeMs: Date.now() - start,
      isFallback: true,
    };
  }

  const formattedSteps = chunks
    .slice(0, 5)
    .map((c, i) => `${i + 1}. ${c.content} (Источник: «${c.articleTitle}» · ${c.shelf})`)
    .join("\n\n");

  const fullText = `Инструкция по выдержкам архива:\n\n${formattedSteps}\n\nСоблюдайте меры предосторожности и действуйте строго по шагам.`;

  return {
    text: fullText,
    citedChunks: chunks.slice(0, 5),
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
