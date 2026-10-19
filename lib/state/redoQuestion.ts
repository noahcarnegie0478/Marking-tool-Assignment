import type { GradingDispatch, QuestionResult } from "@/lib/state/GradingContext";
import { callGradeApi } from "@/lib/state/gradeStudent";
import type { GradeOutput } from "@/lib/validation/schemas";

// Re-runs the AI grading for a single question (the tutor's per-question
// Re-do). Moves the question to "grading" first, then calls the grade
// API and writes the fresh result the same way the bulk loop does
// (QUESTION_GRADED also clears any human override, so the old humanMark
// never survives a Re-do). Reuses callGradeApi, so a failed call becomes
// the same safe fallback the bulk loop would get, never a crash or a
// question stuck on "grading".
export async function redoQuestion(
  student: string,
  questionId: string,
  question: QuestionResult,
  dispatch: GradingDispatch,
  callGradeApiOverride: (question: QuestionResult) => Promise<GradeOutput> = callGradeApi
): Promise<void> {
  dispatch({ type: "START_REDO", student, questionId });

  const result = await callGradeApiOverride(question);

  dispatch({
    type: "QUESTION_GRADED",
    student,
    questionId,
    ...result,
  });
}
