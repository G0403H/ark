import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { OpticalPulseDecoder } from "./decoder.ts";

describe("Optical Morse Pulse Decoder", () => {
  test("decodes pulse sequences into letters and words", () => {
    let resultText = "";
    const decoder = new OpticalPulseDecoder("ru", 100, (text) => {
      resultText = text;
    });

    // Simulate S: . . .
    // Dot 1 (100ms ON)
    decoder.feedState(true, 100);
    decoder.feedState(false, 100);
    // Dot 2 (100ms ON)
    decoder.feedState(true, 100);
    decoder.feedState(false, 100);
    // Dot 3 (100ms ON)
    decoder.feedState(true, 100);
    // Inter-letter pause (300ms OFF)
    decoder.feedState(false, 350);

    assert.equal(resultText, "С");

    // Simulate O: - - -
    decoder.feedState(true, 300);
    decoder.feedState(false, 100);
    decoder.feedState(true, 300);
    decoder.feedState(false, 100);
    decoder.feedState(true, 300);
    decoder.feedState(false, 350);

    assert.equal(resultText, "СО");
  });
});
