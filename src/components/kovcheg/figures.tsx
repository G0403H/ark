import type { ReactNode } from "react";

import { FIGURE_LICENSE, type FigureId } from "@/lib/kovcheg/types";

function Plate({ label, children }: { label: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 360 220" role="img" aria-label={label}>
      {children}
    </svg>
  );
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Dot({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={5} fill="var(--color-lamp)" stroke="none" />;
}

export function FigureView({ id, caption }: { id: FigureId; caption?: string }) {
  return (
    <figure className="plate">
      {id === "pulse" && (
        <Plate label="Точки пульса: шея, запястье, пах">
          <path d="M180 28c18 0 28 14 28 30s-10 24-28 24-28-10-28-24 10-30 28-30z" {...stroke} />
          <path d="M150 82h60l18 70-28 8-10-28h-20l-10 28-28-8z" {...stroke} />
          <path d="M150 96l-42 46M210 96l42 46" {...stroke} />
          <path d="M158 160l-8 40M202 160l8 40" {...stroke} />
          <Dot x={206} y={78} />
          <Dot x={118} y={148} />
          <Dot x={196} y={158} />
          <text x="214" y="74">
            шея сбоку
          </text>
          <text x="24" y="146">
            запястье
          </text>
          <text x="208" y="176">
            пах
          </text>
        </Plate>
      )}
      {id === "pressure" && (
        <Plate label="Ладонь давит тканью на рану предплечья">
          <path d="M40 120h180" {...stroke} />
          <path d="M70 120c20-36 50-36 70 0" {...stroke} />
          <rect x="118" y="96" width="46" height="28" rx="3" {...stroke} />
          <path d="M150 70c30 10 48 28 40 52" {...stroke} />
          <Dot x={140} y={110} />
          <text x="180" y="64">
            ткань на ране
          </text>
          <text x="40" y="156">
            давить сюда, не рядом
          </text>
        </Plate>
      )}
      {id === "side" && (
        <Plate label="Человек на боку, рот ниже, колено согнуто">
          <path d="M70 78c22-8 40 8 36 28-18 6-40 0-48-16" {...stroke} />
          <path d="M100 100c40 8 70 6 110 28" {...stroke} />
          <path d="M150 112c10 30 8 48-8 62M200 128c28 8 40 36 24 52" {...stroke} />
          <Dot x={78} y={92} />
          <text x="40" y="48">
            рот к полу
          </text>
          <text x="210" y="188">
            колено упирается
          </text>
        </Plate>
      )}
      {id === "layers" && (
        <Plate label="Три слоя одежды">
          <rect x="70" y="36" width="220" height="148" rx="8" {...stroke} />
          <rect x="92" y="54" width="176" height="112" rx="8" {...stroke} />
          <rect x="114" y="72" width="132" height="76" rx="8" {...stroke} />
          <text x="126" y="114">
            сухое у кожи
          </text>
          <text x="78" y="46">
            ветер и вода
          </text>
          <text x="100" y="68">
            тепло
          </text>
        </Plate>
      )}
      {id === "basement" && (
        <Plate label="Подвал и толща земли против пыли, машина тонкая">
          <path d="M40 40h120v70H40z" {...stroke} />
          <path d="M40 110h120v50H40z" {...stroke} />
          <path d="M24 160h152" {...stroke} />
          <path d="M24 170c20 16 40 16 60 0s40-16 60 0 32 16 52 0" {...stroke} />
          <rect x="250" y="78" width="80" height="36" rx="6" {...stroke} />
          <circle cx="268" cy="122" r="8" {...stroke} />
          <circle cx="312" cy="122" r="8" {...stroke} />
          <text x="78" y="96">
            центр
          </text>
          <text x="70" y="140">
            подвал
          </text>
          <text x="256" y="70">
            машина
          </text>
          <text x="230" y="168">
            мало массы
          </text>
        </Plate>
      )}
      {id === "chest" && (
        <Plate label="Центр груди для нажатий">
          <path d="M180 30c40 0 70 24 78 70 8 50-20 90-78 100-58-10-86-50-78-100 8-46 38-70 78-70z" {...stroke} />
          <path d="M180 70v70M150 104h60" {...stroke} />
          <Dot x={180} y={104} />
          <text x="196" y="100">
            центр
          </text>
          <text x="70" y="190">
            не сбоку и не в живот
          </text>
        </Plate>
      )}
      {id === "abdomen" && (
        <Plate label="Живот: верх и низ, право и лево">
          <rect x="110" y="36" width="140" height="150" rx="40" {...stroke} />
          <path d="M180 36v150M110 110h140" {...stroke} />
          <text x="122" y="80">
            право
          </text>
          <text x="196" y="80">
            лево
          </text>
          <text x="150" y="150">
            низ
          </text>
          <text x="78" y="30">
            не давить вслепую
          </text>
        </Plate>
      )}
      {id === "spine" && (
        <Plate label="Голова, шея и спина на одной линии">
          <path d="M120 40c30-20 70 0 60 30-8 24-8 40 0 70 6 24 4 40-10 60" {...stroke} />
          <path d="M150 70c-30 10-40 40-20 70" {...stroke} />
          <text x="196" y="70">
            не скручивать шею
          </text>
          <text x="40" y="180">
            одна линия
          </text>
        </Plate>
      )}
      {id === "skull" && (
        <Plate label="Голова: не давить на вмятину">
          <path d="M180 36c48 0 78 34 78 74s-30 70-78 78-78-30-78-78 30-74 78-74z" {...stroke} />
          <path d="M150 70c10 16 28 18 40 4" {...stroke} />
          <Dot x={160} y={78} />
          <text x="40" y="40">
            вмятину не давить
          </text>
          <text x="200" y="160">
            ухо не тампонировать глубоко
          </text>
        </Plate>
      )}
      {id === "femoral" && (
        <Plate label="Складка паха, не место для эксперимента">
          <path d="M70 40h160v140H70z" {...stroke} />
          <path d="M70 120c40-28 80-28 120 0" {...stroke} />
          <Dot x={150} y={112} />
          <text x="168" y="100">
            складка
          </text>
          <text x="86" y="168">
            не жгут через живот
          </text>
        </Plate>
      )}
      {id === "tick" && (
        <Plate label="Клеща тянут у кожи вверх, без масла">
          <path d="M40 150h280" {...stroke} />
          <path d="M40 150c40-20 80-20 120 0s80 20 120 0" {...stroke} />
          <path d="M168 150l8-28" {...stroke} />
          <circle cx="176" cy="112" r="10" {...stroke} />
          <path d="M176 70v28" {...stroke} />
          <path d="M168 78l8-8 8 8" {...stroke} />
          <text x="196" y="90">
            захват у кожи
          </text>
          <text x="48" y="40">
            не мазать маслом
          </text>
        </Plate>
      )}
      {id === "water-filter" && (
        <Plate label="Слои походного фильтра для воды">
          <path d="M120 30h120l-30 140h-60z" {...stroke} />
          <path d="M130 65h100" strokeDasharray="3 3" {...stroke} />
          <path d="M140 105h80" strokeDasharray="3 3" {...stroke} />
          <path d="M145 145h70" strokeDasharray="3 3" {...stroke} />
          <rect x="145" y="170" width="70" height="30" rx="3" {...stroke} />
          <Dot x={180} y={185} />
          <text x="15" y="55">1. Гравий</text>
          <text x="15" y="95">2. Песок</text>
          <text x="15" y="135">3. Древесный уголь</text>
          <text x="225" y="190">Чистая вода</text>
        </Plate>
      )}
      {id === "solar-still" && (
        <Plate label="Солнечный дистиллятор">
          <path d="M30 60c70 20 100 110 150 110s80-90 150-110" {...stroke} />
          <path d="M50 70l130 40 130-40" {...stroke} />
          <circle cx="180" cy="110" r="10" fill="var(--color-lamp)" stroke="none" />
          <rect x="160" y="140" width="40" height="30" rx="3" {...stroke} />
          <text x="60" y="50">Пленка с уклоном</text>
          <text x="200" y="110">Камень-груз</text>
          <text x="140" y="195">Сборная кружка</text>
        </Plate>
      )}
      {id === "knots-guide" && (
        <Plate label="Узел Булинь и Прямой узел">
          <path d="M80 180V90c0-25 35-25 35 0v30c0 15-25 15-25 0V70c0-30 50-30 50 0v110" {...stroke} />
          <Dot x={100} y={105} />
          <text x="50" y="40">Булинь (петля)</text>
          <path d="M220 70c40 0 40 50 0 50h40c40 0 40-50 0-50" {...stroke} />
          <path d="M220 150c40 0 40-50 0-50h40c40 0 40 50 0 50" {...stroke} />
          <text x="210" y="180">Прямой узел</text>
        </Plate>
      )}
      {id === "bread-stove" && (
        <Plate label="Выпечка хлеба на камне">
          <ellipse cx="180" cy="160" rx="120" ry="30" {...stroke} />
          <ellipse cx="180" cy="150" rx="60" ry="15" fill="var(--color-lamp)" opacity="0.3" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="100" cy="170" r="8" fill="var(--color-alarm)" stroke="none" />
          <circle cx="130" cy="175" r="7" fill="var(--color-lamp)" stroke="none" />
          <circle cx="230" cy="170" r="8" fill="var(--color-alarm)" stroke="none" />
          <text x="130" y="125">Лепешка (баннок)</text>
          <text x="110" y="70">Прогретый плоский камень</text>
          <text x="90" y="205">Жаркие угли костра</text>
        </Plate>
      )}
      {id === "stars-navigation" && (
        <Plate label="Ориентирование по Полярной звезде">
          <Dot x={50} y={150} />
          <Dot x={80} y={160} />
          <Dot x={110} y={145} />
          <Dot x={140} y={150} />
          <Dot x={150} y={180} />
          <Dot x={190} y={175} />
          <Dot x={180} y={140} />
          <path d="M50 150l30 10 30-15 30 5 10 30 40-5-10-35-40-5" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" fill="none" />
          <path d="M190 175L300 45" stroke="var(--color-lamp)" strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
          <polygon points="300,35 303,45 313,45 305,51 308,61 300,55 292,61 295,51 287,45 297,45" fill="var(--color-lamp)" stroke="none" />
          <text x="60" y="195">Большая Медведица</text>
          <text x="240" y="30">Полярная звезда (СЕВЕР)</text>
        </Plate>
      )}
      {id === "breathe-square" && (
        <Plate label="Квадратное дыхание 4-4-4-4">
          <rect x="90" y="35" width="180" height="150" rx="8" {...stroke} />
          <path d="M90 35h180" stroke="var(--color-lamp)" strokeWidth="3" fill="none" />
          <path d="M270 35v150" stroke="var(--color-calm)" strokeWidth="3" fill="none" />
          <path d="M270 185H90" stroke="var(--color-lamp)" strokeWidth="3" fill="none" />
          <path d="M90 185V35" stroke="var(--color-calm)" strokeWidth="3" fill="none" />
          <text x="120" y="25">1. Вдох (4 сек)</text>
          <text x="275" y="115">2. Задержка (4 сек)</text>
          <text x="120" y="205">3. Выдох (4 сек)</text>
          <text x="5" y="115">4. Задержка (4 сек)</text>
        </Plate>
      )}
      {id === "trap-figure4" && (
        <Plate label="Ловушка-давилка Цифра 4 (Figure-4 deadfall)">
          <line x1="120" y1="180" x2="120" y2="80" {...stroke} strokeWidth="2.5" />
          <line x1="80" y1="170" x2="220" y2="90" {...stroke} strokeWidth="2.5" />
          <line x1="80" y1="170" x2="260" y2="170" {...stroke} strokeWidth="2" strokeDasharray="1 0" />
          <polygon points="100,50 280,120 270,140 90,70" fill="var(--color-raise)" stroke="currentColor" strokeWidth="1.5" />
          <Dot x={120} y={115} />
          <Dot x={220} y={90} />
          <Dot x={80} y={170} />
          <text x="140" y="60">Тяжелый плоский камень / бревно</text>
          <text x="30" y="115">Стойка</text>
          <text x="170" y="195">Сторожок с приманкой</text>
        </Plate>
      )}
      {id === "shelter-debris" && (
        <Plate label="Шалаш-укрытие из веток и лапника (Debris Hut)">
          <line x1="60" y1="170" x2="280" y2="170" stroke="currentColor" strokeWidth="2" />
          <line x1="100" y1="170" x2="150" y2="60" {...stroke} strokeWidth="2.5" />
          <line x1="150" y1="60" x2="200" y2="170" {...stroke} strokeWidth="2.5" />
          <line x1="150" y1="60" x2="270" y2="170" {...stroke} strokeWidth="3" />
          <path d="M120 150l30-80 50 100M140 160l30-70 60 80" stroke="var(--color-lamp)" strokeWidth="1.5" fill="none" />
          <text x="130" y="45">Несущий конёк</text>
          <text x="40" y="120">Вход (минимальный)</text>
          <text x="180" y="195">Слой лапника/листвы не менее 60 см</text>
        </Plate>
      )}
      {id === "fire-dakota" && (
        <Plate label="Дакотский подземный очаг (Dakota Fire Hole)">
          <path d="M40 80h280" stroke="currentColor" strokeWidth="2" />
          <path d="M100 80v70c0 20 20 30 40 30h40c20 0 40-10 40-30V80" {...stroke} fill="var(--color-bg)" />
          <path d="M260 80l-50 80" {...stroke} strokeWidth="2" />
          <polygon points="150,165 170,165 160,135" fill="var(--color-alarm)" stroke="none" />
          <polygon points="145,170 175,170 160,140" fill="var(--color-lamp)" opacity="0.6" stroke="none" />
          <text x="110" y="70">Камера горения (без дыма наружу)</text>
          <text x="220" y="60">Приточный туннель воздуха</text>
          <text x="130" y="200">Тяга воздуха снизу</text>
        </Plate>
      )}
      {id === "aid-splint" && (
        <Plate label="Наложение импровизированной шины на предплечье">
          <rect x="70" y="105" width="220" height="20" rx="3" fill="var(--color-lamp)" opacity="0.4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M60 115c50-15 150-15 230 0" {...stroke} strokeWidth="2" />
          <line x1="100" y1="90" x2="100" y2="140" stroke="var(--color-alarm)" strokeWidth="2" />
          <line x1="160" y1="90" x2="160" y2="140" stroke="var(--color-alarm)" strokeWidth="2" />
          <line x1="220" y1="90" x2="220" y2="140" stroke="var(--color-alarm)" strokeWidth="2" />
          <Dot x={160} y={115} />
          <text x="80" y="75">Фиксация 2-х суставов выше и ниже перелома</text>
          <text x="70" y="160">Мягкая подкладка под жесткую ветку/доску</text>
        </Plate>
      )}
      {id === "plant-test" && (
        <Plate label="Тест на съедобность дикоросов (8 этапов)">
          <circle cx="80" cy="70" r="22" fill="var(--color-raise)" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="180" cy="70" r="22" fill="var(--color-raise)" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="280" cy="70" r="22" fill="var(--color-raise)" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="130" cy="150" r="22" fill="var(--color-raise)" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="230" cy="150" r="22" fill="var(--color-lamp)" stroke="currentColor" strokeWidth="1.5" />
          <text x="70" y="75">1. Кожа</text>
          <text x="170" y="75">2. Губа</text>
          <text x="270" y="75">3. Язык</text>
          <text x="110" y="155">4. Жевать</text>
          <text x="210" y="155">5. Проба</text>
          <text x="60" y="195">Пауза между этапами — от 15 до 60 минут!</text>
        </Plate>
      )}
      {id === "radiation-shielding" && (
        <Plate label="Слои половинного ослабления гамма-излучения">
          <line x1="30" y1="100" x2="90" y2="100" stroke="var(--color-alarm)" strokeWidth="3" />
          <rect x="90" y="40" width="30" height="130" fill="var(--color-line)" stroke="currentColor" strokeWidth="1" />
          <rect x="150" y="40" width="60" height="130" fill="var(--color-raise)" stroke="currentColor" strokeWidth="1" />
          <rect x="240" y="40" width="90" height="130" fill="var(--color-lamp)" opacity="0.3" stroke="currentColor" strokeWidth="1" />
          <text x="80" y="190">Свинец: 1.8 см</text>
          <text x="150" y="190">Бетон: 6 см</text>
          <text x="240" y="190">Грунт: 9 см</text>
          <text x="70" y="30">Каждый слой снижает гамму в 2 раза</text>
        </Plate>
      )}
      {id === "drone-evasion" && (
        <Plate label="Маневр уклонения от пикирующего FPV-дрона">
          {/* Incoming FPV path */}
          <path d="M40 30 C120 40 180 80 240 140" fill="none" stroke="var(--color-alarm)" strokeWidth="2.5" strokeDasharray="6 4" />
          {/* Drone icon representation */}
          <circle cx="40" cy="30" r="10" fill="none" stroke="var(--color-alarm)" strokeWidth="2" />
          <line x1="28" y1="18" x2="52" y2="42" stroke="var(--color-alarm)" strokeWidth="2" />
          <line x1="52" y1="18" x2="28" y2="42" stroke="var(--color-alarm)" strokeWidth="2" />
          <text x="56" y="28" fill="var(--color-alarm)" fontSize="11" fontWeight="bold">FPV (120-150 км/ч)</text>
          {/* Solid tree / concrete obstacle */}
          <rect x="210" y="80" width="26" height="110" rx="4" fill="var(--color-raise)" stroke="currentColor" strokeWidth="1.8" />
          <text x="195" y="205" fontSize="10">Укрытие</text>
          {/* Human evasive sprint */}
          <path d="M220 160 L180 160" fill="none" stroke="var(--color-lamp)" strokeWidth="3" markerEnd="url(#arrow)" />
          <circle cx="175" cy="160" r="7" fill="var(--color-lamp)" />
          <text x="90" y="155" fill="var(--color-lamp)" fontSize="10" fontWeight="bold">Резкий рывок под 90°</text>
          {/* Inertia trajectory of drone missing target */}
          <path d="M240 140 L310 190" fill="none" stroke="var(--color-muted)" strokeWidth="1.5" strokeDasharray="3 3" />
          <text x="245" y="130" fontSize="9" fill="var(--color-alarm)">Инерция промаха</text>
        </Plate>
      )}
      {id === "booby-trap-danger" && (
        <Plate label="Опасные мины-сюрпризы и растяжки: нулевое касание">
          {/* Tripwire */}
          <line x1="30" y1="140" x2="160" y2="140" stroke="var(--color-alarm)" strokeWidth="1.5" strokeDasharray="4 2" />
          <text x="40" y="130" fill="var(--color-alarm)" fontSize="10">Растяжка (нить/леска)</text>
          {/* Grenade pin */}
          <circle cx="165" cy="140" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="165" y1="148" x2="165" y2="175" stroke="currentColor" strokeWidth="4" />
          {/* Prohibited items: Phone & Butterfly mine */}
          <rect x="220" y="110" width="30" height="50" rx="3" fill="var(--color-raise)" stroke="currentColor" strokeWidth="1.5" />
          <line x1="225" y1="116" x2="245" y2="116" stroke="var(--color-muted)" strokeWidth="1" />
          <circle cx="235" cy="152" r="3" fill="var(--color-muted)" />
          <text x="205" y="175" fontSize="10">Телефон-ловушка</text>
          {/* PFM-1 Butterfly mine shape */}
          <path d="M285 125 C295 110 325 115 335 130 C325 145 295 140 285 125 Z" fill="var(--color-raise)" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="308" cy="127" r="5" fill="none" stroke="var(--color-alarm)" strokeWidth="2" />
          <text x="280" y="155" fontSize="10">Мина ПФМ-1</text>
          {/* Warning banner */}
          <text x="45" y="50" fill="var(--color-alarm)" fontSize="13" fontWeight="bold">НЕ ПОДНИМАТЬ! НЕ КАСАТЬСЯ! (0-TOUCH)</text>
          <text x="45" y="70" fontSize="11" fill="var(--color-muted)">Отойти по своим следам назад на 50 метров</text>
        </Plate>
      )}
      {id === "trench-netting" && (
        <Plate label="Противодроновая сетка и Г-образный вход">
          {/* Trench profile */}
          <path d="M20 90 L80 90 L80 180 L220 180 L220 90 L340 90" fill="none" stroke="currentColor" strokeWidth="2" />
          <text x="125" y="165" fontSize="11">Окоп / щель</text>
          {/* Standoff Net 1.5-2m above */}
          <line x1="60" y1="50" x2="240" y2="50" stroke="var(--color-lamp)" strokeWidth="2.5" strokeDasharray="4 2" />
          <text x="75" y="40" fill="var(--color-lamp)" fontSize="10" fontWeight="bold">Сетка от дронов (1.5–2м над окопом)</text>
          {/* Detonation in air */}
          <circle cx="150" cy="50" r="14" fill="none" stroke="var(--color-alarm)" strokeWidth="2" strokeDasharray="3 3" />
          <text x="170" y="55" fill="var(--color-alarm)" fontSize="9">Подрыв в воздухе</text>
          {/* L-shaped baffle entry */}
          <path d="M270 90 L270 140 L310 140" fill="none" stroke="var(--color-raise)" strokeWidth="4" />
          <text x="250" y="175" fontSize="9">Г-образный вход</text>
          <text x="60" y="205" fontSize="10" fill="var(--color-muted)">Осколки не проникают в жилую зону укрытия</text>
        </Plate>
      )}
      <figcaption>
        {caption ?? "Схема приёма."} {FIGURE_LICENSE}
      </figcaption>
    </figure>
  );
}
