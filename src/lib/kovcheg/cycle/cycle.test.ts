import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateCycleStatus,
  todayIso,
  addDaysIso,
  daysBetween,
} from "./calculations.ts";
import { useCycleStore } from "./store.ts";
import type { CyclePeriod, CycleSettings } from "./types.ts";

describe("Women's Cycle Calculations & Predictive Logic", () => {
  const settings: CycleSettings = {
    avgCycleLength: 28,
    avgPeriodLength: 5,
    lutealPhaseLength: 14,
    hygieneSuppliesCount: 30,
  };

  it("calculates active period phase correctly", () => {
    const today = todayIso();
    const periods: CyclePeriod[] = [
      {
        id: "p1",
        startDate: today,
        created: Date.now(),
      },
    ];

    const status = calculateCycleStatus(periods, settings, today);
    assert.equal(status.currentDay, 1);
    assert.equal(status.isCurrentlyInPeriod, true);
    assert.equal(status.phase, "menstrual");
    assert.equal(status.isDelayed, false);
    assert.equal(status.daysUntilNextPeriod, 28);
  });

  it("calculates ovulation and fertile window correctly for 28-day cycle", () => {
    // Period started 13 days ago
    const start = addDaysIso(todayIso(), -13);
    const periods: CyclePeriod[] = [
      {
        id: "p1",
        startDate: start,
        endDate: addDaysIso(start, 4),
        created: Date.now(),
      },
    ];

    const status = calculateCycleStatus(periods, settings, todayIso());
    assert.equal(status.currentDay, 14);
    assert.equal(status.phase, "ovulation");
    assert.equal(status.isCurrentlyInPeriod, false);
    // Ovulation is day 14 (start + 14)
    assert.equal(status.ovulationDate, addDaysIso(start, 14));
  });

  it("accurately detects cycle delay and calculates late days", () => {
    // Period started 35 days ago (7 days overdue)
    const start = addDaysIso(todayIso(), -35);
    const periods: CyclePeriod[] = [
      {
        id: "p1",
        startDate: start,
        endDate: addDaysIso(start, 5),
        created: Date.now(),
      },
    ];

    const status = calculateCycleStatus(periods, settings, todayIso());
    assert.equal(status.isDelayed, true);
    assert.equal(status.delayedDays, 7);
    assert.equal(status.currentDay, 36);
  });

  it("calculates field hygiene supply autonomy days accurately", () => {
    // 30 supplies / (5 days * 3 pads/day = 15 per cycle) = 2 cycles = 56 days
    const periods: CyclePeriod[] = [
      {
        id: "p1",
        startDate: todayIso(),
        created: Date.now(),
      },
    ];

    const status = calculateCycleStatus(periods, settings, todayIso());
    assert.equal(status.suppliesDaysRemaining, 56);
  });
});

describe("Women's Cycle Zustand Store", () => {
  it("starts and ends period, logging day and consuming supply", () => {
    const store = useCycleStore.getState();
    store.clearCycleData();

    const id = store.startPeriod("2026-11-01", "heavy", "moderate");
    const stateAfterStart = useCycleStore.getState();
    assert.equal(stateAfterStart.periods.length, 1);
    assert.equal(stateAfterStart.periods[0].startDate, "2026-11-01");
    assert.equal(stateAfterStart.dailyLogs["2026-11-01"]?.flow, "heavy");
    assert.equal(stateAfterStart.settings.hygieneSuppliesCount, 19);

    store.endPeriod(id, "2026-11-06");
    const stateAfterEnd = useCycleStore.getState();
    assert.equal(stateAfterEnd.periods[0].endDate, "2026-11-06");

    store.logDay("2026-11-02", { pain: "severe", symptoms: ["cramps", "headache"] });
    const stateAfterLog = useCycleStore.getState();
    assert.deepEqual(stateAfterLog.dailyLogs["2026-11-02"].symptoms, ["cramps", "headache"]);

    store.addHygieneSupplies(10);
    assert.equal(useCycleStore.getState().settings.hygieneSuppliesCount, 29);
  });
});
