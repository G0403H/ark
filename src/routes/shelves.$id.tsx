import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCorpus } from "@/lib/kovcheg/library";
import { SHELVES_DATA, shelfTitle, type ShelfId } from "@/lib/kovcheg/shelves";
import { useArk } from "@/lib/kovcheg/store";
import { t } from "@/lib/kovcheg/i18n";
import { TourniquetTimer } from "@/components/kovcheg/tourniquet-timer";
import { ContractionTimer } from "@/components/kovcheg/contraction-timer";
import { RehydrationCalculator } from "@/components/kovcheg/rehydration-calculator";
import { SurvivalCalculator } from "@/components/kovcheg/survival-calculator";
import { WaterAltitudeCalculator } from "@/components/kovcheg/water-altitude-calculator";
import { MorseBeacon } from "@/components/kovcheg/morse-beacon";
import { SunChronoCompass } from "@/components/kovcheg/sun-chrono-compass";
import { Map, Clock, Baby, Droplet, Radio, Sun } from "lucide-react";

export const Route = createFileRoute("/shelves/$id")({ component: ShelfPage });

function ShelfPage() {
  const { id } = Route.useParams();
  const lang = useArk((s) => s.lang) ?? "ru";
  const { articles } = useCorpus();
  const [medTool, setMedTool] = useState<"tourniquet" | "labor" | "rehydration">("tourniquet");

  const known = SHELVES_DATA.some((s) => s.id === id);
  if (!known) {
    return (
      <main>
        <p>{t("notFoundInBase", lang)}</p>
        <Link to="/shelves">{t("navShelves", lang)}</Link>
      </main>
    );
  }

  const shelf = id as ShelfId;
  const rows = articles
    .filter((a) => a.shelf === shelf)
    .sort((a, b) => {
      const aMatch = (a.lang ?? "ru") === lang ? 1 : 0;
      const bMatch = (b.lang ?? "ru") === lang ? 1 : 0;
      return bMatch - aMatch;
    });

  return (
    <main>
      <p className="meta">
        <Link to="/shelves">← {t("navShelves", lang)}</Link>
      </p>
      <h1 className="screen-title">{shelfTitle(shelf, lang)}</h1>

      {/* MEDICAL TOOLS (Помощь) */}
      {shelf === "pomosh" && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", gap: "0.35rem", marginBottom: "0.8rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className={`chip ${medTool === "tourniquet" ? "chip-active" : ""}`}
              data-on={medTool === "tourniquet" ? "1" : "0"}
              onClick={() => setMedTool("tourniquet")}
            >
              <Clock size={14} style={{ marginRight: 3 }} />
              {t("toolTourniquet", lang)}
            </button>
            <button
              type="button"
              className={`chip ${medTool === "labor" ? "chip-active" : ""}`}
              data-on={medTool === "labor" ? "1" : "0"}
              onClick={() => setMedTool("labor")}
            >
              <Baby size={14} style={{ marginRight: 3 }} />
              {t("toolLabor", lang)}
            </button>
            <button
              type="button"
              className={`chip ${medTool === "rehydration" ? "chip-active" : ""}`}
              data-on={medTool === "rehydration" ? "1" : "0"}
              onClick={() => setMedTool("rehydration")}
            >
              <Droplet size={14} style={{ marginRight: 3 }} />
              {t("toolRehydration", lang)}
            </button>
          </div>

          {medTool === "tourniquet" && <TourniquetTimer />}
          {medTool === "labor" && <ContractionTimer />}
          {medTool === "rehydration" && <RehydrationCalculator />}
        </div>
      )}

      {/* WATER TOOLS (Вода) */}
      {shelf === "voda" && (
        <>
          <WaterAltitudeCalculator />
          <SurvivalCalculator />
        </>
      )}

      {/* FOOD TOOLS (Еда) */}
      {shelf === "eda" && <SurvivalCalculator />}

      {/* RADIO & COMMS TOOLS (Связь) */}
      {shelf === "svyaz" && <MorseBeacon />}

      {/* NAVIGATION TOOLS (Навигация) */}
      {shelf === "navigaciya" && (
        <>
          <div className="card-block" style={{ marginBottom: "1rem" }}>
            <div className="row-between">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Map size={20} color="var(--color-lamp)" />
                <div>
                  <strong>{t("navAtlas", lang)}</strong>
                  <p className="meta" style={{ margin: "0.1rem 0 0" }}>{t("atlasSub", lang)}</p>
                </div>
              </div>
              <Link to="/atlas" className="text-btn">
                {t("openAtlas", lang)}
              </Link>
            </div>
          </div>
          <SunChronoCompass />
        </>
      )}

      {/* Articles List */}
      {rows.map((a) => (
        <Link key={a.id} to="/read/$id" params={{ id: a.id }} className="hit">
          <h2>{a.title}</h2>
          <p className="meta">
            {a.lang ? (
              <span style={{ textTransform: "uppercase", background: "var(--color-raise)", border: "1px solid var(--color-line)", padding: "1px 4px", borderRadius: 3, marginRight: 6, fontSize: "0.75rem" }}>
                {a.lang}
              </span>
            ) : null}
            {a.lead}
          </p>
        </Link>
      ))}
    </main>
  );
}
