import { useState, useMemo, useEffect, useRef } from "react";
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Layers,
  Sparkles,
  Type,
  X,
  Sliders,
  Palette,
  Loader2,
  List,
  Search,
} from "lucide-react";
import type { IngestedDoc, ReaderBookmark } from "@/lib/kovcheg/store";
import { useArk } from "@/lib/kovcheg/store";
import type { Language } from "@/lib/kovcheg/i18n";
import { translatePageOffline } from "@/lib/kovcheg/models/page-translator";
import {
  extractCleanText,
  indexDocumentChapters,
  paginateChapter,
  calculateGlobalPage,
  analyzeChapterText,
  answerFromChapterText,
  type BookChapter,
} from "@/lib/kovcheg/reader-paginator";

export function DocumentReaderModal({
  doc,
  lang,
  onClose,
}: {
  doc: IngestedDoc;
  lang: Language;
  onClose: () => void;
}) {
  const [fontSize, setFontSize] = useState<number>(1.05);
  const [fontFamily, setFontFamily] = useState<"serif" | "sans">("serif");
  const [readerTheme, setReaderTheme] = useState<"paper" | "shelter" | "stalker">("shelter");

  // Chapter & Page navigation state
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(0);
  const [pageInChapter, setPageInChapter] = useState<number>(1);
  const [showToc, setShowToc] = useState<boolean>(false);
  const [showBookmarks, setShowBookmarks] = useState<boolean>(false);
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [tocFilter, setTocFilter] = useState<string>("");

  // Translation state (On-the-fly offline AI page translation)
  const [translatedPages, setTranslatedPages] = useState<Record<string, string>>({});
  const [translationTargetLang, setTranslationTargetLang] = useState<"ru" | "en" | "ar">(
    lang === "ru" ? "ru" : lang === "ar" ? "ar" : "en"
  );
  const [pageViewMode, setPageViewMode] = useState<"original" | "translated" | "dual">("original");
  const [isTranslating, setIsTranslating] = useState<boolean>(false);

  // AI Assistant Drawer (On-demand)
  const [showAi, setShowAi] = useState<boolean>(false);
  const [aiTab, setAiTab] = useState<"summary" | "plan" | "warnings" | "ask">("summary");
  const [aiQuery, setAiQuery] = useState<string>("");
  const [aiResult, setAiResult] = useState<{
    text: string;
    citations: string[];
  } | null>(null);

  // Bookmarks store
  const readerBookmarks = useArk((s) => s.readerBookmarks) || [];
  const addReaderBookmark = useArk((s) => s.addReaderBookmark);
  const removeReaderBookmark = useArk((s) => s.removeReaderBookmark);

  const contentRef = useRef<HTMLDivElement>(null);

  // Step 1: Rapidly extract pure text without DOM parsing overhead
  const cleanText = useMemo(() => {
    const raw = doc.fullText || doc.textExcerpt || "Нет текстового содержимого";
    return extractCleanText(raw, doc.type);
  }, [doc.fullText, doc.textExcerpt, doc.type]);

  // Step 2: Index chapters instantaneously (< 5ms)
  const chapters: BookChapter[] = useMemo(() => {
    return indexDocumentChapters(cleanText);
  }, [cleanText]);

  // Restore saved reading position on document mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`kovcheg-reading-pos-${doc.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          typeof parsed.chapterIndex === "number" &&
          parsed.chapterIndex >= 0 &&
          parsed.chapterIndex < chapters.length
        ) {
          setCurrentChapterIndex(parsed.chapterIndex);
          if (typeof parsed.pageInChapter === "number" && parsed.pageInChapter >= 1) {
            setPageInChapter(parsed.pageInChapter);
          }
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [doc.id, chapters.length]);

  // Persist current reading progress
  useEffect(() => {
    try {
      localStorage.setItem(
        `kovcheg-reading-pos-${doc.id}`,
        JSON.stringify({
          chapterIndex: currentChapterIndex,
          pageInChapter,
          updatedAt: Date.now(),
        })
      );
    } catch {
      // Ignore
    }
  }, [doc.id, currentChapterIndex, pageInChapter]);

  // Active chapter descriptor
  const activeChapter: BookChapter = chapters[currentChapterIndex] || chapters[0] || {
    id: "ch-0",
    index: 0,
    title: doc.name,
    charStart: 0,
    charEnd: cleanText.length,
    charCount: cleanText.length,
    estimatedPages: 1,
  };

  // Step 3: Lazy-slice ONLY the active chapter (typically 5KB - 30KB)
  const activeChapterText = useMemo(() => {
    return cleanText.slice(activeChapter.charStart, activeChapter.charEnd);
  }, [cleanText, activeChapter]);

  // Step 4: Paginate ONLY the active chapter (takes < 0.2ms, zero freeze!)
  const chapterPages = useMemo(() => {
    return paginateChapter(activeChapterText, 2000);
  }, [activeChapterText]);

  // Clamp pageInChapter within bounds of active chapter
  const clampedPage = Math.min(Math.max(1, pageInChapter), chapterPages.length);
  const currentPageText = chapterPages[clampedPage - 1] || "";

  // Unified global page indicator across the entire book
  const { currentGlobalPage, totalGlobalPages } = useMemo(() => {
    return calculateGlobalPage(chapters, currentChapterIndex, clampedPage);
  }, [chapters, currentChapterIndex, clampedPage]);

  // Scroll to top of content on page or chapter turn
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [currentChapterIndex, clampedPage]);

  // Bookmarks for this doc
  const docBookmarks = useMemo(
    () => readerBookmarks.filter((b) => b.docId === doc.id),
    [readerBookmarks, doc.id]
  );
  const isCurrentPageBookmarked = docBookmarks.some(
    (b) => b.page === currentGlobalPage
  );

  // Navigation handlers
  function handleNextPage() {
    if (clampedPage < chapterPages.length) {
      setPageInChapter(clampedPage + 1);
    } else if (currentChapterIndex < chapters.length - 1) {
      // Advance to next chapter
      setCurrentChapterIndex((prev) => prev + 1);
      setPageInChapter(1);
    }
  }

  function handlePrevPage() {
    if (clampedPage > 1) {
      setPageInChapter(clampedPage - 1);
    } else if (currentChapterIndex > 0) {
      // Step back to previous chapter, jumping to its last page
      setCurrentChapterIndex((prev) => prev - 1);
      setPageInChapter(9999); // Will be clamped automatically to last page
    }
  }

  function handleNextChapter() {
    if (currentChapterIndex < chapters.length - 1) {
      setCurrentChapterIndex((prev) => prev + 1);
      setPageInChapter(1);
    }
  }

  function handlePrevChapter() {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex((prev) => prev - 1);
      setPageInChapter(1);
    }
  }

  function handleSelectChapter(idx: number) {
    setCurrentChapterIndex(idx);
    setPageInChapter(1);
    setShowToc(false);
  }

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") {
        handlePrevPage();
      } else if (e.key === "ArrowRight") {
        handleNextPage();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  function handleToggleBookmark() {
    const existing = docBookmarks.find((b) => b.page === currentGlobalPage);
    if (existing) {
      removeReaderBookmark(existing.id);
    } else {
      const excerpt = currentPageText.slice(0, 140).replace(/\n/g, " ") + "...";
      addReaderBookmark({
        id: `${doc.id}_p${currentGlobalPage}_${Date.now()}`,
        docId: doc.id,
        docName: doc.name,
        page: currentGlobalPage,
        chapterTitle: activeChapter.title,
        textExcerpt: excerpt,
        created: Date.now(),
      });
    }
  }

  const cacheKey = `${doc.id}_ch${currentChapterIndex}_p${clampedPage}_${translationTargetLang}`;
  const translatedCurrentPage = translatedPages[cacheKey];

  async function handleTranslatePage() {
    if (translatedCurrentPage) {
      setPageViewMode((prev) => (prev === "translated" ? "original" : "translated"));
      return;
    }

    setIsTranslating(true);
    try {
      const res = await translatePageOffline(currentPageText, translationTargetLang, lang);
      setTranslatedPages((prev) => ({
        ...prev,
        [cacheKey]: res,
      }));
      setPageViewMode("translated");
    } finally {
      setIsTranslating(false);
    }
  }

  // On-demand AI analysis for the active chapter (never runs automatically)
  const chapterAnalysis = useMemo(() => {
    if (!showAi) return null;
    return analyzeChapterText(activeChapterText, lang);
  }, [showAi, activeChapterText, lang]);

  function handleRunAiQuery() {
    if (!aiQuery.trim()) return;
    const res = answerFromChapterText(aiQuery, activeChapterText, lang);
    setAiResult(res);
  }

  // Filtered Table of Contents
  const filteredChapters = useMemo(() => {
    if (!tocFilter.trim()) return chapters;
    const lower = tocFilter.toLowerCase();
    return chapters.filter(
      (c) =>
        c.title.toLowerCase().includes(lower) ||
        String(c.index + 1).includes(lower)
    );
  }, [chapters, tocFilter]);

  // High-contrast, crystal-clear theme styling definitions
  const themeStyles = {
    shelter: {
      bg: "#161410",
      text: "#f5eee4", // Crisp warm parchment white - high contrast against dark background
      headingColor: "#f5c563",
      metaColor: "#b8ab97",
      headerBg: "#1f1b15",
      border: "#3d3529",
      accent: "#e0a045",
      chipBg: "rgba(224, 160, 69, 0.15)",
    },
    paper: {
      bg: "#fbf7f0",
      text: "#1a1612", // Crisp dark ink on warm paper
      headingColor: "#2b2218",
      metaColor: "#665846",
      headerBg: "#f2ece0",
      border: "#d9ccb6",
      accent: "#8a5314",
      chipBg: "rgba(0, 0, 0, 0.06)",
    },
    stalker: {
      bg: "#080b06",
      text: "#dcf5cf", // Ultra-crisp bright tactical phosphor green-white
      headingColor: "#f59e0b",
      metaColor: "#7ea372",
      headerBg: "#12180e",
      border: "#26351e",
      accent: "#22c55e",
      chipBg: "rgba(34, 197, 94, 0.14)",
    },
  }[readerTheme];

  return (
    <div
      className="reader-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(6px)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Top Header Bar — Single Compact Row */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.5rem 0.8rem",
          background: themeStyles.headerBg,
          borderBottom: `1px solid ${themeStyles.border}`,
          zIndex: 30,
          gap: "0.5rem",
          height: "3.6rem",
          boxSizing: "border-box",
        }}
      >
        {/* Left: Back button + Title & Chapter */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0, flex: 1 }}>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            title="Назад"
            style={{ minHeight: "2.3rem", minWidth: "2.3rem", flexShrink: 0, borderRadius: "var(--radius-card)" }}
          >
            <ArrowLeft size={18} />
          </button>

          <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
            <h1
              style={{
                fontSize: "0.92rem",
                margin: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                color: themeStyles.text,
                lineHeight: 1.25,
                fontWeight: 600,
              }}
              title={doc.name}
            >
              {doc.name}
            </h1>
            <span
              style={{
                fontSize: "0.72rem",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                color: "var(--color-lamp)",
                lineHeight: 1.2,
                marginTop: 2,
              }}
            >
              Гл. {currentChapterIndex + 1}/{chapters.length}: {activeChapter.title}
            </span>
          </div>
        </div>

        {/* Right: Exactly 3 non-overlapping icon actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexShrink: 0 }}>
          {/* Table of Contents button */}
          <button
            type="button"
            className="icon-btn"
            onClick={() => {
              setShowToc((v) => !v);
              setShowMenu(false);
              setShowBookmarks(false);
            }}
            title={`Оглавление (${chapters.length} глав)`}
            style={{
              minHeight: "2.3rem",
              minWidth: "2.3rem",
              background: showToc ? "var(--color-lamp)" : "transparent",
              color: showToc ? "var(--color-ink)" : "inherit",
              borderRadius: "var(--radius-card)",
            }}
          >
            <List size={18} />
          </button>

          {/* Bookmark Current Page */}
          <button
            type="button"
            className="icon-btn"
            onClick={handleToggleBookmark}
            title={isCurrentPageBookmarked ? "Удалить страницу из закладок" : "Добавить страницу в закладки"}
            style={{
              minHeight: "2.3rem",
              minWidth: "2.3rem",
              color: isCurrentPageBookmarked ? "var(--color-lamp)" : "inherit",
              borderRadius: "var(--radius-card)",
            }}
          >
            {isCurrentPageBookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
          </button>

          {/* Unified Dropdown Menu Button */}
          <button
            type="button"
            className="icon-btn"
            onClick={() => {
              setShowMenu((v) => !v);
              setShowToc(false);
              setShowBookmarks(false);
            }}
            title="Параметры чтения и инструменты"
            style={{
              minHeight: "2.3rem",
              minWidth: "2.3rem",
              background: showMenu ? "var(--color-lamp)" : "transparent",
              color: showMenu ? "var(--color-ink)" : "inherit",
              border: showMenu ? "1px solid var(--color-lamp)" : `1px solid ${themeStyles.border}`,
              borderRadius: "var(--radius-card)",
            }}
          >
            <Sliders size={17} />
          </button>
        </div>
      </header>

      {/* Unified Settings & Tools Dropdown Menu */}
      {showMenu && (
        <>
          {/* Backdrop to close menu */}
          <div
            onClick={() => setShowMenu(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 35,
              background: "rgba(0,0,0,0.45)",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: "3.9rem",
              right: "0.8rem",
              width: "min(330px, calc(100vw - 1.6rem))",
              maxHeight: "calc(100vh - 5.5rem)",
              overflowY: "auto",
              background: "var(--color-raise)",
              border: "1px solid var(--color-line)",
              borderRadius: "var(--radius-card)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
              zIndex: 40,
              padding: "1rem",
              fontSize: "0.85rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.85rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: "0.95rem", color: "var(--color-lamp)" }}>
                Параметры чтения
              </strong>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowMenu(false)}
                style={{ minHeight: "1.8rem", minWidth: "1.8rem" }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Typography / Font Size Controls */}
            <div>
              <span className="meta" style={{ fontSize: "0.76rem", display: "block", marginBottom: "0.35rem" }}>
                Размер шрифта и гарнитура
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => setFontSize((s) => Math.max(0.8, Number((s - 0.1).toFixed(2))))}
                  style={{ flex: 1, minHeight: "2.2rem" }}
                  title="Уменьшить шрифт"
                >
                  A−
                </button>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, minWidth: "3.2rem", textAlign: "center" }}>
                  {Math.round(fontSize * 100)}%
                </span>
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => setFontSize((s) => Math.min(1.6, Number((s + 0.1).toFixed(2))))}
                  style={{ flex: 1, minHeight: "2.2rem" }}
                  title="Увеличить шрифт"
                >
                  A+
                </button>
                <button
                  type="button"
                  className="chip"
                  data-on={fontFamily === "serif" ? "1" : "0"}
                  onClick={() => setFontFamily((f) => (f === "serif" ? "sans" : "serif"))}
                  style={{ minHeight: "2.2rem", padding: "0 0.6rem" }}
                >
                  {fontFamily === "serif" ? "Serif" : "Sans"}
                </button>
              </div>
            </div>

            {/* Theme Picker */}
            <div>
              <span className="meta" style={{ fontSize: "0.76rem", display: "block", marginBottom: "0.35rem" }}>
                Тема оформления
              </span>
              <div style={{ display: "flex", gap: "0.35rem" }}>
                <button
                  type="button"
                  className="chip"
                  data-on={readerTheme === "shelter" ? "1" : "0"}
                  onClick={() => setReaderTheme("shelter")}
                  style={{ flex: 1, minHeight: "2rem", fontSize: "0.78rem", padding: "0 0.3rem" }}
                >
                  🌙 Убежище
                </button>
                <button
                  type="button"
                  className="chip"
                  data-on={readerTheme === "paper" ? "1" : "0"}
                  onClick={() => setReaderTheme("paper")}
                  style={{ flex: 1, minHeight: "2rem", fontSize: "0.78rem", padding: "0 0.3rem" }}
                >
                  📜 Бумага
                </button>
                <button
                  type="button"
                  className="chip"
                  data-on={readerTheme === "stalker" ? "1" : "0"}
                  onClick={() => setReaderTheme("stalker")}
                  style={{ flex: 1, minHeight: "2rem", fontSize: "0.78rem", padding: "0 0.3rem" }}
                >
                  ☢ Сталкер
                </button>
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--color-line)", margin: 0 }} />

            {/* Offline AI Translation */}
            <div>
              <span className="meta" style={{ fontSize: "0.76rem", display: "block", marginBottom: "0.35rem" }}>
                Офлайн-перевод страницы (ИИ)
              </span>
              <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.4rem" }}>
                <select
                  value={translationTargetLang}
                  onChange={(e) => setTranslationTargetLang(e.target.value as any)}
                  style={{ flex: 1, padding: "0.3rem 0.5rem", fontSize: "0.82rem" }}
                >
                  <option value="ru">Русский (RU)</option>
                  <option value="en">English (EN)</option>
                  <option value="ar">العربية (AR)</option>
                </select>
                <button
                  type="button"
                  className="text-btn"
                  disabled={isTranslating}
                  onClick={handleTranslatePage}
                  style={{ minHeight: "2.1rem", padding: "0 0.6rem", fontSize: "0.82rem" }}
                >
                  {isTranslating
                    ? "Перевод..."
                    : translatedCurrentPage
                    ? pageViewMode === "translated"
                      ? "Оригинал"
                      : "Перевод"
                    : "Перевести"}
                </button>
              </div>

              {translatedCurrentPage && (
                <button
                  type="button"
                  className="chip"
                  data-on={pageViewMode === "dual" ? "1" : "0"}
                  onClick={() => setPageViewMode((v) => (v === "dual" ? "original" : "dual"))}
                  style={{ width: "100%", minHeight: "2rem", fontSize: "0.78rem" }}
                >
                  {pageViewMode === "dual" ? "✓ Режим: Оригинал + Перевод" : "Режим: Параллельный перевод"}
                </button>
              )}
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--color-line)", margin: 0 }} />

            {/* Quick Actions (AI chapter & Bookmarks) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <button
                type="button"
                className="text-btn"
                onClick={() => {
                  setShowAi(true);
                  setShowMenu(false);
                }}
                style={{
                  minHeight: "2.2rem",
                  width: "100%",
                  justifyContent: "flex-start",
                  fontSize: "0.82rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Sparkles size={15} color="var(--color-lamp)" />
                <span>ИИ-Анализ и выжимка главы</span>
              </button>

              <button
                type="button"
                className="text-btn"
                onClick={() => {
                  setShowBookmarks(true);
                  setShowMenu(false);
                }}
                style={{
                  minHeight: "2.2rem",
                  width: "100%",
                  justifyContent: "flex-start",
                  fontSize: "0.82rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Bookmark size={15} />
                <span>Все закладки книги ({docBookmarks.length})</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Main Reading Canvas & Side Drawers */}
      <div
        style={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
          position: "relative",
          background: themeStyles.bg,
        }}
      >
        {/* Table of Contents Drawer */}
        {showToc && (
          <aside
            style={{
              width: "min(340px, 90%)",
              background: "var(--color-raise)",
              borderRight: `1px solid ${themeStyles.border}`,
              display: "flex",
              flexDirection: "column",
              zIndex: 20,
              boxShadow: "4px 0 16px rgba(0,0,0,0.25)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "0.75rem 1rem",
                borderBottom: `1px solid ${themeStyles.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <strong style={{ fontSize: "0.95rem" }}>
                Оглавление ({chapters.length} глав)
              </strong>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowToc(false)}
                style={{ minHeight: "1.8rem", minWidth: "1.8rem" }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: "0.5rem 0.8rem", borderBottom: `1px solid ${themeStyles.border}` }}>
              <div style={{ position: "relative" }}>
                <Search
                  size={14}
                  style={{
                    position: "absolute",
                    left: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--color-muted)",
                  }}
                />
                <input
                  type="text"
                  placeholder="Фильтр по главам..."
                  value={tocFilter}
                  onChange={(e) => setTocFilter(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.35rem 0.6rem 0.35rem 1.8rem",
                    fontSize: "0.82rem",
                  }}
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "0.4rem 0" }}>
              {filteredChapters.map((ch) => {
                const isActive = ch.index === currentChapterIndex;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => handleSelectChapter(ch.index)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "0.6rem 1rem",
                      background: isActive ? "rgba(224, 160, 69, 0.15)" : "transparent",
                      borderLeft: isActive ? "3px solid var(--color-lamp)" : "3px solid transparent",
                      borderTop: "none",
                      borderRight: "none",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      color: isActive ? "var(--color-lamp)" : "inherit",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontWeight: isActive ? 700 : 400, flex: 1, paddingRight: "0.5rem" }}>
                      {ch.index + 1}. {ch.title}
                    </span>
                    <span className="meta" style={{ fontSize: "0.72rem", flexShrink: 0 }}>
                      ~{ch.estimatedPages} стр.
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        {/* Bookmarks Drawer */}
        {showBookmarks && (
          <aside
            style={{
              width: "min(320px, 90%)",
              background: "var(--color-raise)",
              borderRight: `1px solid ${themeStyles.border}`,
              display: "flex",
              flexDirection: "column",
              zIndex: 20,
              boxShadow: "4px 0 16px rgba(0,0,0,0.25)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "0.75rem 1rem",
                borderBottom: `1px solid ${themeStyles.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <strong style={{ fontSize: "0.95rem" }}>
                Закладки ({docBookmarks.length})
              </strong>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowBookmarks(false)}
                style={{ minHeight: "1.8rem", minWidth: "1.8rem" }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
              {docBookmarks.length === 0 ? (
                <p className="meta" style={{ padding: "1rem", textAlign: "center" }}>
                  В этом документе пока нет сохраненных закладок.
                </p>
              ) : (
                docBookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    style={{
                      padding: "0.6rem 0.8rem",
                      borderRadius: "var(--radius-card)",
                      background: "rgba(0,0,0,0.2)",
                      border: "1px solid var(--color-line)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                      <strong style={{ fontSize: "0.85rem", color: "var(--color-lamp)" }}>
                        Стр. {bm.page}
                      </strong>
                      <button
                        type="button"
                        className="text-btn"
                        onClick={() => removeReaderBookmark(bm.id)}
                        style={{ fontSize: "0.75rem", padding: "0 0.4rem", minHeight: "1.5rem" }}
                      >
                        ✕
                      </button>
                    </div>
                    {bm.chapterTitle && (
                      <span className="meta" style={{ fontSize: "0.75rem", display: "block" }}>
                        {bm.chapterTitle}
                      </span>
                    )}
                    <p style={{ margin: "0.3rem 0 0", fontSize: "0.8rem", lineHeight: 1.3 }}>
                      {bm.textExcerpt}
                    </p>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}

        {/* Center Book Reading Surface */}
        <div
          ref={contentRef}
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: "auto",
            padding: "1.5rem 1.8rem 6rem",
            color: themeStyles.text,
          }}
        >
          <div
            style={{
              maxWidth: "48rem",
              margin: "0 auto",
              fontSize: `${fontSize}rem`,
              lineHeight: 1.85,
              wordBreak: "break-word",
              fontFamily: fontFamily === "serif" ? "var(--font-serif)" : "var(--font-sans)",
            }}
          >
            {/* Chapter Header banner on first page of chapter */}
            {clampedPage === 1 && (
              <div
                style={{
                  borderBottom: `2px solid ${themeStyles.accent}`,
                  paddingBottom: "0.8rem",
                  marginBottom: "1.5rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: themeStyles.accent,
                    fontWeight: 700,
                  }}
                >
                  Глава {currentChapterIndex + 1} из {chapters.length}
                </span>
                <h2
                  style={{
                    fontSize: "1.45rem",
                    margin: "0.3rem 0 0",
                    color: themeStyles.headingColor,
                    lineHeight: 1.3,
                  }}
                >
                  {activeChapter.title}
                </h2>
              </div>
            )}

            {/* Dual parallel view (Original + AI Translation) */}
            {pageViewMode === "dual" && translatedCurrentPage ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                <div
                  style={{
                    padding: "1rem",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "var(--radius-card)",
                    border: `1px solid ${themeStyles.border}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.72rem",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      color: themeStyles.metaColor,
                      display: "block",
                      marginBottom: "0.4rem",
                    }}
                  >
                    Оригинал:
                  </span>
                  <div style={{ whiteSpace: "pre-wrap", color: themeStyles.text }}>{currentPageText}</div>
                </div>

                <div
                  style={{
                    padding: "1rem",
                    background: "rgba(224, 160, 69, 0.06)",
                    borderRadius: "var(--radius-card)",
                    border: `1px solid ${themeStyles.accent}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.72rem",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      color: themeStyles.accent,
                      display: "block",
                      marginBottom: "0.4rem",
                    }}
                  >
                    Офлайн-перевод (ИИ):
                  </span>
                  <div style={{ whiteSpace: "pre-wrap", color: themeStyles.text }}>{translatedCurrentPage}</div>
                </div>
              </div>
            ) : (
              /* Single Page View */
              <div style={{ whiteSpace: "pre-wrap", color: themeStyles.text }}>
                {pageViewMode === "translated" && translatedCurrentPage
                  ? translatedCurrentPage
                  : currentPageText}
              </div>
            )}
          </div>
        </div>

        {/* AI Assistant Offline Drawer (Right) */}
        {showAi && (
          <aside
            style={{
              width: "min(380px, 95%)",
              background: "var(--color-raise)",
              borderLeft: `1px solid ${themeStyles.border}`,
              display: "flex",
              flexDirection: "column",
              zIndex: 20,
              boxShadow: "-4px 0 16px rgba(0,0,0,0.25)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "0.8rem 1rem",
                borderBottom: `1px solid ${themeStyles.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Sparkles size={16} color="var(--color-lamp)" />
                <strong style={{ fontSize: "0.95rem" }}>
                  ИИ-Анализ активной главы
                </strong>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowAi(false)}
                style={{ minHeight: "1.8rem", minWidth: "1.8rem" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* AI Tabs */}
            <div
              style={{
                display: "flex",
                borderBottom: `1px solid ${themeStyles.border}`,
                background: "rgba(0,0,0,0.15)",
              }}
            >
              <button
                type="button"
                className={`text-btn ${aiTab === "summary" ? "active" : ""}`}
                style={{ flex: 1, fontSize: "0.78rem", minHeight: "2.1rem", border: "none" }}
                onClick={() => setAiTab("summary")}
              >
                Суть
              </button>
              <button
                type="button"
                className={`text-btn ${aiTab === "plan" ? "active" : ""}`}
                style={{ flex: 1, fontSize: "0.78rem", minHeight: "2.1rem", border: "none" }}
                onClick={() => setAiTab("plan")}
              >
                Шаги
              </button>
              <button
                type="button"
                className={`text-btn ${aiTab === "warnings" ? "active" : ""}`}
                style={{ flex: 1, fontSize: "0.78rem", minHeight: "2.1rem", border: "none" }}
                onClick={() => setAiTab("warnings")}
              >
                Опасности
              </button>
              <button
                type="button"
                className={`text-btn ${aiTab === "ask" ? "active" : ""}`}
                style={{ flex: 1, fontSize: "0.78rem", minHeight: "2.1rem", border: "none" }}
                onClick={() => setAiTab("ask")}
              >
                Поиск
              </button>
            </div>

            {/* AI Tab Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
              {chapterAnalysis && aiTab === "summary" && (
                <div>
                  <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.9rem" }}>Главные тезисы главы:</h4>
                  <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.85rem" }}>
                    {chapterAnalysis.keyPoints.map((kp, idx) => (
                      <li key={idx} style={{ marginBottom: "0.4rem" }}>
                        {kp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {chapterAnalysis && aiTab === "plan" && (
                <div>
                  <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.9rem" }}>Практические действия:</h4>
                  <ol style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.85rem" }}>
                    {chapterAnalysis.actionSteps.map((step, idx) => (
                      <li key={idx} style={{ marginBottom: "0.4rem" }}>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {chapterAnalysis && aiTab === "warnings" && (
                <div>
                  <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.9rem", color: "var(--color-lamp)" }}>
                    ⚠️ Запреты и риски:
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.85rem" }}>
                    {chapterAnalysis.warnings.map((warn, idx) => (
                      <li key={idx} style={{ marginBottom: "0.4rem" }}>
                        {warn}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiTab === "ask" && (
                <div>
                  <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.9rem" }}>Задать вопрос по главе:</h4>
                  <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.8rem" }}>
                    <input
                      type="text"
                      placeholder="Например: как фильтровать..."
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRunAiQuery()}
                      style={{ flex: 1, padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}
                    />
                    <button
                      type="button"
                      className="text-btn"
                      onClick={handleRunAiQuery}
                      style={{ padding: "0.4rem 0.75rem", fontSize: "0.85rem" }}
                    >
                      Найти
                    </button>
                  </div>
                  {aiResult && (
                    <div
                      style={{
                        padding: "0.75rem",
                        borderRadius: "var(--radius-card)",
                        background: "rgba(0,0,0,0.25)",
                        border: `1px solid ${themeStyles.border}`,
                        fontSize: "0.85rem",
                      }}
                    >
                      <p style={{ margin: 0 }}>{aiResult.text}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Bottom Sticky Page Navigation Bar — Single Compact Mobile Row */}
      <footer
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "3.4rem",
          background: themeStyles.headerBg,
          borderTop: `1px solid ${themeStyles.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 0.5rem",
          zIndex: 30,
          boxShadow: "0 -4px 12px rgba(0,0,0,0.25)",
          flexWrap: "nowrap",
          gap: "0.25rem",
          boxSizing: "border-box",
        }}
      >
        {/* Left: Previous Chapter (ChevronsLeft) + Previous Page (ChevronLeft) */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", flexShrink: 0 }}>
          <button
            type="button"
            className="icon-btn"
            disabled={currentChapterIndex === 0}
            onClick={handlePrevChapter}
            style={{
              minHeight: "2.3rem",
              minWidth: "2.3rem",
              padding: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "var(--radius-card)",
              opacity: currentChapterIndex === 0 ? 0.35 : 1,
            }}
            title="Предыдущая глава"
          >
            <ChevronsLeft size={18} />
          </button>
          <button
            type="button"
            className="chip"
            data-on="1"
            disabled={currentChapterIndex === 0 && clampedPage === 1}
            onClick={handlePrevPage}
            style={{
              minHeight: "2.3rem",
              minWidth: "2.4rem",
              padding: "0 0.4rem",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "var(--radius-card)",
              opacity: currentChapterIndex === 0 && clampedPage === 1 ? 0.35 : 1,
            }}
            title="Предыдущая страница"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Center: Compact single-line indicator with mini range scrubber */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            minWidth: 0,
            padding: "0 0.2rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "0.25rem",
              fontSize: "0.82rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "100%",
            }}
          >
            <span style={{ fontWeight: 700, color: themeStyles.accent }}>
              Стр. {clampedPage}/{chapterPages.length}
            </span>
            <span
              className="meta"
              style={{
                fontSize: "0.72rem",
                color: themeStyles.text,
                opacity: 0.75,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              · Гл. {currentChapterIndex + 1}/{chapters.length}
            </span>
          </div>

          {/* Quick Page Scrub Slider */}
          {chapterPages.length > 1 && (
            <input
              type="range"
              min={1}
              max={chapterPages.length}
              value={clampedPage}
              onChange={(e) => setPageInChapter(parseInt(e.target.value, 10))}
              style={{
                width: "100%",
                maxWidth: "11rem",
                height: "3px",
                marginTop: "0.15rem",
                accentColor: themeStyles.accent,
                cursor: "pointer",
              }}
              aria-label="Перелистывание страниц"
            />
          )}
        </div>

        {/* Right: Next Page (ChevronRight) + Next Chapter (ChevronsRight) */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", flexShrink: 0 }}>
          <button
            type="button"
            className="chip"
            data-on="1"
            disabled={
              currentChapterIndex === chapters.length - 1 &&
              clampedPage === chapterPages.length
            }
            onClick={handleNextPage}
            style={{
              minHeight: "2.3rem",
              minWidth: "2.4rem",
              padding: "0 0.4rem",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "var(--radius-card)",
              opacity:
                currentChapterIndex === chapters.length - 1 &&
                clampedPage === chapterPages.length
                  ? 0.35
                  : 1,
            }}
            title="Следующая страница"
          >
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            className="icon-btn"
            disabled={currentChapterIndex === chapters.length - 1}
            onClick={handleNextChapter}
            style={{
              minHeight: "2.3rem",
              minWidth: "2.3rem",
              padding: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "var(--radius-card)",
              opacity: currentChapterIndex === chapters.length - 1 ? 0.35 : 1,
            }}
            title="Следующая глава"
          >
            <ChevronsRight size={18} />
          </button>
        </div>
      </footer>
    </div>
  );
}
