import { useState, useMemo, useEffect, useRef } from "react";
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
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

  // Theme styling definitions
  const themeStyles = {
    shelter: {
      bg: "var(--color-sink)",
      text: "var(--color-ink)",
      headerBg: "var(--color-raise)",
      border: "var(--color-line)",
    },
    paper: {
      bg: "#faf8f5",
      text: "#1c1917",
      headerBg: "#f5f2eb",
      border: "#e7e2d6",
    },
    stalker: {
      bg: "#0d0f0c",
      text: "#c4cfbc",
      headerBg: "#161b14",
      border: "#252f20",
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
      {/* Top Header Bar */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.6rem 1rem",
          background: themeStyles.headerBg,
          borderBottom: `1px solid ${themeStyles.border}`,
          zIndex: 30,
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0, flex: 1 }}>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            title="Закрыть читалку"
            style={{ minHeight: "2.3rem", minWidth: "2.3rem", borderRadius: "var(--radius-card)" }}
          >
            <ArrowLeft size={18} />
          </button>

          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                fontSize: "1rem",
                margin: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                color: themeStyles.text,
              }}
              title={doc.name}
            >
              {doc.name}
            </h1>
            <span
              className="meta"
              style={{
                fontSize: "0.78rem",
                display: "block",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                color: "var(--color-lamp)",
              }}
            >
              Глава {currentChapterIndex + 1} из {chapters.length}: {activeChapter.title}
            </span>
          </div>
        </div>

        {/* Header Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
          {/* Table of Contents Button */}
          <button
            type="button"
            className="text-btn"
            onClick={() => setShowToc((v) => !v)}
            style={{
              minHeight: "2.2rem",
              padding: "0.2rem 0.6rem",
              fontSize: "0.82rem",
              background: showToc ? "var(--color-lamp)" : "transparent",
              color: showToc ? "var(--color-ink)" : "inherit",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <List size={15} />
            <span>Оглавление ({chapters.length})</span>
          </button>

          {/* Bookmarks list button */}
          <button
            type="button"
            className="icon-btn"
            onClick={() => setShowBookmarks((v) => !v)}
            title="Закладки"
            style={{
              minHeight: "2.2rem",
              minWidth: "2.2rem",
              background: showBookmarks ? "var(--color-lamp)" : "transparent",
              color: showBookmarks ? "var(--color-ink)" : "inherit",
            }}
          >
            <Bookmark size={16} />
          </button>

          {/* Bookmark Current Page */}
          <button
            type="button"
            className="icon-btn"
            onClick={handleToggleBookmark}
            title={isCurrentPageBookmarked ? "Удалить закладку" : "Добавить страницу в закладки"}
            style={{
              minHeight: "2.2rem",
              minWidth: "2.2rem",
              color: isCurrentPageBookmarked ? "var(--color-lamp)" : "inherit",
            }}
          >
            {isCurrentPageBookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
          </button>

          {/* Font Controls */}
          <button
            type="button"
            className="text-btn"
            onClick={() => setFontSize((s) => Math.max(0.85, Number((s - 0.1).toFixed(2))))}
            style={{ minHeight: "2.2rem", padding: "0.2rem 0.5rem", fontSize: "0.85rem" }}
            title="Уменьшить шрифт"
          >
            A−
          </button>
          <button
            type="button"
            className="text-btn"
            onClick={() => setFontSize((s) => Math.min(1.6, Number((s + 0.1).toFixed(2))))}
            style={{ minHeight: "2.2rem", padding: "0.2rem 0.5rem", fontSize: "0.85rem" }}
            title="Увеличить шрифт"
          >
            A+
          </button>

          {/* Serif / Sans Toggle */}
          <button
            type="button"
            className="icon-btn"
            onClick={() => setFontFamily((f) => (f === "serif" ? "sans" : "serif"))}
            title="Сменить гарнитуру (С засечками / Без засечек)"
            style={{ minHeight: "2.2rem", minWidth: "2.2rem" }}
          >
            <Type size={16} />
          </button>

          {/* Reader Theme Toggle */}
          <button
            type="button"
            className="icon-btn"
            onClick={() =>
              setReaderTheme((t) =>
                t === "shelter" ? "paper" : t === "paper" ? "stalker" : "shelter"
              )
            }
            title={`Тема читалщика: ${readerTheme}`}
            style={{ minHeight: "2.2rem", minWidth: "2.2rem" }}
          >
            <Palette size={16} />
          </button>

          {/* AI Chapter Analysis Trigger */}
          <button
            type="button"
            className="text-btn"
            onClick={() => setShowAi((v) => !v)}
            style={{
              minHeight: "2.2rem",
              padding: "0.2rem 0.6rem",
              fontSize: "0.82rem",
              background: showAi ? "var(--color-lamp)" : "transparent",
              color: showAi ? "var(--color-ink)" : "inherit",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Sparkles size={14} />
            <span>ИИ главы</span>
          </button>

          {/* Close button */}
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            title="Закрыть"
            style={{ minHeight: "2.2rem", minWidth: "2.2rem" }}
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Sub-bar: Translation & Mode Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.35rem 1rem",
          background: "rgba(0, 0, 0, 0.4)",
          borderBottom: `1px solid ${themeStyles.border}`,
          fontSize: "0.82rem",
          flexWrap: "wrap",
          gap: "0.4rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className="meta" style={{ fontSize: "0.78rem" }}>
            📖 {activeChapter.title}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          {/* Target translation language */}
          <select
            value={translationTargetLang}
            onChange={(e) => setTranslationTargetLang(e.target.value as any)}
            style={{
              padding: "0.15rem 0.4rem",
              fontSize: "0.78rem",
              borderRadius: "4px",
              background: "var(--color-raise)",
              color: "inherit",
              border: "1px solid var(--color-line)",
            }}
          >
            <option value="ru">Перевод на Русский</option>
            <option value="en">Translate to English</option>
            <option value="ar">الترجمة إلى العربية</option>
          </select>

          <button
            type="button"
            className="text-btn"
            disabled={isTranslating}
            onClick={handleTranslatePage}
            style={{
              padding: "0.15rem 0.5rem",
              fontSize: "0.78rem",
              minHeight: "1.8rem",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {isTranslating ? (
              <>
                <Loader2 size={12} className="spin" />
                <span>Перевод...</span>
              </>
            ) : translatedCurrentPage ? (
              pageViewMode === "translated" ? "Показать оригинал" : "Показать перевод"
            ) : (
              "Перевести страницу (ИИ)"
            )}
          </button>

          {translatedCurrentPage && (
            <button
              type="button"
              className="text-btn"
              onClick={() =>
                setPageViewMode((v) => (v === "dual" ? "original" : "dual"))
              }
              style={{ padding: "0.15rem 0.5rem", fontSize: "0.78rem", minHeight: "1.8rem" }}
            >
              {pageViewMode === "dual" ? "Один текст" : "Оригинал + Перевод"}
            </button>
          )}
        </div>
      </div>

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
                  borderBottom: `2px solid var(--color-lamp)`,
                  paddingBottom: "0.8rem",
                  marginBottom: "1.5rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--color-lamp)",
                    fontWeight: 700,
                  }}
                >
                  Глава {currentChapterIndex + 1} из {chapters.length}
                </span>
                <h2
                  style={{
                    fontSize: "1.5rem",
                    margin: "0.3rem 0 0",
                    color: themeStyles.text,
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
                      color: "var(--color-muted)",
                      display: "block",
                      marginBottom: "0.4rem",
                    }}
                  >
                    Оригинал:
                  </span>
                  <div style={{ whiteSpace: "pre-wrap" }}>{currentPageText}</div>
                </div>

                <div
                  style={{
                    padding: "1rem",
                    background: "rgba(224, 160, 69, 0.06)",
                    borderRadius: "var(--radius-card)",
                    border: "1px solid var(--color-lamp)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.72rem",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      color: "var(--color-lamp)",
                      display: "block",
                      marginBottom: "0.4rem",
                    }}
                  >
                    Офлайн-перевод (ИИ):
                  </span>
                  <div style={{ whiteSpace: "pre-wrap" }}>{translatedCurrentPage}</div>
                </div>
              </div>
            ) : (
              /* Single Page View */
              <div style={{ whiteSpace: "pre-wrap" }}>
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

      {/* Bottom Sticky Page Navigation Bar */}
      <footer
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "4rem",
          background: themeStyles.headerBg,
          borderTop: `1px solid ${themeStyles.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 1rem",
          zIndex: 30,
          boxShadow: "0 -4px 12px rgba(0,0,0,0.2)",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        {/* Left: Previous Chapter & Previous Page */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <button
            type="button"
            className="text-btn"
            disabled={currentChapterIndex === 0}
            onClick={handlePrevChapter}
            style={{ minHeight: "2.3rem", padding: "0.2rem 0.6rem", fontSize: "0.82rem" }}
            title="Предыдущая глава"
          >
            ◀◀ Глава
          </button>
          <button
            type="button"
            className="chip"
            data-on="1"
            disabled={currentChapterIndex === 0 && clampedPage === 1}
            onClick={handlePrevPage}
            style={{
              minHeight: "2.3rem",
              padding: "0.2rem 0.8rem",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <ChevronLeft size={16} />
            <span>Назад</span>
          </button>
        </div>

        {/* Center: Chapter and Page Counter with Range Slider */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: "180px", maxWidth: "26rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem" }}>
            <span style={{ fontWeight: 700, color: "var(--color-lamp)" }}>
              Стр. {clampedPage} из {chapterPages.length}
            </span>
            <span className="meta" style={{ fontSize: "0.75rem" }}>
              (Глава {currentChapterIndex + 1}/{chapters.length} · Всего ~{currentGlobalPage}/{totalGlobalPages} стр.)
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
                maxWidth: "20rem",
                marginTop: "0.2rem",
                accentColor: "var(--color-lamp)",
                cursor: "pointer",
              }}
              aria-label="Перелистывание страниц"
            />
          )}
        </div>

        {/* Right: Next Page & Next Chapter */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
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
              padding: "0.2rem 0.8rem",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>Вперед</span>
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            className="text-btn"
            disabled={currentChapterIndex === chapters.length - 1}
            onClick={handleNextChapter}
            style={{ minHeight: "2.3rem", padding: "0.2rem 0.6rem", fontSize: "0.82rem" }}
            title="Следующая глава"
          >
            Глава ▶▶
          </button>
        </div>
      </footer>
    </div>
  );
}
