"use client";

import { createContext, useContext, useReducer, type ReactNode } from "react";
import type { QuestionWithResponse, StudentSubmission } from "@/lib/exam/loadExam";

// One question's grading state. Starts life as the question + response data
// we already loaded (status, response, maxMarks, ...), plus the grading
// fields this ticket does not fill in yet (mark stays null until a later
// ticket grades it).
export type QuestionResult = QuestionWithResponse & {
  mark: number | null;
  feedback: string | null;
  needsReview: boolean;
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
type Action = { type: "INIT_EXAM"; submission: StudentSubmission };

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
