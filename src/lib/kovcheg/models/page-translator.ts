import { getLoadedEngine, getCurrentLoadedModel } from "./llm-engine";

// Comprehensive offline terminology & phrase dictionary for field medicine, survival, and literature
const PHRASE_GLOSSARY_EN_TO_RU: [RegExp, string][] = [
  // Medical & Trauma
  [/\bsevere bleeding\b/gi, "критическое кровотечение"],
  [/\btourniquet\b/gi, "жгут-турникет"],
  [/\bpressure dressing\b/gi, "давящая повязка"],
  [/\barterial bleeding\b/gi, "артериальное кровотечение"],
  [/\bvenous bleeding\b/gi, "венозное кровотечение"],
  [/\bchest decompression\b/gi, "декомпрессия грудной клетки"],
  [/\bpneumothorax\b/gi, "пневмоторакс"],
  [/\bhypothermia\b/gi, "переохлаждение (гипотермия)"],
  [/\bairway\b/gi, "дыхательные пути"],
  [/\brespiration\b/gi, "дыхание"],
  [/\bcirculation\b/gi, "кровообращение"],
  [/\bfirst aid\b/gi, "первая помощь"],
  [/\bcardiopulmonary resuscitation\b/gi, "сердечно-легочная реанимация"],
  [/\bCPR\b/g, "СЛР"],
  [/\bburns?\b/gi, "ожог(и)"],
  [/\bfractures?\b/gi, "перелом(ы)"],
  [/\bsplint\b/gi, "шина"],
  [/\bwound\b/gi, "рана"],
  [/\binfection\b/gi, "инфекция"],
  [/\bantiseptic\b/gi, "антисептик"],
  [/\bsterile\b/gi, "стерильный"],
  [/\bbandage\b/gi, "бинт / повязка"],
  [/\bdehydration\b/gi, "обезвоживание"],
  [/\bwater purification\b/gi, "очистка воды"],
  [/\bboiling water\b/gi, "кипячение воды"],
  [/\bfiltration\b/gi, "фильтрация"],
  [/\bchlorine\b/gi, "хлор"],
  [/\bdisinfection\b/gi, "обеззараживание"],
  [/\bshelter\b/gi, "укрытие / убежище"],
  [/\bfirecraft\b/gi, "разведение огня"],
  [/\btinder\b/gi, "трут"],
  [/\bkindling\b/gi, "растопка"],
  [/\bcompass\b/gi, "компас"],
  [/\bnavigation\b/gi, "навигация"],
  [/\bradiation\b/gi, "радиация"],
  [/\bfallout\b/gi, "радиоактивные осадки"],
  [/\bdosimeter\b/gi, "дозиметр"],
  [/\bpotassium iodide\b/gi, "йодид калия"],
  [/\bemergency\b/gi, "чрезвычайная ситуация / экстренно"],
  [/\bsurvival\b/gi, "выживание"],
  [/\bchapter\b/gi, "Глава"],
  [/\bsection\b/gi, "Раздел"],
  [/\bintroduction\b/gi, "Введение"],
  [/\bconclusion\b/gi, "Заключение"],
  [/\bwarning\b/gi, "Внимание / Предупреждение"],
  [/\bdanger\b/gi, "Опасность"],
  [/\bcaution\b/gi, "Осторожно"],
  [/\bstep\b/gi, "Шаг"],
  [/\bmethod\b/gi, "Метод"],
  [/\bprocedure\b/gi, "Порядок действий"],
  [/\brule\b/gi, "Правило"],
];

const PHRASE_GLOSSARY_RU_TO_EN: [RegExp, string][] = [
  [/критическое кровотечение/gi, "severe bleeding"],
  [/жгут-турникет/gi, "tourniquet"],
  [/давящая повязка/gi, "pressure dressing"],
  [/артериальное кровотечение/gi, "arterial bleeding"],
  [/венозное кровотечение/gi, "venous bleeding"],
  [/пневмоторакс/gi, "pneumothorax"],
  [/переохлаждение/gi, "hypothermia"],
  [/дыхательные пути/gi, "airway"],
  [/первая помощь/gi, "first aid"],
  [/очистка воды/gi, "water purification"],
  [/кипячение/gi, "boiling"],
  [/укрытие/gi, "shelter"],
  [/убежище/gi, "shelter / bunker"],
  [/разведение огня/gi, "firecraft"],
  [/компас/gi, "compass"],
  [/радиация/gi, "radiation"],
  [/радиоактивные осадки/gi, "fallout"],
  [/дозиметр/gi, "dosimeter"],
  [/йодид калия/gi, "potassium iodide"],
  [/выживание/gi, "survival"],
  [/глава/gi, "Chapter"],
  [/раздел/gi, "Section"],
  [/внимание/gi, "Warning"],
  [/опасность/gi, "Danger"],
];

export async function translatePageOffline(
  text: string,
  fromLang: string,
  toLang: string,
  onToken?: (token: string, full: string) => void
): Promise<string> {
  const engine = getLoadedEngine();

  // 1. If WebLLM local engine is loaded, use neural translation
  if (engine && getCurrentLoadedModel()) {
    const targetLangName =
      toLang === "ru" ? "русский язык" : toLang === "en" ? "English" : "اللغة العربية";

    const prompt = `Ты — высокоточный переводчик книг и полевых руководств.
Переведи следующий текст с языка [${fromLang.toUpperCase()}] на [${targetLangName}].
Правила:
- Сохраняй абзацы, нумерацию, заголовки и структуру исходного текста.
- Переводи точно термины медицины, выживания и ориентирования.
- Выведи ТОЛЬКО переведенный текст без вступительных фраз и комментариев.

ТЕКСТ ДЛЯ ПЕРЕВОДА:
${text}`;

    try {
      const messages = [
        { role: "system", content: "You are an expert book and survival guide translator." },
        { role: "user", content: prompt },
      ];

      const stream = await engine.chat.completions.create({
        messages,
        temperature: 0.2,
        max_tokens: 1024,
        stream: true,
      });

      let translated = "";
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || "";
        translated += delta;
        onToken?.(delta, translated);
      }

      if (translated.trim()) {
        return translated.trim();
      }
    } catch (err) {
      console.warn("Local LLM translation failed, using fallback translator:", err);
    }
  }

  // 2. Intelligent Offline Fallback Translator (Glossary & Structure Processor)
  // Simulates step-by-step token delivery for seamless UX
  let translatedText = text;

  if (toLang === "ru" && (fromLang === "en" || !fromLang)) {
    for (const [pattern, repl] of PHRASE_GLOSSARY_EN_TO_RU) {
      translatedText = translatedText.replace(pattern, repl);
    }
    // Basic structural headings
    translatedText = translatedText
      .replace(/\bChapter (\d+)/gi, "Глава $1")
      .replace(/\bPart (\d+)/gi, "Часть $1")
      .replace(/\bSection (\d+)/gi, "Раздел $1");
  } else if (toLang === "en" && (fromLang === "ru" || !fromLang)) {
    for (const [pattern, repl] of PHRASE_GLOSSARY_RU_TO_EN) {
      translatedText = translatedText.replace(pattern, repl);
    }
    translatedText = translatedText
      .replace(/\bГлава (\d+)/gi, "Chapter $1")
      .replace(/\bЧасть (\d+)/gi, "Part $1")
      .replace(/\bРаздел (\d+)/gi, "Section $1");
  }

  // Header notice explaining translation mode
  const notice =
    toLang === "ru"
      ? "[Офлайн-перевод: активирован локальный словарь терминов. Для глубокого нейроперевода текста скачайте локальную ИИ-модель в разделе «Библиотеки»]"
      : toLang === "ar"
      ? "[الترجمة دون اتصال: تم تفعيل قاموس المصطلحات الميدانية]"
      : "[Offline Translation: Tactical glossary applied. Load local AI model in Libraries for full neural translation]";

  const finalOutput = `${translatedText}\n\n—\nℹ️ ${notice}`;
  onToken?.(finalOutput, finalOutput);
  return finalOutput;
}
