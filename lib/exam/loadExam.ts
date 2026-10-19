import examDataRaw from "@/data/exam_data.json";
import { ExamDataSchema, type Question } from "@/lib/validation/schemas";

// Validate the exam file once, when this module is first imported.
// If the file is malformed, fail loudly here instead of serving bad data.
const examData = ExamDataSchema.parse(examDataRaw);

// The statuses a question can move through. A fresh submission is only
// ever "no_submission" or "pending" (set below); "grading", "ai_graded",
// "confirmed" and "adjusted" are set later by the grading loop and the
// tutor's confirm/adjust/re-do actions (lib/state/GradingContext.tsx).
export type QuestionStatus =
  | "no_submission"
  | "pending"
  | "grading"
  | "ai_graded"
  | "confirmed"
  | "adjusted";

export type QuestionWithResponse = {
  questionId: string;
  question: string;
  rubric: string;
  modelAnswer: string;
  maxMarks: number;
  response: string | null;
  status: QuestionStatus;
};

export type StudentSubmission = {
  name: string;
  questions: QuestionWithResponse[];
};

// The fixed list of student names, read from the data instead of
// hardcoded, so this stays correct if the source file changes.
// Recomputed on each call instead of cached: fine at this scale (4
// students, 8 questions), not worth the extra state for a demo.
function getStudentNames(): string[] {
  const names = new Set(examData.student_responses.map((r) => r.student));
  return Array.from(names);
}

// One entry per student, for Screen 1 / the list API.
export function getSubmissionsList(): { name: string }[] {
  return getStudentNames().map((name) => ({ name }));
}

// A response counts as "no submission" if it is missing or blank.
// Aisha's Q7 is present but an empty string; Diego's Q2/Q6 etc. are
// simply absent from student_responses. Both must be treated the same.
function findResponseText(name: string, questionId: string): string | null {
  const found = examData.student_responses.find(
    (r) => r.student === name && r.question_id === questionId
  );
  if (!found || found.response.trim() === "") {
    return null;
  }
  return found.response;
}

// Builds the full 8-question grid for one student, starting from the
// question list (not the sparse response list), so a skipped question
// never silently disappears. Returns null if the student doesn't exist.
export function getStudentSubmission(name: string): StudentSubmission | null {
  if (!getStudentNames().includes(name)) {
    return null;
  }

  const questions: QuestionWithResponse[] = examData.questions.map(
    (question: Question) => {
      const response = findResponseText(name, question.id);
      return {
        questionId: question.id,
        question: question.question,
        rubric: question.rubric,
        modelAnswer: question.model_answer,
        maxMarks: question.max_marks,
        response,
        status: response === null ? "no_submission" : "pending",
      };
    }
  );

  return { name, questions };
}
