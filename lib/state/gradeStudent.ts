import type { GradingDispatch, QuestionResult } from "@/lib/state/GradingContext";
import { GradeOutputSchema, type GradeOutput } from "@/lib/validation/schemas";

// Used when the call to /api/grade fails outright (network error, bad
// status, bad JSON) so the loop never crashes and the tutor can still
// see which card needs a manual look.
const SAFE_FALLBACK: GradeOutput = {
  mark: 0,
  feedback: "Could not grade this response.",
  needsReview: true,
};

// Calls /api/grade for one question. Never throws: a failed call
// becomes the same safe fallback a bad model output would (invariant
// I3's spirit), so the caller can treat every question the same way.
// Exported so redoQuestion.ts can reuse this exact call-plus-fallback
// logic for a single-question Re-do, instead of duplicating it.
export async function callGradeApi(question: QuestionResult): Promise<GradeOutput> {
  try {
    const response = await fetch("/api/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: question.questionId,
        question: question.question,
        rubric: question.rubric,
        modelAnswer: question.modelAnswer,
        maxMarks: question.maxMarks,
        response: question.response,
      }),
    });

    if (!response.ok) {
      console.error(`Grading call failed for question ${question.questionId}: status ${response.status}`);
      return SAFE_FALLBACK;
    }

    const body = await response.json();
    return GradeOutputSchema.parse(body);
  } catch (error) {
    console.error(`Grading call threw for question ${question.questionId}`, error);
    return SAFE_FALLBACK;
  }
}

// Runs the "Grade with AI" loop for one student: skips no-submission
// questions (invariant I4) and any question the tutor has already
// confirmed or adjusted (invariant I6 — a bulk re-grade never overwrites
// a human mark; the tutor uses per-question Re-do for that instead).
// Calls the grade API once per remaining question in order, and drops
// each result into state as it lands so the progress bar and marks
// update live.
export async function gradeStudent(
  student: string,
  questions: QuestionResult[],
  dispatch: GradingDispatch,
  callGradeApiOverride: (question: QuestionResult) => Promise<GradeOutput> = callGradeApi
): Promise<void> {
  const lockedStatuses = new Set(["no_submission", "confirmed", "adjusted"]);
  const gradeableQuestions = questions.filter((question) => !lockedStatuses.has(question.status));

  dispatch({ type: "START_GRADING", student, total: gradeableQuestions.length });

  for (const question of gradeableQuestions) {
    const result = await callGradeApiOverride(question);
    dispatch({
      type: "QUESTION_GRADED",
      student,
      questionId: question.questionId,
      ...result,
    });
  }

  dispatch({ type: "FINISH_GRADING", student });
}
