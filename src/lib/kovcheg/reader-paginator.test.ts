import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  extractCleanText,
  indexDocumentChapters,
  paginateChapter,
  calculateGlobalPage,
  analyzeChapterText,
} from "./reader-paginator.ts";

describe("Reader Paginator & Chapter Architecture", () => {
  test("extracts clean readable text from HTML encyclopedia with text-content container", () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><style>body { color: red; }</style></head>
        <body>
          <header><h1>Ignore Header</h1></header>
          <div class="text-content">
            # Добыча воды
            Вода необходима для выживания человека.
            <br>
            Кипячение убивает бактерии.
          </div>
        </body>
      </html>
    `;
    const clean = extractCleanText(html, "html");
    assert.ok(clean.includes("# Добыча воды"));
    assert.ok(clean.includes("Кипячение убивает бактерии"));
    assert.ok(!clean.includes("body { color: red; }"));
    assert.ok(!clean.includes("<div"));
  });

  test("indexes document chapters swiftly and identifies headings", () => {
    const bookText = `
# Введение
Общие сведения о выживании и безопасности.

============================================================

# Глава 1: Добыча и фильтрация воды
Вода — основа выживания в любых условиях.
Текст раздела о воде.

============================================================

# Глава 2: Тактическая медицина MARCH
Остановка кровотечений с помощью турникета.
    `;

    const chapters = indexDocumentChapters(bookText);
    assert.ok(chapters.length >= 3);
    assert.ok(chapters.some((c) => c.title.includes("Добыча и фильтрация воды")));
    assert.ok(chapters.some((c) => c.title.includes("Тактическая медицина MARCH")));
    assert.ok(chapters.every((c) => c.estimatedPages >= 1));
  });

  test("partitions massive document with no headings into virtual chapters", () => {
    // Generate 60,000 characters without headings
    const bigText = "Параграф текста о выживании в бункере и лесу.\n\n".repeat(1500);
    assert.ok(bigText.length > 50000);

    const chapters = indexDocumentChapters(bigText);
    assert.ok(chapters.length >= 2);
    assert.ok(chapters[0].title.includes("Часть 1"));
    assert.ok(chapters[1].title.includes("Часть 2"));
  });

  test("paginates single chapter into pages with boundary respect", () => {
    const chapterText = `
Параграф 1: Важная информация о фильтрации.

Параграф 2: Использование активированного угля.

Параграф 3: Дополнительные методы стерилизации воды.
    `.trim();

    const pages = paginateChapter(chapterText, 80);
    assert.ok(pages.length >= 2);
    assert.ok(pages[0].includes("Параграф 1"));
  });

  test("calculates global page accurately across chapters", () => {
    const mockChapters = [
      { id: "1", index: 0, title: "Ch 1", charStart: 0, charEnd: 100, charCount: 100, estimatedPages: 5 },
      { id: "2", index: 1, title: "Ch 2", charStart: 100, charEnd: 200, charCount: 100, estimatedPages: 8 },
      { id: "3", index: 2, title: "Ch 3", charStart: 200, charEnd: 300, charCount: 100, estimatedPages: 10 },
    ];

    // Chapter 2 (index 1), page 3
    const progress = calculateGlobalPage(mockChapters, 1, 3);
    // Prior pages from Ch 1 = 5, plus page 3 = 8
    assert.equal(progress.currentGlobalPage, 8);
    assert.equal(progress.totalGlobalPages, 23);
  });

  test("analyzes chapter text for key points and warnings safely", () => {
    const chapterText = `
# Остановка кровотечений
При артериальном кровотечении счет идет на секунды.
1. Наложить жгут турникет выше раны на 5-7 см.
2. Зафиксировать время наложения жгута на лбу или полоске.
Внимание: запрещено накладывать жгут на суставы и оставлять более чем на 1 час на морозе!
    `;

    const analysis = analyzeChapterText(chapterText, "ru");
    assert.ok(analysis.keyPoints.length > 0);
    assert.ok(analysis.actionSteps.length > 0);
    assert.ok(analysis.warnings.length > 0);
    assert.ok(analysis.warnings.some((w) => w.includes("жгут") || w.includes("суставы")));
  });
});
