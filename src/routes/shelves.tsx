import { createFileRoute, Link } from "@tanstack/react-router";
import { BASE_ARTICLES } from "@/lib/kovcheg/corpus";
import { getLocalizedShelves } from "@/lib/kovcheg/shelves";
import { useArk } from "@/lib/kovcheg/store";
import { t } from "@/lib/kovcheg/i18n";

export const Route = createFileRoute("/shelves")({ component: ShelvesPage });

function ShelvesPage() {
  const lang = useArk((s) => s.lang) ?? "ru";
  const localizedShelves = getLocalizedShelves(lang);

  return (
    <main>
      <h1 className="screen-title">{t("shelvesTitle", lang)}</h1>
      <p className="quiet">{t("shelvesSub", lang)}</p>
      <Link to="/nuclear" className="nuclear-entry">
        <strong>{t("nuclearProtocol", lang)}</strong>
        <span>{t("nuclearEntryNotice", lang)}</span>
      </Link>
      {localizedShelves.filter((s) => s.id !== "yadro").map((s) => {
        const n = BASE_ARTICLES.filter((a) => a.shelf === s.id).length;
        return (
          <Link key={s.id} to="/shelves/$id" params={{ id: s.id }} className="shelf-row">
            <strong>{s.title}</strong>
            <p className="meta">
              {s.hint} · {n}
            </p>
          </Link>
        );
      })}
    </main>
  );
}
