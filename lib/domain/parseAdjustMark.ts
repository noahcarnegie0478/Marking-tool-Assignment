import { clampMark } from "@/lib/domain/clampMark";

// Validates a tutor's typed Adjust value before it ever reaches clampMark.
// Only a whole number is accepted; anything else (empty, letters, a
// decimal like 2.5) is rejected outright with no state change, because a
// clamp can only fix an out-of-range number, not a value that isn't a
// number at all.
export function parseAdjustMark(
  rawValue: string,
  maxMarks: number
): { mark: number } | { rejected: true } {
  const trimmed = rawValue.trim();

  // Number("") is 0 in JS, which would otherwise look like a valid whole
  // number. Reject it explicitly before the conversion below.
  if (trimmed === "") {
    return { rejected: true };
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed)) {
    return { rejected: true };
  }

  const { mark } = clampMark(parsed, maxMarks);
  return { mark };
}
