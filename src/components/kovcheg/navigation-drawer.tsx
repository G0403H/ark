import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  X,
  BookOpen,
  Layers,
  Map,
  Library,
  Siren,
  Radiation,
  Radio,
  MessageSquareText,
  ShieldAlert,
  HardDrive,
  Globe,
  Palette,
  ChevronRight,
  Baby,
  Droplet,
  Mountain,
  Sun,
  Clock,
  Sparkles,
  Lock,
  Unlock,
  KeyRound,
  Users,
  Shield,
  ShieldCheck,
  Heart,
  Smartphone,
} from "lucide-react";
import { LANGUAGES, t } from "@/lib/kovcheg/i18n";
import { useArk } from "@/lib/kovcheg/store";
import { useBitChatStore } from "@/lib/kovcheg/bitchat/store";
import { useTacticalSecurity } from "@/lib/kovcheg/tactical-security";
import { useAppLockStore } from "@/lib/kovcheg/app-lock";
import { AppLockSettingsModal } from "@/components/kovcheg/app-lock-screen";

export function NavigationDrawer() {
  const isOpen = useArk((s) => s.drawerOpen);
  const setOpen = useArk((s) => s.setDrawerOpen);
  const theme = useArk((s) => s.theme);
  const setTheme = useArk((s) => s.setTheme);
  const lang = useArk((s) => s.lang) ?? "ru";
  const setLang = useArk((s) => s.setLang);
  const notesCount = useArk((s) => s.notes.length + s.documents.length);
  const peerCount = useBitChatStore((s) => s.peerCount);
  const isTacticalEnabled = useTacticalSecurity((s) => s.isEnabled);
  const isTacticalUnlocked = useTacticalSecurity((s) => s.isUnlocked);
  const lockTactical = useTacticalSecurity((s) => s.lock);

  // Master Application Lock Password
  const isAppLockEnabled = useAppLockStore((s) => s.isAppLockEnabled);
  const lockApp = useAppLockStore((s) => s.lockApp);
  const emergencyPowerButtonSosEnabled = useAppLockStore((s) => s.emergencyPowerButtonSosEnabled);
  const setEmergencyPowerButtonSosEnabled = useAppLockStore((s) => s.setEmergencyPowerButtonSosEnabled);
  const [showAppLockModal, setShowAppLockModal] = useState(false);

  const path = useRouterState({ select: (s) => s.location.pathname });

  // Close drawer on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setOpen]);

  // Prevent background body scroll when drawer is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const knowledgeItems = [
    {
      href: "/",
      label: t("navSearch", lang),
      sub: t("navKnowledgeSub", lang),
      icon: BookOpen,
      match: (p: string) => p === "/" || p.startsWith("/read"),
    },
    {
      href: "/shelves",
      label: t("navShelves", lang),
      sub: t("navShelvesSub", lang),
      icon: Layers,
      match: (p: string) => p.startsWith("/shelves"),
    },
    {
      href: "/atlas",
      label: t("navAtlas", lang),
      sub: t("navAtlasSub", lang),
      icon: Map,
      match: (p: string) => p.startsWith("/atlas"),
    },
    {
      href: "/libraries",
      label: t("navLibraries", lang),
      sub: t("navLibrariesSub", lang),
      icon: Library,
      match: (p: string) => p.startsWith("/libraries"),
      badge: notesCount > 0 ? `${notesCount}` : undefined,
    },
  ];

  const tacticalItems = [
    {
      href: "/alarm",
      label: t("navAlarm", lang),
      sub: t("navAlarmSub", lang),
      icon: Siren,
      match: (p: string) => p.startsWith("/alarm"),
      danger: true,
    },
    {
      href: "/nuclear",
      label: t("navNuclear", lang),
      sub: t("navNuclearSub", lang),
      icon: Radiation,
      match: (p: string) => p.startsWith("/nuclear"),
      radiation: true,
    },
    {
      href: "/chat",
      label: t("navChat", lang),
      sub: t("navChatSub", lang),
      icon: Radio,
      match: (p: string) => p.startsWith("/chat"),
      badge: peerCount > 0 ? `${peerCount} ${t("activePeers", lang)}` : undefined,
    },
    {
      href: "/atlas",
      label: t("navGpsRadar", lang),
      sub: t("navGpsRadarSub", lang),
      icon: Users,
      match: (p: string) => p.startsWith("/atlas"),
    },
    {
      href: "/assistant",
      label: t("navAssistant", lang),
      sub: t("navAssistantSub", lang),
      icon: MessageSquareText,
      match: (p: string) => p.startsWith("/assistant"),
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="drawer-overlay" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div
        className="drawer-backdrop"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-out side drawer */}
      <aside className="drawer-panel" dir={lang === "ar" ? "rtl" : "ltr"}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-brand">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className="drawer-status-led" />
              <strong className="drawer-brand-name">
                {theme === "stalker"
                  ? (lang === "ar" ? "☢ مساعد ستالكر v2.5-Z" : lang === "en" ? "☢ STALKER PDA v2.5-Z" : "☢ КПК СТАЛКЕРА v2.5-Z")
                  : t("brandName", lang)}
              </strong>
            </div>
            <p className="drawer-brand-sub">
              {theme === "stalker"
                ? (lang === "ar" ? "[المنطقة المحظورة] قائمة النظام" : lang === "en" ? "[CEZ-SOUTH] SYSTEM MENU" : "[ЧЗО-ЮГ] СИСТЕМНОЕ МЕНЮ")
                : t("systemOfflineStatus", lang)}
            </p>
          </div>

          <button
            type="button"
            className="icon-btn drawer-close-btn"
            onClick={() => setOpen(false)}
            aria-label={t("closeMenu", lang)}
            title={t("closeMenu", lang)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Navigation Body */}
        <div className="drawer-body">
          {/* Section 1: Knowledge & Maps */}
          <div className="drawer-section">
            <div className="drawer-section-title">
              {t("sectionKnowledge", lang)}
            </div>
            <div className="drawer-menu-list">
              {knowledgeItems.map((item) => {
                const Icon = item.icon;
                const on = item.match(path);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    data-on={on ? "1" : "0"}
                    className="drawer-menu-item"
                    onClick={() => setOpen(false)}
                  >
                    <div className="drawer-item-icon">
                      <Icon size={18} />
                    </div>
                    <div className="drawer-item-info">
                      <div className="drawer-item-label">{item.label}</div>
                      <div className="drawer-item-sub">{item.sub}</div>
                    </div>
                    {item.badge && (
                      <span className="drawer-item-badge">{item.badge}</span>
                    )}
                    <ChevronRight size={14} className="drawer-item-arrow" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Section 2: Tactical & Emergency */}
          <div className="drawer-section">
            <div className="drawer-section-title">
              {t("sectionTactical", lang)}
            </div>
            <div className="drawer-menu-list">
              {tacticalItems.map((item) => {
                const Icon = item.icon;
                const on = item.match(path);
                let modifier = "";
                if (item.danger) modifier = "item-danger";
                if (item.radiation) modifier = "item-radiation";

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    data-on={on ? "1" : "0"}
                    className={`drawer-menu-item ${modifier}`}
                    onClick={() => setOpen(false)}
                  >
                    <div className="drawer-item-icon">
                      <Icon size={18} />
                    </div>
                    <div className="drawer-item-info">
                      <div className="drawer-item-label">{item.label}</div>
                      <div className="drawer-item-sub">{item.sub}</div>
                    </div>
                    {item.badge && (
                      <span className="drawer-item-badge badge-peer">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight size={14} className="drawer-item-arrow" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Section 2.5: Interactive Survival Tools */}
          <div className="drawer-section">
            <div className="drawer-section-title">
              {lang === "ru" ? "Интерактивные инструменты" : "Interactive Survival Tools"}
            </div>
            <div className="drawer-menu-list">
              <Link
                to="/cycle"
                className="drawer-menu-item"
                onClick={() => setOpen(false)}
              >
                <div className="drawer-item-icon" style={{ color: "#f472b6" }}>
                  <Heart size={18} />
                </div>
                <div className="drawer-item-info">
                  <div className="drawer-item-label">
                    {lang === "ar"
                      ? "تقويم الدورة وصحة المرأة"
                      : lang === "en"
                      ? "Women's Cycle & Health"
                      : "Женский календарь и цикл"}
                  </div>
                  <div className="drawer-item-sub">
                    {lang === "ar"
                      ? "متابعة الخصوبة، المؤن، وأمان كلمة السر"
                      : lang === "en"
                      ? "Fertile window, hygiene rations & lock"
                      : "Овуляция, запас средств гигиены и защита"}
                  </div>
                </div>
                <ChevronRight size={14} className="drawer-item-arrow" />
              </Link>

              <Link
                to="/shelves/$id"
                params={{ id: "pomosh" }}
                className="drawer-menu-item"
                onClick={() => setOpen(false)}
              >
                <div className="drawer-item-icon" style={{ color: "#ec4899" }}>
                  <Baby size={18} />
                </div>
                <div className="drawer-item-info">
                  <div className="drawer-item-label">
                    {t("navLaborTracker", lang)}
                  </div>
                  <div className="drawer-item-sub">
                    {t("navLaborTrackerSub", lang)}
                  </div>
                </div>
                <ChevronRight size={14} className="drawer-item-arrow" />
              </Link>

              <Link
                to="/shelves/$id"
                params={{ id: "pomosh" }}
                className="drawer-menu-item"
                onClick={() => setOpen(false)}
              >
                <div className="drawer-item-icon" style={{ color: "#38bdf8" }}>
                  <Droplet size={18} />
                </div>
                <div className="drawer-item-info">
                  <div className="drawer-item-label">
                    {t("navOrsBurns", lang)}
                  </div>
                  <div className="drawer-item-sub">
                    {t("navOrsBurnsSub", lang)}
                  </div>
                </div>
                <ChevronRight size={14} className="drawer-item-arrow" />
              </Link>

              <Link
                to="/shelves/$id"
                params={{ id: "voda" }}
                className="drawer-menu-item"
                onClick={() => setOpen(false)}
              >
                <div className="drawer-item-icon" style={{ color: "#a855f7" }}>
                  <Mountain size={18} />
                </div>
                <div className="drawer-item-info">
                  <div className="drawer-item-label">
                    {t("navWaterAltitude", lang)}
                  </div>
                  <div className="drawer-item-sub">
                    {t("navWaterAltitudeSub", lang)}
                  </div>
                </div>
                <ChevronRight size={14} className="drawer-item-arrow" />
              </Link>

              <Link
                to="/shelves/$id"
                params={{ id: "svyaz" }}
                className="drawer-menu-item"
                onClick={() => setOpen(false)}
              >
                <div className="drawer-item-icon" style={{ color: "#f59e0b" }}>
                  <Radio size={18} />
                </div>
                <div className="drawer-item-info">
                  <div className="drawer-item-label">
                    {t("navMorseBeacon", lang)}
                  </div>
                  <div className="drawer-item-sub">
                    {t("navMorseBeaconSub", lang)}
                  </div>
                </div>
                <ChevronRight size={14} className="drawer-item-arrow" />
              </Link>

              <Link
                to="/shelves/$id"
                params={{ id: "navigaciya" }}
                className="drawer-menu-item"
                onClick={() => setOpen(false)}
              >
                <div className="drawer-item-icon" style={{ color: "#eab308" }}>
                  <Sun size={18} />
                </div>
                <div className="drawer-item-info">
                  <div className="drawer-item-label">
                    {t("navSunChrono", lang)}
                  </div>
                  <div className="drawer-item-sub">
                    {t("navSunChronoSub", lang)}
                  </div>
                </div>
                <ChevronRight size={14} className="drawer-item-arrow" />
              </Link>
            </div>
          </div>

          {/* Section 3: Settings & Appearance */}
          <div className="drawer-section drawer-settings-section">
            <div className="drawer-section-title">
              {t("sectionSettings", lang)}
            </div>

            {/* Theme Selector */}
            <div className="drawer-settings-row">
              <span className="drawer-settings-label">
                <Palette size={15} />
                {t("themeLabel", lang)}:
              </span>
              <div className="drawer-theme-pills">
                <button
                  type="button"
                  className={`chip ${theme === "stalker" ? "chip-active" : ""}`}
                  data-on={theme === "stalker" ? "1" : "0"}
                  onClick={() => setTheme("stalker")}
                >
                  <Radiation size={13} style={{ marginRight: 3 }} />
                  {t("themeStalker", lang)}
                </button>
                <button
                  type="button"
                  className={`chip ${theme === "shelter" ? "chip-active" : ""}`}
                  data-on={theme === "shelter" ? "1" : "0"}
                  onClick={() => setTheme("shelter")}
                >
                  {t("themeShelter", lang)}
                </button>
                <button
                  type="button"
                  className={`chip ${theme === "paper" ? "chip-active" : ""}`}
                  data-on={theme === "paper" ? "1" : "0"}
                  onClick={() => setTheme("paper")}
                >
                  {t("themePaper", lang)}
                </button>
              </div>
            </div>

            {/* Language Selector Dropdown */}
            <div className="drawer-settings-row">
              <span className="drawer-settings-label">
                <Globe size={15} />
                {t("langSelect", lang)}:
              </span>
              <select
                className="select"
                value={lang}
                onChange={(e) => setLang(e.target.value as any)}
                style={{
                  margin: 0,
                  padding: "0.3rem 0.6rem",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.code === "ru" ? "🇷🇺 Русский" : l.code === "en" ? "🇬🇧 English" : "🇸🇦 العربية"}
                  </option>
                ))}
              </select>
            </div>

            {/* Security Section 1: Master Application Password (App Lock) */}
            <div className="drawer-settings-row" style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px dashed var(--color-border, #333)" }}>
              <span className="drawer-settings-label">
                <ShieldCheck size={15} color={isAppLockEnabled ? "#22c55e" : "#eab308"} />
                {lang === "ar" ? "كلمة مرور التطبيق:" : lang === "en" ? "App Entry Password:" : "Пароль входа в приложение:"}
              </span>

              <div style={{ display: "flex", gap: "0.3rem" }}>
                {isAppLockEnabled ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        lockApp();
                        setOpen(false);
                      }}
                      title={lang === "ar" ? "قفل التطبيق الآن" : lang === "en" ? "Lock app now" : "Заблокировать приложение сейчас"}
                      style={{
                        background: "rgba(239, 68, 68, 0.2)",
                        border: "1px solid #ef4444",
                        color: "#f87171",
                        borderRadius: "4px",
                        padding: "0.2rem 0.5rem",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.2rem",
                      }}
                    >
                      <Lock size={11} />
                      {lang === "ar" ? "قفل" : lang === "en" ? "Lock App" : "Заблокировать"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAppLockModal(true)}
                      style={{
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "1px solid var(--color-border, #444)",
                        color: "#ddd",
                        borderRadius: "4px",
                        padding: "0.2rem 0.5rem",
                        fontSize: "0.72rem",
                        cursor: "pointer",
                      }}
                    >
                      {lang === "ar" ? "تغيير" : lang === "en" ? "Change" : "Сменить"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAppLockModal(true)}
                    style={{
                      background: "rgba(234, 179, 8, 0.15)",
                      border: "1px solid #eab308",
                      color: "#fde047",
                      borderRadius: "4px",
                      padding: "0.2rem 0.6rem",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {lang === "ar" ? "+ تعيين كلمة المرور" : lang === "en" ? "+ Set Password" : "+ Установить пароль"}
                  </button>
                )}
              </div>
            </div>

            {/* Hardware 3x Power Button SOS Toggle under App Password section */}
            <div className="drawer-settings-row">
              <span className="drawer-settings-label" title={lang === "ar" ? "إشارة طوارئ بالضغط 3 مرات على زر الطاقة" : lang === "en" ? "Emergency signal by pressing power button 3 times" : "Экстренный сигнал при 3-кратном нажатии кнопки питания"}>
                <Smartphone size={15} color={emergencyPowerButtonSosEnabled ? "#ef4444" : "#9ca3af"} />
                {lang === "ar" ? "منارة 3x Power SOS:" : lang === "en" ? "3x Power SOS Beacon:" : "3x Power SOS маяк:"}
              </span>

              <button
                type="button"
                onClick={() => setEmergencyPowerButtonSosEnabled(!emergencyPowerButtonSosEnabled)}
                className={`chip ${emergencyPowerButtonSosEnabled ? "chip-active" : ""}`}
                style={{
                  background: emergencyPowerButtonSosEnabled ? "rgba(239, 68, 68, 0.25)" : "rgba(255, 255, 255, 0.05)",
                  color: emergencyPowerButtonSosEnabled ? "#fca5a5" : "#9ca3af",
                  border: emergencyPowerButtonSosEnabled ? "1px solid #ef4444" : "1px solid var(--color-border, #444)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "0.2rem 0.5rem",
                  cursor: "pointer",
                }}
              >
                {emergencyPowerButtonSosEnabled
                  ? (lang === "ar" ? "يعمل (3 ضغطات)" : lang === "en" ? "ON (3 clicks)" : "ВКЛ (3 нажатия)")
                  : (lang === "ar" ? "معطل" : lang === "en" ? "OFF" : "ВЫКЛ")}
              </button>
            </div>

            {/* Security Section 2: Tactical Passcode (Duress / Radio / Morse / GPS) */}
            <div className="drawer-settings-row">
              <span className="drawer-settings-label">
                <Lock size={15} color={isTacticalEnabled ? (isTacticalUnlocked ? "#22c55e" : "#ef4444") : "#9ca3af"} />
                {lang === "ar" ? "كلمة السر التكتيكية:" : lang === "en" ? "Tactical Passcode:" : "Кодовое слово (тактика):"}
              </span>

              {isTacticalEnabled ? (
                isTacticalUnlocked ? (
                  <button
                    type="button"
                    onClick={() => {
                      lockTactical();
                      setOpen(false);
                    }}
                    style={{
                      background: "rgba(239, 68, 68, 0.2)",
                      border: "1px solid #ef4444",
                      color: "#f87171",
                      borderRadius: "4px",
                      padding: "0.2rem 0.5rem",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.2rem",
                    }}
                  >
                    <Lock size={11} />
                    {lang === "ar" ? "قفل التكتيك" : lang === "en" ? "Lock" : "Запереть тактику"}
                  </button>
                ) : (
                  <span style={{ fontSize: "0.75rem", color: "#ef4444", fontWeight: 600 }}>
                    🔒 {lang === "ar" ? "مقفل" : lang === "en" ? "Locked" : "Заперто"}
                  </span>
                )
              ) : (
                <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                  {lang === "ar" ? "معطل" : lang === "en" ? "Disabled" : "Отключено"}
                </span>
              )}
            </div>

            {/* Strict Notice regarding unrecoverable password */}
            <div
              style={{
                marginTop: "0.4rem",
                padding: "0.4rem 0.6rem",
                background: "rgba(234, 179, 8, 0.08)",
                border: "1px solid rgba(234, 179, 8, 0.25)",
                borderRadius: "4px",
                fontSize: "0.68rem",
                color: "#fde047",
                lineHeight: 1.35,
              }}
            >
              ⚠️ <strong>{lang === "ar" ? "هام:" : lang === "en" ? "Important:" : "Важно:"}</strong>{" "}
              {lang === "ar"
                ? "لا يمكن استعادة كلمة المرور أو كلمة السر التكتيكية في حال نسيانها. الطريقة الوحيدة لإعادة الضبط هي مسح بيانات التطبيق بالكامل."
                : lang === "en"
                ? "App password and tactical passcode cannot be recovered if forgotten. Resetting requires clearing app data or reinstalling."
                : "Пароль входа и кодовое слово восстановить невозможно. Сброс доступен только полной очисткой данных / переустановкой приложения."}
            </div>
          </div>
        </div>

        {/* Modal: Setup / Change Master Application Password */}
        <AppLockSettingsModal
          isOpen={showAppLockModal}
          onClose={() => setShowAppLockModal(false)}
        />

        {/* Drawer Footer Status */}
        <div className="drawer-footer">
          <HardDrive size={13} />
          <span>{t("systemOfflineStatus", lang)}</span>
        </div>
      </aside>
    </div>
  );
}

// Re-export NavigationBar as NavigationDrawer for direct compatibility
export const NavigationBar = NavigationDrawer;
