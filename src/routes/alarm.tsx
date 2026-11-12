import { createFileRoute, Link } from "@tanstack/react-router";
import { getAlarmOrder } from "@/lib/kovcheg/corpus";
import { useArk } from "@/lib/kovcheg/store";
import { t } from "@/lib/kovcheg/i18n";

export const Route = createFileRoute("/alarm")({ component: AlarmPage });

function AlarmPage() {
  const lang = useArk((s) => s.lang) ?? "ru";
  const items = getAlarmOrder(lang);

  return (
    <main>
      <h1 className="screen-title">{t("alarmScreenTitle", lang)}</h1>
      <p className="quiet">{t("alarmScreenSub", lang)}</p>
      <div className="alarm-list">
        {items.map((a) => (
          <Link
            key={a.id}
            to="/alarm/$id"
            params={{ id: a.id }}
            className={a.id.includes("pyl") || a.id.includes("nuclear") ? "alarm-btn danger" : "alarm-btn"}
          >
            {a.title}
            <small>{a.note}</small>
          </Link>
        ))}
      </div>
    </main>
  );
}
