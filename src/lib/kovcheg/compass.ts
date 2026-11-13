import type { Language } from "./i18n";

/**
 * Normalizes any degree angle to the range [0, 360).
 */
export function normalizeHeading(deg: number): number {
  if (isNaN(deg)) return 0;
  const normalized = deg % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export interface CardinalPoint {
  enCode: string;
  code: string;
  label: string;
  minDeg: number;
  maxDeg: number;
}

const CARDINALS_DEF: Array<{
  enCode: string;
  deg: number;
  ruCode: string;
  ruLabel: string;
  enLabel: string;
  arCode: string;
  arLabel: string;
}> = [
  { enCode: "N", deg: 0, ruCode: "С", ruLabel: "Север", enLabel: "North", arCode: "ش", arLabel: "الشمال" },
  { enCode: "NNE", deg: 22.5, ruCode: "ССВ", ruLabel: "Северо-северо-восток", enLabel: "North-Northeast", arCode: "ش ش ق", arLabel: "شمال شمال شرق" },
  { enCode: "NE", deg: 45, ruCode: "СВ", ruLabel: "Северо-восток", enLabel: "Northeast", arCode: "ش ق", arLabel: "شمال شرق" },
  { enCode: "ENE", deg: 67.5, ruCode: "ВСВ", ruLabel: "Востоко-северо-восток", enLabel: "East-Northeast", arCode: "ق ش ق", arLabel: "شرق شمال شرق" },
  { enCode: "E", deg: 90, ruCode: "В", ruLabel: "Восток", enLabel: "East", arCode: "ق", arLabel: "الشرق" },
  { enCode: "ESE", deg: 112.5, ruCode: "ВЮВ", ruLabel: "Востоко-юго-восток", enLabel: "East-Southeast", arCode: "ق ج ق", arLabel: "شرق جنوب شرق" },
  { enCode: "SE", deg: 135, ruCode: "ЮВ", ruLabel: "Юго-восток", enLabel: "Southeast", arCode: "ج ق", arLabel: "جنوب شرق" },
  { enCode: "SSE", deg: 157.5, ruCode: "ЮЮВ", ruLabel: "Юго-юго-восток", enLabel: "South-Southeast", arCode: "ج ج ق", arLabel: "جنوب جنوب شرق" },
  { enCode: "S", deg: 180, ruCode: "Ю", ruLabel: "Юг", enLabel: "South", arCode: "ج", arLabel: "الجنوب" },
  { enCode: "SSW", deg: 202.5, ruCode: "ЮЮЗ", ruLabel: "Юго-юго-запад", enLabel: "South-Southwest", arCode: "ج ج غ", arLabel: "جنوب جنوب غرب" },
  { enCode: "SW", deg: 225, ruCode: "ЮЗ", ruLabel: "Юго-запад", enLabel: "Southwest", arCode: "ج غ", arLabel: "جنوب غرب" },
  { enCode: "WSW", deg: 247.5, ruCode: "ЗЮЗ", ruLabel: "Западо-юго-запад", enLabel: "West-Southwest", arCode: "غ ج غ", arLabel: "غرب جنوب غرب" },
  { enCode: "W", deg: 270, ruCode: "З", ruLabel: "Запад", enLabel: "West", arCode: "غ", arLabel: "الغرب" },
  { enCode: "WNW", deg: 292.5, ruCode: "ЗСЗ", ruLabel: "Западо-северо-запад", enLabel: "West-Northwest", arCode: "غ ش غ", arLabel: "غرب شمال غرب" },
  { enCode: "NW", deg: 315, ruCode: "СЗ", ruLabel: "Северо-запад", enLabel: "Northwest", arCode: "ش غ", arLabel: "شمال غرب" },
  { enCode: "NNW", deg: 337.5, ruCode: "ССЗ", ruLabel: "Северо-северо-запад", enLabel: "North-Northwest", arCode: "ش ش غ", arLabel: "شمال شمال غرب" },
];

/**
 * Returns the cardinal point data for any heading angle.
 */
export function getCardinalDirection(degrees: number, lang: Language = "ru"): {
  enCode: string;
  code: string;
  label: string;
} {
  const norm = normalizeHeading(degrees);
  // Each sector is 22.5 degrees (360 / 16). Sector 0 is centered at 0 deg: [-11.25, +11.25].
  const index = Math.floor(((norm + 11.25) % 360) / 22.5);
  const item = CARDINALS_DEF[index] || CARDINALS_DEF[0];

  if (lang === "ar") {
    return { enCode: item.enCode, code: item.arCode, label: item.arLabel };
  }
  if (lang === "en") {
    return { enCode: item.enCode, code: item.enCode, label: item.enLabel };
  }
  return { enCode: item.enCode, code: item.ruCode, label: item.ruLabel };
}

/**
 * Calculates initial true bearing (azimuth in degrees [0, 360)) from one point to another.
 */
export function calculateBearing(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const lat1 = (fromLat * Math.PI) / 180;
  const lat2 = (toLat * Math.PI) / 180;
  const dLng = ((toLng - fromLng) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return normalizeHeading(Math.round(brng * 10) / 10);
}

/**
 * Calculates great-circle distance in kilometers using the Haversine formula.
 */
export function calculateDistanceKm(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLng = ((toLng - fromLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((fromLat * Math.PI) / 180) *
      Math.cos((toLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Calculates relative angle between current compass heading and target azimuth.
 * Gives user exact steering instructions: "left", "right" or "straight" (within +/- 5 deg).
 */
export function calculateRelativeBearing(
  currentHeading: number,
  targetBearing: number
): {
  diff: number; // Signed deviation (-180 to +180): positive is right (clockwise), negative is left
  turnDirection: "straight" | "left" | "right";
  turnAngle: number; // Absolute degrees to turn
} {
  const normH = normalizeHeading(currentHeading);
  const normT = normalizeHeading(targetBearing);

  let diff = normT - normH;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  const absDiff = Math.abs(Math.round(diff));

  if (absDiff <= 5) {
    return { diff, turnDirection: "straight", turnAngle: absDiff };
  }
  if (diff > 0) {
    return { diff, turnDirection: "right", turnAngle: absDiff };
  }
  return { diff, turnDirection: "left", turnAngle: absDiff };
}

/**
 * Simplified magnetic declination estimation based on latitude and longitude (dipole approximation).
 * Positive is East (+), negative is West (-).
 */
export function estimateMagneticDeclination(lat: number, lng: number): number {
  if (isNaN(lat) || isNaN(lng)) return 0;
  // Moscow ~ +11°E, Urals ~ +14°E, Vladivostok ~ -9°W, London ~ +1°E, Dubai ~ +2°E
  const estimated = 10 * Math.sin((lng - 30) * (Math.PI / 180)) + 3 * Math.sin(lat * (Math.PI / 90));
  return Math.round(estimated * 10) / 10;
}

/**
 * Converts magnetic heading to true heading using local declination.
 */
export function magneticToTrueHeading(magneticHeading: number, declinationDeg: number): number {
  return normalizeHeading(magneticHeading + declinationDeg);
}
