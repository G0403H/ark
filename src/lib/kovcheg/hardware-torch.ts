/**
 * Universal Hardware Torch Controller for KOVCHEG
 * Supports:
 * 1. Native Android WebView Bridge (window.KovchegNative.setTorch) via CameraManager.setTorchMode
 * 2. Standard Web ImageCapture / MediaStreamTrack applyConstraints({ advanced: [{ torch: true }] })
 */

let activeVideoTrack: MediaStreamTrack | null = null;
let activeMediaStream: MediaStream | null = null;
let isTorchCurrentlyOn = false;

/**
 * Check if the current device/runtime can control a hardware flashlight/torch
 */
export function isHardwareTorchSupported(): boolean {
  if (typeof window === "undefined") return false;

  // 1. Native Android APK bridge
  if (typeof (window as any).KovchegNative?.setTorch === "function") {
    return true;
  }

  // 2. Web mediaDevices
  return Boolean(navigator?.mediaDevices?.getUserMedia);
}

/**
 * Initialize / Pre-warm the torch hardware track so that subsequent pulses
 * toggle with zero latency (crucial for fast Morse dots ~60-100ms)
 */
export async function initHardwareTorch(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  // If running inside Android APK native bridge, no MediaStream pre-warm needed
  if (typeof (window as any).KovchegNative?.setTorch === "function") {
    return true;
  }

  if (activeVideoTrack && activeVideoTrack.readyState === "live") {
    return true;
  }

  if (!navigator?.mediaDevices?.getUserMedia) {
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
      },
    });

    const track = stream.getVideoTracks()[0];
    if (!track) return false;

    activeMediaStream = stream;
    activeVideoTrack = track;
    return true;
  } catch (err) {
    console.warn("Could not pre-warm Web torch stream:", err);
    return false;
  }
}

/**
 * Turn flashlight torch ON or OFF
 */
export async function setHardwareTorch(on: boolean): Promise<boolean> {
  if (typeof window === "undefined") return false;
  isTorchCurrentlyOn = on;

  // 1. Native Android Bridge (fastest, zero camera preview lock, works in WebView)
  const nativeBridge = (window as any).KovchegNative;
  if (nativeBridge && typeof nativeBridge.setTorch === "function") {
    try {
      return Boolean(nativeBridge.setTorch(on));
    } catch (e) {
      console.warn("Native torch error:", e);
    }
  }

  // 2. Standard WebRTC Camera Track applyConstraints
  if (!activeVideoTrack || activeVideoTrack.readyState !== "live") {
    if (on) {
      const initialized = await initHardwareTorch();
      if (!initialized || !activeVideoTrack) return false;
    } else {
      return false;
    }
  }

  try {
    await (activeVideoTrack as any).applyConstraints({
      advanced: [{ torch: on }],
    });
    return true;
  } catch (err) {
    // Some browsers require re-aquiring or don't support torch constraint
    return false;
  }
}

/**
 * Release camera stream when done
 */
export function releaseHardwareTorch() {
  isTorchCurrentlyOn = false;

  // Turn off native torch
  if (typeof (window as any).KovchegNative?.setTorch === "function") {
    try {
      (window as any).KovchegNative.setTorch(false);
    } catch {}
  }

  // Stop web camera track
  if (activeVideoTrack) {
    try {
      (activeVideoTrack as any).applyConstraints?.({
        advanced: [{ torch: false }],
      }).catch(() => {});
      activeVideoTrack.stop();
    } catch {}
    activeVideoTrack = null;
  }

  if (activeMediaStream) {
    try {
      activeMediaStream.getTracks().forEach((t) => t.stop());
    } catch {}
    activeMediaStream = null;
  }
}
