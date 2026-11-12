import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  useTacticalSecurity,
  hashPasscode,
  generateRandomSalt,
  registerPanicCallback,
} from "./tactical-security.ts";

describe("Tactical Security Module", () => {
  beforeEach(() => {
    // Reset state before each test
    useTacticalSecurity.setState({
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
    });
  });

  test("should hash passcode with salt using SHA-256", async () => {
    const salt = generateRandomSalt();
    const hash1 = await hashPasscode("ВЫМПЕЛ-44", salt);
    const hash2 = await hashPasscode("ВЫМПЕЛ-44", salt);
    const hash3 = await hashPasscode("ДРУГОЙ-КОД", salt);

    assert.equal(hash1, hash2);
    assert.notEqual(hash1, hash3);
    assert.equal(hash1.length, 64); // SHA-256 hex string
  });

  test("should setup master passcode and remain unlocked", async () => {
    await useTacticalSecurity.getState().setupPasscode("МАРС-77");

    const state = useTacticalSecurity.getState();
    assert.equal(state.isEnabled, true);
    assert.equal(state.isUnlocked, true);
    assert.ok(state.passcodeHash);
    assert.ok(state.passcodeSalt);
  });

  test("should lock and unlock only with valid master passcode", async () => {
    await useTacticalSecurity.getState().setupPasscode("СЕКРЕТ-12");
    useTacticalSecurity.getState().lock();

    assert.equal(useTacticalSecurity.getState().isUnlocked, false);

    // Invalid passcode attempt
    const resFail = await useTacticalSecurity.getState().unlock("НЕВЕРНЫЙ");
    assert.equal(resFail.success, false);
    assert.equal(resFail.isDuress, false);
    assert.equal(useTacticalSecurity.getState().isUnlocked, false);
    assert.equal(useTacticalSecurity.getState().failedAttempts, 1);

    // Valid passcode attempt
    const resOk = await useTacticalSecurity.getState().unlock("СЕКРЕТ-12");
    assert.equal(resOk.success, true);
    assert.equal(resOk.isDuress, false);
    assert.equal(useTacticalSecurity.getState().isUnlocked, true);
    assert.equal(useTacticalSecurity.getState().failedAttempts, 0);
  });

  test("should trigger panic wipe when duress code is entered", async () => {
    let panicCalled = false;
    const unregister = registerPanicCallback(() => {
      panicCalled = true;
    });

    await useTacticalSecurity.getState().setupPasscode("ВЛАДЕЛЕЦ", "ДУРЕСС-911");
    useTacticalSecurity.getState().lock();

    // Entering duress code under coercion
    const result = await useTacticalSecurity.getState().unlock("ДУРЕСС-911");

    assert.equal(result.success, false);
    assert.equal(result.isDuress, true);
    assert.equal(panicCalled, true);
    assert.equal(useTacticalSecurity.getState().isUnlocked, false);

    unregister();
  });

  test("should enforce auto-lock after elapsed timeout", () => {
    useTacticalSecurity.setState({
      isEnabled: true,
      isUnlocked: true,
      unlockedAt: Date.now() - 20 * 60 * 1000, // 20 mins ago
      autoLockMinutes: 15,
    });

    useTacticalSecurity.getState().checkAutoLock();
    assert.equal(useTacticalSecurity.getState().isUnlocked, false);
  });
});
