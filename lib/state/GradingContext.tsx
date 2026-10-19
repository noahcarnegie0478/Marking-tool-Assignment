"use client";

import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import type { QuestionWithResponse, StudentSubmission } from "@/lib/exam/loadExam";
import { parseAdjustMark } from "@/lib/domain/parseAdjustMark";

// One question's grading state. Starts life as the question + response data
// we already loaded (status, response, maxMarks, ...), plus the grading
// fields. The AI's result is always kept in aiMark/aiFeedback/aiNeedsReview,
// even after a tutor overrides it, so a later "was X, now Y" or a Re-do
// always has the original to fall back to. humanMark is set only when the
// tutor adjusts the mark; effectiveMark/needsReview (lib/state/selectors.ts)
// are the derived values everything else should read.
export type QuestionResult = QuestionWithResponse & {
  aiMark: number | null;
  aiFeedback: string | null;
  aiNeedsReview: boolean;
  humanMark: number | null;
};

export type GradingState = {
  // student name -> questionId -> that question's result
  results: Record<string, Record<string, QuestionResult>>;
  // set while a "Grade with AI" run is in progress. Nothing writes this yet.
  gradingProgress: { student: string; done: number; total: number } | null;
};

const initialState: GradingState = {
  results: {},
  gradingProgress: null,
};

// Builds one student's empty grading grid from their submission (question
// text, rubric, response, no_submission/pending status already decided by
// the data loader) and stores it under their name.
type Action =
  | { type: "INIT_EXAM"; submission: StudentSubmission }
  // A "Grade with AI" run is starting for this student. total is how
  // many questions will actually be sent (no-submission ones are never
  // counted, invariant I4).
  | { type: "START_GRADING"; student: string; total: number }
  // One question came back from the grading loop (a real grade, or a
  // safe fallback if the call failed). Writes the result and bumps the
  // progress bar by one.
  | {
      type: "QUESTION_GRADED";
      student: string;
      questionId: string;
      mark: number;
      feedback: string;
      needsReview: boolean;
    }
  // The grading loop finished every question for this student.
  | { type: "FINISH_GRADING"; student: string };

function gradingReducer(state: GradingState, action: Action): GradingState {
  switch (action.type) {
    case "INIT_EXAM": {
      const questionResults: Record<string, QuestionResult> = {};
      for (const question of action.submission.questions) {
        questionResults[question.questionId] = {
          ...question,
          mark: null,
          feedback: null,
          needsReview: false,
        };
      }
      return {
        ...state,
        results: {
          ...state.results,
          [action.submission.name]: questionResults,
        },
      };
    }

    case "START_GRADING": {
      return {
        ...state,
        gradingProgress: {
          student: action.student,
          done: 0,
          total: action.total,
        },
      };
    }

    case "QUESTION_GRADED": {
      const studentResults = state.results[action.student];
      if (!studentResults) {
        return state;
      }

      const existingQuestion = studentResults[action.questionId];
      if (!existingQuestion) {
        return state;
      }

      // Only bump the progress bar if this result belongs to the run
      // currently in progress (guards against a stale result landing
      // after the tutor has already navigated away and back).
      const progress = state.gradingProgress;
      const nextProgress =
        progress && progress.student === action.student
          ? { ...progress, done: progress.done + 1 }
          : progress;

      return {
        ...state,
        results: {
          ...state.results,
          [action.student]: {
            ...studentResults,
            [action.questionId]: {
              ...existingQuestion,
              mark: action.mark,
              feedback: action.feedback,
              needsReview: action.needsReview,
            },
          },
        },
        gradingProgress: nextProgress,
      };
    }

    case "FINISH_GRADING": {
      if (state.gradingProgress?.student !== action.student) {
        return state;
      }
      return { ...state, gradingProgress: null };
    }

    default:
      return state;
  }
}

const GradingStateContext = createContext<GradingState | null>(null);
const GradingDispatchContext = createContext<React.Dispatch<Action> | null>(null);

export function GradingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gradingReducer, initialState);
  return (
    <GradingStateContext.Provider value={state}>
      <GradingDispatchContext.Provider value={dispatch}>
        {children}
      </GradingDispatchContext.Provider>
    </GradingStateContext.Provider>
  );
}

// Reads the grading state. Throws if used outside the provider: that is a
// real bug (a page rendered outside the root layout), not a case to hide.
export function useGradingState(): GradingState {
  const state = useContext(GradingStateContext);
  if (state === null) {
    throw new Error("useGradingState must be used inside a GradingProvider");
  }
  return state;
}

export function useGradingDispatch(): React.Dispatch<Action> {
  const dispatch = useContext(GradingDispatchContext);
  if (dispatch === null) {
    throw new Error("useGradingDispatch must be used inside a GradingProvider");
  }
  return dispatch;
}
