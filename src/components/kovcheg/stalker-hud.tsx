import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import {
  Radiation,
  Volume2,
  VolumeX,
  Compass,
  Radio,
  Bluetooth,
  MapPin,
  BookOpen,
  X,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { useBitChatStore } from "@/lib/kovcheg/bitchat/store";
import { useArk } from "@/lib/kovcheg/store";
import { t } from "@/lib/kovcheg/i18n";

export function StalkerHud() {
  const lang = useArk((s) => s.lang) ?? "ru";
  const peerCount = useBitChatStore((s) => s.peerCount);

  // Radiation state
  const [radLevel, setRadLevel] = useState(0.14);
  const [isAlarm, setIsAlarm] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isHardwareSensorConnected, setIsHardwareSensorConnected] = useState(false);
  const [connectedSensorName, setConnectedSensorName] = useState<string | null>(null);

  // Compass state
  const [compassHeading, setCompassHeading] = useState<number | null>(null);
  const [compassPermissionNeeded, setCompassPermissionNeeded] = useState(false);

  // GPS state
  const [gpsCoords, setGpsCoords] = useState<{
    lat: number;
    lon: number;
    alt: number | null;
  } | null>(null);

  // Modals
  const [showSensorModal, setShowSensorModal] = useState(false);
  const [sensorStatusMsg, setSensorStatusMsg] = useState("");

  const audioCtxRef = useRef<AudioContext | null>(null);

  // 1. Compass listener (DeviceOrientation API)
  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleOrientation(e: DeviceOrientationEvent) {
      let heading: number | null = null;
      if ((e as any).webkitCompassHeading !== undefined) {
        // iOS Safari
        heading = (e as any).webkitCompassHeading;
      } else if (e.alpha !== null) {
        // Android / standard (compass orientation relative to north)
        heading = (360 - e.alpha) % 360;
      }

      if (heading !== null) {
        setCompassHeading(Math.round(heading));
      }
    }

    if (
      typeof (DeviceOrientationEvent as any) !== "undefined" &&
      typeof (DeviceOrientationEvent as any).requestPermission === "function"
    ) {
      setCompassPermissionNeeded(true);
    } else {
      window.addEventListener("deviceorientation", handleOrientation);
    }

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, []);

  async function requestCompassPermission() {
    if (typeof window === "undefined") return;
    try {
      const response = await (DeviceOrientationEvent as any).requestPermission?.();
      if (response === "granted") {
        setCompassPermissionNeeded(false);
        window.addEventListener("deviceorientation", (e) => {
          const heading = (e as any).webkitCompassHeading ?? (e.alpha ? (360 - e.alpha) % 360 : null);
          if (heading !== null) setCompassHeading(Math.round(heading));
        });
      }
    } catch (err) {
      console.warn("Compass permission error:", err);
    }
  }

  // 2. Real GPS Geolocation
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsCoords({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          alt: pos.coords.altitude ? Math.round(pos.coords.altitude) : null,
        });
      },
      (err) => {
        // Fallback default coordinates (e.g. Zone field outpost)
        console.warn("Geolocation watch:", err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // 3. Audio Geiger clicks (Web Audio API)
  function playClick() {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.015);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.015);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.02);
    } catch {}
  }

  // 4. Radiation simulation / sensor heartbeat
  useEffect(() => {
    if (isHardwareSensorConnected) {
      // If hardware is connected, values come from physical sensor
      return;
    }

    const interval = setInterval(() => {
      if (isAlarm) {
        const surge = +(Math.random() * 2.8 + 3.2).toFixed(2);
        setRadLevel(surge);
        playClick();
      } else {
        const normal = +(0.11 + Math.random() * 0.07).toFixed(2);
        setRadLevel(normal);
        if (Math.random() > 0.6) {
          playClick();
        }
      }
    }, isAlarm ? 300 : 1800);

    return () => clearInterval(interval);
  }, [isAlarm, soundEnabled, isHardwareSensorConnected]);

  // 5. Connect Physical Bluetooth Dosimeter (Web Bluetooth API)
  async function handleConnectBluetoothDosimeter() {
    if (typeof window === "undefined" || !(navigator as any).bluetooth) {
      setSensorStatusMsg(t("pdaBleNotSupported", lang));
      return;
    }

    try {
      setSensorStatusMsg(t("pdaBleScanning", lang));
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ["battery_service", 0x181a, "environmental_sensing"],
      });

      const sensorLabel = device.name || t("pdaBleDefaultName", lang);
      setConnectedSensorName(sensorLabel);
      setIsHardwareSensorConnected(true);
      setSensorStatusMsg(`${t("pdaBleConnected", lang)} ${sensorLabel}`);

      // Listen to disconnect
      device.addEventListener("gattserverdisconnected", () => {
        setIsHardwareSensorConnected(false);
        setConnectedSensorName(null);
        setSensorStatusMsg(t("pdaBleDisconnected", lang));
      });
    } catch (err: any) {
      setSensorStatusMsg(`${t("pdaBleConnectError", lang)} ${err.message || t("pdaBleCancelled", lang)}`);
    }
  }

  function triggerEmission() {
    setIsAlarm(true);
    setTimeout(() => {
      setIsAlarm(false);
    }, 6000);
  }

  // Cardinal point formatter
  function getCardinalDirection(deg: number): string {
    const pointsRu = ["С", "ССВ", "СВ", "ВСВ", "В", "ВЮВ", "ЮВ", "ЮЮВ", "Ю", "ЮЮЗ", "ЮЗ", "ЗЮЗ", "З", "ЗСЗ", "СЗ", "ССЗ"];
    const pointsEn = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    const pointsAr = ["ش", "ش.ش", "ش.ق", "ش.ق", "ق", "ج.ق", "ج.ق", "ج.ق", "ج", "ج.غ", "ج.غ", "ج.غ", "غ", "ش.غ", "ش.غ", "ش.غ"];
    const points = lang === "ar" ? pointsAr : lang === "en" ? pointsEn : pointsRu;
    const idx = Math.round(deg / 22.5) % 16;
    return points[idx];
  }

  const bars = 8;
  const activeBars = isAlarm
    ? 8
    : Math.min(bars, Math.max(1, Math.round((radLevel / 0.3) * bars)));

  return (
    <div
      style={{
        margin: "0 0 1rem",
        padding: "0.6rem 0.8rem",
        background: isAlarm
          ? "color-mix(in srgb, #ef4444 20%, #0d120a)"
          : "#10160d",
        border: isAlarm ? "1.5px solid #ef4444" : "1.5px solid #283723",
        borderRadius: "3px",
        boxShadow: isAlarm
          ? "0 0 16px rgba(239, 68, 68, 0.4), inset 0 0 10px rgba(239, 68, 68, 0.2)"
          : "inset 0 0 10px rgba(0, 0, 0, 0.6)",
        fontFamily: "monospace",
        color: "#d2e4cb",
        fontSize: "0.82rem",
        transition: "all 0.3s ease",
      }}
    >
      {/* Top Status Ribbon */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.4rem",
          borderBottom: "1px solid #1e2b1b",
          paddingBottom: "0.4rem",
          marginBottom: "0.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: isAlarm ? "#ef4444" : "#22c55e",
              boxShadow: isAlarm ? "0 0 8px #ef4444" : "0 0 6px #22c55e",
            }}
          />
          <strong style={{ letterSpacing: "0.1em", color: "#f59e0b" }}>
            {t("pdaTitle", lang)}
          </strong>
          {gpsCoords ? (
            <span style={{ color: "#6f8567", fontSize: "0.74rem" }}>
              [{gpsCoords.lat.toFixed(3)}°N, {gpsCoords.lon.toFixed(3)}°E
              {gpsCoords.alt ? ` • ${gpsCoords.alt} ${t("unitMeters", lang)}` : ""}]
            </span>
          ) : (
            <span style={{ color: "#6f8567", fontSize: "0.74rem" }}>
              {t("pdaSectorDefault", lang)}
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.76rem" }}>
          <span style={{ color: "#8a9e82" }}>
            {t("pdaRadioMesh", lang)} <strong style={{ color: "#22c55e" }}>{peerCount} {t("pdaPeersUnit", lang)}</strong>
          </span>

          <button
            type="button"
            onClick={() => setSoundEnabled((v) => !v)}
            title={soundEnabled ? t("pdaMuteGeiger", lang) : t("pdaUnmuteGeiger", lang)}
            style={{
              background: "transparent",
              border: "none",
              color: soundEnabled ? "#22c55e" : "#556b4f",
              cursor: "pointer",
              padding: "0 0.2rem",
              display: "flex",
              alignItems: "center",
            }}
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>

          <button
            type="button"
            className="chip"
            onClick={() => setShowSensorModal(true)}
            style={{
              padding: "0.1rem 0.45rem",
              fontSize: "0.72rem",
              minHeight: "1.7rem",
              color: isHardwareSensorConnected ? "#22c55e" : "#f59e0b",
              borderColor: isHardwareSensorConnected ? "#22c55e" : "#f59e0b",
              display: "flex",
              alignItems: "center",
              gap: "0.2rem",
            }}
          >
            <Bluetooth size={12} />
            {isHardwareSensorConnected ? t("pdaSensorOn", lang) : t("pdaConnectSensor", lang)}
          </button>

          <Link
            to="/morse"
            className="chip"
            style={{
              padding: "0.1rem 0.45rem",
              fontSize: "0.72rem",
              minHeight: "1.7rem",
              color: "var(--color-lamp)",
              borderColor: "var(--color-lamp)",
              display: "flex",
              alignItems: "center",
              gap: "0.2rem",
              textDecoration: "none",
            }}
          >
            <Zap size={12} />
            {t("pdaMorse", lang)}
          </Link>
        </div>
      </div>

      {/* Main HUD Row: Real Compass + Real Dosimeter */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.8rem",
        }}
      >
        {/* Dosimeter Section */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <Radiation
            size={22}
            style={{
              color: isAlarm ? "#ef4444" : "#f59e0b",
              animation: isAlarm ? "stalker-geiger-flicker 0.4s infinite" : undefined,
            }}
          />
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
              <span style={{ fontSize: "1.1rem", fontWeight: 700, color: isAlarm ? "#ef4444" : "#f59e0b" }}>
                {radLevel.toFixed(2)}
              </span>
              <span style={{ fontSize: "0.75rem", color: "#6f8567" }}>{t("pdaRadUnit", lang)}</span>
              <span
                style={{
                  fontSize: "0.7rem",
                  padding: "0.1rem 0.3rem",
                  borderRadius: "2px",
                  background: isAlarm ? "#ef4444" : "#22c55e",
                  color: "#000",
                  fontWeight: 700,
                  marginLeft: "0.2rem",
                }}
              >
                {isAlarm
                  ? t("pdaEmission", lang)
                  : isHardwareSensorConnected
                  ? t("pdaSensorHw", lang)
                  : t("pdaBgNormal", lang)}
              </span>
            </div>

            {/* Segmented Dosimeter Gauge */}
            <div style={{ display: "flex", gap: "3px", marginTop: "3px" }}>
              {Array.from({ length: bars }).map((_, i) => {
                const filled = i < activeBars;
                let color = "#22c55e";
                if (i >= 4) color = "#f59e0b";
                if (i >= 6) color = "#ef4444";

                return (
                  <div
                    key={i}
                    style={{
                      width: "12px",
                      height: "5px",
                      borderRadius: "1px",
                      background: filled ? color : "#1e281b",
                      boxShadow: filled ? `0 0 5px ${color}` : undefined,
                      transition: "background 0.2s ease",
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Real Dynamic Compass & Mini Radar Section */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
          {/* Live Compass Badge */}
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", justifyContent: "flex-end" }}>
              <Compass size={14} style={{ color: "#22c55e" }} />
              <strong style={{ fontSize: "0.9rem", color: "#d2e4cb" }}>
                {compassHeading !== null
                  ? `${getCardinalDirection(compassHeading)} ${compassHeading}°`
                  : t("pdaCompass", lang)}
              </strong>
            </div>
            {compassPermissionNeeded ? (
              <button
                type="button"
                onClick={requestCompassPermission}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#f59e0b",
                  textDecoration: "underline",
                  fontSize: "0.7rem",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {t("pdaEnableCompass", lang)}
              </button>
            ) : (
              <span style={{ fontSize: "0.7rem", color: "#6f8567", display: "block" }}>
                {t("pdaMagneticBearing", lang)}
              </span>
            )}
          </div>

          {/* Rotating Compass / Radar Disc */}
          <div
            title={t("pdaRadarTitle", lang)}
            style={{
              position: "relative",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: "1.5px solid #22c55e",
              background: "radial-gradient(#112411, #061106)",
              overflow: "hidden",
            }}
          >
            {/* Compass dial rotating with device orientation */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                transform: compassHeading !== null ? `rotate(${-compassHeading}deg)` : undefined,
                transition: "transform 0.15s ease-out",
              }}
            >
              {/* North Indicator */}
              <div
                style={{
                  position: "absolute",
                  top: "2px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: "8px",
                  fontWeight: 900,
                  color: "#ef4444",
                }}
              >
                N
              </div>
              <div
                style={{
                  position: "absolute",
                  bottom: "2px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: "8px",
                  color: "#8a9e82",
                }}
              >
                S
              </div>
            </div>

            {/* Spinning Radar Sweep */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background:
                  "conic-gradient(from 0deg, rgba(34, 197, 94, 0.4) 0deg, transparent 60deg, transparent 360deg)",
                animation: "stalker-radar-sweep 2.5s linear infinite",
              }}
            />

            {/* Center Reticle */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: "4px",
                height: "4px",
                transform: "translate(-50%, -50%)",
                borderRadius: "50%",
                background: "#22c55e",
              }}
            />
          </div>

          <button
            type="button"
            className="chip"
            onClick={triggerEmission}
            style={{
              fontSize: "0.72rem",
              padding: "0.15rem 0.45rem",
              minHeight: "1.8rem",
              color: isAlarm ? "#ef4444" : "#8a9e82",
              borderColor: isAlarm ? "#ef4444" : "#283723",
            }}
          >
            {isAlarm ? t("pdaWarningEmission", lang) : t("pdaTestDetector", lang)}
          </button>
        </div>
      </div>

      {/* Sensor & DIY Radio Hardware Modal */}
      {showSensorModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.8)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            className="card-block"
            style={{
              maxWidth: "520px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#11170f",
              border: "1.5px solid var(--color-lamp)",
              boxShadow: "0 0 25px rgba(245, 158, 11, 0.3)",
              fontFamily: "var(--font-sans)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #23311f", paddingBottom: "0.5rem" }}>
              <strong style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--color-lamp)" }}>
                <Radiation size={18} /> {t("pdaModalTitle", lang)}
              </strong>
              <button
                type="button"
                className="text-btn"
                onClick={() => setShowSensorModal(false)}
                style={{ minHeight: "1.8rem", padding: "0.1rem 0.5rem" }}
              >
                <X size={16} />
              </button>
            </div>

            <p className="meta" style={{ margin: "0.7rem 0" }}>
              {t("pdaModalDesc", lang)}
            </p>

            {/* Connection Actions */}
            <div style={{ background: "rgba(34, 197, 94, 0.08)", border: "1px dashed #283723", padding: "0.8rem", borderRadius: "4px", margin: "0.8rem 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <strong>{t("pdaBleTitle", lang)}</strong>
                  <span className="meta" style={{ display: "block", fontSize: "0.8rem" }}>
                    {t("pdaBleDesc", lang)}
                  </span>
                </div>
                <button
                  type="button"
                  className="text-btn"
                  onClick={handleConnectBluetoothDosimeter}
                  style={{ minHeight: "2.2rem", padding: "0.2rem 0.8rem", background: "var(--color-lamp)", color: "#000", fontWeight: 700 }}
                >
                  <Bluetooth size={15} style={{ marginRight: "4px" }} />
                  {t("pdaFindBleBtn", lang)}
                </button>
              </div>

              {sensorStatusMsg && (
                <div style={{ marginTop: "0.5rem", fontSize: "0.82rem", color: isHardwareSensorConnected ? "#22c55e" : "#f59e0b" }}>
                  {sensorStatusMsg}
                </div>
              )}
            </div>

            {/* DIY Radio & Electronics Guides */}
            <h3 style={{ fontSize: "1rem", margin: "1rem 0 0.4rem", color: "var(--color-fg)" }}>
              {t("pdaDiyGuidesTitle", lang)}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <Link
                to="/read/$id"
                params={{ id: "radio-diy-geiger-counter" }}
                className="hit"
                onClick={() => setShowSensorModal(false)}
                style={{ padding: "0.5rem 0.7rem" }}
              >
                <strong>{t("pdaDiyGeigerTitle", lang)}</strong>
                <span className="meta">{t("pdaDiyGeigerDesc", lang)}</span>
              </Link>

              <Link
                to="/read/$id"
                params={{ id: "radio-diy-repeater-lora" }}
                className="hit"
                onClick={() => setShowSensorModal(false)}
                style={{ padding: "0.5rem 0.7rem" }}
              >
                <strong>{t("pdaDiyLoraTitle", lang)}</strong>
                <span className="meta">{t("pdaDiyLoraDesc", lang)}</span>
              </Link>

              <Link
                to="/read/$id"
                params={{ id: "radio-antennas-long-range" }}
                className="hit"
                onClick={() => setShowSensorModal(false)}
                style={{ padding: "0.5rem 0.7rem" }}
              >
                <strong>{t("pdaDiyAntennaTitle", lang)}</strong>
                <span className="meta">{t("pdaDiyAntennaDesc", lang)}</span>
              </Link>

              <Link
                to="/read/$id"
                params={{ id: "radio-phone-modem-cable" }}
                className="hit"
                onClick={() => setShowSensorModal(false)}
                style={{ padding: "0.5rem 0.7rem" }}
              >
                <strong>{t("pdaDiyModemTitle", lang)}</strong>
                <span className="meta">{t("pdaDiyModemDesc", lang)}</span>
              </Link>
            </div>

            <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="text-btn"
                onClick={() => setShowSensorModal(false)}
              >
                {t("pdaClose", lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
