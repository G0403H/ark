import { useMemo } from "react";
import { BASE_ARTICLES } from "./corpus";
import { indexArticles, type Indexed } from "./search";
import { useArk, type IngestedDoc, type UserNote } from "./store";
import { BASE_PACK, USER_CARDS_PACK, USER_NOTES_PACK, type Article } from "./types";

export function documentsToArticles(docs: IngestedDoc[]): Article[] {
  return docs.map((d) => ({
    id: `doc-${d.id}`,
    title: d.name,
    shelf: "bumaga",
    kind: "guide" as const,
    lead: (d.textExcerpt || d.name).slice(0, 220),
    keywords: [d.name, d.type],
    sourceType: `импортированный документ (${d.type.toUpperCase()})`,
    license: "локальный файл пользователя",
    attribution: "Загружено с вашего устройства. Сохранено в локальной памяти.",
    packId: "user-notes",
    sensitive: null,
    sections: [
      {
        id: `doc-${d.id}--0`,
        title: "Содержание документа",
        body: (d.fullText || d.textExcerpt || "").slice(0, 25000),
      },
    ],
  }));
}

export function notesToArticles(notes: UserNote[]): Article[] {
  return notes.map((n) => ({
    id: `note-${n.id}`,
    title: n.title.trim() || "Заметка без названия",
    shelf: "bumaga",
    kind: "guide" as const,
    lead: n.body.trim().slice(0, 220) || "Пустая заметка",
    keywords: [n.title],
    sourceType: n.pack === USER_CARDS_PACK ? "своя карточка из помощника" : "своя заметка",
    license: "ваша запись, только на этом устройстве",
    attribution: "Импортировано вами. С устройства никуда не отправляется.",
    packId: n.pack,
    sensitive: null,
    sections: [
      { id: `note-${n.id}--0`, title: "Когда это нужно", body: "Ваша запись в локальном архиве." },
      { id: `note-${n.id}--1`, title: "Признак", body: n.title || "Без названия" },
      {
        id: `note-${n.id}--2`,
        title: "Шаги",
        body: n.body.split(/\n+/).map((x) => x.trim()).filter(Boolean),
      },
      {
        id: `note-${n.id}--3`,
        title: "Ошибки",
        body: "Своя заметка не заменяет красные карточки по крови, йоду, грибам и пыли.",
      },
      {
        id: `note-${n.id}--4`,
        title: "Не делать",
        body: "Не считайте запись дозой, определителем растения или измерением радиации.",
      },
      {
        id: `note-${n.id}--5`,
        title: "Дальше",
        body: "Сверьте с корпусом КОВЧЕГ, если речь о теле, воде или пыли.",
      },
    ],
  }));
}

export function useCorpus(): { articles: Article[]; index: Indexed[] } {
  const notes = useArk((s) => s.notes);
  const documents = useArk((s) => s.documents) ?? [];
  const articles = useMemo(
    () => [...BASE_ARTICLES, ...notesToArticles(notes), ...documentsToArticles(documents)],
    [notes, documents],
  );
  const index = useMemo(() => indexArticles(articles), [articles]);
  return { articles, index };
}

export function findArticle(articles: Article[], id: string): Article | undefined {
  return articles.find((a) => a.id === id);
}

export function parseImport(filename: string, text: string): { title: string; body: string }[] {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  if (!trimmed) return [];
  let title = filename.replace(/\.(md|txt|markdown)$/i, "") || "Заметка";
  let body = trimmed;
  const fm = trimmed.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (fm) {
    const found = fm[1].match(/^title:\s*(.+)$/m);
    if (found) title = found[1].trim().replace(/^["']|["']$/g, "");
    body = fm[2].trim();
  }
  const chunks = body
    .split(/\n(?=# )/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (chunks.length <= 1) return [{ title, body }];
  return chunks.map((chunk, i) => {
    const lines = chunk.split("\n");
    const head = lines[0].replace(/^#+\s*/, "").trim();
    const rest = lines.slice(1).join("\n").trim();
    return { title: head || `${title} ${i + 1}`, body: rest || head };
  });
}

export function corpusBytes(articles: Article[]): number {
  return new TextEncoder().encode(JSON.stringify(articles)).length;
}

export async function fingerprint(articles: Article[]): Promise<string> {
  const data = new TextEncoder().encode(
    articles
      .map((a) => a.id + "\n" + a.title)
      .sort()
      .join("\n"),
  );
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const ZIM_CATALOG = [
  {
    id: "wiki-ru",
    title: "Википедия на русском",
    note: "Официальный ZIM Kiwix, много гигабайт. В КОВЧЕГ не вшит и с ru.wikipedia.org не скачивается.",
  },
  {
    id: "wikisource-ru",
    title: "Викитека",
    note: "Отдельная официальная загрузка, не часть этого корпуса.",
  },
  {
    id: "wiktionary-ru",
    title: "Викисловарь",
    note: "Отдельная официальная загрузка.",
  },
  {
    id: "wikibooks-ru",
    title: "Викиучебник",
    note: "Отдельная официальная загрузка.",
  },
  {
    id: "wikimed",
    title: "WikiMed",
    note: "Медицинский ZIM с атрибуцией. Читалка ZIM в этой версии не включена.",
  },
] as const;

export const MODEL_CATALOG = [
  {
    id: "qwen3-0.6b",
    title: "Qwen3-0.6B",
    params: "0,6 млрд параметров",
    file: "GGUF Q4_K_M, около 0,5 ГБ. Квантование не уменьшает число параметров.",
    license: "Apache-2.0",
    href: "https://huggingface.co/Qwen/Qwen3-0.6B",
    note: "Основная модель телефонной сборки. Веса в приложение не вшиты. В браузере не запускается.",
  },
  {
    id: "qwen25-0.5b",
    title: "Qwen2.5-0.5B-Instruct",
    params: "0,5 млрд параметров",
    file: "GGUF того же класса, не больше 1 млрд.",
    license: "Apache-2.0",
    href: "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct",
    note: "Запасной вариант того же класса, если основной файл недоступен.",
  },
] as const;

export const PACKS = {
  base: BASE_PACK,
  notes: USER_NOTES_PACK,
  cards: USER_CARDS_PACK,
};
