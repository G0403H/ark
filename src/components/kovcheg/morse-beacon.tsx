import { useState, useEffect, useRef } from "react";
import { Radio, Volume2, VolumeX, Lightbulb, Play, Square, AlertCircle, Compass } from "lucide-react";
import { TacticalSecurityGate } from "@/components/kovcheg/tactical-security-gate";
import { initHardwareTorch, setHardwareTorch, releaseHardwareTorch } from "@/lib/kovcheg/hardware-torch";

// International Morse Dictionary (RU + EN + Digits)
const MORSE_MAP: Record<string, string> = {
  // English
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....",
  I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.",
  Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-",
  Y: "-.--", Z: "--..",
  // Russian
  А: ".-", Б: "-...", В: ".--", Г: "--.", Д: "-..", Е: ".", Ж: "...-", З: "--..",
  И: "..", Й: ".---", К: "-.-", Л: ".-..", М: "--", Н: "-.", О: "---", П: ".--.",
  Р: ".-.", С: "...", Т: "-", У: "..-", Ф: "..-.", Х: "....", Ц: "-.-.", Ч: "---.",
  Ш: "----", Щ: "--.-", Ъ: "--.--", Ы: "-.--", Ь: "-..-", Э: "..-..", Ю: "..--", Я: ".-.-",
  // Digits
  "1": ".----", "2": "..---", "3": "...--", "4": "....-", "5": ".....",
  "6": "-....", "7": "--...", "8": "---..", "9": "----.", "0": "-----",
};

export function MorseBeacon() {
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [screenFlashEnabled, setScreenFlashEnabled] = useState(true);
  const [torchEnabled, setTorchEnabled] = useState(true);
  const [mode, setMode] = useState<"SOS" | "MAYDAY" | "CUSTOM">("SOS");
  const [customText, setCustomText] = useState("SOS");
  const [flashActive, setFlashActive] = useState(false);
  const [currentSymbol, setCurrentSymbol] = useState("");

  const audioCtxRef = useRef<AudioContext | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const cancelLoopRef = useRef(false);

  // Initialize torch if supported
  async function setupTorch() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as any;
      if (capabilities && capabilities.torch) {
        videoTrackRef.current = track;
      }
    } catch {}
  }

  async function setHardwareTorch(on: boolean) {
    if (!torchEnabled || !videoTrackRef.current) return;
    try {
      await (videoTrackRef.current as any).applyConstraints({
        advanced: [{ torch: on }],
      });
    } catch {}
  }

  function playTone(durationMs: number) {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch {}
  }

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function emitPulse(isDash: boolean) {
    if (cancelLoopRef.current) return;
    const dur = isDash ? 450 : 150;

    setCurrentSymbol(isDash ? "—" : "•");
    setFlashActive(true);
    setHardwareTorch(true);
    playTone(dur);

    await sleep(dur);

    setFlashActive(false);
    setHardwareTorch(false);
    await sleep(150); // Pause between dots/dashes within letter
  }

  function textToMorsePatterns(text: string): string[] {
    const chars = text.toUpperCase().split("");
    const patterns: string[] = [];
    for (const char of chars) {
      if (char === " ") {
        patterns.push("/");
      } else if (MORSE_MAP[char]) {
        patterns.push(MORSE_MAP[char]);
      }
    }
    return patterns;
  }

  async function runMorseLoop() {
    cancelLoopRef.current = false;
    let targetText = mode === "SOS" ? "SOS" : mode === "MAYDAY" ? "MAYDAY" : customText.trim() || "SOS";
    const patterns = textToMorsePatterns(targetText);

    while (!cancelLoopRef.current) {
      for (const pattern of patterns) {
        if (cancelLoopRef.current) break;
        if (pattern === "/") {
          await sleep(1200); // Word gap
          continue;
        }

        for (const sym of pattern) {
          if (cancelLoopRef.current) break;
          await emitPulse(sym === "-");
        }
        await sleep(450); // Letter gap
      }
      setCurrentSymbol("");
      await sleep(1800); // Cycle gap before repetition
    }

    setFlashActive(false);
    setHardwareTorch(false);
    setCurrentSymbol("");
  }

  function handleStart() {
    setIsRunning(true);
    setupTorch().then(() => {
      runMorseLoop();
    });
  }

  function handleStop() {
    cancelLoopRef.current = true;
    setIsRunning(false);
    setFlashActive(false);
    setHardwareTorch(false);
    setCurrentSymbol("");
    if (videoTrackRef.current) {
      videoTrackRef.current.stop();
      videoTrackRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      cancelLoopRef.current = true;
      if (videoTrackRef.current) {
        videoTrackRef.current.stop();
      }
    };
  }, []);

  return (
    <TacticalSecurityGate moduleName="Свето-звуковой SOS Маяк Морзе">
      <div className="card-block" style={{ marginBottom: "1rem", border: "1.5px solid var(--color-line)" }}>
        {/* Screen Strobe Flash Overlay */}
        {screenFlashEnabled && flashActive && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "#ffffff",
              zIndex: 99999,
              pointerEvents: "none",
              opacity: 0.95,
            }}
          />
        )}

      {/* Header */}
      <div className="row-between" style={{ alignItems: "center", marginBottom: "0.6rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Radio size={22} color="#f59e0b" />
          <div>
            <strong style={{ fontSize: "1.05rem" }}>Свето-звуковой маяк SOS (Морзе)</strong>
            <p className="meta" style={{ margin: "0.1rem 0 0" }}>
              Аварийный оптический и радиовещательный маяк спасения
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.3rem" }}>
          <button
            type="button"
            className="chip"
            onClick={() => setSoundEnabled((v) => !v)}
            title={soundEnabled ? "Звук включен" : "Звук выключен"}
            style={{ color: soundEnabled ? "#22c55e" : "var(--color-muted)" }}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => setScreenFlashEnabled((v) => !v)}
            title={screenFlashEnabled ? "Экранный стробоскоп включен" : "Стробоскоп выключен"}
            style={{ color: screenFlashEnabled ? "#f59e0b" : "var(--color-muted)" }}
          >
            <Lightbulb size={15} />
          </button>
        </div>
      </div>

      {/* Beacon Mode Chips */}
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.8rem", flexWrap: "wrap" }}>
        <button
          type="button"
          className={`chip ${mode === "SOS" ? "chip-active" : ""}`}
          data-on={mode === "SOS" ? "1" : "0"}
          onClick={() => { setMode("SOS"); if (isRunning) handleStop(); }}
          style={{ fontWeight: 700, color: mode === "SOS" ? "#ef4444" : undefined }}
        >
          🚨 SOS (··· --- ···)
        </button>
        <button
          type="button"
          className={`chip ${mode === "MAYDAY" ? "chip-active" : ""}`}
          data-on={mode === "MAYDAY" ? "1" : "0"}
          onClick={() => { setMode("MAYDAY"); if (isRunning) handleStop(); }}
        >
          MAYDAY (Голос/Эфир)
        </button>
        <button
          type="button"
          className={`chip ${mode === "CUSTOM" ? "chip-active" : ""}`}
          data-on={mode === "CUSTOM" ? "1" : "0"}
          onClick={() => { setMode("CUSTOM"); if (isRunning) handleStop(); }}
        >
          Свой текст
        </button>
      </div>

      {mode === "CUSTOM" && (
        <div style={{ marginBottom: "0.8rem" }}>
          <input
            type="text"
            className="search-field"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Введите текст (например, ПОМОГИТЕ или HELP)"
            style={{ padding: "0.4rem 0.6rem", minHeight: "2.2rem" }}
            maxLength={30}
          />
        </div>
      )}

      {/* Pulse Status Visualizer */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          borderRadius: "var(--radius-card)",
          background: flashActive
            ? "color-mix(in srgb, #f59e0b 25%, var(--color-raise))"
            : "var(--color-raise)",
          border: isRunning ? "2px solid #f59e0b" : "1px solid var(--color-line)",
          marginBottom: "0.8rem",
          transition: "all 0.1s ease",
        }}
      >
        <span style={{ fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-muted)" }}>
          {isRunning ? "Маяк активен в эфире" : "Маяк отключен"}
        </span>

        <div style={{ fontSize: "2.8rem", fontWeight: 800, fontFamily: "monospace", color: flashActive ? "#f59e0b" : "var(--color-muted)", minHeight: "3.5rem", display: "flex", alignItems: "center" }}>
          {currentSymbol || (isRunning ? "..." : "●")}
        </div>

        <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--color-muted)" }}>
          Сигнал: <strong>{mode === "SOS" ? "··· --- ··· (SOS)" : mode === "MAYDAY" ? "MAYDAY" : customText}</strong>
        </p>
      </div>

      {/* Start / Stop Button */}
      {!isRunning ? (
        <button
          type="button"
          className="alarm-btn danger"
          onClick={handleStart}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            padding: "0.75rem",
            fontWeight: 700,
          }}
        >
          <Play size={18} fill="#fff" />
          ВКЛЮЧИТЬ АВАРИЙНЫЙ МАЯК SOS
        </button>
      ) : (
        <button
          type="button"
          className="text-btn"
          onClick={handleStop}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            padding: "0.75rem",
            background: "var(--color-raise)",
            fontWeight: 700,
          }}
        >
          <Square size={18} />
          ОСТАНОВИТЬ МАЯК
        </button>
      )}

      {/* Advice */}
      <div style={{ marginTop: "0.6rem", fontSize: "0.78rem", color: "var(--color-muted)", lineHeight: 1.4 }}>
        💡 <strong>Оптическая дальность:</strong> Ночью в ясную погоду белый импульс экрана или фонарика виден вертолёту и дронам с высоты до 3–5 км.
      </div>
    </div>
  </TacticalSecurityGate>
  );
}
