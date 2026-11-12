import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Calendar as CalendarIcon,
  Heart,
  Droplet,
  Shield,
  AlertCircle,
  Plus,
  Minus,
  CheckCircle2,
  Sparkles,
  Info,
  ChevronLeft,
  ChevronRight,
  Flame,
  Thermometer,
} from "lucide-react";
import { useCycleStore } from "@/lib/kovcheg/cycle/store";
import {
  calculateCycleStatus,
  todayIso,
  parseDate,
  addDaysIso,
} from "@/lib/kovcheg/cycle/calculations";
import type { FlowIntensity, PainIntensity } from "@/lib/kovcheg/cycle/types";
import { CodeWordGate } from "@/components/kovcheg/code-word-gate";
import { useArk } from "@/lib/kovcheg/store";

export const Route = createFileRoute("/cycle")({
  component: CyclePage,
});

export function CyclePage() {
  const lang = useArk((s) => s.lang) ?? "ru";
  const periods = useCycleStore((s) => s.periods);
  const dailyLogs = useCycleStore((s) => s.dailyLogs);
  const settings = useCycleStore((s) => s.settings);
  const startPeriod = useCycleStore((s) => s.startPeriod);
  const endPeriod = useCycleStore((s) => s.endPeriod);
  const logDay = useCycleStore((s) => s.logDay);
  const addHygieneSupplies = useCycleStore((s) => s.addHygieneSupplies);
  const updateSettings = useCycleStore((s) => s.updateSettings);

  const today = todayIso();
  const status = calculateCycleStatus(periods, settings, today);

  // Month navigation for visual calendar
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(today);

  // Daily log form state
  const currentLog = dailyLogs[selectedDate] || { date: selectedDate, symptoms: [] };
  const [logFlow, setLogFlow] = useState<FlowIntensity>(currentLog.flow || "medium");
  const [logPain, setLogPain] = useState<PainIntensity>(currentLog.pain || "none");
  const [logNotes, setLogNotes] = useState(currentLog.notes || "");
  const [logTemp, setLogTemp] = useState<string>(
    currentLog.temperature ? String(currentLog.temperature) : "",
  );
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(
    currentLog.symptoms || [],
  );

  // Active guide tab
  const [activeGuide, setActiveGuide] = useState<number | null>(0);

  function prevMonth() {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  function nextMonth() {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  function handleSaveDailyLog(e: React.FormEvent) {
    e.preventDefault();
    logDay(selectedDate, {
      flow: logFlow,
      pain: logPain,
      notes: logNotes.trim(),
      temperature: logTemp ? parseFloat(logTemp) : undefined,
      symptoms: selectedSymptoms,
    });
    alert(
      lang === "ar"
        ? "تم حفظ بيانات اليوم بنجاح"
        : lang === "en"
        ? "Day log saved successfully"
        : "Данные за день успешно сохранены",
    );
  }

  function toggleSymptom(symKey: string) {
    setSelectedSymptoms((prev) =>
      prev.includes(symKey)
        ? prev.filter((x) => x !== symKey)
        : [...prev, symKey],
    );
  }

  // Generate calendar grid for viewDate
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNamesRu = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
  ];
  const monthNamesEn = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthNamesAr = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];

  const monthLabel =
    lang === "ar"
      ? `${monthNamesAr[month]} ${year}`
      : lang === "en"
      ? `${monthNamesEn[month]} ${year}`
      : `${monthNamesRu[month]} ${year}`;

  const weekDays =
    lang === "ar"
      ? ["إث", "ثل", "أر", "خم", "جم", "سب", "أح"]
      : lang === "en"
      ? ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
      : ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  const symptomList = [
    { id: "cramps", ru: "Спазмы внизу живота", en: "Pelvic cramps", ar: "تقلصات الحوض" },
    { id: "headache", ru: "Головная боль", en: "Headache / Migraine", ar: "صداع أو شقيقة" },
    { id: "backpain", ru: "Боль в пояснице", en: "Lower back pain", ar: "ألم أسفل الظهر" },
    { id: "fatigue", ru: "Слабость / утомляемость", en: "Fatigue / Weakness", ar: "إرهاق وضعف عام" },
    { id: "mood", ru: "Перепады настроения / тревога", en: "Mood swings / Anxiety", ar: "تقلبات المزاج والقلق" },
    { id: "chills", ru: "Озноб / термонестабильность", en: "Chills / Shivering", ar: "قشعريرة وبرودة" },
    { id: "nausea", ru: "Тошнота / ЖКТ", en: "Nausea / GI distress", ar: "غثيان أو اضطراب هضمي" },
  ];

  return (
    <main style={{ paddingBottom: "3rem" }}>
      <div className="row-between" style={{ alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <h1 className="screen-title" style={{ margin: "0 0 0.2rem" }}>
            {lang === "ar"
              ? "تقويم الدورة وصحة المرأة الميدانية"
              : lang === "en"
              ? "Women's Cycle & Field Reproductive Health"
              : "Женский календарь и здоровье в ЧС"}
          </h1>
          <p className="quiet" style={{ margin: 0 }}>
            {lang === "ar"
              ? "متابعة الدورة الشهرية، نافذة الخصوبة، ترشيد المؤن الطبية، والتعامل مع انقطاع الطمث بسبب صدمات الحرب والبرد."
              : lang === "en"
              ? "Menstrual tracking, fertile windows, hygiene rations, and stress-amenorrhea field guidance."
              : "Отслеживание цикла, окно фертильности, учет средств гигиены и преодоление стресс-аменореи ЧС."}
          </p>
        </div>
      </div>

      {/* Code word protection wrapper */}
      <div style={{ marginTop: "1rem" }}>
        <CodeWordGate
          featureName={
            lang === "ar"
              ? "تقويم الدورة الشهرية والسجلات الخاصة"
              : lang === "en"
              ? "Women's Cycle Calendar & Private Records"
              : "Женский календарь и интимные записи"
          }
        >
          {/* Cycle Status Summary Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "0.6rem",
              marginTop: "1rem",
              marginBottom: "1.2rem",
            }}
          >
            {/* Day of Cycle Card */}
            <div
              className="card-block"
              style={{
                margin: 0,
                padding: "0.8rem",
                borderLeft: "4px solid #ec4899",
                background: "var(--color-surface)",
              }}
            >
              <p className="meta" style={{ margin: "0 0 0.2rem", color: "#ec4899", fontWeight: "bold" }}>
                {lang === "ar" ? "اليوم من الدورة" : lang === "en" ? "Cycle Day" : "День цикла"}
              </p>
              <strong style={{ fontSize: "1.3rem" }}>
                {status.currentDay} {lang === "ar" ? "يوم" : lang === "en" ? "day" : "день"}
              </strong>
              <span className="meta" style={{ display: "block", marginTop: "0.2rem" }}>
                {status.phase === "menstrual" && (lang === "ar" ? "🩸 فترة الحيض" : lang === "en" ? "🩸 Menstrual Flow" : "🩸 Менструация")}
                {status.phase === "follicular" && (lang === "ar" ? "🌱 المرحلة الجريبية" : lang === "en" ? "🌱 Follicular Phase" : "🌱 Фолликулярная")}
                {status.phase === "ovulation" && (lang === "ar" ? "✨ الإباضة والخصوبة" : lang === "en" ? "✨ Ovulation Window" : "✨ Овуляция (Фертильность)")}
                {status.phase === "luteal" && (lang === "ar" ? "🌙 المرحلة الأصفرية" : lang === "en" ? "🌙 Luteal Phase" : "🌙 Лютеиновая фаза")}
              </span>
            </div>

            {/* Next Period Forecast Card */}
            <div
              className="card-block"
              style={{
                margin: 0,
                padding: "0.8rem",
                borderLeft: `4px solid ${status.isDelayed ? "#ef4444" : "var(--color-lamp)"}`,
                background: "var(--color-surface)",
              }}
            >
              <p className="meta" style={{ margin: "0 0 0.2rem" }}>
                {status.isDelayed
                  ? (lang === "ar" ? "تأخر الدورة" : lang === "en" ? "Period Delayed" : "Задержка")
                  : (lang === "ar" ? "الدورة القادمة" : lang === "en" ? "Next Period" : "Следующие")}
              </p>
              <strong style={{ fontSize: "1.2rem", color: status.isDelayed ? "#ef4444" : "inherit" }}>
                {status.isDelayed
                  ? `${status.delayedDays} ${lang === "ar" ? "أيام" : lang === "en" ? "days late" : "дн. задержки"}`
                  : `${status.daysUntilNextPeriod} ${lang === "ar" ? "أيام متبقية" : lang === "en" ? "days away" : "дн. осталось"}`}
              </strong>
              <span className="meta" style={{ display: "block", marginTop: "0.2rem" }}>
                {status.nextPeriodDate}
              </span>
            </div>

            {/* Fertile Window / Ovulation Card */}
            <div
              className="card-block"
              style={{
                margin: 0,
                padding: "0.8rem",
                borderLeft: "4px solid #f59e0b",
                background: "var(--color-surface)",
              }}
            >
              <p className="meta" style={{ margin: "0 0 0.2rem", color: "#f59e0b" }}>
                {lang === "ar" ? "ذروة الإباضة" : lang === "en" ? "Ovulation Peak" : "Овуляция"}
              </p>
              <strong style={{ fontSize: "1.1rem" }}>{status.ovulationDate}</strong>
              <span className="meta" style={{ display: "block", marginTop: "0.2rem" }}>
                {lang === "ar" ? "نافذة الخصوبة:" : lang === "en" ? "Fertile:" : "Окно:"} {status.fertileWindowStart.slice(5)} – {status.fertileWindowEnd.slice(5)}
              </span>
            </div>

            {/* Field Hygiene Rations Card */}
            <div
              className="card-block"
              style={{
                margin: 0,
                padding: "0.8rem",
                borderLeft: "4px solid #38bdf8",
                background: "var(--color-surface)",
              }}
            >
              <p className="meta" style={{ margin: "0 0 0.2rem", color: "#38bdf8" }}>
                {lang === "ar" ? "مؤن النظافة الميدانية" : lang === "en" ? "Hygiene Rations" : "Запас средств гигиены"}
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem" }}>
                <strong style={{ fontSize: "1.2rem" }}>{settings.hygieneSuppliesCount}</strong>
                <span className="meta">{lang === "ar" ? "قطعة" : lang === "en" ? "units" : "шт"}</span>
              </div>
              <span className="meta" style={{ display: "block", marginTop: "0.2rem" }}>
                ~{status.suppliesDaysRemaining} {lang === "ar" ? "يوم استقلالية" : lang === "en" ? "days autonomy" : "дн. автономности"}
              </span>
            </div>
          </div>

          {/* Delayed Period Warning & Clinical Explanation */}
          {status.isDelayed && (
            <div
              className="warn"
              style={{
                marginBottom: "1.2rem",
                borderLeft: "4px solid #ef4444",
                background: "rgba(239, 68, 68, 0.1)",
              }}
            >
              <strong style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#f87171" }}>
                <AlertCircle size={16} />
                {lang === "ar"
                  ? `تنبيه: تأخر الدورة الشهرية بمقدار ${status.delayedDays} أيام`
                  : lang === "en"
                  ? `Notice: Menstrual cycle delayed by ${status.delayedDays} days`
                  : `Внимание: задержка менструального цикла на ${status.delayedDays} дн.`}
              </strong>
              <p style={{ margin: "0.4rem 0 0", fontSize: "0.85rem", lineHeight: "1.5" }}>
                {lang === "ar"
                  ? "في ظروف النزاعات المسلحة والبرد الشديد ونقص التغذية، يُعد تأخر الدورة أو انقطاعها (Amenorrhea) استجابة فسيولوجية طبيعية لارتفاع هرمونات الإجهاد (الكورتيزول). إذا كان هناك اتصال جنسي غير محمي، فقد يشير التأخر إلى حمل."
                  : lang === "en"
                  ? "In extreme conflict conditions, hypothermia, shock, and calorie deficits, delayed periods or temporary amenorrhea are natural physiological responses to cortisol surges. In the event of sexual contact, pregnancy remains a possibility."
                  : "В условиях боевых действий, холода, психотравм и дефицита калорий задержка цикла (стресс-аменорея) — частая естественная защитная реакция организма на всплеск кортизола и пролактина. При наличии незащищенного контакта исключайте беременность."}
              </p>
            </div>
          )}

          {/* Quick Action Buttons */}
          <div
            style={{
              display: "flex",
              gap: "0.6rem",
              flexWrap: "wrap",
              marginBottom: "1.2rem",
              padding: "0.8rem",
              background: "var(--color-surface)",
              borderRadius: "var(--radius-card)",
              border: "1px solid var(--color-line)",
            }}
          >
            <button
              type="button"
              className="text-btn"
              onClick={() => {
                startPeriod(today, "medium", "mild");
              }}
              style={{
                background: "rgba(236, 72, 153, 0.15)",
                color: "#f472b6",
                border: "1px solid rgba(236, 72, 153, 0.4)",
                fontWeight: "bold",
              }}
            >
              🩸 {lang === "ar" ? "بدأت الدورة اليوم" : lang === "en" ? "Period Started Today" : "Начались месячные сегодня"}
            </button>

            {status.isCurrentlyInPeriod && (
              <button
                type="button"
                className="text-btn"
                onClick={() => endPeriod(undefined, today)}
                style={{
                  background: "rgba(34, 197, 94, 0.15)",
                  color: "#4ade80",
                  border: "1px solid rgba(34, 197, 94, 0.4)",
                  fontWeight: "bold",
                }}
              >
                ✓ {lang === "ar" ? "انتهت الدورة اليوم" : lang === "en" ? "Period Ended Today" : "Закончились сегодня"}
              </button>
            )}

            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span className="meta" style={{ fontSize: "0.8rem" }}>
                {lang === "ar" ? "تعديل المؤن:" : lang === "en" ? "Stock:" : "Запас:"}
              </span>
              <button
                type="button"
                className="icon-btn"
                onClick={() => addHygieneSupplies(5)}
                title="+5 шт"
                style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}
              >
                +5
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => addHygieneSupplies(-1)}
                title="-1 шт"
                style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}
              >
                -1
              </button>
            </div>
          </div>

          {/* Visual Interactive Month Calendar */}
          <div className="card-block" style={{ padding: "1rem", marginBottom: "1.2rem" }}>
            <div className="row-between" style={{ marginBottom: "0.8rem" }}>
              <strong style={{ fontSize: "1.05rem", textTransform: "capitalize" }}>
                <CalendarIcon size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
                {monthLabel}
              </strong>
              <div style={{ display: "flex", gap: "0.3rem" }}>
                <button type="button" className="icon-btn" onClick={prevMonth} style={{ padding: "0.2rem 0.5rem" }}>
                  <ChevronLeft size={16} />
                </button>
                <button type="button" className="icon-btn" onClick={nextMonth} style={{ padding: "0.2rem 0.5rem" }}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Week header */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", marginBottom: "0.4rem" }}>
              {weekDays.map((wd) => (
                <span key={wd} className="meta" style={{ fontSize: "0.75rem", fontWeight: "bold" }}>
                  {wd}
                </span>
              ))}
            </div>

            {/* Days grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} style={{ height: "36px" }} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateIso = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                const isToday = dateIso === today;
                const isSelected = dateIso === selectedDate;

                // Check period day
                const isPeriodDay = periods.some((p) => {
                  const end = p.endDate || addDaysIso(p.startDate, settings.avgPeriodLength - 1);
                  return dateIso >= p.startDate && dateIso <= end;
                });

                // Check ovulation day or fertile window
                const isOvulationDay = dateIso === status.ovulationDate;
                const isFertile = dateIso >= status.fertileWindowStart && dateIso <= status.fertileWindowEnd;

                // Check predicted future period
                const isPredictedPeriod =
                  dateIso >= status.nextPeriodDate &&
                  dateIso <= addDaysIso(status.nextPeriodDate, settings.avgPeriodLength - 1);

                // Check logged day
                const hasLog = Boolean(dailyLogs[dateIso]);

                let bg = "transparent";
                let color = "inherit";
                let border = "1px solid transparent";

                if (isPeriodDay) {
                  bg = "rgba(236, 72, 153, 0.3)";
                  color = "#f472b6";
                } else if (isOvulationDay) {
                  bg = "rgba(245, 158, 11, 0.35)";
                  color = "#fbbf24";
                } else if (isFertile) {
                  bg = "rgba(245, 158, 11, 0.15)";
                  color = "#fcd34d";
                } else if (isPredictedPeriod) {
                  border = "1px dashed #ec4899";
                }

                if (isSelected) {
                  border = "2px solid var(--color-lamp)";
                }

                return (
                  <button
                    key={dateIso}
                    type="button"
                    onClick={() => {
                      setSelectedDate(dateIso);
                      const existing = dailyLogs[dateIso];
                      if (existing) {
                        setLogFlow(existing.flow || "medium");
                        setLogPain(existing.pain || "none");
                        setLogNotes(existing.notes || "");
                        setLogTemp(existing.temperature ? String(existing.temperature) : "");
                        setSelectedSymptoms(existing.symptoms || []);
                      } else {
                        setLogFlow("medium");
                        setLogPain("none");
                        setLogNotes("");
                        setLogTemp("");
                        setSelectedSymptoms([]);
                      }
                    }}
                    style={{
                      height: "36px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "4px",
                      background: bg,
                      color: color,
                      border: border,
                      fontWeight: isToday || isPeriodDay ? "bold" : "normal",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      position: "relative",
                    }}
                  >
                    <span>{dayNum}</span>
                    {hasLog && (
                      <span
                        style={{
                          width: "4px",
                          height: "4px",
                          borderRadius: "50%",
                          background: "var(--color-lamp)",
                          position: "absolute",
                          bottom: "3px",
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", marginTop: "0.8rem", fontSize: "0.75rem" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                <span style={{ width: 10, height: 10, background: "rgba(236, 72, 153, 0.4)", borderRadius: 2 }} />
                {lang === "ar" ? "أيام الحيض" : lang === "en" ? "Menstruation" : "Месячные"}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                <span style={{ width: 10, height: 10, background: "rgba(245, 158, 11, 0.4)", borderRadius: 2 }} />
                {lang === "ar" ? "نافذة الخصوبة / الإباضة" : lang === "en" ? "Fertile / Ovulation" : "Овуляция / Фертильность"}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                <span style={{ width: 10, height: 10, border: "1px dashed #ec4899", borderRadius: 2 }} />
                {lang === "ar" ? "توقع الدورة القادمة" : lang === "en" ? "Forecasted Period" : "Прогноз"}
              </span>
            </div>
          </div>

          {/* Daily Symptoms & Notes Log Form */}
          <div className="card-block" style={{ padding: "1rem", marginBottom: "1.5rem" }}>
            <h3 style={{ margin: "0 0 0.6rem", fontSize: "1rem" }}>
              {lang === "ar"
                ? `تسجيل الأعراض والملاحظات ليوم: ${selectedDate}`
                : lang === "en"
                ? `Daily Symptoms & Record for: ${selectedDate}`
                : `Запись симптомов и заметок на: ${selectedDate}`}
            </h3>

            <form onSubmit={handleSaveDailyLog}>
              {/* Flow & Pain selectors */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.8rem", marginBottom: "0.8rem" }}>
                <div>
                  <label className="meta" style={{ display: "block", marginBottom: "0.2rem" }}>
                    {lang === "ar" ? "شدة النزيف / الإفرازات:" : lang === "en" ? "Flow Intensity:" : "Интенсивность выделений:"}
                  </label>
                  <select
                    className="select"
                    value={logFlow}
                    onChange={(e) => setLogFlow(e.target.value as FlowIntensity)}
                    style={{ width: "100%", margin: 0 }}
                  >
                    <option value="spotting">{lang === "ar" ? "قطرات خفيفة (Spotting)" : lang === "en" ? "Spotting" : "Мажущие (Spotting)"}</option>
                    <option value="light">{lang === "ar" ? "خفيفة" : lang === "en" ? "Light" : "Скудные"}</option>
                    <option value="medium">{lang === "ar" ? "متوسطة" : lang === "en" ? "Medium" : "Умеренные"}</option>
                    <option value="heavy">{lang === "ar" ? "غزيرة" : lang === "en" ? "Heavy" : "Обильные"}</option>
                  </select>
                </div>

                <div>
                  <label className="meta" style={{ display: "block", marginBottom: "0.2rem" }}>
                    {lang === "ar" ? "شدة الألم والتقلصات:" : lang === "en" ? "Cramps & Pain:" : "Боль и спазмы:"}
                  </label>
                  <select
                    className="select"
                    value={logPain}
                    onChange={(e) => setLogPain(e.target.value as PainIntensity)}
                    style={{ width: "100%", margin: 0 }}
                  >
                    <option value="none">{lang === "ar" ? "لا يوجد ألم" : lang === "en" ? "None" : "Нет боли"}</option>
                    <option value="mild">{lang === "ar" ? "ألم طفيف" : lang === "en" ? "Mild" : "Слабые спазмы"}</option>
                    <option value="moderate">{lang === "ar" ? "متوسط" : lang === "en" ? "Moderate" : "Умеренные боли"}</option>
                    <option value="severe">{lang === "ar" ? "شديد / معيق للحركة" : lang === "en" ? "Severe" : "Сильные спазмы"}</option>
                  </select>
                </div>
              </div>

              {/* Symptoms Checklist */}
              <div style={{ marginBottom: "0.8rem" }}>
                <label className="meta" style={{ display: "block", marginBottom: "0.3rem" }}>
                  {lang === "ar" ? "الأعراض المصاحبة:" : lang === "en" ? "Symptoms:" : "Сопутствующие симптомы:"}
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                  {symptomList.map((sym) => {
                    const isSelected = selectedSymptoms.includes(sym.id);
                    return (
                      <button
                        key={sym.id}
                        type="button"
                        onClick={() => toggleSymptom(sym.id)}
                        className={`chip ${isSelected ? "chip-active" : ""}`}
                        data-on={isSelected ? "1" : "0"}
                        style={{
                          fontSize: "0.8rem",
                          padding: "0.2rem 0.6rem",
                          background: isSelected ? "var(--color-lamp)" : "var(--color-raise)",
                          color: isSelected ? "var(--color-ink)" : "inherit",
                        }}
                      >
                        {sym[lang] || sym.ru}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Basal Temperature (optional) */}
              <div style={{ marginBottom: "0.8rem" }}>
                <label className="meta" style={{ display: "block", marginBottom: "0.2rem" }}>
                  {lang === "ar"
                    ? "درجة حرارة الجسم الصباحية (°م) (اختياري لتتبع التبويض):"
                    : lang === "en"
                    ? "Basal Body Temperature (°C) (optional for ovulation):"
                    : "Базальная температура тела (°C) (для контроля овуляции):"}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="35.0"
                  max="41.0"
                  className="search-field"
                  placeholder="36.6"
                  value={logTemp}
                  onChange={(e) => setLogTemp(e.target.value)}
                  style={{ maxWidth: "160px" }}
                />
              </div>

              {/* Notes textarea */}
              <div style={{ marginBottom: "0.8rem" }}>
                <label className="meta" style={{ display: "block", marginBottom: "0.2rem" }}>
                  {lang === "ar" ? "ملاحظات إضافية:" : lang === "en" ? "Personal Notes:" : "Личные заметки к этой дате:"}
                </label>
                <textarea
                  className="note-field"
                  rows={2}
                  placeholder={
                    lang === "ar"
                      ? "تسجيل ملاحظات صحية خاصة..."
                      : lang === "en"
                      ? "Intimate health notes..."
                      : "Заметки о самочувствии, приеме трав, расходе белья..."
                  }
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="text-btn"
                style={{
                  background: "var(--color-lamp)",
                  color: "var(--color-ink)",
                  fontWeight: "bold",
                }}
              >
                {lang === "ar" ? "حفظ السجل" : lang === "en" ? "Save Record" : "Сохранить запись"}
              </button>
            </form>
          </div>

          {/* Survival Field Guides for Women in Austere Conditions */}
          <section style={{ marginTop: "1.5rem" }}>
            <h2 className="section-title">
              {lang === "ar"
                ? "دليل النجاة الميداني لصحة المرأة في الطوارئ والحروب"
                : lang === "en"
                ? "Field Survival Guidelines for Women's Health in Disasters"
                : "Полевые медицинские памятки для женщин в условиях ЧС"}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {/* Card 1: Hygiene without tap water */}
              <div className="card-block" style={{ padding: "0.8rem 1rem", margin: 0 }}>
                <div
                  className="row-between"
                  style={{ cursor: "pointer" }}
                  onClick={() => setActiveGuide(activeGuide === 0 ? null : 0)}
                >
                  <strong style={{ fontSize: "0.95rem" }}>
                    💧 {lang === "ar" ? "النظافة الشخصية عند انعدام المياه الجارية" : lang === "en" ? "Hygiene Without Running Water" : "Гигиена при дефиците воды и отсутствии водопровода"}
                  </strong>
                  <span className="meta">{activeGuide === 0 ? "▲" : "▼"}</span>
                </div>
                {activeGuide === 0 && (
                  <div style={{ marginTop: "0.6rem", fontSize: "0.85rem", lineHeight: "1.6", color: "var(--color-muted)" }}>
                    <p>
                      <strong>1. Стерилизация многоразовой ткани:</strong> при отсутствии одноразовых прокладок используйте чистую хлопчатобумажную ткань или фланель. После использования замочите в холодной воде (горячая вода «заваривает» кровь в волокнах), затем прокипятите не менее 15 минут с добавлением соли или пищевой соды. Сушите строго на прямом солнце (солнечный ультрафиолет — мощнейший естественный дезинфектор).
                    </p>
                    <p>
                      <strong>2. Мох сфагнум как природный сорбент:</strong> высушенный мох сфагнум обладает природными бактерицидными свойствами (содержит сфагнол) и впитывает влагу в 20 раз больше собственного веса. Слой сфагнума, обернутый стерильным бинтом или чистой тканью, служит безопасной самодельной прокладкой в полевых условиях.
                    </p>
                    <p>
                      <strong>3. Менструальная чаша:</strong> самый автономный гигиенический предмет выживания (срок службы до 5–10 лет). Требует кипячения в чистой воде в течение 5 минут между циклами и чистых рук при опустошении.
                    </p>
                  </div>
                )}
              </div>

              {/* Card 2: Stress Amenorrhea */}
              <div className="card-block" style={{ padding: "0.8rem 1rem", margin: 0 }}>
                <div
                  className="row-between"
                  style={{ cursor: "pointer" }}
                  onClick={() => setActiveGuide(activeGuide === 1 ? null : 1)}
                >
                  <strong style={{ fontSize: "0.95rem" }}>
                    ⚠️ {lang === "ar" ? "انقطاع الطمث بسبب صدمات الحرب والبرد (Amenorrhea)" : lang === "en" ? "Wartime Stress-Induced Amenorrhea" : "Стресс-аменорея военного времени (почему пропадают месячные)"}
                  </strong>
                  <span className="meta">{activeGuide === 1 ? "▲" : "▼"}</span>
                </div>
                {activeGuide === 1 && (
                  <div style={{ marginTop: "0.6rem", fontSize: "0.85rem", lineHeight: "1.6", color: "var(--color-muted)" }}>
                    <p>
                      <strong>Физиология стресса:</strong> при внезапной эвакуации, обстрелах, резком переохлаждении или дефиците питания кора надпочечников выбрасывает критические дозы кортизола и адреналина. Гипоталамус мгновенно блокирует выработку гонадотропных гормонов, временно отключая овуляцию.
                    </p>
                    <p>
                      <strong>Это естественная защита организма:</strong> тело переходит в энергосберегающий режим выживания, предотвращая беременность в смертельно опасных условиях и экономя железо и кровь. Задержка может длиться от 1 до 6 месяцев. Паниковать не нужно — после стабилизации обстановки и восстановления тепла/питания цикл восстанавливается самостоятельно.
                    </p>
                  </div>
                )}
              </div>

              {/* Card 3: Non-pharmaceutical pain relief */}
              <div className="card-block" style={{ padding: "0.8rem 1rem", margin: 0 }}>
                <div
                  className="row-between"
                  style={{ cursor: "pointer" }}
                  onClick={() => setActiveGuide(activeGuide === 2 ? null : 2)}
                >
                  <strong style={{ fontSize: "0.95rem" }}>
                    🌿 {lang === "ar" ? "تخفيف آلام وتقلصات الدورة بدون أدوية" : lang === "en" ? "Cramp Relief Without Pharmaceuticals" : "Обезболивание спазмов без аптеки и таблеток"}
                  </strong>
                  <span className="meta">{activeGuide === 2 ? "▲" : "▼"}</span>
                </div>
                {activeGuide === 2 && (
                  <div style={{ marginTop: "0.6rem", fontSize: "0.85rem", lineHeight: "1.6", color: "var(--color-muted)" }}>
                    <p>
                      <strong>1. Сухое тепло:</strong> наполните металлическую флягу или пластиковую бутылку теплой (не кипящей!) водой, оберните сухим свитером или носком и положите на низ живота. Тепло расширяет спазмированные гладкие мышцы матки и снимает острую боль за 15–20 минут.
                    </p>
                    <p>
                      <strong>2. Позы эмбриона и разгрузка:</strong> лечь на бок, подтянув колени к груди, подложив валик под шею. Это снимает гравитационное давление на связки малого таза.
                    </p>
                    <p>
                      <strong>3. Полевые травяные отвары:</strong> ромашка аптечная (спазмолитик и противовоспалительное), мята перечная, тысячелистник и водяной перец (умеренно снижают кровопотерю при обильных выделениях).
                    </p>
                  </div>
                )}
              </div>

              {/* Card 4: Natural family planning */}
              <div className="card-block" style={{ padding: "0.8rem 1rem", margin: 0 }}>
                <div
                  className="row-between"
                  style={{ cursor: "pointer" }}
                  onClick={() => setActiveGuide(activeGuide === 3 ? null : 3)}
                >
                  <strong style={{ fontSize: "0.95rem" }}>
                    🗓️ {lang === "ar" ? "طريقة التنظيم الطبيعي وتجنب الحمل في الطوارئ" : lang === "en" ? "Austere Natural Family Planning (NFP)" : "Календарный метод предохранения при отсутствии средств контрацепции"}
                  </strong>
                  <span className="meta">{activeGuide === 3 ? "▲" : "▼"}</span>
                </div>
                {activeGuide === 3 && (
                  <div style={{ marginTop: "0.6rem", fontSize: "0.85rem", lineHeight: "1.6", color: "var(--color-muted)" }}>
                    <p>
                      <strong>Метод Огино-Кнауса:</strong> овуляция происходит примерно за 14 дней до начала следующих месячных. Сперматозоиды способны сохранять жизнеспособность в половых путях до 3–5 суток, а созревшая яйцеклетка жизнеспособна 24 часа.
                    </p>
                    <p>
                      <strong>Окно наивысшей фертильности:</strong> 5 дней до предполагаемой овуляции плюс 1 день после овуляции. При среднем цикле 28 дней наиболее рискованный интервал — с 9 по 16 день цикла.
                    </p>
                    <p>
                      <em>Внимание:</em> в условиях ЧС из-за стресса овуляция может непредсказуемо сдвигаться, поэтому метод не дает 100% гарантии, но является единственным ориентиром при отсутствии барьерной контрацепции.
                    </p>
                  </div>
                )}
              </div>

              {/* Card 5: Hypothermia prevention */}
              <div className="card-block" style={{ padding: "0.8rem 1rem", margin: 0 }}>
                <div
                  className="row-between"
                  style={{ cursor: "pointer" }}
                  onClick={() => setActiveGuide(activeGuide === 4 ? null : 4)}
                >
                  <strong style={{ fontSize: "0.95rem" }}>
                    🛡️ {lang === "ar" ? "الوقاية من التهابات الحوض وبرودة الملاجئ" : lang === "en" ? "Pelvic Cold & Cystitis Prevention" : "Защита от переохлаждения малого таза (цистит и аднексит в укрытиях)"}
                  </strong>
                  <span className="meta">{activeGuide === 4 ? "▲" : "▼"}</span>
                </div>
                {activeGuide === 4 && (
                  <div style={{ marginTop: "0.6rem", fontSize: "0.85rem", lineHeight: "1.6", color: "var(--color-muted)" }}>
                    <p>
                      <strong>Категорический запрет:</strong> никогда не садитесь прямо на бетонный пол подвала, сырую землю, холодные камни или металлические ящики. Теплопроводность бетона мгновенно охлаждает органы малого таза, вызывая острый бактериальный цистит и воспаление придатков.
                    </p>
                    <p>
                      <strong>Обязательная термоизоляция:</strong> сидеть только на туристической пенке-сидушке (каремате), сухих досках, сложенных шерстяных вещах или сухой соломе толщиной от 10 см. Поясница и низ живота должны быть закрыты удлиненной курткой или повязанным свитером.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </CodeWordGate>
      </div>
    </main>
  );
}
