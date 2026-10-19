import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/grade/route";

// Builds a valid-shaped request for one question, overridable per test.
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
  it("returns a fixed mark for a normal question", async () => {
    const response = await POST(buildRequest(validQ2Body));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.needsReview).toBe(false);
    expect(typeof body.mark).toBe("number");
    expect(typeof body.feedback).toBe("string");
  });

  it("returns the cannot-grade shape for Q6", async () => {
    const response = await POST(
      buildRequest({ ...validQ2Body, questionId: "Q6" })
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({
      mark: 0,
      feedback: "Could not grade this response automatically.",
      needsReview: true,
    });
  });

  it("returns 400 for a malformed request", async () => {
    const response = await POST(buildRequest({ questionId: "Q2" }));
    expect(response.status).toBe(400);
  });
});
