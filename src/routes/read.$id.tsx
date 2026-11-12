import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArticleBody, DisclaimerGate } from "@/components/kovcheg/article-view";
import { findArticle, useCorpus } from "@/lib/kovcheg/library";
import { useArk } from "@/lib/kovcheg/store";
import { t } from "@/lib/kovcheg/i18n";
import { CodeWordGate } from "@/components/kovcheg/code-word-gate";

export const Route = createFileRoute("/read/$id")({ component: ReadPage });

function ReadPage() {
  const { id } = Route.useParams();
  const lang = useArk((s) => s.lang) ?? "ru";
  const { articles } = useCorpus();
  const touch = useArk((s) => s.touchRecent);
  const article = findArticle(articles, id);

  useEffect(() => {
    if (article) touch(article.id);
  }, [article, touch]);

  if (!article) {
    return (
      <main>
        <h1 className="screen-title">{t("articleNotFound", lang)}</h1>
        <p>{t("articleNotFoundDesc", lang)}</p>
        <Link to="/" className="text-btn">
          {t("toSearch", lang)}
        </Link>
      </main>
    );
  }

  const isUserPersonal = article.id.startsWith("note-") || article.id.startsWith("doc-");

  if (isUserPersonal) {
    return (
      <main>
        <CodeWordGate featureName={article.title}>
          <DisclaimerGate article={article}>
            <ArticleBody article={article} />
          </DisclaimerGate>
        </CodeWordGate>
      </main>
    );
  }

  return (
    <main>
      <DisclaimerGate article={article}>
        <ArticleBody article={article} />
      </DisclaimerGate>
    </main>
  );
}
