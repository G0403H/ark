import type { MorseLanguage } from "./types.ts";
import { morseCodeToChar } from "./alphabet.ts";

export type DecodeCallback = (decodedText: string, currentPulse: string) => void;

export class OpticalPulseDecoder {
  private lang: MorseLanguage;
  private unitMs: number;
  private onUpdate: DecodeCallback;

  private accumulatedSymbols: ("." | "-")[] = [];
  private fullText = "";

  constructor(
    lang: MorseLanguage = "ru",
    unitMs = 120,
    onUpdate: DecodeCallback
  ) {
    this.lang = lang;
    this.unitMs = unitMs;
    this.onUpdate = onUpdate;
  }

  public setLanguage(lang: MorseLanguage) {
    this.lang = lang;
  }

  public setUnitMs(unitMs: number) {
    this.unitMs = unitMs;
  }

  public reset() {
    this.accumulatedSymbols = [];
    this.fullText = "";
    this.onUpdate("", "");
  }

  public feedState(isOn: boolean, durationMs: number) {
    if (isOn) {
      // Light is ON: classify as dot or dash
      const isDash = durationMs >= this.unitMs * 2;
      const symbol: "." | "-" = isDash ? "-" : ".";
      this.accumulatedSymbols.push(symbol);
      this.onUpdate(this.fullText, this.accumulatedSymbols.join(""));
    } else {
      // Light is OFF: check for letter boundary or word boundary
      if (durationMs >= this.unitMs * 2.2 && durationMs < this.unitMs * 5.5) {
        // Letter finished
        this.finishLetter();
      } else if (durationMs >= this.unitMs * 5.5) {
        // Word space finished
        this.finishLetter();
        if (this.fullText && !this.fullText.endsWith(" ")) {
          this.fullText += " ";
          this.onUpdate(this.fullText, "");
        }
      }
    }
  }

  public finishLetter() {
    if (this.accumulatedSymbols.length === 0) return;

    const code = this.accumulatedSymbols.join("");
    const char = morseCodeToChar(code, this.lang);
    if (char && char !== "?") {
      this.fullText += char;
    }
    this.accumulatedSymbols = [];
    this.onUpdate(this.fullText, "");
  }

  public getDecodedText(): string {
    return this.fullText;
  }
}
