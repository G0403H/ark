import { useEffect } from "react";
import { useAppLockStore } from "./app-lock.ts";
import { useGpsPeerStore } from "./gps-peer-tracker.ts";

// Threshold: 3 presses / visibility toggles within 2500ms
const CLICK_WINDOW_MS = 2500;
const REQUIRED_PRESSES = 3;

let powerEventsTimestamps: number[] = [];
let isDetectorAttached = false;

export function handleHardwarePowerEvent(): boolean {
  const isEnabled = useAppLockStore.getState().emergencyPowerButtonSosEnabled;
  if (!isEnabled) return false;

  const now = Date.now();
  // Filter timestamps within the detection window
  powerEventsTimestamps = powerEventsTimestamps.filter(
    (t) => now - t <= CLICK_WINDOW_MS
  );
  powerEventsTimestamps.push(now);

  if (powerEventsTimestamps.length >= REQUIRED_PRESSES) {
    powerEventsTimestamps = []; // Reset
    console.warn("🚨 [КОВЧЕГ] Аппаратное тройное нажатие кнопки питания! Активация экстренного SOS!");

    try {
      useGpsPeerStore.getState().triggerEmergencyHardwareSos();
    } catch (e) {
      console.error("Failed to trigger emergency hardware SOS:", e);
    }
    return true;
  }

  return false;
}

export function setupHardwareSosGlobalListeners(): () => void {
  if (typeof window === "undefined" || isDetectorAttached) {
    return () => {};
  }
  isDetectorAttached = true;

  // 1. Physical Screen Power On/Off detection (Android & iOS trigger visibility changes on Power button press)
  const onVisibilityChange = () => {
    // When power button is pressed, screen turns off (hidden), next press turns screen on (visible)
    if (document.visibilityState === "visible") {
      handleHardwarePowerEvent();
    }
  };

  // 2. Physical Keydown detection for devices supporting Hardware Power / Sleep / Emergency keys
  const onKeyDown = (e: KeyboardEvent) => {
    const key = e.key?.toLowerCase() || "";
    if (
      key === "power" ||
      key === "sleep" ||
      key === "f12" || // developer / test hardware key fallback
      e.code === "Power" ||
      e.code === "Sleep"
    ) {
      handleHardwarePowerEvent();
    }
  };

  document.addEventListener("visibilitychange", onVisibilityChange, { passive: true });
  window.addEventListener("keydown", onKeyDown, { passive: true });

  return () => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("keydown", onKeyDown);
    isDetectorAttached = false;
  };
}

// React hook for mounting inside top-level Frame
export function useHardwareSosDetector() {
  useEffect(() => {
    const cleanup = setupHardwareSosGlobalListeners();
    return cleanup;
  }, []);
}
