import { NextResponse } from "next/server";
import { getStudentSubmission } from "@/lib/exam/loadExam";

// GET /api/submissions/[name] - returns one student's full 8-question
// grid, or a clean 404 if the name doesn't match any student.
// The only validation this input needs is "is it a known student name",
// which getStudentSubmission already checks, so there is no separate
// zod schema for it.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const submission = getStudentSubmission(name);

  if (!submission) {
    return NextResponse.json({ error: "Student not found." }, { status: 404 });
  }

  return NextResponse.json(submission);
}
