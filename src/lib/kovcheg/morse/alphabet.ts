import type { MorseLanguage } from "./types.ts";

export const LATIN_MORSE: Record<string, string> = {
  A: ".-",
  B: "-...",
  C: "-.-.",
  D: "-..",
  E: ".",
  F: "..-.",
  G: "--.",
  H: "....",
  I: "..",
  J: ".---",
  K: "-.-",
  L: ".-..",
  M: "--",
  N: "-.",
  O: "---",
  P: ".--.",
  Q: "--.-",
  R: ".-.",
  S: "...",
  T: "-",
  U: "..-",
  V: "...-",
  W: ".--",
  X: "-..-",
  Y: "-.--",
  Z: "--..",
};

export const CYRILLIC_MORSE: Record<string, string> = {
  А: ".-",
  Б: "-...",
  В: ".--",
  Г: "--.",
  Д: "-..",
  Е: ".",
  Ё: ".",
  Ж: "...-",
  З: "--..",
  И: "..",
  Й: ".---",
  К: "-.-",
  Л: ".-..",
  М: "--",
  Н: "-.",
  О: "---",
  П: ".--.",
  Р: ".-.",
  С: "...",
  Т: "-",
  У: "..-",
  Ф: "..-.",
  Х: "....",
  Ц: "-.-.",
  Ч: "---.",
  Ш: "----",
  Щ: "--.-",
  Ъ: "--.--",
  Ы: "-.--",
  Ь: "-..-",
  Э: "..-..",
  Ю: "..--",
  Я: ".-.-",
};

export const ARABIC_MORSE: Record<string, string> = {
  ا: ".-",
  أ: ".-",
  إ: ".-",
  آ: ".-",
  ب: "-...",
  ت: "-",
  ث: "-.-.",
  ج: ".---",
  ح: "....",
  خ: "---",
  د: "-..",
  ذ: "--..",
  ر: ".-.",
  ز: "---.",
  س: "...",
  ش: "----",
  ص: "--.-",
  ض: "..-..",
  ط: "..-",
  ظ: "--.--",
  ع: ".-.-",
  غ: "--.",
  ف: "..-.",
  ق: "--.-",
  ك: "-.-",
  ل: ".-..",
  م: "--",
  ن: "-.",
  ه: "..-..",
  ة: "..-..",
  و: ".--",
  ي: "..",
  ى: "..",
  ئ: "..",
  ء: ".-",
};

export const COMMON_DIGITS_PUNCTUATION: Record<string, string> = {
  "0": "-----",
  "1": ".----",
  "2": "..---",
  "3": "...--",
  "4": "....-",
  "5": ".....",
  "6": "-....",
  "7": "--...",
  "8": "---..",
  "9": "----.",
  ".": ".-.-.-",
  ",": "--..--",
  "?": "..--..",
  "!": "-.-.--",
  "/": "-..-.",
  "-": "-....-",
  ":": "---...",
};

// Build reverse lookup tables
function buildReverse(
  primary: Record<string, string>,
  fallback: Record<string, string> = {}
): Record<string, string> {
  const reverse: Record<string, string> = {};

  // 1. Primary alphabet first
  for (const [k, v] of Object.entries(primary)) {
    if (!reverse[v]) {
      reverse[v] = k;
    }
  }

  // 2. Digits & punctuation
  for (const [k, v] of Object.entries(COMMON_DIGITS_PUNCTUATION)) {
    if (!reverse[v]) {
      reverse[v] = k;
    }
  }

  // 3. Fallback
  for (const [k, v] of Object.entries(fallback)) {
    if (!reverse[v]) {
      reverse[v] = k;
    }
  }

  return reverse;
}

export const MORSE_TO_LATIN = buildReverse(LATIN_MORSE);
export const MORSE_TO_CYRILLIC = buildReverse(CYRILLIC_MORSE, LATIN_MORSE);
export const MORSE_TO_ARABIC = buildReverse(ARABIC_MORSE, LATIN_MORSE);

export function charToMorse(char: string, lang: MorseLanguage): string | null {
  const upper = char.toUpperCase();
  if (COMMON_DIGITS_PUNCTUATION[upper]) {
    return COMMON_DIGITS_PUNCTUATION[upper];
  }

  if (lang === "ru") {
    if (CYRILLIC_MORSE[upper]) return CYRILLIC_MORSE[upper];
    if (LATIN_MORSE[upper]) return LATIN_MORSE[upper];
  } else if (lang === "ar") {
    if (ARABIC_MORSE[upper]) return ARABIC_MORSE[upper];
    if (LATIN_MORSE[upper]) return LATIN_MORSE[upper];
  } else {
    if (LATIN_MORSE[upper]) return LATIN_MORSE[upper];
    if (CYRILLIC_MORSE[upper]) return CYRILLIC_MORSE[upper];
  }

  return null;
}

export function morseCodeToChar(code: string, lang: MorseLanguage): string {
  if (lang === "ru") {
    return MORSE_TO_CYRILLIC[code] || MORSE_TO_LATIN[code] || "?";
  } else if (lang === "ar") {
    return MORSE_TO_ARABIC[code] || MORSE_TO_LATIN[code] || "?";
  } else {
    return MORSE_TO_LATIN[code] || MORSE_TO_CYRILLIC[code] || "?";
  }
}

export function textToMorse(text: string, lang: MorseLanguage = "ru"): string {
  const words = text.trim().split(/\s+/);
  const encodedWords = words.map((word) => {
    const chars = Array.from(word);
    const codes = chars
      .map((c) => charToMorse(c, lang))
      .filter((c): c is string => c !== null);
    return codes.join(" ");
  });

  return encodedWords.join(" / ");
}

export function morseToText(morse: string, lang: MorseLanguage = "ru"): string {
  const cleanMorse = morse.replace(/[—–]/g, "-").replace(/[•·]/g, ".").trim();
  const words = cleanMorse.split(/\s*\/\s*|\s{3,}/);

  const decodedWords = words.map((word) => {
    const letters = word.trim().split(/\s+/);
    return letters.map((code) => morseCodeToChar(code, lang)).join("");
  });

  return decodedWords.join(" ");
}
