import type { GradingState, QuestionResult } from "@/lib/state/GradingContext";

// The mark that actually counts: the tutor's mark if they set one,
// otherwise the AI's, otherwise 0 (not yet graded). Totals and the mark
// box should always read this, never aiMark/humanMark directly.
export function getEffectiveMark(question: QuestionResult): number {
  return question.humanMark ?? question.aiMark ?? 0;
}

// True only for an AI result a human has not yet looked at. Confirming or
// adjusting a question is the human "looking at it", so this clears the
// moment either happens.
export function getNeedsReview(question: QuestionResult): boolean {
  return question.aiNeedsReview && question.status === "ai_graded";
}

// "Marked" once every question for this student is either no_submission,
// or has gone through AI grading (ai_graded, confirmed, or adjusted). A
// student we have not opened yet (not in `results`) is "Not marked".
export function getStatus(
  results: GradingState["results"],
  student: string
): "Marked" | "Not marked" {
  const studentResults = results[student];
  if (!studentResults) {
    return "Not marked";
  }

  const gradedStatuses = new Set(["no_submission", "ai_graded", "confirmed", "adjusted"]);
  const allDone = Object.values(studentResults).every((question) =>
    gradedStatuses.has(question.status)
  );
  return allDone ? "Marked" : "Not marked";
}

// Sums effective marks across all 8 questions (invariant I5: the total is
// always derived, never stored). Returns null when this student has not
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
    awarded += getEffectiveMark(question);
    max += question.maxMarks;
  }
  return { awarded, max };
}
