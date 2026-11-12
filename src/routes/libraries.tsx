import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BASE_ARTICLES } from "@/lib/kovcheg/corpus";
import {
  corpusBytes,
  fingerprint,
  MODEL_CATALOG,
  ZIM_CATALOG,
} from "@/lib/kovcheg/library";
import {
  parseUploadedFile,
  PRESET_PACKS,
} from "@/lib/kovcheg/importers";
import { useArk, type IngestedDoc } from "@/lib/kovcheg/store";
import { BASE_PACK } from "@/lib/kovcheg/types";
import { t, type Language } from "@/lib/kovcheg/i18n";
import { DocumentReaderModal } from "@/components/kovcheg/document-reader";
import { CodeWordGate } from "@/components/kovcheg/code-word-gate";
import { BookOpen, Download, FileText, Globe, Plus, Sparkles, Trash2, Upload } from "lucide-react";

export const Route = createFileRoute("/libraries")({ component: LibrariesPage });

type BundledBook = {
  id: string;
  name: string;
  lang: "ru" | "en" | "ar";
  type: "html" | "txt";
  path: string;
  sizeKb: number;
  desc: string;
};

const BUNDLED_OFFLINE_BOOKS: BundledBook[] = [
  {
    id: "survival-encyclopedia-ru",
    name: "Большая энциклопедия выживания и полевой медицины «КОВЧЕГ»",
    lang: "ru",
    type: "html",
    path: "/library/survival-encyclopedia-ru.html",
    sizeKb: 10035,
    desc: "Полный полевой справочник: тактическая медицина, очистка и фильтрация воды, укрытия, навигация, РХБЗ и дикоросы.",
  },
  {
    id: "survival-encyclopedia-en",
    name: "Comprehensive Wilderness Survival & Field Trauma Compendium",
    lang: "en",
    type: "html",
    path: "/library/survival-encyclopedia-en.html",
    sizeKb: 10035,
    desc: "Complete field guide: MARCH trauma protocol, water filtration, debris shelters, celestial navigation, and foraging.",
  },
  {
    id: "survival-encyclopedia-ar",
    name: "موسوعة النجاة الميدانية الشاملة وطب الطوارئ «كوفشيج»",
    lang: "ar",
    type: "html",
    path: "/library/survival-encyclopedia-ar.html",
    sizeKb: 10035,
    desc: "دليل شامل للنجاة: الإسعاف الميداني، تحلية وتنقية المياه، الملاجئ، الوقاية النووية، والملاحة الصحراوية.",
  },
  {
    id: "field-medicine-manual-ru",
    name: "Полевая неотложная медицина и травматология",
    lang: "ru",
    type: "txt",
    path: "/library/field-medicine-manual-ru.txt",
    sizeKb: 3174,
    desc: "Остановка критических кровотечений, турникеты, пневмоторакс, шины, шок, гипотермия.",
  },
  {
    id: "field-medicine-manual-en",
    name: "Field Trauma Medicine & Emergency Care Handbook",
    lang: "en",
    type: "txt",
    path: "/library/field-medicine-manual-en.txt",
    sizeKb: 3174,
    desc: "Arterial hemorrhage control, windlass tourniquets, chest decompression, splinting, hypothermia triage.",
  },
  {
    id: "field-medicine-manual-ar",
    name: "دليل طب الطوارئ والإسعافات الميدانية التكتيكية",
    lang: "ar",
    type: "txt",
    path: "/library/field-medicine-manual-ar.txt",
    sizeKb: 3174,
    desc: "السيطرة على النزيف الحاد، العصابة الضاغطة، تثبيت الكسور، ومعالجة الصدمة وحروق الطوارئ.",
  },
  {
    id: "extreme-bushcraft-guide-ru",
    name: "Автономное выживание в тайге, горах и тундре",
    lang: "ru",
    type: "txt",
    path: "/library/extreme-bushcraft-guide-ru.txt",
    sizeKb: 3174,
    desc: "Шалаши из лапника, Дакотский очаг, Нодья, силки, ловушка Цифра-4, съедобные дикоросы.",
  },
  {
    id: "extreme-bushcraft-guide-en",
    name: "Extreme Bushcraft, Shelter Engineering & Trapping",
    lang: "en",
    type: "txt",
    path: "/library/extreme-bushcraft-guide-en.txt",
    sizeKb: 3174,
    desc: "Debris huts, sub-zero snow caves, Dakota fire holes, friction fire, figure-4 deadfall traps.",
  },
  {
    id: "civil-defense-cbrn-ru",
    name: "Гражданская оборона: защита от радиации, ОМП и ЧС",
    lang: "ru",
    type: "txt",
    path: "/library/civil-defense-cbrn-ru.txt",
    sizeKb: 2764,
    desc: "Ядерная вспышка, радиоактивные осадки, закон 7/10, толщина ослабления гамма-лучей, дезактивация.",
  },
  {
    id: "civil-defense-cbrn-en",
    name: "CBRN Defense & Nuclear Fallout Survival Guide",
    lang: "en",
    type: "txt",
    path: "/library/civil-defense-cbrn-en.txt",
    sizeKb: 2764,
    desc: "Flash protocols, fallout radiation decay, shielding halving layers, respiratory defense.",
  },
  {
    id: "civil-defense-cbrn-ar",
    name: "الدفاع المدني والوقاية من الإشعاعات النووية وأسلحة الدمار الشامل",
    lang: "ar",
    type: "txt",
    path: "/library/civil-defense-cbrn-ar.txt",
    sizeKb: 2764,
    desc: "بروتوكول الوميض النووي، قاعدة 7/10 لتناقص الإشعاع، معاملات العزل الترابي والخرساني.",
  },
  {
    id: "wartime-defense-manual-ru",
    name: "Военная безопасность, противодействие БПЛА и минная осторожность",
    lang: "ru",
    type: "txt",
    path: "/library/wartime-defense-manual-ru.txt",
    sizeKb: 1380,
    desc: "Защита от FPV-дронов и сбросов, тепловизионный камуфляж, мины-ловушки (IMAS), обстрелы, тактика серой зоны.",
  },
  {
    id: "wartime-defense-manual-en",
    name: "Wartime Defense, Counter-UAS Tactics & Mine Risk Reduction",
    lang: "en",
    type: "txt",
    path: "/library/wartime-defense-manual-en.txt",
    sizeKb: 1370,
    desc: "FPV drone evasion, thermal infrared camouflage, Zero Touch booby trap rules (IMAS), bombardment survival.",
  },
  {
    id: "wartime-defense-manual-ar",
    name: "دليل الدفاع في الحروب، مكافحة المسيرات والتوعية بمخاطر الألغام",
    lang: "ar",
    type: "txt",
    path: "/library/wartime-defense-manual-ar.txt",
    sizeKb: 1370,
    desc: "تكتيكات الإفلات من درونات FPV، التخفي الحراري، قاعدة عدم اللمس للأفخاخ، والتحصين ضد القصف.",
  },
];

const MEGA_PACKS = [
  {
    id: "mega-pack-ru",
    lang: "ru" as const,
    name: "Мега-пакет знаний: 1500+ сценариев и карточек (RU)",
    sizeMb: 9.5,
    path: "/packs/kovcheg-data-pack-ru.json",
  },
  {
    id: "mega-pack-en",
    lang: "en" as const,
    name: "Mega Survival Data Pack: 1500+ scenarios and field cards (EN)",
    sizeMb: 9.5,
    path: "/packs/kovcheg-data-pack-en.json",
  },
  {
    id: "mega-pack-ar",
    lang: "ar" as const,
    name: "حزمة بيانات النجاة الضخمة: أكثر من 1500 سيناريو وبطاقة ميدانية (AR)",
    sizeMb: 9.5,
    path: "/packs/kovcheg-data-pack-ar.json",
  },
];

function LibrariesPage() {
  const lang = useArk((s) => s.lang) ?? "ru";
  const notes = useArk((s) => s.notes);
  const documents = useArk((s) => s.documents) ?? [];
  const unread = useArk((s) => s.unread);
  const addNote = useArk((s) => s.addNote);
  const removeNote = useArk((s) => s.removeNote);
  const clearNotes = useArk((s) => s.clearNotes);
  const addDocument = useArk((s) => s.addDocument);
  const removeDocument = useArk((s) => s.removeDocument);
  const clearDocuments = useArk((s) => s.clearDocuments);
  const addUnread = useArk((s) => s.addUnread);
  const removeUnread = useArk((s) => s.removeUnread);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [hash, setHash] = useState("");
  const [readingDoc, setReadingDoc] = useState<IngestedDoc | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [bookLangFilter, setBookLangFilter] = useState<"all" | "ru" | "en" | "ar">(lang);

  useEffect(() => {
    setBookLangFilter(lang);
  }, [lang]);

  const bytes = corpusBytes(BASE_ARTICLES);

  useEffect(() => {
    let live = true;
    fingerprint(BASE_ARTICLES).then((h) => {
      if (live) setHash(h);
    });
    return () => {
      live = false;
    };
  }, []);

  function saveNote() {
    const text = body.trim();
    if (!text) return;
    addNote({
      id: crypto.randomUUID(),
      title: title.trim() || t("noteSavedTitle", lang),
      body: text,
      created: Date.now(),
      pack: "user-notes",
    });
    setTitle("");
    setBody("");
  }

  async function onFile(file: File) {
    try {
      setUploadStatus(`${t("libProcessingFile", lang)} (${file.name})`);
      const { doc, notes: extractedNotes } = await parseUploadedFile(file);
      addDocument(doc);
      if (extractedNotes && extractedNotes.length > 0) {
        for (const n of extractedNotes) {
          addNote({
            id: crypto.randomUUID(),
            title: n.title,
            body: n.body,
            created: Date.now(),
            pack: "user-notes",
          });
        }
      }
      setUploadStatus(`"${file.name}": ${t("libFileAddedSuccess", lang)}`);
      setTimeout(() => setUploadStatus(""), 4000);
    } catch (err) {
      console.error(err);
      addUnread({
        id: crypto.randomUUID(),
        name: file.name,
        reason: t("libFileReadError", lang),
      });
      setUploadStatus("");
    }
  }

  async function openBundledBook(book: BundledBook) {
    try {
      setUploadStatus(`${t("libOpeningDoc", lang)} "${book.name}"...`);
      const res = await fetch(book.path);
      const text = await res.text();
      setReadingDoc({
        id: book.id,
        name: book.name,
        type: book.type,
        size: book.sizeKb * 1024,
        fullText: text,
        textExcerpt: text.slice(0, 1500),
        dataUrl: book.path,
        created: Date.now(),
      });
      setUploadStatus("");
    } catch (err) {
      console.error(err);
      setUploadStatus(t("libOpenDocError", lang));
    }
  }

  async function importMegaPack(pack: typeof MEGA_PACKS[0]) {
    try {
      setUploadStatus(`${t("libImportingPack", lang)} "${pack.name}"...`);
      const res = await fetch(pack.path);
      const data = await res.json();
      if (data && Array.isArray(data.items)) {
        const sample = data.items.slice(0, 50);
        for (const item of sample) {
          addNote({
            id: item.id || crypto.randomUUID(),
            title: item.title,
            body: item.body,
            created: Date.now(),
            pack: "user-cards",
          });
        }
        setUploadStatus(`${t("libPackImportSuccess", lang)} 50 ("${pack.name}")`);
        setTimeout(() => setUploadStatus(""), 4000);
      }
    } catch (err) {
      console.error(err);
      setUploadStatus(t("libPackImportError", lang));
    }
  }

  function importPresetPack(packId: string) {
    const pack = PRESET_PACKS.find((p) => p.id === packId);
    if (!pack) return;
    for (const item of pack.items) {
      addNote({
        id: crypto.randomUUID(),
        title: item.title,
        body: item.body,
        created: Date.now(),
        pack: "user-notes",
      });
    }
    setUploadStatus(`Пакет "${t(pack.titleKey, lang)}" (${pack.items.length} статей) импортирован.`);
    setTimeout(() => setUploadStatus(""), 4000);
  }

  function exportJsonl() {
    const lines = notes
      .map((n) => JSON.stringify({ title: n.title, body: n.body, created: n.created, pack: n.pack }))
      .join("\n");
    const blob = new Blob([lines], { type: "application/jsonl" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kovcheg-data-pack.jsonl";
    a.click();
    URL.revokeObjectURL(url);
  }

  const noteBytes = new TextEncoder().encode(JSON.stringify(notes)).length;
  const docBytes = documents.reduce((acc, d) => acc + d.size, 0);

  const displayedBooks = BUNDLED_OFFLINE_BOOKS.filter(
    (b) => bookLangFilter === "all" || b.lang === bookLangFilter,
  ).sort((a, b) => {
    if (bookLangFilter !== "all") return 0;
    const aMatch = a.lang === lang ? 1 : 0;
    const bMatch = b.lang === lang ? 1 : 0;
    return bMatch - aMatch;
  });

  return (
    <main>
      <h1 className="screen-title">{t("librariesTitle", lang)}</h1>
      <p className="quiet">{t("librariesSub", lang)}</p>

      {uploadStatus && (
        <div style={{ background: "var(--color-calm)", color: "#fff", padding: "0.6rem 0.8rem", borderRadius: "var(--radius-card)", marginBottom: "0.8rem", fontSize: "0.9rem" }}>
          {uploadStatus}
        </div>
      )}

      {/* Stats summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.5rem", marginBottom: "1rem" }}>
        <div className="card-block" style={{ margin: 0, padding: "0.6rem 0.8rem" }}>
          <p className="meta">{t("statCorpus", lang)}</p>
          <strong style={{ fontSize: "1.1rem" }}>{BASE_ARTICLES.length} {t("unitCards", lang)}</strong>
          <span className="meta" style={{ display: "block" }}>{formatBytes(bytes, lang)}</span>
        </div>
        <div className="card-block" style={{ margin: 0, padding: "0.6rem 0.8rem" }}>
          <p className="meta">{t("unitPrebundled", lang)}</p>
          <strong style={{ fontSize: "1.1rem" }}>{displayedBooks.length} {t("unitBooks", lang)}</strong>
          <span className="meta" style={{ display: "block" }}>
            {bookLangFilter === "all" ? t("allLanguagesFilter", lang) : `${t("langSelect", lang)}: ${bookLangFilter.toUpperCase()}`}
          </span>
        </div>
        <div className="card-block" style={{ margin: 0, padding: "0.6rem 0.8rem" }}>
          <p className="meta">{t("statFiles", lang)}</p>
          <strong style={{ fontSize: "1.1rem" }}>{documents.length} {t("unitFiles", lang)}</strong>
          <span className="meta" style={{ display: "block" }}>{formatBytes(docBytes, lang)}</span>
        </div>
        <div className="card-block" style={{ margin: 0, padding: "0.6rem 0.8rem" }}>
          <p className="meta">{t("statNotes", lang)}</p>
          <strong style={{ fontSize: "1.1rem" }}>{notes.length} {t("unitNotes", lang)}</strong>
          <span className="meta" style={{ display: "block" }}>{formatBytes(noteBytes, lang)}</span>
        </div>
      </div>

      {/* Pre-bundled Offline Library Section */}
      <section style={{ marginBottom: "1.5rem" }}>
        <div className="row-between" style={{ alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <h2 className="section-title" style={{ margin: "0 0 0.2rem" }}>
              {t("prebundledLibrariesTitle", lang)}
            </h2>
            <p className="quiet" style={{ margin: 0 }}>
              {t("prebundledLibrariesSub", lang)}
            </p>
          </div>

          {/* Language filter pills */}
          <div style={{ display: "flex", gap: "0.3rem" }}>
            {(["all", "ru", "en", "ar"] as const).map((code) => (
              <button
                key={code}
                type="button"
                className={`text-btn ${bookLangFilter === code ? "active" : ""}`}
                style={{
                  fontSize: "0.75rem",
                  minHeight: "1.8rem",
                  padding: "0.15rem 0.5rem",
                  background: bookLangFilter === code ? "var(--color-lamp)" : "transparent",
                  color: bookLangFilter === code ? "var(--color-ink)" : "var(--color-muted)",
                  fontWeight: bookLangFilter === code ? "bold" : "normal",
                }}
                onClick={() => setBookLangFilter(code)}
              >
                {code === "all" ? t("filterAll", lang) : code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "0.8rem" }}>
          {displayedBooks.map((book) => (
            <div key={book.id} className="doc-card" style={{ padding: "0.8rem 1rem" }}>
              <div className="doc-info">
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                  <span
                    style={{
                      background: "var(--color-lamp)",
                      color: "var(--color-ink)",
                      fontSize: "0.7rem",
                      fontWeight: "bold",
                      padding: "1px 6px",
                      borderRadius: "3px",
                      textTransform: "uppercase",
                    }}
                  >
                    {book.lang}
                  </span>
                  <span
                    style={{
                      background: "var(--color-raise)",
                      border: "1px solid var(--color-line)",
                      color: "var(--color-muted)",
                      fontSize: "0.7rem",
                      padding: "1px 5px",
                      borderRadius: "3px",
                      textTransform: "uppercase",
                    }}
                  >
                    {book.type}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>
                    {(book.sizeKb / 1024).toFixed(1)} {t("unitMb", lang)}
                  </span>
                </div>
                <p className="doc-name" style={{ fontSize: "0.98rem" }}>{book.name}</p>
                <p className="doc-meta" style={{ marginTop: "0.3rem", lineHeight: 1.4 }}>{book.desc}</p>
              </div>

              <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
                <button
                  type="button"
                  className="text-btn"
                  style={{
                    minHeight: "2.4rem",
                    padding: "0.3rem 0.7rem",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                  }}
                  onClick={() => openBundledBook(book)}
                >
                  <BookOpen size={16} />
                  <span>{t("openInReader", lang)}</span>
                </button>
                <a
                  href={book.path}
                  download={book.name + (book.type === "html" ? ".html" : ".txt")}
                  className="icon-btn"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                  title={t("downloadToDevice", lang)}
                >
                  <Download size={16} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Upload File Section */}
      <section className="card-block">
        <h2 style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Upload size={18} aria-hidden />
          {t("uploadDocTitle", lang)}
        </h2>
        <p className="meta">{t("uploadDocHint", lang)}</p>
        <div style={{ marginTop: "0.5rem" }}>
          <label className="text-btn" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            <Plus size={16} aria-hidden />
            {t("chooseFile", lang)}
            <input
              type="file"
              accept=".pdf,.epub,.html,.htm,.txt,.md,.markdown,.json,.jsonl"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onFile(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </section>

      {/* Ingested Documents List */}
      {documents.length > 0 && (
        <section style={{ marginTop: "1.2rem" }}>
          <div className="row-between" style={{ marginBottom: "0.4rem" }}>
            <h2 className="section-title" style={{ margin: 0 }}>
              {t("statFiles", lang)} ({documents.length})
            </h2>
            <button type="button" className="text-btn" style={{ fontSize: "0.8rem", minHeight: "2rem" }} onClick={clearDocuments}>
              {t("clearAllData", lang)}
            </button>
          </div>
          {documents.map((d) => (
            <div key={d.id} className="doc-card">
              <div className="doc-info">
                <p className="doc-name">{d.name}</p>
                <p className="doc-meta">
                  <span style={{ textTransform: "uppercase", background: "var(--color-lamp)", color: "var(--color-ink)", padding: "1px 5px", borderRadius: 3, fontWeight: "bold", marginRight: 6 }}>
                    {d.type}
                  </span>
                  {formatBytes(d.size, lang)} · {d.textExcerpt ? d.textExcerpt.slice(0, 90) + "…" : ""}
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.3rem" }}>
                <button
                  type="button"
                  className="text-btn"
                  style={{ minHeight: "2.4rem", padding: "0.3rem 0.6rem" }}
                  onClick={() => setReadingDoc(d)}
                >
                  <BookOpen size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                  {t("openInReader", lang)}
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  style={{ minHeight: "2.4rem", padding: "0.3rem 0.5rem" }}
                  onClick={() => removeDocument(d.id)}
                  title={t("deleteItem", lang)}
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Preset Data Packs Section */}
      <section style={{ marginTop: "1.2rem" }}>
        <h2 className="section-title">{t("downloadPackTitle", lang)}</h2>
        <p className="quiet">{t("downloadPackHint", lang)}</p>

        {/* Mega Packs */}
        {MEGA_PACKS.map((pack) => (
          <div key={pack.id} className="pack-card">
            <div className="row-between">
              <div>
                <strong>{pack.name}</strong>
                <p className="meta" style={{ margin: "0.1rem 0 0" }}>
                  {t("packOfflineJson", lang)} · ~{pack.sizeMb} {t("unitMb", lang)}
                </p>
              </div>
              <button
                type="button"
                className="text-btn"
                style={{ fontSize: "0.85rem" }}
                onClick={() => importMegaPack(pack)}
              >
                <Download size={15} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                {t("packImportCards", lang)}
              </button>
            </div>
          </div>
        ))}

        {PRESET_PACKS.map((pack) => (
          <div key={pack.id} className="pack-card">
            <div className="row-between">
              <div>
                <strong>{t(pack.titleKey, lang)}</strong>
                <p className="meta" style={{ margin: "0.1rem 0 0" }}>
                  {pack.itemsCount} {t("unitArticles", lang)} · ~{pack.sizeKb} {t("unitKb", lang)}
                </p>
              </div>
              <button
                type="button"
                className="text-btn"
                style={{ fontSize: "0.85rem" }}
                onClick={() => importPresetPack(pack.id)}
              >
                <Download size={15} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                {t("importPackBtn", lang)}
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* User Notes Input Section */}
      <section style={{ marginTop: "1.2rem" }}>
        <h2 className="section-title">{t("packUserNotes", lang)}</h2>
        <CodeWordGate featureName={t("packUserNotes", lang)}>
          <p className="meta">{notes.length} · {formatBytes(noteBytes, lang)}</p>
          <input
            className="search-field"
            placeholder={t("noteTitlePlaceholder", lang)}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="note-field"
            rows={4}
            placeholder={t("noteBodyPlaceholder", lang)}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="tools">
            <button type="button" className="text-btn" onClick={saveNote}>
              {t("saveToArchive", lang)}
            </button>
            <button type="button" className="text-btn" onClick={exportJsonl} disabled={notes.length === 0}>
              {t("exportDataBtn", lang)}
            </button>
            <button type="button" className="text-btn" onClick={clearNotes} disabled={notes.length === 0}>
              {t("clearMyNotes", lang)}
            </button>
          </div>

          {notes.map((n) => (
            <div key={n.id} className="hit">
              <div className="row-between">
                <Link to="/read/$id" params={{ id: `note-${n.id}` }}>
                  <h2>{n.title}</h2>
                </Link>
                <button type="button" className="icon-btn" onClick={() => removeNote(n.id)}>
                  {t("deleteItem", lang)}
                </button>
              </div>
              <p className="meta">{n.pack === "user-cards" ? t("packUserCards", lang) : t("packUserNotes", lang)}</p>
            </div>
          ))}

          {unread.map((f) => (
            <div key={f.id} className="warn">
              <strong>{f.name}</strong>
              <p>{f.reason}</p>
              <button type="button" className="text-btn" onClick={() => removeUnread(f.id)}>
                {t("hide", lang)}
              </button>
            </div>
          ))}
        </CodeWordGate>
      </section>

      {/* Base Corpus Info */}
      <section className="card-block" style={{ marginTop: "1.2rem" }}>
        <h2>{BASE_PACK.title}</h2>
        <p className="meta">
          {BASE_PACK.id} · {BASE_PACK.version} · {BASE_PACK.language} · {BASE_ARTICLES.length} {t("unitCards", lang)} ·{" "}
          {formatBytes(bytes, lang)}
        </p>
        <p className="meta">
          {BASE_PACK.license}. {BASE_PACK.attribution}
        </p>
        <p className="meta">
          {t("libNameFingerprint", lang)}{" "}
          {hash ? hash.slice(0, 16) : "…"}
        </p>
      </section>

      {/* Document Reader Modal */}
      {readingDoc && (
        <DocumentReaderModal
          doc={readingDoc}
          lang={lang}
          onClose={() => setReadingDoc(null)}
        />
      )}
    </main>
  );
}

function formatBytes(n: number, lang: Language = "ru"): string {
  const b = t("unitByte", lang);
  const kb = t("unitKb", lang);
  const mb = t("unitMb", lang);
  if (n < 1024) return `${n} ${b}`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} ${kb}`;
  return `${(n / (1024 * 1024)).toFixed(1)} ${mb}`;
}
