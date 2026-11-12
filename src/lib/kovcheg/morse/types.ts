export type MorseLanguage = "ru" | "en" | "ar";

export type MorseUnit = "dot" | "dash" | "space" | "wordSpace";

export type MorseTimingSequence = {
  isOn: boolean;
  durationMs: number;
  symbol?: string; // which letter is being transmitted
};

export type MorseDecodeState = {
  rawPulses: ("." | "-")[];
  currentLetter: string;
  decodedText: string;
  confidence: number;
};
