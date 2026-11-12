import { createFileRoute, Link } from "@tanstack/react-router";
import { ArticleBody, DisclaimerGate } from "@/components/kovcheg/article-view";
import { NUCLEAR_ORDER } from "@/lib/kovcheg/corpus";
import { findArticle, useCorpus } from "@/lib/kovcheg/library";
import { useArk } from "@/lib/kovcheg/store";
import { t } from "@/lib/kovcheg/i18n";

export const Route = createFileRoute("/nuclear/$id")({ component: NuclearCard });

function NuclearCard() {
  const { id } = Route.useParams();
  const lang = useArk((s) => s.lang) ?? "ru";
  const { articles } = useCorpus();
  const article = findArticle(articles, id);
  const index = NUCLEAR_ORDER.indexOf(id);
  const prev = index > 0 ? NUCLEAR_ORDER[index - 1] : null;
  const next = index >= 0 && index < NUCLEAR_ORDER.length - 1 ? NUCLEAR_ORDER[index + 1] : null;

  if (!article) {
    return (
      <main>
        <p>{t("nuclearCardNotFound", lang)}</p>
        <Link to="/nuclear">{t("toList", lang)}</Link>
      </main>
    );
  }

  return (
    <main>
      <DisclaimerGate article={article}>
        <ArticleBody article={article} big />
        <div className="pager">
          {prev ? (
            <Link to="/nuclear/$id" params={{ id: prev }}>
              {t("pagerPrev", lang)}
            </Link>
          ) : (
            <span>{t("pagerStart", lang)}</span>
          )}
          {next ? (
            <Link to="/nuclear/$id" params={{ id: next }}>
              {t("pagerNext", lang)}
            </Link>
          ) : (
            <Link to="/nuclear">{t("toList", lang)}</Link>
          )}
        </div>
      </DisclaimerGate>
    </main>
  );
}
