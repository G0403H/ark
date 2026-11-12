import type { ShelfId } from "./shelves";
import type { Language } from "./i18n";

export type { Language };

export type Kind = "guide" | "alarm" | "nuclear";
export type Sensitive = "med" | "nuclear" | null;

export type FigureId =
  | "pulse"
  | "pressure"
  | "side"
  | "layers"
  | "basement"
  | "chest"
  | "abdomen"
  | "spine"
  | "skull"
  | "femoral"
  | "tick"
  | "fire-types"
  | "water-filter"
  | "solar-still"
  | "knots-guide"
  | "shelter-lean-to"
  | "bread-stove"
  | "stars-navigation"
  | "breathe-square"
  | "trap-figure4"
  | "shelter-debris"
  | "fire-dakota"
  | "aid-splint"
  | "plant-test"
  | "radiation-shielding"
  | "drone-evasion"
  | "booby-trap-danger"
  | "trench-netting";

export type Section = {
  id: string;
  title: string;
  body: string | string[];
};

export type Article = {
  id: string;
  title: string;
  shelf: ShelfId;
  kind: Kind;
  lead: string;
  keywords: string[];
  sourceType: string;
  license: string;
  attribution: string;
  packId: string;
  sensitive: Sensitive;
  lang?: Language;
  figure?: FigureId;
  figureCaption?: string;
  sections: Section[];
};

export const FIGURE_LICENSE =
  "Схема КОВЧЕГ, собственный рисунок. Можно копировать с указанием: КОВЧЕГ.";

export const BASE_PACK = {
  id: "kovcheg-base",
  title: "Корпус КОВЧЕГ",
  version: "1.3.0",
  language: "multi",
  license: "собственный текст КОВЧЕГ",
  attribution:
    "Написано для архива заново, короткими шагами на основе открытых руководств первой помощи, МЧС, Красного Креста и полевого выживания.",
  updated: "2026-11-12",
  minApp: "1.0.0",
  sourceType: "сводка открытых руководств гражданской обороны / первой помощи / бушкрафта",
} as const;

export const USER_NOTES_PACK = "user-notes";
export const USER_CARDS_PACK = "user-cards";
