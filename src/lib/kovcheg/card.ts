import type { ShelfId } from "./shelves";
import type { Language } from "./i18n";
import { BASE_PACK, type Article, type FigureId, type Kind, type Sensitive } from "./types";

export function card(p: {
  id: string;
  title: string;
  shelf: ShelfId;
  kind?: Kind;
  lead: string;
  keys: string[];
  sensitive?: Sensitive;
  lang?: Language;
  figure?: FigureId;
  figureCaption?: string;
  sections: Array<[string, string | string[]]>;
}): Article {
  return {
    id: p.id,
    title: p.title,
    shelf: p.shelf,
    kind: p.kind ?? "guide",
    lead: p.lead,
    keywords: p.keys,
    sourceType: BASE_PACK.sourceType,
    license: BASE_PACK.license,
    attribution: BASE_PACK.attribution,
    packId: BASE_PACK.id,
    sensitive: p.sensitive ?? null,
    lang: p.lang ?? "ru",
    figure: p.figure,
    figureCaption: p.figureCaption,
    sections: p.sections.map(([title, body], i) => ({
      id: `${p.id}--${i}`,
      title,
      body,
    })),
  };
}
