import { useState } from "react";
import { Mountain, Flame, Clock, ShieldCheck, AlertTriangle, Droplets } from "lucide-react";

export function WaterAltitudeCalculator() {
  const [altitude, setAltitude] = useState(1500); // meters above sea level
  const [waterClarity, setWaterClarity] = useState<"clear" | "turbid">("clear");

  // Boiling point formula: T_boil ≈ 100 - (altitude / 300)
  const boilingPoint = Math.max(70, +(100 - altitude / 295).toFixed(1));

  // Required boiling duration
  let boilMinutes = 1;
  let boilAdvice = "1 минута активного бурления уничтожает все патогены.";
  if (altitude >= 1000 && altitude < 2000) {
    boilMinutes = 3;
    boilAdvice = "Кипение менее горячее. Кипятить не менее 3 минут под крышкой.";
  } else if (altitude >= 2000 && altitude < 3000) {
    boilMinutes = 5;
    boilAdvice = "Точка кипения сильно снижена. Кипятить строго от 5 минут!";
  } else if (altitude >= 3000) {
    boilMinutes = 10;
    boilAdvice = "Вода кипит при температуре ниже 90°C! Кипятить от 10 минут под крышкой или использовать химическую дезинфекцию.";
  }

  return (
    <div className="card-block" style={{ marginBottom: "1rem", border: "1.5px solid var(--color-line)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <Mountain size={22} color="var(--color-lamp)" />
        <div>
          <strong style={{ fontSize: "1.05rem" }}>Водоочистка и кипячение на высоте</strong>
          <p className="meta" style={{ margin: "0.1rem 0 0" }}>
            Расчет точки кипения, времени экспозиции и дозировок хлора
          </p>
        </div>
      </div>

      {/* Altitude Slider */}
      <div style={{ marginBottom: "0.8rem", padding: "0.8rem", background: "var(--color-raise)", borderRadius: "var(--radius-card)", border: "1px solid var(--color-line)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
          <span style={{ fontSize: "0.82rem", color: "var(--color-muted)", fontWeight: 600 }}>
            Высота над уровнем моря:
          </span>
          <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--color-lamp)" }}>
            {altitude} м
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={4500}
          step={100}
          value={altitude}
          onChange={(e) => setAltitude(Number(e.target.value))}
          style={{ width: "100%", accentColor: "var(--color-lamp)", cursor: "pointer" }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--color-muted)", marginTop: "0.2rem" }}>
          <span>0 м (Равнина)</span>
          <span>1500 м (Предгорье)</span>
          <span>3000 м (Горы)</span>
          <span>4500 м (Высокогорье)</span>
        </div>
      </div>

      {/* Results Display */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.6rem",
          marginBottom: "0.8rem",
        }}
      >
        <div
          style={{
            padding: "0.7rem",
            background: "var(--color-raise)",
            borderRadius: "var(--radius-card)",
            border: "1px solid var(--color-line)",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: "0.74rem", color: "var(--color-muted)", textTransform: "uppercase" }}>Точка кипения</span>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: boilingPoint < 92 ? "#ef4444" : "#f59e0b", margin: "0.2rem 0" }}>
            {boilingPoint}°C
          </div>
          <span style={{ fontSize: "0.74rem", color: "var(--color-muted)" }}>
            {altitude === 0 ? "Норма 100°C" : `Ниже на ${(100 - boilingPoint).toFixed(1)}°C`}
          </span>
        </div>

        <div
          style={{
            padding: "0.7rem",
            background: "var(--color-raise)",
            borderRadius: "var(--radius-card)",
            border: "1px solid var(--color-line)",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: "0.74rem", color: "var(--color-muted)", textTransform: "uppercase" }}>Время кипячения</span>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--color-lamp)", margin: "0.2rem 0" }}>
            {boilMinutes} мин
          </div>
          <span style={{ fontSize: "0.74rem", color: "var(--color-muted)" }}>Непрерывно под крышкой</span>
        </div>
      </div>

      <div
        style={{
          padding: "0.6rem 0.8rem",
          background: altitude >= 2000 ? "color-mix(in srgb, #ef4444 12%, var(--color-raise))" : "var(--color-raise)",
          border: altitude >= 2000 ? "1px solid #ef4444" : "1px solid var(--color-line)",
          borderRadius: "var(--radius-card)",
          marginBottom: "0.8rem",
          fontSize: "0.82rem",
          lineHeight: 1.4,
        }}
      >
        <strong>Рекомендация:</strong> {boilAdvice}
      </div>

      {/* Chemical Disinfection Table */}
      <div
        style={{
          padding: "0.7rem 0.8rem",
          background: "var(--color-raise)",
          borderRadius: "var(--radius-card)",
          border: "1px solid var(--color-line)",
          fontSize: "0.82rem",
        }}
      >
        <strong style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--color-lamp)", marginBottom: "0.4rem" }}>
          <Droplets size={15} /> Химическое обеззараживание (без кипячения):
        </strong>
        <ul style={{ margin: 0, paddingLeft: "1.2rem", lineHeight: 1.45 }}>
          <li>
            <strong>Акватабс / Пантоцид:</strong> 1 таблетка на 1 л прозрачной воды (2 таблетки на 1 л мутной). Обязательная экспозиция: <strong>30–40 минут</strong> перед питьем!
          </li>
          <li>
            <strong>Йод 5% (крайняя мера):</strong> 3–5 капель на 1 л светлой воды (8–10 капель на мутную). Экспозиция 30 мин. <em>Внимание: беременным и при болезнях щитовидной железы пить йодированную воду нельзя!</em>
          </li>
          <li>
            <strong>Мутная вода:</strong> Сначала профильтровать через песок, ткань и угли или дать отстояться. Муть экранирует микробы от хлора и тепла!
          </li>
        </ul>
      </div>
    </div>
  );
}
