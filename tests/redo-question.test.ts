import { describe, expect, it } from "vitest";
import { gradingReducer, type Action, type GradingState, type QuestionResult } from "@/lib/state/GradingContext";
import { redoQuestion } from "@/lib/state/redoQuestion";
import type { GradeOutput } from "@/lib/validation/schemas";

function applyAction(results: GradingState["results"], action: Action): GradingState["results"] {
  return gradingReducer({ results, gradingProgress: null }, action).results;
}

function adjustedQuestion(): QuestionResult {
  return {
    questionId: "Q1",
    question: "What is 2 + 2?",
    rubric: "1 mark for 4.",
    modelAnswer: "4",
    maxMarks: 3,
    response: "4",
    status: "adjusted",
    aiMark: 1,
    aiFeedback: "old feedback",
    aiNeedsReview: true,
    humanMark: 3,
  };
}

describe("redoQuestion", () => {
  it("replaces the AI result and clears the human mark on a successful call", async () => {
    let results: GradingState["results"] = { Ben: { Q1: adjustedQuestion() } };

    const fakeCallGradeApi = async (): Promise<GradeOutput> => ({
      mark: 2,
      feedback: "fresh result",
      needsReview: false,
    });

    await redoQuestion(
      "Ben",
      "Q1",
      results.Ben.Q1,
      (action) => {
        results = { ...results, Ben: applyAction(results, action).Ben };
      },
      fakeCallGradeApi
    );

    const updated = results.Ben.Q1;
    expect(updated.status).toBe("ai_graded");
    expect(updated.aiMark).toBe(2);
    expect(updated.aiFeedback).toBe("fresh result");
    expect(updated.humanMark).toBeNull();
  });

  it("moves the question to grading before the call resolves", async () => {
    let results: GradingState["results"] = { Ben: { Q1: adjustedQuestion() } };
    const seenStatuses: string[] = [];

    const fakeCallGradeApi = async (): Promise<GradeOutput> => {
      seenStatuses.push(results.Ben.Q1.status);
      return { mark: 2, feedback: "fresh result", needsReview: false };
    };

    await redoQuestion(
      "Ben",
      "Q1",
      results.Ben.Q1,
      (action) => {
        results = { ...results, Ben: applyAction(results, action).Ben };
      },
      fakeCallGradeApi
    );

    expect(seenStatuses).toEqual(["grading"]);
  });

  it("ends in a usable state (not stuck on grading) if the AI call fails", async () => {
    let results: GradingState["results"] = { Ben: { Q1: adjustedQuestion() } };

    // Mirrors callGradeApi's real behaviour: a failed call never throws,
    // it resolves to the safe fallback instead.
    const safeFallbackCallGradeApi = async (): Promise<GradeOutput> => ({
      mark: 0,
      feedback: "Could not grade this response.",
      needsReview: true,
    });

    await redoQuestion(
      "Ben",
      "Q1",
      results.Ben.Q1,
      (action) => {
        results = { ...results, Ben: applyAction(results, action).Ben };
      },
      safeFallbackCallGradeApi
    );

    const updated = results.Ben.Q1;
    expect(updated.status).toBe("ai_graded");
    expect(updated.aiMark).toBe(0);
    expect(updated.aiNeedsReview).toBe(true);
  });
});
