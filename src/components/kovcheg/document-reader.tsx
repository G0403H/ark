import { useState, useMemo, useEffect } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Globe,
  HelpCircle,
  Layers,
  ListOrdered,
  Search,
  Sparkles,
  Type,
  X,
  ZoomIn,
  ZoomOut,
  Sliders,
  Palette,
  Loader2,
} from "lucide-react";
import type { IngestedDoc, ReaderBookmark } from "@/lib/kovcheg/store";
import { useArk } from "@/lib/kovcheg/store";
import { t, type Language } from "@/lib/kovcheg/i18n";
import { aboutIodine, asksDose, mushroomQuestion, refusalReason } from "@/lib/kovcheg/search";
import { translatePageOffline } from "@/lib/kovcheg/models/page-translator";

interface ChapterItem {
  id: string;
  title: string;
  page: number;
}

// Splits raw text into readable pages (~2200 characters), breaking on paragraphs/sentences
function paginateText(text: string, maxCharsPerPage = 2200): string[] {
  if (!text || text.length <= maxCharsPerPage) {
    return [text || "Пустой документ"];
  }

  const pages: string[] = [];
  const paragraphs = text.split(/\n\s*\n/);
  let currentPage = "";

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (currentPage.length + trimmed.length <= maxCharsPerPage) {
      currentPage = currentPage ? `${currentPage}\n\n${trimmed}` : trimmed;
    } else {
      if (trimmed.length > maxCharsPerPage) {
        if (currentPage) {
          pages.push(currentPage);
          currentPage = "";
        }
        const sentences = trimmed.split(/(?<=[.?!])\s+/);
        for (const sent of sentences) {
          if (currentPage.length + sent.length <= maxCharsPerPage) {
            currentPage = currentPage ? `${currentPage} ${sent}` : sent;
          } else {
            if (currentPage) pages.push(currentPage);
            currentPage = sent;
          }
        }
      } else {
        if (currentPage) pages.push(currentPage);
        currentPage = trimmed;
      }
    }
  }

  if (currentPage) {
    pages.push(currentPage);
  }

  return pages.length > 0 ? pages : [text];
}

function extractChapters(pages: string[]): ChapterItem[] {
  const chapters: ChapterItem[] = [];
  const chapterRegex = /^(?:#+\s+|Глава\s+|Часть\s+|Раздел\s+|Chapter\s+|Section\s+|الفصل\s+)([^\n\r]{2,80})/im;

  pages.forEach((pageText, pageIndex) => {
    const lines = pageText.split("\n");
    for (const line of lines) {
      const match = line.match(chapterRegex);
      if (match) {
        const title = line.replace(/^#+\s*/, "").trim();
        if (!chapters.some((c) => c.page === pageIndex + 1 && c.title === title)) {
          chapters.push({
            id: `${pageIndex + 1}-${title.slice(0, 20)}`,
            title,
            page: pageIndex + 1,
          });
        }
      }
    }
  });

  return chapters;
}

export function DocumentReaderModal({
  doc,
  lang,
  onClose,
}: {
  doc: IngestedDoc;
  lang: Language;
  onClose: () => void;
}) {
  const [viewMode, setViewMode] = useState<"paged" | "native">(
    doc.type === "pdf" || doc.type === "html" ? "native" : "paged",
  );
  const [fontSize, setFontSize] = useState<number>(1.05);
  const [fontFamily, setFontFamily] = useState<"serif" | "sans">("serif");
  const [readerTheme, setReaderTheme] = useState<"paper" | "shelter" | "stalker">("shelter");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showToc, setShowToc] = useState<boolean>(false);
  const [showBookmarks, setShowBookmarks] = useState<boolean>(false);
  const [jumpPageInput, setJumpPageInput] = useState<string>("");
  const [showJumpDialog, setShowJumpDialog] = useState<boolean>(false);

  // Translation state (On-the-fly offline AI page translation)
  const [translatedPages, setTranslatedPages] = useState<Record<string, string>>({});
  const [translationTargetLang, setTranslationTargetLang] = useState<"ru" | "en" | "ar">(
    lang === "ru" ? "ru" : lang === "ar" ? "ar" : "en"
  );
  const [pageViewMode, setPageViewMode] = useState<"original" | "translated" | "dual">("original");
  const [isTranslating, setIsTranslating] = useState<boolean>(false);

  // AI Assistant Drawer
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

  const textToDisplay = doc.fullText || doc.textExcerpt || "Нет текстового содержимого";

  // Paginated chunks & chapters
  const pages = useMemo(() => paginateText(textToDisplay, 2200), [textToDisplay]);
  const chapters = useMemo(() => extractChapters(pages), [pages]);
  const totalPages = pages.length;

  const docBookmarks = useMemo(
    () => readerBookmarks.filter((b) => b.docId === doc.id),
    [readerBookmarks, doc.id]
  );
  const isCurrentPageBookmarked = docBookmarks.some((b) => b.page === currentPage);

  // Precomputed analysis
  const analysis = useMemo(() => {
    return runDocumentAnalysis(textToDisplay, lang);
  }, [textToDisplay, lang]);

  // Current page content
  const currentPageText = pages[currentPage - 1] || "";
  const cacheKey = `${doc.id}_p${currentPage}_${translationTargetLang}`;
  const translatedCurrentPage = translatedPages[cacheKey];

  // Current chapter title if applicable
  const currentChapter = useMemo(() => {
    return [...chapters].reverse().find((c) => c.page <= currentPage);
  }, [chapters, currentPage]);

  // Keyboard navigation for page flipping
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") {
        setCurrentPage((p) => Math.max(1, p - 1));
      } else if (e.key === "ArrowRight") {
        setCurrentPage((p) => Math.min(totalPages, p + 1));
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [totalPages]);

  function handleToggleBookmark() {
    const existing = docBookmarks.find((b) => b.page === currentPage);
    if (existing) {
      removeReaderBookmark(existing.id);
    } else {
      const excerpt = currentPageText.slice(0, 140).replace(/\n/g, " ") + "...";
      addReaderBookmark({
        id: `${doc.id}_p${currentPage}_${Date.now()}`,
        docId: doc.id,
        docName: doc.name,
        page: currentPage,
        chapterTitle: currentChapter?.title,
        textExcerpt: excerpt,
        created: Date.now(),
      });
    }
  }

  async function handleTranslatePage() {
    if (translatedCurrentPage) {
      setPageViewMode((prev) => (prev === "translated" ? "original" : "translated"));
      return;
    }

    setIsTranslating(true);
    try {
      const result = await translatePageOffline(
        currentPageText,
        (doc as any).lang || (lang === "ru" ? "en" : "ru"),
        translationTargetLang
      );
      setTranslatedPages((prev) => ({ ...prev, [cacheKey]: result }));
      setPageViewMode("translated");
    } catch (err) {
      console.error("Translation error:", err);
    } finally {
      setIsTranslating(false);
    }
  }

  function handleJumpToPage(e: React.FormEvent) {
    e.preventDefault();
    const target = parseInt(jumpPageInput, 10);
    if (!isNaN(target) && target >= 1 && target <= totalPages) {
      setCurrentPage(target);
      setShowJumpDialog(false);
      setJumpPageInput("");
    }
  }

  function handleAiAsk(queryText?: string) {
    const q = (queryText ?? aiQuery).trim();
    if (!q) return;
    const res = answerFromDocText(q, textToDisplay, lang);
    setAiResult(res);
  }

  // Reader theme colors
  let themeBg = "var(--color-bg)";
  let themeFg = "var(--color-fg)";
  if (readerTheme === "paper") {
    themeBg = "#fbf9f4";
    themeFg = "#1c1917";
  } else if (readerTheme === "stalker") {
    themeBg = "#0d120a";
    themeFg = "#d2e4cb";
  }

  return (
    <div
      className="reader-modal"
      role="dialog"
      aria-modal="true"
      aria-label={doc.name}
      style={{ background: themeBg, color: themeFg }}
    >
      {/* Reader Top Bar */}
      <header className="reader-header" style={{ background: "var(--color-raise)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: 0 }}>
          <button type="button" className="icon-btn" onClick={onClose} title={t("closeReader", lang)}>
            <ArrowLeft size={18} aria-hidden />
          </button>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {doc.name}
            </h2>
            <div style={{ fontSize: "0.72rem", color: "var(--color-muted)", display: "flex", gap: "0.4rem" }}>
              <span>{doc.type.toUpperCase()}</span>
              <span>·</span>
              <span>{(doc.size / 1024).toFixed(0)} КБ</span>
              {currentChapter && (
                <>
                  <span>·</span>
                  <span style={{ color: "var(--color-lamp)", fontWeight: 600 }}>{currentChapter.title}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Reader Header Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          {/* Table of Contents button */}
          <button
            type="button"
            className={`chip ${showToc ? "chip-active" : ""}`}
            data-on={showToc ? "1" : "0"}
            onClick={() => { setShowToc((v) => !v); setShowBookmarks(false); }}
            title="Оглавление (по главам)"
          >
            <ListOrdered size={15} style={{ marginRight: 3 }} />
            <span className="hide-sm">Главы ({chapters.length || 1})</span>
          </button>

          {/* Bookmarks button */}
          <button
            type="button"
            className={`chip ${showBookmarks ? "chip-active" : ""}`}
            data-on={showBookmarks ? "1" : "0"}
            onClick={() => { setShowBookmarks((v) => !v); setShowToc(false); }}
            title="Закладки"
          >
            <Bookmark size={15} style={{ marginRight: 3 }} />
            <span className="hide-sm">Закладки ({docBookmarks.length})</span>
          </button>

          {/* Bookmark Current Page */}
          <button
            type="button"
            className="icon-btn"
            onClick={handleToggleBookmark}
            title={isCurrentPageBookmarked ? "Удалить закладку со страницы" : "Добавить закладку на страницу"}
            style={{ color: isCurrentPageBookmarked ? "#f59e0b" : "var(--color-muted)" }}
          >
            {isCurrentPageBookmarked ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
          </button>

          {/* AI Helper Toggle */}
          <button
            type="button"
            className="text-btn"
            style={{
              background: showAi ? "var(--color-lamp)" : "var(--color-raise)",
              color: showAi ? "var(--color-ink)" : "var(--color-fg)",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              borderColor: "var(--color-lamp)",
              padding: "0.25rem 0.55rem",
              minHeight: "2.2rem",
            }}
            onClick={() => setShowAi((prev) => !prev)}
            title={t("readerAiTitle", lang)}
          >
            <Sparkles size={15} />
            <span className="hide-sm">{t("readerAiBtn", lang)}</span>
          </button>

          {/* Native vs Paged Mode Toggle for PDF/HTML */}
          {(doc.type === "pdf" || doc.type === "html") && doc.dataUrl && (
            <button
              type="button"
              className="text-btn"
              onClick={() => setViewMode(viewMode === "native" ? "paged" : "native")}
              style={{ minHeight: "2.2rem", padding: "0.2rem 0.5rem" }}
            >
              {viewMode === "native" ? "Текст" : "Оригинал"}
            </button>
          )}
        </div>
      </header>

      {/* Reader Sub-Toolbar: Translation & Typography Controls */}
      {viewMode === "paged" && (
        <div
          style={{
            padding: "0.4rem 0.8rem",
            borderBottom: "1px solid var(--color-line)",
            background: "var(--color-raise)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.4rem",
          }}
        >
          {/* On-the-fly AI Translation Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className={`chip ${isTranslating ? "chip-active" : ""}`}
              onClick={handleTranslatePage}
              disabled={isTranslating}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                fontWeight: 700,
                color: pageViewMode === "translated" ? "var(--color-lamp)" : undefined,
                borderColor: pageViewMode === "translated" ? "var(--color-lamp)" : undefined,
              }}
              title="Перевести текущую страницу с помощью офлайн-ИИ"
            >
              {isTranslating ? <Loader2 size={14} className="spin" /> : <Globe size={14} />}
              <span>{isTranslating ? "Перевод..." : pageViewMode === "translated" ? "Оригинал" : "Перевести страницу (ИИ)"}</span>
            </button>

            {translatedCurrentPage && (
              <button
                type="button"
                className="chip"
                onClick={() => setPageViewMode((m) => (m === "dual" ? "translated" : "dual"))}
                style={{ fontSize: "0.74rem" }}
                title="Параллельный просмотр оригинала и перевода"
              >
                {pageViewMode === "dual" ? "Одна колонка" : "Двуязычный вид"}
              </button>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.75rem", color: "var(--color-muted)" }}>
              <span>На:</span>
              {(["ru", "en", "ar"] as const).map((lcode) => (
                <button
                  key={lcode}
                  type="button"
                  onClick={() => setTranslationTargetLang(lcode)}
                  style={{
                    border: "none",
                    background: translationTargetLang === lcode ? "var(--color-lamp)" : "transparent",
                    color: translationTargetLang === lcode ? "#000" : "var(--color-muted)",
                    fontWeight: 700,
                    borderRadius: "3px",
                    padding: "0.1rem 0.35rem",
                    cursor: "pointer",
                    fontSize: "0.72rem",
                  }}
                >
                  {lcode.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Typography & Theme Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            {/* Font Family Toggle */}
            <button
              type="button"
              className="icon-btn"
              style={{ minHeight: "2rem", padding: "0.15rem 0.4rem" }}
              onClick={() => setFontFamily((f) => (f === "serif" ? "sans" : "serif"))}
              title={fontFamily === "serif" ? "Шрифт с засечками (Literata)" : "Шрифт без засечек"}
            >
              <Type size={14} />
            </button>

            {/* Font Zoom */}
            <button
              type="button"
              className="icon-btn"
              style={{ minHeight: "2rem", padding: "0.15rem 0.4rem" }}
              onClick={() => setFontSize((s) => Math.max(0.85, s - 0.1))}
              title="Уменьшить шрифт"
            >
              <ZoomOut size={14} />
            </button>
            <button
              type="button"
              className="icon-btn"
              style={{ minHeight: "2rem", padding: "0.15rem 0.4rem" }}
              onClick={() => setFontSize((s) => Math.min(1.5, s + 0.1))}
              title="Увеличить шрифт"
            >
              <ZoomIn size={14} />
            </button>

            {/* Reader Theme Toggle */}
            <button
              type="button"
              className="icon-btn"
              style={{ minHeight: "2rem", padding: "0.15rem 0.4rem" }}
              onClick={() => {
                if (readerTheme === "shelter") setReaderTheme("paper");
                else if (readerTheme === "paper") setReaderTheme("stalker");
                else setReaderTheme("shelter");
              }}
              title="Тема читалки (Убежище / Бумага / Сталкер)"
            >
              <Palette size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Main Layout Area: Content + Drawers */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
        {/* Table of Contents Drawer */}
        {showToc && (
          <aside
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: "min(320px, 90vw)",
              background: "var(--color-raise)",
              borderRight: "1.5px solid var(--color-line)",
              zIndex: 30,
              boxShadow: "8px 0 20px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--color-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: "0.92rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <ListOrdered size={16} /> Оглавление
              </strong>
              <button type="button" onClick={() => setShowToc(false)} style={{ background: "none", border: "none", color: "var(--color-muted)", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0.6rem" }}>
              {chapters.length === 0 ? (
                <p className="quiet" style={{ fontSize: "0.82rem", padding: "0.5rem" }}>
                  Явных глав не обнаружено. Листайте по страницам.
                </p>
              ) : (
                chapters.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => { setCurrentPage(ch.page); setShowToc(false); }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "0.6rem 0.75rem",
                      borderRadius: "var(--radius-card)",
                      background: currentPage >= ch.page && (!chapters.find((nextCh) => nextCh.page > ch.page && nextCh.page <= currentPage)) ? "var(--color-line)" : "transparent",
                      border: "none",
                      color: "var(--color-fg)",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontSize: "0.84rem",
                      marginBottom: "0.2rem",
                    }}
                  >
                    <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ch.title}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "var(--color-muted)", flexShrink: 0 }}>
                      Стр. {ch.page}
                    </span>
                  </button>
                ))
              )}
            </div>
          </aside>
        )}

        {/* Bookmarks Drawer */}
        {showBookmarks && (
          <aside
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: "min(320px, 90vw)",
              background: "var(--color-raise)",
              borderRight: "1.5px solid var(--color-line)",
              zIndex: 30,
              boxShadow: "8px 0 20px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--color-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: "0.92rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Bookmark size={16} color="#f59e0b" /> Закладки книги
              </strong>
              <button type="button" onClick={() => setShowBookmarks(false)} style={{ background: "none", border: "none", color: "var(--color-muted)", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0.6rem" }}>
              {docBookmarks.length === 0 ? (
                <div style={{ padding: "1rem", textAlign: "center", color: "var(--color-muted)", fontSize: "0.82rem" }}>
                  Закладок пока нет. Нажмите на значок флажка вверху, чтобы сохранить текущую страницу.
                </div>
              ) : (
                docBookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    style={{
                      padding: "0.6rem 0.75rem",
                      borderRadius: "var(--radius-card)",
                      background: "var(--color-line)",
                      marginBottom: "0.4rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.2rem" }}>
                      <strong style={{ fontSize: "0.84rem", color: "var(--color-lamp)" }}>
                        Страница {bm.page}
                      </strong>
                      <button
                        type="button"
                        onClick={() => removeReaderBookmark(bm.id)}
                        style={{ background: "none", border: "none", color: "var(--color-muted)", cursor: "pointer", fontSize: "0.75rem" }}
                      >
                        Удалить
                      </button>
                    </div>
                    {bm.chapterTitle && (
                      <div style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginBottom: "0.2rem" }}>
                        {bm.chapterTitle}
                      </div>
                    )}
                    <p
                      style={{ margin: 0, fontSize: "0.78rem", color: "var(--color-fg)", cursor: "pointer", lineHeight: 1.35 }}
                      onClick={() => { setCurrentPage(bm.page); setShowBookmarks(false); }}
                      title="Перейти к странице"
                    >
                      {bm.textExcerpt}
                    </p>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}

        {/* Reader Center Content */}
        <div className="reader-content" style={{ flex: 1, minWidth: 0, padding: "1.2rem 1.4rem", overflowY: "auto" }}>
          {viewMode === "native" && doc.dataUrl ? (
            <iframe
              src={doc.dataUrl}
              title={doc.name}
              style={{
                width: "100%",
                height: "calc(100vh - 7rem)",
                border: "none",
                borderRadius: "var(--radius-card)",
                background: "#fff",
              }}
            />
          ) : (
            <div
              style={{
                fontSize: `${fontSize}rem`,
                lineHeight: 1.8,
                wordBreak: "break-word",
                fontFamily: fontFamily === "serif" ? "var(--font-serif)" : "var(--font-sans)",
                maxWidth: "46rem",
                margin: "0 auto",
              }}
            >
              {/* Dual View (Parallel original + translation) */}
              {pageViewMode === "dual" && translatedCurrentPage ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                  <div style={{ padding: "0.8rem", background: "color-mix(in srgb, var(--color-line) 30%, transparent)", borderRadius: "var(--radius-card)" }}>
                    <span style={{ fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 700, color: "var(--color-muted)", display: "block", marginBottom: "0.4rem" }}>
                      Оригинал:
                    </span>
                    <div style={{ whiteSpace: "pre-wrap" }}>{currentPageText}</div>
                  </div>
                  <div style={{ padding: "0.8rem", background: "color-mix(in srgb, var(--color-lamp) 10%, transparent)", borderRadius: "var(--radius-card)", border: "1px solid var(--color-lamp)" }}>
                    <span style={{ fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 700, color: "var(--color-lamp)", display: "block", marginBottom: "0.4rem" }}>
                      Офлайн-перевод (ИИ):
                    </span>
                    <div style={{ whiteSpace: "pre-wrap" }}>{translatedCurrentPage}</div>
                  </div>
                </div>
              ) : (
                /* Single View: Either translated page or original */
                <div style={{ whiteSpace: "pre-wrap" }}>
                  {pageViewMode === "translated" && translatedCurrentPage
                    ? translatedCurrentPage
                    : currentPageText}
                </div>
              )}
            </div>
          )}
        </div>

        {/* AI Assistant Offline Panel (Right Side) */}
        {showAi && (
          <aside
            style={{
              width: "min(400px, 100%)",
              background: "var(--color-raise)",
              borderLeft: "1px solid var(--color-line)",
              display: "flex",
              flexDirection: "column",
              zIndex: 25,
              boxShadow: "-4px 0 16px rgba(0,0,0,0.12)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "0.8rem 1rem", borderBottom: "1px solid var(--color-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Sparkles size={18} color="var(--color-lamp)" />
                <strong style={{ fontSize: "0.95rem" }}>{t("readerAiTitle", lang)}</strong>
              </div>
              <button type="button" className="icon-btn" style={{ minHeight: "2rem", padding: "0.2rem 0.5rem" }} onClick={() => setShowAi(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: "flex", borderBottom: "1px solid var(--color-line)", background: "var(--color-raise)" }}>
              {(["summary", "plan", "warnings", "ask"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  style={{
                    flex: 1,
                    padding: "0.5rem 0.2rem",
                    border: "none",
                    background: aiTab === tab ? "var(--color-line)" : "transparent",
                    color: aiTab === tab ? "var(--color-lamp)" : "var(--color-muted)",
                    fontWeight: aiTab === tab ? 700 : 500,
                    fontSize: "0.78rem",
                    cursor: "pointer",
                  }}
                  onClick={() => setAiTab(tab)}
                >
                  {tab === "summary" && "Суть"}
                  {tab === "plan" && "Шаги"}
                  {tab === "warnings" && "Опасно"}
                  {tab === "ask" && "Вопрос"}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
              {aiTab === "summary" && (
                <div>
                  <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.9rem" }}>Главные тезисы документа</h4>
                  <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.85rem", lineHeight: 1.5 }}>
                    {analysis.keyPoints.map((pt, i) => (
                      <li key={i} style={{ marginBottom: "0.4rem" }}>{pt}</li>
                    ))}
                  </ul>
                </div>
              )}
              {aiTab === "plan" && (
                <div>
                  <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.9rem" }}>Алгоритм действий</h4>
                  <ol style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.85rem", lineHeight: 1.5 }}>
                    {analysis.actionSteps.map((st, i) => (
                      <li key={i} style={{ marginBottom: "0.4rem" }}>{st}</li>
                    ))}
                  </ol>
                </div>
              )}
              {aiTab === "warnings" && (
                <div>
                  <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.9rem", color: "var(--color-alarm)" }}>Предостережения и риски</h4>
                  <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.85rem", lineHeight: 1.5, color: "var(--color-alarm)" }}>
                    {analysis.warnings.map((w, i) => (
                      <li key={i} style={{ marginBottom: "0.4rem" }}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
              {aiTab === "ask" && (
                <div>
                  <form onSubmit={(e) => { e.preventDefault(); handleAiAsk(); }} style={{ marginBottom: "0.8rem" }}>
                    <input
                      type="text"
                      className="search-field"
                      placeholder="Задайте вопрос по тексту..."
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                      style={{ padding: "0.4rem 0.6rem", fontSize: "0.85rem", marginBottom: "0.4rem" }}
                    />
                    <button type="submit" className="text-btn" style={{ width: "100%", fontSize: "0.85rem", padding: "0.4rem" }}>
                      Спросить
                    </button>
                  </form>
                  {aiResult && (
                    <div style={{ padding: "0.75rem", background: "var(--color-line)", borderRadius: "var(--radius-card)", fontSize: "0.85rem", lineHeight: 1.5 }}>
                      {aiResult.text}
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Reader Bottom Pagination Bar */}
      {viewMode === "paged" && (
        <footer
          style={{
            padding: "0.5rem 1rem",
            borderTop: "1px solid var(--color-line)",
            background: "var(--color-raise)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.8rem",
          }}
        >
          {/* Previous Page */}
          <button
            type="button"
            className="chip"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            style={{ opacity: currentPage <= 1 ? 0.4 : 1, display: "flex", alignItems: "center", gap: 3 }}
          >
            <ChevronLeft size={16} />
            <span className="hide-sm">Предыдущая</span>
          </button>

          {/* Page Indicator & Fast Jump */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {!showJumpDialog ? (
              <button
                type="button"
                onClick={() => { setShowJumpDialog(true); setJumpPageInput(String(currentPage)); }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--color-fg)",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  padding: "0.2rem 0.5rem",
                  borderRadius: "4px",
                }}
                title="Нажмите, чтобы ввести номер страницы"
              >
                Стр. {currentPage} из {totalPages} ({Math.round((currentPage / totalPages) * 100)}%)
              </button>
            ) : (
              <form onSubmit={handleJumpToPage} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={jumpPageInput}
                  onChange={(e) => setJumpPageInput(e.target.value)}
                  autoFocus
                  style={{
                    width: "4rem",
                    padding: "0.2rem 0.4rem",
                    fontSize: "0.82rem",
                    borderRadius: "4px",
                    border: "1px solid var(--color-line)",
                    background: "var(--color-bg)",
                    color: "var(--color-fg)",
                    textAlign: "center",
                  }}
                />
                <button type="submit" className="chip" style={{ minHeight: "1.8rem", padding: "0.1rem 0.4rem" }}>
                  Перейти
                </button>
              </form>
            )}
          </div>

          {/* Next Page */}
          <button
            type="button"
            className="chip"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            style={{ opacity: currentPage >= totalPages ? 0.4 : 1, display: "flex", alignItems: "center", gap: 3 }}
          >
            <span className="hide-sm">Следующая</span>
            <ChevronRight size={16} />
          </button>
        </footer>
      )}
    </div>
  );
}

// ----------------- OFFLINE AI ANALYSIS ENGINE -----------------

function runDocumentAnalysis(text: string, lang: Language) {
  const paragraphs = text
    .split(/\n{2,}|\r\n\r\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20);

  const words = text.split(/\s+/).filter(Boolean);

  const keyPoints: string[] = [];
  for (const p of paragraphs.slice(0, 10)) {
    const firstSentence = p.split(/[.!?]\s+/)[0];
    if (firstSentence && firstSentence.length > 25 && firstSentence.length < 200) {
      keyPoints.push(firstSentence.trim() + ".");
      if (keyPoints.length >= 4) break;
    }
  }
  if (keyPoints.length === 0 && paragraphs[0]) {
    keyPoints.push(paragraphs[0].slice(0, 180) + "…");
  }

  const actionSteps: string[] = [];
  const actionRegex =
    /(?:^|\n)\s*(?:(?:\d+\.|\*|-|•|Шаг \d+:?|Step \d+:?)\s+)?([А-ЯA-Z\u0600-\u06FF][^.\n]{15,180}\b(?:промыть|наложить|очистить|завязать|собрать|проверить|утеплить|вскипятить|зафиксировать|остановить|найти|prepare|clean|apply|secure|boil|check|find)[^.\n]*[.!?]?)/gi;

  let match: RegExpExecArray | null;
  while ((match = actionRegex.exec(text)) !== null) {
    const step = match[1].trim();
    if (step.length > 15 && !actionSteps.includes(step)) {
      actionSteps.push(step);
      if (actionSteps.length >= 5) break;
    }
  }
  if (actionSteps.length === 0) {
    actionSteps.push("Соблюдать покой, следовать инструкциям и контролировать дыхание.");
  }

  const warnings: string[] = [];
  const dangerRegex =
    /(?:^|\n)\s*(?:Внимание|Опасно|Запрещено|Не делать|Нельзя|Warning|Caution|Danger|Do not|لا تفعل|تحذير)[:\s]+([^.\n]{15,200}[.!?]?)/gi;

  while ((match = dangerRegex.exec(text)) !== null) {
    const w = match[1].trim();
    if (w.length > 15 && !warnings.includes(w)) {
      warnings.push(w);
      if (warnings.length >= 4) break;
    }
  }
  if (warnings.length === 0) {
    warnings.push("Не предпринимать рискованных действий без предварительной оценки обстановки.");
  }

  return {
    keyPoints,
    actionSteps,
    warnings,
  };
}

function answerFromDocText(query: string, text: string, lang: Language) {
  const refusal = refusalReason(query);
  if (refusal) return { text: refusal, citations: [] };

  const qWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const paragraphs = text.split(/\n{2,}|\r\n\r\n/).map((p) => p.trim());

  let bestPara = "";
  let maxMatches = 0;

  for (const para of paragraphs) {
    const lower = para.toLowerCase();
    const count = qWords.reduce((acc, word) => acc + (lower.includes(word) ? 1 : 0), 0);
    if (count > maxMatches) {
      maxMatches = count;
      bestPara = para;
    }
  }

  if (maxMatches === 0 || !bestPara) {
    return {
      text: lang === "ru" ? "В данном документе прямого ответа не найдено." : "No direct answer found in this document.",
      citations: [],
    };
  }

  return {
    text: bestPara.slice(0, 600),
    citations: [bestPara.slice(0, 80)],
  };
}
