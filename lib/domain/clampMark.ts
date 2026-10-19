// Keeps a mark inside the question's valid range: 0 to maxMarks
// (invariant I1). A model can return a mark outside this range (too
// high, or somehow negative); this is the one place that gets fixed.
export function clampMark(
  mark: number,
  maxMarks: number
): { mark: number; wasClamped: boolean } {
  if (mark > maxMarks) {
    return { mark: maxMarks, wasClamped: true };
  }
  if (mark < 0) {
    return { mark: 0, wasClamped: true };
  }
  return { mark, wasClamped: false };
}
