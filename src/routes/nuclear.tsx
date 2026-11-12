import { createFileRoute, Link } from "@tanstack/react-router";
import { NUCLEAR_ORDER } from "@/lib/kovcheg/corpus";
import { findArticle, useCorpus } from "@/lib/kovcheg/library";
import { useArk } from "@/lib/kovcheg/store";
import { t } from "@/lib/kovcheg/i18n";

export const Route = createFileRoute("/nuclear")({ component: NuclearIndex });

function NuclearIndex() {
  const lang = useArk((s) => s.lang) ?? "ru";
  const { articles } = useCorpus();

  const langSpecificNuclearId = lang === "en" ? "en-nuclear-fallout" : lang === "ar" ? "ar-nuclear-protocol" : null;
  const langSpecificArticle = langSpecificNuclearId ? findArticle(articles, langSpecificNuclearId) : null;

  return (
    <main>
      <h1 className="screen-title">{t("nuclearProtocol", lang)}</h1>
      <p className="quiet">{t("nuclearSub", lang)}</p>

      {langSpecificArticle && (
        <Link to="/read/$id" params={{ id: langSpecificArticle.id }} className="nuclear-entry" style={{ marginBottom: "1rem" }}>
          <strong>{langSpecificArticle.title}</strong>
          <span>{langSpecificArticle.lead}</span>
        </Link>
      )}

      {NUCLEAR_ORDER.map((id) => {
        const article = findArticle(articles, id);
        if (!article) return null;
        return (
          <Link key={id} to="/nuclear/$id" params={{ id }} className={id === "yod-zapret" ? "nuclear-entry" : "hit"}>
            <h2>{article.title}</h2>
            <p className="meta">{article.lead}</p>
          </Link>
        );
      })}
    </main>
  );
}
