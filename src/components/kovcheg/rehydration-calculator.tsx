import { useState } from "react";
import { Droplet, Flame, AlertCircle, Info, Check, ShieldCheck } from "lucide-react";

export function RehydrationCalculator() {
  const [activeTab, setActiveTab] = useState<"ors" | "burn">("ors");

  // ORS State
  const [weight, setWeight] = useState(65);
  const [condition, setCondition] = useState<"diarrhea" | "heat" | "fever">("diarrhea");

  // Burn State
  const [burnWeight, setBurnWeight] = useState(70);
  const [selectedZones, setSelectedZones] = useState<Record<string, number>>({});

  const BURN_ZONES = [
    { id: "head", label: "Голова и шея", pct: 9 },
    { id: "chest_belly", label: "Грудь и живот", pct: 18 },
    { id: "back", label: "Вся спина и ягодицы", pct: 18 },
    { id: "arm_left", label: "Левая рука целиком", pct: 9 },
    { id: "arm_right", label: "Правая рука целиком", pct: 9 },
    { id: "leg_left", label: "Левая нога целиком", pct: 18 },
    { id: "leg_right", label: "Правая нога целиком", pct: 18 },
    { id: "groin", label: "Пах и промежность", pct: 1 },
  ];

  function toggleBurnZone(id: string, pct: number) {
    setSelectedZones((prev) => {
      const copy = { ...prev };
      if (copy[id]) {
        delete copy[id];
      } else {
        copy[id] = pct;
      }
      return copy;
    });
  }

  const totalBurnPct = Math.min(100, Object.values(selectedZones).reduce((acc, v) => acc + v, 0));
  // Parkland formula: 4 ml * weight(kg) * % burn
  const parklandTotalMl = Math.round(4 * burnWeight * totalBurnPct);
  const parklandFirst8h = Math.round(parklandTotalMl / 2);

  // ORS calculation
  let baseOrsDaily = Math.round(weight * 50); // ml
  if (condition === "diarrhea") baseOrsDaily = Math.round(weight * 75);
  if (condition === "heat") baseOrsDaily = Math.round(weight * 60);

  const litersNeeded = (baseOrsDaily / 1000).toFixed(1);
  const sugarSpoons = (baseOrsDaily / 1000) * 6;
  const saltSpoons = (baseOrsDaily / 1000) * 0.5;

  return (
    <div className="card-block" style={{ marginBottom: "1rem", border: "1.5px solid var(--color-line)" }}>
      {/* Tab Selector */}
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.8rem", borderBottom: "1px solid var(--color-line)", paddingBottom: "0.5rem" }}>
        <button
          type="button"
          className={`chip ${activeTab === "ors" ? "chip-active" : ""}`}
          data-on={activeTab === "ors" ? "1" : "0"}
          onClick={() => setActiveTab("ors")}
          style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
        >
          <Droplet size={15} color="#38bdf8" />
          Регидратация (ОРС ВОЗ)
        </button>
        <button
          type="button"
          className={`chip ${activeTab === "burn" ? "chip-active" : ""}`}
          data-on={activeTab === "burn" ? "1" : "0"}
          onClick={() => setActiveTab("burn")}
          style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
        >
          <Flame size={15} color="#f97316" />
          Ожоги (Правило девяток)
        </button>
      </div>

      {/* ORS TAB */}
      {activeTab === "ors" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
            <Droplet size={20} color="#38bdf8" />
            <strong style={{ fontSize: "1rem" }}>Рецепт полевого раствора ОРС (ВОЗ)</strong>
          </div>
          <p className="meta" style={{ margin: "0 0 0.8rem" }}>
            Единственное спасение при холере, дизентерии, рвоте и тяжелом обезвоживании без капельниц.
          </p>

          {/* Standard 1L Recipe Card */}
          <div
            style={{
              padding: "0.8rem",
              borderRadius: "var(--radius-card)",
              background: "color-mix(in srgb, #38bdf8 10%, var(--color-raise))",
              border: "1.5px solid #38bdf8",
              marginBottom: "0.8rem",
            }}
          >
            <strong style={{ color: "#38bdf8", display: "block", marginBottom: "0.4rem" }}>
              Золотой стандарт на 1 литр чистой кипяченой воды:
            </strong>
            <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.88rem", lineHeight: 1.45 }}>
              <li>
                <strong>6 чайных ложек</strong> сахара без горки (или 20 г)
              </li>
              <li>
                <strong>0.5 чайной ложки</strong> поваренной соли (или 2.5–3 г)
              </li>
              <li>
                <strong>Опционально:</strong> 100 мл свежего апельсинового сока или размятый банан (источник калия).
              </li>
            </ul>
          </div>

          {/* Calculator Inputs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.6rem", marginBottom: "0.8rem" }}>
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--color-muted)", display: "block", marginBottom: "0.2rem" }}>
                Вес пострадавшего (кг):
              </label>
              <input
                type="number"
                min={3}
                max={150}
                value={weight}
                onChange={(e) => setWeight(Math.max(3, Math.min(150, Number(e.target.value) || 60)))}
                className="search-field"
                style={{ padding: "0.4rem 0.6rem", minHeight: "2.2rem" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--color-muted)", display: "block", marginBottom: "0.2rem" }}>
                Причина обезвоживания:
              </label>
              <select
                className="select"
                value={condition}
                onChange={(e) => setCondition(e.target.value as any)}
                style={{ width: "100%", padding: "0.4rem", minHeight: "2.2rem" }}
              >
                <option value="diarrhea">Диарея / Рвота / Инфекция</option>
                <option value="heat">Тепловой удар / Перегрев</option>
                <option value="fever">Высокая температура / Жар</option>
              </select>
            </div>
          </div>

          {/* Output Guidance */}
          <div
            style={{
              padding: "0.7rem 0.8rem",
              background: "var(--color-raise)",
              borderRadius: "var(--radius-card)",
              border: "1px solid var(--color-line)",
              fontSize: "0.84rem",
              lineHeight: 1.4,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
              <span>Расчетный суточный объем:</span>
              <strong style={{ color: "var(--color-lamp)", fontSize: "0.95rem" }}>~{litersNeeded} л / сутки</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem", color: "var(--color-muted)", fontSize: "0.78rem" }}>
              <span>Пропорции на этот объем:</span>
              <span>~{sugarSpoons.toFixed(0)} ч.л. сахара + ~{saltSpoons.toFixed(1)} ч.л. соли</span>
            </div>
            <div style={{ borderTop: "1px solid var(--color-line)", paddingTop: "0.4rem", fontSize: "0.8rem", color: "var(--color-fg)" }}>
              <strong>Правило питья:</strong> При рвоте не пить залпом! По 1 чайной ложке или глотку каждые 2–3 минуты. Вода должна всасываться постепенно.
            </div>
          </div>
        </div>
      )}

      {/* BURN TAB */}
      {activeTab === "burn" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
            <Flame size={20} color="#f97316" />
            <strong style={{ fontSize: "1rem" }}>Оценка ожога (Правило девяток Уоллеса)</strong>
          </div>
          <p className="meta" style={{ margin: "0 0 0.8rem" }}>
            Отметьте обожженные зоны для расчета процента поражения и потребности в жидкости при шоке.
          </p>

          {/* Zone Selector Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.4rem", marginBottom: "0.8rem" }}>
            {BURN_ZONES.map((zone) => {
              const checked = Boolean(selectedZones[zone.id]);
              return (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => toggleBurnZone(zone.id, zone.pct)}
                  style={{
                    padding: "0.5rem 0.6rem",
                    borderRadius: "4px",
                    border: checked ? "1.5px solid #f97316" : "1px solid var(--color-line)",
                    background: checked ? "color-mix(in srgb, #f97316 20%, var(--color-raise))" : "var(--color-raise)",
                    color: checked ? "#f97316" : "var(--color-fg)",
                    fontWeight: checked ? 700 : 500,
                    fontSize: "0.8rem",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>{zone.label}</span>
                  <span>+{zone.pct}%</span>
                </button>
              );
            })}
          </div>

          {/* Weight Input */}
          <div style={{ marginBottom: "0.8rem" }}>
            <label style={{ fontSize: "0.78rem", color: "var(--color-muted)", display: "block", marginBottom: "0.2rem" }}>
              Вес пострадавшего (кг):
            </label>
            <input
              type="number"
              min={10}
              max={150}
              value={burnWeight}
              onChange={(e) => setBurnWeight(Math.max(10, Math.min(150, Number(e.target.value) || 70)))}
              className="search-field"
              style={{ padding: "0.4rem 0.6rem", minHeight: "2.2rem", maxWidth: "12rem" }}
            />
          </div>

          {/* Burn Summary Card */}
          <div
            style={{
              padding: "0.8rem",
              borderRadius: "var(--radius-card)",
              background: totalBurnPct >= 15 ? "color-mix(in srgb, #ef4444 15%, var(--color-raise))" : "var(--color-raise)",
              border: totalBurnPct >= 15 ? "1.5px solid #ef4444" : "1px solid var(--color-line)",
              fontSize: "0.85rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.4rem" }}>
              <span>Площадь поражения кожи:</span>
              <strong style={{ fontSize: "1.3rem", color: totalBurnPct >= 15 ? "#ef4444" : "#f97316" }}>
                {totalBurnPct}%
              </strong>
            </div>

            {totalBurnPct >= 15 && (
              <div style={{ color: "#ef4444", fontWeight: 700, fontSize: "0.8rem", marginBottom: "0.5rem" }}>
                ⚠️ УГРОЗА ОЖОГОВОГО ШОКА! (&gt; 15% у взрослых, &gt; 10% у детей). Необходима немедленная регидратация!
              </div>
            )}

            {totalBurnPct > 0 && (
              <div style={{ borderTop: "1px solid var(--color-line)", paddingTop: "0.4rem", lineHeight: 1.45 }}>
                <div>Суточная потребность (формула Паркланда): <strong>~{parklandTotalMl} мл жидкости</strong></div>
                <div style={{ color: "var(--color-muted)", fontSize: "0.78rem" }}>
                  Из них <strong>{parklandFirst8h} мл</strong> нужно выпить/ввести строго за первые 8 часов с момента ожога!
                </div>
              </div>
            )}

            <div style={{ marginTop: "0.6rem", paddingTop: "0.5rem", borderTop: "1px dashed var(--color-line)", fontSize: "0.78rem", color: "var(--color-muted)" }}>
              <strong>Первая помощь:</strong> Охлаждать проточной чистой водой 15–20 мин. Не мазать маслом, жиром, яйцом или мочой! Пузыри не вскрывать. Накрыть сухой чистой тканью.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
