import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { useBitChatStore } from "./store.ts";

describe("BitChat Store & State", () => {
  test("initializes with default identity and channels", () => {
    const state = useBitChatStore.getState();
    assert.ok(state.identity);
    assert.ok(state.identity.npub.startsWith("npub1"));
    assert.ok(state.channels.length >= 4);
    assert.equal(state.activeChannel, "general");
  });

  test("can change callsign and active channel", () => {
    useBitChatStore.getState().setCallsign("Шквал-99");
    assert.equal(useBitChatStore.getState().identity.callsign, "Шквал-99");

    useBitChatStore.getState().setActiveChannel("medical");
    assert.equal(useBitChatStore.getState().activeChannel, "medical");
  });

  test("joinChannel adds new channel if not exists", () => {
    useBitChatStore.getState().joinChannel("shelter-4");
    assert.equal(useBitChatStore.getState().activeChannel, "shelter-4");
    const found = useBitChatStore.getState().channels.some((c) => c.id === "shelter-4");
    assert.equal(found, true);
  });

  test("panicWipe clears all messages and regenerates a fresh blank identity", () => {
    const oldPubkey = useBitChatStore.getState().identity.pubkey;
    useBitChatStore.getState().addMessage({
      id: "test-1",
      senderPubkey: "test",
      callsign: "Тест",
      channel: "general",
      text: "Секретные данные",
      timestamp: Date.now(),
      transport: "local",
      hops: 0,
    });

    assert.ok(useBitChatStore.getState().messages.length > 0);

    useBitChatStore.getState().panicWipe();

    assert.equal(useBitChatStore.getState().messages.length, 0);
    assert.notEqual(useBitChatStore.getState().identity.pubkey, oldPubkey);
  });
});
