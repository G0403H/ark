export type FlowIntensity = "spotting" | "light" | "medium" | "heavy";
export type PainIntensity = "none" | "mild" | "moderate" | "severe";

export type CyclePhase = "menstrual" | "follicular" | "ovulation" | "luteal";

export type CyclePeriod = {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  flow?: FlowIntensity;
  pain?: PainIntensity;
  notes?: string;
  padsUsed?: number;
  symptoms?: string[];
  created: number;
};

export type DailyCycleLog = {
  date: string; // YYYY-MM-DD
  flow?: FlowIntensity;
  pain?: PainIntensity;
  symptoms: string[];
  temperature?: number; // Basal body temperature in °C
  padsUsed?: number;
  notes?: string;
};

export type CycleSettings = {
  avgCycleLength: number;   // default 28 days
  avgPeriodLength: number;  // default 5 days
  lutealPhaseLength: number; // default 14 days
  hygieneSuppliesCount: number; // Current stock of pads / tampons / sterile cloths
};

export type CycleStatus = {
  currentDay: number;
  phase: CyclePhase;
  phaseLabelKey: string;
  nextPeriodDate: string; // YYYY-MM-DD
  daysUntilNextPeriod: number;
  isDelayed: boolean;
  delayedDays: number;
  ovulationDate: string;  // YYYY-MM-DD
  fertileWindowStart: string; // YYYY-MM-DD
  fertileWindowEnd: string;   // YYYY-MM-DD
  isCurrentlyInPeriod: boolean;
  suppliesDaysRemaining: number;
};
