import { describe, expect, it } from "vitest";
import { toStroops, fromStroops } from "../src/amounts.js";

describe("toStroops", () => {
  it("converts a whole number", () => {
    expect(toStroops(15)).toBe(150_000_000n);
  });

  it("converts a fractional amount", () => {
    expect(toStroops("12.5")).toBe(125_000_000n);
  });

  it("converts a fraction with the max 7 decimal places", () => {
    expect(toStroops("0.0000001")).toBe(1n);
  });

  it("rejects more than 7 decimal places", () => {
    expect(() => toStroops("1.00000001")).toThrow();
  });

  it("rejects non-numeric input", () => {
    expect(() => toStroops("abc")).toThrow();
  });

  it("handles negative amounts", () => {
    expect(toStroops("-2.5")).toBe(-25_000_000n);
  });
});

describe("fromStroops", () => {
  it("round-trips through toStroops", () => {
    expect(fromStroops(toStroops("42.1234567"))).toBeCloseTo(42.1234567, 7);
  });

  it("converts a whole stroops amount", () => {
    expect(fromStroops(150_000_000n)).toBe(15);
  });
});
