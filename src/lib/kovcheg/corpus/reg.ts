import { card } from "../card";
import type { ShelfId } from "../shelves";
import type { Article, Kind, Sensitive } from "../types";

export function reg(p: {
  id: string;
  shelf: ShelfId;
  title: string;
  lead: string;
  keys: string[];
  when: string;
  sign: string;
  steps: string[];
  err: string;
  dont: string;
  next: string;
  sensitive?: Sensitive;
  kind?: Kind;
}): Article {
  return card({
    id: p.id,
    title: p.title,
    shelf: p.shelf,
    kind: p.kind,
    lead: p.lead,
    keys: p.keys,
    sensitive: p.sensitive,
    sections: [
      ["Когда это нужно", p.when],
      ["Признак", p.sign],
      ["Шаги", p.steps],
      ["Ошибки", p.err],
      ["Не делать", p.dont],
      ["Дальше", p.next],
    ],
  });
}
