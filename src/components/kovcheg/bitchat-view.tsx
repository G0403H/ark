import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Radio, Send, ShieldAlert, Users, Globe, Trash2, Key, HelpCircle, Zap } from "lucide-react";
import { useArk } from "@/lib/kovcheg/store";
import { t } from "@/lib/kovcheg/i18n";
import { useBitChatStore } from "@/lib/kovcheg/bitchat/store";
import { BitChatMesh } from "@/lib/kovcheg/bitchat/mesh";
import { BitChatNostr } from "@/lib/kovcheg/bitchat/nostr";
import {
  createBitChatMessage,
  createSosBeacon,
} from "@/lib/kovcheg/bitchat/protocol";
import {
  formatNpubShort,
  parseChatCommand,
} from "@/lib/kovcheg/bitchat/identity";
import type { BitChatMessage } from "@/lib/kovcheg/bitchat/types";

export function BitChatView() {
  const lang = useArk((s) => s.lang) ?? "ru";
  const identity = useBitChatStore((s) => s.identity);
  const setCallsign = useBitChatStore((s) => s.setCallsign);
  const activeChannel = useBitChatStore((s) => s.activeChannel);
  const setActiveChannel = useBitChatStore((s) => s.setActiveChannel);
  const channels = useBitChatStore((s) => s.channels);
  const joinChannel = useBitChatStore((s) => s.joinChannel);
  const relays = useBitChatStore((s) => s.relays);
  const addRelay = useBitChatStore((s) => s.addRelay);
  const messages = useBitChatStore((s) => s.messages);
  const addMessage = useBitChatStore((s) => s.addMessage);
  const clearMessages = useBitChatStore((s) => s.clearMessages);
  const panicWipe = useBitChatStore((s) => s.panicWipe);
  const peerCount = useBitChatStore((s) => s.peerCount);
  const setPeerCount = useBitChatStore((s) => s.setPeerCount);
  const connectedRelays = useBitChatStore((s) => s.connectedRelays);
  const setConnectedRelays = useBitChatStore((s) => s.setConnectedRelays);

  const [input, setInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [editingNick, setEditingNick] = useState(false);
  const [newNick, setNewNick] = useState(identity.callsign);
  const [newRelayUrl, setNewRelayUrl] = useState("");
  const [customChannelInput, setCustomChannelInput] = useState("");

  const meshRef = useRef<BitChatMesh | null>(null);
  const nostrRef = useRef<BitChatNostr | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize Dual-Transport (Mesh + Nostr)
  useEffect(() => {
    // 1. Local Offline Proximity Mesh
    const mesh = new BitChatMesh(identity.pubkey);
    meshRef.current = mesh;

    const unMeshMsg = mesh.onMessage((msg) => {
      addMessage(msg);
    });

    const unPeerCount = mesh.onPeerCount((count) => {
      setPeerCount(count);
    });

    // 2. Global Nostr Relays
    const nostr = new BitChatNostr(identity, relays);
    nostrRef.current = nostr;

    const unNostrMsg = nostr.onMessage((msg) => {
      addMessage(msg);
    });

    const unRelayStatus = nostr.onStatus((connected) => {
      setConnectedRelays(connected);
    });

    nostr.connect();

    return () => {
      unMeshMsg();
      unPeerCount();
      unNostrMsg();
      unRelayStatus();
      mesh.destroy();
      nostr.destroy();
    };
  }, [identity.pubkey]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeChannel]);

  function handleSend(textToSend?: string) {
    const raw = (textToSend ?? input).trim();
    if (!raw) return;

    // Check for IRC / BitChat commands
    const parsedCmd = parseChatCommand(raw);
    if (parsedCmd) {
      handleCommand(parsedCmd);
      setInput("");
      return;
    }

    // Normal message
    const msg = createBitChatMessage(
      identity,
      activeChannel,
      raw,
      { isEmergency: activeChannel === "sos" }
    );

    // Save locally
    addMessage(msg);

    // Broadcast across Mesh (offline)
    meshRef.current?.broadcast(msg);

    // Broadcast across Nostr relays (if online)
    nostrRef.current?.publish(msg);

    setInput("");
  }

  function handleCommand(cmd: { command: string; args: string[] }) {
    switch (cmd.command) {
      case "join": {
        if (cmd.args[0]) {
          joinChannel(cmd.args[0]);
        }
        break;
      }
      case "nick": {
        if (cmd.args[0]) {
          setCallsign(cmd.args[0]);
        }
        break;
      }
      case "clear": {
        clearMessages(activeChannel);
        break;
      }
      case "sos": {
        triggerSos(cmd.args.join(" "));
        break;
      }
      case "wipe": {
        if (confirm("ВНИМАНИЕ! Экстренная очистка сотрет все ключи и переписку. Продолжить?")) {
          panicWipe();
        }
        break;
      }
      case "who": {
        const sysMsg: BitChatMessage = {
          id: `sys-${Date.now()}`,
          senderPubkey: "system",
          callsign: "СИСТЕМА",
          channel: activeChannel,
          text: `В эфире: Mesh пиров поблизости: ${peerCount} | Реле Nostr: ${connectedRelays}/${relays.length} | Ваш позывной: ${identity.callsign} (${formatNpubShort(identity.npub)})`,
          timestamp: Date.now(),
          transport: "local",
          hops: 0,
        };
        addMessage(sysMsg);
        break;
      }
      default: {
        const sysMsg: BitChatMessage = {
          id: `sys-${Date.now()}`,
          senderPubkey: "system",
          callsign: "СИСТЕМА",
          channel: activeChannel,
          text: `Неизвестная команда /${cmd.command}. Доступные: /join, /nick, /sos, /who, /clear, /wipe`,
          timestamp: Date.now(),
          transport: "local",
          hops: 0,
        };
        addMessage(sysMsg);
      }
    }
  }

  function triggerSos(customNote?: string) {
    const sosMsg = createSosBeacon(
      identity,
      undefined,
      customNote || "ТРЕБУЕТСЯ СРОЧНАЯ ПОМОЩЬ"
    );

    addMessage(sosMsg);
    meshRef.current?.broadcast(sosMsg);
    nostrRef.current?.publish(sosMsg);
    setActiveChannel("sos");
  }

  const channelMessages = messages.filter((m) => m.channel === activeChannel);

  return (
    <main>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Radio size={24} style={{ color: "var(--color-lamp)" }} />
          <h1 className="screen-title" style={{ margin: 0, fontSize: "1.4rem" }}>
            {t("chatTitle", lang)}
          </h1>
        </div>

        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <button
            type="button"
            className="alarm-btn"
            onClick={() => triggerSos()}
            style={{
              padding: "0.3rem 0.75rem",
              fontSize: "0.85rem",
              fontWeight: 700,
              minHeight: "2.2rem",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            <ShieldAlert size={16} />
            {t("chatSosBeacon", lang)}
          </button>

          <Link
            to="/morse"
            className="text-btn"
            style={{
              padding: "0.3rem 0.65rem",
              fontSize: "0.85rem",
              minHeight: "2.2rem",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            <Zap size={15} style={{ color: "var(--color-lamp)" }} />
            Морзе
          </Link>

          <button
            type="button"
            className="text-btn"
            onClick={() => setShowSettings((v) => !v)}
            style={{ minHeight: "2.2rem", padding: "0.2rem 0.6rem", fontSize: "0.85rem" }}
          >
            {t("chatSettingsBtn", lang)}
          </button>

          <button
            type="button"
            className="text-btn"
            onClick={() => setShowHelp((v) => !v)}
            title={t("chatHelpBtn", lang)}
            style={{ minHeight: "2.2rem", padding: "0.2rem 0.5rem" }}
          >
            <HelpCircle size={16} />
          </button>
        </div>
      </div>

      {/* Dual Transport & Callsign Status Ribbon */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          padding: "0.45rem 0.75rem",
          background: "var(--color-raise)",
          border: "1px solid var(--color-line)",
          borderRadius: "var(--radius-card)",
          margin: "0.6rem 0",
          fontSize: "0.85rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span
            style={{
              display: "inline-block",
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: identity.avatarColor,
            }}
          />
          {editingNick ? (
            <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
              <input
                type="text"
                value={newNick}
                onChange={(e) => setNewNick(e.target.value)}
                style={{
                  background: "var(--color-bg)",
                  color: "var(--color-fg)",
                  border: "1px solid var(--color-lamp)",
                  padding: "0.1rem 0.4rem",
                  fontSize: "0.85rem",
                  borderRadius: "3px",
                  maxWidth: "110px",
                }}
              />
              <button
                type="button"
                className="chip"
                onClick={() => {
                  setCallsign(newNick);
                  setEditingNick(false);
                }}
                style={{ minHeight: "1.8rem", padding: "0 0.4rem", fontSize: "0.75rem" }}
              >
                OK
              </button>
            </div>
          ) : (
            <span
              onClick={() => {
                setNewNick(identity.callsign);
                setEditingNick(true);
              }}
              style={{ fontWeight: 700, cursor: "pointer", borderBottom: "1px dashed var(--color-muted)" }}
              title={t("chatChangeNickTitle", lang)}
            >
              {identity.callsign}
            </span>
          )}
          <span className="meta" style={{ fontSize: "0.78rem" }}>
            {formatNpubShort(identity.npub)}
          </span>
        </div>

        <div style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              color: peerCount > 0 ? "var(--color-calm)" : "var(--color-muted)",
            }}
            title={t("chatMeshHint", lang)}
          >
            <Users size={14} /> Mesh: {peerCount}
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              color: connectedRelays > 0 ? "var(--color-calm)" : "var(--color-muted)",
            }}
            title={t("chatNostrHint", lang)}
          >
            <Globe size={14} /> Nostr: {connectedRelays}/{relays.length}
          </span>
        </div>
      </div>

      {/* Settings & Keys Drawer */}
      {showSettings && (
        <section
          className="card-block"
          style={{
            marginBottom: "0.8rem",
            background: "color-mix(in srgb, var(--color-raise) 95%, var(--color-lamp))",
            border: "1px solid var(--color-lamp)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <Key size={16} /> Криптографические ключи BitChat / Nostr
            </strong>
            <button
              type="button"
              className="text-btn"
              onClick={() => setShowSettings(false)}
              style={{ minHeight: "1.8rem", padding: "0.1rem 0.5rem", fontSize: "0.8rem" }}
            >
              ✕
            </button>
          </div>

          <div style={{ margin: "0.6rem 0", fontSize: "0.82rem", wordBreak: "break-all" }}>
            <div><strong>Публичный ключ (npub):</strong> {identity.npub}</div>
            <div style={{ marginTop: "0.3rem" }}>
              <strong>Секретный ключ (nsec):</strong>{" "}
              <span style={{ filter: "blur(4px)", cursor: "pointer" }} onClick={(e) => (e.currentTarget.style.filter = "none")}>
                {identity.nsec} (нажмите для показа)
              </span>
            </div>
          </div>

          {/* Relays List */}
          <div style={{ marginTop: "0.6rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Реле Nostr:</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.2rem" }}>
              {relays.map((r) => (
                <span key={r} className="chip" style={{ fontSize: "0.75rem", minHeight: "1.8rem", padding: "0.1rem 0.5rem" }}>
                  {r.replace("wss://", "")}
                </span>
              ))}
            </div>
          </div>

          {/* Panic Wipe Button */}
          <div style={{ marginTop: "0.8rem", display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="alarm-btn"
              onClick={() => {
                if (confirm("ВНИМАНИЕ! Экстренная очистка сотрет все ключи, историю сообщений и кэш. Продолжить?")) {
                  panicWipe();
                  setShowSettings(false);
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.3rem 0.8rem",
                fontSize: "0.8rem",
              }}
            >
              <Trash2 size={14} /> Panic Wipe (Экстренное удаление всех следов)
            </button>
          </div>
        </section>
      )}

      {/* Help Modal */}
      {showHelp && (
        <section className="card-block" style={{ marginBottom: "0.8rem", fontSize: "0.85rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>Команды тактической рации BitChat:</strong>
            <button
              type="button"
              className="text-btn"
              onClick={() => setShowHelp(false)}
              style={{ minHeight: "1.8rem", padding: "0.1rem 0.5rem", fontSize: "0.8rem" }}
            >
              ✕
            </button>
          </div>
          <ul style={{ margin: "0.5rem 0", paddingLeft: "1.2rem" }}>
            <li><code>/join #имя</code> — переключиться или создать канал связи</li>
            <li><code>/nick Позывной</code> — сменить свой радиопозывной</li>
            <li><code>/sos Текст</code> — передать сигнал бедствия с высоким приоритетом</li>
            <li><code>/who</code> — запросить статус радиоэфира, пиров и реле</li>
            <li><code>/clear</code> — очистить историю текущего канала</li>
            <li><code>/wipe</code> — экстренное уничтожение всех данных и ключей</li>
          </ul>
        </section>
      )}

      {/* Channel Bar */}
      <div
        className="filters"
        style={{
          overflowX: "auto",
          whiteSpace: "nowrap",
          paddingBottom: "0.3rem",
          margin: "0.5rem 0",
        }}
      >
        {channels.map((c) => (
          <button
            key={c.id}
            type="button"
            className="chip"
            data-on={activeChannel === c.id ? "1" : "0"}
            onClick={() => setActiveChannel(c.id)}
            style={{
              borderColor: c.isEmergency ? "var(--color-alarm)" : undefined,
              color: c.isEmergency && activeChannel !== c.id ? "var(--color-alarm)" : undefined,
            }}
          >
            {c.name}
          </button>
        ))}

        <button
          type="button"
          className="chip"
          onClick={() => {
            const ch = prompt("Введите имя нового канала (например: shelter или medic):");
            if (ch) joinChannel(ch);
          }}
          style={{ borderStyle: "dashed" }}
        >
          + Канал
        </button>
      </div>

      {/* Messages Terminal Stream */}
      <div
        style={{
          border: "1px solid var(--color-line)",
          background: "var(--color-bg)",
          borderRadius: "var(--radius-card)",
          padding: "0.8rem",
          minHeight: "360px",
          maxHeight: "520px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem",
          fontFamily: "monospace",
          fontSize: "0.92rem",
        }}
      >
        {channelMessages.length === 0 ? (
          <div style={{ margin: "auto", textAlign: "center", color: "var(--color-muted)", padding: "2rem 0" }}>
            <Radio size={36} style={{ margin: "0 auto 0.5rem", opacity: 0.4 }} />
            <p style={{ margin: 0 }}>В канале {activeChannel} пока тихо.</p>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem" }}>
              Отправьте сообщение — оно разлетится по P2P Mesh и Nostr реле.
            </p>
          </div>
        ) : (
          channelMessages.map((m) => {
            const isMe = m.senderPubkey === identity.pubkey;
            const timeStr = new Date(m.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });

            return (
              <div
                key={m.id}
                style={{
                  padding: "0.45rem 0.65rem",
                  borderRadius: "4px",
                  background: m.isEmergency
                    ? "color-mix(in srgb, var(--color-alarm) 18%, var(--color-raise))"
                    : isMe
                    ? "color-mix(in srgb, var(--color-lamp) 8%, var(--color-raise))"
                    : "var(--color-raise)",
                  borderLeft: m.isEmergency
                    ? "3px solid var(--color-alarm)"
                    : isMe
                    ? "3px solid var(--color-lamp)"
                    : "3px solid var(--color-line)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.76rem",
                    color: "var(--color-muted)",
                    marginBottom: "0.2rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <strong style={{ color: isMe ? "var(--color-lamp)" : "var(--color-fg)" }}>
                      {m.callsign}
                    </strong>
                    {m.isEmergency && (
                      <span
                        style={{
                          background: "var(--color-alarm)",
                          color: "#fff",
                          padding: "0.05rem 0.3rem",
                          borderRadius: "3px",
                          fontWeight: 700,
                          fontSize: "0.7rem",
                        }}
                      >
                        SOS
                      </span>
                    )}
                  </div>
                  <span>
                    {timeStr} · [{m.transport.toUpperCase()}{m.hops > 0 ? `:${m.hops}` : ""}]
                  </span>
                </div>
                <div style={{ wordBreak: "break-word", whiteSpace: "pre-wrap", color: "var(--color-fg)" }}>
                  {m.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box and Controls */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        style={{ marginTop: "0.6rem", display: "flex", gap: "0.4rem" }}
      >
        <input
          type="text"
          className="ask-field"
          value={input}
          placeholder={`Сообщение в #${activeChannel} (или /sos, /who, /join, /wipe)...`}
          onChange={(e) => setInput(e.target.value)}
          style={{ fontSize: "0.95rem", padding: "0.6rem 0.8rem", minHeight: "2.6rem" }}
        />
        <button
          type="submit"
          className="text-btn"
          disabled={!input.trim()}
          style={{ minHeight: "2.6rem", padding: "0 1rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
        >
          <Send size={16} />
        </button>
      </form>

      {/* Quick command pills */}
      <div className="tools" style={{ marginTop: "0.4rem", gap: "0.3rem" }}>
        <button
          type="button"
          className="chip"
          onClick={() => handleSend("/who")}
          style={{ fontSize: "0.75rem", minHeight: "1.8rem", padding: "0 0.5rem" }}
        >
          /who (статус сети)
        </button>
        <button
          type="button"
          className="chip"
          onClick={() => handleSend("/clear")}
          style={{ fontSize: "0.75rem", minHeight: "1.8rem", padding: "0 0.5rem" }}
        >
          /clear
        </button>
        <button
          type="button"
          className="chip"
          onClick={() => setInput("/join #")}
          style={{ fontSize: "0.75rem", minHeight: "1.8rem", padding: "0 0.5rem" }}
        >
          /join...
        </button>
      </div>
    </main>
  );
}
