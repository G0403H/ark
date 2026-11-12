import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  CyclePeriod,
  CycleSettings,
  DailyCycleLog,
  FlowIntensity,
  PainIntensity,
} from "./types.ts";
import { todayIso, addDaysIso } from "./calculations.ts";
import { registerPanicCallback } from "../tactical-security.ts";

export type CycleState = {
  periods: CyclePeriod[];
  dailyLogs: Record<string, DailyCycleLog>;
  settings: CycleSettings;

  startPeriod: (
    startDate?: string,
    flow?: FlowIntensity,
    pain?: PainIntensity,
  ) => string;
  endPeriod: (periodId?: string, endDate?: string) => void;
  deletePeriod: (id: string) => void;
  logDay: (date: string, data: Partial<DailyCycleLog>) => void;
  updateSettings: (newSettings: Partial<CycleSettings>) => void;
  addHygieneSupplies: (count: number) => void;
  consumeHygieneSupply: (count?: number) => void;
  clearCycleData: () => void;
};

const DEFAULT_SETTINGS: CycleSettings = {
  avgCycleLength: 28,
  avgPeriodLength: 5,
  lutealPhaseLength: 14,
  hygieneSuppliesCount: 20,
};

export const useCycleStore = create<CycleState>()(
  persist(
    (set, get) => ({
      periods: [],
      dailyLogs: {},
      settings: DEFAULT_SETTINGS,

      startPeriod: (
        startDate = todayIso(),
        flow: FlowIntensity = "medium",
        pain: PainIntensity = "mild",
      ) => {
        const id = crypto.randomUUID();
        const newPeriod: CyclePeriod = {
          id,
          startDate,
          flow,
          pain,
          created: Date.now(),
        };

        set((s) => ({
          periods: [
            newPeriod,
            ...s.periods.filter((p) => p.startDate !== startDate),
          ],
        }));

        // Also record in dailyLogs
        get().logDay(startDate, { flow, pain });
        get().consumeHygieneSupply(1);

        return id;
      },

      endPeriod: (periodId?: string, endDate = todayIso()) => {
        set((s) => {
          let target = periodId
            ? s.periods.find((p) => p.id === periodId)
            : s.periods[0];

          if (!target) return s;

          return {
            periods: s.periods.map((p) =>
              p.id === target.id
                ? {
                    ...p,
                    endDate:
                      endDate >= p.startDate
                        ? endDate
                        : addDaysIso(p.startDate, s.settings.avgPeriodLength),
                  }
                : p,
            ),
          };
        });
      },

      deletePeriod: (id) =>
        set((s) => ({
          periods: s.periods.filter((p) => p.id !== id),
        })),

      logDay: (date, data) =>
        set((s) => {
          const current = s.dailyLogs[date] || { date, symptoms: [] };
          return {
            dailyLogs: {
              ...s.dailyLogs,
              [date]: {
                ...current,
                ...data,
                symptoms: data.symptoms || current.symptoms || [],
              },
            },
          };
        }),

      updateSettings: (newSettings) =>
        set((s) => ({
          settings: { ...s.settings, ...newSettings },
        })),

      addHygieneSupplies: (count) =>
        set((s) => ({
          settings: {
            ...s.settings,
            hygieneSuppliesCount: Math.max(
              0,
              s.settings.hygieneSuppliesCount + count,
            ),
          },
        })),

      consumeHygieneSupply: (count = 1) =>
        set((s) => ({
          settings: {
            ...s.settings,
            hygieneSuppliesCount: Math.max(
              0,
              s.settings.hygieneSuppliesCount - count,
            ),
          },
        })),

      clearCycleData: () =>
        set({
          periods: [],
          dailyLogs: {},
          settings: DEFAULT_SETTINGS,
        }),
    }),
    {
      name: "kovcheg-cycle-storage-v1",
    },
  ),
);

// Register panic wipe callback so duress code purges intimate cycle logs
registerPanicCallback(() => {
  try {
    useCycleStore.getState().clearCycleData();
  } catch (err) {
    console.error("Failed to wipe cycle data on panic:", err);
  }
});
