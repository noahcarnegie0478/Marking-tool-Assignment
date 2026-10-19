// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QuestionCard } from "@/lib/ui/QuestionCard";
import type { QuestionResult } from "@/lib/state/GradingContext";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function baseQuestion(overrides: Partial<QuestionResult> = {}): QuestionResult {
  return {
    questionId: "Q1",
    question: "What is 2 + 2?",
    rubric: "1 mark for 4.",
    modelAnswer: "4",
    maxMarks: 3,
    response: "4",
    status: "ai_graded",
    aiMark: 2,
    aiFeedback: "Correct working.",
    aiNeedsReview: false,
    humanMark: null,
    humanFeedback: null,
    ...overrides,
  };
}

describe("QuestionCard thin UI tests", () => {
  it("renders Confirm, Adjust, and Re-do on a graded card", () => {
    render(<QuestionCard student="Ben" question={baseQuestion()} dispatch={vi.fn()} />);

    expect(screen.getByText("Confirm")).toBeTruthy();
    expect(screen.getByText("Adjust")).toBeTruthy();
    expect(screen.getByText("Re-do")).toBeTruthy();
  });

  it("hides the controls on a no-submission card", () => {
    render(
      <QuestionCard
        student="Ben"
        question={baseQuestion({
          status: "no_submission",
          aiMark: null,
          aiFeedback: null,
          response: "",
        })}
        dispatch={vi.fn()}
      />
    );

    expect(screen.queryByText("Confirm")).toBeNull();
    expect(screen.queryByText("Adjust")).toBeNull();
    expect(screen.queryByText("Re-do")).toBeNull();
  });

  it("hides the controls on a pending card", () => {
    render(
      <QuestionCard
        student="Ben"
        question={baseQuestion({ status: "pending", aiMark: null, aiFeedback: null })}
        dispatch={vi.fn()}
      />
    );

    expect(screen.queryByText("Confirm")).toBeNull();
    expect(screen.queryByText("Adjust")).toBeNull();
    expect(screen.queryByText("Re-do")).toBeNull();
  });

  it("hides the controls and the stale feedback while a re-do is in flight", () => {
    render(
      <QuestionCard
        student="Ben"
        question={baseQuestion({ status: "grading" })}
        dispatch={vi.fn()}
      />
    );

    expect(screen.queryByText("Confirm")).toBeNull();
    expect(screen.queryByText("Adjust")).toBeNull();
    expect(screen.queryByText("Re-do")).toBeNull();
    // aiFeedback is still "Correct working." from before the re-do started;
    // it must not show while the card is back in the "grading" state.
    expect(screen.queryByText("Correct working.")).toBeNull();
  });

  it("confirming a needs-review card shows Confirmed and drops the review chip", () => {
    const dispatch = vi.fn();
    const question = baseQuestion({ aiNeedsReview: true });

    const { rerender } = render(
      <QuestionCard student="Ben" question={question} dispatch={dispatch} />
    );

    expect(screen.getByText("⚠ Needs review")).toBeTruthy();

    fireEvent.click(screen.getByText("Confirm"));
    expect(dispatch).toHaveBeenCalledWith({ type: "CONFIRM", student: "Ben", questionId: "Q1" });

    // Re-render with the state the reducer would produce from that dispatch,
    // the same way the real page re-renders once the store updates.
    rerender(
      <QuestionCard
        student="Ben"
        question={{ ...question, status: "confirmed" }}
        dispatch={dispatch}
      />
    );

    expect(screen.getByText("✓ Confirmed")).toBeTruthy();
    expect(screen.queryByText("⚠ Needs review")).toBeNull();
  });

  it("adjusting a card dispatches ADJUST and then shows Adjusted by tutor with the new mark", () => {
    const dispatch = vi.fn();
    const question = baseQuestion();

    const { rerender } = render(
      <QuestionCard student="Ben" question={question} dispatch={dispatch} />
    );

    fireEvent.click(screen.getByText("Adjust"));
    fireEvent.change(screen.getByLabelText("New mark"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Feedback"), { target: { value: "Topped up feedback." } });
    fireEvent.click(screen.getByText("Save"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "ADJUST",
      student: "Ben",
      questionId: "Q1",
      rawValue: "3",
      feedback: "Topped up feedback.",
    });

    rerender(
      <QuestionCard
        student="Ben"
        question={{ ...question, status: "adjusted", humanMark: 3, humanFeedback: "Topped up feedback." }}
        dispatch={dispatch}
      />
    );

    expect(screen.getByText("Adjusted by tutor")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("Topped up feedback.")).toBeTruthy();
  });

  it("the Adjust textarea starts pre-filled with the current effective feedback", () => {
    render(<QuestionCard student="Ben" question={baseQuestion()} dispatch={vi.fn()} />);

    fireEvent.click(screen.getByText("Adjust"));

    expect((screen.getByLabelText("Feedback") as HTMLTextAreaElement).value).toBe("Correct working.");
  });

  it("re-doing a card shows the grading state, then the fresh mark and feedback", async () => {
    const dispatch = vi.fn();
    const question = baseQuestion();

    // handleRedo calls the real redoQuestion, which calls the real
    // callGradeApi, so this stubs the one external boundary (the /api/grade
    // fetch) rather than mocking anything this test is actually exercising.
    const fetchStub = vi.fn(
      async () =>
        new Response(JSON.stringify({ mark: 1, feedback: "Fresh feedback.", needsReview: false }), {
          status: 200,
        })
    );
    vi.stubGlobal("fetch", fetchStub);

    const { rerender } = render(
      <QuestionCard student="Ben" question={question} dispatch={dispatch} />
    );

    fireEvent.click(screen.getByText("Re-do"));
    // redoQuestion dispatches START_REDO synchronously before it awaits the
    // stubbed API call, so that's the first call we see.
    expect(dispatch).toHaveBeenCalledWith({
      type: "START_REDO",
      student: "Ben",
      questionId: "Q1",
    });

    rerender(
      <QuestionCard
        student="Ben"
        question={{ ...question, status: "grading" }}
        dispatch={dispatch}
      />
    );
    expect(screen.queryByText("Re-do")).toBeNull();
    expect(screen.queryByText("Correct working.")).toBeNull();

    // Wait for the stubbed fetch to resolve and redoQuestion's QUESTION_GRADED
    // dispatch to actually land, instead of assuming what it would contain.
    await vi.waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith({
        type: "QUESTION_GRADED",
        student: "Ben",
        questionId: "Q1",
        mark: 1,
        feedback: "Fresh feedback.",
        needsReview: false,
      });
    });
    vi.unstubAllGlobals();

    rerender(
      <QuestionCard
        student="Ben"
        question={{
          ...question,
          status: "ai_graded",
          aiMark: 1,
          aiFeedback: "Fresh feedback.",
          humanMark: null,
        }}
        dispatch={dispatch}
      />
    );
    expect(screen.getByText("Fresh feedback.")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
  });
});
