import { NextResponse } from "next/server";
import {
  GradeOutputSchema,
  GradeRequestSchema,
  type GradeOutput,
} from "@/lib/validation/schemas";

// FAKE grading endpoint. Returns one fixed, hardcoded result per question
// id instead of calling a real model. A later ticket (GRADE-01) swaps the
// inside of this handler for a real model call, but the request/response
// shape here must stay identical, so the UI never has to change.
//
// Q6 always returns the "cannot grade" shape (mark 0, needsReview true),
// so the grading loop's failure handling is provable right now, with real
// exam data, instead of waiting for the real model to actually fail.
const FAKE_RESULTS: Record<string, GradeOutput> = {
  Q1: { mark: 2, feedback: "Fake grade: correct method and answer.", needsReview: false },
  Q2: { mark: 2, feedback: "Fake grade: correct method and answer.", needsReview: false },
  Q3: { mark: 3, feedback: "Fake grade: correct method and answer.", needsReview: false },
  Q4: { mark: 3, feedback: "Fake grade: correct method and answer.", needsReview: false },
  Q5: { mark: 3, feedback: "Fake grade: correct method and answer.", needsReview: false },
  Q6: { mark: 0, feedback: "Could not grade this response automatically.", needsReview: true },
  Q7: { mark: 4, feedback: "Fake grade: correct method and answer.", needsReview: false },
  Q8: { mark: 3, feedback: "Fake grade: correct method and answer.", needsReview: false },
};

// Used if a question id ever shows up that isn't one of the 8 above.
// That should not happen with the real exam data, but a safe
// "needs review" is better than guessing a mark (invariant I3's spirit).
const UNKNOWN_QUESTION_RESULT: GradeOutput = {
  mark: 0,
  feedback: "Could not grade this response automatically.",
  needsReview: true,
};

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = GradeRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid grade request." },
      { status: 400 }
    );
  }

  const result = FAKE_RESULTS[parsed.data.questionId] ?? UNKNOWN_QUESTION_RESULT;

  // Double-checks the fake result matches the same contract the real
  // endpoint must satisfy, so the two are provably swappable.
  const validatedResult = GradeOutputSchema.parse(result);

  return NextResponse.json(validatedResult);
}
