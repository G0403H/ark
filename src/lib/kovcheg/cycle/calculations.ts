import type {
  CyclePeriod,
  CycleSettings,
  CycleStatus,
  CyclePhase,
} from "./types.ts";

export function todayIso(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDaysIso(iso: string, days: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function daysBetween(isoA: string, isoB: string): number {
  const da = parseDate(isoA);
  const db = parseDate(isoB);
  const diffMs = db.getTime() - da.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function calculateCycleStatus(
  periods: CyclePeriod[],
  settings: CycleSettings,
  currentIso: string = todayIso(),
): CycleStatus {
  const sorted = [...periods].sort(
    (a, b) => parseDate(b.startDate).getTime() - parseDate(a.startDate).getTime(),
  );

  const lastPeriod = sorted[0];

  if (!lastPeriod) {
    const nextDate = addDaysIso(currentIso, settings.avgCycleLength);
    return {
      currentDay: 1,
      phase: "follicular",
      phaseLabelKey: "cyclePhaseFollicular",
      nextPeriodDate: nextDate,
      daysUntilNextPeriod: settings.avgCycleLength,
      isDelayed: false,
      delayedDays: 0,
      ovulationDate: addDaysIso(currentIso, 14),
      fertileWindowStart: addDaysIso(currentIso, 9),
      fertileWindowEnd: addDaysIso(currentIso, 15),
      isCurrentlyInPeriod: false,
      suppliesDaysRemaining: Math.round(
        settings.hygieneSuppliesCount / (settings.avgPeriodLength > 0 ? 3 : 1),
      ),
    };
  }

  const daysSinceStart = daysBetween(lastPeriod.startDate, currentIso);
  const currentDay = Math.max(1, daysSinceStart + 1);

  // Check if currently inside active period
  const isPeriodOngoing =
    lastPeriod.endDate
      ? daysBetween(lastPeriod.startDate, currentIso) >= 0 &&
        daysBetween(currentIso, lastPeriod.endDate) >= 0
      : daysSinceStart >= 0 && daysSinceStart < settings.avgPeriodLength;

  const nextPeriodDate = addDaysIso(
    lastPeriod.startDate,
    settings.avgCycleLength,
  );
  const daysUntilNext = daysBetween(currentIso, nextPeriodDate);

  const isDelayed = daysUntilNext < 0;
  const delayedDays = isDelayed ? Math.abs(daysUntilNext) : 0;

  // Ovulation typically occurs (cycleLength - lutealPhaseLength) days after start
  const ovulationDayOffset = Math.max(
    1,
    settings.avgCycleLength - settings.lutealPhaseLength,
  );
  const ovulationDate = addDaysIso(lastPeriod.startDate, ovulationDayOffset);

  // Fertile window: 5 days prior to ovulation until 1 day post-ovulation
  const fertileWindowStart = addDaysIso(ovulationDate, -5);
  const fertileWindowEnd = addDaysIso(ovulationDate, 1);

  // Determine current phase
  let phase: CyclePhase = "follicular";
  let phaseLabelKey = "cyclePhaseFollicular";

  if (isPeriodOngoing) {
    phase = "menstrual";
    phaseLabelKey = "cyclePhaseMenstrual";
  } else if (
    currentIso >= fertileWindowStart &&
    currentIso <= fertileWindowEnd
  ) {
    phase = "ovulation";
    phaseLabelKey = "cyclePhaseOvulation";
  } else if (currentIso > fertileWindowEnd) {
    phase = "luteal";
    phaseLabelKey = "cyclePhaseLuteal";
  }

  // Calculate field hygiene supplies remaining
  const avgPadsPerPeriod = settings.avgPeriodLength * 3; // ~3 pads/cloths per day
  const cyclesCovered = avgPadsPerPeriod > 0
    ? settings.hygieneSuppliesCount / avgPadsPerPeriod
    : 0;
  const suppliesDaysRemaining = Math.round(cyclesCovered * settings.avgCycleLength);

  return {
    currentDay,
    phase,
    phaseLabelKey,
    nextPeriodDate,
    daysUntilNextPeriod: Math.max(0, daysUntilNext),
    isDelayed,
    delayedDays,
    ovulationDate,
    fertileWindowStart,
    fertileWindowEnd,
    isCurrentlyInPeriod: isPeriodOngoing,
    suppliesDaysRemaining,
  };
}
