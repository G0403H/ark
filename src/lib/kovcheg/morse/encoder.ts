import type { MorseLanguage, MorseTimingSequence } from "./types.ts";
import { textToMorse } from "./alphabet.ts";

export const DEFAULT_UNIT_MS = 120; // ~10 WPM (words per minute)

export function generateTimings(
  text: string,
  lang: MorseLanguage = "ru",
  unitMs: number = DEFAULT_UNIT_MS
): MorseTimingSequence[] {
  const morse = textToMorse(text, lang);
  const sequence: MorseTimingSequence[] = [];

  const words = morse.split(" / ");
  words.forEach((word, wordIdx) => {
    const letters = word.trim().split(/\s+/);
    letters.forEach((letter, letterIdx) => {
      const symbols = Array.from(letter);
      symbols.forEach((sym, symIdx) => {
        if (sym === ".") {
          sequence.push({ isOn: true, durationMs: unitMs, symbol: "." });
        } else if (sym === "-") {
          sequence.push({ isOn: true, durationMs: unitMs * 3, symbol: "-" });
        }

        // Intra-character space (between dots and dashes of the same letter): 1 unit OFF
        if (symIdx < symbols.length - 1) {
          sequence.push({ isOn: false, durationMs: unitMs });
        }
      });

      // Inter-character space (between letters in the same word): 3 units OFF
      if (letterIdx < letters.length - 1) {
        sequence.push({ isOn: false, durationMs: unitMs * 3 });
      }
    });

    // Word space (between words): 7 units OFF
    if (wordIdx < words.length - 1) {
      sequence.push({ isOn: false, durationMs: unitMs * 7 });
    }
  });

  return sequence;
}
