import { useState, useEffect, useRef } from "react";
import { AlertCircle, Clock, Play, RotateCcw, StopCircle } from "lucide-react";
import { useArk } from "@/lib/kovcheg/store";
import { t } from "@/lib/kovcheg/i18n";

export function TourniquetTimer() {
  const lang = useArk((s) => s.lang) ?? "ru";

  const [active, setActive] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [limb, setLimb] = useState<string>("right-leg");

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (active && startTime) {
      intervalRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - startTime) / 1000);
        setElapsedSeconds(secs);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, startTime]);

  // Audio warning when crossing 60 minutes
  useEffect(() => {
    if (elapsedSeconds >= 3600 && elapsedSeconds % 60 === 0) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.2;
        osc.start();
        setTimeout(() => {
          osc.stop();
          audioCtx.close();
        }, 500);
      } catch (e) {
        // AudioContext might require user gesture
      }
    }
  }, [elapsedSeconds]);

  function handleStart() {
    const now = Date.now();
    setStartTime(now);
    setActive(true);
    setElapsedSeconds(0);
  }

  function handleStop() {
    setActive(false);
  }

  function handleReset() {
    setActive(false);
    setStartTime(null);
    setElapsedSeconds(0);
  }

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const isWarning = minutes >= 45 && minutes < 60;
  const isDanger = minutes >= 60;

  const appliedDateStr = startTime
    ? new Date(startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "--:--";

  return (
    <div
      style={{
        background: isDanger
          ? "rgba(239, 68, 68, 0.15)"
          : isWarning
          ? "rgba(234, 179, 8, 0.12)"
          : "var(--color-raise)",
        border: `2px solid ${isDanger ? "var(--color-alarm)" : isWarning ? "var(--color-lamp)" : "var(--color-line)"}`,
        borderRadius: "var(--radius-card)",
        padding: "0.8rem 1rem",
        margin: "0.8rem 0",
      }}
    >
      <div className="row-between" style={{ alignItems: "center", marginBottom: "0.4rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Clock size={18} color={isDanger ? "var(--color-alarm)" : "var(--color-lamp)"} />
          <strong>{t("ttTitle", lang)}</strong>
        </div>
        {active && (
          <span
            style={{
              background: isDanger ? "var(--color-alarm)" : "var(--color-calm)",
              color: "#fff",
              padding: "2px 6px",
              borderRadius: "4px",
              fontSize: "0.75rem",
              fontWeight: "bold",
              animation: isDanger ? "pulse 1s infinite" : "none",
            }}
          >
            {isDanger ? (lang === "ar" ? "تجاوز الحد الحرج!" : lang === "en" ? "CRITICAL THRESHOLD!" : "КРИТИЧЕСКИЙ ПОРОГ!") : (lang === "ar" ? "العد جارٍ" : lang === "en" ? "COUNTING" : "ИДЕТ ОТСЧЕТ")}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: "0.8rem", alignItems: "center", flexWrap: "wrap", margin: "0.6rem 0" }}>
        <div>
          <label className="meta">{t("ttLimbLabel", lang)}:</label>
          <select
            value={limb}
            onChange={(e) => setLimb(e.target.value)}
            disabled={active}
            style={{
              display: "block",
              background: "var(--color-bg)",
              color: "var(--color-fg)",
              border: "1px solid var(--color-line)",
              borderRadius: "4px",
              padding: "0.2rem 0.4rem",
              fontSize: "0.85rem",
              marginTop: 2,
            }}
          >
            <option value="right-leg">{t("ttLimbRightLeg", lang)}</option>
            <option value="left-leg">{t("ttLimbLeftLeg", lang)}</option>
            <option value="right-arm">{t("ttLimbRightArm", lang)}</option>
            <option value="left-arm">{t("ttLimbLeftArm", lang)}</option>
            <option value="improvised">{t("ttLimbImprovised", lang)}</option>
          </select>
        </div>

        <div style={{ textAlign: "center", minWidth: 100 }}>
          <span className="meta">{t("ttTimeApplied", lang)}</span>
          <div style={{ fontSize: "1.1rem", fontWeight: "bold" }}>{appliedDateStr}</div>
        </div>

        <div style={{ textAlign: "center", minWidth: 110 }}>
          <span className="meta">{t("ttElapsed", lang)}</span>
          <div
            style={{
              fontSize: "1.4rem",
              fontWeight: "bold",
              fontVariantNumeric: "tabular-nums",
              color: isDanger ? "var(--color-alarm)" : isWarning ? "var(--color-lamp)" : "var(--color-fg)",
            }}
          >
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </div>
        </div>
      </div>

      {isDanger && (
        <div style={{ color: "var(--color-alarm)", fontSize: "0.85rem", margin: "0.4rem 0", display: "flex", gap: 4, alignItems: "center" }}>
          <AlertCircle size={16} />
          <strong>{t("ttWarningText", lang)}</strong>
        </div>
      )}

      {isWarning && (
        <div style={{ color: "var(--color-lamp)", fontSize: "0.85rem", margin: "0.4rem 0" }}>
          {lang === "ar"
            ? "انقضت 45 دقيقة. جهز ضماداً ضاغطاً أو مادة مرقئة تمهيداً لتحويل موضع العصابة تحت إشراف طبي."
            : lang === "en"
            ? "45 minutes elapsed. Prepare pressure dressing or hemostatic agent for medical conversion."
            : "Прошло 45 минут. Подготовьте давящую повязку или гемостатик для возможной конверсии жгута под контролем врача."}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.6rem" }}>
        {!active && !startTime && (
          <button
            type="button"
            className="text-btn"
            style={{ background: "var(--color-alarm)", color: "#fff", fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: 4 }}
            onClick={handleStart}
          >
            <Play size={15} /> {t("ttStart", lang)}
          </button>
        )}
        {active && (
          <button
            type="button"
            className="text-btn"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            onClick={handleStop}
          >
            <StopCircle size={15} /> {t("ttStop", lang)}
          </button>
        )}
        {!active && startTime && (
          <button
            type="button"
            className="text-btn"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            onClick={handleStart}
          >
            <Play size={15} /> {t("ttStart", lang)}
          </button>
        )}
        {startTime && (
          <button
            type="button"
            className="icon-btn"
            style={{ minHeight: "2.2rem" }}
            onClick={handleReset}
            title={t("ttReset", lang)}
          >
            <RotateCcw size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
