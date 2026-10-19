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
