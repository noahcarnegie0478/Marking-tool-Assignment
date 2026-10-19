// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AdjustControl } from "@/lib/ui/AdjustControl";

afterEach(() => {
  cleanup();
});

describe("AdjustControl", () => {
  // parseAdjustMark (reused from ADJ-01) clamps an out-of-range whole
  // number rather than rejecting it (invariant I1), the same as the
  // ADJ-01 test table's "Adjust to 5 on a 3-max -> clamped to 3". The
  // important thing here is that the value reaching onSubmit, and so the
  // state, is never out of range — 9 on a 3-max becomes 3, not 9.
  it("clamps a value above max before it ever reaches onSubmit", () => {
    const onSubmit = vi.fn();
    render(<AdjustControl currentMark={2} maxMarks={3} onSubmit={onSubmit} onCancel={vi.fn()} />);

    const input = screen.getByLabelText("New mark");
    fireEvent.change(input, { target: { value: "9" } });
    fireEvent.click(screen.getByText("Save"));

    expect(onSubmit).toHaveBeenCalledWith(3);
  });

  it("rejects a non-whole-number value with an inline error and never calls onSubmit", () => {
    const onSubmit = vi.fn();
    render(<AdjustControl currentMark={2} maxMarks={3} onSubmit={onSubmit} onCancel={vi.fn()} />);

    const input = screen.getByLabelText("New mark");
    fireEvent.change(input, { target: { value: "2.5" } });
    fireEvent.click(screen.getByText("Save"));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a whole number from 0 to 3.")).toBeTruthy();
  });
});
