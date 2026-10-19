import { describe, expect, it } from "vitest";
import type { GradingState, QuestionResult } from "@/lib/state/GradingContext";
import { getStatus, getTotal } from "@/lib/state/selectors";
import { getStudentSubmission } from "@/lib/exam/loadExam";

// Mirrors the reducer's INIT_EXAM case, without needing to render a
// component just to dispatch one action.
function initExam(submission: NonNullable<ReturnType<typeof getStudentSubmission>>) {
  const questionResults: Record<string, QuestionResult> = {};
  for (const question of submission.questions) {
    questionResults[question.questionId] = {
      ...question,
      mark: null,
      feedback: null,
      needsReview: false,
    };
  }
  return questionResults;
}

describe("getStatus", () => {
  it("is 'Not marked' for a student not yet opened", () => {
    const results: GradingState["results"] = {};
    expect(getStatus(results, "Diego")).toBe("Not marked");
  });
});

describe("INIT_EXAM (Diego)", () => {
  const diego = getStudentSubmission("Diego")!;
  const questionResults = initExam(diego);

  it("marks 6 questions no_submission and 2 pending", () => {
    const statuses = Object.values(questionResults).map((q) => q.status);
    expect(statuses.filter((s) => s === "no_submission")).toHaveLength(6);
    expect(statuses.filter((s) => s === "pending")).toHaveLength(2);
  });

  it("getTotal returns 0 awarded and the correct max for this ungraded student", () => {
    const results: GradingState["results"] = { Diego: questionResults };
    const expectedMax = diego.questions.reduce((sum, q) => sum + q.maxMarks, 0);

    expect(getTotal(results, "Diego")).toEqual({ awarded: 0, max: expectedMax });
  });
});
