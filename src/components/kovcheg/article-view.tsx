import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { FigureView } from "@/components/kovcheg/figures";
import { shelfTitle } from "@/lib/kovcheg/shelves";
import { useArk } from "@/lib/kovcheg/store";
import type { Article } from "@/lib/kovcheg/types";
import { t } from "@/lib/kovcheg/i18n";

export function DisclaimerGate({
  article,
  children,
}: {
  article: Article;
  children: ReactNode;
}) {
  const lang = useArk((s) => s.lang) ?? "ru";
  const seen = useArk((s) => s.disclaimerSeen);
  const accept = useArk((s) => s.acceptDisclaimer);
  const hydrated = useHydrated();
  if (!article.sensitive) return children;
  if (!hydrated) return <p className="quiet">...</p>;
  if (seen) return children;
  return (
    <div className="gate">
      <p>{t("disclaimerText", lang)}</p>
      <button type="button" className="text-btn" onClick={accept}>
        {t("disclaimerAccept", lang)}
      </button>
    </div>
  );
}

function useHydrated() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (useArk.persist.hasHydrated()) setReady(true);
    return useArk.persist.onFinishHydration(() => setReady(true));
  }, []);
  return ready;
}

export function ArticleBody({ article, big }: { article: Article; big?: boolean }) {
  const lang = useArk((s) => s.lang) ?? "ru";
  const step = useArk((s) => s.fontStep);
  const setFont = useArk((s) => s.setFontStep);
  const bookmarks = useArk((s) => s.bookmarks);
  const toggle = useArk((s) => s.toggleBookmark);
  const helped = useArk((s) => s.markHelped);
  const iodine = article.id === "yod-zapret";
  const saved = bookmarks.includes(article.id);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    document.getElementById(hash)?.scrollIntoView({ block: "start" });
  }, [article.id]);

  return (
    <article className={iodine ? "read iodine" : big ? "read prose-2" : `read prose-${step}`}>
      <p className="meta">
        {shelfTitle(article.shelf, lang)}
        {article.kind === "alarm" ? ` · ${t("alarmCardBadge", lang)}` : ""}
        {article.kind === "nuclear" ? ` · ${t("nuclearBadge", lang)}` : ""}
      </p>
      <h1>{article.title}</h1>
      <p className="lead">{article.lead}</p>
      <div className="tools">
        {!big && (
          <>
            <button type="button" className="text-btn" onClick={() => setFont(step === 0 ? 0 : ((step - 1) as 0 | 1 | 2 | 3))}>
              A−
            </button>
            <button type="button" className="text-btn" onClick={() => setFont(step === 3 ? 3 : ((step + 1) as 0 | 1 | 2 | 3))}>
              A+
            </button>
          </>
        )}
        <button type="button" className="text-btn" onClick={() => toggle(article.id)}>
          {saved ? t("bookmarked", lang) : t("bookmark", lang)}
        </button>
        <button type="button" className="text-btn" onClick={() => helped(article.id)}>
          {t("helped", lang)}
        </button>
      </div>
      {!big && (
        <nav className="toc" aria-label={t("tableOfContents", lang)}>
          {article.sections.map((s) => (
            <div key={s.id}>
              <a href={`#${s.id}`}>{s.title}</a>
            </div>
          ))}
        </nav>
      )}
      {article.figure && <FigureView id={article.figure} caption={article.figureCaption} />}
      {article.sections.map((s) => (
        <section key={s.id} id={s.id}>
          <h2 className="section-title">{s.title}</h2>
          {Array.isArray(s.body) ? (
            <ol>
              {s.body.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          ) : (
            <p>{s.body}</p>
          )}
        </section>
      ))}
      <p className="meta">
        {article.sourceType}. {article.license}. {article.attribution}
      </p>
      {article.kind === "alarm" && article.id === "alarm-pyl" && (
        <p>
          <Link to="/nuclear" className="text-btn">
            {t("nuclearTimeline", lang)}
          </Link>
        </p>
      )}
    </article>
  );
}
