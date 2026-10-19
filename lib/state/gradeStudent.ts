import type { Dispatch } from "react";
import type { QuestionResult } from "@/lib/state/GradingContext";
import { GradeOutputSchema, type GradeOutput } from "@/lib/validation/schemas";

// Matches the reducer's Action type, but that type isn't exported, so
// this is the one shape gradeStudent actually needs to dispatch.
type GradeDispatch = Dispatch<
  | { type: "START_GRADING"; student: string; total: number }
  | ({ type: "QUESTION_GRADED"; student: string; questionId: string } & GradeOutput)
  | { type: "FINISH_GRADING"; student: string }
>;

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
async function defaultCallGradeApi(question: QuestionResult): Promise<GradeOutput> {
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
// questions (invariant I4), calls the grade API once per answered
// question in order, and drops each result into state as it lands so
// the progress bar and marks update live.
export async function gradeStudent(
  student: string,
  questions: QuestionResult[],
  dispatch: GradeDispatch,
  callGradeApi: (question: QuestionResult) => Promise<GradeOutput> = defaultCallGradeApi
): Promise<void> {
  const gradeableQuestions = questions.filter((question) => question.status !== "no_submission");

  dispatch({ type: "START_GRADING", student, total: gradeableQuestions.length });

  for (const question of gradeableQuestions) {
    const result = await callGradeApi(question);
    dispatch({
      type: "QUESTION_GRADED",
      student,
      questionId: question.questionId,
      ...result,
    });
  }

  dispatch({ type: "FINISH_GRADING", student });
}
