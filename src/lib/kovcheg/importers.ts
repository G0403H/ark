import type { IngestedDoc, UserNote } from "./store";

/**
 * Extract readable text from raw PDF streams without requiring a massive external runtime.
 * Parses PDF text objects between `BT` and `ET` operators.
 */
export function extractTextFromPdfBinary(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = "";
  // Decode ASCII/Latin1 representation to inspect PDF stream tokens
  const chunk = 32768;
  for (let i = 0; i < bytes.length; i += chunk) {
    str += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }

  const textPieces: string[] = [];
  // Match Tj and TJ text operators inside BT ... ET blocks
  const btEtRegex = /BT[\s\S]*?ET/g;
  let match;
  while ((match = btEtRegex.exec(str)) !== null) {
    const block = match[0];
    // Find string literals (...) Tj
    const tjRegex = /\(([\s\S]*?)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      const decoded = tjMatch[1]
        .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
        .replace(/\\(.)/g, "$1");
      if (decoded.trim()) textPieces.push(decoded.trim());
    }
    // Find array literals [...] TJ
    const tjArrRegex = /\[([\s\S]*?)\]\s*TJ/g;
    let tjArrMatch;
    while ((tjArrMatch = tjArrRegex.exec(block)) !== null) {
      const inner = tjArrMatch[1];
      const partRegex = /\(([\s\S]*?)\)/g;
      let partMatch;
      let piece = "";
      while ((partMatch = partRegex.exec(inner)) !== null) {
        piece += partMatch[1]
          .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
          .replace(/\\(.)/g, "$1");
      }
      if (piece.trim()) textPieces.push(piece.trim());
    }
  }

  const result = textPieces.join(" ").replace(/\s+/g, " ").trim();
  return result;
}

/**
 * Parse an uploaded file (PDF, EPUB, HTML, TXT, MD, JSONL) into a structured IngestedDoc.
 */
export async function parseUploadedFile(file: File): Promise<{
  doc: IngestedDoc;
  notes?: { title: string; body: string }[];
}> {
  const id = crypto.randomUUID();
  const name = file.name;
  const size = file.size;
  const lower = name.toLowerCase();

  // 1. PDF
  if (lower.endsWith(".pdf")) {
    const arrayBuffer = await file.arrayBuffer();
    const extracted = extractTextFromPdfBinary(arrayBuffer);
    const blob = new Blob([arrayBuffer], { type: "application/pdf" });
    const dataUrl = URL.createObjectURL(blob);
    const textExcerpt = extracted.slice(0, 300) || "PDF документ (сохранен для автономного просмотра)";

    return {
      doc: {
        id,
        name,
        size,
        type: "pdf",
        created: Date.now(),
        textExcerpt,
        fullText: extracted,
        dataUrl,
      },
    };
  }

  // 2. HTML
  if (lower.endsWith(".html") || lower.endsWith(".htm")) {
    const html = await file.text();
    let title = name.replace(/\.html?$/i, "");
    let bodyText = "";

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      // Remove scripts, styles, iframes
      doc.querySelectorAll("script, style, iframe, noscript").forEach((el) => el.remove());
      const docTitle = doc.querySelector("title")?.textContent?.trim();
      const firstH1 = doc.querySelector("h1")?.textContent?.trim();
      if (firstH1) title = firstH1;
      else if (docTitle) title = docTitle;
      bodyText = doc.body?.textContent?.replace(/\s+/g, " ").trim() || "";
    } catch {
      bodyText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }

    const blob = new Blob([html], { type: "text/html" });
    const dataUrl = URL.createObjectURL(blob);

    return {
      doc: {
        id,
        name,
        size,
        type: "html",
        created: Date.now(),
        textExcerpt: bodyText.slice(0, 300),
        fullText: bodyText,
        dataUrl,
      },
      notes: [{ title, body: bodyText.slice(0, 10000) }],
    };
  }

  // 3. EPUB
  if (lower.endsWith(".epub")) {
    const arrayBuffer = await file.arrayBuffer();
    // EPUB is a zip. Extract XML/XHTML text tokens from the binary stream
    const bytes = new Uint8Array(arrayBuffer);
    let str = "";
    const chunk = 32768;
    for (let i = 0; i < Math.min(bytes.length, 1024 * 1024); i += chunk) {
      str += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
    }
    // Clean extracted readable strings
    const words = str
      .replace(/<[^>]+>/g, " ")
      .replace(/[^a-zA-Zа-яА-Я0-9\s.,!?-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const blob = new Blob([arrayBuffer], { type: "application/epub+zip" });
    const dataUrl = URL.createObjectURL(blob);

    return {
      doc: {
        id,
        name,
        size,
        type: "epub",
        created: Date.now(),
        textExcerpt: words.slice(0, 300) || "Электронная книга EPUB",
        fullText: words,
        dataUrl,
      },
    };
  }

  // 4. JSON / JSONL Data Packs
  if (lower.endsWith(".jsonl") || lower.endsWith(".json")) {
    const text = await file.text();
    const notes: { title: string; body: string }[] = [];
    try {
      if (lower.endsWith(".jsonl")) {
        const lines = text.split("\n");
        for (const line of lines) {
          if (!line.trim()) continue;
          const parsed = JSON.parse(line);
          if (parsed.title && parsed.body) {
            notes.push({ title: String(parsed.title), body: String(parsed.body) });
          }
        }
      } else {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item.title && item.body) {
              notes.push({ title: String(item.title), body: String(item.body) });
            }
          }
        } else if (parsed.title && parsed.body) {
          notes.push({ title: String(parsed.title), body: String(parsed.body) });
        }
      }
    } catch {}

    return {
      doc: {
        id,
        name,
        size,
        type: "pack",
        created: Date.now(),
        textExcerpt: `Пакет данных: ${notes.length} записей импортировано`,
        fullText: notes.map((n) => `${n.title}\n${n.body}`).join("\n\n"),
      },
      notes,
    };
  }

  // 5. TXT / Markdown (default)
  const text = await file.text();
  const clean = text.replace(/^\uFEFF/, "").trim();
  const lines = clean.split("\n");
  const firstLine = lines[0]?.replace(/^#+\s*/, "").trim() || name.replace(/\.(txt|md)$/i, "");

  return {
    doc: {
      id,
      name,
      size,
      type: lower.endsWith(".md") ? "md" : "txt",
      created: Date.now(),
      textExcerpt: clean.slice(0, 300),
      fullText: clean,
    },
    notes: [{ title: firstLine, body: clean }],
  };
}

/** Pre-packaged downloadable survival packs for offline usage */
export const PRESET_PACKS = [
  {
    id: "pack-cooking",
    titleKey: "packCooking" as const,
    itemsCount: 8,
    sizeKb: 25,
    items: [
      {
        title: "Сушка и вяление мяса (Джерки / Джеркинг)",
        body: "Нарежьте нежирное мясо вдоль волокон тонкими полосками 3-5 мм. Посолите обильно (2 столовые ложки соли на 1 кг). Подвесьте на нитках или прутьях в сухом проветриваемом месте или над теплым дымом костра (не в пламени!) на 1-2 дня. Вяленое сухое мясо хранится месяцами без холодильника.",
      },
      {
        title: "Пеммикан — концентрат выживания",
        body: "Смешайте 50% высушенного в пыль мяса и 50% растопленного животного жира (сала). Добавьте сушеные кислые ягоды (клюква, рябина) для витаминов. Залейте в форму и остудите. 100 грамм пеммикана заменяют полноценный обед.",
      },
      {
        title: "Корни рогоза и камыша",
        body: "Корневища рогоза содержат до 30% крахмала. Выкопайте, очистите от черной кожуры, промойте. Можно запекать в золе, варить или высушить и растереть в муку для лепешек.",
      },
      {
        title: "Сныть и подорожник как зелень",
        body: "Молодые блестящие листья сныти отваривают 3 минуты и добавляют в супы. Листья подорожника, ошпаренные кипятком, заменяют капусту и богаты дубильными веществами.",
      },
    ],
  },
  {
    id: "pack-morale",
    titleKey: "packMorale" as const,
    itemsCount: 6,
    sizeKb: 18,
    items: [
      {
        title: "Психологическое правило «3 секунд»",
        body: "При возникновении внезапной опасности замрите на 3 секунды. Сделайте один глубокий вдох. Паническая первая реакция человека почти всегда ошибочна. Оцените угрозу, выберите укрытие и только потом действуйте.",
      },
      {
        title: "Словесная игра «Шериф и бандиты» (Мафия без карт)",
        body: "Для группы от 4 человек в темноте. Ведущий тайно касается плеча того, кто назначен «шерифом» и «бандитом». Каждый раунд «ночь» сменяется «днем», развивая наблюдательность, логику и снимая гнетущую тревогу.",
      },
      {
        title: "Гимнастика в ограниченном пространстве",
        body: "Чтобы избежать тромбоза вен и застоя при длительном сидении: вращайте стопами по 30 раз, напрягайте ягодичные мышцы и икры на 5 секунд и расслабляйте, делайте круговые движения плечами каждые 2 часа.",
      },
    ],
  },
  {
    id: "pack-knots",
    titleKey: "packKnots" as const,
    itemsCount: 7,
    sizeKb: 20,
    items: [
      {
        title: "Узел «Штык с обносом» для швартовки",
        body: "Самый надежный узел для привязывания лодки или оттяжки палатки к дереву. Оберните веревку вокруг опоры, сделайте шлаг и завяжите два полуштыка вокруг коренного конца. Узел не затягивается намертво под любой тягой.",
      },
      {
        title: "Схватывающий узел Бахмана",
        body: "Модификация узла Прусика с карабином. Репшнур оборачивается вокруг веревки и спинки карабина 3-4 раза. Позволяет удобно браться рукой за карабин и легко сдвигать узел без нагрузки.",
      },
      {
        title: "Плетение веревки из крапивы",
        body: "Стебли старой крапивы расщепите вдоль, отделите жесткие волокна от сердцевины. Разделите на 2 пряди и скручивайте их в противоположные стороны, одновременно переплетая между собой. Полученная нить превосходит по прочности шпагат.",
      },
    ],
  },
];
