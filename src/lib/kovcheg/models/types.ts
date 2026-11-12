export type BuiltinModelId =
  | "qwen2.5-0.5b"
  | "smollm2-360m"
  | "qwen2.5-1.5b"
  | "llama-3.2-1b"
  | "mnn-pocket-0.3b-q8"
  | "mnn-pocket-0.3b-f16";

export type LocalModelId = BuiltinModelId | (string & {});

export type QuantizationType = "q4" | "q5" | "q8" | "f16" | "int4" | "other";

export type CustomModelSourceType = "local-endpoint" | "mlc-webllm" | "local-file";

export type CustomModelConfig = {
  id: string;
  name: string;
  family: string;
  parametersB: number; // e.g. 0.3, 0.5, 1.5, 3.0, 7.0
  quantization: QuantizationType;
  sourceType: CustomModelSourceType;
  endpointUrl?: string; // e.g. "http://localhost:11434/v1" for Ollama / Termux llama.cpp
  mlcModelId?: string; // e.g. "mlc-ai/gemma-2-2b-it-q4f16_1-MLC" or custom HuggingFace model
  localFileName?: string;
  sizeLabel: string;
  vramLabel: string;
  description: string;
  createdAt: number;
};

export type HardwareTier = "low" | "medium" | "high" | "unsupported";

export type DeviceHardwareProfile = {
  hasWebGPU: boolean;
  adapterName: string;
  isMobile: boolean;
  deviceMemoryGb: number;
  hardwareConcurrency: number;
  storageEstimateMb: number;
  maxBufferSizeMb: number;
  safeVramBudgetMb: number;
  maxSafeParamsB: number;
  tier: HardwareTier;
  tierDescription: string;
};

export type ModelCompatibility = {
  status: "safe" | "warning" | "danger" | "unsupported";
  label: string;
  badgeColor: string;
  detail: string;
  estimatedVramMb: number;
  percentOfBudget: number;
};

export type LocalModelInfo = {
  id: LocalModelId;
  name: string;
  family: string;
  sizeLabel: string;
  vramLabel: string;
  recommended?: boolean;
  description: string;
  mlcModelId?: string;
  parametersB?: number;
  quantization?: QuantizationType;
  isCustom?: boolean;
  customConfig?: CustomModelConfig;
};

export type ModelDownloadProgress = {
  status: "idle" | "downloading" | "ready" | "error";
  progress: number; // 0 to 100
  text: string;
  error?: string;
};

export type KnowledgeChunk = {
  id: string;
  articleId: string;
  articleTitle: string;
  sectionId: string;
  sectionTitle: string;
  shelf: string;
  content: string;
  keywords: string[];
};

export type KnowledgeIndex = {
  version: string;
  updatedAt: number;
  totalArticles: number;
  chunks: KnowledgeChunk[];
};

export type RetrievalHit = {
  chunk: KnowledgeChunk;
  score: number;
  matchedKeywords: string[];
};

export type GenerationOptions = {
  onToken?: (token: string, fullText: string) => void;
  signal?: AbortSignal;
  maxTokens?: number;
  temperature?: number;
};

export type LLMGenerateResult = {
  text: string;
  citedChunks: KnowledgeChunk[];
  modelId: string;
  inferenceTimeMs: number;
  isFallback: boolean;
};
