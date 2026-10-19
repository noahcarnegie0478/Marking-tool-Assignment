import { describe, expect, it } from "vitest";
import { clampMark } from "@/lib/domain/clampMark";

describe("clampMark", () => {
  it("leaves a mark inside the range unchanged", () => {
    expect(clampMark(2, 3)).toEqual({ mark: 2, wasClamped: false });
  });

  it("clamps a mark above max_marks down to max_marks and flags it", () => {
    expect(clampMark(5, 3)).toEqual({ mark: 3, wasClamped: true });
  });

  it("clamps a negative mark up to 0 and flags it", () => {
    expect(clampMark(-1, 3)).toEqual({ mark: 0, wasClamped: true });
  });

  it("allows a mark of exactly 0 or exactly max_marks without flagging", () => {
    expect(clampMark(0, 3)).toEqual({ mark: 0, wasClamped: false });
    expect(clampMark(3, 3)).toEqual({ mark: 3, wasClamped: false });
  });
});
