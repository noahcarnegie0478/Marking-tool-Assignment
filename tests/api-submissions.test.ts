import { describe, expect, it } from "vitest";
import { GET as getList } from "@/app/api/submissions/route";
import { GET as getDetail } from "@/app/api/submissions/[name]/route";

describe("GET /api/submissions", () => {
  it("returns 4 students", async () => {
    const response = getList();
    const body = await response.json();
    expect(body.students).toHaveLength(4);
  });
});

describe("GET /api/submissions/[name]", () => {
  it("returns Diego's 8 questions, 6 no_submission, Q2 and Q6 present", async () => {
    const response = await getDetail(new Request("http://localhost/api/submissions/Diego"), {
      params: Promise.resolve({ name: "Diego" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.questions).toHaveLength(8);
    const noSubmission = body.questions.filter(
      (q: { status: string }) => q.status === "no_submission"
    );
    expect(noSubmission).toHaveLength(6);
    expect(
      body.questions.find((q: { questionId: string }) => q.questionId === "Q2")
    ).toBeTruthy();
    expect(
      body.questions.find((q: { questionId: string }) => q.questionId === "Q6")
    ).toBeTruthy();
  });

  it("returns a clean 404 for an unknown student", async () => {
    const response = await getDetail(new Request("http://localhost/api/submissions/Zzz"), {
      params: Promise.resolve({ name: "Zzz" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Student not found.");
  });
});
