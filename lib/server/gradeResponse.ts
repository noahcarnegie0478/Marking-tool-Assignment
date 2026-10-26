import { callMarkingModel } from "@/lib/server/anthropic";
import { buildMarkingPrompt } from "@/lib/prompt/marking-prompt";
import { clampMark } from "@/lib/domain/clampMark";
import {
  GradeRequestSchema,
  ModelReplySchema,
  type GradeOutput,
  type GradeRequest,
} from "@/lib/validation/schemas";

// Returned whenever the model, or its output, cannot be trusted: a
// network/API failure, a reply with no JSON object in it, text that
// isn't JSON, or JSON that doesn't match the expected shape. A safe 0 with needsReview is always better than a
// guessed mark (invariant I3).
function safeFallback(reason: string, questionId: string): GradeOutput {
  console.error(`gradeResponse: safe fallback for ${questionId} (${reason})`);
  return {
    mark: 0,
    feedback: "Could not grade this response automatically.",
    needsReview: true,
  };
}

// The model sometimes writes reasoning prose before (or after) the JSON
// object, or wraps it in a markdown code fence. Parsing the whole reply
// then fails, so slice out the object: from the first "{" to the last
// "}". If there is none, return null and the caller falls back.
function extractJsonObject(reply: string): string | null {
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    return null;
  }
  return reply.slice(start, end + 1);
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

  const jsonText = extractJsonObject(modelReply);
  if (jsonText === null) {
    return safeFallback("model reply had no JSON object", request.questionId);
  }

  let parsedReply: unknown;
  try {
    parsedReply = JSON.parse(jsonText);
  } catch {
    return safeFallback("model reply was not JSON", request.questionId);
  }

  const parsedOutput = ModelReplySchema.safeParse(parsedReply);
  if (!parsedOutput.success) {
    return safeFallback("model reply had the wrong shape", request.questionId);
  }

  // Log the model's thinking for debugging only. Never return it to the
  // client, and only log it outside production, because reasoning can
  // quote the student's response (CLAUDE.md: no response content in logs).
  const reasoning = parsedOutput.data.reasoning;
  if (reasoning && process.env.NODE_ENV !== "production") {
    console.log(`gradeResponse: ${request.questionId} reasoning: ${reasoning}`);
  }

  const { mark, wasClamped } = clampMark(parsedOutput.data.mark, request.maxMarks);

  // Built field by field so reasoning never reaches the client.
  return {
    mark,
    feedback: parsedOutput.data.feedback,
    needsReview: wasClamped || parsedOutput.data.needsReview,
  };
}
