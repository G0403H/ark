import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const libraryDir = path.join(publicDir, "library");
const packsDir = path.join(publicDir, "packs");
const illustrationsDir = path.join(publicDir, "illustrations");

// Ensure directories exist
fs.mkdirSync(libraryDir, { recursive: true });
fs.mkdirSync(packsDir, { recursive: true });
fs.mkdirSync(illustrationsDir, { recursive: true });

console.log("Generating offline survival archive...");

// ---------------- 1. GENERATE VECTOR SVG ILLUSTRATIONS ----------------
const SVG_ASSETS = [
  {
    name: "trap-figure4.svg",
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
  <rect width="600" height="400" fill="#18181b" />
  <text x="30" y="40" fill="#facc15" font-size="20" font-family="sans-serif" font-weight="bold">Ловушка-давилка «Цифра 4» (Figure-4 Deadfall Trap)</text>
  <!-- Ground line -->
  <line x1="50" y1="340" x2="550" y2="340" stroke="#71717a" stroke-width="3" />
  <!-- Vertical post -->
  <rect x="220" y="160" width="16" height="180" rx="3" fill="#a16207" stroke="#ca8a04" stroke-width="2" />
  <!-- Diagonal trigger arm -->
  <polygon points="170,330 400,160 410,172 180,342" fill="#ca8a04" stroke="#eab308" stroke-width="1.5" />
  <!-- Horizontal bait stick -->
  <rect x="160" y="315" width="310" height="14" rx="2" fill="#d97706" stroke="#f59e0b" stroke-width="1.5" />
  <!-- Deadfall weight (rock/log) -->
  <polygon points="200,90 530,220 500,260 170,130" fill="#3f3f46" stroke="#a1a1aa" stroke-width="3" />
  <!-- Bait trigger point -->
  <circle cx="460" cy="322" r="8" fill="#ef4444" stroke="#f87171" stroke-width="2" />
  <!-- Labels -->
  <text x="475" y="327" fill="#f87171" font-size="14" font-family="sans-serif">Приманка на острие</text>
  <text x="320" y="120" fill="#e4e4e7" font-size="15" font-family="sans-serif">Тяжелый камень или бревно (>5-10 кг)</text>
  <text x="80" y="240" fill="#e4e4e7" font-size="14" font-family="sans-serif">Вертикальная стойка</text>
  <text x="280" y="220" fill="#e4e4e7" font-size="14" font-family="sans-serif">Диагональный рычаг</text>
  <text x="180" y="370" fill="#a1a1aa" font-size="13" font-family="sans-serif">Выемки должны быть срезаны под прямым углом 90° для чуткого спуска</text>
</svg>`,
  },
  {
    name: "shelter-debris.svg",
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
  <rect width="600" height="400" fill="#18181b" />
  <text x="30" y="40" fill="#facc15" font-size="20" font-family="sans-serif" font-weight="bold">Шалаш-укрытие из веток и лапника (Debris Hut)</text>
  <line x1="40" y1="340" x2="560" y2="340" stroke="#71717a" stroke-width="3" />
  <!-- Ridge pole -->
  <line x1="160" y1="130" x2="500" y2="340" stroke="#ca8a04" stroke-width="12" stroke-linecap="round" />
  <!-- A-frame supports -->
  <line x1="90" y1="340" x2="160" y2="130" stroke="#a16207" stroke-width="8" stroke-linecap="round" />
  <line x1="230" y1="340" x2="160" y2="130" stroke="#a16207" stroke-width="8" stroke-linecap="round" />
  <!-- Ribs / rib poles -->
  <line x1="200" y1="340" x2="220" y2="170" stroke="#854d0e" stroke-width="4" />
  <line x1="250" y1="340" x2="280" y2="210" stroke="#854d0e" stroke-width="4" />
  <line x1="300" y1="340" x2="340" y2="240" stroke="#854d0e" stroke-width="4" />
  <line x1="350" y1="340" x2="400" y2="280" stroke="#854d0e" stroke-width="4" />
  <line x1="400" y1="340" x2="450" y2="310" stroke="#854d0e" stroke-width="4" />
  <!-- Debris foliage layer -->
  <path d="M140,110 Q280,180 520,335 L500,345 Q260,200 120,130 Z" fill="#15803d" opacity="0.75" />
  <path d="M130,120 Q270,210 490,340 L470,350 Q250,230 110,140 Z" fill="#166534" opacity="0.85" />
  <circle cx="160" cy="130" r="8" fill="#eab308" />
  <!-- Labels -->
  <text x="175" y="125" fill="#facc15" font-size="14" font-family="sans-serif">Опорная развилка A-образной формы</text>
  <text x="320" y="180" fill="#86efac" font-size="14" font-family="sans-serif">Слой сухой листвы и лапника: не менее 60-80 см</text>
  <text x="60" y="370" fill="#a1a1aa" font-size="13" font-family="sans-serif">Внутренний объем должен быть минимальным — только под размер тела для сохранения тепла</text>
</svg>`,
  },
  {
    name: "fire-dakota.svg",
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
  <rect width="600" height="400" fill="#18181b" />
  <text x="30" y="40" fill="#facc15" font-size="20" font-family="sans-serif" font-weight="bold">Дакотский подземный очаг (Dakota Fire Hole)</text>
  <!-- Ground level -->
  <path d="M30,140 H160 V280 C160,310 180,320 230,320 H270 C320,320 340,310 340,280 V140 H420 L480,270 C490,290 500,290 500,290 L340,290 M500,290" fill="#27272a" stroke="#71717a" stroke-width="2" />
  <!-- Air tunnel connecting shaft -->
  <path d="M440,140 L340,280 H300 L400,140 Z" fill="#18181b" stroke="#ca8a04" stroke-width="1.5" />
  <!-- Fire chamber -->
  <rect x="180" y="140" width="140" height="160" rx="10" fill="#18181b" />
  <!-- Flames -->
  <polygon points="220,290 240,240 260,285 275,220 290,290" fill="#ea580c" />
  <polygon points="230,290 245,250 260,285 270,240 280,290" fill="#facc15" />
  <!-- Airflow arrows -->
  <path d="M420,130 L360,250" stroke="#38bdf8" stroke-width="3" stroke-dasharray="5 5" fill="none" marker-end="url(#arrow)" />
  <path d="M330,275 L280,285" stroke="#38bdf8" stroke-width="3" stroke-dasharray="5 5" fill="none" />
  <!-- Labels -->
  <text x="185" y="125" fill="#facc15" font-size="14" font-family="sans-serif">Основная камера горения</text>
  <text x="400" y="125" fill="#38bdf8" font-size="14" font-family="sans-serif">Приточный туннель под углом 45°</text>
  <text x="130" y="360" fill="#a1a1aa" font-size="13" font-family="sans-serif">Преимущества: полное отсутствие открытого пламени, минимум дыма, защита от штормового ветра</text>
</svg>`,
  },
  {
    name: "aid-splint.svg",
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
  <rect width="600" height="400" fill="#18181b" />
  <text x="30" y="40" fill="#facc15" font-size="20" font-family="sans-serif" font-weight="bold">Иммобилизация конечности шиной при переломе</text>
  <!-- Limb (Arm) -->
  <path d="M80,200 C150,195 240,190 320,195 C400,200 480,205 520,210 L520,240 C480,245 400,240 320,235 C240,230 150,235 80,240 Z" fill="#475569" stroke="#94a3b8" stroke-width="2" />
  <!-- Soft padding -->
  <rect x="120" y="180" width="360" height="75" rx="6" fill="#334155" opacity="0.6" stroke="#cbd5e1" stroke-dasharray="4 4" />
  <!-- Rigid Splint Boards (top and bottom) -->
  <rect x="110" y="165" width="380" height="15" rx="3" fill="#ca8a04" stroke="#eab308" stroke-width="2" />
  <rect x="110" y="255" width="380" height="15" rx="3" fill="#ca8a04" stroke="#eab308" stroke-width="2" />
  <!-- Tie straps (bandages) -->
  <rect x="140" y="155" width="22" height="125" rx="4" fill="#ef4444" stroke="#fca5a5" stroke-width="1.5" />
  <rect x="220" y="155" width="22" height="125" rx="4" fill="#ef4444" stroke="#fca5a5" stroke-width="1.5" />
  <rect x="360" y="155" width="22" height="125" rx="4" fill="#ef4444" stroke="#fca5a5" stroke-width="1.5" />
  <rect x="440" y="155" width="22" height="125" rx="4" fill="#ef4444" stroke="#fca5a5" stroke-width="1.5" />
  <!-- Fracture mark -->
  <path d="M285,190 L295,215 L285,240" stroke="#f43f5e" stroke-width="3" fill="none" />
  <!-- Labels -->
  <text x="250" y="140" fill="#f43f5e" font-size="14" font-family="sans-serif">Зона перелома (не перетягивать!)</text>
  <text x="110" y="320" fill="#eab308" font-size="14" font-family="sans-serif">Шина захватывает сустав ВЫШЕ и сустав НИЖЕ перелома</text>
  <text x="110" y="350" fill="#38bdf8" font-size="13" font-family="sans-serif">Всегда проверять пульс и чувствительность пальцев после наложения!</text>
</svg>`,
  },
  {
    name: "radiation-shielding.svg",
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
  <rect width="600" height="400" fill="#18181b" />
  <text x="30" y="40" fill="#facc15" font-size="20" font-family="sans-serif" font-weight="bold">Слои половинного ослабления гамма-излучения (HVL)</text>
  <!-- Radiation source rays -->
  <line x1="50" y1="200" x2="160" y2="200" stroke="#ef4444" stroke-width="8" />
  <polygon points="150,192 170,200 150,208" fill="#ef4444" />
  <text x="50" y="175" fill="#ef4444" font-size="14" font-weight="bold">Гамма-лучи 100%</text>
  <!-- Material 1: Lead -->
  <rect x="180" y="80" width="40" height="240" fill="#475569" stroke="#94a3b8" stroke-width="2" />
  <text x="175" y="345" fill="#94a3b8" font-size="13" font-family="sans-serif">Свинец: 1.8 см</text>
  <!-- Ray after lead -->
  <line x1="220" y1="200" x2="280" y2="200" stroke="#f59e0b" stroke-width="5" />
  <!-- Material 2: Steel -->
  <rect x="280" y="80" width="60" height="240" fill="#64748b" stroke="#cbd5e1" stroke-width="2" />
  <text x="280" y="345" fill="#cbd5e1" font-size="13" font-family="sans-serif">Сталь: 2.8 см</text>
  <!-- Material 3: Concrete -->
  <rect x="370" y="80" width="90" height="240" fill="#71717a" stroke="#d4d4d8" stroke-width="2" />
  <text x="370" y="345" fill="#d4d4d8" font-size="13" font-family="sans-serif">Бетон: 6.0 см</text>
  <!-- Material 4: Compacted Soil -->
  <rect x="480" y="80" width="100" height="240" fill="#854d0e" stroke="#ca8a04" stroke-width="2" />
  <text x="480" y="345" fill="#ca8a04" font-size="13" font-family="sans-serif">Грунт: 9.0 см</text>
  <text x="60" y="380" fill="#a1a1aa" font-size="13" font-family="sans-serif">Каждый указанный слой снижает дозу радиации ровно в 2 раза. Слой грунта 90 см снижает излучение в 1000 раз!</text>
</svg>`,
  },
  {
    name: "water-filter.svg",
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
  <rect width="600" height="400" fill="#18181b" />
  <text x="30" y="40" fill="#facc15" font-size="20" font-family="sans-serif" font-weight="bold">Походный гравийно-песчано-угольный фильтр для воды</text>
  <!-- Bottle body inverted -->
  <path d="M220,70 L380,70 L340,290 L320,330 L280,330 L260,290 Z" fill="#27272a" stroke="#38bdf8" stroke-width="2.5" />
  <!-- Layer 1: Gravel -->
  <rect x="235" y="75" width="130" height="45" fill="#52525b" />
  <text x="390" y="105" fill="#e4e4e7" font-size="14">1. Крупный гравий и галька (от веток и мусора)</text>
  <!-- Layer 2: Coarse Sand -->
  <rect x="245" y="120" width="110" height="45" fill="#d97706" opacity="0.8" />
  <text x="390" y="150" fill="#e4e4e7" font-size="14">2. Крупный промытый песок</text>
  <!-- Layer 3: Crushed Charcoal -->
  <rect x="255" y="165" width="90" height="55" fill="#18181b" stroke="#71717a" stroke-dasharray="2 2" />
  <text x="390" y="195" fill="#facc15" font-size="14">3. Дробленый березовый уголь (адсорбция токсинов)</text>
  <!-- Layer 4: Fine Sand -->
  <rect x="265" y="220" width="70" height="45" fill="#b45309" opacity="0.9" />
  <text x="390" y="245" fill="#e4e4e7" font-size="14">4. Мелкий речной песок</text>
  <!-- Layer 5: Fabric/Gauze plug -->
  <rect x="275" y="265" width="50" height="30" fill="#e4e4e7" />
  <text x="390" y="285" fill="#e4e4e7" font-size="14">5. Чистая ткань / вата / мох (заглушка горлышка)</text>
  <!-- Clean water drops -->
  <circle cx="300" cy="355" r="5" fill="#38bdf8" />
  <circle cx="300" cy="375" r="7" fill="#38bdf8" />
  <text x="50" y="380" fill="#f87171" font-size="13">Внимание: механический фильтр не убивает вирусы! После фильтрации кипятить 3-5 минут.</text>
</svg>`,
  },
];

for (const asset of SVG_ASSETS) {
  fs.writeFileSync(path.join(illustrationsDir, asset.name), asset.content, "utf8");
}
console.log(`Saved ${SVG_ASSETS.length} SVG illustrations into public/illustrations/`);

// ---------------- 2. GENERATE HIGH-DENSITY SURVIVAL ENCYCLOPEDIAS ----------------
console.log("Generating full-scale offline survival compendiums (RU, EN, AR)...");

// Read chapters from templates or generate structured comprehensive modules
import { generateEncyclopediasAndPacks } from "./encyclopedia-data-generator.mjs";
generateEncyclopediasAndPacks(libraryDir, packsDir);

console.log("Offline archive generation complete!");
