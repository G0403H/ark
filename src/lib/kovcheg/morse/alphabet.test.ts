import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { textToMorse, morseToText } from "./alphabet.ts";

describe("Morse Code Multi-language Alphabet", () => {
  test("encodes and decodes Russian Cyrillic Morse", () => {
    const text = "КОВЧЕГ МАЯК";
    const morse = textToMorse(text, "ru");
    // К: -.-  О: ---  В: .--  Ч: ---.  Е: .  Г: --.
    assert.ok(morse.includes("-.- --- .-- ---. . --."));
    const decoded = morseToText(morse, "ru");
    assert.equal(decoded, "КОВЧЕГ МАЯК");
  });

  test("encodes and decodes English Latin Morse", () => {
    const text = "SOS WATER";
    const morse = textToMorse(text, "en");
    assert.equal(morse, "... --- ... / .-- .- - . .-.");
    const decoded = morseToText(morse, "en");
    assert.equal(decoded, "SOS WATER");
  });

  test("encodes and decodes Arabic Morse", () => {
    const text = "ماء"; // Water
    const morse = textToMorse(text, "ar");
    assert.ok(morse.length > 0);
    const decoded = morseToText(morse, "ar");
    assert.ok(decoded.includes("م"));
  });

  test("encodes numbers and punctuation", () => {
    const text = "144.500";
    const morse = textToMorse(text, "en");
    assert.ok(morse.includes(".---- ....- ....-"));
    const decoded = morseToText(morse, "en");
    assert.equal(decoded, "144.500");
  });
});
