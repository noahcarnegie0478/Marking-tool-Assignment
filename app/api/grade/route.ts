import { NextResponse } from "next/server";
import { GradeRequestSchema } from "@/lib/validation/schemas";
import { gradeResponse } from "@/lib/server/gradeResponse";

// Grading endpoint. Validates the request, then runs it through the real
// grading pipeline (prompt, model call, both zod gates). gradeResponse
// never throws: a model or network failure comes back as a safe
// needs-review result, not a 500.
export async function POST(request: Request) {
  const body = await request.json();
  const parsed = GradeRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid grade request." },
      { status: 400 }
    );
  }

  const result = await gradeResponse(parsed.data);

  return NextResponse.json(result);
}
