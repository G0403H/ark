# Offline Data Packs & Compendiums

KOVCHEG comes pre-bundled with complete survival encyclopedias (~88 MB) while allowing users to import additional gigabytes of data on their mobile device without internet access.

---

## 1. Pre-Bundled Offline Library (~88 MB)

The repository includes complete field compendiums stored in `public/library/`:

| Identifier | Title | Language | Format | Size | Description |
|---|---|---|---|---|---|
| `survival-encyclopedia-ru` | Большая энциклопедия выживания и полевой медицины «КОВЧЕГ» | Russian | HTML | 9.8 MB | Full survival guide: MARCH, water filtration, shelters, CBRN, navigation |
| `survival-encyclopedia-en` | Comprehensive Wilderness Survival & Field Trauma Compendium | English | HTML | 9.8 MB | Complete wilderness & trauma manual: MARCH protocol, shelters, navigation |
| `survival-encyclopedia-ar` | موسوعة النجاة الميدانية الشاملة وطب الطوارئ «كوفشيج» | Arabic | HTML | 9.8 MB | Complete Arabic emergency compendium with desert survival & trauma care |
| `field-medicine-manual-ru` | Полевая неотложная медицина и травматология | Russian | TXT | 3.1 MB | Critical hemorrhage control, windlass tourniquets, chest seals, splints, shock |
| `field-medicine-manual-en` | Field Trauma Medicine & Emergency Care Handbook | English | TXT | 3.1 MB | Arterial hemorrhage control, windlass tourniquets, decompression, hypothermia |
| `field-medicine-manual-ar` | دليل طب الطوارئ والإسعافات الميدانية التكتيكية | Arabic | TXT | 3.1 MB | Tactical trauma care, pressure bandages, burns, and fracture immobilization |
| `extreme-bushcraft-guide-ru` | Автономное выживание в тайге, горах и тундре | Russian | TXT | 3.1 MB | Debris huts, Dakota fire pits, Nodya long fire, figure-4 deadfall traps |
| `extreme-bushcraft-guide-en` | Extreme Bushcraft, Shelter Engineering & Trapping | English | TXT | 3.1 MB | Sub-zero snow caves, Dakota fire holes, friction fire, deadfall traps |
| `civil-defense-cbrn-ru` | Гражданская оборона: защита от радиации, ОМП и ЧС | Russian | TXT | 2.7 MB | Nuclear flash protocols, fallout radiation decay (7/10 rule), shielding |
| `civil-defense-cbrn-en` | CBRN Defense & Nuclear Fallout Survival Guide | English | TXT | 2.7 MB | Flash protocols, fallout radiation decay, shielding halving layers |
| `civil-defense-cbrn-ar` | الدفاع المدني والوقاية من الإشعاعات النووية | Arabic | TXT | 2.7 MB | Nuclear protection, 7/10 fallout decay rule, radiation shielding thickness |
| `wartime-defense-manual-ru` | Военная безопасность, противодействие БПЛА и мины | Russian | TXT | 1.4 MB | Counter-FPV drone tactics, booby-trap awareness (IMAS), bombardment survival |
| `wartime-defense-manual-en` | Wartime Defense, Counter-UAS Tactics & Mine Risk | English | TXT | 1.4 MB | FPV drone evasion, thermal IR camouflage, Zero Touch booby trap rules (IMAS) |
| `wartime-defense-manual-ar` | دليل الدفاع في الحروب ومكافحة المسيرات والألغام | Arabic | TXT | 1.4 MB | Counter-UAV tactics, booby-trap awareness, thermal camouflage, artillery shelter |

---

## 2. Supported Formats for User Import

Users can import external files directly via the **Libraries & Documents** (`/libraries`) tab on their smartphone:

1. **HTML & SingleFile Web Archives**:
   - Ideal for saved offline Wikipedia articles, medical papers, or field guides with embedded CSS and images.
2. **TXT Plain Text**:
   - Lowest storage overhead. Extracted into searchable cards with paragraph boundary parsing.
3. **EPUB & PDF**:
   - Parsed locally on-device using client-side JavaScript extractors into readable text chunks.
4. **JSON / JSONL Data Packs**:
   - Structured survival card arrays containing `title`, `body`, `shelf`, and `keywords`.
