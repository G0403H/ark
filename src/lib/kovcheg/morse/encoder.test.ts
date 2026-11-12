import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { generateTimings } from "./encoder.ts";

describe("Morse Timing Generator", () => {
  test("generates correct pulse timings for SOS", () => {
    // S: ...  O: ---  S: ...
    const timings = generateTimings("SOS", "en", 100);
    assert.ok(timings.length > 0);

    const onPulses = timings.filter((t) => t.isOn);
    // S (3 dots) + O (3 dashes) + S (3 dots) = 9 ON pulses
    assert.equal(onPulses.length, 9);

    // Dots should have duration 100ms
    assert.equal(onPulses[0].durationMs, 100);
    // O dashes should have duration 300ms
    assert.equal(onPulses[3].durationMs, 300);
  });
});
