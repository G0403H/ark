import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  createBitChatMessage,
  relayBitChatMessage,
  createSosBeacon,
  MAX_HOPS,
} from "./protocol.ts";
import { generateIdentity } from "./identity.ts";

describe("BitChat Protocol & Multi-Hop Relaying", () => {
  const alice = generateIdentity("Алиса-1");

  test("createBitChatMessage produces valid message", () => {
    const msg = createBitChatMessage(alice, "general", "Всем привет в эфире");
    assert.ok(msg.id);
    assert.equal(msg.callsign, "Алиса-1");
    assert.equal(msg.channel, "general");
    assert.equal(msg.text, "Всем привет в эфире");
    assert.equal(msg.hops, 0);
    assert.equal(msg.transport, "mesh");
  });

  test("relayBitChatMessage increments hops up to MAX_HOPS and drops expired", () => {
    const msg = createBitChatMessage(alice, "general", "Тест реле");
    let current = msg;
    for (let i = 1; i <= MAX_HOPS; i++) {
      const forwarded = relayBitChatMessage(current);
      assert.ok(forwarded);
      assert.equal(forwarded.hops, i);
      current = forwarded;
    }

    // Next hop should be dropped
    const dropped = relayBitChatMessage(current);
    assert.equal(dropped, null);
  });

  test("createSosBeacon sets emergency flag and sos channel", () => {
    const sos = createSosBeacon(alice, { lat: 55.75, lon: 37.61 }, "Нужна перевязка");
    assert.equal(sos.isEmergency, true);
    assert.equal(sos.channel, "sos");
    assert.ok(sos.text.includes("55.75, 37.61"));
    assert.ok(sos.text.includes("Нужна перевязка"));
  });
});
