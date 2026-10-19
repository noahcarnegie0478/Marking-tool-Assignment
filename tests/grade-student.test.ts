import { describe, expect, it } from "vitest";
import { gradingReducer, type Action, type GradingState, type QuestionResult } from "@/lib/state/GradingContext";
import { getTotal } from "@/lib/state/selectors";
import { getStudentSubmission } from "@/lib/exam/loadExam";
import { gradeStudent } from "@/lib/state/gradeStudent";
import type { GradeOutput } from "@/lib/validation/schemas";

// Mirrors the reducer's INIT_EXAM case, same helper as grading-state.test.ts,
// so Diego's grid here matches what the app would actually build.
function initExam(submission: NonNullable<ReturnType<typeof getStudentSubmission>>) {
  const questionResults: Record<string, QuestionResult> = {};
  for (const question of submission.questions) {
    questionResults[question.questionId] = {
      ...question,
      aiMark: null,
      aiFeedback: null,
      aiNeedsReview: false,
      humanMark: null,
      humanFeedback: null,
    };
  }
  return questionResults;
}

// Applies one action through the real reducer, so this test exercises the
// actual QUESTION_GRADED logic instead of a second, test-only copy of it.
function applyAction(results: GradingState["results"], action: Action): GradingState["results"] {
  return gradingReducer({ results, gradingProgress: null }, action).results;
}

describe("gradeStudent", () => {
  it("calls the grade API only for answered questions (Diego: 2 calls, 6 skipped)", async () => {
    const diego = getStudentSubmission("Diego")!;
    const questionResults = initExam(diego);
    const calledQuestionIds: string[] = [];

    const fakeCallGradeApi = async (question: QuestionResult): Promise<GradeOutput> => {
      calledQuestionIds.push(question.questionId);
      return { mark: 1, feedback: "ok", needsReview: false };
    };

    await gradeStudent(
      "Diego",
      Object.values(questionResults),
      () => {},
      fakeCallGradeApi
    );

    expect(calledQuestionIds.sort()).toEqual(["Q2", "Q6"]);
  });

  it("drops each result into state as it lands, and getTotal is correct afterwards", async () => {
    const diego = getStudentSubmission("Diego")!;
    let results: GradingState["results"] = { Diego: initExam(diego) };

    const fakeCallGradeApi = async (question: QuestionResult): Promise<GradeOutput> => ({
      mark: question.maxMarks,
      feedback: "full marks",
      needsReview: false,
    });

    await gradeStudent(
      "Diego",
      Object.values(results.Diego),
      (action) => {
        results = { ...results, Diego: applyAction(results, action).Diego };
      },
      fakeCallGradeApi
    );

    const expectedMax = diego.questions.reduce((sum, q) => sum + q.maxMarks, 0);
    const q2Max = diego.questions.find((q) => q.questionId === "Q2")!.maxMarks;
    const q6Max = diego.questions.find((q) => q.questionId === "Q6")!.maxMarks;

    expect(getTotal(results, "Diego")).toEqual({
      awarded: q2Max + q6Max,
      max: expectedMax,
    });
  });

  it("keeps grading the rest of the questions if one call fails, with a safe fallback", async () => {
    const diego = getStudentSubmission("Diego")!;
    let results: GradingState["results"] = { Diego: initExam(diego) };

    const fakeCallGradeApi = async (question: QuestionResult): Promise<GradeOutput> => {
      if (question.questionId === "Q6") {
        throw new Error("simulated grading failure");
      }
      return { mark: question.maxMarks, feedback: "full marks", needsReview: false };
    };

    // gradeStudent's real callGradeApi never throws (it catches internally),
    // so here we simulate "the call came back as a safe fallback" directly,
    // the same way the real callGradeApi would after catching.
    const safeCallGradeApi = async (question: QuestionResult): Promise<GradeOutput> => {
      try {
        return await fakeCallGradeApi(question);
      } catch {
        return { mark: 0, feedback: "Could not grade this response.", needsReview: true };
      }
    };

    await gradeStudent(
      "Diego",
      Object.values(results.Diego),
      (action) => {
        results = { ...results, Diego: applyAction(results, action).Diego };
      },
      safeCallGradeApi
    );

    expect(results.Diego["Q6"].aiMark).toBe(0);
    expect(results.Diego["Q6"].aiNeedsReview).toBe(true);
    expect(results.Diego["Q2"].aiMark).toBe(diego.questions.find((q) => q.questionId === "Q2")!.maxMarks);
  });

  it("skips a confirmed or adjusted question instead of overwriting the human mark (I6)", async () => {
    const diego = getStudentSubmission("Diego")!;
    const questionResults = initExam(diego);
    // Q2 and Q6 are Diego's two answered questions. Lock one of each kind.
    questionResults.Q2 = { ...questionResults.Q2, status: "confirmed", aiMark: 2 };
    questionResults.Q6 = { ...questionResults.Q6, status: "adjusted", aiMark: 1, humanMark: 3 };

    const calledQuestionIds: string[] = [];
    const fakeCallGradeApi = async (question: QuestionResult): Promise<GradeOutput> => {
      calledQuestionIds.push(question.questionId);
      return { mark: 0, feedback: "overwritten", needsReview: false };
    };

    await gradeStudent("Diego", Object.values(questionResults), () => {}, fakeCallGradeApi);

    expect(calledQuestionIds).toEqual([]);
  });
});
