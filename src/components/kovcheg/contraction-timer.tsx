import { useState, useEffect, useRef } from "react";
import { Baby, Play, Square, Trash2, Clock, ShieldAlert, HeartPulse, CheckCircle2, AlertTriangle } from "lucide-react";

interface Contraction {
  id: string;
  startTime: number;
  duration: number; // in seconds
  interval?: number; // interval from previous contraction start (in seconds)
}

export function ContractionTimer() {
  const [isActive, setIsActive] = useState(false);
  const [currentDuration, setCurrentDuration] = useState(0);
  const [history, setHistory] = useState<Contraction[]>([]);
  const [showChecklist, setShowChecklist] = useState(false);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isActive) {
      startTimeRef.current = Date.now() - currentDuration * 1000;
      timerRef.current = window.setInterval(() => {
        if (startTimeRef.current) {
          const diff = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setCurrentDuration(diff);
        }
      }, 500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  function handleStart() {
    setIsActive(true);
    setCurrentDuration(0);
    startTimeRef.current = Date.now();
  }

  function handleStop() {
    if (!isActive || currentDuration < 5) {
      setIsActive(false);
      setCurrentDuration(0);
      return;
    }

    const now = Date.now();
    const start = startTimeRef.current || (now - currentDuration * 1000);

    let interval: number | undefined = undefined;
    if (history.length > 0) {
      const lastStart = history[0].startTime;
      interval = Math.floor((start - lastStart) / 1000);
    }

    const newRecord: Contraction = {
      id: `${start}-${Math.random()}`,
      startTime: start,
      duration: currentDuration,
      interval,
    };

    setHistory((prev) => [newRecord, ...prev].slice(0, 20));
    setIsActive(false);
    setCurrentDuration(0);
  }

  function deleteRecord(id: string) {
    setHistory((prev) => prev.filter((r) => r.id !== id));
  }

  function clearAll() {
    setHistory([]);
    setIsActive(false);
    setCurrentDuration(0);
  }

  function formatSec(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    if (m === 0) return `${sec}с`;
    return `${m}м ${sec < 10 ? "0" : ""}${sec}с`;
  }

  // Determine labor phase based on recent 3 contractions
  const recent = history.slice(0, 3);
  const avgDuration = recent.length > 0 ? Math.round(recent.reduce((acc, r) => acc + r.duration, 0) / recent.length) : 0;
  const intervals = recent.map((r) => r.interval).filter((v): v is number => v !== undefined);
  const avgInterval = intervals.length > 0 ? Math.round(intervals.reduce((acc, v) => acc + v, 0) / intervals.length) : 0;

  let phaseLabel = "Ожидание схваток (наблюдение)";
  let phaseColor = "var(--color-muted)";
  let phaseAdvice = "Женщине пить воду, не напрягаться, готовить стерильные материалы.";

  if (recent.length >= 2) {
    if (avgInterval <= 150 && avgDuration >= 50) {
      phaseLabel = "⚠️ ПОТУЖНОЙ ПЕРИОД / РОДЫ БЛИЗКО!";
      phaseColor = "#ef4444";
      phaseAdvice = "Схватки каждые 1.5–2 мин. Ребенок опускается. Не тужиться силой до раскрытия, дышать «собачкой». Готовьте руки и тепло!";
    } else if (avgInterval <= 330 && avgDuration >= 40) {
      phaseLabel = "АКТИВНАЯ ФАЗА (Правило 4-1-1)";
      phaseColor = "#f59e0b";
      phaseAdvice = "Схватки каждые 4–5 мин по 45–60 сек. Пора в укрытие или готовить место родов. Стерилизуйте лигатуры и ножницы!";
    } else {
      phaseLabel = "Латентная (начальная) фаза";
      phaseColor = "#22c55e";
      phaseAdvice = "Интервалы длинные (> 5–8 мин). Сохраняйте силы, дышите ровно, согревайте помещение.";
    }
  }

  return (
    <div className="card-block" style={{ marginBottom: "1rem", border: "1.5px solid var(--color-line)" }}>
      {/* Header */}
      <div className="row-between" style={{ alignItems: "center", marginBottom: "0.6rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Baby size={22} color="var(--color-lamp)" />
          <div>
            <strong style={{ fontSize: "1.05rem" }}>Акушерский таймер схваток</strong>
            <p className="meta" style={{ margin: "0.1rem 0 0" }}>
              Замер интервалов, фаз родов и полевой чеклист
            </p>
          </div>
        </div>

        <button
          type="button"
          className="chip"
          onClick={() => setShowChecklist((v) => !v)}
          style={{ fontSize: "0.78rem" }}
        >
          {showChecklist ? "Скрыть чеклист" : "📋 Чеклист родов"}
        </button>
      </div>

      {/* Main Counter & Big Button */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "1rem 0.5rem",
          background: isActive ? "color-mix(in srgb, #ef4444 15%, var(--color-raise))" : "var(--color-raise)",
          border: isActive ? "2px solid #ef4444" : "1px solid var(--color-line)",
          borderRadius: "var(--radius-card)",
          marginBottom: "0.8rem",
          transition: "all 0.2s ease",
        }}
      >
        <span style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-muted)" }}>
          {isActive ? "Схватка идёт..." : "Готов к замеру"}
        </span>

        <div style={{ fontSize: "2.4rem", fontWeight: 800, fontFamily: "monospace", margin: "0.2rem 0 0.8rem", color: isActive ? "#ef4444" : "var(--color-fg)" }}>
          {formatSec(currentDuration)}
        </div>

        {!isActive ? (
          <button
            type="button"
            className="alarm-btn"
            onClick={handleStart}
            style={{
              width: "100%",
              maxWidth: "18rem",
              background: "#22c55e",
              borderColor: "#16a34a",
              color: "#000",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.7rem",
            }}
          >
            <Play size={18} fill="#000" />
            СХВАТКА НАЧАЛАСЬ
          </button>
        ) : (
          <button
            type="button"
            className="alarm-btn danger"
            onClick={handleStop}
            style={{
              width: "100%",
              maxWidth: "18rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.7rem",
            }}
          >
            <Square size={18} fill="#fff" />
            СХВАТКА ЗАВЕРШИЛАСЬ
          </button>
        )}
      </div>

      {/* Phase Indicator */}
      <div
        style={{
          padding: "0.6rem 0.8rem",
          borderRadius: "var(--radius-card)",
          background: "var(--color-raise)",
          border: "1px solid var(--color-line)",
          marginBottom: "0.8rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--color-muted)", textTransform: "uppercase", fontWeight: 700 }}>
            Состояние:
          </span>
          <strong style={{ fontSize: "0.85rem", color: phaseColor }}>
            {phaseLabel}
          </strong>
        </div>
        <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--color-fg)", lineHeight: 1.35 }}>
          {phaseAdvice}
        </p>
      </div>

      {/* Expandable Field Obstetrics Checklist */}
      {showChecklist && (
        <div
          style={{
            padding: "0.8rem",
            borderRadius: "var(--radius-card)",
            background: "color-mix(in srgb, var(--color-line) 30%, var(--color-raise))",
            border: "1.5px dashed var(--color-lamp)",
            marginBottom: "0.8rem",
            fontSize: "0.84rem",
            lineHeight: 1.45,
          }}
        >
          <strong style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--color-lamp)", marginBottom: "0.5rem" }}>
            <AlertTriangle size={16} /> Пошаговый алгоритм полевого родовспоможения:
          </strong>
          <ol style={{ paddingLeft: "1.2rem", margin: 0, display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            <li>
              <strong>Стерилизация инструмента:</strong> Прокипятите 15–20 мин ножницы (или лезвие) и 2 крепкие хлопчатобумажные нити (лигатуры). Руки вымыть с мылом и обработать спиртом/хлоргексидином.
            </li>
            <li>
              <strong>Тепло и чистота:</strong> Помещение без сквозняков (+24°C и выше). Под женщину — сухая чистая ткань. Младенцы погибают от переохлаждения за минуты!
            </li>
            <li>
              <strong>Дыхание при прорезывании:</strong> Когда головка натягивает промежность, женщина дышит «собачкой» (часто и поверхностно), не тужась изо всех сил — это предотвращает разрывы.
            </li>
            <li>
              <strong>Поддержка головки:</strong> Придерживайте ладонью бережно. Не тяните! Если пуповина на шее — осторожно пальцем сбросьте петлю через затылок.
            </li>
            <li>
              <strong>Рождение и «Кожа к коже»:</strong> Обсушите ребенка теплой сухой тканью, положите маме на живот/грудь кожа к коже, накройте одеялом. Слизь изо рта и носа снимите салфеткой снаружи.
            </li>
            <li>
              <strong>Рождение последа (плаценты):</strong> <span style={{ color: "#ef4444", fontWeight: 700 }}>КАТЕГОРИЧЕСКИ НЕ ТЯНИТЕ ЗА ПУПОВИНУ!</span> Плацента выйдет сама через 15–40 мин. Приложите малыша к груди — это вызовет сокращение матки.
            </li>
            <li>
              <strong>Пересечение пуповины:</strong> Резать только после полного прекращения пульсации (через 5–10 мин). Перевяжите стерильной нитью в 2 местах: 1-й узел — 10 см от пупка, 2-й узел — 15 см. Разрез ножницами строго между ними!
            </li>
            <li>
              <strong>Остановка кровотечения:</strong> После выхода плаценты — круговой бережный наружный массаж матки через низ живота до образования плотного «шара», холод на низ живота, опорожнить мочевой пузырь.
            </li>
          </ol>
        </div>
      )}

      {/* Contraction History Table */}
      {history.length > 0 && (
        <div>
          <div className="row-between" style={{ alignItems: "center", marginBottom: "0.4rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase" }}>
              Журнал схваток ({history.length}):
            </span>
            <button
              type="button"
              onClick={clearAll}
              style={{ background: "none", border: "none", color: "var(--color-muted)", cursor: "pointer", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.2rem" }}
            >
              <Trash2 size={13} /> Очистить
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", maxHeight: "12rem", overflowY: "auto" }}>
            {history.map((item, index) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.4rem 0.6rem",
                  background: "var(--color-raise)",
                  borderRadius: "4px",
                  fontSize: "0.82rem",
                  borderLeft: item.duration >= 50 ? "3px solid #ef4444" : "3px solid #22c55e",
                }}
              >
                <div>
                  <span style={{ fontWeight: 600 }}>Длит: {formatSec(item.duration)}</span>
                  {item.interval !== undefined && (
                    <span style={{ color: "var(--color-muted)", marginLeft: "0.6rem" }}>
                      Пауза: {formatSec(item.interval)}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ color: "var(--color-muted)", fontSize: "0.75rem" }}>
                    {new Date(item.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteRecord(item.id)}
                    style={{ background: "none", border: "none", color: "var(--color-muted)", cursor: "pointer", padding: "0.1rem" }}
                    title="Удалить запись"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
