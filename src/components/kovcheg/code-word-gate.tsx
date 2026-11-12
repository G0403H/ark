import { useState, type ReactNode } from "react";
import { Lock, Unlock, ShieldAlert, KeyRound, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useTacticalSecurity } from "@/lib/kovcheg/tactical-security";
import { useArk } from "@/lib/kovcheg/store";

interface CodeWordGateProps {
  children: ReactNode;
  featureName?: string;
}

export function CodeWordGate({ children, featureName = "Личные записи и блокнот" }: CodeWordGateProps) {
  const isEnabled = useTacticalSecurity((s) => s.isEnabled);
  const isUnlocked = useTacticalSecurity((s) => s.isUnlocked);
  const unlock = useTacticalSecurity((s) => s.unlock);
  const lock = useTacticalSecurity((s) => s.lock);
  const setupPasscode = useTacticalSecurity((s) => s.setupPasscode);
  const removeProtection = useTacticalSecurity((s) => s.removeProtection);
  const lang = useArk((s) => s.lang) ?? "ru";

  const [inputCode, setInputCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCode, setShowCode] = useState(false);

  // Setup / Management Modal State
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [setupMaster, setSetupMaster] = useState("");
  const [setupDuress, setSetupDuress] = useState("");
  const [setupError, setSetupError] = useState("");

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!inputCode.trim()) return;

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await unlock(inputCode);
      if (!res.success) {
        setErrorMsg(
          res.error ||
            (lang === "ar"
              ? "كلمة المرور غير صحيحة. تم رفض الوصول."
              : lang === "en"
              ? "Incorrect code word. Access denied."
              : "Неверное кодовое слово. Доступ запрещен."),
        );
      } else {
        setInputCode("");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Ошибка при проверке кода");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveSetup(e: React.FormEvent) {
    e.preventDefault();
    if (!setupMaster.trim()) {
      setSetupError(
        lang === "ar"
          ? "لا يمكن ترك كلمة المرور فارغة"
          : lang === "en"
          ? "Code word cannot be empty"
          : "Кодовое слово не может быть пустым",
      );
      return;
    }

    try {
      await setupPasscode(setupMaster, setupDuress || undefined);
      setIsSetupOpen(false);
      setSetupMaster("");
      setSetupDuress("");
      setSetupError("");
    } catch (err: any) {
      setSetupError(err.message || "Ошибка при настройке кодового слова");
    }
  }

  async function handleRemoveProtection() {
    const entered = window.prompt(
      lang === "ar"
        ? "أدخل كلمة المرور الحالية لإلغاء الحماية:"
        : lang === "en"
        ? "Enter current code word to remove protection:"
        : "Введите текущее кодовое слово для отключения защиты:",
    );
    if (!entered) return;

    const ok = await removeProtection(entered);
    if (!ok) {
      alert(
        lang === "ar"
          ? "كلمة المرور غير صحيحة"
          : lang === "en"
          ? "Incorrect code word"
          : "Неверное кодовое слово",
      );
    }
  }

  // Case 1: Protection is NOT configured yet
  if (!isEnabled) {
    return (
      <div className="codeword-gate-container">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.4rem 0.8rem",
            background: "rgba(234, 179, 8, 0.08)",
            border: "1px dashed rgba(234, 179, 8, 0.3)",
            borderRadius: "var(--radius-card)",
            marginBottom: "1rem",
            fontSize: "0.85rem",
          }}
        >
          <span style={{ color: "var(--color-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <KeyRound size={15} color="#eab308" />
            {lang === "ar"
              ? "البيانات غير محمية بكلمة مرور."
              : lang === "en"
              ? "Personal data is not code-word protected."
              : "Данные не защищены кодовым словом."}
          </span>
          <button
            type="button"
            className="text-btn"
            style={{ fontSize: "0.8rem", minHeight: "1.8rem", padding: "0.15rem 0.5rem" }}
            onClick={() => setIsSetupOpen(true)}
          >
            🔒 {lang === "ar" ? "تعيين كلمة سر" : lang === "en" ? "Set Code Word" : "Задать кодовое слово"}
          </button>
        </div>

        {isSetupOpen && (
          <div
            className="card-block"
            style={{
              border: "1px solid var(--color-lamp)",
              background: "var(--color-surface)",
              padding: "1rem",
              marginBottom: "1.2rem",
            }}
          >
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>
              {lang === "ar" ? "تعيين كلمة مرور للبيانات الشخصية" : lang === "en" ? "Configure Code Word Protection" : "Установка кодового слова для личных данных"}
            </h3>
            <p className="quiet" style={{ fontSize: "0.85rem", margin: "0 0 0.8rem" }}>
              {lang === "ar"
                ? "سيتم حجب الملاحظات، الملفات وسجل الدورة الشهرية حتى إدخال كلمة السر."
                : lang === "en"
                ? "Conceals user notes, private documents, and cycle logs until unlocked."
                : "Скрывает личные заметки, файлы и женский календарь до ввода кодового слова."}
            </p>
            <form onSubmit={handleSaveSetup}>
              <div style={{ marginBottom: "0.6rem" }}>
                <label className="meta" style={{ display: "block", marginBottom: "0.2rem" }}>
                  {lang === "ar" ? "كلمة المرور الرئيسية:" : lang === "en" ? "Master Code Word:" : "Мастер-кодовое слово (пароль):"}
                </label>
                <input
                  type="password"
                  className="search-field"
                  required
                  placeholder={lang === "ar" ? "مثلاً: كوفشيج-2026" : lang === "en" ? "e.g. survival-key-42" : "Например: пароль или фраза..."}
                  value={setupMaster}
                  onChange={(e) => setSetupMaster(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: "0.8rem" }}>
                <label className="meta" style={{ display: "block", marginBottom: "0.2rem" }}>
                  {lang === "ar" ? "رمز الطوارئ (اختياري - يمسح البيانات عند التهديد):" : lang === "en" ? "Duress Panic Code (optional - silent wipe under coercion):" : "Код принуждения (опционально — тихое удаление при угрозе):"}
                </label>
                <input
                  type="password"
                  className="search-field"
                  placeholder={lang === "ar" ? "رمز بديل مختلف..." : lang === "en" ? "Different panic code..." : "Альтернативный код тревоги..."}
                  value={setupDuress}
                  onChange={(e) => setSetupDuress(e.target.value)}
                />
              </div>

              {setupError && <p className="warn" style={{ margin: "0 0 0.6rem", fontSize: "0.85rem" }}>{setupError}</p>}

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="submit" className="text-btn" style={{ fontWeight: "bold" }}>
                  {lang === "ar" ? "حفظ وتفعيل الحماية" : lang === "en" ? "Save & Activate" : "Сохранить и включить защиту"}
                </button>
                <button type="button" className="text-btn" onClick={() => setIsSetupOpen(false)}>
                  {lang === "ar" ? "إلغاء" : lang === "en" ? "Cancel" : "Отмена"}
                </button>
              </div>
            </form>
          </div>
        )}

        {children}
      </div>
    );
  }

  // Case 2: Protection is ENABLED and LOCKED
  if (!isUnlocked) {
    return (
      <div className="card-block" style={{ border: "1px solid rgba(239, 68, 68, 0.4)", padding: "1.5rem 1rem", textAlign: "center", margin: "1rem 0" }}>
        <div style={{ display: "inline-flex", padding: "0.8rem", background: "rgba(239, 68, 68, 0.15)", borderRadius: "50%", marginBottom: "0.8rem" }}>
          <Lock size={32} color="#ef4444" />
        </div>

        <h2 style={{ fontSize: "1.15rem", margin: "0 0 0.3rem" }}>
          {lang === "ar" ? "المحتوى مقفل بكلمة مرور" : lang === "en" ? "Content Locked with Code Word" : "Доступ защищен кодовым словом"}
        </h2>

        <p className="quiet" style={{ fontSize: "0.85rem", maxWidth: "420px", margin: "0 auto 1rem" }}>
          {lang === "ar"
            ? `«${featureName}» تحتوي على بيانات شخصية حساسة. أدخل كلمة السر لفك القفل.`
            : lang === "en"
            ? `"${featureName}" contains sensitive personal data. Enter code word to unlock.`
            : `Раздел «${featureName}» содержит приватные записи. Введите кодовое слово для разблокировки.`}
        </p>

        <form onSubmit={handleUnlock} style={{ maxWidth: "320px", margin: "0 auto" }}>
          <div style={{ position: "relative", marginBottom: "0.8rem" }}>
            <input
              type={showCode ? "text" : "password"}
              className="search-field"
              required
              autoFocus
              placeholder={lang === "ar" ? "أدخل كلمة المرور..." : lang === "en" ? "Enter code word..." : "Введите кодовое слово..."}
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              style={{ paddingRight: "2.5rem" }}
            />
            <button
              type="button"
              onClick={() => setShowCode((v) => !v)}
              style={{
                position: "absolute",
                right: "0.6rem",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "var(--color-muted)",
                cursor: "pointer",
                padding: 0,
              }}
              title="Показать / скрыть"
            >
              {showCode ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {errorMsg && (
            <p className="warn" style={{ fontSize: "0.85rem", margin: "0 0 0.8rem" }}>
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            className="text-btn"
            disabled={isSubmitting}
            style={{
              width: "100%",
              minHeight: "2.5rem",
              background: "var(--color-lamp)",
              color: "var(--color-ink)",
              fontWeight: "bold",
            }}
          >
            <Unlock size={15} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
            {lang === "ar" ? "فك القفل" : lang === "en" ? "Unlock Now" : "Разблокировать"}
          </button>
        </form>
      </div>
    );
  }

  // Case 3: Protection is ENABLED and UNLOCKED
  return (
    <div className="codeword-gate-container">
      {/* Discreet Security Control Ribbon */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.5rem",
          padding: "0.35rem 0.8rem",
          background: "rgba(34, 197, 94, 0.08)",
          border: "1px solid rgba(34, 197, 94, 0.25)",
          borderRadius: "var(--radius-card)",
          marginBottom: "1rem",
          fontSize: "0.8rem",
        }}
      >
        <span style={{ color: "#22c55e", display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 600 }}>
          <ShieldCheck size={14} />
          {lang === "ar"
            ? "الحماية مفعلة · القسم غير مقفل حالياً"
            : lang === "en"
            ? "Protected · Unlocked in current session"
            : "Защита активна · Разблокировано в этой сессии"}
        </span>

        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button
            type="button"
            className="text-btn"
            onClick={lock}
            style={{
              fontSize: "0.75rem",
              minHeight: "1.8rem",
              padding: "0.15rem 0.5rem",
              background: "rgba(239, 68, 68, 0.15)",
              color: "#f87171",
              border: "1px solid rgba(239, 68, 68, 0.3)",
            }}
          >
            <Lock size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />
            {lang === "ar" ? "قفل الآن" : lang === "en" ? "Lock Now" : "Запереть сейчас"}
          </button>

          <button
            type="button"
            className="text-btn"
            onClick={handleRemoveProtection}
            style={{ fontSize: "0.75rem", minHeight: "1.8rem", padding: "0.15rem 0.5rem", color: "var(--color-muted)" }}
          >
            {lang === "ar" ? "إلغاء كلمة السر" : lang === "en" ? "Remove Password" : "Снять защиту"}
          </button>
        </div>
      </div>

      {children}
    </div>
  );
}
