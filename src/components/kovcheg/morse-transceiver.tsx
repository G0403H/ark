import { useState, useEffect, useRef } from "react";
import {
  Zap,
  Volume2,
  VolumeX,
  Camera,
  Play,
  Square,
  Copy,
  Trash2,
  Sun,
  ZoomIn,
  ZoomOut,
  Sparkles,
} from "lucide-react";
import type { MorseLanguage } from "@/lib/kovcheg/morse/types";
import { textToMorse, morseToText } from "@/lib/kovcheg/morse/alphabet";
import { generateTimings } from "@/lib/kovcheg/morse/encoder";
import { OpticalPulseDecoder } from "@/lib/kovcheg/morse/decoder";

export function MorseTransceiver() {
  const [lang, setLang] = useState<MorseLanguage>("ru");
  const [tab, setTab] = useState<"tx" | "rx" | "key">("tx");

  // Transmitter state
  const [txText, setTxText] = useState("SOS");
  const [wpm, setWpm] = useState(12); // Words per minute
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [currentTxSymbol, setCurrentTxSymbol] = useState("");
  const [useTorch, setUseTorch] = useState(true);
  const [useSound, setUseSound] = useState(true);
  const [useScreenFlasher, setUseScreenFlasher] = useState(false);
  const [screenFlashActive, setScreenFlashActive] = useState(false);

  // Receiver (Camera with Zoom) state
  const [cameraActive, setCameraActive] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [maxZoom, setMaxZoom] = useState(5);
  const [lightLevel, setLightLevel] = useState(0);
  const [isLightDetected, setIsLightDetected] = useState(false);
  const [rxText, setRxText] = useState("");
  const [rxCurrentPulse, setRxCurrentPulse] = useState("");
  const [cameraError, setCameraError] = useState("");

  // Manual / Auto Key state
  const [keyMode, setKeyMode] = useState<"auto" | "manual">("auto");
  const [keyActive, setKeyActive] = useState(false);
  const [manualOutput, setManualOutput] = useState("");

  // Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pulseDecoderRef = useRef<OpticalPulseDecoder | null>(null);

  const unitMs = Math.round(1200 / wpm);

  // Initialize Audio
  function playTone(durationMs?: number) {
    if (typeof window === "undefined") return;
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
      osc.frequency.setValueAtTime(750, ctx.currentTime);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      if (durationMs) {
        osc.stop(ctx.currentTime + durationMs / 1000);
      }
      return () => {
        try {
          osc.stop();
        } catch {}
      };
    } catch {
      return () => {};
    }
  }

  // Flashlight Torch Toggle
  async function setTorchState(on: boolean) {
    if (!videoTrackRef.current) return;
    try {
      const capabilities = (videoTrackRef.current as any).getCapabilities?.();
      if (capabilities?.torch) {
        await (videoTrackRef.current as any).applyConstraints({
          advanced: [{ torch: on }],
        });
      }
    } catch {}
  }

  // Transmit Sequence
  async function startTransmission(customText?: string) {
    const textToSend = (typeof customText === "string" ? customText : txText).trim();
    if (!textToSend || isTransmitting) return;

    setIsTransmitting(true);
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Optional: get torch camera track if needed
    let tempStream: MediaStream | null = null;
    if (useTorch && typeof navigator !== "undefined" && navigator.mediaDevices) {
      try {
        tempStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        const track = tempStream.getVideoTracks()[0];
        videoTrackRef.current = track;
      } catch {}
    }

    const sequence = generateTimings(textToSend, lang, unitMs);

    try {
      for (const step of sequence) {
        if (signal.aborted) break;

        setCurrentTxSymbol(step.symbol || "");

        if (step.isOn) {
          setKeyActive(true);
          if (useScreenFlasher) setScreenFlashActive(true);
          if (useTorch) setTorchState(true);
          let stopAudio: (() => void) | undefined;
          if (useSound) stopAudio = playTone();

          await new Promise((r) => setTimeout(r, step.durationMs));

          setKeyActive(false);
          if (useScreenFlasher) setScreenFlashActive(false);
          if (useTorch) setTorchState(false);
          stopAudio?.();
        } else {
          setKeyActive(false);
          await new Promise((r) => setTimeout(r, step.durationMs));
        }
      }
    } finally {
      setIsTransmitting(false);
      setKeyActive(false);
      setCurrentTxSymbol("");
      setScreenFlashActive(false);
      setTorchState(false);
      if (tempStream) {
        tempStream.getTracks().forEach((t) => t.stop());
        videoTrackRef.current = null;
      }
    }
  }

  function stopTransmission() {
    abortControllerRef.current?.abort();
    setIsTransmitting(false);
    setKeyActive(false);
    setCurrentTxSymbol("");
    setScreenFlashActive(false);
    setTorchState(false);
  }

  function handleAutoKeyClick() {
    if (isTransmitting) {
      stopTransmission();
    } else {
      startTransmission(txText);
    }
  }

  // Optical Receiver (Camera + Zoom)
  useEffect(() => {
    if (tab !== "rx") {
      stopCamera();
      return;
    }

    startCamera();
    return () => {
      stopCamera();
    };
  }, [tab]);

  async function startCamera() {
    setCameraError("");
    setRxText("");
    pulseDecoderRef.current = new OpticalPulseDecoder(lang, unitMs, (fullText, current) => {
      setRxText(fullText);
      setRxCurrentPulse(current);
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const track = stream.getVideoTracks()[0];
      videoTrackRef.current = track;
      setCameraActive(true);

      // Check hardware zoom capability
      const cap: any = track.getCapabilities?.();
      if (cap?.zoom) {
        setMaxZoom(Math.min(10, cap.zoom.max || 5));
      }

      startLightDetectionLoop();
    } catch (err: any) {
      setCameraError(`Камера недоступна: ${err.message || "Отказ в доступе"}`);
      setCameraActive(false);
    }
  }

  function stopCamera() {
    if (videoTrackRef.current) {
      videoTrackRef.current.stop();
      videoTrackRef.current = null;
    }
    setCameraActive(false);
  }

  // Apply Camera Zoom (Hardware + CSS)
  async function handleZoomChange(val: number) {
    setZoomLevel(val);
    if (!videoTrackRef.current) return;

    try {
      const cap: any = videoTrackRef.current.getCapabilities?.();
      if (cap?.zoom) {
        await (videoTrackRef.current as any).applyConstraints({
          advanced: [{ zoom: val }],
        });
      }
    } catch {}
  }

  // Optical Light Pulse Analyzer Loop
  function startLightDetectionLoop() {
    let lastStateTime = Date.now();
    let isCurrentlyOn = false;
    let minLum = 255;
    let maxLum = 0;

    function processFrame() {
      if (!videoRef.current || !canvasRef.current || !videoTrackRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      if (ctx && video.readyState >= 2) {
        // Measure center 10% reticle area
        const w = 40;
        const h = 40;
        const sx = Math.max(0, (video.videoWidth - w) / 2);
        const sy = Math.max(0, (video.videoHeight - h) / 2);

        ctx.drawImage(video, sx, sy, w, h, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        let totalBrightness = 0;
        const pixelCount = data.length / 4;
        for (let i = 0; i < data.length; i += 4) {
          // Standard perceived luminance
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          totalBrightness += lum;
        }

        const avgBrightness = Math.round(totalBrightness / pixelCount);
        setLightLevel(avgBrightness);

        // Dynamic threshold adjustment
        minLum = Math.min(minLum, avgBrightness);
        maxLum = Math.max(maxLum, avgBrightness);
        const threshold = (minLum + maxLum) / 2 + 15;

        const isDetected = avgBrightness > threshold && maxLum - minLum > 20;
        setIsLightDetected(isDetected);

        const now = Date.now();
        if (isDetected !== isCurrentlyOn) {
          const duration = now - lastStateTime;
          pulseDecoderRef.current?.feedState(isCurrentlyOn, duration);
          isCurrentlyOn = isDetected;
          lastStateTime = now;
        }
      }

      if (videoTrackRef.current?.readyState === "live") {
        requestAnimationFrame(processFrame);
      }
    }

    requestAnimationFrame(processFrame);
  }

  // Manual Key Handler
  let keyPressStart = useRef(0);
  let stopKeyAudio = useRef<(() => void) | undefined>(undefined);

  function handleKeyDown() {
    setKeyActive(true);
    keyPressStart.current = Date.now();
    stopKeyAudio.current = playTone();
  }

  function handleKeyUp() {
    setKeyActive(false);
    stopKeyAudio.current?.();
    const duration = Date.now() - keyPressStart.current;
    const isDash = duration > 160;
    const symbol = isDash ? "-" : ".";
    setManualOutput((prev) => prev + symbol);
  }

  return (
    <main>
      {/* Screen Flasher Overlay (if selected) */}
      {screenFlashActive && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "#ffffff",
            zIndex: 99999,
          }}
        />
      )}

      {/* Header and Language Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <h1 className="screen-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Zap size={22} style={{ color: "var(--color-lamp)" }} />
            Оптический Телеграф Морзе
          </h1>
          <p className="meta" style={{ margin: "0.2rem 0 0" }}>
            Передача текста вспышкой, звуком и автоматическое считывание через камеру с зумом.
          </p>
        </div>

        {/* 3 Language Switcher */}
        <div className="filters" style={{ margin: 0 }}>
          <button
            type="button"
            className="chip"
            data-on={lang === "ru" ? "1" : "0"}
            onClick={() => setLang("ru")}
          >
            Русский (Кириллица)
          </button>
          <button
            type="button"
            className="chip"
            data-on={lang === "en" ? "1" : "0"}
            onClick={() => setLang("en")}
          >
            English (Latin)
          </button>
          <button
            type="button"
            className="chip"
            data-on={lang === "ar" ? "1" : "0"}
            onClick={() => setLang("ar")}
          >
            العربية (Arabic)
          </button>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="toggle tools" style={{ margin: "0.8rem 0" }}>
        <button
          type="button"
          className="text-btn"
          data-on={tab === "tx" ? "1" : "0"}
          onClick={() => setTab("tx")}
        >
          💡 Передатчик (Вспышка / Звук)
        </button>
        <button
          type="button"
          className="text-btn"
          data-on={tab === "rx" ? "1" : "0"}
          onClick={() => setTab("rx")}
        >
          📷 Приёмник (Камера с зумом)
        </button>
        <button
          type="button"
          className="text-btn"
          data-on={tab === "key" ? "1" : "0"}
          onClick={() => setTab("key")}
        >
          ⌨️ Телеграфный ключ (CW)
        </button>
      </div>

      {/* ================= TAB 1: TRANSMITTER ================= */}
      {tab === "tx" && (
        <section className="card-block">
          <label className="quiet" htmlFor="morse-tx-input">
            Текст для кодирования в Морзе ({lang.toUpperCase()}):
          </label>
          <input
            id="morse-tx-input"
            type="text"
            className="ask-field"
            value={txText}
            placeholder={
              lang === "ru"
                ? "Например: НУЖНА ПОМОЩЬ"
                : lang === "ar"
                ? "نجدة / ماء"
                : "e.g. NEED ASSISTANCE"
            }
            onChange={(e) => setTxText(e.target.value)}
            style={{ fontSize: "1.1rem", margin: "0.4rem 0" }}
          />

          {/* Quick preset chips */}
          <div className="tools" style={{ gap: "0.3rem", marginBottom: "0.8rem" }}>
            <button
              type="button"
              className="chip"
              onClick={() => setTxText("SOS")}
              style={{ color: "var(--color-alarm)", borderColor: "var(--color-alarm)" }}
            >
              🚨 SOS
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => setTxText(lang === "ru" ? "ВОДА" : lang === "ar" ? "ماء" : "WATER")}
            >
              {lang === "ru" ? "ВОДА" : lang === "ar" ? "ماء" : "WATER"}
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => setTxText(lang === "ru" ? "РАДИАЦИЯ" : lang === "ar" ? "إشعاع" : "RADIATION")}
            >
              {lang === "ru" ? "РАДИАЦИЯ" : lang === "ar" ? "إشعاع" : "RADIATION"}
            </button>
          </div>

          {/* Morse Code Translation Preview */}
          <div
            style={{
              padding: "0.6rem 0.8rem",
              background: "var(--color-bg)",
              border: "1px solid var(--color-line)",
              borderRadius: "4px",
              fontFamily: "monospace",
              fontSize: "1.2rem",
              letterSpacing: "0.15em",
              color: "var(--color-lamp)",
              wordBreak: "break-all",
              marginBottom: "0.8rem",
            }}
          >
            {textToMorse(txText, lang) || "···"}
          </div>

          {/* Transmission Options */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem", marginBottom: "1rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={useTorch}
                onChange={(e) => setUseTorch(e.target.checked)}
              />
              💡 Вспышка телефона (Фонарик)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={useSound}
                onChange={(e) => setUseSound(e.target.checked)}
              />
              🔊 Звуковой тон в рацию (750 Гц)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={useScreenFlasher}
                onChange={(e) => setUseScreenFlasher(e.target.checked)}
              />
              🔆 Экранный белый стробоскоп
            </label>
          </div>

          {/* Speed WPM */}
          <div style={{ marginBottom: "1rem" }}>
            <span className="meta">Скорость передачи: {wpm} WPM (~{unitMs} мс на точку)</span>
            <input
              type="range"
              min="5"
              max="24"
              value={wpm}
              onChange={(e) => setWpm(Number(e.target.value))}
              style={{ width: "100%", marginTop: "0.3rem" }}
            />
          </div>

          {/* Transmit Action Buttons */}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {isTransmitting ? (
              <button
                type="button"
                className="alarm-btn"
                onClick={stopTransmission}
                style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 1rem" }}
              >
                <Square size={16} /> ОСТАНОВИТЬ ПЕРЕДАЧУ
              </button>
            ) : (
              <button
                type="button"
                className="text-btn"
                onClick={() => startTransmission()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.4rem 1.2rem",
                  background: "var(--color-lamp)",
                  color: "#000",
                  fontWeight: 700,
                }}
              >
                <Play size={16} /> НАЧАТЬ ПЕРЕДАЧУ
              </button>
            )}

            {isTransmitting && (
              <span
                style={{
                  fontSize: "1.2rem",
                  fontFamily: "monospace",
                  fontWeight: 900,
                  color: "var(--color-lamp)",
                  marginLeft: "0.5rem",
                }}
              >
                Сигнал: {currentTxSymbol}
              </span>
            )}
          </div>
        </section>
      )}

      {/* ================= TAB 2: OPTICAL RECEIVER (CAMERA + ZOOM) ================= */}
      {tab === "rx" && (
        <section className="card-block">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <strong>Оптический приёмник через камеру:</strong>
            <span
              style={{
                fontSize: "0.8rem",
                color: isLightDetected ? "var(--color-calm)" : "var(--color-muted)",
                fontWeight: 700,
              }}
            >
              ● {isLightDetected ? "ВСПЫШКА ОБНАРУЖЕНА!" : "Поиск световых импульсов..."}
            </span>
          </div>

          {cameraError && (
            <p className="warn" style={{ margin: "0.4rem 0" }}>{cameraError}</p>
          )}

          {/* Camera Viewfinder with Tactical Reticle and Zoom */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "280px",
              background: "#000",
              borderRadius: "4px",
              overflow: "hidden",
              border: isLightDetected
                ? "2px solid var(--color-calm)"
                : "1px solid var(--color-line)",
              boxShadow: isLightDetected
                ? "0 0 15px rgba(34, 197, 94, 0.4)"
                : undefined,
            }}
          >
            <video
              ref={videoRef}
              playsInline
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `scale(${zoomLevel})`,
                transformOrigin: "center center",
                transition: "transform 0.1s ease",
              }}
            />
            {/* Hidden canvas for image data calculation */}
            <canvas ref={canvasRef} width="40" height="40" style={{ display: "none" }} />

            {/* Tactical Crosshair / Aiming Reticle */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "60px",
                height: "60px",
                border: "1.5px dashed var(--color-lamp)",
                borderRadius: "50%",
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: isLightDetected ? "var(--color-calm)" : "var(--color-alarm)",
                  boxShadow: isLightDetected ? "0 0 8px var(--color-calm)" : undefined,
                }}
              />
            </div>

            {/* Optical Light Sensor HUD Bar */}
            <div
              style={{
                position: "absolute",
                bottom: "8px",
                left: "8px",
                right: "8px",
                background: "rgba(0, 0, 0, 0.75)",
                padding: "0.3rem 0.6rem",
                borderRadius: "3px",
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.78rem",
                fontFamily: "monospace",
                color: "#fff",
              }}
            >
              <span>ЯРКОСТЬ В ПРИЦЕЛЕ: {lightLevel}</span>
              <span>ТЕКУЩИЙ ИМПУЛЬС: {rxCurrentPulse || "—"}</span>
              <span>ЗУМ: {zoomLevel}x</span>
            </div>
          </div>

          {/* Zoom Slider Controls */}
          <div style={{ margin: "0.8rem 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.2rem" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <ZoomIn size={14} /> Оптический / цифровой зум (наведите прицел на источник света):
              </span>
              <strong>{zoomLevel}x</strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ZoomOut size={16} />
              <input
                type="range"
                min="1"
                max={maxZoom}
                step="0.5"
                value={zoomLevel}
                onChange={(e) => handleZoomChange(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <ZoomIn size={16} />
            </div>
          </div>

          {/* Decoded Text Stream */}
          <div style={{ marginTop: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
              <strong>Расшифрованный текст ({lang.toUpperCase()}):</strong>
              <div style={{ display: "flex", gap: "0.3rem" }}>
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => {
                    pulseDecoderRef.current?.reset();
                    setRxText("");
                    setRxCurrentPulse("");
                  }}
                  style={{ minHeight: "1.8rem", padding: "0.1rem 0.5rem", fontSize: "0.78rem" }}
                >
                  <Trash2 size={13} style={{ marginRight: "3px" }} /> Очистить
                </button>
              </div>
            </div>

            <div
              style={{
                minHeight: "80px",
                padding: "0.6rem 0.8rem",
                background: "var(--color-bg)",
                border: "1px solid var(--color-line)",
                borderRadius: "4px",
                fontSize: "1.2rem",
                fontWeight: 700,
                color: "var(--color-calm)",
                fontFamily: "monospace",
                wordBreak: "break-all",
              }}
            >
              {rxText || "Направьте камеру в прицеле на мигающий светодиод/вспышку..."}
            </div>
          </div>
        </section>
      )}

      {/* ================= TAB 3: CW TELEGRAPH TRANSMITTER & KEY ================= */}
      {tab === "key" && (
        <section className="card-block">
          {/* Key Mode Toggle: Auto Error-Free vs Manual Tap */}
          <div className="row-between" style={{ alignItems: "center", marginBottom: "0.8rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <span style={{ fontWeight: "bold", fontSize: "0.95rem" }}>
              {lang === "ar"
                ? "وضع مفتاح التلغراف:"
                : lang === "en"
                ? "Telegraph Key Mode:"
                : "Режим телеграфного передатчика:"}
            </span>
            <div className="filters" style={{ margin: 0 }}>
              <button
                type="button"
                className="chip"
                data-on={keyMode === "auto" ? "1" : "0"}
                onClick={() => {
                  if (isTransmitting) stopTransmission();
                  setKeyMode("auto");
                }}
                style={{
                  fontWeight: keyMode === "auto" ? "bold" : "normal",
                  background: keyMode === "auto" ? "var(--color-lamp)" : "transparent",
                  color: keyMode === "auto" ? "#000" : "inherit",
                }}
              >
                ⚡ {lang === "ar" ? "بث تلقائي للنص (بدون أخطاء)" : lang === "en" ? "Auto Text Broadcast (Error-Free)" : "Авто-передача текста (без ошибок)"}
              </button>
              <button
                type="button"
                className="chip"
                data-on={keyMode === "manual" ? "1" : "0"}
                onClick={() => {
                  if (isTransmitting) stopTransmission();
                  setKeyMode("manual");
                }}
                style={{
                  fontWeight: keyMode === "manual" ? "bold" : "normal",
                  background: keyMode === "manual" ? "var(--color-lamp)" : "transparent",
                  color: keyMode === "manual" ? "#000" : "inherit",
                }}
              >
                👆 {lang === "ar" ? "نقر يدوي بالمفتاح" : lang === "en" ? "Manual Tapping Key" : "Ручная отбивка ключом"}
              </button>
            </div>
          </div>

          {/* AUTO TRANSMISSION MODE INTERFACE */}
          {keyMode === "auto" && (
            <div>
              <label className="quiet" htmlFor="morse-key-text-input">
                {lang === "ar"
                  ? `أدخل النص للبث التلقائي بدون أخطاء عبر زر المفتاح (${lang.toUpperCase()}):`
                  : lang === "en"
                  ? `Text for automated, error-free key transmission (${lang.toUpperCase()}):`
                  : `Текст для автоматической безошибочной передачи кнопкой «КЛЮЧ» (${lang.toUpperCase()}):`}
              </label>
              <input
                id="morse-key-text-input"
                type="text"
                className="ask-field"
                value={txText}
                placeholder={
                  lang === "ru"
                    ? "Например: SOS, НУЖНА ПОМОЩЬ, ВОДА, МИНЫ..."
                    : lang === "ar"
                    ? "مثلاً: نجدة / ماء / ألغام..."
                    : "e.g. SOS, NEED ASSISTANCE, MINES..."
                }
                onChange={(e) => setTxText(e.target.value)}
                style={{ fontSize: "1.1rem", margin: "0.4rem 0" }}
              />

              {/* Quick preset chips */}
              <div className="tools" style={{ gap: "0.3rem", marginBottom: "0.8rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="chip"
                  onClick={() => setTxText("SOS")}
                  style={{ color: "var(--color-alarm)", borderColor: "var(--color-alarm)", fontWeight: "bold" }}
                >
                  🚨 SOS
                </button>
                <button
                  type="button"
                  className="chip"
                  onClick={() => setTxText(lang === "ru" ? "ПОМОЩЬ" : lang === "ar" ? "نجدة" : "HELP")}
                >
                  🆘 {lang === "ru" ? "ПОМОЩЬ" : lang === "ar" ? "نجدة" : "HELP"}
                </button>
                <button
                  type="button"
                  className="chip"
                  onClick={() => setTxText(lang === "ru" ? "ВОДА" : lang === "ar" ? "ماء" : "WATER")}
                >
                  💧 {lang === "ru" ? "ВОДА" : lang === "ar" ? "ماء" : "WATER"}
                </button>
                <button
                  type="button"
                  className="chip"
                  onClick={() => setTxText(lang === "ru" ? "МИНЫ" : lang === "ar" ? "ألغام" : "MINES")}
                >
                  ⚠️ {lang === "ru" ? "МИНЫ" : lang === "ar" ? "ألغام" : "MINES"}
                </button>
                <button
                  type="button"
                  className="chip"
                  onClick={() => setTxText(lang === "ru" ? "ДРОН" : lang === "ar" ? "مسيرة" : "DRONE")}
                >
                  💥 {lang === "ru" ? "ДРОН" : lang === "ar" ? "مسيرة" : "DRONE"}
                </button>
                <button
                  type="button"
                  className="chip"
                  onClick={() => setTxText(lang === "ru" ? "РАДИАЦИЯ" : lang === "ar" ? "إشعاع" : "RADIATION")}
                >
                  ☢ {lang === "ru" ? "РАДИАЦИЯ" : lang === "ar" ? "إشعاع" : "RADIATION"}
                </button>
              </div>

              {/* Morse Code Live Preview */}
              <div
                style={{
                  padding: "0.6rem 0.8rem",
                  background: "var(--color-bg)",
                  border: "1px solid var(--color-line)",
                  borderRadius: "4px",
                  fontFamily: "monospace",
                  fontSize: "1.2rem",
                  letterSpacing: "0.15em",
                  color: "var(--color-lamp)",
                  wordBreak: "break-all",
                  marginBottom: "0.8rem",
                }}
              >
                {textToMorse(txText, lang) || "···"}
              </div>

              {/* Channels checkboxes */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem", marginBottom: "0.8rem", fontSize: "0.85rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={useSound}
                    onChange={(e) => setUseSound(e.target.checked)}
                  />
                  🔊 {lang === "ar" ? "نغمة صوتية (750 هرتز)" : lang === "en" ? "Audio Tone (750 Hz)" : "Звуковой тон в рацию (750 Гц)"}
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={useTorch}
                    onChange={(e) => setUseTorch(e.target.checked)}
                  />
                  💡 {lang === "ar" ? "فلاش الكاميرا" : lang === "en" ? "Camera Torch" : "Вспышка телефона (Фонарик)"}
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={useScreenFlasher}
                    onChange={(e) => setUseScreenFlasher(e.target.checked)}
                  />
                  🔆 {lang === "ar" ? "وميض الشاشة" : lang === "en" ? "Screen Strobe" : "Экранный белый стробоскоп"}
                </label>
              </div>

              {/* Speed WPM */}
              <div style={{ marginBottom: "1rem" }}>
                <span className="meta" style={{ fontSize: "0.8rem" }}>
                  {lang === "ar" ? "سرعة البث:" : lang === "en" ? "Speed:" : "Скорость передачи:"} {wpm} WPM (~{unitMs} {lang === "ru" ? "мс/точка" : "ms/dot"})
                </span>
                <input
                  type="range"
                  min="5"
                  max="24"
                  value={wpm}
                  onChange={(e) => setWpm(Number(e.target.value))}
                  style={{ width: "100%", marginTop: "0.2rem" }}
                />
              </div>

              {/* Centered Telegraph Key Button in Auto Mode */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "1.2rem 0" }}>
                <button
                  type="button"
                  onClick={handleAutoKeyClick}
                  style={{
                    width: "140px",
                    height: "140px",
                    borderRadius: "50%",
                    background: keyActive || isTransmitting
                      ? (keyActive ? "var(--color-lamp)" : "rgba(234, 179, 8, 0.25)")
                      : "var(--color-raise)",
                    border: isTransmitting
                      ? "3px solid var(--color-lamp)"
                      : "3px solid var(--color-lamp)",
                    color: keyActive ? "#000" : (isTransmitting ? "var(--color-lamp)" : "var(--color-fg)"),
                    fontSize: "1.1rem",
                    fontWeight: 900,
                    cursor: "pointer",
                    boxShadow: keyActive
                      ? "0 0 35px var(--color-lamp)"
                      : (isTransmitting ? "0 0 15px rgba(234, 179, 8, 0.4)" : "inset 0 0 10px rgba(0,0,0,0.5)"),
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    userSelect: "none",
                    transition: "all 0.08s ease-in-out",
                  }}
                >
                  <Zap size={32} style={{ marginBottom: 4 }} />
                  <span>{isTransmitting ? (lang === "ar" ? "إيقاف" : lang === "en" ? "STOP" : "СТОП") : (lang === "ar" ? "مفتاح" : lang === "en" ? "KEY" : "КЛЮЧ")}</span>
                  <span style={{ fontSize: "0.65rem", fontWeight: "normal", opacity: 0.85, marginTop: 2 }}>
                    {isTransmitting
                      ? (lang === "ar" ? "جاري البث..." : lang === "en" ? "Transmitting..." : "Передача...")
                      : (lang === "ar" ? "اضغط للبث" : lang === "en" ? "Tap to transmit" : "Авто-передача")}
                  </span>
                </button>

                {/* Real-time transmission status */}
                {isTransmitting && (
                  <div
                    style={{
                      marginTop: "1rem",
                      padding: "0.4rem 1rem",
                      background: "rgba(234, 179, 8, 0.15)",
                      border: "1px solid var(--color-lamp)",
                      borderRadius: "var(--radius-card)",
                      textAlign: "center",
                    }}
                  >
                    <span style={{ fontSize: "1.2rem", fontFamily: "monospace", fontWeight: 900, color: "var(--color-lamp)" }}>
                      {lang === "ar" ? "الرمز الجاري:" : lang === "en" ? "Current Symbol:" : "Текущий символ:"} {currentTxSymbol || "···"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MANUAL TAPPING MODE INTERFACE */}
          {keyMode === "manual" && (
            <div>
              <p className="meta" style={{ marginBottom: "0.8rem" }}>
                {lang === "ar"
                  ? "اضغط مع الاستمرار للنقر اليدوي: نقرة قصيرة = نقطة، نقرة طويلة = شرطة."
                  : lang === "en"
                  ? "Hold button to tap manually: short tap = dot, hold = dash."
                  : "Удерживайте кнопку для ручной набивки: короткое нажатие — точка, долгое — тире."}
              </p>

              <div style={{ display: "flex", justifyContent: "center", margin: "1.5rem 0" }}>
                <button
                  type="button"
                  onMouseDown={handleKeyDown}
                  onMouseUp={handleKeyUp}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleKeyDown();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleKeyUp();
                  }}
                  style={{
                    width: "130px",
                    height: "130px",
                    borderRadius: "50%",
                    background: keyActive ? "var(--color-lamp)" : "var(--color-raise)",
                    border: "3px solid var(--color-lamp)",
                    color: keyActive ? "#000" : "var(--color-fg)",
                    fontSize: "1rem",
                    fontWeight: 900,
                    cursor: "pointer",
                    boxShadow: keyActive ? "0 0 25px var(--color-lamp)" : "inset 0 0 10px rgba(0,0,0,0.5)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    userSelect: "none",
                    touchAction: "none",
                  }}
                >
                  <Zap size={28} />
                  <span>{lang === "ar" ? "مفتاح يدوي" : lang === "en" ? "MANUAL KEY" : "РУЧНОЙ КЛЮЧ"}</span>
                </button>
              </div>

              <div
                style={{
                  padding: "0.6rem 0.8rem",
                  background: "var(--color-bg)",
                  border: "1px solid var(--color-line)",
                  borderRadius: "4px",
                  fontFamily: "monospace",
                  fontSize: "1.2rem",
                  minHeight: "45px",
                  wordBreak: "break-all",
                }}
              >
                {manualOutput || (lang === "ar" ? "انقر على المفتاح للبدء..." : lang === "en" ? "Tap key to start..." : "Нажимайте ключ для отбивки...")}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.6rem" }}>
                <span className="meta">
                  {lang === "ar" ? "الترجمة:" : lang === "en" ? "Decoded:" : "Расшифровка:"}{" "}
                  <strong>{morseToText(manualOutput, lang)}</strong>
                </span>
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => setManualOutput("")}
                  style={{ minHeight: "1.8rem", padding: "0.1rem 0.5rem", fontSize: "0.8rem" }}
                >
                  {lang === "ar" ? "مسح" : lang === "en" ? "Clear" : "Очистить"}
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
