import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Radiation, Menu, Globe, Shield, Sun } from "lucide-react";
import { useEffect } from "react";
import { LANGUAGES, t } from "@/lib/kovcheg/i18n";
import { useArk } from "@/lib/kovcheg/store";
import { StalkerHud } from "@/components/kovcheg/stalker-hud";
import { NavigationDrawer } from "@/components/kovcheg/navigation-drawer";
import { ButtonBar } from "@/components/kovcheg/button-bar";
import { AppLockScreen } from "@/components/kovcheg/app-lock-screen";
import { useHardwareSosDetector } from "@/lib/kovcheg/hardware-sos-detector";
import { useBackgroundDownloader } from "@/lib/kovcheg/models/background-downloader";

export function Frame({ children }: { children: ReactNode }) {
  // Listen for emergency physical 3x Power button SOS triggers
  useHardwareSosDetector();

  const theme = useArk((s) => s.theme);
  const setTheme = useArk((s) => s.setTheme);
  const lang = useArk((s) => s.lang) ?? "ru";
  const setLang = useArk((s) => s.setLang);
  const toggleDrawer = useArk((s) => s.toggleDrawer);

  // Background downloader state
  const activeModelId = useBackgroundDownloader((s) => s.activeModelId);
  const downloads = useBackgroundDownloader((s) => s.downloads);
  const activeDownload = activeModelId ? downloads[activeModelId] : null;

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
          <div className="topbar-brand-wrap">
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
            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <p className="brand-kicker">
                {theme === "stalker" ? t("stalkerKicker", lang) : t("brandKicker", lang)}
              </p>
              <p className="brand-sub">
                {theme === "stalker" ? t("stalkerSub", lang) : t("brandSub", lang)}
              </p>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="lang-switcher">
              <Globe size={14} color="var(--color-lamp)" style={{ pointerEvents: "none", margin: "0 0.15rem 0 0.35rem" }} />
              <select
                className="select"
                aria-label={t("langSelect", lang)}
                value={lang}
                onChange={(e) => setLang(e.target.value as any)}
                style={{
                  margin: 0,
                  padding: "0.2rem 0.35rem",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-fg)",
                }}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} style={{ background: "var(--color-raise)", color: "var(--color-fg)" }}>
                    {l.code === "ru" ? "🇷🇺 RU" : l.code === "en" ? "🇬🇧 EN" : "🇸🇦 AR"}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="icon-btn theme-toggle-btn"
              title={theme === "stalker" ? "Режим Сталкер" : theme === "shelter" ? "Режим Бункер" : "Режим Бумага"}
              onClick={() => {
                if (theme === "stalker") setTheme("shelter");
                else if (theme === "shelter") setTheme("paper");
                else setTheme("stalker");
              }}
              style={{
                borderColor: theme === "stalker" ? "var(--color-lamp)" : undefined,
                color: theme === "stalker" ? "var(--color-lamp)" : undefined,
              }}
            >
              {theme === "stalker" ? (
                <>
                  <Radiation size={15} className="theme-toggle-icon" />
                  <span className="theme-toggle-label">{t("themeStalker", lang)}</span>
                </>
              ) : theme === "shelter" ? (
                <>
                  <Shield size={15} className="theme-toggle-icon" />
                  <span className="theme-toggle-label">{t("themeShelter", lang)}</span>
                </>
              ) : (
                <>
                  <Sun size={15} className="theme-toggle-icon" />
                  <span className="theme-toggle-label">{t("themePaper", lang)}</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Global Background Model Download Banner */}
        {activeDownload && activeDownload.status === "downloading" && (
          <Link
            to="/assistant"
            className="bg-model-banner"
            title={lang === "ar" ? "اضغط لفتح المساعد" : lang === "en" ? "Click to view Assistant" : "Нажмите, чтобы открыть ассистент"}
          >
            <div className="bg-model-content">
              <span className="bg-model-icon">⚡</span>
              <span className="bg-model-title">
                {lang === "ar" ? "تنزيل النموذج في الخلفية:" : lang === "en" ? "Background model downloading:" : "Фоновая загрузка модели:"}{" "}
                <strong>{activeDownload.progress || 0}%</strong>
              </span>
              <span className="bg-model-detail">{activeDownload.text}</span>
            </div>
            <div className="bg-model-progress-bar">
              <div
                className="bg-model-progress-fill"
                style={{ width: `${Math.max(3, activeDownload.progress || 0)}%` }}
              />
            </div>
          </Link>
        )}

        {theme === "stalker" && <StalkerHud />}

        {children}
      </div>

      {/* Bottom ButtonBar: Quick action bar with Menu button */}
      <ButtonBar />
    </div>
  );
}
