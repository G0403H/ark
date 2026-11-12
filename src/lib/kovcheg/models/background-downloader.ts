import { create } from "zustand";
import type { LocalModelId, ModelDownloadProgress, CustomModelConfig } from "./types.ts";
import { loadWebLLMModel } from "./llm-engine.ts";
import { useArk } from "../store.ts";
import { getModelInfo } from "./catalog.ts";

interface BackgroundDownloaderState {
  downloads: Record<string, ModelDownloadProgress>;
  activeModelId: string | null;
  startDownload: (modelId: LocalModelId, customModels?: CustomModelConfig[]) => Promise<boolean>;
  clearDownloadStatus: (modelId: string) => void;
}

export const useBackgroundDownloader = create<BackgroundDownloaderState>((set, get) => ({
  downloads: {},
  activeModelId: null,

  startDownload: async (modelId: LocalModelId, customModels: CustomModelConfig[] = []) => {
    const current = get().downloads[modelId];
    if (current && current.status === "downloading") {
      return false;
    }

    set((state) => ({
      activeModelId: modelId,
      downloads: {
        ...state.downloads,
        [modelId]: {
          status: "downloading",
          progress: 1,
          text: "Инициализация фоновой загрузки...",
        },
      },
    }));

    try {
      const success = await loadWebLLMModel(
        modelId,
        (progress) => {
          set((state) => ({
            downloads: {
              ...state.downloads,
              [modelId]: progress,
            },
          }));
        },
        customModels
      );

      if (success) {
        useArk.getState().addDownloadedModel(modelId);
        useArk.getState().setSelectedModelId(modelId);
        set((state) => ({
          activeModelId: state.activeModelId === modelId ? null : state.activeModelId,
          downloads: {
            ...state.downloads,
            [modelId]: {
              status: "ready",
              progress: 100,
              text: "Модель успешно загружена и готова!",
            },
          },
        }));
        return true;
      } else {
        set((state) => ({
          activeModelId: state.activeModelId === modelId ? null : state.activeModelId,
          downloads: {
            ...state.downloads,
            [modelId]: {
              status: "error",
              progress: 0,
              text: "Ошибка загрузки модели",
              error: "Не удалось загрузить веса",
            },
          },
        }));
        return false;
      }
    } catch (err: any) {
      set((state) => ({
        activeModelId: state.activeModelId === modelId ? null : state.activeModelId,
        downloads: {
          ...state.downloads,
          [modelId]: {
            status: "error",
            progress: 0,
            text: err?.message || "Сбой загрузки",
            error: String(err),
          },
        },
      }));
      return false;
    }
  },

  clearDownloadStatus: (modelId: string) => {
    set((state) => {
      const next = { ...state.downloads };
      delete next[modelId];
      return {
        downloads: next,
        activeModelId: state.activeModelId === modelId ? null : state.activeModelId,
      };
    });
  },
}));
