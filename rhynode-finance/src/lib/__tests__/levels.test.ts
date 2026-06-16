import { describe, it, expect } from "vitest";
import {
  xpForLevel,
  totalXpForLevel,
  calculateLevel,
  getTitleForLevel,
  xpToNextLevel,
  levelProgressPercent,
} from "@/lib/levels";

describe("levels", () => {
  it("calculates xp for level 1", () => {
    expect(xpForLevel(1)).toBe(100);
  });

  it("calculates xp for level 2 correctly", () => {
    expect(xpForLevel(2)).toBe(Math.floor(100 * Math.pow(2, 1.5)));
  });

  it("total xp for level 1 is zero", () => {
    expect(totalXpForLevel(1)).toBe(0);
  });

  it("total xp for level 2 equals xpForLevel(1)", () => {
    expect(totalXpForLevel(2)).toBe(xpForLevel(1));
  });

  it("calculates level 1 for zero xp", () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it("levels up when crossing threshold", () => {
    const threshold = totalXpForLevel(2);
    expect(calculateLevel(threshold)).toBe(2);
    expect(calculateLevel(threshold - 1)).toBe(1);
  });

  it("returns a title for level 1", () => {
    const title = getTitleForLevel(1);
    expect(title).toBeTruthy();
    expect(typeof title).toBe("string");
  });

  it("returns legendary title beyond max", () => {
    expect(getTitleForLevel(999)).toBe("Leyenda Viviente");
  });

  it("xp to next level is positive", () => {
    const xp = totalXpForLevel(2);
    expect(xpToNextLevel(2, xp)).toBeGreaterThan(0);
  });

  it("progress is 0 at level start and increases", () => {
    const startXp = totalXpForLevel(2);
    const nextXp = totalXpForLevel(3);
    const range = nextXp - startXp;
    expect(levelProgressPercent(2, startXp)).toBe(0);
    expect(levelProgressPercent(2, startXp + Math.floor(range / 2))).toBeGreaterThan(0);
  });

  it("progress does not exceed 100", () => {
    const wayOver = totalXpForLevel(3) + 10000;
    expect(levelProgressPercent(2, wayOver)).toBe(100);
  });
});
