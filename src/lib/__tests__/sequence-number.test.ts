import { describe, it, expect } from "vitest";
import {
  calculateLuhnCheckDigit,
  formatPublicNumber,
  validateCheckDigit,
} from "../sequence-number";

// =============================================================================
// Unit Tests — Luhn Check Digit & Penomoran Publik
// =============================================================================

describe("calculateLuhnCheckDigit", () => {
  it("should return consistent check digit for the same input", () => {
    const result1 = calculateLuhnCheckDigit("100001");
    const result2 = calculateLuhnCheckDigit("100001");
    expect(result1).toBe(result2);
  });

  it("should return a single digit (0–9)", () => {
    const result = calculateLuhnCheckDigit("100001");
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(9);
  });

  it("should correctly calculate check digit for 100001", () => {
    // Manual calculation for "100001":
    // Digits:    1   0   0   0   0   1
    // Position:  6   5   4   3   2   1  (from right, 1-indexed)
    // shouldDouble starts true (rightmost), alternating:
    //   pos1 (1): double -> 1*2=2
    //   pos2 (0): keep   -> 0
    //   pos3 (0): double -> 0*2=0
    //   pos4 (0): keep   -> 0
    //   pos5 (0): double -> 0*2=0
    //   pos6 (1): keep   -> 1
    // Sum = 2+0+0+0+0+1 = 3
    // Check digit = (10 - 3%10) % 10 = 7
    expect(calculateLuhnCheckDigit("100001")).toBe(7);
  });

  it("should correctly calculate check digit for 500001", () => {
    // Manual calculation for "500001":
    // Digits:    5   0   0   0   0   1
    // shouldDouble starts true (rightmost):
    //   pos1 (1): double -> 1*2=2
    //   pos2 (0): keep   -> 0
    //   pos3 (0): double -> 0*2=0
    //   pos4 (0): keep   -> 0
    //   pos5 (0): double -> 0*2=0
    //   pos6 (5): keep   -> 5
    // Sum = 2+0+0+0+0+5 = 7
    // Check digit = (10 - 7%10) % 10 = 3
    expect(calculateLuhnCheckDigit("500001")).toBe(3);
  });

  it("should handle doubling with digit > 9 (subtract 9)", () => {
    // For "100008":
    // Digits:    1   0   0   0   0   8
    // shouldDouble starts true (rightmost):
    //   pos1 (8): double -> 8*2=16, 16>9 -> 16-9=7
    //   pos2 (0): keep   -> 0
    //   pos3 (0): double -> 0
    //   pos4 (0): keep   -> 0
    //   pos5 (0): double -> 0
    //   pos6 (1): keep   -> 1
    // Sum = 7+0+0+0+0+1 = 8
    // Check digit = (10 - 8%10) % 10 = 2
    expect(calculateLuhnCheckDigit("100008")).toBe(2);
  });

  it("should return 0 as check digit when sum is multiple of 10", () => {
    // "100005":
    // Digits:    1   0   0   0   0   5
    // shouldDouble starts true (rightmost):
    //   pos1 (5): double -> 5*2=10, 10>9 -> 10-9=1
    //   pos2 (0): keep   -> 0
    //   pos3 (0): double -> 0
    //   pos4 (0): keep   -> 0
    //   pos5 (0): double -> 0
    //   pos6 (1): keep   -> 1
    // Sum = 1+0+0+0+0+1 = 2
    // Not multiple of 10, check digit = 8
    // Let's find one that IS multiple of 10...
    // "100003":
    //   pos1 (3): double -> 6
    //   pos6 (1): keep -> 1
    // Sum = 6+0+0+0+0+1 = 7, cd = 3
    // "100009":
    //   pos1 (9): double -> 18, 18>9 -> 9
    //   pos6 (1): keep -> 1
    // Sum = 9+0+0+0+0+1 = 10, cd = (10-0)%10 = 0
    expect(calculateLuhnCheckDigit("100009")).toBe(0);
  });

  it("should produce different check digits for different inputs", () => {
    const cd1 = calculateLuhnCheckDigit("100001");
    const cd2 = calculateLuhnCheckDigit("100002");
    const cd3 = calculateLuhnCheckDigit("100003");
    // At least 2 of 3 should be different
    const unique = new Set([cd1, cd2, cd3]);
    expect(unique.size).toBeGreaterThanOrEqual(2);
  });
});

describe("formatPublicNumber", () => {
  it("should format as '{sequenceValue}-{checkDigit}'", () => {
    const result = formatPublicNumber(100001);
    expect(result).toMatch(/^\d+-\d$/);
  });

  it("should include correct check digit for 100001", () => {
    const result = formatPublicNumber(100001);
    // From manual calc above: check digit = 7
    expect(result).toBe("100001-7");
  });

  it("should include correct check digit for 500001", () => {
    const result = formatPublicNumber(500001);
    // From manual calc above: check digit = 3
    expect(result).toBe("500001-3");
  });

  it("should work for consecutive sequence values", () => {
    const results = [
      formatPublicNumber(100001),
      formatPublicNumber(100002),
      formatPublicNumber(100003),
      formatPublicNumber(100004),
      formatPublicNumber(100005),
    ];
    // All should be unique
    const unique = new Set(results);
    expect(unique.size).toBe(5);
    // All should match format
    for (const r of results) {
      expect(r).toMatch(/^10000\d-\d$/);
    }
  });
});

describe("validateCheckDigit", () => {
  it("should return true for valid number (100001-7)", () => {
    expect(validateCheckDigit("100001-7")).toBe(true);
  });

  it("should return true for valid number (500001-3)", () => {
    expect(validateCheckDigit("500001-3")).toBe(true);
  });

  it("should return false for wrong check digit", () => {
    // 100001 has check digit 7, so 100001-0 should fail
    expect(validateCheckDigit("100001-0")).toBe(false);
    expect(validateCheckDigit("100001-1")).toBe(false);
    expect(validateCheckDigit("100001-9")).toBe(false);
  });

  it("should return false for invalid format (no dash)", () => {
    expect(validateCheckDigit("1000017")).toBe(false);
  });

  it("should return false for invalid format (multiple digits after dash)", () => {
    expect(validateCheckDigit("100001-77")).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(validateCheckDigit("")).toBe(false);
  });

  it("should return false for non-numeric input", () => {
    expect(validateCheckDigit("abcdef-g")).toBe(false);
  });

  it("should return false for reversed typo (transposed digits)", () => {
    // "100010-7" is a different number, should fail with check digit 7
    const original = validateCheckDigit("100001-7");
    const transposed = validateCheckDigit("100010-7");
    expect(original).toBe(true);
    // Luhn is designed to catch transposition errors
    expect(transposed).toBe(false);
  });

  it("should validate all formatted numbers correctly (round-trip)", () => {
    // Generate a batch and validate them all
    for (let i = 100001; i <= 100050; i++) {
      const formatted = formatPublicNumber(i);
      expect(validateCheckDigit(formatted)).toBe(true);
    }
  });

  it("should validate listing number range correctly (round-trip)", () => {
    for (let i = 500001; i <= 500050; i++) {
      const formatted = formatPublicNumber(i);
      expect(validateCheckDigit(formatted)).toBe(true);
    }
  });
});
