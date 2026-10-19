import { describe, expect, it } from "vitest";
import { getStudentSubmission, getSubmissionsList } from "@/lib/exam/loadExam";

describe("getSubmissionsList", () => {
  it("returns exactly 4 students", () => {
    const students = getSubmissionsList();
    expect(students).toHaveLength(4);
    expect(students.map((s) => s.name)).toEqual(
      expect.arrayContaining(["Aisha", "Ben", "Chen", "Diego"])
    );
  });
});

describe("getStudentSubmission", () => {
  it("builds all 8 questions for Diego, with 6 no_submission and Q2/Q6 present", () => {
    const submission = getStudentSubmission("Diego");
    expect(submission).not.toBeNull();
    expect(submission!.questions).toHaveLength(8);

    const noSubmission = submission!.questions.filter(
      (q) => q.status === "no_submission"
    );
    expect(noSubmission).toHaveLength(6);

    const q2 = submission!.questions.find((q) => q.questionId === "Q2");
    const q6 = submission!.questions.find((q) => q.questionId === "Q6");
    expect(q2?.status).toBe("pending");
    expect(q2?.response).toBe("80 - 15 = 65");
    expect(q6?.status).toBe("pending");
    expect(q6?.response).toBe("f'(x) = 9x^2 - 24x + 1.");
  });

  it("treats a blank response (Aisha Q7) as no_submission, not pending", () => {
    const submission = getStudentSubmission("Aisha");
    expect(submission).not.toBeNull();
    const q7 = submission!.questions.find((q) => q.questionId === "Q7");
    expect(q7?.status).toBe("no_submission");
    expect(q7?.response).toBeNull();
  });

  it("returns null for an unknown student", () => {
    const submission = getStudentSubmission("Zzz");
    expect(submission).toBeNull();
  });
});
