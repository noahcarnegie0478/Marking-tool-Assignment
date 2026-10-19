import { describe, expect, it } from "vitest";
import { parseAdjustMark } from "@/lib/domain/parseAdjustMark";

describe("parseAdjustMark", () => {
  it("accepts a whole number inside the range", () => {
    expect(parseAdjustMark("3", 3)).toEqual({ mark: 3 });
  });

  it("clamps a value above max_marks down to max_marks (I1)", () => {
    expect(parseAdjustMark("5", 3)).toEqual({ mark: 3 });
  });

  it("clamps a negative value up to 0", () => {
    expect(parseAdjustMark("-1", 3)).toEqual({ mark: 0 });
  });

  it.each(["", "   ", "abc", "2.5", "3abc"])("rejects a non-whole-number value (%s)", (rawValue) => {
    expect(parseAdjustMark(rawValue, 3)).toEqual({ rejected: true });
  });

  it("trims surrounding whitespace before parsing", () => {
    expect(parseAdjustMark("  2  ", 3)).toEqual({ mark: 2 });
  });
});
