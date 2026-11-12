import { useState, useEffect } from "react";
import {
  Users,
  Radio,
  MapPin,
  Compass,
  AlertTriangle,
  Siren,
  Copy,
  Check,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Navigation,
  RefreshCw,
  LocateFixed,
  KeyRound,
  Shield,
  HelpCircle,
  Smartphone,
  X,
} from "lucide-react";
import {
  useGpsPeerStore,
  type GpsFriend,
} from "@/lib/kovcheg/gps-peer-tracker";
import { useArk } from "@/lib/kovcheg/store";

interface GpsFriendFinderProps {
  onSelectFriendOnMap?: (lat: number, lng: number, callsign: string) => void;
}

export function GpsFriendFinder({ onSelectFriendOnMap }: GpsFriendFinderProps) {
  const theme = useArk((s) => s.theme);
  const {
    myPeerId,
    myCallsign,
    isGlobalBeaconActive,
    isSosActive,
    sosMessage,
    myCurrentLocation,
    friends,
    setMyCallsign,
    regeneratePeerId,
    setGlobalBeaconActive,
    setSosActive,
    startGpsTracking,
    stopGpsTracking,
    addFriendRequest,
    acceptPairingRequest,
    rejectPairingRequest,
    revokeFriendPairing,
    deleteFriend,
    setPeerSharing,
    setFriendChallengeCode,
    verifyFriendChallengeCode,
    broadcastCurrentBeacon,
  } = useGpsPeerStore();

  const [copiedId, setCopiedId] = useState(false);
  const [newFriendId, setNewFriendId] = useState("");
  const [newFriendCallsign, setNewFriendCallsign] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCallsign, setEditingCallsign] = useState(false);
  const [tempCallsign, setTempCallsign] = useState(myCallsign);

  // Challenge Code & FAQ modal state
  const [expandedChallengeFriendId, setExpandedChallengeFriendId] = useState<string | null>(null);
  const [challengeInput, setChallengeInput] = useState("");
  const [challengeSetupCode, setChallengeSetupCode] = useState("");
  const [challengeRequireCoords, setChallengeRequireCoords] = useState(false);
  const [challengeFeedback, setChallengeFeedback] = useState<string | null>(null);
  const [showFaqModal, setShowFaqModal] = useState(false);

  // Auto start GPS watching on mount
  useEffect(() => {
    startGpsTracking();
  }, [startGpsTracking]);

  const copyMyId = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(myPeerId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFriendId.trim()) return;

    addFriendRequest(
      newFriendId.trim(),
      newFriendCallsign.trim() || `Друг ${newFriendId.trim().slice(-4)}`
    );

    setNewFriendId("");
    setNewFriendCallsign("");
    setShowAddForm(false);
  };

  const incomingRequests = friends.filter((f) => f.status === "pending_incoming");
  const approvedFriends = friends.filter((f) => f.status === "approved");
  const pendingOutgoing = friends.filter((f) => f.status === "pending_outgoing");

  return (
    <div className="gps-friend-finder" style={{ padding: "0.25rem 0" }}>
      {/* 1. Header Card: My Tactical ID & Beacon Switch */}
      <div
        className="card"
        style={{
          background: "var(--color-bg-card, #171d18)",
          border: isSosActive
            ? "2px solid #ef4444"
            : "1px solid var(--color-border, #2d372e)",
          borderRadius: "8px",
          padding: "1rem",
          marginBottom: "1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginBottom: "0.75rem",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span
                style={{
                  display: "inline-block",
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: isGlobalBeaconActive ? "#22c55e" : "#6b7280",
                  boxShadow: isGlobalBeaconActive
                    ? "0 0 10px #22c55e"
                    : "none",
                }}
              />
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "var(--color-text-dim, #9ca3af)",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Мой тактический маяк
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
              {editingCallsign ? (
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  <input
                    type="text"
                    value={tempCallsign}
                    onChange={(e) => setTempCallsign(e.target.value)}
                    placeholder="Позывной"
                    style={{
                      padding: "0.2rem 0.5rem",
                      fontSize: "0.9rem",
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid var(--color-border, #444)",
                      color: "#fff",
                      borderRadius: "4px",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setMyCallsign(tempCallsign);
                      setEditingCallsign(false);
                    }}
                    className="btn btn-primary"
                    style={{ padding: "0.2rem 0.6rem", fontSize: "0.75rem" }}
                  >
                    OK
                  </button>
                </div>
              ) : (
                <strong
                  onClick={() => setEditingCallsign(true)}
                  title="Нажмите, чтобы изменить позывной"
                  style={{
                    fontSize: "1.1rem",
                    cursor: "pointer",
                    color: "var(--color-lamp, #facc15)",
                  }}
                >
                  {myCallsign} ✎
                </strong>
              )}

              <span
                style={{
                  fontFamily: "monospace",
                  background: "rgba(0,0,0,0.4)",
                  padding: "0.2rem 0.5rem",
                  borderRadius: "4px",
                  fontSize: "0.85rem",
                  color: "#38bdf8",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                }}
              >
                ID: {myPeerId}
              </span>

              <button
                type="button"
                onClick={copyMyId}
                title="Скопировать ID для друга"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid var(--color-border, #333)",
                  borderRadius: "4px",
                  padding: "0.25rem 0.5rem",
                  color: "var(--color-text, #fff)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  fontSize: "0.75rem",
                }}
              >
                {copiedId ? <Check size={13} color="#22c55e" /> : <Copy size={13} />}
                {copiedId ? "Скопировано" : "Копировать"}
              </button>
            </div>
          </div>

          {/* Master GPS Broadcast Toggle */}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setGlobalBeaconActive(!isGlobalBeaconActive)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.45rem 0.75rem",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                background: isGlobalBeaconActive
                  ? "rgba(34, 197, 94, 0.2)"
                  : "rgba(107, 114, 128, 0.2)",
                border: isGlobalBeaconActive
                  ? "1px solid #22c55e"
                  : "1px solid #4b5563",
                color: isGlobalBeaconActive ? "#4ade80" : "#9ca3af",
              }}
            >
              {isGlobalBeaconActive ? <Eye size={15} /> : <EyeOff size={15} />}
              {isGlobalBeaconActive ? "Вещание GPS: ВКЛ" : "Вещание GPS: ВЫКЛ"}
            </button>

            <button
              type="button"
              onClick={() => setShowFaqModal(true)}
              title="Справка по тройному нажатию Power SOS и кодовым словам"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.45rem 0.65rem",
                borderRadius: "6px",
                fontSize: "0.78rem",
                cursor: "pointer",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid var(--color-border, #444)",
                color: "var(--color-lamp, #facc15)",
                fontWeight: 600,
              }}
            >
              <HelpCircle size={15} />
              FAQ
            </button>
          </div>
        </div>

        {/* Telemetry info row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.4rem 0.6rem",
            background: "rgba(0,0,0,0.25)",
            borderRadius: "4px",
            fontSize: "0.75rem",
            color: "var(--color-text-dim, #9ca3af)",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <div>
            {myCurrentLocation ? (
              <span>
                🛰 Мои координаты:{" "}
                <strong style={{ color: "#fff" }}>
                  {myCurrentLocation.lat.toFixed(4)}°, {myCurrentLocation.lng.toFixed(4)}°
                </strong>{" "}
                (±{Math.round(myCurrentLocation.accuracy || 0)} м)
              </span>
            ) : (
              <span style={{ color: "#eab308" }}>
                ⏳ Ожидание спутников GPS...
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={() => broadcastCurrentBeacon()}
              title="Обновить координаты в эфире"
              style={{
                background: "transparent",
                border: "none",
                color: "#38bdf8",
                cursor: "pointer",
                fontSize: "0.75rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              <RefreshCw size={12} />
              Обновить маяк
            </button>
          </div>
        </div>

        {/* Emergency SOS Alarm Switch */}
        <div
          style={{
            marginTop: "0.75rem",
            padding: "0.6rem",
            background: isSosActive
              ? "rgba(239, 68, 68, 0.25)"
              : "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: "6px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Siren
              size={20}
              color="#ef4444"
              className={isSosActive ? "animate-pulse" : ""}
            />
            <div>
              <strong
                style={{
                  fontSize: "0.85rem",
                  color: isSosActive ? "#ef4444" : "#fca5a5",
                }}
              >
                {isSosActive
                  ? "🚨 РЕЖИМ БЕДСТВИЯ (SOS) АКТИВЕН!"
                  : "Кнопка SOS (Сигнал опасности)"}
              </strong>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.7rem",
                  color: "var(--color-text-dim, #9ca3af)",
                }}
              >
                {isSosActive
                  ? "Ваши координаты и сигнал тревоги передаются всем доверенным друзьям."
                  : "Если вы в опасности — включите SOS, друзья увидят пеленг и точку для помощи."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSosActive(!isSosActive)}
            className="btn"
            style={{
              padding: "0.4rem 0.85rem",
              fontSize: "0.8rem",
              fontWeight: 700,
              background: isSosActive ? "#ef4444" : "rgba(239, 68, 68, 0.2)",
              color: isSosActive ? "#fff" : "#f87171",
              border: "1px solid #ef4444",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {isSosActive ? "Отключить SOS" : "Активировать SOS"}
          </button>
        </div>
      </div>

      {/* 2. INCOMING PAIRING REQUESTS (Critical Handshake Requirement) */}
      {incomingRequests.length > 0 && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem",
            background: "rgba(234, 179, 8, 0.12)",
            border: "2px solid #eab308",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              marginBottom: "0.5rem",
              color: "#facc15",
              fontWeight: 700,
              fontSize: "0.85rem",
            }}
          >
            <ShieldCheck size={18} />
            <span>ВХОДЯЩИЕ ЗАПРОСЫ НА ПОИСК ПО GPS ({incomingRequests.length})</span>
          </div>

          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--color-text-dim, #d1d5db)",
              marginBottom: "0.75rem",
            }}
          >
            В целях безопасности, устройство друга не получит ваши координаты,
            пока вы явно не подтвердите связь:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {incomingRequests.map((req) => (
              <div
                key={req.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.5rem 0.75rem",
                  background: "rgba(0,0,0,0.3)",
                  borderRadius: "6px",
                  border: "1px solid rgba(234, 179, 8, 0.3)",
                }}
              >
                <div>
                  <strong style={{ fontSize: "0.9rem", color: "#fff" }}>
                    {req.callsign}
                  </strong>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: "0.75rem",
                      color: "#9ca3af",
                      marginLeft: "0.5rem",
                    }}
                  >
                    ID: {req.id}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <button
                    type="button"
                    onClick={() => acceptPairingRequest(req.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      padding: "0.3rem 0.65rem",
                      background: "rgba(34, 197, 94, 0.2)",
                      border: "1px solid #22c55e",
                      color: "#4ade80",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <CheckCircle2 size={14} />
                    Подтвердить
                  </button>

                  <button
                    type="button"
                    onClick={() => rejectPairingRequest(req.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      padding: "0.3rem 0.65rem",
                      background: "rgba(239, 68, 68, 0.2)",
                      border: "1px solid #ef4444",
                      color: "#f87171",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                    }}
                  >
                    <XCircle size={14} />
                    Отклонить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. FRIENDS LIST & ACTION BAR */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Users size={18} color="var(--color-lamp, #facc15)" />
          <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>
            Доверенные друзья для взаимного поиска ({approvedFriends.length})
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-primary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.3rem",
            padding: "0.35rem 0.75rem",
            fontSize: "0.8rem",
            fontWeight: 600,
          }}
        >
          <Plus size={15} />
          {showAddForm ? "Закрыть" : "Добавить друга"}
        </button>
      </div>

      {/* Add Friend Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          style={{
            padding: "0.85rem",
            background: "rgba(0,0,0,0.3)",
            border: "1px solid var(--color-border, #333)",
            borderRadius: "6px",
            marginBottom: "1rem",
          }}
        >
          <h4
            style={{
              margin: "0 0 0.5rem 0",
              fontSize: "0.85rem",
              color: "var(--color-lamp, #facc15)",
            }}
          >
            Добавление устройства друга
          </h4>
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--color-text-dim, #9ca3af)",
              marginBottom: "0.75rem",
            }}
          >
            Введите тактический ID (например <code>ARK-1234</code>), который сообщил вам друг.
            На его телефоне появится запрос на взаимное подтверждение связи.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.5rem",
              marginBottom: "0.75rem",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  marginBottom: "0.25rem",
                  color: "var(--color-text-dim, #aaa)",
                }}
              >
                Тактический ID друга: *
              </label>
              <input
                type="text"
                required
                value={newFriendId}
                onChange={(e) => setNewFriendId(e.target.value)}
                placeholder="ARK-XXXX"
                style={{
                  width: "100%",
                  padding: "0.45rem 0.6rem",
                  background: "rgba(0,0,0,0.4)",
                  border: "1px solid var(--color-border, #444)",
                  borderRadius: "4px",
                  color: "#fff",
                  fontFamily: "monospace",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  marginBottom: "0.25rem",
                  color: "var(--color-text-dim, #aaa)",
                }}
              >
                Позывной / Имя:
              </label>
              <input
                type="text"
                value={newFriendCallsign}
                onChange={(e) => setNewFriendCallsign(e.target.value)}
                placeholder="Например: Сталкер-7"
                style={{
                  width: "100%",
                  padding: "0.45rem 0.6rem",
                  background: "rgba(0,0,0,0.4)",
                  border: "1px solid var(--color-border, #444)",
                  borderRadius: "4px",
                  color: "#fff",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="btn"
              style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem" }}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                padding: "0.35rem 0.85rem",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
            >
              Отправить запрос связи
            </button>
          </div>
        </form>
      )}

      {/* Approved Friends Cards */}
      {approvedFriends.length === 0 && pendingOutgoing.length === 0 ? (
        <div
          style={{
            padding: "1.5rem",
            textAlign: "center",
            background: "rgba(0,0,0,0.15)",
            border: "1px dashed var(--color-border, #333)",
            borderRadius: "6px",
            color: "var(--color-text-dim, #9ca3af)",
            fontSize: "0.85rem",
          }}
        >
          <p style={{ margin: "0 0 0.5rem 0" }}>
            У вас пока нет сопряженных друзей для GPS-поиска.
          </p>
          <p style={{ margin: 0, fontSize: "0.75rem" }}>
            Сообщите другу свой ID <strong>({myPeerId})</strong> или добавьте его ID по кнопке выше.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {approvedFriends.map((friend) => {
            const beacon = friend.lastBeacon;
            const hasBeacon = !!beacon;
            const isSos = !!beacon?.isSos;

            return (
              <div
                key={friend.id}
                style={{
                  background: isSos
                    ? "rgba(239, 68, 68, 0.15)"
                    : "var(--color-bg-card, #171d18)",
                  border: isSos
                    ? "2px solid #ef4444"
                    : "1px solid var(--color-border, #2d372e)",
                  borderRadius: "8px",
                  padding: "0.85rem",
                  boxShadow: isSos ? "0 0 15px rgba(239, 68, 68, 0.3)" : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        backgroundColor: isSos
                          ? "#ef4444"
                          : hasBeacon
                          ? "#22c55e"
                          : "#6b7280",
                        boxShadow: isSos
                          ? "0 0 10px #ef4444"
                          : hasBeacon
                          ? "0 0 6px #22c55e"
                          : "none",
                      }}
                    />
                    <div>
                      <strong
                        style={{
                          fontSize: "1rem",
                          color: isSos ? "#ef4444" : "var(--color-text, #fff)",
                        }}
                      >
                        {friend.callsign}
                      </strong>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: "0.75rem",
                          color: "var(--color-text-dim, #9ca3af)",
                          marginLeft: "0.4rem",
                        }}
                      >
                        [{friend.id}]
                      </span>
                    </div>
                  </div>

                  {/* Privacy Toggle: user can revoke broadcasting their own coords to this friend */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <button
                      type="button"
                      onClick={() =>
                        setPeerSharing(friend.id, !friend.sharingWithPeer)
                      }
                      title={
                        friend.sharingWithPeer
                          ? "Вы транслируете свои координаты этому контакту (нажмите, чтобы скрыть)"
                          : "Трансляция ваших координат этому контакту отключена"
                      }
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.7rem",
                        cursor: "pointer",
                        background: friend.sharingWithPeer
                          ? "rgba(34, 197, 94, 0.15)"
                          : "rgba(107, 114, 128, 0.2)",
                        border: friend.sharingWithPeer
                          ? "1px solid rgba(34, 197, 94, 0.4)"
                          : "1px solid rgba(107, 114, 128, 0.4)",
                        color: friend.sharingWithPeer ? "#4ade80" : "#9ca3af",
                      }}
                    >
                      {friend.sharingWithPeer ? <Eye size={12} /> : <EyeOff size={12} />}
                      {friend.sharingWithPeer ? "Моя гео: Передается" : "Моя гео: Скрыта"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Отозвать сопряжение с ${friend.callsign}? Связь будет разорвана.`
                          )
                        ) {
                          revokeFriendPairing(friend.id);
                        }
                      }}
                      title="Отозвать связь"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        padding: "0.25rem",
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Challenge Code & Authentication Status ("Friend or Foe") */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.4rem",
                    padding: "0.35rem 0.6rem",
                    background: "rgba(0,0,0,0.2)",
                    borderRadius: "4px",
                    marginBottom: "0.5rem",
                    fontSize: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    {friend.challengeCode ? (
                      friend.isVerifiedWithCode ? (
                        <span
                          style={{
                            color: "#4ade80",
                            background: "rgba(34, 197, 94, 0.15)",
                            border: "1px solid rgba(34, 197, 94, 0.3)",
                            padding: "0.15rem 0.45rem",
                            borderRadius: "4px",
                            fontWeight: 600,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                        >
                          <CheckCircle2 size={12} />
                          Личность подтверждена (Свой)
                        </span>
                      ) : (
                        <span
                          style={{
                            color: "#facc15",
                            background: "rgba(234, 179, 8, 0.15)",
                            border: "1px solid rgba(234, 179, 8, 0.3)",
                            padding: "0.15rem 0.45rem",
                            borderRadius: "4px",
                            fontWeight: 600,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                        >
                          <Shield size={12} />
                          Требуется кодовое слово
                          {friend.requireCodeForCoords && " (гео заблокирована)"}
                        </span>
                      )
                    ) : (
                      <span style={{ color: "var(--color-text-dim, #9ca3af)" }}>
                        Кодовое слово проверки не задано
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (expandedChallengeFriendId === friend.id) {
                        setExpandedChallengeFriendId(null);
                        setChallengeFeedback(null);
                      } else {
                        setExpandedChallengeFriendId(friend.id);
                        setChallengeSetupCode(friend.challengeCode || "");
                        setChallengeRequireCoords(!!friend.requireCodeForCoords);
                        setChallengeInput("");
                        setChallengeFeedback(null);
                      }
                    }}
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid var(--color-border, #444)",
                      borderRadius: "4px",
                      color: "var(--color-lamp, #facc15)",
                      padding: "0.2rem 0.5rem",
                      fontSize: "0.72rem",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    <KeyRound size={12} />
                    {expandedChallengeFriendId === friend.id
                      ? "Скрыть"
                      : "Кодовое слово связи"}
                  </button>
                </div>

                {/* Expanded Challenge Code Panel */}
                {expandedChallengeFriendId === friend.id && (
                  <div
                    style={{
                      padding: "0.65rem",
                      background: "rgba(0,0,0,0.35)",
                      border: "1px dashed var(--color-border, #444)",
                      borderRadius: "6px",
                      marginBottom: "0.6rem",
                      fontSize: "0.75rem",
                    }}
                  >
                    <div style={{ marginBottom: "0.6rem" }}>
                      <label
                        style={{
                          display: "block",
                          fontWeight: 600,
                          color: "var(--color-lamp, #facc15)",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Задать контрольное слово для абонента (пароль «Свой-Чужой»):
                      </label>
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <input
                          type="text"
                          value={challengeSetupCode}
                          onChange={(e) => setChallengeSetupCode(e.target.value)}
                          placeholder="Например: КЕДР-19"
                          style={{
                            flex: 1,
                            padding: "0.35rem 0.5rem",
                            background: "rgba(0,0,0,0.4)",
                            border: "1px solid var(--color-border, #555)",
                            borderRadius: "4px",
                            color: "#fff",
                            fontFamily: "monospace",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!challengeSetupCode.trim()) {
                              alert("Введите кодовое слово");
                              return;
                            }
                            setFriendChallengeCode(
                              friend.id,
                              challengeSetupCode,
                              challengeRequireCoords
                            );
                            setChallengeFeedback("✓ Кодовое слово сохранено!");
                            setTimeout(() => setChallengeFeedback(null), 2000);
                          }}
                          className="btn btn-primary"
                          style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem" }}
                        >
                          Сохранить
                        </button>
                      </div>

                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          marginTop: "0.35rem",
                          cursor: "pointer",
                          color: "var(--color-text-dim, #ccc)",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={challengeRequireCoords}
                          onChange={(e) => setChallengeRequireCoords(e.target.checked)}
                          style={{ cursor: "pointer" }}
                        />
                        Блокировать выдачу моих координат другу до ввода этого слова
                      </label>
                    </div>

                    {/* Verification Form if code is set */}
                    {friend.challengeCode && (
                      <div
                        style={{
                          paddingTop: "0.5rem",
                          borderTop: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <label
                          style={{
                            display: "block",
                            fontWeight: 600,
                            color: "#fff",
                            marginBottom: "0.25rem",
                          }}
                        >
                          Проверка: друг назвал вам кодовое слово во время связи?
                        </label>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <input
                            type="text"
                            value={challengeInput}
                            onChange={(e) => setChallengeInput(e.target.value)}
                            placeholder="Введите слово, названное другом..."
                            style={{
                              flex: 1,
                              padding: "0.35rem 0.5rem",
                              background: "rgba(0,0,0,0.4)",
                              border: "1px solid var(--color-border, #555)",
                              borderRadius: "4px",
                              color: "#fff",
                              fontFamily: "monospace",
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const match = verifyFriendChallengeCode(
                                friend.id,
                                challengeInput
                              );
                              if (match) {
                                setChallengeFeedback("✓ Личность друга подтверждена! Доступ открыт.");
                                setChallengeInput("");
                              } else {
                                setChallengeFeedback("❌ Неверное слово! Возможно, устройство захвачено чужаком.");
                              }
                            }}
                            className="btn"
                            style={{
                              padding: "0.35rem 0.75rem",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              background: "rgba(34, 197, 94, 0.2)",
                              border: "1px solid #22c55e",
                              color: "#4ade80",
                            }}
                          >
                            Подтвердить
                          </button>
                        </div>
                      </div>
                    )}

                    {challengeFeedback && (
                      <div
                        style={{
                          marginTop: "0.4rem",
                          padding: "0.3rem 0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.72rem",
                          background: challengeFeedback.startsWith("✓")
                            ? "rgba(34, 197, 94, 0.2)"
                            : "rgba(239, 68, 68, 0.2)",
                          color: challengeFeedback.startsWith("✓")
                            ? "#4ade80"
                            : "#fca5a5",
                        }}
                      >
                        {challengeFeedback}
                      </div>
                    )}
                  </div>
                )}

                {/* Emergency SOS Banner if triggered by friend */}
                {isSos && (
                  <div
                    style={{
                      padding: "0.5rem",
                      background: "rgba(239, 68, 68, 0.2)",
                      border: "1px solid #ef4444",
                      borderRadius: "4px",
                      color: "#fca5a5",
                      fontSize: "0.8rem",
                      marginBottom: "0.5rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <Siren size={16} color="#ef4444" />
                    <div>
                      <strong>ТРЕВОГА SOS: ДРУГ В ОПАСНОСТИ!</strong>
                      {beacon.sosMessage && (
                        <div style={{ fontSize: "0.75rem", color: "#fff" }}>
                          &laquo;{beacon.sosMessage}&raquo;
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Navigation telemetry to friend */}
                {hasBeacon ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                      gap: "0.5rem",
                      padding: "0.5rem",
                      background: "rgba(0,0,0,0.3)",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                    }}
                  >
                    <div>
                      <span style={{ color: "var(--color-text-dim, #9ca3af)", fontSize: "0.7rem" }}>
                        Дистанция до друга:
                      </span>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "1.05rem",
                          color: isSos ? "#ef4444" : "var(--color-lamp, #facc15)",
                        }}
                      >
                        {beacon.distanceMeters !== undefined
                          ? beacon.distanceMeters < 1000
                            ? `${beacon.distanceMeters} м`
                            : `${(beacon.distanceMeters / 1000).toFixed(2)} км`
                          : "Расчет..."}
                      </div>
                    </div>

                    <div>
                      <span style={{ color: "var(--color-text-dim, #9ca3af)", fontSize: "0.7rem" }}>
                        Азимут / Пеленг:
                      </span>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "0.95rem",
                          color: "#38bdf8",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                        }}
                      >
                        <Compass size={14} />
                        {beacon.bearingDeg !== undefined
                          ? `${beacon.bearingDeg}°`
                          : "—"}
                      </div>
                    </div>

                    <div>
                      <span style={{ color: "var(--color-text-dim, #9ca3af)", fontSize: "0.7rem" }}>
                        Засечка координат:
                      </span>
                      <div style={{ fontSize: "0.75rem", color: "#d1d5db" }}>
                        {Math.round((Date.now() - beacon.timestamp) / 1000) < 60
                          ? "Только что"
                          : `${Math.round((Date.now() - beacon.timestamp) / 60000)} мин назад`}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "flex-end" }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectFriendOnMap) {
                            onSelectFriendOnMap(beacon.lat, beacon.lng, friend.callsign);
                          }
                        }}
                        className="btn btn-primary"
                        style={{
                          width: "100%",
                          padding: "0.3rem 0.5rem",
                          fontSize: "0.75rem",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.25rem",
                        }}
                      >
                        <Navigation size={13} />
                        Вести по карте
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "0.5rem",
                      background: "rgba(0,0,0,0.2)",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      color: "var(--color-text-dim, #9ca3af)",
                    }}
                  >
                    🛰 Связь подтверждена. Ожидание первого GPS-пакета от абонента...
                  </div>
                )}
              </div>
            );
          })}

          {/* Pending Outgoing Requests */}
          {pendingOutgoing.map((p) => (
            <div
              key={p.id}
              style={{
                padding: "0.6rem 0.85rem",
                background: "rgba(0,0,0,0.2)",
                border: "1px dashed var(--color-border, #444)",
                borderRadius: "6px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.8rem",
              }}
            >
              <div>
                <span style={{ color: "#eab308" }}>⏳ Ожидает подтверждения: </span>
                <strong style={{ color: "#fff" }}>{p.callsign}</strong>
                <span style={{ fontFamily: "monospace", color: "#888", marginLeft: "0.4rem" }}>
                  [{p.id}]
                </span>
              </div>
              <button
                type="button"
                onClick={() => deleteFriend(p.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#9ca3af",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                }}
              >
                Отменить
              </button>
            </div>
          ))}
        </div>
      )}

      {/* FAQ / Manual Modal: 3x Power SOS & Challenge Code Protocol */}
      {showFaqModal && (
        <div
          className="drawer-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "var(--color-bg, #111)",
              border: "1px solid var(--color-lamp, #facc15)",
              borderRadius: "8px",
              padding: "1.25rem",
              boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
                borderBottom: "1px solid var(--color-border, #333)",
                paddingBottom: "0.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <HelpCircle size={20} color="var(--color-lamp, #facc15)" />
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
                  Памятка: Экстренный SOS и кодовые слова
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFaqModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--color-text-dim, #999)",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: "0.82rem", lineHeight: 1.5, color: "#d1d5db" }}>
              <div style={{ marginBottom: "1rem" }}>
                <strong style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <Smartphone size={16} /> 1. Экстренное включение SOS по 3-кратному нажатию кнопки питания:
                </strong>
                <p style={{ margin: "0.3rem 0 0 0" }}>
                  Если вы находитесь в опасности (засада, травма, преследование) и не можете смотреть на экран телефона,
                  <strong> нажмите физическую кнопку включения/блокировки экрана 3 раза подряд за 2.5 секунды</strong>.
                  Приложение зафиксирует текущие спутниковые GPS-координаты, активирует тревогу и мгновенно разошлет пакет бедствия SOS всем вашим сопряженным друзьям. На их офлайн-картах замигает красная метка с пеленгом и дистанцией до вас.
                </p>
                <p style={{ margin: "0.3rem 0 0 0", color: "#facc15", fontSize: "0.75rem" }}>
                  * Функцию можно включить или выключить в меню настроек под разделом «Пароль для входа в приложение».
                </p>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <strong style={{ color: "#38bdf8", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <KeyRound size={16} /> 2. Кодовое слово проверки связи («Свой-Чужой»):
                </strong>
                <p style={{ margin: "0.3rem 0 0 0" }}>
                  Если у вас есть подозрение, что телефон друга был украден или отобран чужаками,
                  вы можете добровольно потребовать кодовое слово подтверждения личности.
                  Задайте для друга секретное слово (например, <em>«МАРС-14»</em>) и включите блокировку координат.
                  Пока собеседник не назовет условный пароль сеанса, приложение не будет выдавать ему ваши координаты.
                </p>
              </div>

              <div
                style={{
                  padding: "0.6rem 0.75rem",
                  background: "rgba(234, 179, 8, 0.12)",
                  border: "1px solid rgba(234, 179, 8, 0.35)",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  color: "#fde047",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: "0.2rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <AlertTriangle size={14} /> ВАЖНО: Восстановление паролей невозможно!
                </div>
                КОВЧЕГ работает полностью автономно без серверов. Ни пароль входа в приложение, ни тактическое кодовое слово
                нельзя восстановить при утере. Сбросить забытый пароль можно ТОЛЬКО полной очисткой данных / переустановкой приложения.
              </div>
            </div>

            <div style={{ marginTop: "1rem", textAlign: "right" }}>
              <button
                type="button"
                onClick={() => setShowFaqModal(false)}
                className="btn btn-primary"
                style={{ padding: "0.4rem 1rem", fontSize: "0.8rem", fontWeight: 600 }}
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
