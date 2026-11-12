import { create } from "zustand";
import { persist } from "zustand/middleware";
import { hashPasscode, generateRandomSalt } from "./tactical-security.ts";

export type AppLockState = {
  // Whether master password for entering the entire application is set
  isAppLockEnabled: boolean;
  passwordHash: string | null;
  passwordSalt: string | null;

  // Session state (not persisted - relocks on app reload / tab close)
  isAppUnlocked: boolean;
  unlockedAt: number | null;
  failedAttempts: number;
  lastFailedAt: number | null;

  // Emergency SOS trigger via triple Power Button / Screen toggle press
  emergencyPowerButtonSosEnabled: boolean;

  // Actions
  setAppPassword: (newPassword: string) => Promise<void>;
  removeAppPassword: (currentPassword: string) => Promise<boolean>;
  changeAppPassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  unlockApp: (password: string) => Promise<{ success: boolean; error?: string }>;
  lockApp: () => void;
  resetEntireApp: () => void;
  setEmergencyPowerButtonSosEnabled: (enabled: boolean) => void;
};

export const APP_LOCK_WARNING =
  "ВНИМАНИЕ! КОВЧЕГ — полностью автономный локальный архив без серверов и облаков. " +
  "В случае утери пароля входа или кодового слова восстановить их НЕВОЗМОЖНО (нет отправки на почту или SMS). " +
  "Сбросить забытый пароль можно ТОЛЬКО полной очисткой данных / переустановкой приложения.";

export const useAppLockStore = create<AppLockState>()(
  persist(
    (set, get) => ({
      isAppLockEnabled: false,
      passwordHash: null,
      passwordSalt: null,
      isAppUnlocked: false,
      unlockedAt: null,
      failedAttempts: 0,
      lastFailedAt: null,
      emergencyPowerButtonSosEnabled: true,

      setAppPassword: async (newPassword: string) => {
        const clean = newPassword.trim();
        if (!clean) throw new Error("Пароль не может быть пустым");
        if (clean.length < 4) throw new Error("Пароль должен содержать не менее 4 символов");

        const salt = generateRandomSalt();
        const hash = await hashPasscode(clean, salt);

        set({
          isAppLockEnabled: true,
          passwordHash: hash,
          passwordSalt: salt,
          isAppUnlocked: true,
          unlockedAt: Date.now(),
          failedAttempts: 0,
        });
      },

      removeAppPassword: async (currentPassword: string) => {
        const { isAppLockEnabled, passwordHash, passwordSalt } = get();
        if (!isAppLockEnabled || !passwordHash || !passwordSalt) {
          set({ isAppLockEnabled: false, passwordHash: null, passwordSalt: null, isAppUnlocked: true });
          return true;
        }

        const inputHash = await hashPasscode(currentPassword.trim(), passwordSalt);
        if (inputHash === passwordHash) {
          set({
            isAppLockEnabled: false,
            passwordHash: null,
            passwordSalt: null,
            isAppUnlocked: true,
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

      changeAppPassword: async (oldPassword: string, newPassword: string) => {
        const ok = await get().removeAppPassword(oldPassword);
        if (!ok) return false;
        await get().setAppPassword(newPassword);
        return true;
      },

      unlockApp: async (password: string) => {
        const { isAppLockEnabled, passwordHash, passwordSalt } = get();
        const clean = password.trim();

        if (!isAppLockEnabled || !passwordHash || !passwordSalt) {
          set({ isAppUnlocked: true, unlockedAt: Date.now() });
          return { success: true };
        }

        const inputHash = await hashPasscode(clean, passwordSalt);
        if (inputHash === passwordHash) {
          set({
            isAppUnlocked: true,
            unlockedAt: Date.now(),
            failedAttempts: 0,
          });
          return { success: true };
        }

        set((s) => ({
          failedAttempts: s.failedAttempts + 1,
          lastFailedAt: Date.now(),
          isAppUnlocked: false,
        }));

        return {
          success: false,
          error: "Неверный пароль входа в приложение.",
        };
      },

      lockApp: () => {
        set({ isAppUnlocked: false, unlockedAt: null });
      },

      resetEntireApp: () => {
        // Complete data purge (equivalent to reinstalling the application)
        try {
          if (typeof window !== "undefined") {
            window.localStorage.clear();
            window.sessionStorage.clear();
            window.location.reload();
          }
        } catch (e) {
          console.error("Failed to reset application data:", e);
        }
      },

      setEmergencyPowerButtonSosEnabled: (enabled: boolean) => {
        set({ emergencyPowerButtonSosEnabled: enabled });
      },
    }),
    {
      name: "kovcheg-app-lock-v1",
      partialize: (state) => ({
        isAppLockEnabled: state.isAppLockEnabled,
        passwordHash: state.passwordHash,
        passwordSalt: state.passwordSalt,
        failedAttempts: state.failedAttempts,
        emergencyPowerButtonSosEnabled: state.emergencyPowerButtonSosEnabled,
      }),
    }
  )
);
