import { useState, useEffect, useMemo, useRef } from "react";
import {
  Compass as CompassIcon,
  Navigation,
  Sun,
  Shield,
  RotateCcw,
  Sliders,
  ChevronDown,
  ChevronUp,
  MapPin,
  Users,
  AlertTriangle,
  Info,
} from "lucide-react";
import {
  normalizeHeading,
  getCardinalDirection,
  calculateBearing,
  calculateDistanceKm,
  calculateRelativeBearing,
  estimateMagneticDeclination,
  magneticToTrueHeading,
} from "@/lib/kovcheg/compass";
import type { Waypoint } from "@/components/kovcheg/map-atlas";
import { useGpsPeerStore } from "@/lib/kovcheg/gps-peer-tracker";
import { useArk } from "@/lib/kovcheg/store";
import { t } from "@/lib/kovcheg/i18n";

interface TacticalCompassProps {
  userLocation: { lat: number; lng: number; accuracy: number } | null;
  waypoints?: Waypoint[];
  targetLat?: string;
  targetLng?: string;
  onSetTarget?: (lat: string, lng: string) => void;
  onSwitchToMap?: () => void;
}

export function TacticalCompass({
  userLocation,
  waypoints = [],
  targetLat: propTargetLat = "56.0",
  targetLng: propTargetLng = "38.0",
  onSetTarget,
  onSwitchToMap,
}: TacticalCompassProps) {
  const lang = useArk((s) => s.lang) ?? "ru";
  const friends = useGpsPeerStore((s) => s.friends);

  // Compass heading state
  const [heading, setHeading] = useState<number>(0);
  const [sensorActive, setSensorActive] = useState<boolean>(false);
  const [permissionRequested, setPermissionRequested] = useState<boolean>(false);
  const [useTrueNorth, setUseTrueNorth] = useState<boolean>(false);
  const [manualHeading, setManualHeading] = useState<number>(0);
  const [isManualOverride, setIsManualOverride] = useState<boolean>(false);

  // Target coordinates
  const [targetLat, setLocalTargetLat] = useState<string>(propTargetLat);
  const [targetLng, setLocalTargetLng] = useState<string>(propTargetLng);
  const [targetLabel, setTargetLabel] = useState<string>("Заданные координаты");

  // Accordion state for survival orientation methods
  const [showSolarGuide, setShowSolarGuide] = useState<boolean>(false);
  const [showCalibrationHelp, setShowCalibrationHelp] = useState<boolean>(false);
  const [fingers, setFingers] = useState<number>(4);

  // Keep synced if prop changes
  useEffect(() => {
    setLocalTargetLat(propTargetLat);
    setLocalTargetLng(propTargetLng);
  }, [propTargetLat, propTargetLng]);

  // Handle device orientation sensors
  useEffect(() => {
    let mounted = true;

    function handleOrientation(event: DeviceOrientationEvent) {
      if (!mounted) return;

      let compassHeading: number | null = null;

      // WebKit / iOS specific compass heading
      if ("webkitCompassHeading" in event && typeof (event as any).webkitCompassHeading === "number") {
        compassHeading = (event as any).webkitCompassHeading;
      } else if (event.alpha !== null && event.alpha !== undefined) {
        // Standard Android / Chrome
        // alpha: 0 is North if absolute is true, else relative
        if ((event as any).absolute) {
          compassHeading = 360 - event.alpha;
        } else {
          compassHeading = 360 - event.alpha;
        }
      }

      if (compassHeading !== null && !isNaN(compassHeading)) {
        const norm = normalizeHeading(compassHeading);
        setHeading(norm);
        setSensorActive(true);
      }
    }

    const win = typeof window !== "undefined" ? (window as any) : null;
    if (!win) return;

    // Try absolute orientation first (best on modern Android)
    if ("ondeviceorientationabsolute" in win) {
      win.addEventListener("deviceorientationabsolute", handleOrientation, true);
    } else if (win.DeviceOrientationEvent) {
      win.addEventListener("deviceorientation", handleOrientation, true);
    }

    return () => {
      mounted = false;
      if ("ondeviceorientationabsolute" in win) {
        win.removeEventListener("deviceorientationabsolute", handleOrientation, true);
      } else if (win.DeviceOrientationEvent) {
        win.removeEventListener("deviceorientation", handleOrientation, true);
      }
    };
  }, []);

  // Request iOS permission if available
  async function requestIosPermission() {
    setPermissionRequested(true);
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof (DeviceOrientationEvent as any).requestPermission === "function"
    ) {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === "granted") {
          setSensorActive(true);
        }
      } catch (err) {
        console.error("DeviceOrientation permission error:", err);
      }
    }
  }

  // Active heading (manual slider override takes precedence if sensor is off or user wants to test)
  const activeHeading = isManualOverride || !sensorActive ? manualHeading : heading;

  // Magnetic declination calculation
  const declination = useMemo(() => {
    const lat = userLocation ? userLocation.lat : 55.75;
    const lng = userLocation ? userLocation.lng : 37.61;
    return estimateMagneticDeclination(lat, lng);
  }, [userLocation]);

  // Displayed heading (magnetic or true)
  const effectiveHeading = useTrueNorth
    ? magneticToTrueHeading(activeHeading, declination)
    : activeHeading;

  const cardinal = getCardinalDirection(effectiveHeading, lang);

  // Target navigation calculation
  const targetMath = useMemo(() => {
    const tLat = parseFloat(targetLat);
    const tLng = parseFloat(targetLng);
    if (isNaN(tLat) || isNaN(tLng)) return null;

    const fromLat = userLocation ? userLocation.lat : 55.75;
    const fromLng = userLocation ? userLocation.lng : 37.61;

    const targetBearing = calculateBearing(fromLat, fromLng, tLat, tLng);
    const distanceKm = calculateDistanceKm(fromLat, fromLng, tLat, tLng);
    const steering = calculateRelativeBearing(effectiveHeading, targetBearing);

    return {
      targetBearing,
      distanceKm,
      distanceMeters: Math.round(distanceKm * 1000),
      steering,
    };
  }, [userLocation, targetLat, targetLng, effectiveHeading]);

  // Sunset finger rule math
  const minutesLeft = fingers * 15;
  const sunsetHours = Math.floor(minutesLeft / 60);
  const remainingMins = minutesLeft % 60;

  function selectWaypointTarget(wp: Waypoint) {
    setLocalTargetLat(wp.lat.toFixed(4));
    setLocalTargetLng(wp.lng.toFixed(4));
    setTargetLabel(wp.name);
    if (onSetTarget) onSetTarget(wp.lat.toFixed(4), wp.lng.toFixed(4));
  }

  function selectFriendTarget(lat: number, lng: number, callsign: string) {
    setLocalTargetLat(lat.toFixed(4));
    setLocalTargetLng(lng.toFixed(4));
    setTargetLabel(`Друг: ${callsign}`);
    if (onSetTarget) onSetTarget(lat.toFixed(4), lng.toFixed(4));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Top Banner: Status & Quick Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.5rem",
          padding: "0.6rem 0.8rem",
          background: "var(--color-raise)",
          borderRadius: "var(--radius-card)",
          border: "1px solid var(--color-line)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: sensorActive ? "#22c55e" : "#eab308",
              boxShadow: sensorActive ? "0 0 8px #22c55e" : "none",
            }}
          />
          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
            {sensorActive ? "Магнетометр устройства активен" : "Ручной / Симуляционный режим"}
          </span>
        </div>

        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          {/* iOS permission trigger */}
          {!sensorActive && !permissionRequested && (
            <button
              type="button"
              className="text-btn"
              style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
              onClick={requestIosPermission}
            >
              Включить сенсоры (iOS)
            </button>
          )}

          {/* Declination / True North Toggle */}
          <button
            type="button"
            className={`text-btn ${useTrueNorth ? "active" : ""}`}
            style={{
              fontSize: "0.75rem",
              padding: "0.2rem 0.6rem",
              background: useTrueNorth ? "var(--color-lamp)" : "transparent",
              color: useTrueNorth ? "var(--color-ink)" : "inherit",
              fontWeight: 600,
            }}
            onClick={() => setUseTrueNorth((v) => !v)}
            title={`Магнитное склонение: ${declination >= 0 ? `+${declination}°` : `${declination}°`}`}
          >
            {useTrueNorth ? `Истинный N (${declination >= 0 ? `+${declination}°` : `${declination}°`})` : "Магнитный N"}
          </button>

          <button
            type="button"
            className="icon-btn"
            style={{ width: "2rem", height: "2rem", padding: 0 }}
            onClick={() => setShowCalibrationHelp((v) => !v)}
            title="Инструкция калибровки"
          >
            <Info size={16} />
          </button>
        </div>
      </div>

      {/* Calibration Help Banner */}
      {showCalibrationHelp && (
        <div
          style={{
            padding: "0.75rem 0.9rem",
            background: "color-mix(in srgb, var(--color-lamp) 10%, var(--color-raise))",
            border: "1px solid var(--color-lamp)",
            borderRadius: "var(--radius-card)",
            fontSize: "0.82rem",
            lineHeight: 1.45,
          }}
        >
          <strong style={{ display: "block", color: "var(--color-lamp)", marginBottom: "0.3rem" }}>
            🧭 Калибровка компаса смартфона:
          </strong>
          Поверните телефон в воздухе по траектории восьмерки (символ бесконечности ♾) 3-5 раз. Это
          снимает паразитное намагничивание от динамика и металлических чехлов. Держите устройство горизонтально.
        </div>
      )}

      {/* Main Tactical Compass Rose UI */}
      <div
        className="card-block"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.2rem 0.8rem",
          background: "radial-gradient(circle at center, #181c16 0%, #0d100c 100%)",
          border: "1.5px solid var(--color-line)",
          boxShadow: "inset 0 0 20px rgba(0, 0, 0, 0.8)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Fixed Top Index Pointer (Arrow showing current facing direction) */}
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "9px solid transparent",
            borderRight: "9px solid transparent",
            borderTop: "14px solid #f59e0b",
            filter: "drop-shadow(0 0 5px rgba(245, 158, 11, 0.8))",
            marginBottom: "0.4rem",
            zIndex: 10,
          }}
        />

        {/* Outer Circular Bezel */}
        <div
          style={{
            width: "270px",
            height: "270px",
            position: "relative",
            borderRadius: "50%",
            border: "3px solid #2e3d29",
            background: "#080b06",
            boxShadow: "0 0 15px rgba(0,0,0,0.9), inset 0 0 25px rgba(34, 197, 94, 0.05)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Rotating Compass Disc */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              transform: `rotate(${-effectiveHeading}deg)`,
              transition: sensorActive ? "transform 0.15s cubic-bezier(0.1, 0.9, 0.2, 1)" : "none",
            }}
          >
            {/* Major Cardinal Labels (N, E, S, W) */}
            {/* North (Red/Amber) */}
            <div
              style={{
                position: "absolute",
                top: "10px",
                left: "50%",
                transform: "translateX(-50%)",
                color: "#ef4444",
                fontWeight: 900,
                fontSize: "1.15rem",
                textShadow: "0 0 8px rgba(239, 68, 68, 0.8)",
              }}
            >
              С
            </div>

            {/* East */}
            <div
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#f5eee4",
                fontWeight: 800,
                fontSize: "1rem",
              }}
            >
              В
            </div>

            {/* South */}
            <div
              style={{
                position: "absolute",
                bottom: "10px",
                left: "50%",
                transform: "translateX(-50%)",
                color: "#f5eee4",
                fontWeight: 800,
                fontSize: "1rem",
              }}
            >
              Ю
            </div>

            {/* West */}
            <div
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#f5eee4",
                fontWeight: 800,
                fontSize: "1rem",
              }}
            >
              З
            </div>

            {/* Ticks and degree marks around circumference */}
            {Array.from({ length: 36 }).map((_, i) => {
              const deg = i * 10;
              const isMajor = deg % 30 === 0;
              const isCardinal = deg % 90 === 0;

              return (
                <div
                  key={deg}
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: "50%",
                    transform: `translateX(-50%) rotate(${deg}deg)`,
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      width: isCardinal ? "3px" : isMajor ? "2px" : "1px",
                      height: isMajor ? "12px" : "6px",
                      background: isCardinal ? "#f59e0b" : isMajor ? "#a3c99a" : "#44553e",
                      margin: "0 auto",
                    }}
                  />
                  {isMajor && !isCardinal && (
                    <div
                      style={{
                        fontSize: "0.6rem",
                        color: "#7ea372",
                        textAlign: "center",
                        marginTop: "2px",
                        fontWeight: 600,
                      }}
                    >
                      {deg}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Target Bearing Pointer (Rotating along with compass disc) */}
            {targetMath && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  transform: `rotate(${targetMath.targetBearing}deg)`,
                  pointerEvents: "none",
                }}
              >
                {/* Pointer Arrow pointing to Target */}
                <div
                  style={{
                    position: "absolute",
                    top: "32px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: "6px solid transparent",
                      borderRight: "6px solid transparent",
                      borderBottom: "12px solid #22c55e",
                      filter: "drop-shadow(0 0 4px #22c55e)",
                    }}
                  />
                  <div
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      color: "#22c55e",
                      background: "rgba(0,0,0,0.8)",
                      padding: "1px 4px",
                      borderRadius: 3,
                      marginTop: 2,
                    }}
                  >
                    ЦЕЛЬ
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Central Digital Readout Hub */}
          <div
            style={{
              position: "relative",
              width: "115px",
              height: "115px",
              borderRadius: "50%",
              background: "#121710",
              border: "2px solid #364831",
              boxShadow: "0 0 12px rgba(0,0,0,0.9)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 5,
            }}
          >
            <span
              style={{
                fontSize: "1.85rem",
                fontWeight: 900,
                color: "#f5eee4",
                lineHeight: 1,
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              {Math.round(effectiveHeading)}°
            </span>
            <span
              style={{
                fontSize: "0.85rem",
                fontWeight: 800,
                color: "#f59e0b",
                marginTop: "0.2rem",
                letterSpacing: "0.05em",
              }}
            >
              {cardinal.code} · {cardinal.enCode}
            </span>
            <span
              style={{
                fontSize: "0.62rem",
                color: "#7ea372",
                marginTop: "0.1rem",
              }}
            >
              {cardinal.label}
            </span>
          </div>
        </div>

        {/* Manual Heading Slider (Appears if user tests or device has no sensor) */}
        <div style={{ width: "100%", maxWidth: "320px", marginTop: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem" }}>
            <span className="meta">
              {sensorActive && !isManualOverride ? "Сенсор активен" : "Ручная регулировка азимута:"}
            </span>
            {sensorActive && (
              <button
                type="button"
                className="text-btn"
                style={{ fontSize: "0.7rem", padding: "1px 6px" }}
                onClick={() => setIsManualOverride((v) => !v)}
              >
                {isManualOverride ? "Вернуть магнетометр" : "Тест вручную"}
              </button>
            )}
          </div>

          {(!sensorActive || isManualOverride) && (
            <div style={{ marginTop: "0.3rem" }}>
              <input
                type="range"
                min={0}
                max={359}
                value={manualHeading}
                onChange={(e) => setManualHeading(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#f59e0b", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--color-muted)" }}>
                <span>0° (С)</span>
                <span>90° (В)</span>
                <span>180° (Ю)</span>
                <span>270° (З)</span>
                <span>359°</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Target Steering Guidance Box */}
      {targetMath && (
        <div
          className="card-block"
          style={{
            borderLeft: `4px solid ${
              targetMath.steering.turnDirection === "straight" ? "#22c55e" : "#f59e0b"
            }`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.4rem" }}>
            <div>
              <strong style={{ fontSize: "0.95rem" }}>Курс на цель: {targetLabel}</strong>
              <div style={{ fontSize: "0.78rem", color: "var(--color-muted)", marginTop: "0.1rem" }}>
                {parseFloat(targetLat).toFixed(4)}°N, {parseFloat(targetLng).toFixed(4)}°E
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--color-lamp)" }}>
                {targetMath.targetBearing}°
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--color-muted)", display: "block" }}>
                {getCardinalDirection(targetMath.targetBearing, lang).code}
              </span>
            </div>
          </div>

          {/* Steering Prompt Banner */}
          <div
            style={{
              padding: "0.6rem 0.8rem",
              borderRadius: "var(--radius-card)",
              background:
                targetMath.steering.turnDirection === "straight"
                  ? "color-mix(in srgb, #22c55e 15%, var(--color-raise))"
                  : "color-mix(in srgb, #f59e0b 15%, var(--color-raise))",
              border: `1px solid ${
                targetMath.steering.turnDirection === "straight" ? "#22c55e" : "#f59e0b"
              }`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "0.5rem",
            }}
          >
            <div>
              <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                {targetMath.steering.turnDirection === "straight"
                  ? "🎯 Вы идёте прямо на цель!"
                  : targetMath.steering.turnDirection === "left"
                  ? `◀ Поверните НАЛЕВО на ${targetMath.steering.turnAngle}°`
                  : `Поверните НАПРАВО на ${targetMath.steering.turnAngle}° ▶`}
              </span>
              <div style={{ fontSize: "0.75rem", opacity: 0.85, marginTop: 2 }}>
                Дистанция по прямой: {targetMath.distanceKm} км ({targetMath.distanceMeters} м)
              </div>
            </div>

            {onSwitchToMap && (
              <button
                type="button"
                className="text-btn"
                style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem", whiteSpace: "nowrap" }}
                onClick={onSwitchToMap}
              >
                🗺 На карту
              </button>
            )}
          </div>
        </div>
      )}

      {/* Target Selector: Pick Saved Waypoint or Friend */}
      <div className="card-block">
        <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <MapPin size={16} color="var(--color-lamp)" />
          Выбрать цель для наведения:
        </h4>

        {waypoints.length > 0 && (
          <div style={{ marginBottom: "0.6rem" }}>
            <span className="meta" style={{ display: "block", marginBottom: "0.2rem" }}>
              Сохраненные точки ({waypoints.length}):
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
              {waypoints.map((wp) => (
                <button
                  key={wp.id}
                  type="button"
                  className="chip"
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.2rem 0.6rem",
                    border: targetLat === wp.lat.toFixed(4) ? "1px solid var(--color-lamp)" : undefined,
                  }}
                  onClick={() => selectWaypointTarget(wp)}
                >
                  📍 {wp.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {friends.filter((f) => f.status === "approved" && f.lastBeacon).length > 0 && (
          <div style={{ marginBottom: "0.6rem" }}>
            <span className="meta" style={{ display: "block", marginBottom: "0.2rem" }}>
              Друзья по GPS-радару:
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
              {friends
                .filter((f) => f.status === "approved" && f.lastBeacon)
                .map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className="chip"
                    style={{
                      fontSize: "0.75rem",
                      padding: "0.2rem 0.6rem",
                      borderColor: f.lastBeacon?.isSos ? "#ef4444" : undefined,
                    }}
                    onClick={() =>
                      selectFriendTarget(f.lastBeacon!.lat, f.lastBeacon!.lng, f.callsign)
                    }
                  >
                    {f.lastBeacon?.isSos ? "🚨" : "👤"} {f.callsign}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Manual Target Coordinates Input */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "0.5rem" }}>
          <div>
            <label className="meta">Широта цели (Lat)</label>
            <input
              type="text"
              className="search-field"
              style={{ margin: 0, padding: "0.3rem 0.5rem", fontSize: "0.85rem" }}
              value={targetLat}
              onChange={(e) => {
                setLocalTargetLat(e.target.value);
                setTargetLabel("Вручную");
                if (onSetTarget) onSetTarget(e.target.value, targetLng);
              }}
            />
          </div>
          <div>
            <label className="meta">Долгота цели (Lng)</label>
            <input
              type="text"
              className="search-field"
              style={{ margin: 0, padding: "0.3rem 0.5rem", fontSize: "0.85rem" }}
              value={targetLng}
              onChange={(e) => {
                setLocalTargetLng(e.target.value);
                setTargetLabel("Вручную");
                if (onSetTarget) onSetTarget(targetLat, e.target.value);
              }}
            />
          </div>
        </div>
      </div>

      {/* Accordion: Solar & Natural Orienteering Guide (If Electronic Compass is jammed / no battery) */}
      <div className="card-block">
        <button
          type="button"
          className="row-between"
          style={{
            width: "100%",
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: "inherit",
            textAlign: "left",
          }}
          onClick={() => setShowSolarGuide((v) => !v)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Sun size={20} color="#f59e0b" />
            <div>
              <strong style={{ fontSize: "0.95rem" }}>
                Ориентирование без электроники (Солнце, часы, звезды)
              </strong>
              <div className="meta" style={{ fontSize: "0.75rem" }}>
                Если отказал датчик телефона, сели батареи или сильные помехи
              </div>
            </div>
          </div>
          {showSolarGuide ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {showSolarGuide && (
          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.8rem", fontSize: "0.82rem", lineHeight: 1.5 }}>
            {/* Sun Chrono Finger Rule */}
            <div style={{ padding: "0.8rem", background: "var(--color-raise)", borderRadius: "var(--radius-card)", border: "1px solid var(--color-line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.3rem" }}>
                <span style={{ fontWeight: 600, color: "var(--color-muted)" }}>
                  Пальцев между солнцем и горизонтом:
                </span>
                <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#f59e0b" }}>
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

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--color-muted)", marginTop: "0.2rem" }}>
                <span>1 палец = 15 мин</span>
                <span>4 пальца (ладонь) = 1 час</span>
                <span>8 пальцев = 2 ч</span>
              </div>

              <div
                style={{
                  marginTop: "0.6rem",
                  padding: "0.5rem 0.8rem",
                  borderRadius: 4,
                  background: minutesLeft <= 45 ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
                  border: minutesLeft <= 45 ? "1px solid #ef4444" : "1px solid #f59e0b",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>Осталось светлого времени:</span>
                <strong style={{ fontSize: "1rem", color: minutesLeft <= 45 ? "#ef4444" : "#f59e0b" }}>
                  {sunsetHours > 0 ? `${sunsetHours} ч ` : ""}{remainingMins > 0 ? `${remainingMins} мин` : ""}
                </strong>
              </div>
            </div>

            {/* Methods list */}
            <div style={{ padding: "0.8rem", background: "var(--color-raise)", borderRadius: "var(--radius-card)", border: "1px solid var(--color-line)" }}>
              <ul style={{ margin: 0, paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <li>
                  <strong>По часам со стрелками (Северное полушарие):</strong> Направьте часовую (маленькую) стрелку на солнце. Угол между часовой стрелкой и цифрой 1 на циферблате разделите пополам. Биссектриса указывает на <strong>ЮГ</strong>. В противоположную сторону — <strong>СЕВЕР</strong>.
                </li>
                <li>
                  <strong>Метод солнечной тени (Гномон):</strong> Воткните ровный колышек вертикально в землю. Отметьте камнем конец первой тени. Подождите 15-20 минут, отметьте второй камень. Линия от 1-го камня ко 2-му всегда направлена строго с <strong>ЗАПАДА на ВОСТОК</strong>.
                </li>
                <li>
                  <strong>Полярная звезда (Ночью):</strong> Найдите созвездие Большой Медведицы (ковш). Мысленно соедините две крайние звезды передней стенки ковша (Мерак и Дубхе) и отложите по этой линии вверх 5 таких расстояний. Вы упретесь в яркую Полярную звезду (хвост Малой Медведицы). Она указывает строго на <strong>СЕВЕР</strong> с точностью до 1°.
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
