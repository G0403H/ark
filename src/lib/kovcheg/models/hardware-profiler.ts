import type {
  DeviceHardwareProfile,
  HardwareTier,
  LocalModelInfo,
  ModelCompatibility,
  QuantizationType,
} from "./types.ts";

/**
 * Quantization bits per weight multiplier for memory estimation.
 */
const BITS_PER_QUANT: Record<QuantizationType, number> = {
  int4: 4.25,
  q4: 4.5,
  q5: 5.5,
  q8: 8.5,
  f16: 16.0,
  other: 8.0,
};

/**
 * Calculates estimated model disk footprint and VRAM requirements
 * based on parameter count (in billions) and quantization format.
 */
export function estimateModelVRAM(
  parametersB: number,
  quantization: QuantizationType = "q4"
): { estimatedVramMb: number; diskSizeMb: number; sizeLabel: string; vramLabel: string } {
  const bits = BITS_PER_QUANT[quantization] ?? 8.0;
  // Weight footprint in Megabytes
  const rawWeightsMb = Math.round((parametersB * 1000 * bits) / 8);

  // KV cache and activation buffer overhead
  let overheadMb = 120;
  if (parametersB > 3.0) {
    overheadMb = 650;
  } else if (parametersB > 1.0) {
    overheadMb = 350;
  } else if (parametersB > 0.4) {
    overheadMb = 200;
  }

  const estimatedVramMb = rawWeightsMb + overheadMb;
  const diskSizeMb = Math.round(rawWeightsMb * 1.05); // including metadata

  const sizeLabel = diskSizeMb >= 1000 ? `~${(diskSizeMb / 1000).toFixed(1)} ГБ` : `~${diskSizeMb} МБ`;
  const vramLabel =
    estimatedVramMb >= 1000
      ? `~${(estimatedVramMb / 1000).toFixed(1)} ГБ VRAM`
      : `~${estimatedVramMb} МБ VRAM`;

  return { estimatedVramMb, diskSizeMb, sizeLabel, vramLabel };
}

/**
 * Profiles the host device capabilities (WebGPU, RAM, VRAM buffers, mobile status).
 * Works safely both in browser and during SSR/tests.
 */
export async function profileDeviceHardware(): Promise<DeviceHardwareProfile> {
  const isBrowser = typeof window !== "undefined" && typeof navigator !== "undefined";

  if (!isBrowser) {
    return {
      hasWebGPU: false,
      adapterName: "SSR / Тестовая среда",
      isMobile: false,
      deviceMemoryGb: 8,
      hardwareConcurrency: 4,
      storageEstimateMb: 10000,
      maxBufferSizeMb: 0,
      safeVramBudgetMb: 1000,
      maxSafeParamsB: 1.0,
      tier: "medium",
      tierDescription: "Тестовая среда инференса",
    };
  }

  // Detect mobile device
  const ua = navigator.userAgent || "";
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    (navigator.maxTouchPoints != null && navigator.maxTouchPoints > 1 && window.innerWidth < 1024);

  // Device memory heuristics
  // navigator.deviceMemory gives RAM in GiB (e.g. 2, 4, 8) in Chromium
  const navAny = navigator as any;
  let deviceMemoryGb: number = navAny.deviceMemory || (isMobile ? 4 : 8);
  const hardwareConcurrency: number = navigator.hardwareConcurrency || 4;

  let hasWebGPU = false;
  let adapterName = isMobile ? "Встроенный мобильный GPU" : "Графический процессор";
  let maxBufferSizeMb = 0;
  let storageEstimateMb = 4000;

  // Check storage
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      if (estimate.quota && estimate.usage != null) {
        storageEstimateMb = Math.round((estimate.quota - estimate.usage) / (1024 * 1024));
      }
    }
  } catch {
    // Ignore storage check failures
  }

  // Check WebGPU adapter
  try {
    if (navAny.gpu && typeof navAny.gpu.requestAdapter === "function") {
      const adapter = await navAny.gpu.requestAdapter();
      if (adapter) {
        hasWebGPU = true;
        const info = (adapter as any).info;
        if (info) {
          adapterName =
            info.description ||
            [info.vendor, info.architecture, info.device].filter(Boolean).join(" ") ||
            adapterName;
        }

        if (adapter.limits?.maxBufferSize) {
          maxBufferSizeMb = Math.round(adapter.limits.maxBufferSize / (1024 * 1024));
        }
      }
    }
  } catch {
    hasWebGPU = false;
  }

  // Determine Safe VRAM Budget (MB)
  let safeVramBudgetMb = 0;
  if (!hasWebGPU) {
    safeVramBudgetMb = 0;
  } else if (isMobile) {
    // Mobile unified memory: OS and apps share RAM.
    // 4GB RAM phone can safely allocate ~700-900 MB before memory pressure kill.
    // 6-8GB RAM phone can allocate ~1200-1600 MB.
    // 12GB+ phone can allocate ~2500 MB.
    if (deviceMemoryGb <= 3) {
      safeVramBudgetMb = Math.min(600, maxBufferSizeMb > 0 ? maxBufferSizeMb * 1.2 : 600);
    } else if (deviceMemoryGb <= 5) {
      safeVramBudgetMb = Math.min(1000, maxBufferSizeMb > 0 ? maxBufferSizeMb * 1.5 : 1000);
    } else if (deviceMemoryGb <= 8) {
      safeVramBudgetMb = Math.min(1600, maxBufferSizeMb > 0 ? maxBufferSizeMb * 2.0 : 1600);
    } else {
      safeVramBudgetMb = Math.min(2500, maxBufferSizeMb > 0 ? maxBufferSizeMb * 2.5 : 2500);
    }
  } else {
    // Desktop / Laptop
    if (deviceMemoryGb <= 4) {
      safeVramBudgetMb = 1200;
    } else if (deviceMemoryGb <= 8) {
      safeVramBudgetMb = Math.min(3000, maxBufferSizeMb > 0 ? maxBufferSizeMb * 2 : 2500);
    } else {
      safeVramBudgetMb = Math.min(6000, maxBufferSizeMb > 0 ? maxBufferSizeMb * 3 : 5000);
    }
  }

  // Max safe parameters in billions
  let maxSafeParamsB = 0.3;
  let tier: HardwareTier = "low";
  let tierDescription = "Бюджетный смартфон: до 0.3B параметров";

  if (!hasWebGPU) {
    tier = "unsupported";
    maxSafeParamsB = 0;
    tierDescription = "WebGPU не поддерживается браузером (доступен быстрый синтез правил)";
  } else if (safeVramBudgetMb >= 3000) {
    tier = "high";
    maxSafeParamsB = 7.0;
    tierDescription = "Высокая производительность: безопасны модели до 7B-8B";
  } else if (safeVramBudgetMb >= 1800) {
    tier = "high";
    maxSafeParamsB = 3.0;
    tierDescription = "Флагманский телефон / ПК: безопасны модели до 3B параметров";
  } else if (safeVramBudgetMb >= 900) {
    tier = "medium";
    maxSafeParamsB = 1.5;
    tierDescription = "Современный смартфон / ноутбук: оптимально до 1.5B параметров";
  } else if (safeVramBudgetMb >= 500) {
    tier = "low";
    maxSafeParamsB = 0.5;
    tierDescription = "Базовый смартфон: оптимально до 0.5B параметров (Qwen 0.5B / MNN-Pocket)";
  } else {
    tier = "low";
    maxSafeParamsB = 0.3;
    tierDescription = "Ультракомпактный порог: рекомендуется 0.3B Q8 (MNN-Pocket / SmolLM)";
  }

  return {
    hasWebGPU,
    adapterName,
    isMobile,
    deviceMemoryGb,
    hardwareConcurrency,
    storageEstimateMb,
    maxBufferSizeMb,
    safeVramBudgetMb,
    maxSafeParamsB,
    tier,
    tierDescription,
  };
}

/**
 * Maps known model IDs to parameter and quant metadata if not explicitly provided.
 */
function resolveModelParams(model: Partial<LocalModelInfo>): {
  paramsB: number;
  quant: QuantizationType;
} {
  if (model.parametersB != null && model.quantization != null) {
    return { paramsB: model.parametersB, quant: model.quantization };
  }

  const id = model.id || "";
  if (id.includes("0.3b") || id.includes("360m")) {
    return { paramsB: 0.3, quant: id.includes("f16") ? "f16" : "q8" };
  }
  if (id.includes("0.5b")) {
    return { paramsB: 0.5, quant: "q4" };
  }
  if (id.includes("1.5b") || id.includes("1b")) {
    return { paramsB: id.includes("1.5b") ? 1.5 : 1.0, quant: "q4" };
  }
  if (id.includes("2b") || id.includes("3b")) {
    return { paramsB: id.includes("3b") ? 3.0 : 2.0, quant: "q4" };
  }
  if (id.includes("7b") || id.includes("8b")) {
    return { paramsB: id.includes("8b") ? 8.0 : 7.0, quant: "q4" };
  }

  return { paramsB: 0.5, quant: "q4" };
}

/**
 * Evaluates whether a given model (built-in or custom) fits within the device's hardware threshold.
 * Informs the user whether this model is safe, near limits, or dangerous (will crash / OOM).
 */
export function evaluateModelCompatibility(
  model: Partial<LocalModelInfo>,
  profile: DeviceHardwareProfile
): ModelCompatibility {
  // If model connects to an external/local endpoint (e.g. Ollama/Termux), GPU burden is not on the browser tab!
  if (model.customConfig?.sourceType === "local-endpoint") {
    return {
      status: "safe",
      label: "🟢 Локальный сервер",
      badgeColor: "#10b981",
      detail: `Инференс выполняется через внешний процесс (${model.customConfig.endpointUrl || "127.0.0.1"}). Вкладка браузера не расходует VRAM.`,
      estimatedVramMb: 0,
      percentOfBudget: 0,
    };
  }

  // If no WebGPU support
  if (!profile.hasWebGPU) {
    return {
      status: "unsupported",
      label: "⚪ Без WebGPU",
      badgeColor: "#6b7280",
      detail:
        "Браузер или видеочип не поддерживает WebGPU. Ответы будут формироваться через быстрый офлайн-движок архива.",
      estimatedVramMb: 0,
      percentOfBudget: 0,
    };
  }

  const { paramsB, quant } = resolveModelParams(model);
  const { estimatedVramMb } = estimateModelVRAM(paramsB, quant);

  const budget = Math.max(1, profile.safeVramBudgetMb);
  const percentOfBudget = Math.round((estimatedVramMb / budget) * 100);

  if (estimatedVramMb <= budget * 0.85) {
    return {
      status: "safe",
      label: "🟢 Совместима",
      badgeColor: "#10b981",
      detail: `Отлично подходит. Требует ~${estimatedVramMb} МБ VRAM (${percentOfBudget}% от лимита устройства в ${budget} МБ). Быстрый запуск без перегрева.`,
      estimatedVramMb,
      percentOfBudget,
    };
  }

  if (estimatedVramMb <= budget * 1.25) {
    return {
      status: "warning",
      label: "🟡 На грани порога",
      badgeColor: "#f59e0b",
      detail: `Высокая нагрузка. Требует ~${estimatedVramMb} МБ VRAM (${percentOfBudget}% от лимита в ${budget} МБ). Возможен нагрев телефона и медленная генерация.`,
      estimatedVramMb,
      percentOfBudget,
    };
  }

  return {
    status: "danger",
    label: "🔴 Превышает порог",
    badgeColor: "#ef4444",
    detail: `Критический перерасход памяти! Требует ~${estimatedVramMb} МБ VRAM при безопасном лимите устройства ${budget} МБ (${percentOfBudget}%). На данном телефоне приведет к сбою WebGPU Out-Of-Memory или вылету вкладки.`,
    estimatedVramMb,
    percentOfBudget,
  };
}
