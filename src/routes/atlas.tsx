import { createFileRoute } from "@tanstack/react-router";
import { MapAtlasView } from "@/components/kovcheg/map-atlas";
import { useArk } from "@/lib/kovcheg/store";
import { t } from "@/lib/kovcheg/i18n";

export const Route = createFileRoute("/atlas")({ component: AtlasPage });

function AtlasPage() {
  const lang = useArk((s) => s.lang) ?? "ru";

  return (
    <main>
      <h1 className="screen-title">{t("navAtlas", lang)}</h1>
      <p className="quiet">{t("atlasSub", lang)}</p>
      <MapAtlasView />
    </main>
  );
}
