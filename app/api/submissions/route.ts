import { NextResponse } from "next/server";
import { getSubmissionsList } from "@/lib/exam/loadExam";

// GET /api/submissions - returns one entry per student, for Screen 1.
export function GET() {
  const students = getSubmissionsList();
  return NextResponse.json({ students });
}
