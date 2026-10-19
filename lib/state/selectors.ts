import type { GradingState } from "@/lib/state/GradingContext";

// "Marked" once every question for this student is either no_submission or
// has a mark. A student we have not opened yet (not in `results`) is
// "Not marked".
export function getStatus(
  results: GradingState["results"],
  student: string
): "Marked" | "Not marked" {
  const studentResults = results[student];
  if (!studentResults) {
    return "Not marked";
  }

  const allDone = Object.values(studentResults).every(
    (question) => question.status === "no_submission" || question.mark !== null
  );
  return allDone ? "Marked" : "Not marked";
}

// Sums marks across all 8 questions. Returns null when this student has not
// been opened yet, so the UI can show a dash instead of a fake "0/0".
// No-submission questions count as 0 awarded, but their max_marks still
// count toward the total possible, since the exam's max does not shrink
// just because a question was skipped.
export function getTotal(
  results: GradingState["results"],
  student: string
): { awarded: number; max: number } | null {
  const studentResults = results[student];
  if (!studentResults) {
    return null;
  }

  let awarded = 0;
  let max = 0;
  for (const question of Object.values(studentResults)) {
    awarded += question.mark ?? 0;
    max += question.maxMarks;
  }
  return { awarded, max };
}
