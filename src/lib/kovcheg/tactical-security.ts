import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useBitChatStore } from "./bitchat/store.ts";

export type TacticalSecurityState = {
  // Is security system enabled with a master passcode
  isEnabled: boolean;
  // Salt and SHA-256 hash of the master passcode / passphrase
  passcodeHash: string | null;
  passcodeSalt: string | null;

  // Duress / Panic code hash (used under coercion/threat to trigger silent wipe)
  duressHash: string | null;
  duressSalt: string | null;

  // Session state: whether tactical features are currently unlocked
  // Note: we do not persist `isUnlocked` to storage so closing the app or reloading relocks
  isUnlocked: boolean;
  unlockedAt: number | null;
  autoLockMinutes: number; // e.g. 15 minutes of inactivity

  // Failed attempts tracking
  failedAttempts: number;
  lastFailedAt: number | null;

  // Actions
  setupPasscode: (masterCode: string, duressCode?: string) => Promise<void>;
  removeProtection: (masterCode: string) => Promise<boolean>;
  unlock: (inputCode: string) => Promise<{ success: boolean; isDuress: boolean; error?: string }>;
  lock: () => void;
  checkAutoLock: () => void;
  setAutoLockMinutes: (min: number) => void;
  triggerPanicWipe: () => void;
};

// Cryptographic hash helper using Web Crypto API SHA-256 with salt
export async function hashPasscode(code: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${code.trim()}:kovcheg-tactical`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  const arr = Array.from(new Uint8Array(buf));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateRandomSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Global hook to register custom panic wipe callbacks (e.g. from GPS peer store)
const panicCallbacks = new Set<() => void>();

export function registerPanicCallback(cb: () => void): () => void {
  panicCallbacks.add(cb);
  return () => {
    panicCallbacks.delete(cb);
  };
}

export const useTacticalSecurity = create<TacticalSecurityState>()(
  persist(
    (set, get) => ({
      isEnabled: false,
      passcodeHash: null,
      passcodeSalt: null,
      duressHash: null,
      duressSalt: null,
      isUnlocked: false,
      unlockedAt: null,
      autoLockMinutes: 15,
      failedAttempts: 0,
      lastFailedAt: null,

      setupPasscode: async (masterCode: string, duressCode?: string) => {
        const cleanMaster = masterCode.trim();
        if (!cleanMaster) throw new Error("Кодовое слово не может быть пустым");

        const masterSalt = generateRandomSalt();
        const masterHash = await hashPasscode(cleanMaster, masterSalt);

        let duressHash: string | null = null;
        let duressSalt: string | null = null;

        const cleanDuress = duressCode?.trim();
        if (cleanDuress) {
          if (cleanDuress === cleanMaster) {
            throw new Error("Код принуждения должен отличаться от мастер-кода");
          }
          duressSalt = generateRandomSalt();
          duressHash = await hashPasscode(cleanDuress, duressSalt);
        }

        set({
          isEnabled: true,
          passcodeHash: masterHash,
          passcodeSalt: masterSalt,
          duressHash,
          duressSalt,
          isUnlocked: true,
          unlockedAt: Date.now(),
          failedAttempts: 0,
        });
      },

      removeProtection: async (masterCode: string) => {
        const state = get();
        if (!state.isEnabled || !state.passcodeHash || !state.passcodeSalt) {
          set({ isEnabled: false, passcodeHash: null, passcodeSalt: null, isUnlocked: true });
          return true;
        }

        const inputHash = await hashPasscode(masterCode.trim(), state.passcodeSalt);
        if (inputHash === state.passcodeHash) {
          set({
            isEnabled: false,
            passcodeHash: null,
            passcodeSalt: null,
            duressHash: null,
            duressSalt: null,
            isUnlocked: true,
            failedAttempts: 0,
          });
          return true;
        }

        set((s) => ({
          failedAttempts: s.failedAttempts + 1,
          lastFailedAt: Date.now(),
        }));
        return false;
      },

      unlock: async (inputCode: string) => {
        const state = get();
        const clean = inputCode.trim();

        if (!state.isEnabled || !state.passcodeHash || !state.passcodeSalt) {
          set({ isUnlocked: true, unlockedAt: Date.now() });
          return { success: true, isDuress: false };
        }

        // 1. Check Duress / Panic Code first
        if (state.duressHash && state.duressSalt) {
          const inputDuressHash = await hashPasscode(clean, state.duressSalt);
          if (inputDuressHash === state.duressHash) {
            // DUERESS TRIGGERED!
            // Wipe radio logs, identity, coordinates, peers, and lock with dummy state
            get().triggerPanicWipe();
            return {
              success: false,
              isDuress: true,
              error: "АВАРИЙНЫЙ СБРОС: Все тактические данные и координаты уничтожены.",
            };
          }
        }

        // 2. Check Master Passcode
        const inputMasterHash = await hashPasscode(clean, state.passcodeSalt);
        if (inputMasterHash === state.passcodeHash) {
          set({
            isUnlocked: true,
            unlockedAt: Date.now(),
            failedAttempts: 0,
          });
          return { success: true, isDuress: false };
        }

        // Failed attempt
        set((s) => ({
          failedAttempts: s.failedAttempts + 1,
          lastFailedAt: Date.now(),
          isUnlocked: false,
        }));

        return {
          success: false,
          isDuress: false,
          error: "Неверное кодовое слово. Доступ запрещен.",
        };
      },

      lock: () => {
        set({ isUnlocked: false, unlockedAt: null });
      },

      checkAutoLock: () => {
        const { isUnlocked, unlockedAt, autoLockMinutes, isEnabled } = get();
        if (isEnabled && isUnlocked && unlockedAt) {
          const elapsed = (Date.now() - unlockedAt) / (1000 * 60);
          if (elapsed >= autoLockMinutes) {
            set({ isUnlocked: false, unlockedAt: null });
          }
        }
      },

      setAutoLockMinutes: (min: number) => {
        set({ autoLockMinutes: Math.max(1, min) });
      },

      triggerPanicWipe: () => {
        // 1. Wipe BitChat messages and reset identity keys
        try {
          useBitChatStore.getState().panicWipe();
        } catch (e) {
          console.error("Panic wipe BitChat failed:", e);
        }

        // 2. Notify all registered listeners (GPS peer tracker, etc.)
        panicCallbacks.forEach((cb) => {
          try {
            cb();
          } catch (e) {
            console.error("Panic callback error:", e);
          }
        });

        // 3. Relock and clear unlock session
        set({
          isUnlocked: false,
          unlockedAt: null,
          failedAttempts: 0,
        });
      },
    }),
    {
      name: "kovcheg-tactical-security-v1",
      partialize: (state) => ({
        isEnabled: state.isEnabled,
        passcodeHash: state.passcodeHash,
        passcodeSalt: state.passcodeSalt,
        duressHash: state.duressHash,
        duressSalt: state.duressSalt,
        autoLockMinutes: state.autoLockMinutes,
        failedAttempts: state.failedAttempts,
      }),
    }
  )
);
