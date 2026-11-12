import { Link, useRouterState } from "@tanstack/react-router";
import { Search, Siren, Radiation, Radio, Menu } from "lucide-react";
import { t } from "@/lib/kovcheg/i18n";
import { useArk } from "@/lib/kovcheg/store";
import { useBitChatStore } from "@/lib/kovcheg/bitchat/store";

export function ButtonBar() {
  const lang = useArk((s) => s.lang) ?? "ru";
  const peerCount = useBitChatStore((s) => s.peerCount);
  const isDrawerOpen = useArk((s) => s.drawerOpen);
  const toggleDrawer = useArk((s) => s.toggleDrawer);
  const path = useRouterState({ select: (s) => s.location.pathname });

  const actions = [
    {
      href: "/",
      label: t("navSearch", lang),
      icon: Search,
      match: (p: string) => p === "/",
      key: "search",
    },
    {
      href: "/alarm",
      label: t("navAlarm", lang),
      icon: Siren,
      match: (p: string) => p.startsWith("/alarm"),
      key: "alarm",
      danger: true,
    },
    {
      href: "/nuclear",
      label: t("navNuclear", lang),
      icon: Radiation,
      match: (p: string) => p.startsWith("/nuclear"),
      key: "nuclear",
      radiation: true,
    },
    {
      href: "/chat",
      label: t("navChatShort", lang),
      icon: Radio,
      match: (p: string) => p.startsWith("/chat"),
      key: "chat",
      badge: peerCount > 0 ? peerCount : undefined,
    },
  ];

  return (
    <nav className="buttonbar dock" aria-label={t("operationalBar", lang)}>
      {actions.map((act) => {
        const Icon = act.icon;
        const on = act.match(path);
        let extraClass = "";
        if (act.danger) extraClass = "action-danger";
        if (act.radiation) extraClass = "action-radiation";

        return (
          <Link
            key={act.key}
            to={act.href}
            data-on={on ? "1" : "0"}
            aria-current={on ? "page" : undefined}
            className={`btnbar-item ${extraClass}`}
          >
            <div className="btnbar-icon-wrap">
              <Icon size={19} strokeWidth={1.85} aria-hidden />
              {act.badge !== undefined && (
                <span className="badge badge-peer" title={`${t("activePeers", lang)}: ${act.badge}`}>
                  {act.badge}
                </span>
              )}
            </div>
            <span className="btnbar-label">{act.label}</span>
          </Link>
        );
      })}

      {/* 5th Button: Opens the slide-out Side Drawer */}
      <button
        type="button"
        onClick={toggleDrawer}
        data-on={isDrawerOpen ? "1" : "0"}
        className="btnbar-item btnbar-menu-btn"
        aria-label={t("navMenu", lang)}
        aria-expanded={isDrawerOpen}
      >
        <div className="btnbar-icon-wrap">
          <Menu size={19} strokeWidth={1.85} aria-hidden />
        </div>
        <span className="btnbar-label">{t("navMenu", lang)}</span>
      </button>
    </nav>
  );
}
