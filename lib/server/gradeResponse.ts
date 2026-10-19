import { callMarkingModel } from "@/lib/server/anthropic";
import { buildMarkingPrompt } from "@/lib/prompt/marking-prompt";
import { clampMark } from "@/lib/domain/clampMark";
import {
  GradeOutputSchema,
  GradeRequestSchema,
  type GradeOutput,
  type GradeRequest,
} from "@/lib/validation/schemas";

// Returned whenever the model, or its output, cannot be trusted: a
// network/API failure, text that isn't JSON, or JSON that doesn't match
// the expected shape. A safe 0 with needsReview is always better than a
// guessed mark (invariant I3).
function safeFallback(reason: string, questionId: string): GradeOutput {
  console.error(`gradeResponse: safe fallback for ${questionId} (${reason})`);
  return {
    mark: 0,
    feedback: "Could not grade this response automatically.",
    needsReview: true,
  };
}

// Models sometimes wrap JSON in a markdown code fence even when told not
// to. Strip one off before parsing, so that common case still works.
function stripCodeFence(text: string): string {
  const fenced = text.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : text;
}

// The real grading pipeline for one question: build the prompt, call the
// model, and only ever hand back output that has passed both zod gates
// (invariants I1, I2, I3). Never throws: every failure path returns a
// safe fallback instead.
export async function gradeResponse(input: GradeRequest): Promise<GradeOutput> {
  const parsedInput = GradeRequestSchema.safeParse(input);
  if (!parsedInput.success) {
    return safeFallback("invalid input", "unknown");
  }
  const request = parsedInput.data;

  const prompt = buildMarkingPrompt({
    question: request.question,
    rubric: request.rubric,
    modelAnswer: request.modelAnswer,
    maxMarks: request.maxMarks,
    response: request.response,
  });

  let modelReply: string;
  try {
    modelReply = await callMarkingModel(prompt);
  } catch {
    return safeFallback("model call failed", request.questionId);
  }

  let parsedReply: unknown;
  try {
    parsedReply = JSON.parse(stripCodeFence(modelReply));
  } catch {
    return safeFallback("model reply was not JSON", request.questionId);
  }

  const parsedOutput = GradeOutputSchema.safeParse(parsedReply);
  if (!parsedOutput.success) {
    return safeFallback("model reply had the wrong shape", request.questionId);
  }

  const { mark, wasClamped } = clampMark(parsedOutput.data.mark, request.maxMarks);

  return {
    mark,
    feedback: parsedOutput.data.feedback,
    needsReview: wasClamped || parsedOutput.data.needsReview,
  };
}
