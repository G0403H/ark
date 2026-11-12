# Tactical Security & Privacy Guide

**KOVCHEG** is built on a "zero-trust local device" model. In hostile environments, checkpoints, or emergency confiscation scenarios, protecting sensitive user data (medical history, pregnancy tracking, GPS locations, and radio notes) is critical to personal safety.

---

## 1. Master Application Lock

- **Purpose**: Full-screen gate preventing unauthorized physical inspection of the app.
- **Implementation**: `src/lib/kovcheg/app-lock.ts` and `src/components/kovcheg/app-lock-screen.tsx`.
- **Key Features**:
  - Minimum password length enforcement (configurable).
  - Rate-limited brute force protection with exponential backoff.
  - Quick lock shortcut in the navigation drawer.
  - Zero server transmission: credentials never leave device memory.

---

## 2. Tactical Passcode & Duress Code (Panic Wipe)

- **Purpose**: Protect sensitive military, tactical defense, and personal notes under duress.
- **Implementation**: `src/lib/kovcheg/tactical-security.ts`.
- **Cryptographic Storage**:
  - Passcodes are hashed with unique salts using **SHA-256**.
  - Salt is generated via `crypto.getRandomValues(new Uint8Array(16))`.
  - Stored in persistent local storage (`kovcheg-tactical-security-v1`).
- **Emergency Duress Trigger**:
  - The user can configure a secondary "Duress Code".
  - If forced to unlock the device under threat, entering the duress code unlocks the interface normally while **silently wiping all sensitive data in the background**:
    - Purges private notes and saved bookmarks.
    - Clears menstrual cycle and pregnancy logs.
    - Erases GPS friend tracking history and radio contacts.
    - Locks tactical defense sections behind default blank state.

---

## 3. Hardware 3x Power Button SOS Beacon

- **Purpose**: Covertly broadcast distress signal and GPS coordinates without looking at the screen.
- **Implementation**: `src/lib/kovcheg/hardware-sos-detector.ts`.
- **How it Works**:
  - Monitors window blur / visibility state changes triggered by the device's physical Power / Lock button.
  - Detects **3 consecutive power button presses within 2.5 seconds**.
  - Automatically acquires current GPS coordinates via `navigator.geolocation`.
  - Transmits a high-priority SOS emergency packet to all paired peer nodes on the BitChat mesh channel.
  - Can be enabled or disabled in the Settings menu.

---

## 4. Friend Peer Authentication ("Friend-or-Foe" Code Word)

- **Purpose**: Prevent location leakage if a companion's phone is captured.
- **Implementation**: `src/components/kovcheg/gps-friend-finder.tsx`.
- **Features**:
  - Mutual pairing required before GPS coordinates are exchanged.
  - Optional session code word: your phone will suppress sending your exact coordinates to a friend until they provide the agreed verification phrase.
