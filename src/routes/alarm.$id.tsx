import { createFileRoute, Link } from "@tanstack/react-router";
import { ArticleBody, DisclaimerGate } from "@/components/kovcheg/article-view";
import { findArticle, useCorpus } from "@/lib/kovcheg/library";
import { useArk } from "@/lib/kovcheg/store";
import { t } from "@/lib/kovcheg/i18n";

export const Route = createFileRoute("/alarm/$id")({ component: AlarmCard });

function AlarmCard() {
  const { id } = Route.useParams();
  const lang = useArk((s) => s.lang) ?? "ru";
  const { articles } = useCorpus();
  const article = findArticle(articles, id);
  if (!article) {
    return (
      <main>
        <p>{t("alarmCardNotFound", lang)}</p>
        <Link to="/alarm">{t("pagerPrev", lang)}</Link>
      </main>
    );
  }
  return (
    <main>
      <DisclaimerGate article={article}>
        <ArticleBody article={article} big />
      </DisclaimerGate>
    </main>
  );
}
