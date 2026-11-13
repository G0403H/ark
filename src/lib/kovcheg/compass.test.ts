import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeHeading,
  getCardinalDirection,
  calculateBearing,
  calculateDistanceKm,
  calculateRelativeBearing,
  estimateMagneticDeclination,
  magneticToTrueHeading,
} from "./compass.ts";

describe("Compass Math & Navigation Engine", () => {
  it("normalizes heading correctly across boundary ranges", () => {
    assert.equal(normalizeHeading(0), 0);
    assert.equal(normalizeHeading(360), 0);
    assert.equal(normalizeHeading(720), 0);
    assert.equal(normalizeHeading(-10), 350);
    assert.equal(normalizeHeading(-370), 350);
    assert.equal(normalizeHeading(45.5), 45.5);
  });

  it("determines 16 cardinal points accurately in RU, EN and AR", () => {
    // North
    const n = getCardinalDirection(0, "ru");
    assert.equal(n.code, "С");
    assert.equal(n.enCode, "N");
    assert.equal(n.label, "Север");

    const n358 = getCardinalDirection(358, "en");
    assert.equal(n358.code, "N");

    // East
    const e = getCardinalDirection(90, "ru");
    assert.equal(e.code, "В");
    assert.equal(e.label, "Восток");

    // South
    const s = getCardinalDirection(180, "ru");
    assert.equal(s.code, "Ю");

    // West
    const w = getCardinalDirection(270, "ru");
    assert.equal(w.code, "З");

    // Northeast
    const ne = getCardinalDirection(45, "en");
    assert.equal(ne.code, "NE");

    // Arabic test
    const arNorth = getCardinalDirection(0, "ar");
    assert.equal(arNorth.code, "ش");
    assert.equal(arNorth.label, "الشمال");
  });

  it("calculates forward bearing between coordinates accurately", () => {
    // Due North: from (0, 0) to (10, 0) should be 0 deg
    const dueNorth = calculateBearing(0, 0, 10, 0);
    assert.equal(dueNorth, 0);

    // Due East: from (0, 0) to (0, 10) should be 90 deg
    const dueEast = calculateBearing(0, 0, 0, 10);
    assert.equal(dueEast, 90);

    // Due South: from (10, 0) to (0, 0) should be 180 deg
    const dueSouth = calculateBearing(10, 0, 0, 0);
    assert.equal(dueSouth, 180);

    // Due West: from (0, 10) to (0, 0) should be 270 deg
    const dueWest = calculateBearing(0, 10, 0, 0);
    assert.equal(dueWest, 270);
  });

  it("calculates great-circle distance accurately", () => {
    // Roughly Moscow to St. Petersburg is ~634 km
    const dist = calculateDistanceKm(55.7558, 37.6173, 59.9343, 30.3351);
    assert.ok(dist > 600 && dist < 660, `Expected ~634 km, got ${dist}`);
  });

  it("calculates relative steering instructions", () => {
    // Current heading 0° (North), Target is 40° (Northeast) -> Turn right 40°
    const turnR = calculateRelativeBearing(0, 40);
    assert.equal(turnR.turnDirection, "right");
    assert.equal(turnR.turnAngle, 40);

    // Current heading 40°, Target is 0° -> Turn left 40°
    const turnL = calculateRelativeBearing(40, 0);
    assert.equal(turnL.turnDirection, "left");
    assert.equal(turnL.turnAngle, 40);

    // Heading 358°, Target 1° -> difference is 3° -> straight
    const straight = calculateRelativeBearing(358, 1);
    assert.equal(straight.turnDirection, "straight");
    assert.equal(straight.turnAngle, 3);

    // Heading 10°, Target 350° -> difference is 20° left
    const wrapL = calculateRelativeBearing(10, 350);
    assert.equal(wrapL.turnDirection, "left");
    assert.equal(wrapL.turnAngle, 20);
  });

  it("estimates magnetic declination and true heading", () => {
    const declination = estimateMagneticDeclination(55.75, 37.61);
    assert.equal(typeof declination, "number");

    // Heading 355 with +10 deg declination becomes 5 deg true
    const trueHeading = magneticToTrueHeading(355, 10);
    assert.equal(trueHeading, 5);
  });
});
