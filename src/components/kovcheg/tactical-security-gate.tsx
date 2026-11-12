import { useState, useEffect } from "react";
import {
  ShieldAlert,
  Lock,
  Unlock,
  KeyRound,
  AlertTriangle,
  Flame,
  CheckCircle2,
  X,
  Settings,
} from "lucide-react";
import { useTacticalSecurity } from "@/lib/kovcheg/tactical-security";
import { useArk } from "@/lib/kovcheg/store";

interface TacticalSecurityGateProps {
  children: React.ReactNode;
  moduleName?: string;
}

export function TacticalSecurityGate({
  children,
  moduleName = "Тактический модуль",
}: TacticalSecurityGateProps) {
  const theme = useArk((s) => s.theme);
  const {
    isEnabled,
    isUnlocked,
    unlock,
    lock,
    setupPasscode,
    removeProtection,
    triggerPanicWipe,
    failedAttempts,
    checkAutoLock,
  } = useTacticalSecurity();

  const [inputCode, setInputCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isWipeTriggered, setIsWipeTriggered] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);

  // Setup modal form state
  const [setupMaster, setSetupMaster] = useState("");
  const [setupMasterConfirm, setSetupMasterConfirm] = useState("");
  const [setupDuress, setSetupDuress] = useState("");
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupSuccess, setSetupSuccess] = useState(false);

  // Check auto-lock periodically
  useEffect(() => {
    checkAutoLock();
    const interval = setInterval(checkAutoLock, 30000);
    return () => clearInterval(interval);
  }, [checkAutoLock]);

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    setErrorMessage(null);
    const result = await unlock(inputCode);

    if (result.isDuress) {
      setIsWipeTriggered(true);
      setInputCode("");
      setErrorMessage(result.error || "Аварийный сброс активирован.");
      return;
    }

    if (!result.success) {
      setErrorMessage(result.error || "Неверный код доступа");
      setInputCode("");
    } else {
      setInputCode("");
    }
  };

  const handleSaveSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);

    if (!setupMaster.trim()) {
      setSetupError("Введите мастер-код");
      return;
    }
    if (setupMaster !== setupMasterConfirm) {
      setSetupError("Подтверждение мастер-кода не совпадает");
      return;
    }

    try {
      await setupPasscode(setupMaster, setupDuress || undefined);
      setSetupSuccess(true);
      setTimeout(() => {
        setShowSetupModal(false);
        setSetupSuccess(false);
        setSetupMaster("");
        setSetupMasterConfirm("");
        setSetupDuress("");
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ошибка установки кода";
      setSetupError(msg);
    }
  };

  // If protection is enabled and module is locked: show the Security Passcode Prompt Screen
  if (isEnabled && !isUnlocked) {
    return (
      <div
        className="tactical-gate-locked"
        style={{
          maxWidth: "520px",
          margin: "2rem auto",
          padding: "1.5rem",
          background: "var(--color-bg-card, #121815)",
          border: "2px solid #ef4444",
          borderRadius: "8px",
          boxShadow: "0 0 25px rgba(239, 68, 68, 0.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "1rem",
            borderBottom: "1px solid rgba(239, 68, 68, 0.3)",
            paddingBottom: "0.75rem",
          }}
        >
          <div
            style={{
              padding: "0.5rem",
              background: "rgba(239, 68, 68, 0.15)",
              borderRadius: "6px",
              color: "#ef4444",
            }}
          >
            <ShieldAlert size={28} />
          </div>
          <div>
            <h2
              style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                color: "#f87171",
                margin: 0,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              {theme === "stalker"
                ? "☢ ДОСТУП ЗАБЛОКИРОВАН: КПК"
                : "Тактическая защита данных"}
            </h2>
            <p
              style={{
                margin: "2px 0 0 0",
                fontSize: "0.8rem",
                color: "var(--color-text-dim, #9ca3af)",
              }}
            >
              Модуль: <strong>{moduleName}</strong>
            </p>
          </div>
        </div>

        {isWipeTriggered ? (
          <div
            style={{
              padding: "1rem",
              background: "rgba(239, 68, 68, 0.2)",
              border: "1px solid #ef4444",
              borderRadius: "6px",
              color: "#fca5a5",
              fontSize: "0.85rem",
              marginBottom: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Flame size={20} color="#ef4444" />
              <strong>РЕЖИМ ПРИНУЖДЕНИЯ АКТИВИРОВАН</strong>
            </div>
            <p style={{ margin: "0.5rem 0 0 0" }}>
              Все тактические координаты, радиоэфир и список маяков друзей
              безвозвратно уничтожены. Устройство очищено.
            </p>
          </div>
        ) : (
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--color-text-dim, #d1d5db)",
              lineHeight: 1.5,
              marginBottom: "1.25rem",
            }}
          >
            Для предотвращения утечки координат при краже или захвате телефона,
            доступ к эфиру и маякам разрешен только владельцу устройства.
          </p>
        )}

        <form onSubmit={handleUnlockSubmit}>
          <label
            htmlFor="tactical-code-input"
            style={{
              display: "block",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--color-text-dim, #9ca3af)",
              marginBottom: "0.35rem",
            }}
          >
            Введите секретное кодовое слово / PIN:
          </label>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <input
              id="tactical-code-input"
              type="password"
              autoFocus
              autoComplete="off"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="Секретный код..."
              style={{
                flex: 1,
                padding: "0.6rem 0.8rem",
                background: "rgba(0,0,0,0.4)",
                border: "1px solid var(--color-border, #374151)",
                borderRadius: "4px",
                color: "var(--color-text, #fff)",
                fontSize: "1rem",
                fontFamily: "monospace",
              }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.6rem 1rem",
                fontWeight: 600,
              }}
            >
              <Unlock size={16} />
              Открыть
            </button>
          </div>

          {errorMessage && (
            <div
              style={{
                padding: "0.5rem 0.75rem",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                borderRadius: "4px",
                color: "#f87171",
                fontSize: "0.8rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                marginBottom: "0.75rem",
              }}
            >
              <AlertTriangle size={15} />
              <span>{errorMessage}</span>
            </div>
          )}

          {failedAttempts > 0 && !isWipeTriggered && (
            <div
              style={{
                fontSize: "0.75rem",
                color: "#f87171",
                fontFamily: "monospace",
              }}
            >
              Неудачных попыток ввода: {failedAttempts}
            </div>
          )}
        </form>

        <div
          style={{
            marginTop: "1.25rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid var(--color-border, rgba(255,255,255,0.1))",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "АВАРИЙНЫЙ СБРОС: Стереть все координаты, друзей и историю радиоэфира?"
                )
              ) {
                triggerPanicWipe();
                setIsWipeTriggered(true);
              }
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "#ef4444",
              fontSize: "0.75rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              textDecoration: "underline",
            }}
          >
            <Flame size={13} />
            Экстренная очистка (Panic Wipe)
          </button>

          <span
            style={{
              fontSize: "0.7rem",
              color: "var(--color-text-dim, #6b7280)",
              fontFamily: "monospace",
            }}
          >
            🔒 SHA-256 HASH GUARD
          </span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Top Tactical Security Status Bar */}
      <div
        className="tactical-status-strip"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.4rem 0.75rem",
          background: isEnabled
            ? "rgba(34, 197, 94, 0.08)"
            : "rgba(234, 179, 8, 0.08)",
          border: isEnabled
            ? "1px solid rgba(34, 197, 94, 0.25)"
            : "1px solid rgba(234, 179, 8, 0.3)",
          borderRadius: "6px",
          marginBottom: "0.85rem",
          fontSize: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          {isEnabled ? (
            <>
              <Lock size={14} color="#22c55e" />
              <span style={{ color: "#22c55e", fontWeight: 600 }}>
                Тактическая защита активна
              </span>
              <span style={{ color: "var(--color-text-dim, #9ca3af)" }}>
                (Сессия открыта)
              </span>
            </>
          ) : (
            <>
              <AlertTriangle size={14} color="#eab308" />
              <span style={{ color: "#eab308", fontWeight: 600 }}>
                Защита кодовым словом отключена
              </span>
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.4rem" }}>
          {isEnabled && (
            <button
              type="button"
              onClick={lock}
              title="Мгновенно запереть тактический доступ"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.25rem 0.5rem",
                fontSize: "0.75rem",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#f87171",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              <Lock size={12} />
              Запереть
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowSetupModal(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.25rem 0.5rem",
              fontSize: "0.75rem",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid var(--color-border, #374151)",
              color: "var(--color-text-dim, #d1d5db)",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            <Settings size={12} />
            {isEnabled ? "Код" : "Настроить пароль"}
          </button>
        </div>
      </div>

      {/* Main Protected Content */}
      {children}

      {/* Modal: Setup / Change Master & Duress Passcodes */}
      {showSetupModal && (
        <div
          className="drawer-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "480px",
              background: "var(--color-bg, #111)",
              border: "1px solid var(--color-border, #333)",
              borderRadius: "8px",
              padding: "1.25rem",
              boxShadow: "0 10px 30px rgba(0,0,0,0.7)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
                borderBottom: "1px solid var(--color-border, #222)",
                paddingBottom: "0.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <KeyRound size={20} color="var(--color-lamp, #facc15)" />
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
                  Настройка тактической защиты
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSetupModal(false)}
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

            {/* Warning Banner */}
            <div
              style={{
                marginBottom: "0.85rem",
                padding: "0.65rem 0.75rem",
                background: "rgba(234, 179, 8, 0.12)",
                border: "1px solid rgba(234, 179, 8, 0.3)",
                borderRadius: "6px",
                fontSize: "0.74rem",
                color: "#fde047",
                lineHeight: 1.4,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  fontWeight: 700,
                  marginBottom: "0.2rem",
                }}
              >
                <AlertTriangle size={14} color="#facc15" />
                <span>ВАЖНО: ВОССТАНОВЛЕНИЕ НЕВОЗМОЖНО</span>
              </div>
              Кодовое слово и пароль входа хранятся только на этом устройстве в хэшированном виде.
              Если вы забудете кодовое слово — восстановить его нельзя. Сброс возможен только полной очисткой данных / переустановкой приложения.
            </div>

            <form onSubmit={handleSaveSetup}>
              <div style={{ marginBottom: "0.85rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    marginBottom: "0.25rem",
                  }}
                >
                  Секретное кодовое слово / Мастер-PIN:
                </label>
                <input
                  type="password"
                  value={setupMaster}
                  onChange={(e) => setSetupMaster(e.target.value)}
                  placeholder="Например: ВЫМПЕЛ-44 или 8931"
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid var(--color-border, #444)",
                    borderRadius: "4px",
                    color: "#fff",
                    fontFamily: "monospace",
                  }}
                />
              </div>

              <div style={{ marginBottom: "0.85rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    marginBottom: "0.25rem",
                  }}
                >
                  Повторите кодовое слово:
                </label>
                <input
                  type="password"
                  value={setupMasterConfirm}
                  onChange={(e) => setSetupMasterConfirm(e.target.value)}
                  placeholder="Повтор..."
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid var(--color-border, #444)",
                    borderRadius: "4px",
                    color: "#fff",
                    fontFamily: "monospace",
                  }}
                />
              </div>

              <div
                style={{
                  marginBottom: "1rem",
                  padding: "0.75rem",
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  borderRadius: "6px",
                }}
              >
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "#f87171",
                    marginBottom: "0.25rem",
                  }}
                >
                  Код принуждения (Duress / Панический пароль):
                </label>
                <input
                  type="password"
                  value={setupDuress}
                  onChange={(e) => setSetupDuress(e.target.value)}
                  placeholder="Необязательно (например: 0000)"
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    borderRadius: "4px",
                    color: "#fff",
                    fontFamily: "monospace",
                  }}
                />
                <p
                  style={{
                    margin: "0.35rem 0 0 0",
                    fontSize: "0.7rem",
                    color: "var(--color-text-dim, #9ca3af)",
                    lineHeight: 1.4,
                  }}
                >
                  Если при краже телефона или угрозе вас заставят сказать пароль,
                  назовите этот код. При его вводе приложение сделает вид, что открылось,
                  но безвозвратно сотрет все реальные координаты друзей и историю радиоэфира.
                </p>
              </div>

              {setupError && (
                <div
                  style={{
                    padding: "0.5rem",
                    background: "rgba(239, 68, 68, 0.2)",
                    borderRadius: "4px",
                    color: "#f87171",
                    fontSize: "0.8rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  {setupError}
                </div>
              )}

              {setupSuccess && (
                <div
                  style={{
                    padding: "0.5rem",
                    background: "rgba(34, 197, 94, 0.2)",
                    borderRadius: "4px",
                    color: "#4ade80",
                    fontSize: "0.8rem",
                    marginBottom: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <CheckCircle2 size={16} />
                  Кодовое слово успешно сохранено!
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                {isEnabled && (
                  <button
                    type="button"
                    onClick={async () => {
                      const code = prompt("Введите текущий мастер-код для отключения защиты:");
                      if (code) {
                        const ok = await removeProtection(code);
                        if (ok) {
                          alert("Защита снята.");
                          setShowSetupModal(false);
                        } else {
                          alert("Неверный код доступа.");
                        }
                      }
                    }}
                    style={{
                      marginRight: "auto",
                      background: "transparent",
                      border: "none",
                      color: "#ef4444",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    Снять защиту
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowSetupModal(false)}
                  className="btn"
                  style={{ padding: "0.5rem 0.85rem", fontSize: "0.85rem" }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", fontWeight: 600 }}
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
