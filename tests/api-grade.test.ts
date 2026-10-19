import { describe, expect, it, vi, beforeEach } from "vitest";

// Thin API-level test (CLAUDE.md §1: thin table on API, deep table on
// the grading service itself — that deep table lives in
// grade-response.test.ts). Only the SDK is mocked here, so this proves
// the route wires the real pipeline up correctly, not the pipeline's
// marking logic.
vi.mock("@/lib/server/anthropic", () => ({
  callMarkingModel: vi.fn(),
}));

import { callMarkingModel } from "@/lib/server/anthropic";
import { POST } from "@/app/api/grade/route";

const mockedCallMarkingModel = vi.mocked(callMarkingModel);

beforeEach(() => {
  mockedCallMarkingModel.mockReset();
});

function buildRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/grade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validQ2Body = {
  questionId: "Q2",
  question: "What is 80 - 15?",
  rubric: "1 mark for method, 1 for the answer.",
  modelAnswer: "65",
  maxMarks: 2,
  response: "80 - 15 = 65",
};

describe("POST /api/grade", () => {
  it("returns the model's graded result for a valid request", async () => {
    mockedCallMarkingModel.mockResolvedValueOnce(
      JSON.stringify({ mark: 2, feedback: "Correct.", needsReview: false })
    );

    const response = await POST(buildRequest(validQ2Body));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({ mark: 2, feedback: "Correct.", needsReview: false });
  });

  it("returns a safe needs-review result instead of a 500 when the model call fails", async () => {
    mockedCallMarkingModel.mockRejectedValueOnce(new Error("API down"));

    const response = await POST(buildRequest(validQ2Body));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({
      mark: 0,
      feedback: "Could not grade this response automatically.",
      needsReview: true,
    });
  });

  it("returns 400 for a malformed request, without calling the model", async () => {
    const response = await POST(buildRequest({ questionId: "Q2" }));
    expect(response.status).toBe(400);
    expect(mockedCallMarkingModel).not.toHaveBeenCalled();
  });
});
