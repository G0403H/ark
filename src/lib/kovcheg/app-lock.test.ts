import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { useAppLockStore } from "./app-lock.ts";

describe("App Lock Module (Master Entry Password)", () => {
  beforeEach(() => {
    useAppLockStore.setState({
      isAppLockEnabled: false,
      passwordHash: null,
      passwordSalt: null,
      isAppUnlocked: false,
      unlockedAt: null,
      failedAttempts: 0,
      lastFailedAt: null,
    });
  });

  test("should enforce minimum password length", async () => {
    await assert.rejects(
      async () => {
        await useAppLockStore.getState().setAppPassword("123");
      },
      { message: "Пароль должен содержать не менее 4 символов" }
    );
  });

  test("should setup master application password and unlock session", async () => {
    await useAppLockStore.getState().setAppPassword("AlphaPass2026");

    const state = useAppLockStore.getState();
    assert.equal(state.isAppLockEnabled, true);
    assert.equal(state.isAppUnlocked, true);
    assert.ok(state.passwordHash);
    assert.ok(state.passwordSalt);
    assert.equal(state.passwordHash.length, 64);
  });

  test("should reject wrong entry password and increment failed attempts", async () => {
    await useAppLockStore.getState().setAppPassword("CorrectMaster");
    useAppLockStore.getState().lockApp();

    assert.equal(useAppLockStore.getState().isAppUnlocked, false);

    // Wrong password
    const failRes = await useAppLockStore.getState().unlockApp("WrongPassword");
    assert.equal(failRes.success, false);
    assert.equal(useAppLockStore.getState().isAppUnlocked, false);
    assert.equal(useAppLockStore.getState().failedAttempts, 1);

    // Correct password
    const successRes = await useAppLockStore.getState().unlockApp("CorrectMaster");
    assert.equal(successRes.success, true);
    assert.equal(useAppLockStore.getState().isAppUnlocked, true);
    assert.equal(useAppLockStore.getState().failedAttempts, 0);
  });

  test("should allow changing password with correct existing password", async () => {
    await useAppLockStore.getState().setAppPassword("OldPassword1");

    // Fail change with wrong old password
    const failChange = await useAppLockStore.getState().changeAppPassword("WrongOld", "NewPassword2");
    assert.equal(failChange, false);

    // Success change with right old password
    const okChange = await useAppLockStore.getState().changeAppPassword("OldPassword1", "NewPassword2");
    assert.equal(okChange, true);

    useAppLockStore.getState().lockApp();

    // Verify new password unlocks
    const res = await useAppLockStore.getState().unlockApp("NewPassword2");
    assert.equal(res.success, true);
  });

  test("should allow removing app password", async () => {
    await useAppLockStore.getState().setAppPassword("ToDeletePass");

    const removed = await useAppLockStore.getState().removeAppPassword("ToDeletePass");
    assert.equal(removed, true);
    assert.equal(useAppLockStore.getState().isAppLockEnabled, false);
    assert.equal(useAppLockStore.getState().passwordHash, null);
  });

  test("should toggle emergency 3x power button SOS setting", () => {
    assert.equal(useAppLockStore.getState().emergencyPowerButtonSosEnabled, true);

    useAppLockStore.getState().setEmergencyPowerButtonSosEnabled(false);
    assert.equal(useAppLockStore.getState().emergencyPowerButtonSosEnabled, false);

    useAppLockStore.getState().setEmergencyPowerButtonSosEnabled(true);
    assert.equal(useAppLockStore.getState().emergencyPowerButtonSosEnabled, true);
  });
});
