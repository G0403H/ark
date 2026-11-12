import { useState } from "react";
import { Sun, Compass, Clock, Eye, AlertCircle } from "lucide-react";

export function SunChronoCompass() {
  const [fingers, setFingers] = useState(4); // number of fingers

  const minutesLeft = fingers * 15;
  const hours = Math.floor(minutesLeft / 60);
  const remainingMins = minutesLeft % 60;

  return (
    <div className="card-block" style={{ marginBottom: "1rem", border: "1.5px solid var(--color-line)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
        <Sun size={22} color="#f59e0b" />
        <div>
          <strong style={{ fontSize: "1.05rem" }}>Солнечный хронометр и ориентирование</strong>
          <p className="meta" style={{ margin: "0.1rem 0 0" }}>
            Время до заката по правилу пальцев и компас по солнцу
          </p>
        </div>
      </div>

      {/* Sun Fingers Rule Calculator */}
      <div style={{ padding: "0.8rem", background: "var(--color-raise)", borderRadius: "var(--radius-card)", border: "1px solid var(--color-line)", marginBottom: "0.8rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.3rem" }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-muted)" }}>
            Пальцев между солнцем и горизонтом:
          </span>
          <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "#f59e0b" }}>
            {fingers} {fingers === 1 ? "палец" : fingers < 5 ? "пальца" : "пальцев"}
          </span>
        </div>

        <input
          type="range"
          min={1}
          max={12}
          step={1}
          value={fingers}
          onChange={(e) => setFingers(Number(e.target.value))}
          style={{ width: "100%", accentColor: "#f59e0b", cursor: "pointer" }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--color-muted)", marginTop: "0.2rem" }}>
          <span>1 палец (15 мин)</span>
          <span>4 пальца (1 ладонь = 1 час)</span>
          <span>8 пальцев (2 ладони = 2 ч)</span>
        </div>

        {/* Calculated Result */}
        <div
          style={{
            marginTop: "0.8rem",
            padding: "0.6rem 0.8rem",
            borderRadius: "4px",
            background: minutesLeft <= 45 ? "color-mix(in srgb, #ef4444 15%, var(--color-raise))" : "color-mix(in srgb, #f59e0b 12%, var(--color-raise))",
            border: minutesLeft <= 45 ? "1px solid #ef4444" : "1px solid #f59e0b",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "0.84rem" }}>Осталось светлого времени:</span>
          <strong style={{ fontSize: "1.1rem", color: minutesLeft <= 45 ? "#ef4444" : "#f59e0b" }}>
            {hours > 0 ? `${hours} ч ` : ""}{remainingMins > 0 ? `${remainingMins} мин` : ""}
          </strong>
        </div>

        {minutesLeft <= 45 && (
          <p style={{ margin: "0.4rem 0 0", fontSize: "0.78rem", color: "#ef4444", fontWeight: 600 }}>
            ⚠️ Сумерки наступают! Срочно прекращайте движение, ищите укрытие и разводите огонь.
          </p>
        )}
      </div>

      {/* Sun Compass Instructions */}
      <div
        style={{
          padding: "0.7rem 0.8rem",
          background: "var(--color-raise)",
          borderRadius: "var(--radius-card)",
          border: "1px solid var(--color-line)",
          fontSize: "0.82rem",
          lineHeight: 1.45,
        }}
      >
        <strong style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--color-lamp)", marginBottom: "0.4rem" }}>
          <Compass size={15} /> Определение сторон света без компаса:
        </strong>
        <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
          <li>
            <strong>По часам со стрелками (Северное полушарие):</strong> Направьте маленькую (часовую) стрелку прямо на солнце. Угол между часовой стрелкой и цифрой 1 на циферблате разделите пополам. Линия деления указывает строго на <strong>ЮГ</strong>. Противоположная сторона — <strong>СЕВЕР</strong>.
          </li>
          <li>
            <strong>Метод тени от колышка (Гномон):</strong> Воткните ровную палку в землю. Отметьте камнем конец первой тени. Подождите 15–20 минут, отметьте второй камень. Прямая линия от 1-го камня ко 2-му всегда направлена с <strong>ЗАПАДА на ВОСТОК</strong>!
          </li>
        </ul>
      </div>
    </div>
  );
}
