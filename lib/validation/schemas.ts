import { z } from "zod";

// Shape of one question in exam_data.json. Fixed set of 8, read from file.
export const QuestionSchema = z.object({
  id: z.string().min(1),
  topic: z.string().min(1),
  difficulty: z.string().min(1),
  max_marks: z.number().int().positive(),
  question: z.string().min(1),
  model_answer: z.string().min(1),
  rubric: z.string().min(1),
});

// Shape of one student's answer to one question. Sparse: not every
// student answers every question.
export const StudentResponseSchema = z.object({
  student: z.string().min(1),
  question_id: z.string().min(1),
  response: z.string(),
});

// Shape of the whole exam_data.json file.
export const ExamDataSchema = z.object({
  questions: z.array(QuestionSchema),
  student_responses: z.array(StudentResponseSchema),
});

export type Question = z.infer<typeof QuestionSchema>;
export type StudentResponse = z.infer<typeof StudentResponseSchema>;
export type ExamData = z.infer<typeof ExamDataSchema>;

// What the client sends to /api/grade for one question. Matches
// everything the real grading call (a later ticket) will need, so this
// fake endpoint's contract is a drop-in match for the real one.
export const GradeRequestSchema = z.object({
  questionId: z.string().min(1),
  question: z.string().min(1),
  rubric: z.string().min(1),
  modelAnswer: z.string().min(1),
  maxMarks: z.number().int().positive(),
  response: z.string().min(1),
});

// What /api/grade returns for one question. A mark is always a whole
// number from 0 up (clamped to max_marks elsewhere, invariant I1).
// needsReview flags a result the tutor should double check.
export const GradeOutputSchema = z.object({
  mark: z.number().int().min(0),
  feedback: z.string().min(1),
  needsReview: z.boolean(),
});

// What the MODEL returns. Same as GradeOutput plus an optional, short
// reasoning field that we log for debugging and never send to the client.
// No max length on reasoning on purpose: a hard cap would reject a long
// reasoning and send a good mark to the safe fallback. Brevity is asked
// for in the prompt instead. nullish (not just optional) so a model that
// sends "reasoning": null doesn't throw a good mark away either.
export const ModelReplySchema = GradeOutputSchema.extend({
  reasoning: z.string().nullish(),
});

export type GradeRequest = z.infer<typeof GradeRequestSchema>;
export type GradeOutput = z.infer<typeof GradeOutputSchema>;
export type ModelReply = z.infer<typeof ModelReplySchema>;
