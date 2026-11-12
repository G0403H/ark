import type { LocalModelInfo, LocalModelId, CustomModelConfig } from "./types.ts";

export const LOCAL_MODELS: LocalModelInfo[] = [
  {
    id: "mnn-pocket-0.3b-q8",
    name: "MNN-Pocket 0.3B Instruct (Q8)",
    family: "MNN-Pocket",
    sizeLabel: "~310 МБ",
    vramLabel: "~390 МБ VRAM",
    parametersB: 0.3,
    quantization: "q8",
    recommended: true,
    description: "Новейшая ультракомпактная модель Alibaba MNN (300M параметров, квантование Q8). Рекордная скорость генерации и минимальный нагрев смартфона.",
    mlcModelId: "MNN-Pocket-0.3B-Instruct-q8-MLC",
  },
  {
    id: "qwen2.5-0.5b",
    name: "Qwen 2.5 0.5B Instruct",
    family: "Qwen",
    sizeLabel: "~350 МБ",
    vramLabel: "~600 МБ VRAM",
    parametersB: 0.5,
    quantization: "q4",
    recommended: true,
    description: "Компактная, быстрая, отлично понимает русский язык. Идеальна для смартфонов и ноутбуков.",
    mlcModelId: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
  },
  {
    id: "smollm2-360m",
    name: "SmolLM2 360M Instruct",
    family: "SmolLM",
    sizeLabel: "~220 МБ",
    vramLabel: "~450 МБ VRAM",
    parametersB: 0.36,
    quantization: "q4",
    recommended: false,
    description: "Ультралегкая модель. Минимальный расход памяти и батареи, базовые инструкции.",
    mlcModelId: "SmolLM2-360M-Instruct-q4f16_1-MLC",
  },
  {
    id: "mnn-pocket-0.3b-f16",
    name: "MNN-Pocket 0.3B Instruct (F16)",
    family: "MNN-Pocket",
    sizeLabel: "~590 МБ",
    vramLabel: "~750 МБ VRAM",
    parametersB: 0.3,
    quantization: "f16",
    recommended: false,
    description: "Полноточная 16-битная версия MNN-Pocket без потери качества весов. Максимальная точность для мобильной архитектуры 0.3B.",
    mlcModelId: "MNN-Pocket-0.3B-Instruct-f16-MLC",
  },
  {
    id: "llama-3.2-1b",
    name: "Llama 3.2 1B Instruct",
    family: "Llama",
    sizeLabel: "~750 МБ",
    vramLabel: "~1.2 ГБ VRAM",
    parametersB: 1.0,
    quantization: "q4",
    recommended: false,
    description: "Модель Meta. Строгое следование системным инструкциям и медицинским запретам.",
    mlcModelId: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
  },
  {
    id: "qwen2.5-1.5b",
    name: "Qwen 2.5 1.5B Instruct",
    family: "Qwen",
    sizeLabel: "~950 МБ",
    vramLabel: "~1.5 ГБ VRAM",
    parametersB: 1.5,
    quantization: "q4",
    recommended: false,
    description: "Высокая детальность и связанность изложения. Требует видеокарту с 2 ГБ+ памяти.",
    mlcModelId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
  },
];

export const DEFAULT_MODEL_ID: LocalModelId = "qwen2.5-0.5b";

export function customModelToInfo(config: CustomModelConfig): LocalModelInfo {
  return {
    id: config.id,
    name: config.name,
    family: config.family,
    sizeLabel: config.sizeLabel,
    vramLabel: config.vramLabel,
    parametersB: config.parametersB,
    quantization: config.quantization,
    description: config.description,
    mlcModelId: config.mlcModelId,
    isCustom: true,
    customConfig: config,
  };
}

export function getAllModels(customModels: CustomModelConfig[] = []): LocalModelInfo[] {
  const customInfos = customModels.map(customModelToInfo);
  return [...LOCAL_MODELS, ...customInfos];
}

export function getModelInfo(
  id: string,
  customModels: CustomModelConfig[] = []
): LocalModelInfo | undefined {
  const all = getAllModels(customModels);
  return all.find((m) => m.id === id);
}
