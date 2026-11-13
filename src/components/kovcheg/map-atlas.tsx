import { useState, useRef, useEffect, useMemo } from "react";
import {
  Compass,
  Download,
  ExternalLink,
  Layers,
  MapPin,
  Navigation,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  ZoomIn,
  ZoomOut,
  Users,
  Siren,
  ShieldAlert,
} from "lucide-react";
import { t, type Language } from "@/lib/kovcheg/i18n";
import { useArk } from "@/lib/kovcheg/store";
import { useGpsPeerStore } from "@/lib/kovcheg/gps-peer-tracker";
import { GpsFriendFinder } from "@/components/kovcheg/gps-friend-finder";
import { TacticalSecurityGate } from "@/components/kovcheg/tactical-security-gate";
import { TacticalCompass } from "@/components/kovcheg/tactical-compass";

export interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: "water" | "shelter" | "cache" | "danger" | "assembly";
  created: number;
}

const CATEGORY_ICONS: Record<Waypoint["category"], string> = {
  water: "💧",
  shelter: "⛺",
  cache: "📦",
  danger: "⚠️",
  assembly: "🚩",
};

const CATEGORY_NAMES = {
  ru: {
    water: "Источник воды",
    shelter: "Укрытие / Лагерь",
    cache: "Схрон припасов",
    danger: "Опасная зона",
    assembly: "Точка сбора",
  },
  en: {
    water: "Water Source",
    shelter: "Shelter / Camp",
    cache: "Supply Cache",
    danger: "Hazard Zone",
    assembly: "Assembly Point",
  },
  ar: {
    water: "مصدر مياه",
    shelter: "مأوى / مخيم",
    cache: "مخبأ مؤن",
    danger: "منطقة خطر",
    assembly: "نقطة تجمع",
  },
};

const OFFLINE_MAP_PACKS = [
  {
    id: "pack-eurasia-west",
    nameRu: "Европейская часть, Кавказ и Урал",
    nameEn: "Eastern Europe, Caucasus and Urals",
    nameAr: "أوروبا الشرقية والقوقاز وجبال الأورال",
    sizeMb: 42.5,
    coverage: "Топография, водные артерии, рельеф, изолинии высот",
  },
  {
    id: "pack-siberia-east",
    nameRu: "Сибирь, Байкал и Дальний Восток",
    nameEn: "Siberia, Baikal and Far East",
    nameAr: "سيبيريا وبحيرة بايكال والشرق الأقصى",
    sizeMb: 51.0,
    coverage: "Таежные зоны, речные системы, перепады высот",
  },
  {
    id: "pack-central-asia",
    nameRu: "Центральная Азия, Тянь-Шань и Памир",
    nameEn: "Central Asia, Tien Shan and Pamir",
    nameAr: "آسيا الوسطى وتيان شان وجبال بامير",
    sizeMb: 36.2,
    coverage: "Горные перевалы, полупустыни, речные долины",
  },
  {
    id: "pack-middle-east-desert",
    nameRu: "Ближний Восток и пустынные регионы",
    nameEn: "Middle East and Desert Zones",
    nameAr: "الشرق الأوسط والمناطق الصحراوية",
    sizeMb: 29.8,
    coverage: "Оазисы, вади, скальные массивы, источники влаги",
  },
];

export function MapAtlasView() {
  const lang = useArk((s) => s.lang) ?? "ru";

  // Coordinates and viewport state (center defaults to Moscow/Urals transition point)
  const [centerLat, setCenterLat] = useState<number>(55.75);
  const [centerLng, setCenterLng] = useState<number>(37.61);
  const [zoom, setZoom] = useState<number>(1);
  const [mapMode, setMapMode] = useState<"topo" | "relief" | "grid">("topo");
  const [activeTab, setActiveTab] = useState<"map" | "waypoints" | "compass" | "friends" | "packs">("map");

  // GPS Peer Friends
  const friends = useGpsPeerStore((s) => s.friends);
  const hasAnySos = friends.some((f) => f.status === "approved" && f.lastBeacon?.isSos);
  const approvedFriendsWithBeacon = friends.filter(
    (f) => f.status === "approved" && f.lastBeacon
  );

  // GPS geolocation state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locating, setLocating] = useState<boolean>(false);
  const [locError, setLocError] = useState<string>("");

  // Target destination and navigational math
  const [targetLat, setTargetLat] = useState<string>("56.0");
  const [targetLng, setTargetLng] = useState<string>("38.0");

  // Saved Waypoints
  const [waypoints, setWaypoints] = useState<Waypoint[]>(() => {
    try {
      const stored = localStorage.getItem("kovcheg-waypoints-v1");
      return stored ? JSON.parse(stored) : [
        { id: "wp-1", name: "Родник чистой воды", lat: 55.82, lng: 37.65, category: "water", created: Date.now() },
        { id: "wp-2", name: "Базовое убежище (погреб)", lat: 55.78, lng: 37.72, category: "shelter", created: Date.now() },
      ];
    } catch {
      return [];
    }
  });

  const [newWpName, setNewWpName] = useState("");
  const [newWpCategory, setNewWpCategory] = useState<Waypoint["category"]>("water");

  // Downloaded packs tracker
  const [downloadedPacks, setDownloadedPacks] = useState<string[]>(["pack-global-base"]);
  const [downloadingPack, setDownloadingPack] = useState<string | null>(null);

  // Save waypoints to storage
  useEffect(() => {
    try {
      localStorage.setItem("kovcheg-waypoints-v1", JSON.stringify(waypoints));
    } catch (e) {
      console.error(e);
    }
  }, [waypoints]);

  // Canvas map rendering
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; lat: number; lng: number }>({ x: 0, y: 0, lat: 0, lng: 0 });

  // Get current device geolocation
  function handleLocateMe() {
    if (!navigator.geolocation) {
      setLocError("Геолокация не поддерживается вашим браузером");
      return;
    }
    setLocating(true);
    setLocError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude, accuracy });
        setCenterLat(latitude);
        setCenterLng(longitude);
        setZoom(4);
      },
      (err) => {
        setLocating(false);
        setLocError(`Ошибка GPS: ${err.message}. Проверьте доступ к геопозиции в настройках.`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }

  // Calculate Distance & Bearing (Haversine formula & forward azimuth)
  const navCalculation = useMemo(() => {
    const tLat = parseFloat(targetLat);
    const tLng = parseFloat(targetLng);
    if (isNaN(tLat) || isNaN(tLng)) return null;

    const fromLat = userLocation ? userLocation.lat : centerLat;
    const fromLng = userLocation ? userLocation.lng : centerLng;

    // Haversine distance
    const R = 6371; // Earth radius in km
    const dLat = ((tLat - fromLat) * Math.PI) / 180;
    const dLng = ((tLng - fromLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((fromLat * Math.PI) / 180) *
        Math.cos((tLat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    // Azimuth / Bearing (0-360 degrees)
    const y = Math.sin(dLng) * Math.cos((tLat * Math.PI) / 180);
    const x =
      Math.cos((fromLat * Math.PI) / 180) * Math.sin((tLat * Math.PI) / 180) -
      Math.sin((fromLat * Math.PI) / 180) * Math.cos((tLat * Math.PI) / 180) * Math.cos(dLng);
    let brng = (Math.atan2(y, x) * 180) / Math.PI;
    brng = (brng + 360) % 360;

    return {
      distanceKm: distanceKm.toFixed(2),
      distanceMeters: Math.round(distanceKm * 1000),
      bearingDeg: Math.round(brng),
      fromLat: fromLat.toFixed(4),
      fromLng: fromLng.toFixed(4),
    };
  }, [centerLat, centerLng, userLocation, targetLat, targetLng]);

  // Redraw Canvas Map
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    const height = (canvas.height = 380);

    // Background color based on mode
    ctx.fillStyle = mapMode === "relief" ? "#1a241b" : mapMode === "grid" ? "#0f172a" : "#1e1e24";
    ctx.fillRect(0, 0, width, height);

    // Draw Coordinate Grid Lines (Meridians & Parallels)
    ctx.strokeStyle = mapMode === "grid" ? "rgba(56, 189, 248, 0.25)" : "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.font = "10px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";

    const step = Math.max(5, Math.round(30 / zoom));
    for (let lng = -180; lng <= 180; lng += step) {
      const x = ((lng - centerLng) * zoom * (width / 60)) + width / 2;
      if (x >= 0 && x <= width) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        ctx.fillText(`${lng}°E`, x + 4, height - 8);
      }
    }
    for (let lat = -80; lat <= 80; lat += step) {
      const y = height / 2 - ((lat - centerLat) * zoom * (height / 35));
      if (y >= 0 && y <= height) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
        ctx.fillText(`${lat}°N`, 6, y - 4);
      }
    }

    // Draw Simulated Topo Elevation Contours / Landmasses
    const landmasses = [
      { name: "Eurasia", lat: 55, lng: 60, rx: 70, ry: 30, color: "#2d372e" },
      { name: "Urals", lat: 60, lng: 60, rx: 6, ry: 25, color: "#3e4d3f" },
      { name: "Caucasus", lat: 42, lng: 45, rx: 12, ry: 6, color: "#475549" },
      { name: "Altai/Sayan", lat: 52, lng: 88, rx: 16, ry: 10, color: "#475549" },
      { name: "Middle East", lat: 28, lng: 45, rx: 25, ry: 20, color: "#423828" },
      { name: "Africa", lat: 5, lng: 20, rx: 35, ry: 35, color: "#3a3628" },
    ];

    for (const land of landmasses) {
      const lx = ((land.lng - centerLng) * zoom * (width / 60)) + width / 2;
      const ly = height / 2 - ((land.lat - centerLat) * zoom * (height / 35));
      const rX = land.rx * zoom * 6;
      const rY = land.ry * zoom * 6;

      ctx.beginPath();
      ctx.ellipse(lx, ly, Math.max(5, rX), Math.max(5, rY), 0, 0, 2 * Math.PI);
      ctx.fillStyle = land.color;
      ctx.fill();
      ctx.strokeStyle = "rgba(250, 204, 21, 0.2)";
      ctx.stroke();

      if (zoom >= 1.5) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.fillText(land.name, lx - 15, ly);
      }
    }

    // Draw Range Rings (Concentric survival distance rings from center: 5km, 15km, 50km)
    const ringRadii = [50, 120, 240];
    const ringLabels = ["5 км", "15 км", "50 км"];
    ctx.strokeStyle = "rgba(250, 204, 21, 0.25)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ringRadii.forEach((r, idx) => {
      const scaledR = r * (zoom / 2);
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, scaledR, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fillStyle = "rgba(250, 204, 21, 0.7)";
      ctx.fillText(ringLabels[idx], width / 2 + scaledR + 4, height / 2 - 4);
    });
    ctx.setLineDash([]);

    // Draw Crosshair at Center
    ctx.strokeStyle = "var(--color-lamp, #facc15)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 14, height / 2);
    ctx.lineTo(width / 2 + 14, height / 2);
    ctx.moveTo(width / 2, height / 2 - 14);
    ctx.lineTo(width / 2, height / 2 + 14);
    ctx.stroke();

    // Draw GPS user location dot
    if (userLocation) {
      const ux = ((userLocation.lng - centerLng) * zoom * (width / 60)) + width / 2;
      const uy = height / 2 - ((userLocation.lat - centerLat) * zoom * (height / 35));

      // Accuracy ring
      ctx.fillStyle = "rgba(56, 189, 248, 0.2)";
      ctx.beginPath();
      ctx.arc(ux, uy, Math.max(10, userLocation.accuracy / 5), 0, 2 * Math.PI);
      ctx.fill();

      // GPS Pulsing Dot
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.arc(ux, uy, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText("GPS (Вы здесь)", ux + 10, uy - 4);
    }

    // Draw Waypoints on Map
    for (const wp of waypoints) {
      const wx = ((wp.lng - centerLng) * zoom * (width / 60)) + width / 2;
      const wy = height / 2 - ((wp.lat - centerLat) * zoom * (height / 35));

      if (wx >= -20 && wx <= width + 20 && wy >= -20 && wy <= height + 20) {
        ctx.fillStyle = "rgba(234, 179, 8, 0.9)";
        ctx.beginPath();
        ctx.arc(wx, wy, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        ctx.font = "12px sans-serif";
        ctx.fillText(CATEGORY_ICONS[wp.category], wx - 7, wy - 8);
        ctx.fillStyle = "#e4e4e7";
        ctx.font = "11px sans-serif";
        ctx.fillText(wp.name, wx + 8, wy + 4);
      }
    }

    // Draw Approved GPS Peer Friends on Map
    for (const friend of approvedFriendsWithBeacon) {
      const beacon = friend.lastBeacon;
      if (!beacon) continue;

      const fx = ((beacon.lng - centerLng) * zoom * (width / 60)) + width / 2;
      const fy = height / 2 - ((beacon.lat - centerLat) * zoom * (height / 35));

      if (fx >= -30 && fx <= width + 30 && fy >= -30 && fy <= height + 30) {
        if (beacon.isSos) {
          // Emergency SOS Pulsing Aura
          ctx.fillStyle = "rgba(239, 68, 68, 0.35)";
          ctx.beginPath();
          ctx.arc(fx, fy, 16, 0, 2 * Math.PI);
          ctx.fill();

          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(fx, fy, 7, 0, 2 * Math.PI);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = "#ef4444";
          ctx.font = "bold 12px sans-serif";
          ctx.fillText(`🚨 ${friend.callsign} [SOS!]`, fx + 10, fy - 5);

          if (beacon.distanceMeters !== undefined) {
            ctx.fillStyle = "#fca5a5";
            ctx.font = "10px sans-serif";
            const dist = beacon.distanceMeters < 1000 ? `${beacon.distanceMeters} м` : `${(beacon.distanceMeters / 1000).toFixed(2)} км`;
            ctx.fillText(`Дистанция: ${dist}`, fx + 10, fy + 8);
          }
        } else {
          // Normal Active Friend Peer Beacon
          ctx.fillStyle = "rgba(34, 197, 94, 0.25)";
          ctx.beginPath();
          ctx.arc(fx, fy, 10, 0, 2 * Math.PI);
          ctx.fill();

          ctx.fillStyle = "#22c55e";
          ctx.beginPath();
          ctx.arc(fx, fy, 5, 0, 2 * Math.PI);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = "#4ade80";
          ctx.font = "bold 11px sans-serif";
          ctx.fillText(`👤 ${friend.callsign}`, fx + 8, fy - 3);

          if (beacon.distanceMeters !== undefined) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
            ctx.font = "10px sans-serif";
            const dist = beacon.distanceMeters < 1000 ? `${beacon.distanceMeters} м` : `${(beacon.distanceMeters / 1000).toFixed(2)} км`;
            ctx.fillText(dist, fx + 8, fy + 9);
          }
        }
      }
    }
  }, [centerLat, centerLng, zoom, mapMode, userLocation, waypoints, approvedFriendsWithBeacon]);

  // Pan interaction
  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      lat: centerLat,
      lng: centerLng,
    };
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const width = canvasRef.current?.width || 600;
    const height = canvasRef.current?.height || 380;

    const deltaLng = (dx / (zoom * (width / 60)));
    const deltaLat = (dy / (zoom * (height / 35)));

    setCenterLng(dragStartRef.current.lng - deltaLng);
    setCenterLat(dragStartRef.current.lat + deltaLat);
  }

  function handleMouseUp() {
    isDraggingRef.current = false;
  }

  // Add waypoint
  function handleAddWaypoint() {
    if (!newWpName.trim()) return;
    const wp: Waypoint = {
      id: `wp-${Date.now()}`,
      name: newWpName.trim(),
      lat: parseFloat(centerLat.toFixed(4)),
      lng: parseFloat(centerLng.toFixed(4)),
      category: newWpCategory,
      created: Date.now(),
    };
    setWaypoints((prev) => [wp, ...prev]);
    setNewWpName("");
  }

  // Remove waypoint
  function handleRemoveWaypoint(id: string) {
    setWaypoints((prev) => prev.filter((w) => w.id !== id));
  }

  // Download map pack simulation into offline browser store
  function handleDownloadPack(packId: string) {
    setDownloadingPack(packId);
    setTimeout(() => {
      setDownloadedPacks((prev) => [...prev, packId]);
      setDownloadingPack(null);
    }, 1500);
  }

  // External Map Links
  const curLat = userLocation ? userLocation.lat : centerLat;
  const curLng = userLocation ? userLocation.lng : centerLng;
  const googleMapsUrl = `https://www.google.com/maps?q=${curLat},${curLng}`;
  const yandexMapsUrl = `https://yandex.ru/maps/?pt=${curLng},${curLat}&z=13&l=map`;
  const geoUri = `geo:${curLat},${curLng}?q=${curLat},${curLng}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Top Controls & Tab Selector */}
      <div className="row-between" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className={`text-btn ${activeTab === "map" ? "active" : ""}`}
            style={{
              background: activeTab === "map" ? "var(--color-lamp)" : "transparent",
              color: activeTab === "map" ? "var(--color-ink)" : "inherit",
              fontWeight: 600,
            }}
            onClick={() => setActiveTab("map")}
          >
            🗺 Атлас
          </button>
          <button
            type="button"
            className={`text-btn ${activeTab === "compass" ? "active" : ""}`}
            style={{
              background: activeTab === "compass" ? "var(--color-lamp)" : "transparent",
              color: activeTab === "compass" ? "var(--color-ink)" : "inherit",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
            onClick={() => setActiveTab("compass")}
          >
            <Compass size={15} />
            <span>🧭 Компас</span>
          </button>
          <button
            type="button"
            className={`text-btn ${activeTab === "waypoints" ? "active" : ""}`}
            style={{
              background: activeTab === "waypoints" ? "var(--color-lamp)" : "transparent",
              color: activeTab === "waypoints" ? "var(--color-ink)" : "inherit",
              fontWeight: 600,
            }}
            onClick={() => setActiveTab("waypoints")}
          >
            📍 Точки ({waypoints.length})
          </button>
          <button
            type="button"
            className={`text-btn ${activeTab === "friends" ? "active" : ""}`}
            style={{
              background: activeTab === "friends" ? (hasAnySos ? "#ef4444" : "var(--color-lamp)") : (hasAnySos ? "rgba(239, 68, 68, 0.2)" : "transparent"),
              color: activeTab === "friends" ? (hasAnySos ? "#fff" : "var(--color-ink)") : (hasAnySos ? "#ef4444" : "inherit"),
              fontWeight: 600,
              border: hasAnySos ? "1px solid #ef4444" : undefined,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
            onClick={() => setActiveTab("friends")}
          >
            {hasAnySos ? <Siren size={15} className="animate-pulse" /> : <Users size={15} />}
            <span>Друзья GPS ({friends.filter(f => f.status === "approved").length})</span>
          </button>
          <button
            type="button"
            className={`text-btn ${activeTab === "packs" ? "active" : ""}`}
            style={{
              background: activeTab === "packs" ? "var(--color-lamp)" : "transparent",
              color: activeTab === "packs" ? "var(--color-ink)" : "inherit",
              fontWeight: 600,
            }}
            onClick={() => setActiveTab("packs")}
          >
            📦 Карты
          </button>
        </div>

        {/* GPS Button */}
        <button
          type="button"
          className="text-btn"
          onClick={handleLocateMe}
          disabled={locating}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600 }}
        >
          <Navigation size={16} />
          {locating ? "Определение GPS..." : "Мой GPS"}
        </button>
      </div>

      {locError && (
        <div style={{ background: "rgba(239, 68, 68, 0.15)", borderLeft: "4px solid var(--color-alarm)", padding: "0.5rem 0.8rem", fontSize: "0.85rem" }}>
          {locError}
        </div>
      )}

      {/* SOS Alert Banner across Map view if any friend triggered emergency */}
      {hasAnySos && (
        <div
          style={{
            margin: "0.5rem 0",
            padding: "0.6rem 0.85rem",
            background: "rgba(239, 68, 68, 0.2)",
            border: "2px solid #ef4444",
            borderRadius: "6px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.5rem",
            color: "#fca5a5",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Siren size={20} color="#ef4444" className="animate-pulse" />
            <div>
              <strong style={{ color: "#fff", fontSize: "0.9rem" }}>
                🚨 СИГНАЛ SOS: ДРУГ В ОПАСНОСТИ!
              </strong>
              <div style={{ fontSize: "0.75rem", color: "#fca5a5" }}>
                {friends
                  .filter((f) => f.status === "approved" && f.lastBeacon?.isSos)
                  .map((f) => `${f.callsign} (${f.lastBeacon?.distanceMeters ? `${f.lastBeacon.distanceMeters}м` : "пеленг"})`)
                  .join(", ")}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab("friends")}
            className="btn btn-primary"
            style={{
              padding: "0.3rem 0.75rem",
              fontSize: "0.75rem",
              background: "#ef4444",
              border: "none",
              color: "#fff",
              fontWeight: 700,
            }}
          >
            Открыть радар помощи
          </button>
        </div>
      )}

      {activeTab === "map" && (
        <div>
          {/* Canvas Map Viewport */}
          <div
            style={{
              position: "relative",
              border: "1px solid var(--color-line)",
              borderRadius: "var(--radius-card)",
              overflow: "hidden",
              background: "#18181b",
              userSelect: "none",
            }}
          >
            <canvas
              ref={canvasRef}
              style={{ display: "block", width: "100%", height: "380px", cursor: "grab" }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />

            {/* Over-Map HUD: Coordinates & Bearing Compass */}
            <div
              style={{
                position: "absolute",
                top: 10,
                left: 10,
                background: "rgba(24, 24, 27, 0.85)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "6px",
                padding: "0.4rem 0.6rem",
                fontSize: "0.8rem",
                color: "#e4e4e7",
                backdropFilter: "blur(4px)",
              }}
            >
              <div>{t("mapLat", lang)}: <strong>{centerLat.toFixed(4)}°N</strong></div>
              <div>{t("mapLng", lang)}: <strong>{centerLng.toFixed(4)}°E</strong></div>
              <div style={{ fontSize: "0.72rem", color: "var(--color-lamp)" }}>{t("mapZoom", lang)}: {zoom.toFixed(1)}x</div>
            </div>

            {/* Map Tools Floating Bar */}
            <div
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                display: "flex",
                flexDirection: "column",
                gap: "0.3rem",
              }}
            >
              <button
                type="button"
                className="icon-btn"
                style={{ background: "rgba(24, 24, 27, 0.85)", color: "#fff" }}
                onClick={() => setZoom((z) => Math.min(8, z + 0.5))}
                title={t("mapZoomIn", lang)}
              >
                <ZoomIn size={16} />
              </button>
              <button
                type="button"
                className="icon-btn"
                style={{ background: "rgba(24, 24, 27, 0.85)", color: "#fff" }}
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.5))}
                title={t("mapZoomOut", lang)}
              >
                <ZoomOut size={16} />
              </button>
              <button
                type="button"
                className="icon-btn"
                style={{ background: "rgba(24, 24, 27, 0.85)", color: "#fff" }}
                onClick={() => {
                  setCenterLat(55.75);
                  setCenterLng(37.61);
                  setZoom(1.5);
                }}
                title={t("mapResetPos", lang)}
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                className="icon-btn"
                style={{ background: "rgba(24, 24, 27, 0.85)", color: "#fff" }}
                onClick={() =>
                  setMapMode((m) => (m === "topo" ? "relief" : m === "relief" ? "grid" : "topo"))
                }
                title={t("mapChangeLayer", lang)}
              >
                <Layers size={15} />
              </button>
              <button
                type="button"
                className="icon-btn"
                style={{ background: "rgba(24, 24, 27, 0.85)", color: "var(--color-lamp)" }}
                onClick={() => setActiveTab("compass")}
                title="Открыть компас"
              >
                <Compass size={16} />
              </button>
            </div>

            {/* Bottom Bar: Quick Save Waypoint at Center */}
            <div
              style={{
                position: "absolute",
                bottom: 10,
                left: 10,
                right: 10,
                display: "flex",
                gap: "0.4rem",
                alignItems: "center",
                background: "rgba(24, 24, 27, 0.85)",
                padding: "0.4rem 0.6rem",
                borderRadius: "6px",
                backdropFilter: "blur(4px)",
              }}
            >
              <input
                type="text"
                placeholder={t("mapSaveWpPlaceholder", lang)}
                value={newWpName}
                onChange={(e) => setNewWpName(e.target.value)}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  color: "#fff",
                  fontSize: "0.85rem",
                  outline: "none",
                }}
              />
              <select
                value={newWpCategory}
                onChange={(e) => setNewWpCategory(e.target.value as any)}
                style={{ background: "#27272a", color: "#fff", border: "1px solid #3f3f46", borderRadius: 4, fontSize: "0.8rem", padding: "2px 4px" }}
              >
                <option value="water">💧 {CATEGORY_NAMES[lang]?.water || CATEGORY_NAMES.ru.water}</option>
                <option value="shelter">⛺ {CATEGORY_NAMES[lang]?.shelter || CATEGORY_NAMES.ru.shelter}</option>
                <option value="cache">📦 {CATEGORY_NAMES[lang]?.cache || CATEGORY_NAMES.ru.cache}</option>
                <option value="danger">⚠️ {CATEGORY_NAMES[lang]?.danger || CATEGORY_NAMES.ru.danger}</option>
                <option value="assembly">🚩 {CATEGORY_NAMES[lang]?.assembly || CATEGORY_NAMES.ru.assembly}</option>
              </select>
              <button
                type="button"
                className="text-btn"
                onClick={handleAddWaypoint}
                style={{ padding: "0.2rem 0.6rem", fontSize: "0.8rem" }}
              >
                {t("mapAddWpBtn", lang)}
              </button>
            </div>
          </div>

          {/* Navigation & Azimuth Calculator Box */}
          <div className="card-block" style={{ marginTop: "1rem" }}>
            <h3 style={{ margin: "0 0 0.5rem", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.95rem" }}>
              <Compass size={18} color="var(--color-lamp)" />
              {t("mapAzimuthCalc", lang)}
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.6rem" }}>
              <div>
                <label className="meta">{t("mapTargetLat", lang)}</label>
                <input
                  type="text"
                  className="search-field"
                  style={{ margin: 0, padding: "0.3rem 0.5rem", fontSize: "0.85rem" }}
                  value={targetLat}
                  onChange={(e) => setTargetLat(e.target.value)}
                />
              </div>
              <div>
                <label className="meta">{t("mapTargetLng", lang)}</label>
                <input
                  type="text"
                  className="search-field"
                  style={{ margin: 0, padding: "0.3rem 0.5rem", fontSize: "0.85rem" }}
                  value={targetLng}
                  onChange={(e) => setTargetLng(e.target.value)}
                />
              </div>
            </div>

            {navCalculation && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-around",
                  background: "var(--color-bg)",
                  padding: "0.6rem",
                  borderRadius: "var(--radius-card)",
                  textAlign: "center",
                }}
              >
                <div>
                  <span className="meta">{t("mapDistance", lang)}</span>
                  <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "var(--color-fg)" }}>
                    {navCalculation.distanceKm} {lang === "ar" ? "كم" : "km"}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>({navCalculation.distanceMeters} {lang === "ar" ? "متر" : "m"})</span>
                </div>

                <div>
                  <span className="meta">{t("mapTrueBearing", lang)}</span>
                  <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "var(--color-lamp)" }}>
                    {navCalculation.bearingDeg}°
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{t("mapCompassBearing", lang)}</span>
                </div>
              </div>
            )}

            {navCalculation && (
              <button
                type="button"
                className="text-btn"
                style={{
                  marginTop: "0.6rem",
                  width: "100%",
                  justifyContent: "center",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontWeight: 600,
                  background: "var(--color-raise)",
                  border: "1px solid var(--color-lamp)",
                  color: "var(--color-lamp)",
                  padding: "0.45rem 0.8rem",
                }}
                onClick={() => setActiveTab("compass")}
              >
                <Compass size={16} />
                <span>Ведение по тактическому компасу ({navCalculation.bearingDeg}°)</span>
              </button>
            )}

            {/* External Navigation Links */}
            <div style={{ marginTop: "0.8rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-btn"
                style={{ fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <ExternalLink size={14} />
                {t("mapOpenGoogle", lang)}
              </a>
              <a
                href={yandexMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-btn"
                style={{ fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <ExternalLink size={14} />
                {t("mapOpenYandex", lang)}
              </a>
              <a
                href={geoUri}
                className="text-btn"
                style={{ fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <Navigation size={14} />
                {t("mapOpenGeoUri", lang)}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Waypoints Tab */}
      {activeTab === "waypoints" && (
        <section>
          <div className="row-between" style={{ marginBottom: "0.6rem" }}>
            <h2 className="section-title" style={{ margin: 0 }}>
              {t("mapSavedWps", lang)} ({waypoints.length})
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {waypoints.map((wp) => (
              <div
                key={wp.id}
                className="doc-card"
                style={{ padding: "0.6rem 0.8rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span style={{ fontSize: "1.2rem" }}>{CATEGORY_ICONS[wp.category]}</span>
                    <strong>{wp.name}</strong>
                    <span className="meta">({(CATEGORY_NAMES as any)[lang]?.[wp.category] || wp.category})</span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-muted)", marginTop: 2 }}>
                    {t("mapCoordinates", lang)}: {wp.lat.toFixed(4)}°N, {wp.lng.toFixed(4)}°E
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.3rem" }}>
                  <button
                    type="button"
                    className="text-btn"
                    style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem" }}
                    onClick={() => {
                      setCenterLat(wp.lat);
                      setCenterLng(wp.lng);
                      setZoom(4);
                      setActiveTab("map");
                    }}
                  >
                    {t("mapShowBtn", lang)}
                  </button>
                  <button
                    type="button"
                    className="text-btn"
                    style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem" }}
                    onClick={() => {
                      setTargetLat(wp.lat.toFixed(4));
                      setTargetLng(wp.lng.toFixed(4));
                      setActiveTab("compass");
                    }}
                    title="Взять азимут по компасу"
                  >
                    🧭 Азимут
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    style={{ minHeight: "2rem", padding: "0.2rem" }}
                    onClick={() => handleRemoveWaypoint(wp.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tactical Compass Tab */}
      {activeTab === "compass" && (
        <section>
          <div style={{ marginBottom: "0.8rem" }}>
            <h2 className="section-title" style={{ margin: "0 0 0.2rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Compass size={20} color="var(--color-lamp)" />
              Тактический компас и азимут
            </h2>
            <p className="quiet" style={{ margin: 0 }}>
              Магнитный и истинный азимут, наведение на укрытия и солнечная астронавигация.
            </p>
          </div>

          <TacticalCompass
            userLocation={userLocation}
            waypoints={waypoints}
            targetLat={targetLat}
            targetLng={targetLng}
            onSetTarget={(lat, lng) => {
              setTargetLat(lat);
              setTargetLng(lng);
            }}
            onSwitchToMap={() => {
              const tLat = parseFloat(targetLat);
              const tLng = parseFloat(targetLng);
              if (!isNaN(tLat) && !isNaN(tLng)) {
                setCenterLat(tLat);
                setCenterLng(tLng);
                setZoom(4);
              }
              setActiveTab("map");
            }}
          />
        </section>
      )}

      {/* GPS Peer Friends & Rescue Radar Tab (Protected by Tactical Security) */}
      {activeTab === "friends" && (
        <section>
          <div style={{ marginBottom: "0.8rem" }}>
            <h2 className="section-title" style={{ margin: "0 0 0.2rem" }}>
              🛰 Взаимный GPS-поиск друзей и радар спасения
            </h2>
            <p className="quiet" style={{ margin: 0 }}>
              Координаты передаются только после взаимного подтверждения на обоих устройствах.
              В случае опасности включите сигнал SOS, чтобы друг по офлайн-картам сразу пришел на помощь.
            </p>
          </div>

          <TacticalSecurityGate moduleName="GPS-поиск друзей и координаты">
            <GpsFriendFinder
              onSelectFriendOnMap={(lat, lng, callsign) => {
                setCenterLat(lat);
                setCenterLng(lng);
                setTargetLat(lat.toFixed(4));
                setTargetLng(lng.toFixed(4));
                setZoom(5);
                setActiveTab("map");
              }}
            />
          </TacticalSecurityGate>
        </section>
      )}

      {/* Offline Map Packs Download Tab */}
      {activeTab === "packs" && (
        <section>
          <div style={{ marginBottom: "0.8rem" }}>
            <h2 className="section-title" style={{ margin: "0 0 0.2rem" }}>
              {t("mapPacksTitle", lang)}
            </h2>
            <p className="quiet" style={{ margin: 0 }}>
              {t("mapPacksSub", lang)}
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {OFFLINE_MAP_PACKS.map((pack) => {
              const isDownloaded = downloadedPacks.includes(pack.id);
              const isDownloading = downloadingPack === pack.id;
              const title = (pack as any)[`name${lang.toUpperCase()}`] || pack.nameRu;

              return (
                <div key={pack.id} className="pack-card" style={{ padding: "0.8rem 1rem" }}>
                  <div className="row-between">
                    <div>
                      <strong>{title}</strong>
                      <p className="meta" style={{ margin: "0.2rem 0 0" }}>
                        {pack.coverage} · ~{pack.sizeMb} {lang === "ar" ? "ميجابايت" : lang === "en" ? "MB" : "МБ"}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="text-btn"
                      disabled={isDownloaded || isDownloading}
                      style={{
                        background: isDownloaded ? "var(--color-raise)" : "var(--color-lamp)",
                        color: isDownloaded ? "var(--color-muted)" : "var(--color-ink)",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                      }}
                      onClick={() => handleDownloadPack(pack.id)}
                    >
                      {isDownloaded ? (
                        t("installedOffline", lang)
                      ) : isDownloading ? (
                        t("downloading", lang)
                      ) : (
                        <>
                          <Download size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                          {t("download", lang)}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
