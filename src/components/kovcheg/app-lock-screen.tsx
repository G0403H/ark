import { useState } from "react";
import {
  Lock,
  Unlock,
  AlertTriangle,
  Flame,
  ShieldCheck,
  RotateCcw,
  KeyRound,
  CheckCircle2,
  X,
  Siren,
  Smartphone,
  Radio,
} from "lucide-react";
import { useAppLockStore, APP_LOCK_WARNING } from "@/lib/kovcheg/app-lock";
import { useArk } from "@/lib/kovcheg/store";
import { useGpsPeerStore } from "@/lib/kovcheg/gps-peer-tracker";

export function AppLockScreen() {
  const theme = useArk((s) => s.theme);
  const {
    isAppLockEnabled,
    isAppUnlocked,
    unlockApp,
    failedAttempts,
    resetEntireApp,
  } = useAppLockStore();

  const [inputPass, setInputPass] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If app lock is not active or already unlocked, render nothing
  if (!isAppLockEnabled || isAppUnlocked) {
    return null;
  }

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPass.trim()) return;

    setErrorMessage(null);
    const res = await unlockApp(inputPass);
    if (!res.success) {
      setErrorMessage(res.error || "Неверный пароль.");
      setInputPass("");
    } else {
      setInputPass("");
    }
  };

  const handleFullReset = () => {
    const confirm1 = window.confirm(
      "ВНИМАНИЕ! Вы собираетесь выполнить ПОЛНЫЙ СБРОС (эквивалент переустановки приложения).\n\n" +
        "Все сохраненные заметки, документы, путевые точки и настройки будут БЕЗВОЗВРАТНО СТЕРТЫ.\n\n" +
        "Продолжить?"
    );
    if (!confirm1) return;

    const confirm2 = window.prompt(
      'Для подтверждения удаления всех данных и сброса пароля введите слово "СБРОС":'
    );
    if (confirm2?.trim().toUpperCase() === "СБРОС") {
      resetEntireApp();
    } else {
      alert("Сброс отменен: контрольное слово не совпало.");
    }
  };

  return (
    <div
      className="app-lock-fullscreen-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: theme === "stalker" ? "#0c110e" : "var(--color-bg, #121214)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.25rem",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "var(--color-bg-card, #181d19)",
          border: "2px solid var(--color-lamp, #facc15)",
          borderRadius: "8px",
          padding: "1.75rem",
          boxShadow: "0 0 35px rgba(250, 204, 21, 0.2)",
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "1.25rem",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            paddingBottom: "1rem",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "rgba(250, 204, 21, 0.15)",
              color: "var(--color-lamp, #facc15)",
              marginBottom: "0.75rem",
            }}
          >
            <Lock size={28} />
          </div>

          <h1
            style={{
              fontSize: "1.3rem",
              fontWeight: 800,
              letterSpacing: "0.06em",
              color: "var(--color-lamp, #facc15)",
              margin: 0,
              textTransform: "uppercase",
            }}
          >
            {theme === "stalker" ? "☢ КПК: ВХОД В СИСТЕМУ" : "КОВЧЕГ: ВХОД В АРХИВ"}
          </h1>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--color-text-dim, #9ca3af)",
              margin: "0.35rem 0 0 0",
            }}
          >
            Автономный справочник выживания заблокирован паролем
          </p>
        </div>

        {/* Password Form */}
        <form onSubmit={handleUnlock}>
          <label
            htmlFor="app-lock-password-input"
            style={{
              display: "block",
              fontSize: "0.8rem",
              fontWeight: 600,
              marginBottom: "0.35rem",
              color: "var(--color-text, #fff)",
            }}
          >
            Введите пароль для входа в приложение:
          </label>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <input
              id="app-lock-password-input"
              type="password"
              autoFocus
              autoComplete="current-password"
              value={inputPass}
              onChange={(e) => setInputPass(e.target.value)}
              placeholder="Пароль приложения..."
              style={{
                flex: 1,
                padding: "0.65rem 0.85rem",
                background: "rgba(0,0,0,0.4)",
                border: "1px solid var(--color-border, #444)",
                borderRadius: "4px",
                color: "#fff",
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
                padding: "0.65rem 1.1rem",
                fontWeight: 700,
                fontSize: "0.9rem",
              }}
            >
              <Unlock size={16} />
              Войти
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

          {failedAttempts > 0 && (
            <div
              style={{
                fontSize: "0.75rem",
                color: "#f87171",
                fontFamily: "monospace",
                marginBottom: "0.5rem",
              }}
            >
              Неудачных попыток ввода: {failedAttempts}
            </div>
          )}
        </form>

        {/* Warning Banner: Cannot be restored without reinstall/reset */}
        <div
          style={{
            marginTop: "1.25rem",
            padding: "0.75rem 0.85rem",
            background: "rgba(234, 179, 8, 0.1)",
            border: "1px solid rgba(234, 179, 8, 0.3)",
            borderRadius: "6px",
            fontSize: "0.75rem",
            lineHeight: 1.45,
            color: "#fde047",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              fontWeight: 700,
              marginBottom: "0.25rem",
              color: "#facc15",
            }}
          >
            <AlertTriangle size={15} />
            <span>ПРЕДУПРЕЖДЕНИЕ О БЕЗОПАСНОСТИ</span>
          </div>
          {APP_LOCK_WARNING}
        </div>

        {/* Recovery / Reset Action */}
        <div
          style={{
            marginTop: "1.25rem",
            paddingTop: "0.85rem",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={handleFullReset}
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
            <RotateCcw size={12} />
            Забыли пароль? Полный сброс (Переустановка)
          </button>

          <span
            style={{
              fontSize: "0.7rem",
              color: "var(--color-text-dim, #6b7280)",
              fontFamily: "monospace",
            }}
          >
            OFFLINE SAFE
          </span>
        </div>
      </div>
    </div>
  );
}

// Modal for setting up / changing master application password
export function AppLockSettingsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const {
    isAppLockEnabled,
    setAppPassword,
    removeAppPassword,
    emergencyPowerButtonSosEnabled,
    setEmergencyPowerButtonSosEnabled,
  } = useAppLockStore();

  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isAppLockEnabled && !currentPass.trim()) {
      setError("Введите текущий пароль для подтверждения");
      return;
    }

    if (!newPass.trim()) {
      setError("Новый пароль не может быть пустым");
      return;
    }

    if (newPass.length < 4) {
      setError("Пароль должен содержать минимум 4 символа");
      return;
    }

    if (newPass !== confirmPass) {
      setError("Подтверждение нового пароля не совпадает");
      return;
    }

    try {
      if (isAppLockEnabled) {
        const ok = await removeAppPassword(currentPass);
        if (!ok) {
          setError("Текущий пароль неверен");
          return;
        }
      }
      await setAppPassword(newPass);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ошибка установки пароля";
      setError(msg);
    }
  };

  const handleRemove = async () => {
    const pass = prompt("Введите текущий пароль для снятия блокировки приложения:");
    if (!pass) return;
    const ok = await removeAppPassword(pass);
    if (ok) {
      alert("Пароль приложения успешно отключен.");
      onClose();
    } else {
      alert("Неверный пароль.");
    }
  };

  return (
    <div
      className="drawer-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
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
              Пароль для входа в приложение
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
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
            marginBottom: "1rem",
            padding: "0.75rem",
            background: "rgba(234, 179, 8, 0.12)",
            border: "1px solid rgba(234, 179, 8, 0.3)",
            borderRadius: "6px",
            fontSize: "0.75rem",
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
              marginBottom: "0.25rem",
            }}
          >
            <AlertTriangle size={14} color="#facc15" />
            <span>ОБЯЗАТЕЛЬНО К ПРОЧТЕНИЮ:</span>
          </div>
          {APP_LOCK_WARNING}
        </div>

        <form onSubmit={handleSave}>
          {isAppLockEnabled && (
            <div style={{ marginBottom: "0.75rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  marginBottom: "0.25rem",
                }}
              >
                Текущий пароль приложения: *
              </label>
              <input
                type="password"
                required
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                placeholder="Текущий пароль..."
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid var(--color-border, #444)",
                  borderRadius: "4px",
                  color: "#fff",
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: "0.75rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 600,
                marginBottom: "0.25rem",
              }}
            >
              {isAppLockEnabled ? "Новый пароль входа: *" : "Придумайте пароль входа: *"}
            </label>
            <input
              type="password"
              required
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="Минимум 4 символа..."
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                background: "rgba(0,0,0,0.3)",
                border: "1px solid var(--color-border, #444)",
                borderRadius: "4px",
                color: "#fff",
              }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 600,
                marginBottom: "0.25rem",
              }}
            >
              Повторите пароль: *
            </label>
            <input
              type="password"
              required
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="Повтор пароля..."
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                background: "rgba(0,0,0,0.3)",
                border: "1px solid var(--color-border, #444)",
                borderRadius: "4px",
                color: "#fff",
              }}
            />
          </div>

          {/* Physical 3x Power Button SOS Trigger Setting */}
          <div
            style={{
              marginBottom: "1rem",
              padding: "0.75rem",
              background: emergencyPowerButtonSosEnabled
                ? "rgba(239, 68, 68, 0.12)"
                : "rgba(0, 0, 0, 0.25)",
              border: emergencyPowerButtonSosEnabled
                ? "1px solid rgba(239, 68, 68, 0.4)"
                : "1px solid var(--color-border, #333)",
              borderRadius: "6px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.4rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Smartphone
                  size={16}
                  color={emergencyPowerButtonSosEnabled ? "#ef4444" : "#9ca3af"}
                />
                <strong
                  style={{
                    fontSize: "0.85rem",
                    color: emergencyPowerButtonSosEnabled ? "#fca5a5" : "#fff",
                  }}
                >
                  SOS по 3-кратному нажатию кнопки питания
                </strong>
              </div>

              <input
                type="checkbox"
                id="emergency-power-sos-toggle"
                checked={emergencyPowerButtonSosEnabled}
                onChange={(e) =>
                  setEmergencyPowerButtonSosEnabled(e.target.checked)
                }
                style={{ cursor: "pointer", width: "16px", height: "16px" }}
              />
            </div>

            <p
              style={{
                fontSize: "0.72rem",
                color: "var(--color-text-dim, #9ca3af)",
                margin: "0 0 0.5rem 0",
                lineHeight: 1.4,
              }}
            >
              Физическая активация: если вы в опасности и не можете разблокировать экран,
              быстро нажмите кнопку включения/блокировки экрана 3 раза подряд (за 2.5 сек).
              Приложение зафиксирует GPS-координаты и отправит сигнал бедствия SOS друзьям.
            </p>

            <button
              type="button"
              onClick={() => {
                if (window.confirm("Отправить тестовый сигнал SOS сопряженным контактам?")) {
                  useGpsPeerStore.getState().triggerEmergencyHardwareSos();
                  alert("🚨 Тестовый сигнал SOS активирован! Координаты переданы друзьям.");
                }
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.25rem 0.6rem",
                background: "rgba(239, 68, 68, 0.2)",
                border: "1px solid #ef4444",
                color: "#f87171",
                borderRadius: "4px",
                fontSize: "0.72rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Siren size={12} />
              Проверить сигнал SOS сейчас
            </button>
          </div>

          {error && (
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
              {error}
            </div>
          )}

          {success && (
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
              Пароль входа успешно установлен!
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            {isAppLockEnabled && (
              <button
                type="button"
                onClick={handleRemove}
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
                Отключить пароль
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="btn"
              style={{ padding: "0.45rem 0.85rem", fontSize: "0.85rem" }}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: "0.45rem 1rem", fontSize: "0.85rem", fontWeight: 600 }}
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
