import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { getAlarmOrder } from "@/lib/kovcheg/corpus";
import { useCorpus } from "@/lib/kovcheg/library";
import { refusalReason, searchArticles } from "@/lib/kovcheg/search";
import { getLocalizedShelves, shelfTitle, type ShelfId } from "@/lib/kovcheg/shelves";
import { useArk } from "@/lib/kovcheg/store";
import { t } from "@/lib/kovcheg/i18n";
import { CustomSelect } from "@/components/kovcheg/custom-select";

export const Route = createFileRoute("/")({ component: SearchHome });

function SearchHome() {
  const lang = useArk((s) => s.lang) ?? "ru";
  const { index, articles } = useCorpus();
  const boost = useArk((s) => s.helped);
  const bookmarks = useArk((s) => s.bookmarks);
  const recents = useArk((s) => s.recents);
  const [q, setQ] = useState("");
  const [shelf, setShelf] = useState<ShelfId | "">("");
  const [pictures, setPictures] = useState(false);
  const [alarms, setAlarms] = useState(false);
  const [packId, setPackId] = useState("");
  const [allLanguages, setAllLanguages] = useState(false);

  const localizedShelves = useMemo(() => getLocalizedShelves(lang), [lang]);
  const alarmItems = useMemo(() => getAlarmOrder(lang), [lang]);

  const shelfOptions = useMemo(
    () => [
      { value: "" as ShelfId | "", label: t("allShelves", lang) },
      ...localizedShelves.map((s) => ({ value: s.id, label: s.title })),
    ],
    [localizedShelves, lang],
  );

  const packOptions = useMemo(
    () => [
      { value: "", label: t("allPacks", lang) },
      { value: "kovcheg-base", label: t("packBase", lang) },
      { value: "user-notes", label: t("packUserNotes", lang) },
      { value: "user-cards", label: t("packUserCards", lang) },
    ],
    [lang],
  );

  const refusal = refusalReason(q);
  const filtered = Boolean(shelf || pictures || alarms || packId || allLanguages);
  const hits = useMemo(() => {
    if (refusal) return [];
    if (!q.trim() && !filtered) return [];
    return searchArticles(
      index,
      q,
      {
        shelf,
        pictures,
        alarms,
        packId,
        lang: allLanguages ? "all" : lang,
      },
      boost,
    ).slice(0, 50);
  }, [index, q, shelf, pictures, alarms, packId, allLanguages, lang, boost, refusal, filtered]);

  const byId = (id: string) => articles.find((a) => a.id === id);

  return (
    <main>
      <label className="quiet" htmlFor="q">
        {t("searchLabel", lang)}
      </label>
      <input
        id="q"
        className="search-field"
        value={q}
        placeholder={t("searchPlaceholder", lang)}
        autoCapitalize="none"
        autoCorrect="off"
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="filters">
        <CustomSelect
          ariaLabel={t("allShelves", lang)}
          value={shelf}
          onChange={(val) => setShelf(val)}
          options={shelfOptions}
        />
        <button type="button" className="chip" data-on={pictures ? "1" : "0"} onClick={() => setPictures((v) => !v)}>
          {t("picturesOnly", lang)}
        </button>
        <button type="button" className="chip" data-on={alarms ? "1" : "0"} onClick={() => setAlarms((v) => !v)}>
          {t("alarmsOnly", lang)}
        </button>
        <button
          type="button"
          className="chip"
          data-on={allLanguages ? "1" : "0"}
          onClick={() => setAllLanguages((v) => !v)}
          title={t("allLanguagesTitle", lang)}
        >
          {allLanguages ? t("allLanguagesFilter", lang) : lang.toUpperCase()}
        </button>
        <CustomSelect
          ariaLabel={t("packLabel", lang)}
          value={packId}
          onChange={(val) => setPackId(val)}
          options={packOptions}
        />
      </div>

      {!q.trim() && !filtered && (
        <>
          <Link to="/nuclear" className="nuclear-entry">
            <strong>{t("nuclearProtocol", lang)}</strong>
            <span>{t("nuclearSub", lang)}</span>
          </Link>
          <Link to="/alarm" className="card-block">
            <strong>{t("alarmTitle", lang)}</strong>
            <p className="meta">{alarmItems.map((a) => a.title).join(" · ")}</p>
          </Link>
          <Lists title={t("recentsTitle", lang)} ids={recents} byId={byId} lang={lang} />
          <Lists title={t("bookmarksTitle", lang)} ids={bookmarks} byId={byId} lang={lang} />
        </>
      )}

      {refusal && (
        <div className="refusal">
          <p>{refusal}</p>
        </div>
      )}

      {!refusal && hits.length === 0 && (q.trim() || filtered) && (
        <p className="quiet">{t("notFoundInBase", lang)}</p>
      )}

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {hits.map((h) => (
          <li key={h.article.id}>
            <Link to="/read/$id" params={{ id: h.article.id }} className="hit">
              <h2>{h.article.title}</h2>
              <p className="meta">
                <span style={{ textTransform: "uppercase", background: "var(--color-raise)", border: "1px solid var(--color-line)", padding: "1px 4px", borderRadius: 3, marginRight: 6, fontSize: "0.75rem" }}>
                  {h.article.lang ?? "ru"}
                </span>
                {shelfTitle(h.article.shelf, lang)}
                {h.article.figure ? ` · ${t("figureBadge", lang)}` : ""} · {h.article.lead}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

function Lists({
  title,
  ids,
  byId,
  lang,
}: {
  title: string;
  ids: string[];
  byId: (id: string) => { id: string; title: string; shelf: ShelfId } | undefined;
  lang: string;
}) {
  const rows = ids.map(byId).filter((x): x is NonNullable<typeof x> => Boolean(x));
  if (rows.length === 0) return null;
  return (
    <section>
      <h2 className="section-title">{title}</h2>
      {rows.map((a) => (
        <Link key={a.id} to="/read/$id" params={{ id: a.id }} className="hit">
          <h2>{a.title}</h2>
          <p className="meta">{shelfTitle(a.shelf, lang as any)}</p>
        </Link>
      ))}
    </section>
  );
}
