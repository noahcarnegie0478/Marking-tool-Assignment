import { describe, expect, it } from "vitest";
import { gradingReducer, type Action, type GradingState, type QuestionResult } from "@/lib/state/GradingContext";
import { getEffectiveFeedback, getEffectiveMark, getNeedsReview, getStatus, getTotal } from "@/lib/state/selectors";
import { getStudentSubmission } from "@/lib/exam/loadExam";

// Mirrors the reducer's INIT_EXAM case, without needing to render a
// component just to dispatch one action.
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

// Builds a single ai_graded question, the starting point for most of
// this ticket's confirm/adjust/re-do cases.
function aiGradedQuestion(overrides: Partial<QuestionResult> = {}): QuestionResult {
  return {
    questionId: "Q1",
    question: "What is 2 + 2?",
    rubric: "1 mark for 4.",
    modelAnswer: "4",
    maxMarks: 3,
    response: "4",
    status: "ai_graded",
    aiMark: 2,
    aiFeedback: "Partial credit.",
    aiNeedsReview: true,
    humanMark: null,
    humanFeedback: null,
    ...overrides,
  };
}

function stateWith(student: string, question: QuestionResult): GradingState {
  return { results: { [student]: { [question.questionId]: question } }, gradingProgress: null };
}

function dispatch(state: GradingState, action: Action): GradingState {
  return gradingReducer(state, action);
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

describe("CONFIRM", () => {
  it("confirms an ai_graded question: status confirmed, mark unchanged, needsReview clears", () => {
    const question = aiGradedQuestion({ aiNeedsReview: true });
    const before = stateWith("Ben", question);

    const after = dispatch(before, { type: "CONFIRM", student: "Ben", questionId: "Q1" });

    const updated = after.results.Ben.Q1;
    expect(updated.status).toBe("confirmed");
    expect(updated.aiMark).toBe(question.aiMark);
    expect(getNeedsReview(updated)).toBe(false);
  });

  it("does nothing to a pending question (not yet AI graded)", () => {
    const question = aiGradedQuestion({ status: "pending", aiMark: null, aiFeedback: null, aiNeedsReview: false });
    const before = stateWith("Ben", question);

    const after = dispatch(before, { type: "CONFIRM", student: "Ben", questionId: "Q1" });

    expect(after).toEqual(before);
  });
});

describe("ADJUST", () => {
  it("adjusts 2/3 to 3/3: humanMark set, status adjusted, effectiveMark 3", () => {
    const question = aiGradedQuestion({ maxMarks: 3, aiMark: 2 });
    const before = stateWith("Ben", question);

    const after = dispatch(before, {
      type: "ADJUST",
      student: "Ben",
      questionId: "Q1",
      rawValue: "3",
      feedback: "Partial credit.",
    });

    const updated = after.results.Ben.Q1;
    expect(updated.humanMark).toBe(3);
    expect(updated.status).toBe("adjusted");
    expect(getEffectiveMark(updated)).toBe(3);
  });

  it("clamps an adjust value above max_marks down to max_marks (I1)", () => {
    const question = aiGradedQuestion({ maxMarks: 3 });
    const before = stateWith("Ben", question);

    const after = dispatch(before, {
      type: "ADJUST",
      student: "Ben",
      questionId: "Q1",
      rawValue: "5",
      feedback: "",
    });

    expect(after.results.Ben.Q1.humanMark).toBe(3);
  });

  it("clamps a negative adjust value up to 0", () => {
    const question = aiGradedQuestion({ maxMarks: 3 });
    const before = stateWith("Ben", question);

    const after = dispatch(before, {
      type: "ADJUST",
      student: "Ben",
      questionId: "Q1",
      rawValue: "-1",
      feedback: "",
    });

    expect(after.results.Ben.Q1.humanMark).toBe(0);
  });

  it.each(["abc", "", "2.5", "  "])("rejects a non-whole-number value (%s) with no state change", (rawValue) => {
    const question = aiGradedQuestion();
    const before = stateWith("Ben", question);

    const after = dispatch(before, {
      type: "ADJUST",
      student: "Ben",
      questionId: "Q1",
      rawValue,
      feedback: "",
    });

    expect(after).toEqual(before);
  });

  it("does not allow adjusting a no-submission question (stays at 0)", () => {
    const question = aiGradedQuestion({ status: "no_submission", aiMark: null, aiFeedback: null, aiNeedsReview: false });
    const before = stateWith("Ben", question);

    const after = dispatch(before, {
      type: "ADJUST",
      student: "Ben",
      questionId: "Q1",
      rawValue: "2",
      feedback: "",
    });

    expect(after).toEqual(before);
    expect(getEffectiveMark(after.results.Ben.Q1)).toBe(0);
  });

  it("allows re-adjusting an already-adjusted question", () => {
    const question = aiGradedQuestion({ status: "adjusted", humanMark: 1, maxMarks: 3 });
    const before = stateWith("Ben", question);

    const after = dispatch(before, {
      type: "ADJUST",
      student: "Ben",
      questionId: "Q1",
      rawValue: "3",
      feedback: "Partial credit.",
    });

    expect(after.results.Ben.Q1.humanMark).toBe(3);
  });

  it("sets humanFeedback from the tutor's edited text, trimmed, so getEffectiveFeedback reads it", () => {
    const question = aiGradedQuestion({ aiFeedback: "Original AI feedback." });
    const before = stateWith("Ben", question);

    const after = dispatch(before, {
      type: "ADJUST",
      student: "Ben",
      questionId: "Q1",
      rawValue: "2",
      feedback: "  Topped up by the tutor.  ",
    });

    expect(after.results.Ben.Q1.humanFeedback).toBe("Topped up by the tutor.");
    expect(getEffectiveFeedback(after.results.Ben.Q1)).toBe("Topped up by the tutor.");
    // The AI's original feedback is kept, not overwritten, same pattern as humanMark/aiMark.
    expect(after.results.Ben.Q1.aiFeedback).toBe("Original AI feedback.");
  });

  it("does not adjust humanMark/status when the mark value is rejected, even with a feedback edit", () => {
    const question = aiGradedQuestion({ aiFeedback: "Original." });
    const before = stateWith("Ben", question);

    const after = dispatch(before, {
      type: "ADJUST",
      student: "Ben",
      questionId: "Q1",
      rawValue: "abc",
      feedback: "Should not be saved.",
    });

    expect(after).toEqual(before);
  });
});

describe("CONFIRM_ALL", () => {
  it("confirms every ai_graded question for the student, leaving others alone", () => {
    const results: GradingState["results"] = {
      Ben: {
        Q1: aiGradedQuestion({ questionId: "Q1", status: "ai_graded" }),
        Q2: aiGradedQuestion({ questionId: "Q2", status: "confirmed" }),
        Q3: aiGradedQuestion({ questionId: "Q3", status: "adjusted", humanMark: 1 }),
        Q4: aiGradedQuestion({ questionId: "Q4", status: "pending", aiMark: null, aiFeedback: null, aiNeedsReview: false }),
      },
    };
    const before: GradingState = { results, gradingProgress: null };

    const after = dispatch(before, { type: "CONFIRM_ALL", student: "Ben" });

    expect(after.results.Ben.Q1.status).toBe("confirmed");
    expect(after.results.Ben.Q2.status).toBe("confirmed");
    expect(after.results.Ben.Q3.status).toBe("adjusted");
    expect(after.results.Ben.Q4.status).toBe("pending");
  });

  it("does nothing for a student with no results yet", () => {
    const before: GradingState = { results: {}, gradingProgress: null };

    const after = dispatch(before, { type: "CONFIRM_ALL", student: "Ghost" });

    expect(after).toEqual(before);
  });
});

describe("Re-do (START_REDO then QUESTION_GRADED)", () => {
  it("re-does a graded question: moves to grading, then a fresh result lands as ai_graded", () => {
    const question = aiGradedQuestion({ aiMark: 1, aiFeedback: "old feedback" });
    const afterStart = dispatch(stateWith("Ben", question), {
      type: "START_REDO",
      student: "Ben",
      questionId: "Q1",
    });

    expect(afterStart.results.Ben.Q1.status).toBe("grading");

    const afterGraded = dispatch(afterStart, {
      type: "QUESTION_GRADED",
      student: "Ben",
      questionId: "Q1",
      mark: 3,
      feedback: "new feedback",
      needsReview: false,
    });

    const updated = afterGraded.results.Ben.Q1;
    expect(updated.status).toBe("ai_graded");
    expect(updated.aiMark).toBe(3);
    expect(updated.aiFeedback).toBe("new feedback");
  });

  it("clears humanMark when re-doing a previously adjusted question", () => {
    const question = aiGradedQuestion({ status: "adjusted", humanMark: 1 });
    const afterStart = dispatch(stateWith("Ben", question), {
      type: "START_REDO",
      student: "Ben",
      questionId: "Q1",
    });
    const afterGraded = dispatch(afterStart, {
      type: "QUESTION_GRADED",
      student: "Ben",
      questionId: "Q1",
      mark: 2,
      feedback: "fresh AI result",
      needsReview: false,
    });

    const updated = afterGraded.results.Ben.Q1;
    expect(updated.humanMark).toBeNull();
    expect(getEffectiveMark(updated)).toBe(2);
  });
});

describe("getTotal over a mix of ai_graded, confirmed, and adjusted questions (I5)", () => {
  it("sums each question's effective mark", () => {
    const results: GradingState["results"] = {
      Ben: {
        Q1: aiGradedQuestion({ questionId: "Q1", maxMarks: 3, aiMark: 2, status: "ai_graded" }),
        Q2: aiGradedQuestion({ questionId: "Q2", maxMarks: 2, aiMark: 2, status: "confirmed" }),
        Q3: aiGradedQuestion({ questionId: "Q3", maxMarks: 4, aiMark: 1, humanMark: 4, status: "adjusted" }),
      },
    };

    expect(getTotal(results, "Ben")).toEqual({ awarded: 2 + 2 + 4, max: 3 + 2 + 4 });
  });
});
