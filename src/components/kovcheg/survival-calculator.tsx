import { useState, useMemo } from "react";
import { Calculator, Droplets, Flame, Package } from "lucide-react";
import { useArk } from "@/lib/kovcheg/store";
import { t } from "@/lib/kovcheg/i18n";
import { CustomSelect } from "@/components/kovcheg/custom-select";

export function SurvivalCalculator() {
  const lang = useArk((s) => s.lang) ?? "ru";

  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(1);
  const [climate, setClimate] = useState<"moderate" | "heat" | "cold">("moderate");
  const [activity, setActivity] = useState<"low" | "medium" | "high">("medium");
  const [days, setDays] = useState<number>(7);

  const calc = useMemo(() => {
    // Water per adult per day (drinking)
    let baseWaterPerAdult = 2.5; // liters
    if (climate === "heat") baseWaterPerAdult = 4.5;
    if (climate === "cold") baseWaterPerAdult = 3.0; // dry air causes respiratory water loss

    if (activity === "high") baseWaterPerAdult += 1.5;
    if (activity === "low") baseWaterPerAdult -= 0.5;

    // Child water ~ 65% of adult
    const baseWaterPerChild = baseWaterPerAdult * 0.65;

    // Sanitation & cooking water per person per day
    const hygieneWaterPerPerson = 1.5;

    const totalPersons = adults + children;
    const dailyDrinkingWater = adults * baseWaterPerAdult + children * baseWaterPerChild;
    const dailySanitationWater = totalPersons * hygieneWaterPerPerson;
    const totalDailyWater = dailyDrinkingWater + dailySanitationWater;
    const totalWaterPeriod = Math.round(totalDailyWater * days);

    // Calories per day
    let baseCaloriesAdult = 2200;
    if (climate === "cold") baseCaloriesAdult += 600; // thermoregulation
    if (climate === "heat") baseCaloriesAdult -= 200;

    if (activity === "high") baseCaloriesAdult += 1000;
    if (activity === "low") baseCaloriesAdult -= 400;

    const baseCaloriesChild = Math.round(baseCaloriesAdult * 0.7);

    const dailyCaloriesTotal = adults * baseCaloriesAdult + children * baseCaloriesChild;
    const totalCaloriesPeriod = dailyCaloriesTotal * days;

    // Salt / Electrolytes (5-8g per person per day, higher in heat)
    const saltPerPersonDay = climate === "heat" ? 9 : 6;
    const totalSaltGrams = Math.round(totalPersons * saltPerPersonDay * days);

    // Food weight breakdown (dry rations: ~500g dry food provides ~2000 kcal)
    const totalDryFoodKg = ((totalCaloriesPeriod / 4000) * 1.1).toFixed(1);

    return {
      totalWaterPeriod,
      dailyDrinkingWater: dailyDrinkingWater.toFixed(1),
      dailySanitationWater: dailySanitationWater.toFixed(1),
      totalCaloriesPeriod: totalCaloriesPeriod.toLocaleString(),
      dailyCaloriesTotal: dailyCaloriesTotal.toLocaleString(),
      totalSaltGrams,
      totalDryFoodKg,
      cerealsKg: ((parseFloat(totalDryFoodKg) * 0.55)).toFixed(1),
      cannedMeatKg: ((parseFloat(totalDryFoodKg) * 0.30)).toFixed(1),
      fatsOilKg: ((parseFloat(totalDryFoodKg) * 0.15)).toFixed(1),
    };
  }, [adults, children, climate, activity, days]);

  return (
    <div
      style={{
        background: "var(--color-raise)",
        border: "1px solid var(--color-line)",
        borderRadius: "var(--radius-card)",
        padding: "1rem",
        margin: "0.8rem 0",
      }}
    >
      <h3 style={{ margin: "0 0 0.8rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <Calculator size={18} color="var(--color-lamp)" />
        {t("scTitle", lang)}
      </h3>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.6rem", marginBottom: "0.8rem" }}>
        <div>
          <label className="meta">{t("scAdults", lang)}</label>
          <input
            type="number"
            min={1}
            max={20}
            className="search-field"
            style={{ margin: 0, padding: "0.3rem 0.5rem" }}
            value={adults}
            onChange={(e) => setAdults(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>

        <div>
          <label className="meta">{t("scChildren", lang)}</label>
          <input
            type="number"
            min={0}
            max={20}
            className="search-field"
            style={{ margin: 0, padding: "0.3rem 0.5rem" }}
            value={children}
            onChange={(e) => setChildren(Math.max(0, parseInt(e.target.value) || 0))}
          />
        </div>

        <div>
          <label className="meta">{t("scClimate", lang)}</label>
          <CustomSelect
            fullWidth
            value={climate}
            onChange={(val) => setClimate(val as any)}
            options={[
              { value: "moderate", label: t("scClimateModerate", lang) },
              { value: "heat", label: t("scClimateHeat", lang) },
              { value: "cold", label: t("scClimateCold", lang) },
            ]}
          />
        </div>

        <div>
          <label className="meta">{t("scActivity", lang)}</label>
          <CustomSelect
            fullWidth
            value={activity}
            onChange={(val) => setActivity(val as any)}
            options={[
              { value: "low", label: t("scActivityLow", lang) },
              { value: "medium", label: t("scActivityMedium", lang) },
              { value: "high", label: t("scActivityHigh", lang) },
            ]}
          />
        </div>

        <div>
          <label className="meta">{t("scPeriod", lang)}</label>
          <CustomSelect
            fullWidth
            value={days}
            onChange={(val) => setDays(Number(val) || 7)}
            options={[
              { value: 3, label: t("scDays3", lang) },
              { value: 7, label: t("scDays7", lang) },
              { value: 14, label: t("scDays14", lang) },
              { value: 30, label: t("scDays30", lang) },
            ]}
          />
        </div>
      </div>

      {/* Calculated Results Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "0.6rem",
          background: "var(--color-bg)",
          padding: "0.8rem",
          borderRadius: "var(--radius-card)",
          marginTop: "0.8rem",
        }}
      >
        <div>
          <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#38bdf8", fontWeight: "bold", fontSize: "0.85rem" }}>
            <Droplets size={16} /> {t("scTotalWater", lang)} ({days} d):
          </span>
          <div style={{ fontSize: "1.4rem", fontWeight: "bold", margin: "0.2rem 0" }}>
            {calc.totalWaterPeriod} {lang === "ar" ? "لتر" : lang === "en" ? "L" : "л"}
          </div>
          <p className="meta" style={{ margin: 0 }}>
            {calc.dailyDrinkingWater} {lang === "ar" ? "ل/يوم" : "L/d"} + {calc.dailySanitationWater} {lang === "ar" ? "لتر تحضير" : "L prep"}
          </p>
        </div>

        <div>
          <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--color-lamp)", fontWeight: "bold", fontSize: "0.85rem" }}>
            <Flame size={16} /> {t("scTotalCalories", lang)}:
          </span>
          <div style={{ fontSize: "1.4rem", fontWeight: "bold", margin: "0.2rem 0" }}>
            {calc.totalCaloriesPeriod} {lang === "ar" ? "سعرة" : "kcal"}
          </div>
          <p className="meta" style={{ margin: 0 }}>
            {calc.dailyCaloriesTotal} {lang === "ar" ? "سعرة/يوم" : "kcal/day"}
          </p>
        </div>

        <div>
          <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#a1a1aa", fontWeight: "bold", fontSize: "0.85rem" }}>
            <Package size={16} /> {t("scDryFoodWeight", lang)}:
          </span>
          <div style={{ fontSize: "1.4rem", fontWeight: "bold", margin: "0.2rem 0" }}>
            ~{calc.totalDryFoodKg} {lang === "ar" ? "كغ" : "kg"}
          </div>
          <p className="meta" style={{ margin: 0 }}>
            {lang === "ar"
              ? `حبوب: ${calc.cerealsKg} كغ · معلبات: ${calc.cannedMeatKg} كغ · زيوت: ${calc.fatsOilKg} كغ`
              : lang === "en"
              ? `Grains: ${calc.cerealsKg} kg · Canned: ${calc.cannedMeatKg} kg · Fats: ${calc.fatsOilKg} kg`
              : `Крупы: ${calc.cerealsKg} кг · Консервы: ${calc.cannedMeatKg} кг · Масла: ${calc.fatsOilKg} кг`}
          </p>
        </div>

        <div>
          <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#f87171", fontWeight: "bold", fontSize: "0.85rem" }}>
            🧂 {t("scSaltElectrolytes", lang)}:
          </span>
          <div style={{ fontSize: "1.4rem", fontWeight: "bold", margin: "0.2rem 0" }}>
            {calc.totalSaltGrams} {lang === "ar" ? "غرام" : "g"}
          </div>
          <p className="meta" style={{ margin: 0 }}>
            {t("scSaltNote", lang)}
          </p>
        </div>
      </div>
    </div>
  );
}
