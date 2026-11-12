import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Language } from "./i18n";
import type { LocalModelId, CustomModelConfig } from "./models/types";

export type ThemeName = "shelter" | "paper" | "stalker";
export type ModelMode = "archive" | "llm";

export type UserNote = {
  id: string;
  title: string;
  body: string;
  created: number;
  pack: "user-notes" | "user-cards";
};

export type IngestedDoc = {
  id: string;
  name: string;
  size: number;
  type: "txt" | "pdf" | "epub" | "html" | "md" | "pack";
  created: number;
  textExcerpt: string;
  fullText?: string;
  dataUrl?: string;
};

export type UnreadFile = {
  id: string;
  name: string;
  reason: string;
};

export type ReaderBookmark = {
  id: string;
  docId: string;
  docName: string;
  page: number;
  chapterTitle?: string;
  textExcerpt: string;
  created: number;
};

type ArkState = {
  lang: Language;
  theme: ThemeName;
  fontStep: 0 | 1 | 2 | 3;
  bookmarks: string[];
  readerBookmarks: ReaderBookmark[];
  recents: string[];
  helped: Record<string, number>;
  disclaimerSeen: boolean;
  notes: UserNote[];
  documents: IngestedDoc[];
  unread: UnreadFile[];
  assistantPlus: boolean;
  drawerOpen: boolean;

  // Local model and RAG state
  modelMode: ModelMode;
  selectedModelId: LocalModelId;
  downloadedModels: string[];
  customModels: CustomModelConfig[];
  archiveIndexedChunks: number | null;
  archiveIndexedAt: number | null;

  setLang: (lang: Language) => void;
  setTheme: (t: ThemeName) => void;
  setFontStep: (n: 0 | 1 | 2 | 3) => void;
  toggleBookmark: (id: string) => void;
  addReaderBookmark: (bm: ReaderBookmark) => void;
  removeReaderBookmark: (id: string) => void;
  touchRecent: (id: string) => void;
  markHelped: (id: string) => void;
  acceptDisclaimer: () => void;
  addNote: (note: UserNote) => void;
  removeNote: (id: string) => void;
  clearNotes: () => void;
  addDocument: (doc: IngestedDoc) => void;
  removeDocument: (id: string) => void;
  clearDocuments: () => void;
  addUnread: (file: UnreadFile) => void;
  removeUnread: (id: string) => void;
  setAssistantPlus: (v: boolean) => void;
  setDrawerOpen: (v: boolean) => void;
  toggleDrawer: () => void;

  setModelMode: (mode: ModelMode) => void;
  setSelectedModelId: (id: LocalModelId) => void;
  addDownloadedModel: (id: string) => void;
  removeDownloadedModel: (id: string) => void;
  addCustomModel: (model: CustomModelConfig) => void;
  removeCustomModel: (id: string) => void;
  setArchiveIndexed: (chunksCount: number) => void;
};

export const useArk = create<ArkState>()(
  persist(
    (set) => ({
      lang: "ru",
      theme: "stalker",
      fontStep: 1,
      bookmarks: [],
      readerBookmarks: [],
      recents: [],
      helped: {},
      disclaimerSeen: false,
      notes: [],
      documents: [],
      unread: [],
      assistantPlus: false,
      drawerOpen: false,

      modelMode: "archive",
      selectedModelId: "qwen2.5-0.5b",
      downloadedModels: [],
      customModels: [],
      archiveIndexedChunks: null,
      archiveIndexedAt: null,

      setLang: (lang) => set({ lang }),
      setTheme: (theme) => set({ theme }),
      setFontStep: (fontStep) => set({ fontStep }),
      toggleBookmark: (id) =>
        set((s) => ({
          bookmarks: s.bookmarks.includes(id)
            ? s.bookmarks.filter((x) => x !== id)
            : [id, ...s.bookmarks],
        })),
      addReaderBookmark: (bm) =>
        set((s) => ({
          readerBookmarks: [
            bm,
            ...s.readerBookmarks.filter(
              (b) => !(b.docId === bm.docId && b.page === bm.page),
            ),
          ].slice(0, 50),
        })),
      removeReaderBookmark: (id) =>
        set((s) => ({
          readerBookmarks: s.readerBookmarks.filter((b) => b.id !== id),
        })),
      touchRecent: (id) =>
        set((s) => ({
          recents: [id, ...s.recents.filter((x) => x !== id)].slice(0, 12),
        })),
      markHelped: (id) =>
        set((s) => ({ helped: { ...s.helped, [id]: (s.helped[id] ?? 0) + 1 } })),
      acceptDisclaimer: () => set({ disclaimerSeen: true }),
      addNote: (note) => set((s) => ({ notes: [note, ...s.notes] })),
      removeNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
      clearNotes: () => set({ notes: [] }),
      addDocument: (doc) =>
        set((s) => ({
          documents: [doc, ...s.documents.filter((d) => d.id !== doc.id)].slice(0, 50),
        })),
      removeDocument: (id) =>
        set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),
      clearDocuments: () => set({ documents: [] }),
      addUnread: (file) => set((s) => ({ unread: [file, ...s.unread].slice(0, 20) })),
      removeUnread: (id) => set((s) => ({ unread: s.unread.filter((f) => f.id !== id) })),
      setAssistantPlus: (assistantPlus) => set({ assistantPlus }),
      setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
      toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),

      setModelMode: (modelMode) => set({ modelMode }),
      setSelectedModelId: (selectedModelId) => set({ selectedModelId }),
      addDownloadedModel: (id) =>
        set((s) => ({
          downloadedModels: s.downloadedModels.includes(id)
            ? s.downloadedModels
            : [...s.downloadedModels, id],
        })),
      removeDownloadedModel: (id) =>
        set((s) => ({
          downloadedModels: s.downloadedModels.filter((m) => m !== id),
        })),
      addCustomModel: (model) =>
        set((s) => ({
          customModels: [model, ...s.customModels.filter((m) => m.id !== model.id)],
          downloadedModels: s.downloadedModels.includes(model.id)
            ? s.downloadedModels
            : [...s.downloadedModels, model.id],
        })),
      removeCustomModel: (id) =>
        set((s) => ({
          customModels: s.customModels.filter((m) => m.id !== id),
          downloadedModels: s.downloadedModels.filter((m) => m !== id),
          selectedModelId: s.selectedModelId === id ? "qwen2.5-0.5b" : s.selectedModelId,
        })),
      setArchiveIndexed: (archiveIndexedChunks) =>
        set({ archiveIndexedChunks, archiveIndexedAt: Date.now() }),
    }),
    { name: "kovcheg-ark-v2" },
  ),
);
