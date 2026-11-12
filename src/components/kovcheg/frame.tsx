import type { ReactNode } from "react";
import { Radiation, Menu, Globe } from "lucide-react";
import { useEffect } from "react";
import { LANGUAGES, t } from "@/lib/kovcheg/i18n";
import { useArk } from "@/lib/kovcheg/store";
import { StalkerHud } from "@/components/kovcheg/stalker-hud";
import { NavigationDrawer } from "@/components/kovcheg/navigation-drawer";
import { ButtonBar } from "@/components/kovcheg/button-bar";
import { AppLockScreen } from "@/components/kovcheg/app-lock-screen";
import { useHardwareSosDetector } from "@/lib/kovcheg/hardware-sos-detector";

export function Frame({ children }: { children: ReactNode }) {
  // Listen for emergency physical 3x Power button SOS triggers
  useHardwareSosDetector();

  const theme = useArk((s) => s.theme);
  const setTheme = useArk((s) => s.setTheme);
  const lang = useArk((s) => s.lang) ?? "ru";
  const setLang = useArk((s) => s.setLang);
  const toggleDrawer = useArk((s) => s.toggleDrawer);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [theme, lang]);

  return (
    <div className="ark" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Master Fullscreen App Lock Screen (if password protection enabled) */}
      <AppLockScreen />

      {/* Slide-out side drawer (Боковая шторка) */}
      <NavigationDrawer />

      <div className="sheet">
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <button
              type="button"
              className="icon-btn menu-toggle-btn"
              onClick={toggleDrawer}
              title={t("menuTitle", lang)}
              aria-label={t("menuTitle", lang)}
            >
              <Menu size={18} />
              <span className="menu-toggle-label">{t("navMenu", lang)}</span>
            </button>
            <div>
              <p className="brand-kicker">
                {theme === "stalker" ? t("stalkerKicker", lang) : t("brandKicker", lang)}
              </p>
              <p className="brand-sub">
                {theme === "stalker" ? t("stalkerSub", lang) : t("brandSub", lang)}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
            <div className="lang-switcher" style={{ display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.1rem 0.3rem" }}>
              <Globe size={14} color="var(--color-lamp)" style={{ pointerEvents: "none" }} />
              <select
                className="select"
                aria-label={t("langSelect", lang)}
                value={lang}
                onChange={(e) => setLang(e.target.value as any)}
                style={{
                  margin: 0,
                  padding: "0.2rem 0.5rem",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-fg)",
                }}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} style={{ background: "var(--color-raise)", color: "var(--color-fg)" }}>
                    {l.code === "ru" ? "🇷🇺 RU · Русский" : l.code === "en" ? "🇬🇧 EN · English" : "🇸🇦 AR · العربية"}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="icon-btn"
              onClick={() => {
                if (theme === "stalker") setTheme("shelter");
                else if (theme === "shelter") setTheme("paper");
                else setTheme("stalker");
              }}
              style={{
                borderColor: theme === "stalker" ? "var(--color-lamp)" : undefined,
                color: theme === "stalker" ? "var(--color-lamp)" : undefined,
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              {theme === "stalker" ? (
                <>
                  <Radiation size={15} />
                  {t("themeStalker", lang)}
                </>
              ) : theme === "shelter" ? (
                t("themeShelter", lang)
              ) : (
                t("themePaper", lang)
              )}
            </button>
          </div>
        </header>

        {theme === "stalker" && <StalkerHud />}

        {children}
      </div>

      {/* Bottom ButtonBar: Quick action bar with Menu button */}
      <ButtonBar />
    </div>
  );
}
